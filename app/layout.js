import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

export const metadata = {
  title: "Personare Proposta",
  description: "Configurador de propostas e CRM do Espaço Personare",
};

const geistSans = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono", display: "swap" });
// Serif com caráter pra titulos -- evoca convite impresso, usado com moderacao
// (so em h1/h2/hero), nunca no corpo do texto.
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-fraunces", display: "swap" });

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
