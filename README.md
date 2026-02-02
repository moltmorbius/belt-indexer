# Belt Indexer

Ponder indexer for Belt's ERC-4337 account abstraction contracts on **PulseChain**.

Indexes `UserOperationEvent` and `AccountDeployed` events from three EntryPoint versions, filtered to Belt ecosystem addresses only.

## Architecture

```
PulseChain RPC
     │
     ▼
┌──────────────┐     ┌──────────┐     ┌──────────────┐
│  Ponder Core │────▶│ Postgres │────▶│ GraphQL API  │
│  (indexer)   │     │          │     │ :42069       │
└──────────────┘     └──────────┘     └──────┬───────┘
                                             │
                                    ┌────────▼────────┐
                                    │ Discord Webhook  │
                                    │ (cron script)    │
                                    └─────────────────┘
```

## Contracts Indexed

### EntryPoints (ERC-4337)

| Version | Address | Explorer |
|---------|---------|----------|
| v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | [View](https://scan.pulsechain.com/address/0x0000000071727De22E5E9d8BAf0edAc6f37da032) |
| v0.8 | `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108` | [View](https://scan.pulsechain.com/address/0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108) |
| v0.9 | `0x433709009B8330FDa32311DF1C2AFA402eD8D009` | [View](https://scan.pulsechain.com/address/0x433709009B8330FDa32311DF1C2AFA402eD8D009) |

### Belt SimpleAccountFactories

| Version | Address | Explorer |
|---------|---------|----------|
| v0.7 | `0xC03f10876B6f9B2c6927EA8b2ac9552c6bb2Ce68` | [View](https://scan.pulsechain.com/address/0xC03f10876B6f9B2c6927EA8b2ac9552c6bb2Ce68) |
| v0.8 | `0x13E9ed32155810FDbd067D4522C492D6f68E5944` | [View](https://scan.pulsechain.com/address/0x13E9ed32155810FDbd067D4522C492D6f68E5944) |
| v0.9 | `0xAD07bbb7bEA77E323C838481F668d22864e9F66E` | [View](https://scan.pulsechain.com/address/0xAD07bbb7bEA77E323C838481F668d22864e9F66E) |

### Executor & Utility Wallets

| Role | Address | Explorer |
|------|---------|----------|
| Executor 1 | `0x1071cE6Fcc1A042208CCB60D5D417c2BA9C8E750` | [View](https://scan.pulsechain.com/address/0x1071cE6Fcc1A042208CCB60D5D417c2BA9C8E750) |
| Executor 2 | `0x668E2e474F7C602e86D256A85A2890a0eaDF205F` | [View](https://scan.pulsechain.com/address/0x668E2e474F7C602e86D256A85A2890a0eaDF205F) |
| Utility | `0x1BBc4B7CB2eb49480C200eAE411750572e6F30D9` | [View](https://scan.pulsechain.com/address/0x1BBc4B7CB2eb49480C200eAE411750572e6F30D9) |

### Account Implementations

| Version | Address | Explorer |
|---------|---------|----------|
| v0.8 | `0x28426d752372D68d34340bd94390950DcE3C9ec3` | [View](https://scan.pulsechain.com/address/0x28426d752372D68d34340bd94390950DcE3C9ec3) |
| v0.9 | `0xCc5C9b932F18D8Dd08Ee2FFFEF52b09583E247c0` | [View](https://scan.pulsechain.com/address/0xCc5C9b932F18D8Dd08Ee2FFFEF52b09583E247c0) |

## Events Indexed

| Event | Description |
|-------|-------------|
| `UserOperationEvent` | Emitted after each UserOp execution (success or failure) |
| `AccountDeployed` | Emitted when a new smart account is deployed via factory |

Events are filtered to only include Belt ecosystem activity (factory deployments, executor transactions, known smart accounts).

## Database Schema

| Table | Description |
|-------|-------------|
| `user_operation` | All Belt-related UserOps with gas costs, success status, and versions |
| `account_deployed` | Smart account deployments via Belt factories |
| `smart_account` | Registry of Belt-deployed accounts with aggregate stats |
| `account_activity` | Per-UserOp activity log for tracked accounts |

## Quick Start

### Prerequisites

- Node.js ≥ 18
- pnpm
- PostgreSQL (for production; Ponder uses SQLite for dev)

### Setup

```bash
# Clone
git clone https://github.com/moltmorbius/belt-indexer.git
cd belt-indexer

# Install
pnpm install

# Configure
cp .env.example .env.local
# Edit .env.local with your RPC URL and database connection

# Start dev server
pnpm dev
```

### Query the API

Once running, visit `http://localhost:42069/graphql` for the GraphQL playground.

**Example: Recent UserOps**
```graphql
{
  userOperations(orderBy: "timestamp", orderDirection: "desc", limit: 10) {
    items {
      id
      sender
      success
      actualGasCost
      entryPointVersion
      txHash
      timestamp
    }
  }
}
```

**Example: Deployed Accounts**
```graphql
{
  accountDeployeds(orderBy: "timestamp", orderDirection: "desc", limit: 10) {
    items {
      account
      factory
      entryPointVersion
      txHash
      blockNumber
    }
  }
}
```

**Example: Smart Account Stats**
```graphql
{
  smartAccounts(orderBy: "totalUserOps", orderDirection: "desc", limit: 20) {
    items {
      address
      factory
      entryPointVersion
      totalUserOps
      totalGasSpent
      deployedAtBlock
    }
  }
}
```

## Discord Notifications

A standalone script queries the Ponder GraphQL API and posts new events to Discord.

```bash
# One-time run
node scripts/notify-discord.mjs

# As a cron job (every 5 minutes)
*/5 * * * * cd /path/to/belt-indexer && node scripts/notify-discord.mjs
```

**Environment variables:**
- `PONDER_GRAPHQL_URL` — GraphQL endpoint (default: `http://localhost:42069/graphql`)
- `DISCORD_WEBHOOK_URL` — Discord webhook URL

## Deployment

### Railway

1. Create a new project on [Railway](https://railway.app)
2. Add a **PostgreSQL** database service
3. Add a **GitHub repo** service pointing to this repo
4. Set environment variables:
   - `PONDER_RPC_URL_369` — PulseChain RPC URL
   - `DATABASE_URL` — auto-filled by Railway's Postgres service
5. Deploy!

Railway will use `railway.json` for build/deploy configuration.

### Docker

```bash
docker build -t belt-indexer .
docker run -d \
  -e PONDER_RPC_URL_369=https://rpc-pulsechain.g4mm4.io \
  -e DATABASE_URL=postgresql://user:pass@host:5432/belt_indexer \
  -p 42069:42069 \
  belt-indexer
```

### Docker Compose

```yaml
services:
  indexer:
    build: .
    ports:
      - "42069:42069"
    environment:
      PONDER_RPC_URL_369: https://rpc-pulsechain.g4mm4.io
      DATABASE_URL: postgresql://postgres:postgres@db:5432/belt_indexer
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: belt_indexer
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Project Structure

```
belt-indexer/
├── abis/
│   └── EntryPointAbi.ts       # ERC-4337 EntryPoint event ABI
├── scripts/
│   └── notify-discord.mjs     # Discord notification cron script
├── src/
│   ├── constants.ts            # Belt addresses, helpers
│   └── index.ts                # Event handlers
├── ponder.config.ts            # Ponder chain & contract config
├── ponder.schema.ts            # Database schema (tables, enums)
├── package.json
├── tsconfig.json
├── railway.json                # Railway deployment config
├── Dockerfile
├── Procfile
├── .env.example
└── README.md
```

## Configuration

### Start Block

The `START_BLOCK` in `ponder.config.ts` is set to `25_627_000` (~1 week before 2026-02-02). Adjust when deploying fresh or adding a new chain.

### Database Schema

**Production** uses `DATABASE_SCHEMA=ponder` (stable name). Ponder does crash recovery across deploys — picks up where it left off instead of re-syncing.

**Staging / Preview environments** — use `DATABASE_SCHEMA=$RAILWAY_DEPLOYMENT_ID` for full isolation per deploy. Each deployment gets a clean schema, zero migration conflicts. Tradeoff: re-syncs from start block every deploy (no crash recovery). Good for testing schema changes without breaking production.

```bash
# Production (current)
DATABASE_SCHEMA=ponder

# Staging/preview (per-deploy isolation)
DATABASE_SCHEMA=${{RAILWAY_DEPLOYMENT_ID}}
```

### Adding New Addresses

To track additional factories, executors, or implementations:
1. Add addresses to `src/constants.ts` 
2. If adding a new EntryPoint, also add it to `ponder.config.ts`

### Adding New Chains

1. Add chain config to `ponder.config.ts` (transport, contracts, start block)
2. Add chain ID mapping to `CHAIN_IDS` in `src/constants.ts`
3. Add chain display metadata to `CHAIN_META` in `src/discord.ts`
4. Redis watermarks are automatically scoped per chain+contract

## License

MIT
