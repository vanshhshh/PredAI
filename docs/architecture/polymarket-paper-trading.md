# Polymarket Paper Trading

This mode imports public Polymarket market data and records virtual AI
positions. It does not place live Polymarket orders and does not move funds.

The integration uses the public Gamma API:

```text
https://gamma-api.polymarket.com/markets
```

Useful commands:

```bash
alembic upgrade head
PAPER_WORKER_ONCE=true python scripts/polymarket_paper_worker.py
python scripts/polymarket_paper_worker.py
```

API routes:

```text
POST /paper/polymarket/ingest
POST /paper/polymarket/run
POST /paper/polymarket/settle
POST /paper/polymarket/calibrate
GET  /paper/polymarket/markets
GET  /paper/polymarket/predictions
GET  /paper/polymarket/performance
```

Frontend route:

```text
/paper
```

Model behavior:

- Opens one paper position per active Polymarket market for full coverage.
- Uses market price, momentum, volume, liquidity, simple language features, and
  any configured `AGENT_SIGNAL_ENDPOINTS`.
- Marks open positions to current Polymarket prices.
- Settles positions when imported closed markets resolve to YES or NO.
- Recomputes category-level calibration from settled predictions.

Do not describe this as proven accurate until the paper book has enough settled
samples and stable out-of-sample performance.
