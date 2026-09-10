/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// Em dev, o Next usa eval() pro hot-reload (React Refresh) — um CSP sem
// 'unsafe-eval' quebra a hidratacao inteira (cliques viram submit HTML puro,
// sem nenhum JS rodando, sem erro visivel). Por isso o CSP estrito so entra em producao.
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          ...(isDev
            ? []
            : [
                {
                  key: "Content-Security-Policy",
                  value:
                    "default-src 'self'; " +
                    "img-src 'self' data: https://*.supabase.co; " +
                    "connect-src 'self' https://*.supabase.co; " +
                    "script-src 'self' 'unsafe-inline'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "frame-ancestors 'none'",
                },
              ]),
        ],
      },
      {
        // so a area interna (painel) fica sem cache — a proposta publica pode cachear normal
        source: "/(painel)(.*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
