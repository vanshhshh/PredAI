# backend/infra/openai_client.py

from openai import OpenAI
from backend.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def run_llm(prompt: str) -> str:
    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content
