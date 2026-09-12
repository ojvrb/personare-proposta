"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Sino de notificacoes -- deriva de dados que ja existem (propostas aceitas,
// transferencias pendentes), sem tabela propria. Clicar num item "marca como
// lida" via localStorage: staff pequena, um browser por atendente, nao precisa
// de tabela server-side pra isso -- se logar em outra maquina reaparece.
const CHAVE_LIDAS = "notif-lidas-v1";

function carregarLidas() {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_LIDAS) || "[]")); }
  catch { return new Set(); }
}
function salvarLidas(set) {
  try { localStorage.setItem(CHAVE_LIDAS, JSON.stringify([...set])); } catch {}
}

export default function NotificationBell() {
  const [dados, setDados] = useState({ propostasAceitas: [], transferenciasPendentes: [] });
  const [aberto, setAberto] = useState(false);
  const [estiloPainel, setEstiloPainel] = useState(null);
  const [lidas, setLidas] = useState(() => new Set());
  const ref = useRef(null);
  const botaoRef = useRef(null);

  async function carregar() {
    const res = await fetch("/api/notificacoes");
    if (res.ok) setDados(await res.json());
  }

  useEffect(() => {
    setLidas(carregarLidas());
    carregar();
    const t = setInterval(carregar, 60000);
    function fechar(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener("mousedown", fechar);
    return () => { clearInterval(t); document.removeEventListener("mousedown", fechar); };
  }, []);

  function marcarLida(id) {
    setLidas((atual) => { const novo = new Set(atual); novo.add(id); salvarLidas(novo); return novo; });
  }
  function marcarTodasLidas() {
    const todos = [...dados.transferenciasPendentes.map((t) => `t-${t.id}`), ...dados.propostasAceitas.map((p) => `p-${p.id}`)];
    setLidas((atual) => { const novo = new Set(atual); todos.forEach((id) => novo.add(id)); salvarLidas(novo); return novo; });
  }

  const transferPendentes = dados.transferenciasPendentes.filter((t) => !lidas.has(`t-${t.id}`));
  const propostasAceitas = dados.propostasAceitas.filter((p) => !lidas.has(`p-${p.id}`));
  const total = transferPendentes.length + propostasAceitas.length;

  function alternar() {
    setAberto((a) => {
      const abrir = !a;
      if (abrir && botaoRef.current && window.innerWidth > 860) {
        const r = botaoRef.current.getBoundingClientRect();
        setEstiloPainel({ position: "fixed", left: r.left, bottom: window.innerHeight - r.top + 8 });
      } else if (abrir) setEstiloPainel(null);
      return abrir;
    });
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button ref={botaoRef} className="notif-bell" onClick={alternar} aria-label="Notificações">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {total > 0 && <span className="notif-count">{total}</span>}
      </button>

      {aberto && (
        <div className="notif-panel" style={estiloPainel || undefined}>
          {total === 0 ? (
            <p style={{ fontSize: 13, color: "var(--granite)", padding: "10px 12px", margin: 0 }}>Tudo lido — nada de novo por aqui.</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px 8px", borderBottom: "1px solid var(--stroke)", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--granite)", textTransform: "uppercase", letterSpacing: ".06em" }}>{total} nov{total === 1 ? "a" : "as"}</span>
                <button onClick={marcarTodasLidas} style={{ fontSize: 12, background: "none", border: "none", color: "var(--sage-dark)", cursor: "pointer", padding: 0 }}>Marcar tudo</button>
              </div>
              {transferPendentes.map((t) => (
                <Link key={`t-${t.id}`} href="/painel/usuarios" onClick={() => marcarLida(`t-${t.id}`)} className="notif-item">
                  <b style={{ fontSize: 13 }}>Transferência pendente</b>
                  <div style={{ fontSize: 12, color: "var(--stone)" }}>{t.cliente_nome}</div>
                </Link>
              ))}
              {propostasAceitas.map((p) => (
                <Link key={`p-${p.id}`} href={p.cliente_id ? `/painel/clientes/${p.cliente_id}` : "/painel"} onClick={() => marcarLida(`p-${p.id}`)} className="notif-item">
                  <b style={{ fontSize: 13 }}>✓ {p.cliente_nome} aceitou a proposta</b>
                  <div style={{ fontSize: 12, color: "var(--stone)" }}>
                    R$ {Number(p.total).toLocaleString("pt-BR")} · {new Date(p.aceita_em).toLocaleDateString("pt-BR")}
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
