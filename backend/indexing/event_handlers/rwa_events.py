# backend/indexing/event_handlers/rwa_events.py

from backend.persistence.repositories.rwa_repo import RWARepository


rwa_repo = RWARepository()


def handle_rwa_created(event: dict):
    """
    Event fired when a new RWA is minted or registered.
    """
    rwa_id = event["rwa_id"]
    metadata = event.get("metadata", {})
    return rwa_repo.create(rwa_id, metadata)


def handle_rwa_updated(event: dict):
    rwa_id = event["rwa_id"]
    existing = rwa_repo.get(rwa_id)
    if not existing:
        return None

    existing.update(event.get("metadata", {}))
    return existing
