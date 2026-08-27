import {
  IconClock,
  IconCreditCard,
  IconLock,
  IconLockOpen,
  IconPlugConnected,
} from "@tabler/icons-react";

import type { RodapeOperacional } from "@/lib/admin/health";
import { tempoRelativo } from "@/lib/utils/relative-time";

/**
 * Rodapé operacional (especificação 8.8): estado do sistema em texto
 * terciário, sem competir com os dados acima.
 *
 * O item "serviços essenciais" da especificação virou "gateways
 * configurados". Um selo verde de "sistema operacional" que não consulta
 * nada é decoração — este número vem da tabela de provedores e diz algo
 * verificável.
 */
export function SystemHealthStrip({ dados }: { dados: RodapeOperacional }) {
  const itens = [
    {
      icon: IconClock,
      texto: `Último cadastro: ${tempoRelativo(dados.ultimoCadastro).toLowerCase()}`,
    },
    {
      icon: IconCreditCard,
      texto: `Última cobrança: ${tempoRelativo(dados.ultimaCobranca).toLowerCase()}`,
    },
    {
      icon: IconPlugConnected,
      texto:
        dados.gateways === 1
          ? "1 gateway configurado"
          : `${dados.gateways} gateways configurados`,
    },
    {
      icon: dados.cadastrosAbertos ? IconLockOpen : IconLock,
      texto: dados.cadastrosAbertos
        ? "Cadastros abertos"
        : "Cadastros fechados",
    },
  ];

  return (
    <div className="border-line bg-subtle flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border px-4 py-3">
      {itens.map((i) => {
        const Icone = i.icon;
        return (
          <span
            key={i.texto}
            className="text-fg-muted flex items-center gap-2 text-[length:var(--text-caption-size)]"
          >
            <Icone size={15} stroke={1.75} aria-hidden />
            {i.texto}
          </span>
        );
      })}
    </div>
  );
}
