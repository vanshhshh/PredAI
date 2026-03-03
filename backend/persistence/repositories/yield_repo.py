"""
Async persistence for yield vaults and user positions.
"""

from __future__ import annotations

from typing import Iterable

from sqlalchemy import select

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import YieldPosition, YieldVault
from backend.security.invariants import InvariantViolation


class YieldRepository:
    @staticmethod
    async def list_active_vaults():
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(YieldVault)
                .where(YieldVault.active.is_(True))
                .order_by(YieldVault.apy_bps.desc())
            )
            return list(result)

    @staticmethod
    async def get_positions_by_user(user_address: str):
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(YieldPosition)
                .where(YieldPosition.user_address == user_address)
                .order_by(YieldPosition.updated_at.desc())
            )
            return list(result)

    @staticmethod
    async def apply_rebalance(
        *,
        user_address: str,
        new_positions: Iterable[dict],
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                current = await session.scalars(
                    select(YieldPosition).where(YieldPosition.user_address == user_address)
                )
                existing_by_vault = {p.vault_id: p for p in current}

                seen = set()
                for item in new_positions:
                    vault_id = str(item.get("vault_id", "")).strip()
                    if not vault_id:
                        continue
                    seen.add(vault_id)

                    amount = int(item.get("amount", 0))
                    apy_bps = int(item.get("apy_bps", 0))
                    risk_score = int(item.get("risk_score", 0))

                    row = existing_by_vault.get(vault_id)
                    if row:
                        row.amount = max(0, amount)
                        row.apy_bps = max(0, apy_bps)
                        row.risk_score = max(0, risk_score)
                    else:
                        session.add(
                            YieldPosition(
                                user_address=user_address,
                                vault_id=vault_id,
                                amount=max(0, amount),
                                apy_bps=max(0, apy_bps),
                                risk_score=max(0, risk_score),
                            )
                        )

                for vault_id, row in existing_by_vault.items():
                    if vault_id not in seen:
                        await session.delete(row)

    @staticmethod
    async def record_deposit(
        *,
        user_address: str,
        vault_id: str,
        amount: int,
    ):
        if amount <= 0:
            raise InvariantViolation("INVALID_DEPOSIT_AMOUNT")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                position = await session.scalar(
                    select(YieldPosition).where(
                        YieldPosition.user_address == user_address,
                        YieldPosition.vault_id == vault_id,
                    )
                )
                vault = await session.scalar(
                    select(YieldVault).where(YieldVault.vault_id == vault_id)
                )
                apy_bps = int(vault.apy_bps) if vault else 0
                risk_score = int(vault.risk_score) if vault else 0

                if position:
                    position.amount += amount
                    position.apy_bps = apy_bps
                    position.risk_score = risk_score
                else:
                    session.add(
                        YieldPosition(
                            user_address=user_address,
                            vault_id=vault_id,
                            amount=amount,
                            apy_bps=apy_bps,
                            risk_score=risk_score,
                        )
                    )

                if vault:
                    vault.total_deposited += amount

    @staticmethod
    async def record_withdrawal(
        *,
        user_address: str,
        vault_id: str,
        amount: int,
    ):
        if amount <= 0:
            raise InvariantViolation("INVALID_WITHDRAWAL_AMOUNT")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                position = await session.scalar(
                    select(YieldPosition).where(
                        YieldPosition.user_address == user_address,
                        YieldPosition.vault_id == vault_id,
                    )
                )
                if not position:
                    raise InvariantViolation("POSITION_NOT_FOUND")

                if amount > position.amount:
                    raise InvariantViolation("WITHDRAWAL_EXCEEDS_BALANCE")

                position.amount -= amount
                if position.amount == 0:
                    await session.delete(position)

                vault = await session.scalar(
                    select(YieldVault).where(YieldVault.vault_id == vault_id)
                )
                if vault:
                    vault.total_deposited = max(0, int(vault.total_deposited) - amount)
