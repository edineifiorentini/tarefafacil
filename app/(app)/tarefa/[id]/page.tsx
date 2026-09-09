import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";

/**
 * A tarefa em página cheia.
 *
 * **Reusa o MESMO componente do modal**, e não uma cópia. O modal serve
 * consulta rápida e criação; quem passa a tarde dentro de uma demanda
 * merece a tela inteira, sem a caixa no meio. Duas implementações da mesma
 * tela seria a garantia de que uma delas ficaria para trás.
 *
 * Também é o destino honesto de um link direto: quem cola o endereço no
 * navegador cai aqui, com a tarefa aberta de verdade, em vez de num modal
 * flutuando sobre uma lista que ele não pediu.
 *
 * Não busca nada no servidor de propósito: o `TaskDetailPanel` já tem a sua
 * consulta, com cache compartilhado com o resto do app. Buscar aqui também
 * traria a mesma linha duas vezes e faria a página piscar quando a versão
 * do cliente chegasse.
 */
export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-[var(--max-width-read)] px-6 py-8">
      <TaskDetailPanel taskId={id} />
    </div>
  );
}
