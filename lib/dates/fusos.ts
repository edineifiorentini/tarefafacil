import { FUSO_PADRAO } from "./day";

/**
 * A lista de fusos que a pessoa escolhe.
 *
 * **Os do Brasil vêm primeiro, e não é preferência estética.** O produto é
 * brasileiro; empurrar quem está em Manaus para caçar "America/Manaus" no
 * meio de quatrocentos nomes é fazer a pessoa desistir e ficar no valor
 * errado. Os demais continuam disponíveis, logo abaixo.
 *
 * Os nomes em português são escritos aqui porque o IANA só dá o
 * identificador (`America/Rio_Branco`), e "Rio Branco" sozinho não diz a
 * ninguém que aquilo é o Acre.
 */
export const FUSOS_DO_BRASIL: { value: string; label: string }[] = [
  { value: "America/Sao_Paulo", label: "Brasília (a maior parte do país)" },
  { value: "America/Manaus", label: "Manaus (Amazonas, Mato Grosso, Roraima)" },
  { value: "America/Rio_Branco", label: "Rio Branco (Acre)" },
  { value: "America/Noronha", label: "Fernando de Noronha" },
  { value: "America/Belem", label: "Belém (Pará, Amapá)" },
  { value: "America/Fortaleza", label: "Fortaleza (Nordeste)" },
  { value: "America/Cuiaba", label: "Cuiabá (Mato Grosso)" },
  { value: "America/Campo_Grande", label: "Campo Grande (Mato Grosso do Sul)" },
  { value: "America/Boa_Vista", label: "Boa Vista (Roraima)" },
  { value: "America/Porto_Velho", label: "Porto Velho (Rondônia)" },
  { value: "America/Recife", label: "Recife (Pernambuco)" },
  { value: "America/Maceio", label: "Maceió (Alagoas, Sergipe)" },
  { value: "America/Bahia", label: "Salvador (Bahia)" },
  { value: "America/Santarem", label: "Santarém (oeste do Pará)" },
  { value: "America/Araguaina", label: "Araguaína (Tocantins)" },
  { value: "America/Eirunepe", label: "Eirunepé (oeste do Amazonas)" },
];

const DO_BRASIL = new Set(FUSOS_DO_BRASIL.map((f) => f.value));

/**
 * O fuso que o aparelho diz, se for um que dá para usar.
 *
 * É SUGESTÃO, nunca decisão: quem salvou uma preferência continua com ela
 * ao abrir num computador emprestado ou num aparelho que voltou de viagem.
 * Devolve `null` quando o navegador não sabe responder — acontece em
 * ambiente antigo e em teste.
 */
export function fusoDoAparelho(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** "UTC-03:00" para o fuso dado, no instante dado. */
export function deslocamentoDe(fuso: string, agora: Date = new Date()): string {
  try {
    const parte = new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      timeZoneName: "longOffset",
    })
      .formatToParts(agora)
      .find((p) => p.type === "timeZoneName");
    // `longOffset` devolve "GMT-03:00"; para quem lê, UTC é o rótulo usual.
    return (parte?.value ?? "").replace("GMT", "UTC") || "UTC";
  } catch {
    return "";
  }
}

/**
 * As opções da lista, com o fuso do aparelho garantido dentro dela.
 *
 * Sem essa garantia, quem estiver num fuso fora da lista do Brasil abriria o
 * seletor e não acharia o próprio — e o campo pareceria quebrado.
 */
export function opcoesDeFuso(
  atual: string,
  doAparelho: string | null
): { value: string; label: string }[] {
  const base = [...FUSOS_DO_BRASIL];
  for (const extra of [atual, doAparelho]) {
    if (extra && !DO_BRASIL.has(extra) && !base.some((o) => o.value === extra)) {
      base.push({ value: extra, label: extra.replace(/_/g, " ") });
    }
  }
  return base;
}

export { FUSO_PADRAO };
