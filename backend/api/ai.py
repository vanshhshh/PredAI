"""
AI endpoints (copilot/chat completion proxy).
"""

from __future__ import annotations

import json

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.core.config import settings


router = APIRouter()


class CopilotRequest(BaseModel):
    message: str = Field(..., min_length=1)
    context: dict = Field(default_factory=dict)


@router.post("/copilot")
async def copilot(req: CopilotRequest):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_NOT_CONFIGURED",
        )

    system = (
        "You are a production crypto prediction protocol copilot. "
        "Provide concise, actionable guidance grounded in risk management."
    )
    user_message = req.message.strip()
    context_text = json.dumps(req.context or {}, ensure_ascii=True)

    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Context: {context_text}\n\nUser: {user_message}",
            },
        ],
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not reply:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="EMPTY_MODEL_RESPONSE",
            )
        return {"reply": reply}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI_UPSTREAM_ERROR",
        ) from exc
