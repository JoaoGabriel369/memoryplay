import express from "express";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(process.env.DATA_DIR || resolve(here, "../data"));
mkdirSync(dataDir, { recursive: true });
const db = new Database(resolve(dataDir, "memoryplay.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
`);
db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));

const SESSION_COOKIE = "memoryplay_session";
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" };

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookie(header = "", name) {
  const part = header.split(";").map((value) => value.trim()).find((value) => value.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function setSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL;
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), userId, expiresAt);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL });
}

function currentUser(req) {
  const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = db.prepare(`
    SELECT users.id, users.name, users.email, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(tokenHash);
  if (!row || row.expires_at <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email };
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function clearSession(req, res) {
  const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

app.get("/api/health", (_req, res) => {
  try { db.prepare("SELECT 1").get(); return res.json({ ok: true, database: "sqlite" }); }
  catch { return res.status(503).json({ ok: false, database: "unavailable" }); }
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." } });
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/auth/me", (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Não autenticado." });
  return res.json({ user });
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (name.length < 2 || name.length > 40) return res.status(400).json({ error: "O nome deve ter entre 2 e 40 caracteres." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: "Informe um e-mail válido." });
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ error: "A senha deve ter entre 8 e 72 bytes." });
    const passwordHash = await bcrypt.hash(password, 12);
    let result;
    try {
      result = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, passwordHash);
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "Este e-mail já está cadastrado." });
      throw error;
    }
    const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(result.lastInsertRowid);
    setSession(res, user.id);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = db.prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?").get(email);
    const fallbackHash = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7Z7k7r8zN8q3x8jQmQ0b1h1G7uG5K5K";
    const valid = await bcrypt.compare(password, user?.password_hash || fallbackHash);
    if (!user || !valid) return res.status(401).json({ error: "E-mail ou senha incorretos." });
    setSession(res, user.id);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearSession(req, res);
  return res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  console.error("Erro na API:", error);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const port = Number(process.env.PORT || process.env.API_PORT || 3001);
app.listen(port, "0.0.0.0", () => {
  console.log("MemoryPlay API escutando na porta " + port);
  console.log("Banco SQLite: " + resolve(dataDir, "memoryplay.sqlite"));
});
