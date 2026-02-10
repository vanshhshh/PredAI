from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="AI Inference Service")


class Position(BaseModel):
    vault_id: str
    amount: float
    risk_score: int


class Request(BaseModel):
    positions: List[Position]
    target_risk_score: int


@app.post("/recommend")
async def recommend(req: Request):
    # DEMO LOGIC: normalize allocation
    total = sum(p.amount for p in req.positions) or 1

    return [
        {
            "vault_id": p.vault_id,
            "amount": round(p.amount / total, 4),
        }
        for p in req.positions
    ]


@app.get("/health")
async def health():
    return {"status": "ok"}
