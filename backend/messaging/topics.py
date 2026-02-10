# File: backend/messaging/topics.py
"""
PURPOSE
-------
Canonical definition of Kafka topics used by the protocol.

This module:
- defines ALL topic names in one place
- prevents string duplication across services
- acts as a contract between producers and consumers

DESIGN RULES (from docs)
------------------------
- Topics represent immutable facts (events), not commands
- Topic names are stable once deployed
- No environment-specific logic here
"""

# -------------------------------------------------------------------
# MARKET EVENTS
# -------------------------------------------------------------------

MARKET_EVENTS = "market.events"
MARKET_CREATED = "market.created"
MARKET_SETTLED = "market.settled"

# -------------------------------------------------------------------
# AGENT EVENTS
# -------------------------------------------------------------------

AGENT_EVENTS = "agent.events"
AGENT_REGISTERED = "agent.registered"
AGENT_STAKED = "agent.staked"
AGENT_ACTIVATED = "agent.activated"
AGENT_DEACTIVATED = "agent.deactivated"

# -------------------------------------------------------------------
# ORACLE EVENTS
# -------------------------------------------------------------------

ORACLE_EVENTS = "oracle.events"
ORACLE_REGISTERED = "oracle.registered"
ORACLE_STAKED = "oracle.staked"
ORACLE_SUBMITTED = "oracle.submitted"

# -------------------------------------------------------------------
# YIELD EVENTS
# -------------------------------------------------------------------

YIELD_EVENTS = "yield.events"
YIELD_DEPOSITED = "yield.deposited"
YIELD_WITHDRAWN = "yield.withdrawn"
YIELD_REBALANCED = "yield.rebalanced"
