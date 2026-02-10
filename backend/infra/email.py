# backend/infra/email.py

import requests
from backend.core.config import settings

def send_email(to: str, subject: str, html: str):
    requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": settings.FROM_EMAIL,
            "to": to,
            "subject": subject,
            "html": html,
        },
    )
