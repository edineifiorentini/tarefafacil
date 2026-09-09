import "server-only";

import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { FUSO_PADRAO } from "@/lib/dates/day";

import {
  CHARGE_TTL_DAYS,
  type Cycle,
  chargeExpiresAt,
  cycleFor,
  decideCharge,
} from "./cycle";
import type { PixCharge } from "./gateway";
import { nomeDoProvedor, resolveProvider } from "./provider";

/**
 * A cobrança pela ótica de QUEM PAGA.
 *
 * O `run.ts` decide e emite para todo mundo, e é rotina de plataforma. Este
 * módulo é o outro lado: uma empresa olhando a própria conta.
 *
 * **A empresa NUNCA cria uma cobrança arbitrária.** Ela pede a do ciclo
 * corrente, e quem decide se existe algo a pagar é `decideCharge` — a mesma
 * função da rotina automática, com as mesmas travas: plano vitalício não
 * gera, plano gratuito não gera, período já cobrado não gera de novo. Se o
 * valor viesse do pedido, bastaria alterar a requisição para pagar um real
 * e ter o mês inteiro.
 *
 * A idempotência real é o índice único `(workspace_id, period_start)` no
 * banco. Clicar duas vezes devolve a mesma cobrança, não duas.
 *
 * **Renovar não é cobrar de novo** (0090). Código Pix vale sete dias; a
 * dívida do mês não vence junto com ele. Quando o código expira, a saída é
 * trocar o código NA MESMA linha — mesmo período, mesmo valor, mesmo índice
 * único — e não emitir uma segunda cobrança do mesmo mês.
 */

export type EstadoDaCobranca =
  | {
      estado: "sem_cobranca";
      motivo: string;
      /**
       * **Existe porque a tela oferecia o botão sempre**, e num plano
       * vitalício o clique respondia — corretamente — "não há cobrança".
       * Botão que a regra recusa é pior que ausência de botão: quem clica
       * aprende que a tela não sabe do que está falando. Encontrado abrindo
       * a tela em 8/set/2026.
       */
      podeGerar: false;
    }
  | {
      estado: "sem_cobranca";
      motivo: string;
      podeGerar: true;
      /**
       * `gerar` cria a cobrança do ciclo; `renovar` troca o código de uma
       * que já existe e venceu. São ações diferentes para quem lê — "gerar
       * cobrança" onde já há uma dívida soa como uma segunda conta —, e é
       * o servidor que sabe qual das duas cabe.
       */
      acao: "gerar" | "renovar";
    }
  | { estado: "manual"; motivo: string }
  | {
      estado: "aberta";
      id: string;
      valorCents: number;
      copiaECola: string | null;
      qrCode: string | null;
      expiraEm: string | null;
      periodo: { inicio: string; fim: string };
    }
  | { estado: "paga"; pagaEm: string | null; acessoAte: string | null };

const AVISO_MANUAL =
  "A cobrança automática ainda não está ligada. Combine o pagamento com quem administra o sistema.";

/**
 * O provedor recusou ou não respondeu.
 *
 * Não diz o que a EFI respondeu, de propósito: o texto dela é para quem
 * opera, e vai para a auditoria. Para quem paga, o que importa é que a
 * falha não foi dele e que tentar de novo é a atitude certa.
 */
const AVISO_PROVEDOR =
  "Não foi possível falar com o provedor de pagamento agora. Tente de novo em alguns minutos.";

type Avaliacao =
  | {
      cobra: true;
      plano: { id: string; name: string };
      ciclo: Cycle;
      valorCents: number;
    }
  | {
      cobra: false;
      motivo: string;
      /** Ciclo corrente. `null` quando nem plano existe para calculá-lo. */
      ciclo: Cycle | null;
      /** O período já tem cobrança, e ela não está aberta e no prazo. */
      jaCobrado: boolean;
    };

/** O prazo já passou? Sem prazo gravado, não passou. */
function venceu(prazo: string | null, agora: Date): boolean {
  return prazo !== null && new Date(prazo).getTime() <= agora.getTime();
}

/**
 * Fatura que existe mas não tem como ser paga.
 *
 * A linha nasce ANTES da ida ao provedor — é o que faz o índice único
 * segurar dois cliques simultâneos. O preço disso é que uma falha do
 * provedor deixa a fatura para trás: `aberta`, sem código, e com o período
 * já contando como cobrado, o que impedia gerar qualquer coisa naquele mês.
 * Aconteceu em produção em 8/set/2026, e foi assim que apareceu.
 *
 * **Fatura de cobrança manual nasce sem código de propósito** — quem manda
 * o Pix é uma pessoa. Por isso a pergunta não é só "tem código", é "tinha
 * um provedor que deveria ter dado um".
 */
