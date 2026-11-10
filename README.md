# MemoryPlay

React + Vite frontend with a local Node.js + Express + SQLite authentication backend.

## Requirements
- Node.js 20+
- npm

## Run locally
```bash
git clone https://github.com/JoaoGabriel369/memoryplay.git
cd memoryplay
npm install
npm run dev
``
Open the Vite URL (usually http://localhost:5173). Vite proxies /api requests to Express at http://127.0.0.1:3001. SQLite database is created automatically at data/memoryplay.sqlite.

## Local authentication
- Register with name, email and password (8+ characters).
- Log in using email and password.
- Passwords are hashed with bcryptjs.
- Session IDs are random, stored as hashes in SQLite, and sent in HttpOnly SameSite=Lax cookies.
- Users and sessions persist in the local SQLite file.

This backend is for local development only. Before public production use, add HTTPS, CSRF protection, rate limiting, secure deployment secrets, and persistent database hosting.

## Commands
- npm run dev — start API and Vite together.
- npm run server — start only Express.
- npm run vite — start only Vite.
- npm run build — production frontend build.
- npm run preview — preview the build.

Cloudflare Pages currently deploys only the static frontend. The Express/SQLite API is local in this stage.
