/**
 * Distância no tempo em português, curta o bastante para caber em célula de
 * tabela.
 *
 * Não usa `Intl.RelativeTimeFormat` de propósito: ele produz "há 2 dias" mas
 * também "em 2 dias" para o futuro, e aqui todo valor é passado — data futura
 * significa relógio errado, e é melhor mostrar "agora" do que "em 3 horas",
 * que faria o leitor duvidar da tabela inteira.
 */
export function tempoRelativo(iso: string | null, agora = Date.now()): string {
  if (!iso) return "Nunca";

  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Nunca";

  const segundos = Math.max(0, Math.floor((agora - t) / 1000));

  if (segundos < 60) return "Agora";

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `Há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return "Ontem";
  if (dias < 30) return `Há ${dias} dias`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? "Há 1 mês" : `Há ${meses} meses`;

  const anos = Math.floor(meses / 12);
  return anos === 1 ? "Há 1 ano" : `Há ${anos} anos`;
}
