"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LIMITE_MS = 10 * 60 * 1000; // 10 minutos
const EVENTOS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "wheel"];

// Desloga a equipe apos 10min sem interacao com a pagina -- area interna tem
// dado de cliente (nome, telefone, CPF mascarado, financeiro). Reseta o timer
// a cada evento de atividade real do usuario; nao conta requests em background.
export default function useLogoffInativo() {
  const router = useRouter();
  const timer = useRef(null);

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await createClient().auth.signOut();
        router.push("/login?reason=idle");
      }, LIMITE_MS);
    }

    reset();
    EVENTOS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      EVENTOS.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [router]);
}
