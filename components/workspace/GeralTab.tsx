"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/Skeleton";

/**
 * A aba Geral, renderizada só no navegador.
 *
 * Os dois blocos decidem o que mostrar a partir do PAPEL de quem está
 * olhando, e o papel chega por consulta do cliente. O servidor, que ainda
 * não sabe, renderiza a versão de leitura; o cliente já chega com os dados e
 * monta a versão editável. O React compara e acusa desencontro — e, quando
 * acusa, regenera aquele ramo e perde o estado do formulário junto.
 *
 * Esqueleto não resolve: o problema não é o que se mostra enquanto carrega,
 * é servidor e cliente estarem em pontos diferentes da linha do tempo. Como
 * não há nada de útil para pré-renderizar num formulário atrás de login e
 * de permissão, a resposta é não renderizar no servidor. Mesma decisão da
 * aba Conta.
 */
const OrgProfileForm = dynamic(
  () => import("./OrgProfileForm").then((m) => m.OrgProfileForm),
  { ssr: false, loading: () => <Skeleton variant="block" className="h-96" /> }
);

const BrandPicker = dynamic(
  () => import("@/components/branding/BrandPicker").then((m) => m.BrandPicker),
  { ssr: false, loading: () => <Skeleton variant="block" className="h-24" /> }
);

export function GeralTab() {
  return (
    <>
      <OrgProfileForm />
      <BrandPicker />
    </>
  );
}
