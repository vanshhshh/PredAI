# PredAI

PredAI is an AI-native prediction market protocol that combines:

- On-chain market, oracle, agent, governance, RWA, and yield primitives
- An async Python backend (FastAPI + PostgreSQL + Redis-compatible rate limiting)
- A dedicated AI inference service for deterministic recommendations
- A Next.js frontend for trading, social signal flows, governance, and analytics

The repository is organized as a production-oriented monorepo with independently deployable services and contract packages.

## Table of Contents

1. Overview
2. Core Features
3. Architecture
4. Repository Structure
5. API Surface
6. Environment Variables
7. Local Development
8. Docker Development Stack
9. Smart Contract Development
10. Testing
11. Deployment
12. Security and Reliability
13. Roadmap Extensions
14. License

## Overview

PredAI enables users to:

- Create and trade prediction markets
- Register, stake, and manage AI agents
- Register and stake oracle identities, then submit outcomes
- Run governance proposals and voting flows
- Route capital through yield vault abstractions
- Use social signal ingestion to bootstrap new market ideas
- Tokenize RWA-like assets and track mint/burn supply updates
- Query aggregate platform statistics and user profiles

The platform intentionally separates concerns:

- Contracts define trust-minimized protocol primitives
- Backend services enforce invariants and orchestration
- AI service handles deterministic inference and confidence calibration
- Frontend handles wallet UX, market interactions, and dashboarding

## Core Features

### 1) Prediction Markets

- Market creation with deterministic `market_id`, time bounds, and metadata URI
- Market listing and detail retrieval with YES/NO pool snapshots
- Bet placement (`YES`/`NO`) tied to authenticated wallet identity
- Settlement endpoint with authorization checks and invariant enforcement

Backed by:

- Backend routes under `/markets`
- Contracts: `MarketFactory.sol`, `PredictionMarket.sol`, `SettlementEngine.sol`, `MarketRegistry.sol`

### 2) Wallet-Native Authentication

- Challenge generation endpoint (`/auth/challenge`)
- Signature verification endpoint (`/auth/verify`)
- Bearer token issuance for authenticated API access
- Wallet address as canonical identity key across all services

### 3) AI Agent Lifecycle

- Agent registration with metadata + tx hash attestations
- Stake-and-activate flow for economic participation
- Deactivation and unstaking flows
- Agent listing and individual profile retrieval

Backed by:

- Backend routes under `/agents`
- Contracts: `AgentRegistry.sol`, `AgentStaking.sol`, `AgentScoring.sol`, `AgentNFT.sol`
- AI abstractions: `BaseAgent`, `ArbitrageAgent`, `MarketMakerAgent`, `SocialAgent`

### 4) Oracle Coordination

- Oracle registration and staking
- Outcome submission for market resolution
- Live oracle status endpoint with quorum/confidence phase reporting
- Oracle listing + identity lookup

Backed by:

- Backend routes under `/oracles`
- Contracts: `OracleRegistry.sol`, `OracleStaking.sol`, `OracleConsensus.sol`, `OracleSlashing.sol`

### 5) Yield Routing and Rebalancing

- Vault discovery endpoint (`/yield/vaults`)
- Wallet portfolio view (`/yield/portfolio`)
- AI-assisted rebalance trigger (`/yield/rebalance`)
- Yield spread scanner for arbitrage opportunities (`/yield/arbitrage`)

Backed by:

- Backend routes under `/yield`
- Contracts: `YieldVault.sol`, `CapitalRouter.sol`, `RiskAllocator.sol`
- AI inference service endpoint `/recommend`

### 6) Governance Workflows

- Proposal creation (governance-authorized)
- Proposal listing/detail retrieval
- Weighted vote casting
- Timelock queue action

Backed by:

- Backend routes under `/governance`
- Contracts: `DAO.sol`, `Timelock.sol`, `ParameterController.sol`

### 7) Social Signal-to-Market Pipeline

- Social feed ingestion endpoint with dedupe semantics
- Signal staking for arguments/events
- Feed listing with heuristic confidence scoring
- Market spawn from social events
- LLM-assisted prompt-to-market-spec compiler (`/social/compile`)

### 8) RWA Asset Operations

- RWA asset registration
- Asset list endpoint with current/max supply
- Mint and burn operations with invariant checks

Backed by:

- Backend routes under `/rwa`
- Contracts: `RWAToken.sol`, `OutcomeWrapper.sol`, `CrossChainAdapter.sol`

### 9) User and Platform Analytics

- Authenticated profile fetch/update (`/users/me`)
- Username availability checks and address-to-username resolution
- Public user profile lookup
- Global aggregate stats endpoint (`/api/stats`)

### 10) AI Inference + Model Ops Foundations

- Deterministic `InferenceRunner` with calibrated confidence output
- Drift detection utilities (feature-level and aggregate)
- Staking/reward/slashing math primitives for simulation and governance
- Training/evaluation abstractions with deterministic dataset versioning
- In-memory registries for agents and model metadata linkage

## Architecture

```text
frontend (Next.js)
    |
    v
backend API (FastAPI)
    |- auth + invariants + rate limiting
    |- services (markets, agents, oracles, governance, yield, social, rwa)
    |- persistence (PostgreSQL)
    |- messaging/indexing hooks
    |
    +--> ai service (FastAPI inference)
    |
    +--> on-chain contracts (Hardhat package)
```

Runtime defaults in `docker-compose.yml`:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- AI service: `http://localhost:9000`
- Postgres: `localhost:5432`

## Repository Structure

Top-level modules:

