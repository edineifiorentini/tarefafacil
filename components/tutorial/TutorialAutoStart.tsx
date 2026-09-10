"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

import { useTutorial } from "./useTutorial";

/**
 * O guia na primeira entrada — sem bloquear nada.
 *
 * **A diferença entre isto e um tour obrigatório é o fechar.** Decidido pelo
 * dono em 10/set/2026: quem chega vê o guia sem precisar procurar, e quem
 * quer usar o sistema agora fecha e usa. Um tour que trava a tela vira a
 * segunda espera do primeiro acesso — a primeira já é o seletor de cor da
 * marca — e o que se aprende a fazer com ele é dispensá-lo.
 *
 * **Abrir já carimba.** É a mesma decisão de `EscolherMarca` (0084): fechar
 * na hora é uma resposta, e não um adiamento que reaparece amanhã. Quem
 * quiser rever tem o botão ao lado da busca, para sempre.
 *
 * O carimbo é otimista de propósito: se a gravação falhar, o guia abre de
 * novo amanhã — incômodo pequeno e recuperável. O contrário, marcar sem ter
 * mostrado, esconderia o guia de quem nunca o viu.
 */
export function TutorialAutoStart({ jaViu }: { jaViu: boolean }) {
  const { abrirTutorial } = useTutorial();
  // Uma vez por montagem. Sem isto, qualquer re-render que chegasse antes
  // do carimbo reabriria o modal por cima dele mesmo.
  const disparado = useRef(false);

  useEffect(() => {
    if (jaViu || disparado.current) return;
    disparado.current = true;

    abrirTutorial();

    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("app_user")
        .update({ tutorial_visto_em: new Date().toISOString() })
        .eq("id", user.id);
    })();
  }, [jaViu, abrirTutorial]);

  return null;
}
