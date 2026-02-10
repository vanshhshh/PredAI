# backend/infra/stripe_client.py

import stripe
from backend.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY
