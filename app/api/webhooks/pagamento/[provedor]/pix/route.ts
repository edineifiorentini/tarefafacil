/**
 * O mesmo webhook, no caminho que a EFI de fato chama.
 *
 * **A EFI acrescenta `/pix` ao final da URL registrada.** Quem registra
 * `.../webhooks/pagamento/efi` recebe as notificações em
 * `.../webhooks/pagamento/efi/pix` — e a rota de cima devolveria 404 para
 * todas elas, em silêncio, porque um 404 não avisa ninguém.
 *
 * Este arquivo existe para que os dois caminhos funcionem. O handler é
 * reexportado, não copiado: a lógica mora num lugar só, e um conserto lá
 * vale aqui.
 */
export { POST } from "../route";

// Declarado, e não reexportado: o Next lê esta configuração em tempo de
// compilação e precisa dela literal no arquivo da rota.
export const dynamic = "force-dynamic";
