"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Sino de notificacoes -- deriva de dados que ja existem (propostas aceitas
// pelo cliente, transferencias pendentes), sem tabela propria. Poll simples
// a cada minuto; sem "marcar como lido" por enquanto (YAGNI).
export default function NotificationBell() {
  const [dados, setDados] = useState({ propostasAceitas: [], transferenciasPendentes: [] });
  const [aberto, setAberto] = useState(false);
  const [estiloPainel, setEstiloPainel] = useState(null);
  const ref = useRef(null);
  const botaoRef = useRef(null);

  async function carregar() {
    const res = await fetch("/api/notificacoes");
    if (res.ok) setDados(await res.json());
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60000);
    function fechar(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => { clearInterval(t); document.removeEventListener("mousedown", fechar); };
  }, []);

  const total = dados.propostasAceitas.length + dados.transferenciasPendentes.length;

  function alternar() {
    setAberto((a) => {
      const abrir = !a;
      // no desktop a sidebar tem overflow-y:auto -- um painel absolute
      // dentro dela e' cortado pelo clip do scroll. Fixed com coordenada
      // calculada do botao escapa esse clip; no mobile a folha ja e'
      // fixed via CSS (media query), entao nao mexe la.
      if (abrir && botaoRef.current && window.innerWidth > 860) {
        const r = botaoRef.current.getBoundingClientRect();
        setEstiloPainel({ position: "fixed", left: r.left, bottom: window.innerHeight - r.top + 8 });
      } else if (abrir) {
        setEstiloPainel(null);
      }
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
            <p style={{ fontSize: 13, color: "var(--granite)", padding: "10px 12px", margin: 0 }}>Nenhuma novidade por enquanto.</p>
          ) : (
            <>
              {dados.transferenciasPendentes.map((t) => (
                <Link key={`t-${t.id}`} href="/painel/usuarios" className="notif-item">
                  <b style={{ fontSize: 13 }}>Transferência pendente</b>
                  <div style={{ fontSize: 12, color: "var(--stone)" }}>{t.cliente_nome}</div>
                </Link>
              ))}
              {dados.propostasAceitas.map((p) => (
                <Link key={`p-${p.id}`} href={p.cliente_id ? `/painel/clientes/${p.cliente_id}` : "/painel"} className="notif-item">
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
