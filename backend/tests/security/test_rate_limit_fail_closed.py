import asyncio

from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import Response

from backend.security import rate_limits


def _build_request(path: str) -> Request:
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 52345),
        "server": ("testserver", 80),
        "root_path": "",
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    return Request(scope, receive)


def test_check_rate_limit_propagates_backend_failure(monkeypatch):
    async def _raise_backend_failure(path: str):
        _ = path
        raise HTTPException(status_code=503, detail="RATE_LIMIT_BACKEND_UNAVAILABLE")

    monkeypatch.setattr(rate_limits, "_upstash_command", _raise_backend_failure)

    try:
        asyncio.run(rate_limits.check_rate_limit(key="unit-test", max_requests=100))
        assert False, "expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert exc.detail == "RATE_LIMIT_BACKEND_UNAVAILABLE"


def test_middleware_returns_503_when_rate_limit_backend_is_down(monkeypatch):
    async def _raise_backend_failure(*, key: str, max_requests: int = 100):
        _ = key
        _ = max_requests
        raise HTTPException(status_code=503, detail="RATE_LIMIT_BACKEND_UNAVAILABLE")

    monkeypatch.setattr(rate_limits, "check_rate_limit", _raise_backend_failure)

    async def app(scope, receive, send):
        _ = (scope, receive, send)
        return None

    called = {"value": False}

    async def call_next(request: Request):
        _ = request
        called["value"] = True
        return Response(content="ok", status_code=200)

    middleware = rate_limits.RateLimitMiddleware(app)
    response = asyncio.run(middleware.dispatch(_build_request("/markets"), call_next))

    assert response.status_code == 503
    assert called["value"] is False

