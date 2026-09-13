"use client";

// Toast leve global: `showToast(mensagem, tipo?)` de qualquer lugar.
// Sem provider, sem contexto -- usa um CustomEvent pra desacoplar produtor
// (apiFetch em lib) do consumidor (esse componente no layout raiz).
// Substituto do alert() bloqueante nativo, que ainda por cima e' bloqueado
// em alguns navegadores/PWAs.
import { useEffect, useState } from "react";

export function showToast(mensagem, tipo = "err") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { mensagem, tipo } }));
}

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    function ouvir(e) {
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { id, ...e.detail }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    }
    window.addEventListener("app-toast", ouvir);
    return () => window.removeEventListener("app-toast", ouvir);
  }, []);
  if (toasts.length === 0) return null;
  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 2000, maxWidth: 380 }}>
      {toasts.map((t) => (
        <div key={t.id}
          style={{
            padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500,
            background: t.tipo === "ok" ? "var(--sage)" : t.tipo === "warn" ? "var(--warn)" : "var(--bad)",
            color: "var(--white)", boxShadow: "0 10px 40px rgba(0,0,0,.15)",
            animation: "toast-in .25s cubic-bezier(.16,1,.3,1)",
          }}
        >
          {t.mensagem}
        </div>
      ))}
    </div>
  );
}
