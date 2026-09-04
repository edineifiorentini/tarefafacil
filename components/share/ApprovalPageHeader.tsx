import { IconShieldCheck } from "@tabler/icons-react";

import { WorkspaceMark } from "@/components/branding/WorkspaceMark";

/**
 * A identidade da página.
 *
 * A logo é a da EMPRESA QUE COMPARTILHOU, não a de quem abre. Quem abre é o
 * cliente; ele não precisa se ver, precisa reconhecer de quem veio o
 * pedido. `WorkspaceMark` já resolve os três casos que importam — logo
 * cadastrada, logo ausente e logo que falhou ao carregar —, cai na marca do
 * TAFLOW quando não há, e tem teste próprio. É a regra 12 do CLAUDE.md.
 *
 * **O texto à direita diz "Link de aprovação", não "Link seguro".** O link
 * é longo e imprevisível, expira e pode ser revogado — isso é bom, e é o
 * que a página faz. Chamá-lo de "seguro" prometeria uma garantia que
 * nenhuma dessas três coisas sustenta: quem tiver o endereço entra, porque
 * é exatamente para isso que ele existe.
 */
export function ApprovalPageHeader({
  orgName,
  orgLogoUrl,
}: {
  orgName: string;
  orgLogoUrl: string | null;
}) {
  return (
    <header className="ap-cabecalho">
      <div className="mx-auto flex w-full max-w-[77.5rem] items-center gap-4 px-5 py-3.5 lg:px-8">
        <WorkspaceMark
          name={orgName}
          logoUrl={orgLogoUrl}
          contexto="casca"
          queda="marca"
        />

        <span
          aria-hidden
          className="h-5 w-px"
          style={{ background: "var(--ap-linha-forte)" }}
        />

        <p className="text-[length:var(--text-small-size)]">
          Área de aprovação
        </p>

        <p className="ap-meta ml-auto flex items-center gap-1.5">
          <IconShieldCheck size={15} stroke={1.75} aria-hidden />
          <span className="hidden sm:inline">Link de aprovação</span>
        </p>
      </div>
    </header>
  );
}
