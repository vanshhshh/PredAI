"""
Create 100 on-chain markets and seed two-sided liquidity.

Requirements:
- backend /auth/challenge and /auth/verify enabled
- backend market creation wired to chain signer
- funded seeder wallet private key
- RPC endpoint for the target network
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import List

import httpx
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3


PREDICTION_MARKET_ABI = [
    {"type": "function", "name": "betYes", "stateMutability": "payable", "inputs": [], "outputs": []},
    {"type": "function", "name": "betNo", "stateMutability": "payable", "inputs": [], "outputs": []},
]


@dataclass
class MarketSpec:
    market_id: str
    title: str
    description: str
    end_time: int


def _env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(f"{name} is required")
    return value


def generate_market_specs(count: int = 100) -> List[MarketSpec]:
    now = datetime.now(UTC)
    assets = {
        "BTC": 90000,
        "ETH": 5000,
        "SOL": 300,
        "MATIC": 1.5,
        "BNB": 800,
        "AVAX": 80,
        "ARB": 3.0,
        "LINK": 45,
        "DOGE": 0.45,
        "XRP": 2.5,
    }
    multipliers = [0.85, 0.95, 1.05, 1.15, 1.25]
    month_offsets = [1, 2, 3, 4]
    out: list[MarketSpec] = []

    for asset, base in assets.items():
        for month in month_offsets:
            expiry = (now + timedelta(days=30 * month)).replace(hour=23, minute=59, second=0, microsecond=0)
            for multiplier in multipliers:
                threshold = base * multiplier
                threshold_label = f"{threshold:.4f}".rstrip("0").rstrip(".")
                date_label = expiry.strftime("%Y-%m-%d")
                market_id = f"{asset.lower()}-{threshold_label.replace('.', '-')}-{date_label}"
                title = f"Will {asset} close above {threshold_label} USD on {date_label}?"
                description = (
                    f"Resolution source: primary spot market daily close for {asset} "
                    f"at 23:59:00 UTC on {date_label}."
                )
                out.append(
                    MarketSpec(
                        market_id=market_id,
                        title=title,
                        description=description,
                        end_time=int(expiry.timestamp()),
                    )
                )

    return out[:count]


def authenticate_wallet(client: httpx.Client, base_url: str, private_key: str, chain_id: int) -> str:
    account = Account.from_key(private_key)
    challenge = client.post(
        f"{base_url}/auth/challenge",
        json={"address": account.address, "chain_id": chain_id, "origin": "seed-script"},
        timeout=15,
    )
    challenge.raise_for_status()
    payload = challenge.json()
    message = payload["message"]
    challenge_token = payload["challenge_token"]

    signature = Account.sign_message(encode_defunct(text=message), private_key=private_key).signature.hex()
    verify = client.post(
        f"{base_url}/auth/verify",
        json={
            "address": account.address,
            "signature": signature,
            "message": message,
            "challenge_token": challenge_token,
        },
        timeout=15,
    )
    verify.raise_for_status()
    verified = verify.json()
    return verified["access_token"]


def create_market(
    client: httpx.Client,
    base_url: str,
    token: str,
    *,
    spec: MarketSpec,
    start_time: int,
    max_exposure: int,
) -> dict:
    response = client.post(
        f"{base_url}/markets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "market_id": spec.market_id,
            "start_time": start_time,
            "end_time": spec.end_time,
            "max_exposure": max_exposure,
            "metadata_uri": f'{{"title":"{spec.title}","description":"{spec.description}"}}',
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def send_bet_tx(
    *,
    w3: Web3,
    private_key: str,
    market_address: str,
    side: str,
    amount_wei: int,
) -> str:
    account = Account.from_key(private_key)
    signer = Web3.to_checksum_address(account.address)
    contract = w3.eth.contract(address=Web3.to_checksum_address(market_address), abi=PREDICTION_MARKET_ABI)
    fn = contract.functions.betYes() if side.upper() == "YES" else contract.functions.betNo()
    nonce = w3.eth.get_transaction_count(signer, "pending")
    latest = w3.eth.get_block("latest")
    base_fee = latest.get("baseFeePerGas")
    tx = fn.build_transaction(
        {
            "from": signer,
            "nonce": nonce,
            "chainId": int(w3.eth.chain_id),
            "value": int(amount_wei),
            "gas": 300000,
            **(
                {"gasPrice": int(w3.eth.gas_price)}
                if base_fee is None
                else {
                    "maxPriorityFeePerGas": int(w3.eth.max_priority_fee),
                    "maxFeePerGas": int(base_fee) * 2 + int(w3.eth.max_priority_fee),
                }
            ),
        }
    )
    signed = w3.eth.account.sign_transaction(tx, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction).hex()
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
    if int(receipt.get("status", 0)) != 1:
        raise RuntimeError(f"Bet tx reverted: {tx_hash}")
    return tx_hash


def record_bet(
    client: httpx.Client,
    base_url: str,
    token: str,
    *,
    market_id: str,
    side: str,
    amount_wei: int,
    tx_hash: str,
) -> None:
    response = client.post(
        f"{base_url}/markets/{market_id}/bet",
        headers={"Authorization": f"Bearer {token}"},
        json={"side": side, "amount": amount_wei, "tx_hash": tx_hash},
        timeout=30,
    )
    response.raise_for_status()


def main() -> None:
    base_url = _env("BACKEND_API_URL", "http://localhost:8000").rstrip("/")
    rpc_url = _env("RPC_URL")
    private_key = _env("SEEDER_PRIVATE_KEY")
    chain_id = int(_env("CHAIN_ID"))
    start_delay_seconds = int(os.getenv("MARKET_START_DELAY_SECONDS", "120"))
    max_exposure = int(os.getenv("MARKET_MAX_EXPOSURE_WEI", "1000000000000000000"))
    bet_per_side = int(os.getenv("SEED_LIQUIDITY_WEI_PER_SIDE", "1000000000000000"))
    seed_count = int(os.getenv("SEED_MARKET_COUNT", "100"))
    seed_bets = os.getenv("SEED_PLACE_BETS", "true").lower() in {"1", "true", "yes"}

    w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 30}))
    if not w3.is_connected():
        raise RuntimeError("RPC unreachable")
    if int(w3.eth.chain_id) != chain_id:
        raise RuntimeError(f"CHAIN_ID mismatch: expected {chain_id}, got {w3.eth.chain_id}")

    specs = generate_market_specs(seed_count)
    with httpx.Client() as client:
        token = authenticate_wallet(client, base_url, private_key, chain_id)
        print(f"Authenticated seeder wallet, creating {len(specs)} markets")

        start_time = int(time.time()) + start_delay_seconds
        created: list[dict] = []
        for idx, spec in enumerate(specs, start=1):
            created_market = create_market(
                client,
                base_url,
                token,
                spec=spec,
                start_time=start_time,
                max_exposure=max_exposure,
            )
            created.append(created_market)
            print(f"[{idx}/{len(specs)}] created {spec.market_id} -> {created_market.get('address')}")

        if not seed_bets:
            print("Market creation complete (bet seeding disabled).")
            return

        wait_seconds = max(0, start_time - int(time.time()) + 2)
        if wait_seconds > 0:
            print(f"Waiting {wait_seconds}s for markets to open...")
            time.sleep(wait_seconds)

        print("Seeding YES/NO liquidity on each market...")
        for idx, market in enumerate(created, start=1):
            market_id = market["market_id"]
            address = market["address"]
            yes_hash = send_bet_tx(
                w3=w3,
                private_key=private_key,
                market_address=address,
                side="YES",
                amount_wei=bet_per_side,
            )
            record_bet(
                client,
                base_url,
                token,
                market_id=market_id,
                side="YES",
                amount_wei=bet_per_side,
                tx_hash=yes_hash,
            )

            no_hash = send_bet_tx(
                w3=w3,
                private_key=private_key,
                market_address=address,
                side="NO",
                amount_wei=bet_per_side,
            )
            record_bet(
                client,
                base_url,
                token,
                market_id=market_id,
                side="NO",
                amount_wei=bet_per_side,
                tx_hash=no_hash,
            )
            print(f"[{idx}/{len(created)}] seeded market {market_id}")

    print("Done.")


if __name__ == "__main__":
    main()
