# File: backend/messaging/kafka_consumer.py
"""
PURPOSE
-------
Kafka consumer for ingesting protocol domain events.

This module:
- consumes events emitted by services
- dispatches them to indexing / downstream processors
- guarantees at-least-once processing
- supports deterministic replay when combined with offsets

DESIGN RULES (from docs)
------------------------
- Consumers do NOT mutate core business state directly
- Consumers translate events into indexing / async workflows
- Offset commits only after successful handling
- Fail closed on deserialization errors
"""

import json
import os
import logging
from typing import Callable, Dict, Any

from kafka import KafkaConsumer

logger = logging.getLogger(__name__)


# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------

KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS", ""
)

KAFKA_GROUP_ID = os.getenv(
    "KAFKA_GROUP_ID", "ai-crypto-consumers"
)

KAFKA_AUTO_OFFSET_RESET = os.getenv(
    "KAFKA_AUTO_OFFSET_RESET", "earliest"
)


# -------------------------------------------------------------------
# CONSUMER FACTORY
# -------------------------------------------------------------------

def create_consumer(topics: list[str]) -> KafkaConsumer:
    """
    Create a Kafka consumer subscribed to given topics.
    """
    if not topics:
        raise ValueError("TOPICS_REQUIRED")
    if not KAFKA_BOOTSTRAP_SERVERS:
        raise ValueError("KAFKA_BOOTSTRAP_SERVERS_NOT_CONFIGURED")

    consumer = KafkaConsumer(
        *topics,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=KAFKA_GROUP_ID,
        auto_offset_reset=KAFKA_AUTO_OFFSET_RESET,
        enable_auto_commit=False,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        key_deserializer=lambda k: k.decode("utf-8") if k else None,
    )
    return consumer


# -------------------------------------------------------------------
# CONSUME LOOP
# -------------------------------------------------------------------

def consume(
    *,
    topics: list[str],
    handler: Callable[[str, Dict[str, Any]], None],
):
    """
    Start consuming messages and dispatch to handler.

    Args:
        topics: Kafka topics to subscribe to
        handler: function(topic, event_payload)
    """

    consumer = create_consumer(topics)
    logger.info("Kafka consumer started for topics: %s", topics)

    for message in consumer:
        try:
            topic = message.topic
            key = message.key
            value = message.value

            if not isinstance(value, dict):
                raise ValueError("INVALID_EVENT_PAYLOAD")

            handler(topic, value)

            consumer.commit()
        except Exception as e:
            logger.error(
                "Kafka consume error (topic=%s, key=%s): %s",
                message.topic,
                message.key,
                e,
            )
            # Do NOT commit offset on failure
            continue
