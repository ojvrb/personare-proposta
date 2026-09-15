import { NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

// Forca HTTPS em toda rota, antes de qualquer outra coisa (sessao/cookie nunca
// deve trafegar em claro). Na pratica o dominio .workers.dev ja e' HSTS
// preload (todo .dev e' preload por registro, nenhum browser chega a tentar
// HTTP nele) -- isso aqui e' defesa em profundidade pra quando/se um dominio
// proprio (nao .dev) for apontado pro Worker, e pra clientes nao-browser (curl etc).
export async function middleware(request) {
  // so em producao -- em dev (`next dev`, sem TLS) um proxy na frente as vezes
  // manda x-forwarded-proto:http mesmo servindo local, e redirecionar pra
  // https://localhost quebra o dev server (sem certificado).
  if (process.env.NODE_ENV === "production" && request.headers.get("x-forwarded-proto") === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
