"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/app/components/NotificationBell";

const ICONES = {
  home: <path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10" />,
  livro: <><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" /></>,
  contrato: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  grid: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 9a3 3 0 1 0 0-6M21.5 20a5.5 5.5 0 0 0-6-5.4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

function Icone({ nome }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONES[nome]}
    </svg>
  );
}

const ROTULO_PAPEL = { admin: "Admin", financeiro: "Financeiro", atendente: "Atendente" };

export default function PainelLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [eu, setEu] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    fetch("/api/perfis").then((r) => r.json()).then((d) => setEu(d.eu || null));
  }, []);

  // fecha o menu (mobile) sozinho toda vez que a rota muda -- sem isso, ficaria
  // aberto por cima da pagina nova depois de navegar por um link dele.
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const podeVerAnalytics = eu?.role === "admin" || eu?.role === "financeiro";
  const admin = eu?.role === "admin";

  const itens = [
    { href: "/painel", label: "Board CRM", icone: "home", mostrar: true },
    { href: "/painel/analytics", label: "Analytics", icone: "chart", mostrar: podeVerAnalytics },
    { href: "/painel/contratos", label: "Contratos", icone: "contrato", mostrar: podeVerAnalytics },
    { href: "/painel/eventos", label: "Agenda de eventos", icone: "calendar", mostrar: true },
    { href: "/painel/catalogo", label: "Catálogo", icone: "grid", mostrar: admin },
    { href: "/painel/proposta", label: "Proposta pública", icone: "livro", mostrar: admin },
    { href: "/painel/usuarios", label: "Usuários", icone: "users", mostrar: admin },
  ];

  return (
    <div className="painel-shell">
      <div className="mobile-topbar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">P</div>
          <span className="sidebar-brand-name">Personare</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NotificationBell />
          <button className="hamburger-btn" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Icone nome="menu" />
          </button>
        </div>
      </div>

      {menuAberto && <div className="sidebar-backdrop" onClick={() => setMenuAberto(false)} />}

      <aside className={`sidebar${menuAberto ? " aberta" : ""}`}>
        <button className="sidebar-close" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
          <Icone nome="x" />
        </button>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">P</div>
          <span className="sidebar-brand-name">Personare</span>
        </div>

        {eu && (
          <div className="sidebar-user">
            <b>{eu.email}</b>
            <span>{ROTULO_PAPEL[eu.role] || eu.role}</span>
          </div>
        )}

        <div>
          <div className="sidebar-label" style={{ marginBottom: 6 }}>Navegação</div>
          <nav className="sidebar-nav">
            {itens.filter((i) => i.mostrar).map((i) => (
              <Link key={i.href} href={i.href} className={`sidebar-link${pathname === i.href ? " active" : ""}`}>
                <Icone nome={i.icone} /> {i.label}
              </Link>
            ))}
          </nav>
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/painel/nova-proposta" className="sidebar-cta">
            <Icone nome="plus" /> Nova proposta
          </Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <button className="sidebar-link" onClick={sair} style={{ flex: 1 }}>
              <Icone nome="logout" /> Sair
            </button>
            <span className="sidebar-bell-desktop">
              <NotificationBell />
            </span>
          </div>
        </div>
      </aside>

      <main className="painel-main">
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
