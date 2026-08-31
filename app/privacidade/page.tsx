import type { Metadata } from "next";
import Link from "next/link";

import { TERMS_VERSION } from "@/lib/auth/terms";

export const metadata: Metadata = {
  title: "Política de privacidade — TAFLOW",
};

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-fg text-[length:var(--text-h3-size)] font-semibold">
        {titulo}
      </h2>
      <div className="text-fg-secondary flex flex-col gap-2 text-[length:var(--text-small-size)]">
        {children}
      </div>
    </section>
  );
}

/**
 * Política de privacidade — RASCUNHO.
 *
 * Separada dos termos porque são documentos diferentes: os termos dizem o
 * que é combinado, este diz o que o sistema faz com os dados. Integrações
 * (hoje só o Google Agenda) pedem as duas URLs em campos distintos.
 *
 * Descreve o que o sistema realmente faz — não o que soa bem. Ao ligar uma
 * integração nova, o trecho dela entra aqui junto com o código, não depois.
 */
export default function PrivacidadePage() {
  return (
    <main className="mx-auto flex w-full max-w-[var(--max-width-read)] flex-col gap-6 px-6 py-12">
      <div className="border-overdue rounded-md border bg-[var(--status-overdue-bg)] p-4">
        <p className="text-[length:var(--text-small-size)] font-semibold text-[var(--status-overdue-fg)]">
          Rascunho — não é texto jurídico definitivo
        </p>
        <p className="mt-1 text-[length:var(--text-caption-size)] text-[var(--status-overdue-fg)]">
          Precisa ser revisto por um advogado antes de o sistema ser oferecido
          comercialmente.
        </p>
      </div>

      <div>
        <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
          Política de privacidade
        </h1>
        <p className="text-fg-muted text-[length:var(--text-small-size)]">
          Versão {TERMS_VERSION}
        </p>
      </div>

      <Secao titulo="1. Quem trata os dados">
        <p>
          O TAFLOW é um sistema de gestão de demandas, clientes,
          negociações, contratos e finanças. Quem administra a plataforma é o
          responsável pelo tratamento dos dados descritos abaixo.
        </p>
      </Secao>

      <Secao titulo="2. Que dados guardamos, e para quê">
        <p>
          <strong>De quem usa o sistema:</strong> nome, e-mail, documento (CPF
          ou CNPJ) e telefone — para identificar a conta e emitir cobrança. A
          senha é guardada de forma cifrada pelo provedor de autenticação; nós
          não temos acesso a ela.
        </p>
        <p>
          <strong>Do trabalho:</strong> o que você cadastra — clientes,
          demandas, contratos, lançamentos e arquivos. Guardamos para operar o
          serviço, e não usamos para outra finalidade.
        </p>
        <p>
          <strong>De uso:</strong> data e hora de ações sensíveis (dinheiro,
          contratos, permissões e exclusões), para que você possa auditar o que
          aconteceu na sua conta.
        </p>
      </Secao>

      <Secao titulo="3. Integração com o Google Agenda">
        <p>
          Se você conectar o Google Agenda, guardamos apenas a autorização de
          acesso e os identificadores dos eventos criados pelo sistema — o
          suficiente para manter a agenda em dia com as suas demandas. A
          sincronização é opcional e ligada demanda a demanda.
        </p>
        <p>
          Você pode desconectar a qualquer momento nas configurações. A
          autorização é apagada e o sistema deixa de escrever na sua agenda.
        </p>
      </Secao>

      <Secao titulo="4. Com quem compartilhamos">
        <p>
          Com os provedores necessários para o serviço funcionar: hospedagem,
          banco de dados, autenticação e, quando você usa a integração de
          agenda, o Google. Não vendemos dados nem os cedemos para publicidade.
        </p>
      </Secao>

      <Secao titulo="5. Por quanto tempo">
        <p>
          Enquanto sua conta existir. Depois do encerramento, os dados são
          apagados, exceto o que a lei obrigue a manter — por exemplo, registros
          fiscais de pagamentos já realizados.
        </p>
      </Secao>

      <Secao titulo="6. Seus direitos">
        <p>
          Você pode pedir acesso, correção, cópia ou exclusão dos seus dados, e
          revogar consentimentos. O pedido é atendido por quem administra a
          plataforma, pelo canal de suporte informado no seu contrato.
        </p>
      </Secao>

      <Secao titulo="7. Segurança">
        <p>
          O acesso aos dados é isolado por empresa no banco de dados, o tráfego
          é cifrado, e as chaves de integração ficam apenas no servidor. Nenhum
          sistema é imune a incidentes; se houver um que afete seus dados, você
          será avisado.
        </p>
      </Secao>

      <Secao titulo="8. Mudanças">
        <p>
          Este texto pode mudar. A versão indicada no topo muda junto, e
          pediremos um novo aceite quando a alteração for relevante. Veja também
          os{" "}
          <Link href="/termos" className="text-fg-link underline">
            termos de uso
          </Link>
          .
        </p>
      </Secao>
    </main>
  );
}
