"""
Async persistence for RWA asset records.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import RWAAsset
from backend.security.invariants import InvariantViolation


class RWARepository:
    @staticmethod
    async def create(
        *,
        rwa_id: str,
        token_address: str,
        metadata_uri: str,
        max_supply: int,
        creator: str,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                asset = RWAAsset(
                    rwa_id=rwa_id,
                    token_address=token_address,
                    metadata_uri=metadata_uri,
                    max_supply=max_supply,
                    current_supply=0,
                    creator=creator,
                )
                session.add(asset)
                await session.flush()
                return asset

    @staticmethod
    async def get_by_rwa_id(rwa_id: str) -> Optional[RWAAsset]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(select(RWAAsset).where(RWAAsset.rwa_id == rwa_id))

    @staticmethod
    async def list_all(limit: int = 200):
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(RWAAsset).order_by(RWAAsset.created_at.desc()).limit(limit)
            )
            return list(result)

    @staticmethod
    async def mint(
        *,
        rwa_id: str,
        amount: int,
    ):
        if amount <= 0:
            raise InvariantViolation("INVALID_MINT_AMOUNT")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                asset = await session.scalar(
                    select(RWAAsset).where(RWAAsset.rwa_id == rwa_id)
                )
                if not asset:
                    raise InvariantViolation("RWA_NOT_FOUND")

                if asset.current_supply + amount > asset.max_supply:
                    raise InvariantViolation("RWA_MAX_SUPPLY_EXCEEDED")

                asset.current_supply += amount
                return asset

    @staticmethod
    async def burn(
        *,
        rwa_id: str,
        amount: int,
    ):
        if amount <= 0:
            raise InvariantViolation("INVALID_BURN_AMOUNT")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                asset = await session.scalar(
                    select(RWAAsset).where(RWAAsset.rwa_id == rwa_id)
                )
                if not asset:
                    raise InvariantViolation("RWA_NOT_FOUND")

                if amount > asset.current_supply:
                    raise InvariantViolation("RWA_BURN_EXCEEDS_SUPPLY")

                asset.current_supply -= amount
                return asset
