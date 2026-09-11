/**
 * Onde uma demanda vai ser publicada — o catálogo.
 *
 * **Aprovado pelo dono em 11/set/2026, a partir de um protótipo.** Os seis
 * mais usados ficam à vista na criação; o resto fica em "Outros", agrupado.
 * Uma demanda pode ter vários destinos, ou nenhum.
 *
 * **Este arquivo é a única lista.** O seletor, a fileira de logos abaixo do
 * nome e a validação leem daqui, e a trava do banco (0098) espelha os ids —
 * `destinos.test.ts` lê a migration e falha se as duas divergirem.
 *
 * **Destino não é formato.** "Instagram" é o lugar; feed, stories ou reels
 * é o formato da peça, e continua em "Tipo de demanda".
 *
 * A ORDEM IMPORTA: é a ordem em que os destinos aparecem na fileira abaixo
 * do nome, não a ordem em que alguém clicou. Duas demandas que vão para os
 * mesmos lugares mostram as mesmas logos no mesmo lugar.
 */

export const DESTINO_IDS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "whatsapp",
  "site",
  "linkedin",
  "x",
  "threads",
  "telegram",
  "email",
  "impresso",
  "radio",
  "tv",
  "midia_exterior",
  "imprensa",
] as const;

export type DestinoId = (typeof DESTINO_IDS)[number];

/**
 * Os destinos que têm logo de marca. O resto — site, e-mail, impresso,
 * rádio, TV, mídia exterior, release — usa ícone neutro.
 */
export const MARCAS_DE_REDE = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "whatsapp",
  "linkedin",
  "x",
  "threads",
  "telegram",
] as const satisfies readonly DestinoId[];

export type MarcaDeRede = (typeof MARCAS_DE_REDE)[number];

export type GrupoDeDestino =
  | "frequente"
  | "Redes sociais"
  | "Mensagens"
  | "Mídia tradicional"
  | "Imprensa";

export type Destino = {
  id: DestinoId;
  nome: string;
  grupo: GrupoDeDestino;
};

export const DESTINOS: readonly Destino[] = [
  { id: "instagram", nome: "Instagram", grupo: "frequente" },
  { id: "facebook", nome: "Facebook", grupo: "frequente" },
  { id: "tiktok", nome: "TikTok", grupo: "frequente" },
  { id: "youtube", nome: "YouTube", grupo: "frequente" },
  { id: "whatsapp", nome: "WhatsApp", grupo: "frequente" },
  { id: "site", nome: "Site", grupo: "frequente" },
  { id: "linkedin", nome: "LinkedIn", grupo: "Redes sociais" },
  { id: "x", nome: "X", grupo: "Redes sociais" },
  { id: "threads", nome: "Threads", grupo: "Redes sociais" },
  { id: "telegram", nome: "Telegram", grupo: "Mensagens" },
  { id: "email", nome: "E-mail", grupo: "Mensagens" },
  { id: "impresso", nome: "Impresso", grupo: "Mídia tradicional" },
  { id: "radio", nome: "Rádio", grupo: "Mídia tradicional" },
  { id: "tv", nome: "TV", grupo: "Mídia tradicional" },
  { id: "midia_exterior", nome: "Mídia exterior", grupo: "Mídia tradicional" },
  { id: "imprensa", nome: "Release para imprensa", grupo: "Imprensa" },
];

export const DESTINOS_POR_ID = Object.fromEntries(
  DESTINOS.map((d) => [d.id, d])
) as Record<DestinoId, Destino>;

export const DESTINOS_FREQUENTES = DESTINOS.filter(
  (d) => d.grupo === "frequente"
);

/** "Outros", na ordem em que os grupos aparecem no catálogo. */
export const GRUPOS_DE_OUTROS: {
  grupo: Exclude<GrupoDeDestino, "frequente">;
  destinos: Destino[];
}[] = [];
for (const d of DESTINOS) {
  if (d.grupo === "frequente") continue;
  const grupo = d.grupo;
  const existente = GRUPOS_DE_OUTROS.find((g) => g.grupo === grupo);
  if (existente) existente.destinos.push(d);
  else GRUPOS_DE_OUTROS.push({ grupo, destinos: [d] });
}

export function ehDestino(valor: string): valor is DestinoId {
  return (DESTINO_IDS as readonly string[]).includes(valor);
}

export function ehMarcaDeRede(id: DestinoId): id is MarcaDeRede {
  return (MARCAS_DE_REDE as readonly string[]).includes(id);
}

/**
 * Normaliza o que vem do banco ou do formulário: só ids conhecidos, sem
 * repetição, na ordem do catálogo.
 *
 * Id desconhecido é descartado em silêncio, e é de propósito: se um dia um
 * destino sair do catálogo, a demanda antiga continua abrindo — só deixa de
 * mostrar a logo que não existe mais. Quebrar a tela por isso seria pior.
 */
export function ordenarDestinos(valores: readonly string[]): DestinoId[] {
  const presentes = new Set(valores);
  return DESTINO_IDS.filter((id) => presentes.has(id));
}
