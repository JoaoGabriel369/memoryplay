import React, { useEffect, useMemo, useState } from "react";

const SYMBOLS = ["🚀","🎮","🌈","🦊","🍕","⚽","🎧","🌻","🐼","🍉","⭐","🧩","🦋","🍩","🎸","🐙","💎","🛸","🦖","🍓","🎯","🐳","🌙","🪐"];
const LEVELS = {
  easy: { label: "Fácil", pairs: 8, columns: 4 },
  medium: { label: "Médio", pairs: 12, columns: 4 },
  hard: { label: "Difícil", pairs: 18, columns: 6 },
};

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatTime(total) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function readRecord(level) {
  try { return Number(localStorage.getItem(`memoryplay-best-${level}`)) || 0; }
  catch { return 0; }
}

function makeDeck(level) {
  const symbols = SYMBOLS.slice(0, LEVELS[level].pairs);
  return shuffle([...symbols, ...symbols]).map((symbol, index) => ({
    id: `${level}-${Date.now()}-${index}-${Math.random()}`,
    symbol,
  }));
}

export default function App() {
  const [level, setLevel] = useState("easy");
  const [deck, setDeck] = useState(() => makeDeck("easy"));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [best, setBest] = useState(() => readRecord("easy"));
  const config = LEVELS[level];
  const won = matched.length === config.pairs;

  useEffect(() => {
    if (!started || won) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, won]);

  useEffect(() => {
    if (!won) return;
    const previous = readRecord(level);
    if (!previous || moves < previous) {
      try { localStorage.setItem(`memoryplay-best-${level}`, String(moves)); } catch {}
      setBest(moves);
    }
  }, [won, level, moves]);

  useEffect(() => {
    if (flipped.length !== 2) return undefined;
    const [first, second] = flipped;
    if (deck[first].symbol === deck[second].symbol) {
      const timeout = window.setTimeout(() => {
        setMatched((current) => [...current, deck[first].symbol]);
        setFlipped([]);
      }, 280);
      return () => window.clearTimeout(timeout);
    }
    setLocked(true);
    const timeout = window.setTimeout(() => {
      setFlipped([]);
      setLocked(false);
    }, 850);
    return () => window.clearTimeout(timeout);
  }, [flipped, deck]);

  const resetGame = (nextLevel = level) => {
    setLevel(nextLevel);
    setDeck(makeDeck(nextLevel));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setLocked(false);
    setBest(readRecord(nextLevel));
  };

  const chooseCard = (index) => {
    if (locked || flipped.length >= 2 || flipped.includes(index) || matched.includes(deck[index].symbol) || won) return;
    if (!started) setStarted(true);
    if (flipped.length === 1) setMoves((value) => value + 1);
    setFlipped((current) => [...current, index]);
  };

  const recordText = useMemo(
    () => best ? `Melhor resultado: ${best} jogadas` : "Seu recorde fica salvo neste dispositivo.",
    [best],
  );

  return (
    <div className="page">
      <nav className="topbar" aria-label="Cabeçalho">
        <div className="brand"><div className="brand-mark">✦</div><span>MEMORY<span>PLAY</span></span></div>
        <div className="top-tag">Arcade de concentração</div>
      </nav>

      <header className="hero">
        <div className="eyebrow">Desafio de concentração</div>
        <h1>Memory<span>Play</span></h1>
        <p className="subtitle">Entre no universo vermelho. Encontre os pares e teste os limites da sua memória.</p>
      </header>

      <main className="game-shell" aria-label="Jogo da memória">
        <div className="toolbar">
          <div className="level-wrap">
            <p className="control-label">Escolha a dificuldade</p>
            {Object.entries(LEVELS).map(([key, item]) => (
              <button key={key} className={`level ${level === key ? "active" : ""}`} onClick={() => resetGame(key)} aria-pressed={level === key}>
                {item.label}
              </button>
            ))}
          </div>

          <div className="stats" aria-live="polite">
            <div className="stat"><small>Jogadas</small><strong>{moves}</strong></div>
            <div className="stat"><small>Tempo</small><strong>{formatTime(seconds)}</strong></div>
            <div className="stat"><small>Pares</small><strong>{matched.length}/{config.pairs}</strong></div>
          </div>
          <div className="toolbar-actions"><button className="restart" onClick={() => resetGame()}>↻ Reiniciar</button></div>
        </div>

        <div className="board-frame">
          <div className={`board cols-${config.columns}`} aria-label="Cartas do jogo">
            {deck.map((card, index) => {
              const isFlipped = flipped.includes(index);
              const isMatched = matched.includes(card.symbol);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`card ${isFlipped ? "flipped" : ""} ${isMatched ? "matched" : ""}`}
                  onClick={() => chooseCard(index)}
                  disabled={isMatched || locked || isFlipped || won}
                  aria-label={isMatched ? `Par encontrado: ${card.symbol}` : isFlipped ? `Carta revelada: ${card.symbol}` : `Revelar carta ${index + 1}`}
                  aria-pressed={isFlipped || isMatched}
                >
                  <span className="card-inner">
                    <span className="face back" aria-hidden="true">✦</span>
                    <span className="face front" aria-hidden="true">{card.symbol}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="hint-row">
          <span><i className="status-dot" /><strong>Dica:</strong> memorize a posição das cartas para encontrar os pares.</span>
          <span>{recordText}</span>
        </div>
      </main>

      {won && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="win-title">
          <div className="modal">
            <div className="trophy">🏆</div>
            <h2 id="win-title">{best === moves ? "Novo recorde!" : "Parabéns!"}</h2>
            <p>Você encontrou os {matched.length} pares em {moves} jogadas e {formatTime(seconds)}!</p>
            <button className="restart primary" onClick={() => resetGame()}>Jogar novamente</button>
          </div>
        </div>
      )}
      <footer>MEMORYPLAY <span aria-hidden="true">✦</span> Um pequeno desafio para uma grande memória.</footer>
    </div>
  );
}
