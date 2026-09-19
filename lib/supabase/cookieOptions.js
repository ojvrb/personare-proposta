// Opcoes do cookie de sessao (Supabase Auth).
// secure: true em producao -- nunca trafega em claro (mesmo com o redirect
// HTTPS do middleware, o atributo Secure e' a garantia no proprio cookie).
// Fica false em dev (`next dev` e' http puro) -- mesmo padrao do HSTS/CSP.
// httpOnly: true -- login/logout acontecem no servidor (app/api/auth/*), nao
// existe client de browser lendo o token, entao JS (XSS) nao alcanca a sessao.
// Se algum dia voltar um createBrowserClient, ele NAO vai enxergar a sessao.
export const cookieOptions = {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};
