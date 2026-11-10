import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
const isProduction = process.env.NODE_ENV === "production";
const ACCESS_COOKIE = "memoryplay_access";
const REFRESH_COOKIE = "memoryplay_refresh";
const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" };
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 * 1000;

function authClient() {
  if (!configured) throw new Error("Supabase não está configurado no servidor.");
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return ["", ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function setSessionCookies(res, session) {
  const accessMaxAge = Math.max(60_000, Math.min(SESSION_MAX_AGE, (session.expires_in || 3600) * 1000));
  res.cookie(ACCESS_COOKIE, session.access_token, { ...COOKIE_OPTIONS, maxAge: accessMaxAge });
  res.cookie(REFRESH_COOKIE, session.refresh_token, { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE });
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE, COOKIE_OPTIONS);
}

async function getAuthenticatedUser(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies[ACCESS_COOKIE] || !cookies[REFRESH_COOKIE]) return null;
  const client = authClient();
  const { data: sessionData, error: sessionError } = await client.auth.setSession({
    access_token: cookies[ACCESS_COOKIE],
    refresh_token: cookies[REFRESH_COOKIE],
  });
  if (sessionError || !sessionData.session) {
    clearSessionCookies(res);
    return null;
  }
  const session = sessionData.session;
  if (session.access_token !== cookies[ACCESS_COOKIE] || session.refresh_token !== cookies[REFRESH_COOKIE]) {
    setSessionCookies(res, session);
  }
  const { data, error } = await client.auth.getUser(session.access_token);
  if (error || !data.user) {
    clearSessionCookies(res);
    return null;
  }
  return {
    id: data.user.id,
    name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Jogador",
    email: data.user.email,
  };
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/health", async (_req, res) => {
  if (!configured) return res.status(503).json({ ok: false, backend: "online", supabase: "not_configured" });
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return res.status(503).json({ ok: false, backend: "online", supabase: "unavailable", status: response.status });
    return res.json({ ok: true, backend: "online", database: "supabase-postgres", auth: "reachable" });
  } catch {
    return res.status(503).json({ ok: false, backend: "online", supabase: "unreachable" });
  }
});

app.get("/api/auth/me", async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "Não autenticado." });
    return res.json({ user });
  } catch (error) { return next(error); }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (name.length < 2 || name.length > 40) return res.status(400).json({ error: "O nome deve ter entre 2 e 40 caracteres." });
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: "Informe um e-mail válido." });
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) return res.status(400).json({ error: "A senha deve ter entre 8 e 72 bytes." });
    const { data, error } = await authClient().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      const status = error.status === 422 ? 409 : (error.status || 400);
      return res.status(status).json({ error: error.message || "Não foi possível criar a conta." });
    }
    if (data.session) {
      setSessionCookies(res, data.session);
      return res.status(201).json({ user: { id: data.user.id, name, email: data.user.email } });
    }
    return res.status(202).json({
      confirmationRequired: true,
      message: "Conta criada. Verifique seu e-mail para confirmar o cadastro antes de entrar.",
    });
  } catch (error) { return next(error); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ error: "Informe e-mail e senha." });
    const { data, error } = await authClient().auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) return res.status(401).json({ error: "E-mail ou senha incorretos. Se acabou de se cadastrar, confirme seu e-mail." });
    setSessionCookies(res, data.session);
    return res.json({
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email.split("@")[0],
        email: data.user.email,
      },
    });
  } catch (error) { return next(error); }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[ACCESS_COOKIE] && cookies[REFRESH_COOKIE] && configured) {
      const client = authClient();
      const { data } = await client.auth.setSession({
        access_token: cookies[ACCESS_COOKIE],
        refresh_token: cookies[REFRESH_COOKIE],
      });
      if (data.session) await client.auth.signOut({ scope: "local" });
    }
    clearSessionCookies(res);
    return res.json({ ok: true });
  } catch (error) {
    clearSessionCookies(res);
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error("Erro na API:", error);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const port = Number(process.env.PORT || process.env.API_PORT || 3001);
app.listen(port, "0.0.0.0", () => {
  console.log(`MemoryPlay API escutando na porta ${port}`);
  console.log(configured ? "Autenticação Supabase configurada." : "AVISO: configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.");
});