function semCodigo(linha: {
  provider: string;
  copia_e_cola: string | null;
}): boolean {
  return linha.provider !== "manual" && !linha.copia_e_cola;
}

/**
 * Esta linha aceita um código novo?
 *
 * `expirada` é o caso óbvio. `aberta` com o prazo no passado é o mesmo caso
 * antes da varredura diária passar — e ela é DIÁRIA enquanto a conta for
 * Hobby (regra 13), então esperar por ela seria deixar alguém até 24h
 * olhando um QR que o banco já recusa. `aberta` sem código nunca teve o que
 * recusar: esperar o prazo de sete dias seria uma semana de nada.
 *
 * `paga` e `cancelada` ficam de fora, e o banco confere isso de novo: a
 * guarda de verdade está na `renovar_cobranca` (0090, 0091).
 */
function renovavel(
  linha: {
    status: string;
    expires_at: string | null;
    provider: string;
    copia_e_cola: string | null;
  },
  agora: Date
): boolean {
  if (linha.status === "expirada") return true;
  if (linha.status !== "aberta") return false;
  return venceu(linha.expires_at, agora) || semCodigo(linha);
}

/**
 * Guarda o motivo real da recusa do provedor onde alguém possa achar.
 *
 * A mensagem da EFI carrega o status e o texto dela — nada de credencial —,
 * e sem este registro a falha vira um 500 de corpo vazio: o cliente não
 * consegue pagar, e ninguém do outro lado fica sabendo. Foi exatamente esse
 * silêncio que escondeu a falha de 8/set/2026.
 */
async function anotarFalhaDoProvedor(params: {
  chargeId: string;
  workspaceId: string;
  modo: ReturnType<typeof resolveProvider>;
  erro: unknown;
}): Promise<void> {
  const motivo =
    params.erro instanceof Error ? params.erro.message : String(params.erro);
  const provedor = nomeDoProvedor(params.modo);

  console.error(
    `[cobrança] o provedor recusou o código Pix (${provedor}): ${motivo}`
  );

  await registrarEventoDePlataforma({
    autor: "sistema",
    acao: "alterou",
    entidade: "subscription_charge",
    entidadeId: params.chargeId,
    resumo: "o provedor não gerou o código Pix",
    detalhes: {
      workspaceId: params.workspaceId,
      provedor,
      motivo,
      // Sem isto, "a credencial está errada" fica sendo palpite: não dá para
      // comparar dois ambientes sem ver a variável, e ver a variável é o que
      // não se deve fazer. Tamanhos e formatos resolvem, e não revelam nada.
      configuracao:
        params.modo.modo === "gateway" ? (params.modo.resumo ?? null) : null,
    },
  });
}

/**
 * O que o ciclo corrente pede — decidido UMA vez, para os dois caminhos.
 *
 * A tela (`estadoAtual`) e o clique (`gerarCobranca`) precisam dar a mesma
 * resposta. Enquanto cada uma tinha a sua própria conta, a tela não
 * consultava o plano e oferecia o que o clique recusava.
 */
async function avaliarCiclo(
  db: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  agora: Date
): Promise<Avaliacao> {
  const nao = (motivo: string): Avaliacao => ({
    cobra: false,
    motivo,
    ciclo: null,
    jaCobrado: false,
  });

  const [{ data: assinatura }, { data: ws }] = await Promise.all([
    db
      .from("subscription")
      .select("plan_id, status, billing_day")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    db.from("workspace").select("plan_id").eq("id", workspaceId).maybeSingle(),
  ]);

  if (!assinatura) return nao("Esta empresa não tem assinatura configurada.");

  // A mesma precedência do `run.ts`: o plano da assinatura vence o do
  // workspace. Duas fontes para a mesma pergunta é como elas divergem.
  const planId = assinatura.plan_id ?? ws?.plan_id;
  if (!planId) return nao("Nenhum plano definido.");

  const { data: plano } = await db
    .from("billing_plan")
    .select("id, name, price_cents, vitalicio")
    .eq("id", planId)
    .maybeSingle();

  if (!plano) return nao("Plano não encontrado.");

  const { data: jaCobradas } = await db
    .from("subscription_charge")
    .select("period_start")
    .eq("workspace_id", workspaceId);

  const decisao = decideCharge({
    // A fatura guarda o NOME copiado, não o código: plano renomeado não
    // reescreve fatura antiga. `planCode` aqui é só rótulo da decisão.
    planCode: plano.id,
    priceCents: plano.price_cents,
    vitalicio: plano.vitalicio,
    status: assinatura.status as "ativa" | "pendente" | "vencida" | "cancelada",
    billingDay: assinatura.billing_day,
    chargedPeriods: (jaCobradas ?? []).map((c) => c.period_start),
    now: agora,
    fuso: FUSO_PADRAO,
  });

  if (decisao.charge) {
    return {
      cobra: true,
      plano: { id: plano.id, name: plano.name },
      ciclo: decisao.cycle,
      valorCents: decisao.amountCents,
    };
  }

  return {
    cobra: false,
    motivo: motivoLegivel(decisao.reason),
    ciclo: cycleFor(agora, assinatura.billing_day, FUSO_PADRAO),
    jaCobrado: decisao.reason === "já cobrado",
  };
}

