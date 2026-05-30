# CQRS Demo — Eventual Consistency with MongoDB + PostgreSQL

A minimal, runnable demonstration of **Command Query Responsibility Segregation (CQRS)**
with an intentional **15-second eventual consistency delay** so you can watch the
write-read gap happen in real time.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client                                 │
└────────────┬────────────────────────────┬───────────────────────┘
             │ POST /products             │ GET /products
             ▼                            ▼
┌────────────────────────┐   ┌────────────────────────┐
│   Command Service      │   │   Query Service        │
│   (port 3001)          │   │   (port 3002)          │
│                        │   │                        │
│  Writes → MongoDB      │   │  Reads ← PostgreSQL    │
└────────────┬───────────┘   └────────────────────────┘
             │                            ▲
             │  Synchronizer (every 15s)  │
             └────────────────────────────┘
```

| Component        | Role       | Database   |
|-----------------|------------|------------|
| command-service | Write side | MongoDB    |
| query-service   | Read side  | PostgreSQL |
| synchronizer    | Background job inside command-service | bridges both |

---

## Quick Start

```bash
docker compose up --build
```

---

## Demo Flow — copy-paste ready

### 1. Create a product (writes to MongoDB instantly)
```bash
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":1200,"stock":5}'
```

Expected response (201):
```json
{
  "_id": "uuid-here",
  "name": "Laptop",
  "price": 1200,
  "stock": 5,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "synced": false
}
```

### 2. Immediately query the read side — product NOT here yet (desync!)
```bash
curl http://localhost:3002/products
```

Expected response: `[]` — empty array. The product exists in MongoDB but has not
yet been copied to PostgreSQL. **This gap is eventual consistency.**

### 3. Wait 15–20 seconds… then query again — product appears (synced!)
```bash
curl http://localhost:3002/products
```

Expected response now includes the product.

### 4. Query a single product by ID
```bash
curl http://localhost:3002/products/<id-from-step-1>
```

### 5. Check sync logs
```bash
docker logs cqrs-demo-command-service-1 | grep sync
```

Sample log line:
```json
{"timestamp":"2024-01-01T00:00:15.123Z","event":"sync","productId":"uuid-here","lag_seconds":15.1}
```

### 6. Health checks
```bash
curl http://localhost:3001/health   # {"status":"ok","db":"mongodb"}
curl http://localhost:3002/health   # {"status":"ok","db":"postgresql"}
```

---

## Why is the data missing for 15–20 seconds?

> "The write DB (MongoDB) confirms the write immediately.
> The read DB (PostgreSQL) only receives the data after the
> synchronizer job runs. This gap IS eventual consistency —
> a real-world tradeoff between write speed and read availability."

In production systems this pattern appears in:
- **Event sourcing** — events are written first, projections updated asynchronously
- **Read replicas** — replication lag between primary and replica
- **Microservices** — services communicate via events, not shared databases
- **Cache invalidation** — cached reads lag behind writes until TTL expires

The tradeoff: writes are fast and never block waiting for the read store to update,
but reads may return stale data for a short window. Systems that use CQRS must
design clients to tolerate this (e.g., show optimistic UI, poll, or use
server-sent events to push updates).

---

## Environment Variables

| Variable           | Default                                        | Description                    |
|--------------------|------------------------------------------------|--------------------------------|
| `MONGO_URL`        | `mongodb://mongo:27017/cqrs_write`             | MongoDB connection string      |
| `POSTGRES_URL`     | `postgresql://user:pass@postgres:5432/cqrs_read` | PostgreSQL connection string |
| `SYNC_INTERVAL_MS` | `15000`                                        | Sync period in milliseconds    |
| `COMMAND_PORT`     | `3001`                                         | Command service port           |
| `QUERY_PORT`       | `3002`                                         | Query service port             |

---

## Coolify Deployment

Deploy the two services separately, both pointing to the same Git repository but
using different Dockerfile paths.

### Command Service
- **Build context / Dockerfile path**: `command-service/Dockerfile`
- **Port**: 3001
- **Environment variables** (set in Coolify panel, not .env):
  ```
  MONGO_URL=mongodb://<your-mongo-host>:27017/cqrs_write
  POSTGRES_URL=postgresql://user:pass@<your-postgres-host>:5432/cqrs_read
  SYNC_INTERVAL_MS=15000
  COMMAND_PORT=3001
  ```

### Query Service
- **Build context / Dockerfile path**: `query-service/Dockerfile`
- **Port**: 3002
- **Environment variables**:
  ```
  POSTGRES_URL=postgresql://user:pass@<your-postgres-host>:5432/cqrs_read
  QUERY_PORT=3002
  ```

Both services use `HEALTHCHECK` in their Dockerfiles so Coolify can monitor
liveness. Set `restart: unless-stopped` (already in docker-compose.yml) or
enable auto-restart in Coolify's service settings.

---

## Data Models

**MongoDB** (write store)
```js
{
  _id: String,       // UUID
  name: String,
  price: Number,
  stock: Number,
  createdAt: Date,
  synced: Boolean    // false until synchronizer runs
}
```

**PostgreSQL** (read store)
```sql
CREATE TABLE products (
  id         UUID PRIMARY KEY,
  name       VARCHAR(255),
  price      NUMERIC,
  stock      INTEGER,
  created_at TIMESTAMP,
  synced_at  TIMESTAMP   -- when synchronizer copied this row
);
```
