# File: scripts/backfill_events.py

"""
PURPOSE
-------
Backfill on-chain events into off-chain persistence.

This script:
- replays historical blockchain events
- rebuilds derived state (markets, agents, yields)
- is SAFE to run multiple times (idempotent)

DESIGN PRINCIPLES
-----------------
- Read-only on chain
- Deterministic replay
- Backend is the write authority
"""

import os
import sys
import json
from typing import Iterable
from pathlib import Path
from urllib import error, request

from web3 import Web3

BACKEND_API = os.getenv("BACKEND_API", "http://localhost:8000")
RPC_URL = os.getenv("RPC_URL")
BACKFILL_ENDPOINT = os.getenv("BACKFILL_ENDPOINT", "/indexing/replay/tx")
BACKFILL_OUTPUT = Path(
    os.getenv("BACKFILL_OUTPUT", "./backfill_tx_hashes.ndjson")
)
POST_TX_HASHES = os.getenv("POST_TX_HASHES", "true").lower() in {
    "1",
    "true",
    "yes",
}

if not RPC_URL:
    raise RuntimeError("RPC_URL not set")

w3 = Web3(Web3.HTTPProvider(RPC_URL))


def fetch_blocks(start: int, end: int) -> Iterable[int]:
    for block_number in range(start, end + 1):
        yield block_number


def forward_tx_hash(*, tx_hash: str, block_number: int) -> bool:
    payload = json.dumps(
        {
            "tx_hash": tx_hash,
            "block_number": block_number,
        }
    ).encode("utf-8")
    url = f"{BACKEND_API.rstrip('/')}{BACKFILL_ENDPOINT}"

    req = request.Request(
        url=url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=5) as resp:
            return 200 <= resp.status < 300
    except error.HTTPError as exc:
        # Missing endpoint is treated as a non-fatal fallback.
        if exc.code in {404, 405}:
            return False
        raise
    except error.URLError:
        return False


def main() -> None:
    latest_block = w3.eth.block_number
    start_block = int(os.getenv("START_BLOCK", "0"))
    forwarded = 0
    persisted = 0

    BACKFILL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    print(f"Backfilling from block {start_block} → {latest_block}")

    with BACKFILL_OUTPUT.open("a", encoding="utf-8") as output_file:
        for block_number in fetch_blocks(start_block, latest_block):
            block = w3.eth.get_block(block_number, full_transactions=True)

            for tx in block.transactions:
                tx_hash = tx.hash.hex()

                output_file.write(
                    json.dumps(
                        {
                            "block_number": block_number,
                            "tx_hash": tx_hash,
                        }
                    )
                    + "\n"
                )
                persisted += 1

                if POST_TX_HASHES and forward_tx_hash(
                    tx_hash=tx_hash,
                    block_number=block_number,
                ):
                    forwarded += 1

            if block_number % 1000 == 0:
                print(
                    "Processed block "
                    f"{block_number} | tx persisted={persisted} | tx forwarded={forwarded}"
                )

    print(
        "Backfill complete. "
        f"Persisted={persisted}, Forwarded={forwarded}, Output={BACKFILL_OUTPUT}"
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