/** O que a empresa tem em aberto hoje, sem criar nada. */
export async function estadoAtual(
  workspaceId: string,
  agora = new Date()
): Promise<EstadoDaCobranca> {
  const db = createAdminClient();

  const { data: aberta } = await db
    .from("subscription_charge")
    .select(
      "id, amount_cents, copia_e_cola, qr_code, expires_at, period_start, period_end, provider"
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "aberta")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  // **Cobrança aberta com o prazo vencido não é cobrança aberta**, e sem
  // código também não. Quem troca o status é a varredura diária; até ela
  // passar, mostrar o código aqui seria apresentar como válido um Pix que o
  // banco recusa. Os dois casos caem na renovação logo abaixo.
  if (aberta && !venceu(aberta.expires_at, agora) && !semCodigo(aberta)) {
    return {
      estado: "aberta",
      id: aberta.id,
      valorCents: aberta.amount_cents,
      copiaECola: aberta.copia_e_cola,
      qrCode: aberta.qr_code,
      expiraEm: aberta.expires_at,
      periodo: { inicio: aberta.period_start, fim: aberta.period_end },
    };
  }

  const aval = await avaliarCiclo(db, workspaceId, agora);

  if (aval.cobra) {
    return {
      estado: "sem_cobranca",
      motivo: "A cobrança deste período ainda não foi gerada.",
      podeGerar: true,
      acao: "gerar",
    };
  }

  // "Já cobrado" sem nada aberto e no prazo: ou o ciclo está pago, ou o
  // código venceu. São situações opostas para quem lê, e a diferença está na
  // linha DESTE ciclo — não na cobrança mais recente, qualquer que seja.
  //
  // **Olhar a mais recente era um defeito**: quem pagou agosto e chegou em
  // setembro ainda sem fatura via "Pagamento em dia" ao lado de uma data de
  // acesso já vencida, e a conta do mês corrente sumia da tela.
  if (aval.jaCobrado && aval.ciclo) {
    const { data: doCiclo } = await db
      .from("subscription_charge")
      .select("status, paid_at, expires_at, provider, copia_e_cola")
      .eq("workspace_id", workspaceId)
      .eq("period_start", aval.ciclo.start)
      .maybeSingle();

    if (doCiclo?.status === "paga") {
      const { data: ws } = await db
        .from("workspace")
        .select("access_expires_at")
        .eq("id", workspaceId)
        .maybeSingle();

      return {
        estado: "paga",
        pagaEm: doCiclo.paid_at,
        acessoAte: ws?.access_expires_at ?? null,
      };
    }

    if (doCiclo && renovavel(doCiclo, agora)) {
      return {
        estado: "sem_cobranca",
        // Duas histórias diferentes, e quem lê merece a certa: um código
        // que venceu é o passar do tempo; um que nunca chegou a existir é
        // uma falha nossa com o provedor.
        motivo: semCodigo(doCiclo)
          ? "A cobrança deste período ficou sem código Pix. Gere um novo — a conta continua a mesma."
          : "O código Pix deste período venceu. Gere um novo — a conta continua a mesma.",
        podeGerar: true,
        acao: "renovar",
      };
    }

    // Sobra `cancelada`: cancelar é decisão de alguém, e desfazer por um
    // clique do cliente seria passar por cima dela.
    return {
      estado: "sem_cobranca",
      motivo:
        "A cobrança deste período foi cancelada. Fale com quem administra o sistema.",
      podeGerar: false,
    };
  }

  return { estado: "sem_cobranca", motivo: aval.motivo, podeGerar: false };
}

