import type { Metadata } from "next";

import { TERMS_VERSION } from "@/lib/auth/terms";

export const metadata: Metadata = {
  title: "Termos de uso — TAFLOW",
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
 * Termos de uso — RASCUNHO.
 *
 * Escrito por quem não é advogado, para a tela não apontar para o vazio
 * enquanto o texto definitivo não existe. O aviso no topo é parte do
 * conteúdo, não decoração: quem lê precisa saber que está lendo rascunho.
 */
export default function TermosPage() {
  return (
    <main className="mx-auto flex w-full max-w-[var(--max-width-read)] flex-col gap-6 px-6 py-12">
      <div className="border-overdue rounded-md border bg-[var(--status-overdue-bg)] p-4">
        <p className="text-[length:var(--text-small-size)] font-semibold text-[var(--status-overdue-fg)]">
          Rascunho — não é texto jurídico definitivo
        </p>
        <p className="mt-1 text-[length:var(--text-caption-size)] text-[var(--status-overdue-fg)]">
          Este texto foi escrito para o cadastro não apontar para uma página
          vazia. Ele precisa ser revisto por um advogado antes de o sistema ser
          oferecido comercialmente.
        </p>
      </div>

      <div>
        <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
          Termos de uso e política de privacidade
        </h1>
        <p className="text-fg-muted text-[length:var(--text-small-size)]">
          Versão {TERMS_VERSION}
        </p>
      </div>

      <Secao titulo="1. O que é o TAFLOW">
        <p>
          O TAFLOW é um sistema de gestão de demandas, clientes,
          negociações, contratos e finanças, oferecido pela internet. Ao criar
          uma conta, você concorda com este documento.
        </p>
      </Secao>

      <Secao titulo="2. Sua conta">
        <p>
          Você é responsável por manter sua senha em segredo e por tudo que
          acontecer na sua conta. Avise imediatamente se suspeitar de acesso
          indevido.
        </p>
        <p>
          Cada conta pertence a uma pessoa. Convide sua equipe em vez de
          compartilhar acesso — o sistema registra quem fez o quê, e senha
          compartilhada apaga essa informação.
        </p>
      </Secao>

      <Secao titulo="3. De quem são os dados">
        <p>
          Os dados que você cadastra — clientes, demandas, contratos,
          lançamentos, arquivos — são seus. Nós os guardamos para operar o
          serviço e não os vendemos nem os usamos para outra finalidade.
        </p>
        <p>
          Você pode pedir uma cópia ou a exclusão dos seus dados a qualquer
          momento. A exclusão é definitiva e apaga também o que sua equipe
          registrou no mesmo espaço de trabalho.
        </p>
      </Secao>

      <Secao titulo="4. Dados pessoais e LGPD">
        <p>
          Guardamos seu nome, e-mail, documento e telefone para identificar sua
          conta e emitir cobrança. Registramos data e hora de ações sensíveis
          (dinheiro, contratos, permissões e exclusões) para que você possa
          auditar o que aconteceu.
        </p>
        <p>
          Se você cadastra dados de terceiros — seus clientes, por exemplo —,
          você é quem responde por ter base legal para isso. Nós tratamos esses
          dados apenas para operar o serviço a seu pedido.
        </p>
      </Secao>

      <Secao titulo="5. Pagamento e cancelamento">
        <p>
          Contas novas começam com um período de teste gratuito. Depois dele, o
          uso depende do plano contratado. Você pode cancelar quando quiser; o
          acesso continua até o fim do período já pago, e não há devolução
          proporcional de período em andamento.
        </p>
      </Secao>

      <Secao titulo="6. Disponibilidade e limites">
        <p>
          Fazemos o possível para manter o serviço no ar, mas ele pode ficar
          indisponível por manutenção, falha de terceiros ou casos fora do nosso
          controle. Não garantimos funcionamento ininterrupto.
        </p>
        <p>
          Nossa responsabilidade, quando houver, fica limitada ao valor que você
          pagou nos últimos doze meses.
        </p>
      </Secao>

      <Secao titulo="7. Uso aceitável">
        <p>
          É proibido usar o sistema para atividade ilegal, para enviar mensagem
          não solicitada em massa, ou para tentar acessar dados de outro
          cliente. Contas nessas situações podem ser suspensas.
        </p>
      </Secao>

      <Secao titulo="8. Mudanças neste texto">
        <p>
          Este documento pode mudar. Quando mudar, a versão indicada no topo
          muda junto e pediremos um novo aceite. O aceite anterior fica
          registrado com a versão e a data.
        </p>
      </Secao>

      <Secao titulo="9. Contato">
        <p>
          Dúvidas sobre estes termos ou sobre seus dados: fale com quem
          administra a plataforma pelo canal de suporte informado no seu
          contrato.
        </p>
      </Secao>
    </main>
  );
}
