"use client";

import { MemberActions } from "./MemberActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { StatusChip } from "@/components/ui/StatusChip";
import { PAPEL_LABEL } from "@/lib/admin/members";
import type { EmpresaDetalhe } from "@/lib/admin/company";
import { formatCentsBRL } from "@/lib/finance/money";
import { tempoRelativo } from "@/lib/utils/relative-time";

/**
 * Abas do detalhe da empresa (especificação 9.6).
 *
 * Cinco abas com dado real. As duas que a especificação pede e não estão:
 * "Uso e limites" virou um bloco da visão geral (três números não sustentam
 * uma aba), e "Segurança" — sessões ativas, dispositivos, forçar logout —
 * depende de uma tabela de sessões que não existe.
 */

function data(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const TOM_DA_COBRANCA: Record<string, string> = {
  paga: "var(--positive)",
  aberta: "var(--status-due-soon-fg)",
  expirada: "var(--negative)",
  cancelada: "var(--text-muted)",
};

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-fg-muted text-[length:var(--text-caption-size)]">
        {rotulo}
      </dt>
      <dd className="text-fg text-[length:var(--text-small-size)] break-words">
        {valor}
      </dd>
    </div>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-line bg-card rounded-md border p-[var(--space-card-pad)]">
      <h3 className="text-fg mb-3 text-[length:var(--text-h3-size)] font-semibold">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function CompanyTabs({ empresa }: { empresa: EmpresaDetalhe }) {
  // Contado uma vez e passado para cada linha: é o que decide se remover ou
  // rebaixar deixaria a empresa sem dono.
  const donos = empresa.membros.filter((m) => m.papel === "owner").length;

  return (
    <Tabs defaultValue="geral">
      <TabsList>
        <TabsTrigger value="geral">Visão geral</TabsTrigger>
        <TabsTrigger value="membros">Membros</TabsTrigger>
        <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
        <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>
        <TabsTrigger value="notas">Observações</TabsTrigger>
      </TabsList>

      <TabsContent value="geral">
        <div className="grid gap-4 lg:grid-cols-2">
          <Bloco titulo="Cadastro">
            <dl className="grid grid-cols-2 gap-3">
              <Campo rotulo="Criada em" valor={data(empresa.criadaEm)} />
              <Campo
                rotulo="Responsável"
                valor={empresa.dono?.email ?? "Sem dono atribuído"}
              />
              <Campo
                rotulo="E-mail de cobrança"
                valor={empresa.contatoEmail ?? "—"}
              />
              <Campo rotulo="Telefone" valor={empresa.contatoTelefone ?? "—"} />
              <Campo rotulo="Origem" valor={empresa.origem ?? "Direto"} />
              <Campo
                rotulo="Último acesso"
                valor={tempoRelativo(empresa.ultimoAcesso)}
              />
            </dl>
          </Bloco>

          <Bloco titulo="Uso e limites">
            <dl className="grid grid-cols-2 gap-3">
              <Campo
                rotulo="Assentos"
                valor={`${empresa.membros.filter((m) => m.situacao === "active").length} de ${empresa.seatLimit}`}
              />
              <Campo rotulo="Demandas" valor={String(empresa.uso.demandas)} />
              <Campo rotulo="Setores" valor={String(empresa.uso.setores)} />
              <Campo rotulo="Projetos" valor={String(empresa.uso.projetos)} />
              <Campo
                rotulo="Última atividade"
                valor={tempoRelativo(empresa.ultimaAtividade)}
              />
              <Campo rotulo="Acesso até" valor={data(empresa.acessoAte)} />
            </dl>
          </Bloco>
        </div>
      </TabsContent>

      <TabsContent value="membros">
        <div className="border-line bg-card overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse">
              <caption className="sr-only">Membros da empresa</caption>
              <thead>
                <tr className="border-line border-b">
                  {[
                    "Nome",
                    "E-mail",
                    "Papel",
                    "Convite",
                    "Autenticação",
                    "Acesso",
                    "Último acesso",
                    "",
                  ].map((h, i) => (
                    <th
                      key={h || `acoes-${i}`}
                      scope="col"
                      className="text-fg-muted px-4 py-2.5 text-left text-[length:var(--text-caption-size)] font-medium"
                    >
                      {h || <span className="sr-only">Ações</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empresa.membros.map((m) => (
                  <tr
                    key={m.userId}
                    className="border-line border-b last:border-0"
                  >
                    <td className="text-fg px-4 py-3 text-[length:var(--text-small-size)]">
                      {m.nome ?? "—"}
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {m.email}
                      {m.emailVerificado ? null : (
                        <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                          e-mail não verificado
                        </span>
                      )}
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {PAPEL_LABEL[m.papel] ?? m.papel}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip
                        label={m.situacao === "active" ? "Aceito" : "Pendente"}
                        tone={
                          m.situacao === "active"
                            ? "var(--positive)"
                            : "var(--status-due-soon-fg)"
                        }
                      />
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {m.autenticacao}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip
                        label={m.bloqueado ? "Bloqueado" : "Liberado"}
                        tone={
                          m.bloqueado ? "var(--negative)" : "var(--positive)"
                        }
                      />
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {tempoRelativo(m.ultimoAcesso)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MemberActions
                        empresaId={empresa.id}
                        empresaNome={empresa.nome}
                        membro={m}
                        totalDeDonos={donos}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="assinatura">
        <Bloco titulo="Assinatura">
          {empresa.assinatura ? (
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Campo rotulo="Situação" valor={empresa.assinatura.status} />
              <Campo rotulo="Plano" valor={empresa.planoNome ?? "—"} />
              <Campo
                rotulo="Valor mensal"
                valor={
                  empresa.planoPrecoCents !== null
                    ? formatCentsBRL(empresa.planoPrecoCents)
                    : "—"
                }
              />
              <Campo
                rotulo="Dia de cobrança"
                valor={String(empresa.assinatura.diaDeCobranca)}
              />
              <Campo rotulo="Provedor" valor={empresa.assinatura.provedor} />
              <Campo
                rotulo="Em teste"
                valor={empresa.emTeste ? "Sim" : "Não"}
              />
              <Campo rotulo="Fim do teste" valor={data(empresa.fimDoTeste)} />
              <Campo rotulo="Acesso até" valor={data(empresa.acessoAte)} />
            </dl>
          ) : (
            <p className="text-fg-secondary text-[length:var(--text-small-size)]">
              Sem assinatura configurada. A empresa usa o sistema pelo acesso
              concedido manualmente, sem cobrança recorrente.
            </p>
          )}
        </Bloco>
      </TabsContent>

      <TabsContent value="cobrancas">
        {empresa.cobrancas.length === 0 ? (
          <Bloco titulo="Cobranças">
            <p className="text-fg-secondary text-[length:var(--text-small-size)]">
              Nenhuma cobrança emitida para esta empresa.
            </p>
          </Bloco>
        ) : (
          <div className="border-line bg-card overflow-hidden rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse">
                <caption className="sr-only">
                  Cobranças da empresa, da mais recente à mais antiga
                </caption>
                <thead>
                  <tr className="border-line border-b">
                    {[
                      "Período",
                      "Plano",
                      "Valor",
                      "Situação",
                      "Pago em",
                      "Provedor",
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="text-fg-muted px-4 py-2.5 text-left text-[length:var(--text-caption-size)] font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empresa.cobrancas.map((c) => (
                    <tr
                      key={c.id}
                      className="border-line border-b last:border-0"
                    >
                      <td className="tnum text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)] whitespace-nowrap">
                        {data(c.periodoInicio)} — {data(c.periodoFim)}
                      </td>
                      <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                        {c.planoNome}
                      </td>
                      <td className="tnum text-fg px-4 py-3 text-[length:var(--text-small-size)]">
                        {formatCentsBRL(c.pagoCents ?? c.valorCents)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip
                          label={c.situacao}
                          tone={
                            TOM_DA_COBRANCA[c.situacao] ?? "var(--text-muted)"
                          }
                        />
                      </td>
                      <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                        {data(c.pagoEm)}
                      </td>
                      <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                        {c.provedor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="notas">
        <Bloco titulo="Observações internas">
          {empresa.notas.length === 0 ? (
            <p className="text-fg-secondary text-[length:var(--text-small-size)]">
              Nenhuma observação. Use Ações → Registrar observação para anotar
              algo que a plataforma precise lembrar. O cliente nunca vê.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {empresa.notas.map((n) => (
                <li
                  key={n.id}
                  className="border-line flex flex-col gap-1 border-l-2 pl-3"
                >
                  <p className="text-fg text-[length:var(--text-small-size)] whitespace-pre-wrap">
                    {n.corpo}
                  </p>
                  <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                    {n.autor} · {tempoRelativo(n.quando).toLowerCase()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </TabsContent>
    </Tabs>
  );
}
