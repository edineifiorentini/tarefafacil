/**
 * Duração em dias, por extenso quando é zero.
 *
 * "0 dias" na mesma coluna de "—" confunde duas coisas diferentes: uma é
 * "saiu no mesmo dia em que entrou", a outra é "não houve entrega com
 * prazo". Escrever a primeira resolve sem legenda.
 */
export function formatarDias(dias: number): string {
  if (dias === 0) return "no mesmo dia";
  return `${dias.toLocaleString("pt-BR")} ${dias === 1 ? "dia" : "dias"}`;
}
