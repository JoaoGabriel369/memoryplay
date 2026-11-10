import React, { useEffect, useState } from "react";

export default function AuthPanel() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data && data.user) setUser(data.user); })
      .catch(() => { if (active) setMessage("Não foi possível conectar ao servidor do MemoryPlay."); });
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (response.status === 202 && data.confirmationRequired) {
        setMessage(data.message || "Verifique seu e-mail para confirmar a conta.");
        setMode("login");
        setPassword("");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Não foi possível autenticar.");
      setUser(data.user);
      setPassword("");
      setMessage(mode === "register" ? "Conta criada com sucesso!" : "Login realizado com sucesso!");
      setMode("login");
    } catch (error) {
      setMessage(error.message || "Erro ao conectar ao servidor.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Não foi possível encerrar a sessão.");
      setUser(null);
      setMessage("Você saiu da sua conta.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-area">
      <button className="auth-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {user ? "Olá, " + user.name.split(" ")[0] : "Entrar / Criar conta"}
      </button>
      {open && (
        <section className="auth-panel" aria-label="Área da conta">
          {user ? (
            <>
              <h2>Bem-vindo!</h2>
              <p className="auth-description">Você está conectado ao MemoryPlay.</p>
              <p className="auth-user-email"><strong>{user.name}</strong><br />{user.email}</p>
              <button className="auth-submit" type="button" onClick={() => setOpen(false)}>Continuar jogando</button>
              <button className="auth-logout" type="button" onClick={logout} disabled={busy}>{busy ? "Saindo..." : "Sair da conta"}</button>
            </>
          ) : (
            <>
              <h2>{mode === "register" ? "Criar conta" : "Acessar conta"}</h2>
              <p className="auth-description">{mode === "register" ? "Cadastre-se para começar a usar sua conta." : "Entre com seu e-mail e sua senha."}</p>
              <form className="auth-form" onSubmit={submit}>
                {mode === "register" && (
                  <label>Nome
                    <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={40} required placeholder="Seu nome" />
                  </label>
                )}
                <label>E-mail
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required placeholder="voce@email.com" />
                </label>
                <label>Senha
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} maxLength={72} required placeholder="Mínimo de 8 caracteres" />
                </label>
                <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Aguarde..." : mode === "register" ? "Criar minha conta" : "Entrar"}</button>
              </form>
              <button className="auth-switch" type="button" onClick={() => { setMode((value) => value === "login" ? "register" : "login"); setMessage(""); }}>
                {mode === "register" ? "Já tenho uma conta — entrar" : "Ainda não tenho conta — cadastrar"}
              </button>
            </>
          )}
          {message && <p className={"auth-message " + (message.includes("sucesso") || message.includes("saiu") ? "success" : "")} role="status">{message}</p>}
        </section>
      )}
    </div>
  );
}
