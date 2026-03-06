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
    {"type": "function", "name": "createMarket", "stateMutability": "payable", "inputs": [{"name": "marketId", "type": "bytes32"}, {"name": "startTime", "type": "uint256"}, {"name": "endTime", "type": "uint256"}, {"name": "maxExposure", "type": "uint256"}, {"name": "metadataURI", "type": "string"}], "outputs": [{"name": "marketAddress", "type": "address"}]},
    {"type": "event", "name": "MarketCreated", "anonymous": False, "inputs": [{"name": "creator", "type": "address", "indexed": True}, {"name": "market", "type": "address", "indexed": True}, {"name": "marketId", "type": "bytes32", "indexed": True}, {"name": "startTime", "type": "uint256", "indexed": False}, {"name": "endTime", "type": "uint256", "indexed": False}, {"name": "maxExposure", "type": "uint256", "indexed": False}, {"name": "metadataURI", "type": "string", "indexed": False}]},
]
PREDICTION_MARKET_ABI = [
    {"type": "function", "name": "betYes", "stateMutability": "payable", "inputs": [], "outputs": []},
    {"type": "function", "name": "betNo", "stateMutability": "payable", "inputs": [], "outputs": []},
    {"type": "function", "name": "settle", "stateMutability": "nonpayable", "inputs": [{"name": "outcome", "type": "bool"}], "outputs": []},
    {"type": "event", "name": "MarketSettled", "anonymous": False, "inputs": [{"name": "outcome", "type": "bool", "indexed": False}, {"name": "totalYes", "type": "uint256", "indexed": False}, {"name": "totalNo", "type": "uint256", "indexed": False}]},
]
AGENT_REGISTRY_ABI = [
    {"type": "function", "name": "registerAgent", "stateMutability": "nonpayable", "inputs": [{"name": "agentId", "type": "bytes32"}, {"name": "metadataURI", "type": "string"}], "outputs": []},
    {"type": "function", "name": "stakeAndActivate", "stateMutability": "payable", "inputs": [], "outputs": []},
    {"type": "function", "name": "deactivate", "stateMutability": "nonpayable", "inputs": [], "outputs": []},
    {"type": "event", "name": "AgentRegistered", "anonymous": False, "inputs": [{"name": "agent", "type": "address", "indexed": True}, {"name": "agentId", "type": "bytes32", "indexed": True}, {"name": "metadataURI", "type": "string", "indexed": False}]},
    {"type": "event", "name": "AgentActivated", "anonymous": False, "inputs": [{"name": "agent", "type": "address", "indexed": True}]},
    {"type": "event", "name": "AgentDeactivated", "anonymous": False, "inputs": [{"name": "agent", "type": "address", "indexed": True}]},
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
        if not signer_key:
            raise InvariantViolation("CHAIN_SIGNER_PRIVATE_KEY_NOT_CONFIGURED")

        self.w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 30}))
        self.w3.middleware_onion.inject(_poa_middleware, layer=0)
        if not self.w3.is_connected():
            raise InvariantViolation("RPC_UNREACHABLE")
        if int(self.w3.eth.chain_id) != self.chain_id:
            raise InvariantViolation("CHAIN_ID_MISMATCH")

        try:
            self.account = Account.from_key(signer_key)
        except Exception as exc:
            raise InvariantViolation("INVALID_CHAIN_SIGNER_PRIVATE_KEY", str(exc)) from exc
        self.signer = to_checksum_address(self.account.address)
        self.confirmations = max(1, int(os.getenv("CHAIN_CONFIRMATIONS", "1")))
        self.poll_s = max(0.5, float(os.getenv("CHAIN_TX_POLL_SECONDS", "2")))
        self.timeout_s = max(30, int(os.getenv("CHAIN_TX_TIMEOUT_SECONDS", "240")))
        self.market_creation_bond_wei = max(0, int(os.getenv("MARKET_CREATION_BOND_WEI", "0")))
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
                nonce = self.w3.eth.get_transaction_count(self.signer, "pending")
                tx = fn.build_transaction({"from": self.signer, "nonce": nonce, "chainId": self.chain_id, "value": int(value_wei), **self._fee_fields()})
                try:
                    gas = self.w3.eth.estimate_gas(tx)
                    tx["gas"] = max(gas + 50_000, int(gas * 1.2))
                except Exception:
                    tx["gas"] = 1_500_000
                signed = self.w3.eth.account.sign_transaction(tx, private_key=self.account.key)
                return self.w3.eth.send_raw_transaction(signed.rawTransaction).hex()
        except InvariantViolation:
            raise
        except Exception as exc:
            raise InvariantViolation("CHAIN_TX_SUBMIT_FAILED", str(exc)) from exc

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
            (None, PREDICTION_MARKET_ABI, ["MarketSettled"]),
            (os.getenv("AGENT_REGISTRY_ADDRESS"), AGENT_REGISTRY_ABI, ["AgentRegistered", "AgentActivated", "AgentDeactivated"]),
            (os.getenv("AGENT_STAKING_ADDRESS"), AGENT_STAKING_ABI, ["StakeWithdrawn"]),
            (os.getenv("ORACLE_REGISTRY_ADDRESS"), ORACLE_REGISTRY_ABI, ["OracleRegistered"]),
            (os.getenv("ORACLE_STAKING_ADDRESS"), ORACLE_STAKING_ABI, ["StakeDeposited"]),
            (os.getenv("ORACLE_CONSENSUS_ADDRESS"), ORACLE_CONSENSUS_ABI, ["OracleSubmitted"]),
            (os.getenv("OUTCOME_WRAPPER_ADDRESS"), OUTCOME_WRAPPER_ABI, ["OutcomeWrapped"]),
            (os.getenv("CROSS_CHAIN_ADAPTER_ADDRESS"), XCHAIN_ADAPTER_ABI, ["TransferInitiated", "TransferFinalized"]),
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
        factory = c.contract(c.env_address("MARKET_FACTORY_ADDRESS"), MARKET_FACTORY_ABI)
        return await ChainReader._submit(factory, "createMarket", [c.id_hash(market_id), int(start_time), int(end_time), int(max_exposure), metadata_uri], c.market_creation_bond_wei)

    @staticmethod
    async def settle_market_on_chain(*, market_address: str, outcome: bool, caller: str) -> str:
        c = ChainReader._c()
        _ = caller
        market = c.contract(market_address, PREDICTION_MARKET_ABI)
        return await ChainReader._submit(market, "settle", [bool(outcome)])

    @staticmethod
    async def verify_market_bet_tx(*, tx_hash: str, user_address: str, market_address: str, side: str, amount: int) -> Dict[str, Any]:
        c = ChainReader._c()
        market = c.contract(market_address, PREDICTION_MARKET_ABI)
        fn_name = "betYes" if side.upper() == "YES" else "betNo"
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=market, expected_from=user_address, expected_fn=fn_name, expected_value_wei=int(amount), expected_args={})

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
        contract = c.contract(c.env_address("AGENT_STAKING_ADDRESS"), AGENT_STAKING_ABI)
        return await asyncio.to_thread(c.verify_call, tx_hash=tx_hash, contract=contract, expected_from=owner, expected_fn="withdraw", expected_value_wei=0, expected_args={"amount": int(amount)})

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
