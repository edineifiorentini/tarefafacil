import {
  IconBrandWhatsapp,
  IconBuildingBank,
  IconCalendar,
  IconCashBanknote,
  IconCreditCard,
  IconMail,
  IconReceipt,
  IconWallet,
} from "@tabler/icons-react";

import type { IconComponent } from "@/components/ui/types";

/**
 * Catálogo de integrações.
 *
 * Fonte única: a tela não sabe nomes de integração, só lê daqui. Quem
 * adiciona um conector novo mexe neste arquivo e no componente da ação —
 * não na página de configurações.
 *
 * `state` é a única coisa que separa o que existe do que é promessa:
 * `disponivel` tem ação de verdade, `em_breve` é cartão inerte. Não há
 * estado intermediário de propósito — meio conectado não é situação, é bug.
 */
export type IntegrationState = "disponivel" | "em_breve";

export type IntegrationId =
  | "google-agenda"
  | "whatsapp"
  | "email-marketing"
  | "mercado-pago"
  | "asaas"
  | "efi"
  | "banco-inter"
  | "sicredi";

export type Integration = {
  id: IntegrationId;
  name: string;
  /** Uma linha dizendo o que ela faz, na voz de quem vai usar. */
  hint: string;
  icon: IconComponent;
  state: IntegrationState;
};

export type IntegrationGroup = {
  id: string;
  title: string;
  hint: string;
  items: readonly Integration[];
};

/**
 * Os bancos (Inter, Sicredi) e a EFI exigem certificado mTLS, conta PJ e
 * liberação pelo gerente da agência. Mercado Pago e Asaas pedem só um
 * token. A ordem abaixo reflete isso: o que é fácil de conectar vem antes.
 */
export const INTEGRATION_GROUPS: readonly IntegrationGroup[] = [
  {
    id: "recebimento",
    title: "Pagamentos e bancos",
    hint: "Receba dos seus clientes por PIX, boleto e cartão, direto na sua conta",
    items: [
      {
        id: "mercado-pago",
        name: "Mercado Pago",
        hint: "PIX, boleto e cartão com um token só",
        icon: IconWallet,
        state: "em_breve",
      },
      {
        id: "asaas",
        name: "Asaas",
        hint: "PIX, boleto, cartão e divisão de pagamento",
        icon: IconReceipt,
        state: "em_breve",
      },
      {
        id: "efi",
        name: "EFI Bank",
        hint: "PIX com certificado, para quem já tem conta lá",
        icon: IconCashBanknote,
        state: "em_breve",
      },
      {
        id: "banco-inter",
        name: "Banco Inter",
        hint: "Boleto com PIX pela API de cobrança",
        icon: IconBuildingBank,
        state: "em_breve",
      },
      {
        id: "sicredi",
        name: "Sicredi",
        hint: "PIX imediato, com vencimento e recorrente",
        icon: IconCreditCard,
        state: "em_breve",
      },
    ],
  },
  {
    id: "agenda",
    title: "Arquivos e agenda",
    hint: "Onde a sua agenda sincroniza",
    items: [
      {
        id: "google-agenda",
        name: "Google Agenda",
        hint: "Sincronize demandas com a sua agenda, uma a uma",
        icon: IconCalendar,
        state: "disponivel",
      },
    ],
  },
  {
    id: "comunicacao",
    title: "Comunicação",
    hint: "Como você fala com clientes e com a equipe",
    items: [
      {
        id: "whatsapp",
        name: "WhatsApp",
        hint: "Avisos de cobrança e de prazo pelo seu número",
        icon: IconBrandWhatsapp,
        state: "em_breve",
      },
      {
        id: "email-marketing",
        name: "E-mail marketing",
        hint: "Campanhas para a sua base de clientes",
        icon: IconMail,
        state: "em_breve",
      },
    ],
  },
];
