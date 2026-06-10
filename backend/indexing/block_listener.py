"""
Canonical blockchain interaction layer.

This module is the single place where backend code can:
- submit protocol transactions
- wait for confirmations
- verify user-submitted non-custodial transactions
"""

from __future__ import annotations

import asyncio
import logging
import os
import threading
import time
from typing import Any, Dict, Optional

from eth_account import Account
from eth_utils import to_checksum_address
from hexbytes import HexBytes
from web3 import Web3
from web3.contract import Contract
from web3.exceptions import TransactionNotFound

from backend.security.invariants import InvariantViolation

try:
    from web3.middleware import geth_poa_middleware as _poa_middleware
except ImportError:  # web3>=7
    from web3.middleware import ExtraDataToPOAMiddleware as _poa_middleware


logger = logging.getLogger(__name__)

_REVERT_SELECTOR_ERRORS: Dict[str, str] = {
    "0x8d587b5a": "MARKET_CREATION_PAUSED",
    "0xe1ae47b7": "INVALID_MARKET_PARAMETERS",
    "0x3f504f14": "MARKET_DURATION_OUT_OF_BOUNDS",
    "0xb8475905": "MARKET_EXPOSURE_OUT_OF_BOUNDS",
    "0x5a483ae3": "INSUFFICIENT_CREATION_BOND",
    "0xe098d3ee": "AGENT_ALREADY_REGISTERED_ON_CHAIN",
    "0x83bcfb47": "AGENT_NOT_REGISTERED_ON_CHAIN",
    "0xba32abe1": "AGENT_ALREADY_INACTIVE_ON_CHAIN",
    "0xd280225c": "AGENT_STILL_ACTIVE_ON_CHAIN",
    "0xbcecb64a": "INVALID_AGENT_METADATA_ON_CHAIN",
    "0x9d749a92": "INVALID_AGENT_STAKE_ON_CHAIN",
    "0xf1bc94d2": "INSUFFICIENT_AGENT_STAKE_ON_CHAIN",
}

_INSUFFICIENT_FUNDS_MARKERS = (
    "insufficient funds",
    "insufficient balance",
    "not enough funds",
)


def _extract_revert_selector(exc: Exception) -> Optional[str]:
    for arg in getattr(exc, "args", ()):
        if isinstance(arg, str) and arg.startswith("0x") and len(arg) >= 10:
            return arg[:10].lower()
    return None


def _contains_insufficient_funds_error(exc: Exception) -> bool:
    text = str(exc).lower()
    if any(marker in text for marker in _INSUFFICIENT_FUNDS_MARKERS):
        return True

    for arg in getattr(exc, "args", ()):
        if isinstance(arg, str) and any(marker in arg.lower() for marker in _INSUFFICIENT_FUNDS_MARKERS):
            return True
        if isinstance(arg, dict):
            for value in arg.values():
                if isinstance(value, str) and any(
                    marker in value.lower() for marker in _INSUFFICIENT_FUNDS_MARKERS
                ):
                    return True
    return False


def _camel_to_snake(text: str) -> str:
    out: list[str] = []
    for i, char in enumerate(text):
        if i > 0 and char.isupper():
            out.append("_")
        out.append(char.lower())
    return "".join(out)