/**
 * Gera, renova ou devolve a cobrança do ciclo corrente.
 *
 * Se já existe uma aberta e no prazo, devolve ELA — sem falar com o
 * provedor. É o que torna o botão seguro de clicar duas vezes.
 */
export async function gerarCobranca(
  workspaceId: string,
  agora = new Date()
): Promise<EstadoDaCobranca> {
  const db = createAdminClient();

  const jaTem = await estadoAtual(workspaceId, agora);
  // Tudo que não seja "dá para gerar" volta como está: é a MESMA frase que a
  // tela já mostrava. O clique não é uma segunda opinião.
  if (jaTem.estado !== "sem_cobranca" || !jaTem.podeGerar) return jaTem;

  if (jaTem.acao === "renovar") {
    return renovarCobranca(db, workspaceId, agora);
  }

  // Avalia de novo em vez de confiar no que a tela leu: entre carregar a
  // página e clicar, o cron pode ter emitido a fatura ou o plano pode ter
  // mudado.
  const aval = await avaliarCiclo(db, workspaceId, agora);
  if (!aval.cobra) {
    return { estado: "sem_cobranca", motivo: aval.motivo, podeGerar: false };
  }

  const modo = resolveProvider();
  if (modo.modo === "manual") {
    // Sem provedor não há QR para mostrar. Dizer isso é melhor que criar
    // uma fatura que a tela não sabe pagar.
    return { estado: "manual", motivo: AVISO_MANUAL };
  }

  // UM prazo só, usado nos dois lados. Pedir à EFI uma expiração diferente
  // da que a fatura registra criaria uma janela em que a tela mostra um QR
  // que o banco já recusa — ou o contrário.
  const expiraEm = chargeExpiresAt(agora);

  // A linha nasce ANTES da ida ao provedor, com o índice único segurando a
  // corrida: dois cliques simultâneos, e o segundo esbarra no índice em vez
  // de criar uma segunda cobrança na EFI.
  const { data: criada, error: erroCriar } = await db
    .from("subscription_charge")
    .insert({
      workspace_id: workspaceId,
      plan_id: aval.plano.id,
      plan_name: aval.plano.name,
      amount_cents: aval.valorCents,
      period_start: aval.ciclo.start,
      period_end: aval.ciclo.end,
      provider: nomeDoProvedor(modo),
      status: "aberta",
      expires_at: expiraEm.toISOString(),
    })
    .select("id")
    .single();

  if (erroCriar) {
    if (erroCriar.code === "23505") {
      // O outro clique ganhou. Devolve o que ele criou.
      return estadoAtual(workspaceId, agora);
    }
    return {
      estado: "sem_cobranca",
      motivo: erroCriar.message,
      podeGerar: false,
    };
  }

  let cobranca: PixCharge;
  try {
    cobranca = await modo.gateway.createPixCharge({
      amountCents: aval.valorCents,
      description: `TAFLOW ${aval.plano.name}`,
      expiresInSeconds: CHARGE_TTL_DAYS * 86_400,
      reference: criada.id,
    });
  } catch (e) {
    // A LINHA FICA. Ela guarda a referência que já foi para o provedor, e é
    // por ela que a tela passa a oferecer um código novo — apagar aqui
    // resolveria o caso comum e perderia o raro em que a cobrança nasceu lá
    // e a resposta se perdeu no caminho.
    await anotarFalhaDoProvedor({
      chargeId: criada.id,
      workspaceId,
      modo,
      erro: e,
    });
    return {
      estado: "sem_cobranca",
      motivo: AVISO_PROVEDOR,
      podeGerar: true,
      acao: "renovar",
    };
  }

  await db
    .from("subscription_charge")
    .update({
      provider_charge_id: cobranca.providerChargeId,
      // O histórico começa aqui (0090). A linha acabou de nascer e só este
      // pedido a conhece, então escrever a lista inteira é seguro — o
      // `array_append` atômico faz falta na renovação, não na criação.
      provider_charge_ids: cobranca.providerChargeId
        ? [cobranca.providerChargeId]
        : [],
      qr_code: cobranca.qrCode || null,
      copia_e_cola: cobranca.copiaECola || null,
    })
    .eq("id", criada.id);

  return {
    estado: "aberta",
    id: criada.id,
    valorCents: aval.valorCents,
    copiaECola: cobranca.copiaECola || null,
    qrCode: cobranca.qrCode || null,
    expiraEm: expiraEm.toISOString(),
    periodo: { inicio: aval.ciclo.start, fim: aval.ciclo.end },
  };
}

