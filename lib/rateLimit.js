import { NextResponse } from "next/server";

// So funciona no Workers/next dev com initOpenNextCloudflareForDev (ver
// next.config.js) -- binding RATE_LIMITER declarado em wrangler.jsonc.
// Uso: `const limitado = await limitarPorIp(req); if (limitado) return limitado;`
export async function limitarPorIp(req) {
  const ip = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "sem-ip";
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return NextResponse.json({ error: "muitas requisicoes, tenta de novo em instantes" }, { status: 429 });
  } catch {
    // binding indisponivel (ex: ambiente sem Cloudflare) -- nao bloqueia a request.
  }
  return null;
}
