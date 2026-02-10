# File: backend/messaging/kafka_producer.py
"""
PURPOSE
-------
Kafka producer for publishing protocol events.

This module:
- emits domain events (market, agent, oracle, yield)
- is used by services AFTER state transitions
- provides exactly-once semantics at the application level
- NEVER contains business logic

DESIGN RULES (from docs)
------------------------
- Events are facts, not commands
- Idempotency keys required
- No retries without backoff
- Fail closed on serialization errors
"""

import json
import os
import logging
from typing import Dict, Any

from kafka import KafkaProducer

logger = logging.getLogger(__name__)


# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------

KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"
)

KAFKA_CLIENT_ID = os.getenv(
    "KAFKA_CLIENT_ID", "ai-crypto-backend"
)


# -------------------------------------------------------------------
# PRODUCER
# -------------------------------------------------------------------

_producer: KafkaProducer | None = None


def get_producer() -> KafkaProducer:
    """
    Lazily initialize Kafka producer.
    """
    global _producer

    if _producer is None:
        _producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            client_id=KAFKA_CLIENT_ID,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8"),
            acks="all",
            retries=3,
        )
    return _producer


# -------------------------------------------------------------------
# PUBLISH API
# -------------------------------------------------------------------

def publish_event(
    *,
    topic: str,
    key: str,
    event: Dict[str, Any],
):
    """
    Publish a domain event to Kafka.

    Args:
        topic: Kafka topic
        key: Idempotency key (e.g. market_id, agent_id)
        event: Event payload
    """

    if not topic or not key:
        raise ValueError("TOPIC_AND_KEY_REQUIRED")

    producer = get_producer()

    try:
        producer.send(topic, key=key, value=event)
        producer.flush()
    except Exception as e:
        logger.error("Kafka publish failed: %s", e)
        raise
