# Cell Culture Laboratory Management Platform

A university MVP for incubator monitoring, media preparation, cell culture management, scheduling, contamination logs, and experiment tracking.

## Tech stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database: MongoDB via Mongoose
- Cache/session store: Redis (service is available in Docker Compose; Redis-backed features are not implemented yet)
- Containers: Docker Compose

## Getting started

1. Copy `.env.example` to `.env` and set a private `JWT_SECRET`.
2. Start MongoDB and Redis:
   ```bash
   docker compose up -d
   ```
3. Install and run the backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. Install and run the React frontend in another terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The backend connects to `MONGODB_URI` (default `mongodb://127.0.0.1:27017/cellculture_db`) and waits for MongoDB before listening. Health is available at `http://localhost:4000/health`.

## Data model

MongoDB collections are created by Mongoose when the backend first writes records. Numeric `id` values and the REST API field names are kept compatible with the React frontend. Passage history is embedded in cultures; observations are embedded in experiments. The other lab records are separate collections with numeric references.

The former PostgreSQL data directory is left on disk, but the application does not read or migrate PostgreSQL records. MongoDB starts with an empty database; create accounts and lab records again or migrate them separately if they need to be retained.

## Project structure

```
cell-culture-platform/
├── backend/       # Node.js + Express + TypeScript API
├── frontend/      # React + TypeScript + Vite
├── docker-compose.yml
├── .env.example
└── docs/
```
