import type { Metadata } from "next";

import { AudienceChips } from "@/components/landing/AudienceChips";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { ConnectedFlow } from "@/components/landing/ConnectedFlow";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { OnboardingSteps } from "@/components/landing/OnboardingSteps";
import { PricingSection } from "@/components/landing/PricingSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { ProductTabs } from "@/components/landing/ProductTabs";
import { SegmentsSection } from "@/components/landing/SegmentsSection";
import { TrustSection } from "@/components/landing/TrustSection";

/**
 * A página inicial — a landing page do produto.
 *
 * **Ela é estática.** Não consulta sessão nem banco: quem já está
 * logado é desviado para `/hoje` pelo `proxy.ts`, que já tem o usuário
 * em mãos e roda antes. Fazer a checagem aqui tornaria a página dinâmica
 * e trocaria HTML pronto por uma ida ao Supabase — na página que precisa
 * ser a mais rápida do produto.
 *
 * As 14 seções seguem a ordem do frame `6:2` do Figma. Só quatro delas
 * carregam JavaScript (header, fluxo, abas e dúvidas); o resto é Server
 * Component.
 */

const TITULO = "TAFLOW — Cresça sem perder o fluxo";
const DESCRICAO =
  "Organize demandas, acompanhe sua equipe, aprove trabalhos com clientes e controle contratos, cobranças e resultados em um só lugar.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  // Sem `canonical` e sem `metadataBase`: o domínio definitivo existe
  // (taflow.com.br), mas ele vive em variável de ambiente e apontar
  // errado é pior do que não apontar.
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    siteName: "TAFLOW",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
  },
};

export default function Home() {
  return (
    <div
      className="lp-page bg-[var(--taflow-bg-page)]"
      // A LP é superfície de marca e é sempre clara — ela não segue o
      // tema do app, porque o Figma não tem versão escura dela. Sem
      // isto, a marca do header sairia branca sobre branco para quem
      // deixou o app no escuro.
      style={
        {
          ["--marca-tinta" as string]: "var(--taflow-text-primary)",
          colorScheme: "light",
        } as React.CSSProperties
      }
    >
      {/* Conteúdo que só aparece por animação é conteúdo que some quando
          o script falha. Sem JavaScript, tudo nasce visível. */}
      <noscript>
        <style>{`.lp-reveal{opacity:1!important;transform:none!important}
          .lp-in,.lp-in-line,.lp-in-mock{animation:none!important;opacity:1!important;transform:none!important}
          .lp-flow-line{stroke-dashoffset:0!important}`}</style>
      </noscript>

      <a
        href="#conteudo"
        className="lp-foco sr-only rounded-md bg-[var(--taflow-bg-surface)] px-4 py-2 text-[14px] font-semibold text-[var(--taflow-text-primary)] focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60]"
      >
        Pular para o conteúdo
      </a>

      <LandingHeader />

      <main id="conteudo">
        <HeroSection />
        <AudienceChips />
        <ProblemSection />
        <ConnectedFlow />
        <ProductTabs />
        <BenefitsSection />
        <SegmentsSection />
        <OnboardingSteps />
        <PricingSection />
        <TrustSection />
        <FAQAccordion />
        <FinalCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