/**
 * Código novo para a fatura que venceu. Mesma linha, mesma dívida.
 *
 * **A ida ao provedor vem antes da gravação, e a ordem é escolhida.** Ao
 * contrário: a linha voltaria a `aberta` com o código velho e um prazo
 * novo, e a tela apresentaria como válido um Pix que o banco recusa —
 * exatamente o defeito que esta função existe para consertar. Nesta ordem,
 * uma falha na EFI deixa a fatura como estava e o cliente tenta de novo.
 *
 * O preço dessa escolha é a corrida rara em que a fatura é paga entre a
 * criação do código e a gravação: a `renovar_cobranca` recusa, e o código
 * novo fica órfão na EFI até expirar sozinho. Ninguém o vê — a tela devolve
 * o estado fresco —, e é bem melhor que reabrir uma fatura já quitada.
 */
async function renovarCobranca(
  db: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  agora: Date
): Promise<EstadoDaCobranca> {
  const aval = await avaliarCiclo(db, workspaceId, agora);
  // Mudou entre a tela e o clique — passou a haver o que cobrar do zero, ou
  // o plano sumiu. Uma leitura fresca responde melhor que um palpite.
  if (aval.cobra || !aval.ciclo) return estadoAtual(workspaceId, agora);

  const { data: linha } = await db
    .from("subscription_charge")
    .select(
      "id, amount_cents, plan_name, status, expires_at, period_start, period_end, provider, copia_e_cola"
    )
    .eq("workspace_id", workspaceId)
    .eq("period_start", aval.ciclo.start)
    .maybeSingle();

  if (!linha || !renovavel(linha, agora)) {
    return estadoAtual(workspaceId, agora);
  }

  const modo = resolveProvider();
  if (modo.modo === "manual") {
    return { estado: "manual", motivo: AVISO_MANUAL };
  }

  const expiraEm = chargeExpiresAt(agora);

  // O VALOR vem da linha, não de uma nova decisão de preço: se o plano
  // subiu desde a emissão, a fatura de agosto continua valendo o de agosto.
  let cobranca: PixCharge;
  try {
    cobranca = await modo.gateway.createPixCharge({
      amountCents: linha.amount_cents,
      description: `TAFLOW ${linha.plan_name}`,
      expiresInSeconds: CHARGE_TTL_DAYS * 86_400,
      reference: linha.id,
    });
  } catch (e) {
    // A fatura não foi tocada: continua renovável, e tentar de novo é a
    // resposta certa.
    await anotarFalhaDoProvedor({
      chargeId: linha.id,
      workspaceId,
      modo,
      erro: e,
    });
    return {
      estado: "sem_cobranca",
      motivo: AVISO_PROVEDOR,
      podeGerar: true,
      acao: "renovar",
    };
  }

  const { data: renovou } = await db.rpc("renovar_cobranca", {
    p_charge_id: linha.id,
    p_provider_charge_id: cobranca.providerChargeId,
    p_qr_code: cobranca.qrCode || null,
    p_copia_e_cola: cobranca.copiaECola || null,
    p_expires_at: expiraEm.toISOString(),
  });

  // `null` = o banco recusou: paga, cancelada, ou outro pedido renovou
  // primeiro. Em qualquer um dos três, o que vale é o estado de agora.
  if (renovou !== true) return estadoAtual(workspaceId, agora);

  return {
    estado: "aberta",
    id: linha.id,
    valorCents: linha.amount_cents,
    copiaECola: cobranca.copiaECola || null,
    qrCode: cobranca.qrCode || null,
    expiraEm: expiraEm.toISOString(),
    periodo: { inicio: linha.period_start, fim: linha.period_end },
  };
}

/** O motivo do `decideCharge`, dito para quem paga e não para quem opera. */
function motivoLegivel(razao: string): string {
  switch (razao) {
    case "plano vitalício":
      return "Seu plano é vitalício: não há cobrança.";
    case "plano gratuito":
      return "Seu plano não tem cobrança.";
    case "cancelada":
      return "Sua assinatura está cancelada.";
    case "já cobrado":
      return "O período atual já foi cobrado.";
    default:
      return "Nada a pagar no momento.";
  }
}