- `frontend/`: Next.js app, wallet UX, charts, tests
- `backend/`: FastAPI API, services, security, persistence, indexing hooks
- `ai/`: inference service, agents, economics math, training/eval utilities
- `contracts/`: Solidity protocol contracts + Hardhat config/tests/deploy
- `infra/`: CI, Docker, Kubernetes, monitoring assets
- `scripts/`: migration, backfill, emergency, and social ingest utilities
- `docs/`: architecture/compliance/economics/governance documentation

## API Surface

The backend mounts routers as:

- `/auth`
- `/markets`
- `/agents`
- `/oracles`
- `/yield`
- `/governance`
- `/users`
- `/ai`
- `/social`
- `/rwa`
- `/api` (aggregate stats)

Representative endpoints:

- `POST /auth/challenge`
- `POST /auth/verify`
- `POST /markets/`
- `GET /markets/`
- `POST /markets/{market_id}/bet`
- `POST /agents/register`
- `POST /agents/{agent_id}/stake`
- `POST /oracles/register`
- `POST /oracles/submit`
- `GET /oracles/status?market_id=...`
- `GET /yield/vaults`
- `POST /yield/rebalance`
- `POST /governance/proposals`
- `POST /governance/proposals/{proposal_id}/vote`
- `POST /social/ingest`
- `POST /social/spawn`
- `POST /social/compile`
- `GET /rwa/assets`
- `POST /rwa/register`
- `GET /users/me`
- `GET /api/stats`
- `GET /health`

Interactive docs are exposed by FastAPI at:

- `/docs`
- `/redoc`
- `/openapi.json`

## Environment Variables

### AI service (`ai/.env`)

Use `ai/.env.example` as template. Key fields include:

- `ENV`
- `MODEL_PROVIDER`
- `MODEL_NAME`
- `TEMPERATURE`
- `COINGECKO_API_KEY`
- `NEWS_API_KEY`
- `MIN_STAKE`
- `SLASH_THRESHOLD`
- `BACKEND_API`

### Frontend (`frontend/.env.local`)

Use `frontend/.env.example` as template. Key fields include:

- `NEXT_PUBLIC_ENV`
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_AI_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_ANALYTICS_ID`

### Backend (`backend/.env`)

Backend configuration is defined in `backend/core/config.py`. Required values typically include:

- App: `ENV`, `BASE_URL`
- Data: `DATABASE_URL`
- Redis/rate limit: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Auth/wallet: `REOWN_PROJECT_ID`, optional `PHANTOM_CLIENT_ID`
- Chain: `ALCHEMY_API_KEY`, `CHAIN_ID`, `ALLOW_TESTNET`, `RPC_URL`, optional contract addresses
- Payments: `TRANSAK_API_KEY`, `TRANSAK_API_SECRET`
- Email: `RESEND_API_KEY`, optional `FROM_EMAIL`
- Observability: optional `SENTRY_DSN`, `POSTHOG_API_KEY`, `POSTHOG_HOST`
- AI bridge: `OPENAI_API_KEY`, optional `AI_MODEL`, optional `RUST_CORE_URL`
- Security: `JWT_SECRET`, optional `CORS_ORIGINS`

## Local Development

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker + Docker Compose (recommended)
- PostgreSQL (if not using Docker DB)

### 1) Install dependencies

```bash
# root (tooling)
npm install

# frontend
cd frontend && npm install && cd ..

# contracts
cd contracts && npm install && cd ..

# backend
pip install -r backend/requirements.txt
```

### 2) Start services manually

```bash
# Terminal A: backend API
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal B: AI service
uvicorn ai.main:app --host 0.0.0.0 --port 9000 --reload

# Terminal C: frontend
cd frontend
npm run dev
```

### 3) Verify health

```bash
curl http://localhost:8000/health
curl http://localhost:9000/health
```

## Docker Development Stack

Bring up the full stack:

```bash
docker compose up --build
```

Services provisioned by default:

- `db` (PostgreSQL 16)
- `ai` (FastAPI inference service)
- `backend` (FastAPI API)
- `frontend` (Next.js app)

Shutdown:

```bash
docker compose down
```

## Smart Contract Development

From `contracts/`:

```bash
# compile
npx hardhat compile

# test
npx hardhat test

# optional local node
npx hardhat node
```

Network config currently includes:

- `hardhat` (local)
- `amoy` (Polygon Amoy via `RPC_URL` + `PRIVATE_KEY`)

## Testing

### Frontend

```bash
cd frontend
npm run test
npm run test:e2e
```

### Backend

```bash
pytest
```

### AI package

```bash
pytest ai/tests
```

### Contracts

```bash
cd contracts
npx hardhat test
```

## Deployment

### Frontend

`vercel.json` is configured with:

- Install command: `cd frontend && npm install`
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/.next`

### Backend

`backend/Dockerfile` runs `uvicorn backend.api.main:app` with configurable `PORT` and `WEB_CONCURRENCY`.

### AI service

Deployed as a standalone FastAPI service (`ai.main -> ai.inference.service`).

## Security and Reliability

- Structured global error payloads with request IDs
- Health checks for backend and AI services
- Wallet-based auth with challenge/verify flow
- Centralized rate limiting middleware backed by Upstash Redis REST
- Invariant-first service design (`InvariantViolation` for deterministic failures)
- CORS normalization with production-safe defaults

## Roadmap Extensions

Potential next milestones supported by current structure:

- Event-driven indexing completion under `backend/indexing/`
- Rust acceleration in `backend/rust-core/`
- Expanded on-chain deployment pipelines under `infra/ci` + `contracts/deploy`
- Deeper analytics/monitoring integrations under `infra/monitoring`

## License

This repository contains mixed components. Refer to project policy and package-level metadata for licensing terms.
