import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("MemoryPlay não conseguiu iniciar:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "#fff4f1", background: "#090308", fontFamily: "system-ui, sans-serif" }}>
          <section style={{ maxWidth: 620, padding: 28, border: "1px solid #803346", borderRadius: 18, background: "#1a0911" }}>
            <h1 style={{ marginTop: 0 }}>O MemoryPlay encontrou um erro</h1>
            <p>O aplicativo carregou, mas ocorreu um erro ao iniciar a interface. Atualize a página; se continuar, envie esta mensagem:</p>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#ffb5a8" }}>{String(this.state.error?.message || this.state.error)}</pre>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Elemento #root não encontrado no index.html.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
