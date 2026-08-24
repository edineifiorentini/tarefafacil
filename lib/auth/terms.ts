/**
 * Versão dos termos de uso.
 *
 * O aceite grava esta string. Quando o texto mudar de verdade, mude a data
 * aqui: sem isso, ninguém consegue responder "o que essa pessoa aceitou?".
 *
 * O índice único em `terms_acceptance (user_id, version)` faz o resto —
 * aceitar duas vezes a mesma versão não cria linha nova.
 */
export const TERMS_VERSION = "2026-08-21";

/** Rótulo curto para a tela. */
export const TERMS_LABEL = "Termos de uso e política de privacidade";