def _norm(value: Any) -> Any:
    if isinstance(value, HexBytes):
        return value.hex()
    if isinstance(value, bytes):
        return "0x" + value.hex()
    if isinstance(value, dict):
        return {k: _norm(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_norm(v) for v in value]
    return value


MARKET_FACTORY_ABI = [
    {"type": "function", "name": "createMarket", "stateMutability": "nonpayable", "inputs": [{"name": "marketId", "type": "bytes32"}, {"name": "startTime", "type": "uint256"}, {"name": "endTime", "type": "uint256"}, {"name": "maxExposure", "type": "uint256"}, {"name": "metadataURI", "type": "string"}], "outputs": [{"name": "marketAddress", "type": "address"}]},
    {"type": "event", "name": "MarketCreated", "anonymous": False, "inputs": [{"name": "creator", "type": "address", "indexed": True}, {"name": "market", "type": "address", "indexed": True}, {"name": "marketId", "type": "bytes32", "indexed": True}, {"name": "startTime", "type": "uint256", "indexed": False}, {"name": "endTime", "type": "uint256", "indexed": False}, {"name": "maxExposure", "type": "uint256", "indexed": False}, {"name": "collateralToken", "type": "address", "indexed": False}, {"name": "metadataURI", "type": "string", "indexed": False}]},
]
PREDICTION_MARKET_ABI = [
    {"type": "function", "name": "betYes", "stateMutability": "nonpayable", "inputs": [{"name": "amount", "type": "uint256"}], "outputs": []},
    {"type": "function", "name": "betNo", "stateMutability": "nonpayable", "inputs": [{"name": "amount", "type": "uint256"}], "outputs": []},
    {"type": "function", "name": "settle", "stateMutability": "nonpayable", "inputs": [{"name": "outcome", "type": "bool"}], "outputs": []},
    {"type": "function", "name": "claim", "stateMutability": "nonpayable", "inputs": [], "outputs": []},
    {"type": "function", "name": "cancelMarket", "stateMutability": "nonpayable", "inputs": [], "outputs": []},
    {"type": "event", "name": "BetPlaced", "anonymous": False, "inputs": [{"name": "bettor", "type": "address", "indexed": True}, {"name": "outcome", "type": "bool", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
    {"type": "event", "name": "MarketSettled", "anonymous": False, "inputs": [{"name": "outcome", "type": "bool", "indexed": False}, {"name": "totalYes", "type": "uint256", "indexed": False}, {"name": "totalNo", "type": "uint256", "indexed": False}]},
    {"type": "event", "name": "PayoutClaimed", "anonymous": False, "inputs": [{"name": "bettor", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
    {"type": "event", "name": "RefundClaimed", "anonymous": False, "inputs": [{"name": "bettor", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
    {"type": "event", "name": "MarketCanceledEvent", "anonymous": False, "inputs": []},
]
ERC20_ABI = [
    {"type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}]},
    {"type": "function", "name": "allowance", "stateMutability": "view", "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]},
    {"type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]},
]
SETTLEMENT_ENGINE_ABI = [
    {"type": "function", "name": "governanceSettleMarket", "stateMutability": "nonpayable", "inputs": [{"name": "market", "type": "address"}, {"name": "outcome", "type": "bool"}], "outputs": []},
    {"type": "event", "name": "MarketSettlementExecuted", "anonymous": False, "inputs": [{"name": "market", "type": "address", "indexed": True}, {"name": "outcome", "type": "bool", "indexed": False}]},
]
AGENT_REGISTRY_ABI = [
    {"type": "function", "name": "registerAgent", "stateMutability": "nonpayable", "inputs": [{"name": "agentId", "type": "bytes32"}, {"name": "metadataURI", "type": "string"}], "outputs": []},
    {"type": "function", "name": "stakeAndActivate", "stateMutability": "payable", "inputs": [], "outputs": []},
    {"type": "function", "name": "deactivate", "stateMutability": "nonpayable", "inputs": [], "outputs": []},
    {"type": "function", "name": "unstake", "stateMutability": "nonpayable", "inputs": [{"name": "amount", "type": "uint256"}], "outputs": []},
    {"type": "function", "name": "getAgent", "stateMutability": "view", "inputs": [{"name": "agent", "type": "address"}], "outputs": [{"name": "agentId", "type": "bytes32"}, {"name": "metadataURI", "type": "string"}, {"name": "stake", "type": "uint256"}, {"name": "active", "type": "bool"}]},
    {"type": "event", "name": "AgentRegistered", "anonymous": False, "inputs": [{"name": "agent", "type": "address", "indexed": True}, {"name": "agentId", "type": "bytes32", "indexed": True}, {"name": "metadataURI", "type": "string", "indexed": False}]},
    {"type": "event", "name": "AgentActivated", "anonymous": False, "inputs": [{"name": "agent", "type": "address", "indexed": True}]},
    {"type": "event", "name": "AgentDeactivated", "anonymous": False, "inputs": [{"name": "agent", "type": "address", "indexed": True}]},
    {"type": "event", "name": "AgentStakeWithdrawn", "anonymous": False, "inputs": [{"name": "agent", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
]
AGENT_STAKING_ABI = [
    {"type": "function", "name": "withdraw", "stateMutability": "nonpayable", "inputs": [{"name": "amount", "type": "uint256"}], "outputs": []},
    {"type": "event", "name": "StakeWithdrawn", "anonymous": False, "inputs": [{"name": "agent", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
]
ORACLE_REGISTRY_ABI = [
    {"type": "function", "name": "registerOracle", "stateMutability": "nonpayable", "inputs": [{"name": "oracleId", "type": "bytes32"}, {"name": "metadataURI", "type": "string"}], "outputs": []},
    {"type": "event", "name": "OracleRegistered", "anonymous": False, "inputs": [{"name": "oracle", "type": "address", "indexed": True}, {"name": "oracleId", "type": "bytes32", "indexed": True}, {"name": "metadataURI", "type": "string", "indexed": False}]},
]
ORACLE_STAKING_ABI = [
    {"type": "function", "name": "stake", "stateMutability": "payable", "inputs": [], "outputs": []},
    {"type": "event", "name": "StakeDeposited", "anonymous": False, "inputs": [{"name": "oracle", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
]
ORACLE_CONSENSUS_ABI = [
    {"type": "function", "name": "submitOutcome", "stateMutability": "nonpayable", "inputs": [{"name": "market", "type": "address"}, {"name": "outcome", "type": "bool"}], "outputs": []},
    {"type": "event", "name": "OracleSubmitted", "anonymous": False, "inputs": [{"name": "oracle", "type": "address", "indexed": True}, {"name": "market", "type": "address", "indexed": True}, {"name": "outcome", "type": "bool", "indexed": False}, {"name": "weight", "type": "uint256", "indexed": False}]},
]
OUTCOME_WRAPPER_ABI = [
    {"type": "function", "name": "wrapOutcome", "stateMutability": "nonpayable", "inputs": [{"name": "market", "type": "address"}], "outputs": [{"name": "yesToken", "type": "address"}, {"name": "noToken", "type": "address"}]},
    {"type": "event", "name": "OutcomeWrapped", "anonymous": False, "inputs": [{"name": "market", "type": "address", "indexed": True}, {"name": "yesToken", "type": "address", "indexed": False}, {"name": "noToken", "type": "address", "indexed": False}]},
]
XCHAIN_ADAPTER_ABI = [
    {"type": "function", "name": "initiateTransfer", "stateMutability": "nonpayable", "inputs": [{"name": "bridge", "type": "address"}, {"name": "token", "type": "address"}, {"name": "amount", "type": "uint256"}, {"name": "targetChainId", "type": "uint256"}, {"name": "targetAddress", "type": "bytes"}], "outputs": [{"name": "transferId", "type": "bytes32"}]},
    {"type": "function", "name": "finalizeTransfer", "stateMutability": "nonpayable", "inputs": [{"name": "transferId", "type": "bytes32"}, {"name": "token", "type": "address"}, {"name": "recipient", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": []},
    {"type": "event", "name": "TransferInitiated", "anonymous": False, "inputs": [{"name": "user", "type": "address", "indexed": True}, {"name": "token", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}, {"name": "targetChainId", "type": "uint256", "indexed": False}, {"name": "targetAddress", "type": "bytes", "indexed": False}, {"name": "transferId", "type": "bytes32", "indexed": False}]},
    {"type": "event", "name": "TransferFinalized", "anonymous": False, "inputs": [{"name": "transferId", "type": "bytes32", "indexed": True}, {"name": "token", "type": "address", "indexed": True}, {"name": "recipient", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
]
RWA_REGISTRY_ABI = [
    {"type": "function", "name": "registerAsset", "stateMutability": "nonpayable", "inputs": [{"name": "assetId", "type": "bytes32"}, {"name": "token", "type": "address"}, {"name": "metadataURI", "type": "string"}, {"name": "active", "type": "bool"}], "outputs": []},
    {"type": "function", "name": "setAssetActive", "stateMutability": "nonpayable", "inputs": [{"name": "assetId", "type": "bytes32"}, {"name": "active", "type": "bool"}], "outputs": []},
    {"type": "event", "name": "AssetRegistered", "anonymous": False, "inputs": [{"name": "assetId", "type": "bytes32", "indexed": True}, {"name": "token", "type": "address", "indexed": True}, {"name": "metadataURI", "type": "string", "indexed": False}, {"name": "active", "type": "bool", "indexed": False}]},
]
RWA_TOKEN_ABI = [
    {"type": "function", "name": "mint", "stateMutability": "nonpayable", "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": []},
    {"type": "function", "name": "burn", "stateMutability": "nonpayable", "inputs": [{"name": "from", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": []},
    {"type": "event", "name": "Minted", "anonymous": False, "inputs": [{"name": "to", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
    {"type": "event", "name": "Burned", "anonymous": False, "inputs": [{"name": "from", "type": "address", "indexed": True}, {"name": "amount", "type": "uint256", "indexed": False}]},
]
DAO_ABI = [
    {"type": "function", "name": "createProposal", "stateMutability": "nonpayable", "inputs": [{"name": "target", "type": "address"}, {"name": "data", "type": "bytes"}, {"name": "description", "type": "string"}], "outputs": [{"name": "proposalId", "type": "uint256"}]},
    {"type": "function", "name": "vote", "stateMutability": "nonpayable", "inputs": [{"name": "proposalId", "type": "uint256"}, {"name": "support", "type": "bool"}], "outputs": []},
    {"type": "function", "name": "queueProposal", "stateMutability": "nonpayable", "inputs": [{"name": "proposalId", "type": "uint256"}, {"name": "delay", "type": "uint256"}], "outputs": []},
    {"type": "function", "name": "executeProposal", "stateMutability": "nonpayable", "inputs": [{"name": "proposalId", "type": "uint256"}], "outputs": []},
    {"type": "function", "name": "quorum", "stateMutability": "view", "inputs": [], "outputs": [{"name": "", "type": "uint256"}]},
    {"type": "function", "name": "getProposal", "stateMutability": "view", "inputs": [{"name": "proposalId", "type": "uint256"}], "outputs": [{"name": "proposer", "type": "address"}, {"name": "target", "type": "address"}, {"name": "data", "type": "bytes"}, {"name": "description", "type": "string"}, {"name": "startBlock", "type": "uint256"}, {"name": "endBlock", "type": "uint256"}, {"name": "forVotes", "type": "uint256"}, {"name": "againstVotes", "type": "uint256"}, {"name": "queued", "type": "bool"}, {"name": "executed", "type": "bool"}, {"name": "executeAfter", "type": "uint256"}, {"name": "actionId", "type": "bytes32"}]},
    {"type": "event", "name": "ProposalCreated", "anonymous": False, "inputs": [{"name": "proposalId", "type": "uint256", "indexed": True}, {"name": "proposer", "type": "address", "indexed": True}, {"name": "target", "type": "address", "indexed": True}, {"name": "dataHash", "type": "bytes32", "indexed": False}, {"name": "description", "type": "string", "indexed": False}]},
    {"type": "event", "name": "VoteCast", "anonymous": False, "inputs": [{"name": "proposalId", "type": "uint256", "indexed": True}, {"name": "voter", "type": "address", "indexed": True}, {"name": "support", "type": "bool", "indexed": False}, {"name": "weight", "type": "uint256", "indexed": False}]},
    {"type": "event", "name": "ProposalQueued", "anonymous": False, "inputs": [{"name": "proposalId", "type": "uint256", "indexed": True}, {"name": "actionId", "type": "bytes32", "indexed": True}, {"name": "executeAfter", "type": "uint256", "indexed": False}]},
    {"type": "event", "name": "ProposalExecuted", "anonymous": False, "inputs": [{"name": "proposalId", "type": "uint256", "indexed": True}, {"name": "actionId", "type": "bytes32", "indexed": True}]},
]


class _ChainClient:
    def __init__(self) -> None:
        rpc_url = os.getenv("RPC_URL", "").strip()
        if not rpc_url:
            raise InvariantViolation("RPC_URL_NOT_CONFIGURED")

        chain_id_raw = os.getenv("CHAIN_ID", "").strip()
        if not chain_id_raw:
            raise InvariantViolation("CHAIN_ID_NOT_CONFIGURED")
        self.chain_id = int(chain_id_raw)

        signer_key = (
            os.getenv("CHAIN_SIGNER_PRIVATE_KEY", "").strip()
            or os.getenv("GOVERNANCE_SIGNER", "").strip()
        )
        self.w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 30}))
        self.w3.middleware_onion.inject(_poa_middleware, layer=0)
        if not self.w3.is_connected():
            raise InvariantViolation("RPC_UNREACHABLE")
        if int(self.w3.eth.chain_id) != self.chain_id:
            raise InvariantViolation("CHAIN_ID_MISMATCH")

        self.account = None
        self.signer = None
        if signer_key:
            try:
                self.account = Account.from_key(signer_key)
            except Exception as exc:
                raise InvariantViolation("INVALID_CHAIN_SIGNER_PRIVATE_KEY", str(exc)) from exc
            self.signer = to_checksum_address(self.account.address)
        self.confirmations = max(1, int(os.getenv("CHAIN_CONFIRMATIONS", "1")))
        self.poll_s = max(0.5, float(os.getenv("CHAIN_TX_POLL_SECONDS", "2")))
        self.timeout_s = max(30, int(os.getenv("CHAIN_TX_TIMEOUT_SECONDS", "240")))
        self.market_creation_bond_units = max(0, int(os.getenv("MARKET_CREATION_BOND_UNITS", "0")))
        self._nonce_lock = threading.Lock()

    @staticmethod
    def id_hash(identifier: str) -> bytes:
        return Web3.keccak(text=identifier)

    @staticmethod
    def checksum(address: str) -> str:
        try:
            return to_checksum_address(address)
        except Exception as exc:
            raise InvariantViolation("INVALID_ADDRESS", str(exc)) from exc

    def env_address(self, env_name: str) -> str:
        raw = os.getenv(env_name, "").strip()
        if not raw:
            raise InvariantViolation(f"{env_name}_NOT_CONFIGURED")
        return self.checksum(raw)

    def contract(self, address: str, abi: list[dict]) -> Contract:
        return self.w3.eth.contract(address=self.checksum(address), abi=abi)

    def _fee_fields(self) -> Dict[str, int]:
        latest = self.w3.eth.get_block("latest")
        base = latest.get("baseFeePerGas")
        if base is None:
            return {"gasPrice": int(self.w3.eth.gas_price)}
        prio = int(self.w3.eth.max_priority_fee)
        return {"maxPriorityFeePerGas": prio, "maxFeePerGas": int(base) * 2 + prio}

    def send(self, contract: Contract, fn_name: str, args: list[Any], value_wei: int = 0) -> str:
        try:
            fn = getattr(contract.functions, fn_name)(*args)
            with self._nonce_lock:
                if self.account is None or self.signer is None:
                    raise InvariantViolation("CHAIN_SIGNER_PRIVATE_KEY_NOT_CONFIGURED")
                nonce = self.w3.eth.get_transaction_count(self.signer, "pending")
                tx = fn.build_transaction({"from": self.signer, "nonce": nonce, "chainId": self.chain_id, "value": int(value_wei), **self._fee_fields()})
                try:
                    gas = self.w3.eth.estimate_gas(tx)
                    tx["gas"] = max(gas + 50_000, int(gas * 1.2))
                except Exception:
                    tx["gas"] = 1_500_000

                gas_price = int(tx.get("maxFeePerGas") or tx.get("gasPrice") or 0)
                required_wei = int(value_wei) + int(tx["gas"]) * gas_price
                signer_balance = int(self.w3.eth.get_balance(self.signer))
                if signer_balance < required_wei:
                    raise InvariantViolation(
                        "CHAIN_SIGNER_INSUFFICIENT_FUNDS",
                        (
                            f"Relayer wallet {self.signer} has {signer_balance} wei, "
                            f"but needs at least {required_wei} wei (value + max gas). "
                            "Fund the signer wallet and retry."
                        ),
                    )

                signed = self.w3.eth.account.sign_transaction(tx, private_key=self.account.key)
                return self.w3.eth.send_raw_transaction(signed.rawTransaction).hex()
        except InvariantViolation:
            raise
        except Exception as exc:
            if _contains_insufficient_funds_error(exc):
                raise InvariantViolation(
                    "CHAIN_SIGNER_INSUFFICIENT_FUNDS",
                    (
                        f"Relayer wallet {self.signer} has insufficient native token for "
                        "gas/value transfer. Fund the signer wallet and retry."
                    ),
                ) from exc
            selector = _extract_revert_selector(exc)
            if selector and selector in _REVERT_SELECTOR_ERRORS:
                raise InvariantViolation(_REVERT_SELECTOR_ERRORS[selector]) from exc
            raise InvariantViolation("CHAIN_TX_SUBMIT_FAILED", str(exc)) from exc

    def send_with_account(self, account: Any, contract: Contract, fn_name: str, args: list[Any], value_wei: int = 0) -> str:
        try:
            signer = self.checksum(account.address)
            fn = getattr(contract.functions, fn_name)(*args)
            with self._nonce_lock:
                nonce = self.w3.eth.get_transaction_count(signer, "pending")
                tx = fn.build_transaction({"from": signer, "nonce": nonce, "chainId": self.chain_id, "value": int(value_wei), **self._fee_fields()})
                try:
                    gas = self.w3.eth.estimate_gas(tx)
                    tx["gas"] = max(gas + 50_000, int(gas * 1.2))
                except Exception:
                    tx["gas"] = 1_500_000

                gas_price = int(tx.get("maxFeePerGas") or tx.get("gasPrice") or 0)
                required_wei = int(value_wei) + int(tx["gas"]) * gas_price
                signer_balance = int(self.w3.eth.get_balance(signer))
                if signer_balance < required_wei:
                    raise InvariantViolation("AUTONOMOUS_AGENT_INSUFFICIENT_GAS")

                signed = self.w3.eth.account.sign_transaction(tx, private_key=account.key)
                return self.w3.eth.send_raw_transaction(signed.rawTransaction).hex()
        except InvariantViolation:
            raise
        except Exception as exc:
            if _contains_insufficient_funds_error(exc):
                raise InvariantViolation("AUTONOMOUS_AGENT_INSUFFICIENT_FUNDS") from exc
            selector = _extract_revert_selector(exc)
            if selector and selector in _REVERT_SELECTOR_ERRORS:
                raise InvariantViolation(_REVERT_SELECTOR_ERRORS[selector]) from exc
            raise InvariantViolation("AUTONOMOUS_AGENT_TX_SUBMIT_FAILED", str(exc)) from exc

    def wait(self, tx_hash: str) -> Dict[str, Any]:
        deadline = time.time() + self.timeout_s
        receipt = None
        while time.time() < deadline:
            try:
                receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            except TransactionNotFound:
                receipt = None
            if receipt:
                break
            time.sleep(self.poll_s)
        if receipt is None:
            raise InvariantViolation("CHAIN_TX_TIMEOUT")
        if int(receipt.get("status", 0)) != 1:
            raise InvariantViolation("CHAIN_TX_REVERTED")
        while int(self.w3.eth.block_number) - int(receipt["blockNumber"]) + 1 < self.confirmations:
            time.sleep(self.poll_s)
        return self._receipt(receipt)

    def _decode_events(self, receipt: Dict[str, Any]) -> list[dict[str, Any]]:
        specs: list[tuple[Optional[str], list[dict], list[str]]] = [
            (os.getenv("MARKET_FACTORY_ADDRESS"), MARKET_FACTORY_ABI, ["MarketCreated"]),
            (os.getenv("SETTLEMENT_ENGINE_ADDRESS"), SETTLEMENT_ENGINE_ABI, ["MarketSettlementExecuted"]),
            (None, PREDICTION_MARKET_ABI, ["BetPlaced", "MarketSettled", "PayoutClaimed", "RefundClaimed", "MarketCanceledEvent"]),
            (os.getenv("AGENT_REGISTRY_ADDRESS"), AGENT_REGISTRY_ABI, ["AgentRegistered", "AgentActivated", "AgentDeactivated", "AgentStakeWithdrawn"]),
            (os.getenv("AGENT_STAKING_ADDRESS"), AGENT_STAKING_ABI, ["StakeWithdrawn"]),
            (os.getenv("ORACLE_REGISTRY_ADDRESS"), ORACLE_REGISTRY_ABI, ["OracleRegistered"]),
            (os.getenv("ORACLE_STAKING_ADDRESS"), ORACLE_STAKING_ABI, ["StakeDeposited"]),
            (os.getenv("ORACLE_CONSENSUS_ADDRESS"), ORACLE_CONSENSUS_ABI, ["OracleSubmitted"]),
            (os.getenv("OUTCOME_WRAPPER_ADDRESS"), OUTCOME_WRAPPER_ABI, ["OutcomeWrapped"]),
            (os.getenv("CROSS_CHAIN_ADAPTER_ADDRESS"), XCHAIN_ADAPTER_ABI, ["TransferInitiated", "TransferFinalized"]),
            (os.getenv("RWA_REGISTRY_ADDRESS"), RWA_REGISTRY_ABI, ["AssetRegistered"]),
            (os.getenv("GOVERNANCE_DAO_ADDRESS"), DAO_ABI, ["ProposalCreated", "VoteCast", "ProposalQueued", "ProposalExecuted"]),
        ]
        out: list[dict[str, Any]] = []
        for addr, abi, names in specs:
            if addr:
                try:
                    c = self.contract(addr, abi)
                except InvariantViolation:
                    continue
            else:
                c = self.w3.eth.contract(address="0x0000000000000000000000000000000000000001", abi=abi)
            for event_name in names:
                try:
                    event_cls = getattr(c.events, event_name)
                    decoded = event_cls().process_receipt(receipt)
                except Exception:
                    continue
                for entry in decoded:
                    row: Dict[str, Any] = {"event": entry["event"], "address": self.checksum(entry["address"])}
                    for k, v in dict(entry["args"]).items():
                        nv = _norm(v)
                        row[k] = nv
                        row[_camel_to_snake(k)] = nv
                    out.append(row)
        return out

    def _receipt(self, receipt: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "transaction_hash": _norm(receipt["transactionHash"]),
            "from": self.checksum(receipt["from"]),
            "to": self.checksum(receipt["to"]) if receipt.get("to") else None,
            "block_number": int(receipt["blockNumber"]),
            "status": int(receipt.get("status", 0)),
            "gas_used": int(receipt.get("gasUsed", 0)),
            "logs": self._decode_events(receipt),
        }

    def verify_call(
        self,
        *,
        tx_hash: str,
        contract: Contract,
        expected_from: str,
        expected_fn: str,
        expected_value_wei: Optional[int] = None,
        expected_args: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        tx = self.w3.eth.get_transaction(tx_hash)
        receipt = self.wait(tx_hash)
        if self.checksum(tx["from"]).lower() != self.checksum(expected_from).lower():
            raise InvariantViolation("CHAIN_TX_CALLER_MISMATCH")
        if tx.get("to") is None or self.checksum(tx["to"]).lower() != self.checksum(contract.address).lower():
            raise InvariantViolation("CHAIN_TX_TARGET_MISMATCH")
        if expected_value_wei is not None and int(tx["value"]) != int(expected_value_wei):
            raise InvariantViolation("CHAIN_TX_VALUE_MISMATCH")
        fn_obj, args = contract.decode_function_input(tx["input"])
        if fn_obj.fn_name != expected_fn:
            raise InvariantViolation("CHAIN_TX_FUNCTION_MISMATCH")
        for key, expected in (expected_args or {}).items():
            actual = args.get(key)
            if isinstance(expected, bytes):
                if HexBytes(actual) != HexBytes(expected):
                    raise InvariantViolation("CHAIN_TX_ARGS_MISMATCH")
            elif str(actual).lower() != str(expected).lower():
                raise InvariantViolation("CHAIN_TX_ARGS_MISMATCH")
        return receipt


class ChainReader:
    _client: Optional[_ChainClient] = None

    @classmethod
    def _c(cls) -> _ChainClient:
        if cls._client is None:
            cls._client = _ChainClient()
        return cls._client

    @staticmethod
    async def _submit(contract: Contract, fn_name: str, args: list[Any], value_wei: int = 0) -> str:
        c = ChainReader._c()
        tx_hash = await asyncio.to_thread(c.send, contract, fn_name, args, value_wei)
        logger.info("chain tx submitted %s (%s)", tx_hash, fn_name)
        return tx_hash

    @staticmethod
    async def wait_for_tx(tx_hash: str) -> Dict[str, Any]:
        return await asyncio.to_thread(ChainReader._c().wait, tx_hash)

    @staticmethod
    async def create_market_on_chain(*, creator: str, market_id: str, start_time: int, end_time: int, max_exposure: int, metadata_uri: str) -> str:
        c = ChainReader._c()
        _ = creator
        if os.getenv("ALLOW_BACKEND_MARKET_CREATION_RELAYER", "false").lower() != "true":
            raise InvariantViolation("BACKEND_MARKET_CREATION_RELAYER_DISABLED")
        factory = c.contract(c.env_address("MARKET_FACTORY_ADDRESS"), MARKET_FACTORY_ABI)
        return await ChainReader._submit(factory, "createMarket", [c.id_hash(market_id), int(start_time), int(end_time), int(max_exposure), metadata_uri], 0)

    @staticmethod
    async def verify_market_create_tx(
        *,
        tx_hash: str,
        creator: str,
        market_id: str,
        start_time: int,
        end_time: int,
        max_exposure: int,
        metadata_uri: str,
    ) -> Dict[str, Any]:
        c = ChainReader._c()
        factory = c.contract(c.env_address("MARKET_FACTORY_ADDRESS"), MARKET_FACTORY_ABI)
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=factory,
            expected_from=creator,
            expected_fn="createMarket",
            expected_value_wei=0,
            expected_args={
                "marketId": c.id_hash(market_id),
                "startTime": int(start_time),
                "endTime": int(end_time),
                "maxExposure": int(max_exposure),
                "metadataURI": metadata_uri,
            },
        )

    @staticmethod
    async def settle_market_on_chain(*, market_address: str, outcome: bool, caller: str) -> str:
        c = ChainReader._c()
        _ = caller
        if os.getenv("ALLOW_BACKEND_GOVERNANCE_TX", "false").lower() != "true":
            raise InvariantViolation("BACKEND_GOVERNANCE_TX_DISABLED")
        settlement = c.contract(c.env_address("SETTLEMENT_ENGINE_ADDRESS"), SETTLEMENT_ENGINE_ABI)
        return await ChainReader._submit(
            settlement,
            "governanceSettleMarket",
            [c.checksum(market_address), bool(outcome)],
        )

    @staticmethod
    async def verify_market_bet_tx(*, tx_hash: str, user_address: str, market_address: str, side: str, amount: int) -> Dict[str, Any]:
        c = ChainReader._c()
        market = c.contract(market_address, PREDICTION_MARKET_ABI)
        fn_name = "betYes" if side.upper() == "YES" else "betNo"
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=market,
            expected_from=user_address,
            expected_fn=fn_name,
            expected_value_wei=0,
            expected_args={"amount": int(amount)},
        )

    @staticmethod
    async def autonomous_trader_address() -> Optional[str]:
        key = os.getenv("AUTONOMOUS_AGENT_PRIVATE_KEY", "").strip()
        if not key:
            return None
        try:
            return _ChainClient.checksum(Account.from_key(key).address)
        except Exception as exc:
            raise InvariantViolation("INVALID_AUTONOMOUS_AGENT_PRIVATE_KEY", str(exc)) from exc

    @staticmethod
    async def place_autonomous_agent_bet(
        *,
        market_address: str,
        side: str,
        amount: int,
    ) -> str:
        if os.getenv("AUTONOMOUS_AGENT_LIVE_TRADING", "false").lower() != "true":
            raise InvariantViolation("AUTONOMOUS_AGENT_LIVE_TRADING_DISABLED")
        if amount <= 0:
            raise InvariantViolation("INVALID_AUTONOMOUS_AGENT_BET_AMOUNT")

        max_tx = int(os.getenv("AUTONOMOUS_AGENT_MAX_TX_WEI", "0") or "0")
        if max_tx <= 0:
            raise InvariantViolation("AUTONOMOUS_AGENT_MAX_TX_WEI_REQUIRED")
        if int(amount) > max_tx:
            raise InvariantViolation("AUTONOMOUS_AGENT_MAX_TX_EXCEEDED")

        key = os.getenv("AUTONOMOUS_AGENT_PRIVATE_KEY", "").strip()
        if not key:
            raise InvariantViolation("AUTONOMOUS_AGENT_PRIVATE_KEY_NOT_CONFIGURED")

        c = ChainReader._c()
        account = Account.from_key(key)
        signer = c.checksum(account.address)
        collateral = c.contract(c.env_address("COLLATERAL_TOKEN_ADDRESS"), ERC20_ABI)
        market = c.contract(market_address, PREDICTION_MARKET_ABI)
        market_checksum = c.checksum(market_address)

        def _has_allowance_and_balance() -> tuple[int, int]:
            allowance = collateral.functions.allowance(signer, market_checksum).call()
            balance = collateral.functions.balanceOf(signer).call()
            return int(allowance), int(balance)

        allowance, balance = await asyncio.to_thread(_has_allowance_and_balance)
        if balance < int(amount):
            raise InvariantViolation("AUTONOMOUS_AGENT_COLLATERAL_BALANCE_LOW")
        if allowance < int(amount):
            approve_tx = await asyncio.to_thread(
                c.send_with_account,
                account,
                collateral,
                "approve",
                [market_checksum, int(amount)],
                0,
            )
            await asyncio.to_thread(c.wait, approve_tx)

        fn_name = "betYes" if side.upper() == "YES" else "betNo"
        tx_hash = await asyncio.to_thread(
            c.send_with_account,
            account,
            market,
            fn_name,
            [int(amount)],
            0,
        )
        await asyncio.to_thread(c.wait, tx_hash)
        return tx_hash

    @staticmethod
    async def verify_agent_registration_tx(*, tx_hash: str, owner: str, agent_id: str, metadata_uri: str) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("AGENT_REGISTRY_ADDRESS"), AGENT_REGISTRY_ABI)
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=contract, expected_from=owner, expected_fn="registerAgent", expected_value_wei=0, expected_args={"agentId": c.id_hash(agent_id), "metadataURI": metadata_uri})

    @staticmethod
    async def verify_agent_stake_activate_tx(*, tx_hash: str, owner: str, amount: int) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("AGENT_REGISTRY_ADDRESS"), AGENT_REGISTRY_ABI)
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=contract, expected_from=owner, expected_fn="stakeAndActivate", expected_value_wei=int(amount), expected_args={})

    @staticmethod
    async def verify_agent_deactivate_tx(*, tx_hash: str, owner: str) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("AGENT_REGISTRY_ADDRESS"), AGENT_REGISTRY_ABI)
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=contract, expected_from=owner, expected_fn="deactivate", expected_value_wei=0, expected_args={})

    @staticmethod
    async def verify_agent_unstake_tx(*, tx_hash: str, owner: str, amount: int) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("AGENT_REGISTRY_ADDRESS"), AGENT_REGISTRY_ABI)
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=contract, expected_from=owner, expected_fn="unstake", expected_value_wei=0, expected_args={"amount": int(amount)})

    @staticmethod
    async def get_agent_state(*, owner: str) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("AGENT_REGISTRY_ADDRESS"), AGENT_REGISTRY_ABI)

        def _read_state() -> Dict[str, Any]:
            _, _, stake, active = contract.functions.getAgent(c.checksum(owner)).call()
            return {"stake": int(stake), "active": bool(active)}

        try:
            return await asyncio.to_thread(_read_state)
        except Exception as exc:
            raise InvariantViolation("AGENT_STATE_READ_FAILED", str(exc)) from exc

    @staticmethod
    async def verify_oracle_registration_tx(*, tx_hash: str, oracle_address: str, oracle_id: str, metadata_uri: str) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("ORACLE_REGISTRY_ADDRESS"), ORACLE_REGISTRY_ABI)
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=contract, expected_from=oracle_address, expected_fn="registerOracle", expected_value_wei=0, expected_args={"oracleId": c.id_hash(oracle_id), "metadataURI": metadata_uri})

    @staticmethod
    async def verify_oracle_stake_tx(*, tx_hash: str, oracle_address: str, amount: int) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("ORACLE_STAKING_ADDRESS"), ORACLE_STAKING_ABI)
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=contract, expected_from=oracle_address, expected_fn="stake", expected_value_wei=int(amount), expected_args={})

    @staticmethod
    async def verify_oracle_submission_tx(*, tx_hash: str, oracle_address: str, market_address: str, outcome: bool) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("ORACLE_CONSENSUS_ADDRESS"), ORACLE_CONSENSUS_ABI)
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=contract, expected_from=oracle_address, expected_fn="submitOutcome", expected_value_wei=0, expected_args={"market": c.checksum(market_address), "outcome": bool(outcome)})

    @staticmethod
    async def execute_rebalance_on_chain(*, user_address: str, allocation: Dict[str, Any]) -> str:
        _ = user_address
        _ = allocation
        raise InvariantViolation("YIELD_CHAIN_ROUTING_NOT_CONFIGURED")

    @staticmethod
    async def wrap_outcome_on_chain(*, market_address: str) -> str:
        c = ChainReader._c()
        contract = c.contract(c.env_address("OUTCOME_WRAPPER_ADDRESS"), OUTCOME_WRAPPER_ABI)
        return await ChainReader._submit(contract, "wrapOutcome", [c.checksum(market_address)])

    @staticmethod
    async def initiate_cross_chain_transfer_on_chain(*, bridge_address: str, token_address: str, amount: int, target_chain_id: int, target_address: bytes) -> str:
        c = ChainReader._c()
        contract = c.contract(c.env_address("CROSS_CHAIN_ADAPTER_ADDRESS"), XCHAIN_ADAPTER_ABI)
        return await ChainReader._submit(contract, "initiateTransfer", [c.checksum(bridge_address), c.checksum(token_address), int(amount), int(target_chain_id), target_address])

    @staticmethod
    async def finalize_cross_chain_transfer_on_chain(*, transfer_id: str, token_address: str, recipient: str, amount: int) -> str:
        c = ChainReader._c()
        contract = c.contract(c.env_address("CROSS_CHAIN_ADAPTER_ADDRESS"), XCHAIN_ADAPTER_ABI)
        transfer = HexBytes(transfer_id if transfer_id.startswith("0x") else "0x" + transfer_id)
        return await ChainReader._submit(contract, "finalizeTransfer", [transfer, c.checksum(token_address), c.checksum(recipient), int(amount)])

    @staticmethod
    async def verify_rwa_registration_tx(
        *,
        tx_hash: str,
        registrar: str,
        rwa_id: str,
        token_address: str,
        metadata_uri: str,
        active: bool = True,
    ) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("RWA_REGISTRY_ADDRESS"), RWA_REGISTRY_ABI)
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=contract,
            expected_from=registrar,
            expected_fn="registerAsset",
            expected_value_wei=0,
            expected_args={
                "assetId": c.id_hash(rwa_id),
                "token": c.checksum(token_address),
                "metadataURI": metadata_uri,
                "active": bool(active),
            },
        )

    @staticmethod
    async def verify_rwa_mint_tx(
        *,
        tx_hash: str,
        operator: str,
        token_address: str,
        recipient: str,
        amount: int,
    ) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(token_address, RWA_TOKEN_ABI)
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=contract,
            expected_from=operator,
            expected_fn="mint",
            expected_value_wei=0,
            expected_args={"to": c.checksum(recipient), "amount": int(amount)},
        )

    @staticmethod
    async def verify_rwa_burn_tx(
        *,
        tx_hash: str,
        operator: str,
        token_address: str,
        account: str,
        amount: int,
    ) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(token_address, RWA_TOKEN_ABI)
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=contract,
            expected_from=operator,
            expected_fn="burn",
            expected_value_wei=0,
            expected_args={"from": c.checksum(account), "amount": int(amount)},
        )

    @staticmethod
    async def verify_governance_create_tx(
        *,
        tx_hash: str,
        proposer: str,
        target: str,
        action_data: str,
        description: str,
    ) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("GOVERNANCE_DAO_ADDRESS"), DAO_ABI)
        data = HexBytes(action_data if action_data.startswith("0x") else "0x" + action_data)
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=contract,
            expected_from=proposer,
            expected_fn="createProposal",
            expected_value_wei=0,
            expected_args={
                "target": c.checksum(target),
                "data": bytes(data),
                "description": description,
            },
        )

    @staticmethod
    async def verify_governance_vote_tx(
        *,
        tx_hash: str,
        voter: str,
        proposal_id: int,
        support: bool,
    ) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("GOVERNANCE_DAO_ADDRESS"), DAO_ABI)
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=contract,
            expected_from=voter,
            expected_fn="vote",
            expected_value_wei=0,
            expected_args={"proposalId": int(proposal_id), "support": bool(support)},
        )

    @staticmethod
    async def verify_governance_queue_tx(
        *,
        tx_hash: str,
        caller: str,
        proposal_id: int,
        delay: int,
    ) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("GOVERNANCE_DAO_ADDRESS"), DAO_ABI)
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=contract,
            expected_from=caller,
            expected_fn="queueProposal",
            expected_value_wei=0,
            expected_args={"proposalId": int(proposal_id), "delay": int(delay)},
        )

    @staticmethod
    async def verify_governance_execute_tx(
        *,
        tx_hash: str,
        caller: str,
        proposal_id: int,
    ) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("GOVERNANCE_DAO_ADDRESS"), DAO_ABI)
        return await asyncio.to_thread(
            c.verify_call,
            tx_hash=tx_hash,
            contract=contract,
            expected_from=caller,
            expected_fn="executeProposal",
            expected_value_wei=0,
            expected_args={"proposalId": int(proposal_id)},
        )

    @staticmethod
    async def get_governance_proposal(*, proposal_id: int) -> Dict[str, Any]:
        c = ChainReader._c()
        contract = c.contract(c.env_address("GOVERNANCE_DAO_ADDRESS"), DAO_ABI)

        def _read() -> Dict[str, Any]:
            (
                proposer,
                target,
                data,
                description,
                start_block,
                end_block,
                for_votes,
                against_votes,
                _queued,
                executed,
                execute_after,
                action_id,
            ) = contract.functions.getProposal(int(proposal_id)).call()
            quorum = contract.functions.quorum().call()
            return {
                "proposer": c.checksum(proposer),
                "target": c.checksum(target),
                "data": HexBytes(data).hex(),
                "description": description,
                "start_block": int(start_block),
                "end_block": int(end_block),
                "for_votes": int(for_votes),
                "against_votes": int(against_votes),
                "executed": bool(executed),
                "execute_after": int(execute_after) or None,
                "action_id": HexBytes(action_id).hex(),
                "quorum": int(quorum),
            }

        return await asyncio.to_thread(_read)
