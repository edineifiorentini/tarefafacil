import {
  IconAd2,
  IconDeviceTv,
  IconMail,
  IconNews,
  IconRadio,
  IconSpeakerphone,
  IconWorldWww,
} from "@tabler/icons-react";

import {
  ehMarcaDeRede,
  type DestinoId,
  type MarcaDeRede,
} from "@/lib/tarefas/destinos";

import { LogoDaRede } from "./LogoDaRede";

/**
 * Destino sem marca não tem logo: site, e-mail, impresso, rádio, TV, mídia
 * exterior e release usam ícone neutro, na cor do texto ao redor.
 *
 * O `Record` abaixo é exaustivo por tipo — acrescentar um destino sem marca
 * ao catálogo sem dar a ele um ícone não compila.
 */
const NEUTROS: Record<Exclude<DestinoId, MarcaDeRede>, typeof IconMail> = {
  site: IconWorldWww,
  email: IconMail,
  impresso: IconNews,
  radio: IconRadio,
  tv: IconDeviceTv,
  midia_exterior: IconAd2,
  imprensa: IconSpeakerphone,
};

export function IconeDoDestino({
  id,
  size = 16,
}: {
  id: DestinoId;
  size?: number;
}) {
  if (ehMarcaDeRede(id)) return <LogoDaRede marca={id} size={size} />;
  const Icone = NEUTROS[id];
  return <Icone size={size} stroke={1.75} aria-hidden className="shrink-0" />;
}
