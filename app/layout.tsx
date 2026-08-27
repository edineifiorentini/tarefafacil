import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";

import { BRAND_COOKIE, parseBrandTheme } from "@/lib/branding/themes";

// Inter Variable — família única do produto (7.5).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TarefaFácil",
  description: "Gerenciador de tarefas e projetos por setores.",
};

// Resolve o tema antes da primeira pintura (sem flash). Deve espelhar a chave
// e a lógica de lib/utils/useTheme.ts.
const themeScript = `(function(){try{var t=localStorage.getItem('tf-theme');var d=(t==='light'||t==='dark')?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',d);}catch(e){}})();`;

/**
 * A cor da marca vem do cookie, não do banco.
 *
 * O `<html>` é renderizado aqui, antes de qualquer coisa saber qual empresa
 * está aberta — consultar o banco daqui seria uma query a mais em toda
 * navegação. O cookie é escrito pelo layout do app quando ele descobre a
 * empresa, e a partir daí a cor sai pronta no HTML, sem piscar.
 *
 * Sem cookie (primeiro acesso, ou navegador limpo), cai no azul padrão e o
 * `BrandSync` corrige assim que a empresa carrega.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const brand = parseBrandTheme(cookieStore.get(BRAND_COOKIE)?.value);

  return (
    <html
      lang="pt-BR"
      data-brand={brand}
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
