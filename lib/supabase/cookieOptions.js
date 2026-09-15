// Cookie do cookie de sessao (Supabase Auth): secure=true em producao pra
// nunca trafegar em claro (mesmo com o redirect HTTPS do middleware, o
// atributo Secure e' a garantia no proprio cookie, nao so no transporte da
// pagina). Fica false em dev (localhost:3000 e' http puro no `next dev`) --
// mesmo padrao ja usado pro CSP em next.config.js.
export const cookieOptions = {
  secure: process.env.NODE_ENV === "production",
};
