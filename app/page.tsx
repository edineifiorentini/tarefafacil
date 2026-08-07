import { redirect } from "next/navigation";

// A raiz leva para a área do app; o proxy trata quem não está logado.
export default function Home() {
  redirect("/hoje");
}
