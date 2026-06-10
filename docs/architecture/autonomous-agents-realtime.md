# Autonomous Agents And Realtime Markets

## Agent Runner

Run one paper cycle:

```bash
AGENT_RUNNER_ONCE=true python scripts/agent_runner_worker.py
```

Run continuously:

```bash
python scripts/agent_runner_worker.py
```

Live trading is disabled unless all of these are set:

```bash
AUTONOMOUS_AGENT_LIVE_TRADING=true
AUTONOMOUS_AGENT_PRIVATE_KEY=<limited agent-owner wallet key>
AUTONOMOUS_AGENT_MAX_TX_WEI=<hard per-tx cap>
AGENT_MAX_TRADE_WEI=<strategy per-trade cap>
AGENT_MAX_MARKET_EXPOSURE_WEI=<per-market cap>
AGENT_MAX_DAILY_EXPOSURE_WEI=<daily cap>
```

The live signer must match the on-chain agent owner. Do not use governance,
oracle, treasury, deployer, or backend relayer keys for autonomous trading.

## Signal Providers

Local signals come from:

- current market price/pools
- recent social events stored in the backend
- settled historical markets with similar terms

External providers can be added with:

```bash
AGENT_SIGNAL_ENDPOINTS=https://predai-backend.onrender.com/signals/market-probability
```

Each endpoint receives `market_id`, `title`, `description`, and `category`, and
should return:

```json
{
  "source": "official-feed",
  "probability_bps": 6400,
  "confidence_bps": 1800
}
```

The built-in `/signals/market-probability` endpoint is a conservative public
signal adapter. It combines recent ingested social/news events, lightweight
keyword features, and public crypto price momentum where relevant. It is useful
for paper trading and monitoring, but it is not proof of predictive accuracy.

## Realtime Market Stream

The backend exposes:

```text
GET /realtime/markets
GET /realtime/markets/{market_id}
```

The frontend subscribes to `/realtime/markets` and patches market odds, pools,
settlement state, and new markets into React Query.

Set `REDIS_URL` in multi-instance production for low-latency Redis Pub/Sub.
Every realtime event is also persisted to `protocol_events`, and SSE falls back
to polling that outbox when socket Redis is unavailable. That makes deployments
with only Upstash REST credentials functional, but `REDIS_URL` is still the
preferred production path for lower latency and less database polling.
