"""
Continuously ingest public crypto/news feeds into backend social events.

Usage:
  python scripts/social_ingest_worker.py

Key env vars:
  BACKEND_API_URL=https://predai-backend.onrender.com
  SOCIAL_FEED_URLS=https://www.coindesk.com/arc/outboundfeeds/rss/,https://cointelegraph.com/rss
  SOCIAL_INGEST_INTERVAL_SECONDS=300
  SOCIAL_INGEST_ITEMS_PER_FEED=10
  SOCIAL_INGEST_TIMEOUT_SECONDS=20
  SOCIAL_INGEST_ONESHOT=false
"""

from __future__ import annotations

import hashlib
import os
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Iterable
from urllib.parse import urlparse

import httpx


DEFAULT_FEED_URLS = [
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cointelegraph.com/rss",
]


@dataclass
class FeedItem:
    source: str
    external_id: str
    author: str
    content: str
    timestamp: int
    metadata: dict


def _env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"{name} is required")
    return value


def _parse_feed_urls(raw: str | None) -> list[str]:
    if raw and raw.strip():
        urls = [part.strip() for part in raw.split(",") if part.strip()]
        if urls:
            return urls
    return list(DEFAULT_FEED_URLS)


def _safe_text(node: ET.Element | None, default: str = "") -> str:
    if node is None:
        return default
    return (node.text or "").strip() or default


def _child_text(parent: ET.Element, tag: str, default: str = "") -> str:
    return _safe_text(parent.find(tag), default=default)


def _iso_to_ts(value: str) -> int | None:
    raw = (value or "").strip()
    if not raw:
        return None
    try:
        normalized = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return int(dt.timestamp())
    except Exception:
        return None


def _date_to_ts(value: str) -> int | None:
    raw = (value or "").strip()
    if not raw:
        return None
    try:
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return int(dt.timestamp())
    except Exception:
        return _iso_to_ts(raw)


def _normalize_ts(ts: int | None) -> int:
    now = int(time.time())
    if ts is None or ts <= 0:
        return now
    if ts > now + 60:
        return now
    return ts


