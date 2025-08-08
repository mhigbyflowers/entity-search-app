# Entity Search App

A Next.js + Prisma web app to bulk match companies from a CSV to entities stored in a PostgreSQL database (Company, InternetDomainName, GenericEntity). Users upload a CSV, review mapped results, and download unmatched rows.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (only if you want to run locally without Docker)
- A `.env` file with `DATABASE_URL` (see below)

## Environment

The included `docker-compose.yml` runs:
- db: PostgreSQL 14 (port 5433 on host -> 5432 in container)
- web: Next.js app (port 3000)

Example `.env` for Docker: (use for dev)
```
DATABASE_URL="postgresql://user:password@db:5432/mydatabase"
```


```

## One-time setup

If you plan to run outside Docker:
```bash
npm install
```

Make sure your Prisma client is generated:
```bash
npx prisma generate
```

## Run with Docker (recommended)

Build and start:
```bash
docker compose up -d --build
```

Run database migrations:
```bash
docker compose exec web npx prisma migrate deploy
```

Seed the database (required):
```bash
docker-compose exec web npm run db:seed
```

Open the app:
```bash
$BROWSER http://localhost:3000
```

Stop:
```bash
docker compose down
```

Persisted data lives in the `postgres_data` volume.

## Run locally (without Docker)

Start Postgres using Compose (db only):
```bash
docker compose up -d db
```

Install deps and run dev server:
```bash
npm install
npx prisma migrate dev
npx prisma db seed   # required
npm run dev
```

Open:
```bash
$BROWSER http://localhost:3000
```

## Seeding

The seed script populates the database with mock entities so matching works. Run it any time you reset the DB:

- Docker:
  ```bash
  docker-compose exec web npm run db:seed
  ```
- Local:
  ```bash
  npm run db:seed
  ```

## CSV upload and review workflow

1. Upload a CSV on the home page (each row is a company).
2. The app posts parsed rows to `/api/search`.
3. The UI shows a summary, candidates, and unmatched rows.
4. Download unmatched rows as CSV for follow-up.

