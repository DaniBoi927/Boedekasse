# 💰 Boedekasse

A simple cash-register / expense-tracker web app, deployed on **Digital Ocean**.

---

## Architecture overview

```
Browser
  │
  ▼
┌─────────────────────────────────────────────┐
│              Nginx (port 80)                │  ← static frontend + reverse proxy
│  /          → serves frontend/index.html    │
│  /api/*     → proxies to backend:3000       │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Node.js/Express │  ← REST API (port 3000)
            │  backend service │
            └────────┬─────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  PostgreSQL (DO      │
          │  Managed Database)   │
          └──────────────────────┘
```

### Key files

| Path | Purpose |
|------|---------|
| `backend/` | Node.js/Express REST API |
| `frontend/` | Static HTML/CSS/JS UI |
| `nginx/nginx.conf` | Reverse-proxy + static file config |
| `docker-compose.yml` | Local development stack |
| `.do/app.yaml` | Digital Ocean App Platform spec |
| `.github/workflows/deploy.yml` | CI/CD pipeline |

---

## Local development

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

### Run the full stack locally

```bash
cp .env.example .env          # review & edit passwords if needed
docker compose up --build
```

Open **http://localhost** in your browser.

The backend API is also accessible directly at **http://localhost:3000/api/health**.

---

## Deploy to Digital Ocean

### 1 – Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DO_API_TOKEN` | Your Digital Ocean personal access token |
| `DO_REGISTRY_NAME` | Your DO Container Registry name (e.g. `registry.digitalocean.com/my-registry`) |

### 2 – One-click deploy via App Platform

```bash
# Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/
doctl auth init
doctl apps create --spec .do/app.yaml
```

Or push to `main` – the GitHub Actions workflow handles it automatically.

### 3 – Database setup

After the first deploy, run the schema migration once:

```bash
doctl databases sql <DB_ID> < backend/src/db/schema.sql
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/transactions` | List all transactions |
| `POST` | `/api/transactions` | Create a transaction |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |

**POST body:**
```json
{
  "description": "Groceries",
  "amount": 42.50,
  "type": "expense"
}
```
