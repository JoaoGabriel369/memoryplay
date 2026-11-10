# MemoryPlay

MemoryPlay is a React + Vite memory game with an Express authentication API and SQLite persistence.

## Local development

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/JoaoGabriel369/memoryplay.git
cd memoryplay
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to Express on port 3001. Local SQLite file: `data/memoryplay.sqlite`.

## Production architecture

- **Cloudflare Pages:** React/Vite frontend (build: `npm run build`, output: `dist`).
- **Cloudflare Pages Function:** `functions/api/[[path]].js` reverse-proxies same-origin `/api/*` requests to Railway. Configure the Pages production and preview variable `API_ORIGIN` with the Railway service origin, e.g. `https://your-api.up.railway.app` (no trailing slash).
- **Railway:** Express API. Start command: `npm start`; healthcheck: `/api/health`.
- **SQLite:** attach a Railway persistent volume at `/data` and set `DATA_DIR=/data`. Do not use ephemeral container storage for production data.

Railway service variables:
- `NODE_ENV=production`
- `DATA_DIR=/data`
- `PORT` is provided by Railway automatically.

Cloudflare Pages project:
- Repository: `JoaoGabriel369/memoryplay`
- Branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `API_ORIGIN=https://<railway-api-domain>`

## Authentication and operational safeguards

- Passwords are hashed with bcrypt.
- Session identifiers are random; only their SHA-256 hashes are stored in SQLite.
- Session cookies are HttpOnly, SameSite=Lax and Secure in production.
- Helmet security headers are enabled.
- Login and registration have a basic IP rate limit.
- `GET /api/health` checks both the API process and SQLite query availability.

## Commands

- `npm run dev` — run frontend and API locally.
- `npm start` — run the production API.
- `npm run build` — build the frontend.
- `npm run preview` — preview the frontend build locally.

Before handling real users at scale, add automated integration tests, account recovery/email verification, monitoring/alerts, and a tested backup/restore process for the SQLite volume.
