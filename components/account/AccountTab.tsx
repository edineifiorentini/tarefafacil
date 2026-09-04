"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/Skeleton";

/**
 * A aba Conta, renderizada só no navegador.
 *
 * Os dois cartões dependem de quem está logado — e o `getUser()` do Supabase
 * responde da sessão local quase instantaneamente. O servidor, que não tem
 * essa sessão, renderiza o estado de carregamento; o cliente já chega com os
 * dados e monta o cartão. O React compara os dois e acusa desencontro de
 * hidratação.
 *
 * Esqueleto não resolve, porque o problema não é o que se mostra enquanto
 * carrega: é o servidor e o cliente estarem em pontos diferentes da mesma
 * linha do tempo. Como não há nada de útil para pré-renderizar aqui — é a
 * conta pessoal, atrás de login —, a resposta é não renderizar no servidor.
 *
 * O `loading` abaixo é o que aparece no HTML inicial, e casa com a altura
 * dos cartões para a aba não pular quando eles entram.
 */
const AvatarCard = dynamic(
  () => import("./AvatarCard").then((m) => m.AvatarCard),
  { ssr: false, loading: () => <Skeleton variant="block" className="h-40" /> }
);

const PasswordCard = dynamic(
  () => import("./PasswordCard").then((m) => m.PasswordCard),
  { ssr: false, loading: () => <Skeleton variant="block" className="h-48" /> }
);

// Mesmo tratamento dos outros dois: depende de quem está logado, e o
// servidor não tem a sessão para pré-renderizar igual.
const TimezoneCard = dynamic(
  () => import("./TimezoneCard").then((m) => m.TimezoneCard),
  { ssr: false, loading: () => <Skeleton variant="block" className="h-56" /> }
);

export function AccountTab() {
  return (
    <>
      <AvatarCard />
      <TimezoneCard />
      <PasswordCard />
    </>
  );
}
