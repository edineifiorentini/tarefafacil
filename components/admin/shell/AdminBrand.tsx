"use client";

import { useEffect } from "react";

/**
 * Fixa o verde enquanto o painel da plataforma estiver aberto.
 *
 * POR QUE VERDE, se a marca do produto é azul (CLAUDE.md): este painel não é
 * superfície de cliente. Empresa escolhe entre os sete temas; a administração
 * é o produto visto por dentro, e a especificação (4) exige que ela seja
 * visualmente separada do ambiente comum. A cor é o separador mais barato e
 * mais imediato — ninguém confunde as duas telas por engano.
 *
 * POR QUE NUM EFEITO, e não no servidor: menu, diálogo e tooltip do Radix
 * renderizam em portal, presos ao `<body>`. Num `<div data-brand>` mais
 * interno eles ficariam de fora e voltariam à cor do cliente. O atributo
 * precisa estar no `<html>`, e só o layout raiz renderiza o `<html>` — que
 * não sabe qual rota está aberta.
 *
 * O custo é um quadro de tinta na carga direta de /admin. O cookie NÃO é
 * escrito: a preferência da empresa continua intacta, e sair do painel
 * devolve a cor dela.
 */
export function AdminBrand() {
  useEffect(() => {
    const html = document.documentElement;
    const anterior = html.dataset.brand;
    html.dataset.brand = "verde";
    return () => {
      if (anterior) html.dataset.brand = anterior;
      else delete html.dataset.brand;
    };
  }, []);

  return null;
}
