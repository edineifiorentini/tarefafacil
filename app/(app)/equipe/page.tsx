import { redirect } from "next/navigation";

/**
 * `/equipe` virou aba de `/relatorios` (§26).
 *
 * O redirecionamento fica porque a rota foi ao ar em 31/ago/2026 e pode ter
 * sido guardada nos favoritos de alguém no mesmo dia. Custa uma linha e
 * evita um 404 em link que já circulou.
 */
export default function EquipeRedirect() {
  redirect("/relatorios");
}