def _derive_source_label(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    if "x.com" in host or "twitter.com" in host:
        return "X"
    if "farcaster" in host:
        return "FARCASTER"
    return "OTHER"


def _hash_external_id(feed_url: str, unique_part: str) -> str:
    payload = f"{feed_url}|{unique_part}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:32]


def _parse_rss_items(feed_url: str, root: ET.Element, limit: int) -> Iterable[FeedItem]:
    source = _derive_source_label(feed_url)
    channel = root.find("channel")
    if channel is None:
        return []

    items = channel.findall("item")[:limit]
    out: list[FeedItem] = []
    for item in items:
        title = _child_text(item, "title")
        link = _child_text(item, "link")
        guid = _child_text(item, "guid")
        description = _child_text(item, "description")
        author = _child_text(item, "author", default="unknown")
        pub_date = _child_text(item, "pubDate")
        unique = guid or link or title
        if not unique or not title:
            continue

        content = title.strip()
        if not content:
            continue

        out.append(
            FeedItem(
                source=source,
                external_id=_hash_external_id(feed_url, unique),
                author=author[:120] or "unknown",
                content=content[:500],
                timestamp=_normalize_ts(_date_to_ts(pub_date)),
                metadata={
                    "feed_url": feed_url,
                    "link": link,
                    "description": description[:500],
                    "guid": guid,
                },
            )
        )
    return out


def _parse_atom_items(feed_url: str, root: ET.Element, limit: int) -> Iterable[FeedItem]:
    source = _derive_source_label(feed_url)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall("atom:entry", ns)[:limit]
    out: list[FeedItem] = []
    for entry in entries:
        title = _safe_text(entry.find("atom:title", ns))
        id_text = _safe_text(entry.find("atom:id", ns))
        updated = _safe_text(entry.find("atom:updated", ns))
        published = _safe_text(entry.find("atom:published", ns))
        summary = _safe_text(entry.find("atom:summary", ns))
        author_name = _safe_text(entry.find("atom:author/atom:name", ns), default="unknown")

        link = ""
        link_node = entry.find("atom:link", ns)
        if link_node is not None:
            link = (link_node.attrib.get("href") or "").strip()

        unique = id_text or link or title
        if not unique or not title:
            continue

        out.append(
            FeedItem(
                source=source,
                external_id=_hash_external_id(feed_url, unique),
                author=author_name[:120] or "unknown",
                content=title[:500],
                timestamp=_normalize_ts(_iso_to_ts(updated) or _iso_to_ts(published)),
                metadata={
                    "feed_url": feed_url,
                    "link": link,
                    "summary": summary[:500],
                    "id": id_text,
                },
            )
        )
    return out


def fetch_feed_items(
    client: httpx.Client,
    *,
    feed_url: str,
    items_per_feed: int,
    timeout: int,
) -> list[FeedItem]:
    response = client.get(
        feed_url,
        timeout=timeout,
        headers={
            "User-Agent": "PredAI-SocialIngestWorker/1.0 (+https://predai.app)",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
        follow_redirects=True,
    )
    response.raise_for_status()

    root = ET.fromstring(response.text)
    tag = root.tag.lower()
    if tag.endswith("rss"):
        return list(_parse_rss_items(feed_url, root, items_per_feed))
    if tag.endswith("feed"):
        return list(_parse_atom_items(feed_url, root, items_per_feed))
    return []


def ingest_item(
    client: httpx.Client,
    *,
    backend_base_url: str,
    item: FeedItem,
    timeout: int,
) -> str:
    payload = {
        "source": item.source,
        "external_id": item.external_id,
        "author": item.author,
        "content": item.content,
        "timestamp": item.timestamp,
        "metadata": item.metadata,
    }
    response = client.post(
        f"{backend_base_url}/social/ingest",
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    return str(data.get("status", "ingested"))


def run_once(
    *,
    backend_base_url: str,
    feed_urls: list[str],
    items_per_feed: int,
    timeout: int,
) -> tuple[int, int, int]:
    created = 0
    duplicates = 0
    errors = 0

    with httpx.Client() as client:
        for feed_url in feed_urls:
            try:
                items = fetch_feed_items(
                    client,
                    feed_url=feed_url,
                    items_per_feed=items_per_feed,
                    timeout=timeout,
                )
            except Exception as exc:
                errors += 1
                print(f"[error] fetch {feed_url}: {exc}")
                continue

            for item in items:
                try:
                    status = ingest_item(
                        client,
                        backend_base_url=backend_base_url,
                        item=item,
                        timeout=timeout,
                    )
                    if status == "duplicate":
                        duplicates += 1
                    else:
                        created += 1
                except Exception as exc:
                    errors += 1
                    print(
                        f"[error] ingest source={item.source} external_id={item.external_id}: {exc}"
                    )

    return created, duplicates, errors


def main() -> None:
    backend_base_url = _env("BACKEND_API_URL", "http://localhost:8000").rstrip("/")
    feed_urls = _parse_feed_urls(os.getenv("SOCIAL_FEED_URLS"))
    interval_seconds = int(_env("SOCIAL_INGEST_INTERVAL_SECONDS", "300"))
    items_per_feed = int(_env("SOCIAL_INGEST_ITEMS_PER_FEED", "10"))
    timeout_seconds = int(_env("SOCIAL_INGEST_TIMEOUT_SECONDS", "20"))
    oneshot = _env("SOCIAL_INGEST_ONESHOT", "false").strip().lower() in {"1", "true", "yes"}

    if items_per_feed <= 0:
        raise RuntimeError("SOCIAL_INGEST_ITEMS_PER_FEED must be > 0")
    if interval_seconds <= 0:
        raise RuntimeError("SOCIAL_INGEST_INTERVAL_SECONDS must be > 0")

    print(
        "Starting social ingest worker:",
        {
            "backend_base_url": backend_base_url,
            "feeds": feed_urls,
            "interval_seconds": interval_seconds,
            "items_per_feed": items_per_feed,
            "oneshot": oneshot,
        },
    )

    while True:
        started = time.time()
        created, duplicates, errors = run_once(
            backend_base_url=backend_base_url,
            feed_urls=feed_urls,
            items_per_feed=items_per_feed,
            timeout=timeout_seconds,
        )
        elapsed = round(time.time() - started, 2)
        print(
            f"[cycle] created={created} duplicates={duplicates} "
            f"errors={errors} elapsed_s={elapsed}"
        )

        if oneshot:
            break

        sleep_for = max(1, interval_seconds - int(elapsed))
        time.sleep(sleep_for)


if __name__ == "__main__":
    main()
