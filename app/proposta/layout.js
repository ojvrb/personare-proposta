// Proposta e RSVP sao privadas por link (nome, valores, lista de convidados):
// nao devem aparecer em buscadores.
export const metadata = { robots: { index: false, follow: false } };

export default function PropostaLayout({ children }) {
  return children;
}
