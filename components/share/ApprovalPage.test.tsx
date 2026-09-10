import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PublicDeliverable, PublicSubtask } from "@/lib/share/publicTask";

import { ApprovalDecisionCard } from "./ApprovalDecisionCard";
import { ApprovalPageHeader } from "./ApprovalPageHeader";
import {
  ApprovalStepsCard,
  ProjectOwnerCard,
  RequestBriefCard,
} from "./ApprovalSidebar";
import { MediaArea } from "./MediaArea";

/**
 * Esta é a única tela do produto que uma pessoa de fora abre, e a única em
 * que ela assina embaixo. Cada caso aqui é uma forma de ela errar:
 * entregar o arquivo antes da hora, prometer um download que não existe,
 * inventar um estado de etapa, ou registrar uma aprovação sem a pessoa
 * confirmar.
 */

const TOKEN = "a".repeat(40);

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc }),
}));

function arquivo(p: Partial<PublicDeliverable>): PublicDeliverable {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    filename: "campanha.png",
    mimeType: "image/png",
    isImage: true,
    tipo: "imagem",
    sizeBytes: 240_000,
    retiradoEm: null,
    versao: 1,
    mensagemAoCliente: null,
    ...p,
  };
}

// ---------------------------------------------------------------- logo
describe("identidade da página", () => {
  it("usa a logo da empresa quando ela existe", () => {
    render(
      <ApprovalPageHeader
        orgName="Prefeitura de Exemplo"
        orgLogoUrl="https://exemplo.test/logo.png"
      />
    );
    const img = screen.getByRole("img", { name: /Prefeitura de Exemplo/ });
    expect(img).toHaveAttribute("src", "https://exemplo.test/logo.png");
  });

  it("sem logo, cai na MARCA DO TAFLOW — não no nome escrito", () => {
    // Regra 12 do CLAUDE.md: a casca mostra a marca do produto. A marca
    // carrega o nome da empresa como título acessível, de propósito — ela
    // está no lugar dele.
    const { container } = render(
      <ApprovalPageHeader orgName="Prefeitura de Exemplo" orgLogoUrl={null} />
    );
    // Nenhuma <img> de logo do cliente…
    expect(container.querySelector("img")).toBeNull();
    // …e sim a marca desenhada.
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("logo que falha ao carregar também cai na marca", async () => {
    const { container } = render(
      <ApprovalPageHeader
        orgName="Prefeitura de Exemplo"
        orgLogoUrl="https://exemplo.test/quebrada.png"
      />
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    // O componente guarda QUAL src falhou e troca pela marca.
    img!.dispatchEvent(new Event("error"));
    expect(await screen.findByText("Área de aprovação")).toBeInTheDocument();
  });

  it('diz "Link de aprovação", e não "Link seguro"', () => {
    // "Seguro" prometeria uma garantia que um link compartilhável não
    // sustenta: quem tiver o endereço entra, que é o objetivo dele.
    render(<ApprovalPageHeader orgName="Empresa" orgLogoUrl={null} />);
    expect(screen.getByText("Link de aprovação")).toBeInTheDocument();
    expect(screen.queryByText(/Link seguro/)).not.toBeInTheDocument();
  });
});

// -------------------------------------------------------------- prévia
describe("prévia do material", () => {
  it("o endereço do arquivo passa SEMPRE pela rota com token", () => {
    // Nenhum endereço de storage no HTML: é a trava da página inteira.
    render(
      <MediaArea token={TOKEN} arquivos={[arquivo({})]} aprovado={false} />
    );
    const img = screen.getByAltText("Prévia de campanha.png");
    expect(img).toHaveAttribute(
      "src",
      `/api/d/${TOKEN}/anexo/11111111-1111-1111-1111-111111111111`
    );
    expect(img.getAttribute("src")).not.toContain("supabase");
    expect(img.getAttribute("src")).not.toContain("storage");
  });

  it("marca d'água enquanto não está aprovado", () => {
    render(
      <MediaArea token={TOKEN} arquivos={[arquivo({})]} aprovado={false} />
    );
    expect(screen.getByText("PRÉVIA · NÃO APROVADO")).toBeInTheDocument();
  });

  it("depois de aprovado a marca d'água sai", () => {
    render(<MediaArea token={TOKEN} arquivos={[arquivo({})]} aprovado />);
    expect(screen.queryByText("PRÉVIA · NÃO APROVADO")).not.toBeInTheDocument();
  });

  it("NÃO existe botão de download antes da aprovação", () => {
    render(
      <MediaArea token={TOKEN} arquivos={[arquivo({})]} aprovado={false} />
    );
    expect(
      screen.queryByRole("button", { name: /baixar|download/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/download será liberado após a aprovação/i)
    ).toBeInTheDocument();
  });

  it("formato sem visualização diz isso, em vez de entregar o original", () => {
    render(
      <MediaArea
        token={TOKEN}
        arquivos={[
          arquivo({
            filename: "pacote.zip",
            mimeType: "application/zip",
            isImage: false,
            tipo: "outro",
          }),
        ]}
        aprovado={false}
      />
    );
    expect(
      screen.getByText("Este formato não possui visualização disponível.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("sem arquivo nenhum, explica em vez de mostrar um quadro vazio", () => {
    render(<MediaArea token={TOKEN} arquivos={[]} aprovado={false} />);
    expect(
      screen.getByText("Este material ainda não possui uma prévia.")
    ).toBeInTheDocument();
  });

  it("zoom só aparece onde faz sentido", () => {
    const { unmount } = render(
      <MediaArea token={TOKEN} arquivos={[arquivo({})]} aprovado={false} />
    );
    expect(
      screen.getByRole("button", { name: "Aumentar zoom" })
    ).toBeInTheDocument();
    unmount();

    render(
      <MediaArea
        token={TOKEN}
        arquivos={[
          arquivo({
            filename: "radio.mp3",
            mimeType: "audio/mpeg",
            isImage: false,
            tipo: "audio",
          }),
        ]}
        aprovado={false}
      />
    );
    expect(
      screen.queryByRole("button", { name: "Aumentar zoom" })
    ).not.toBeInTheDocument();
  });

  it("com vários materiais, troca entre eles por abas", async () => {
    render(
      <MediaArea
        token={TOKEN}
        arquivos={[
          arquivo({ id: "11111111-1111-1111-1111-111111111111" }),
          arquivo({
            id: "22222222-2222-2222-2222-222222222222",
            filename: "radio.mp3",
            mimeType: "audio/mpeg",
            isImage: false,
            tipo: "audio",
          }),
        ]}
        aprovado={false}
      />
    );

    const abas = screen.getByRole("tablist", { name: "Materiais enviados" });
    const segunda = within(abas).getByRole("tab", { name: /radio\.mp3/ });
    expect(segunda).toHaveAttribute("aria-selected", "false");

    await userEvent.click(segunda);
    expect(segunda).toHaveAttribute("aria-selected", "true");
    // A prévia trocou de verdade: saiu a imagem, entrou o player de áudio.
    expect(
      screen.queryByAltText("Prévia de campanha.png")
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Seu navegador não reproduz este áudio.")
    ).toBeInTheDocument();
  });
});

// -------------------------------------------------------------- etapas
describe("etapas da demanda", () => {
  const etapas: PublicSubtask[] = [
    { title: "Campanha Bota Fora", done: true },
    { title: "Campanha Rádio", done: false },
    { title: "Campanha Folder", done: false },
  ];

  it("conta as concluídas e marca o progresso com semântica", () => {
    render(<ApprovalStepsCard etapas={etapas} />);
    expect(screen.getByText("1 de 3 concluídas")).toBeInTheDocument();
    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "1");
    expect(barra).toHaveAttribute("aria-valuemax", "3");
  });

  it("o estado de cada etapa é TEXTO, não só cor ou ícone", () => {
    render(<ApprovalStepsCard etapas={etapas} />);
    expect(screen.getByText("Concluída")).toBeInTheDocument();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
    expect(screen.getByText("A fazer")).toBeInTheDocument();
  });

  it("o visitante não altera etapa: nada aqui é clicável", () => {
    const { container } = render(<ApprovalStepsCard etapas={etapas} />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelectorAll("input")).toHaveLength(0);
  });

  it("sem etapas, o card some em vez de mostrar zero de zero", () => {
    const { container } = render(<ApprovalStepsCard etapas={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// --------------------------------------------------------- responsável
describe("responsável", () => {
  it("sem avatar, cai nas iniciais", () => {
    render(<ProjectOwnerCard nome="Edinei Fiorentini" avatarUrl={null} />);
    expect(screen.getByText("Edinei Fiorentini")).toBeInTheDocument();
    expect(screen.getByText("EF")).toBeInTheDocument();
  });

  it("não inventa cargo", () => {
    // O banco guarda `assignee_id`, não cargo. O único papel que ele
    // sustenta é "responsável pelo projeto" — que aparece duas vezes de
    // propósito: como título do card e como papel da pessoa.
    render(<ProjectOwnerCard nome="Edinei Fiorentini" avatarUrl={null} />);
    expect(screen.getAllByText("Responsável pelo projeto")).toHaveLength(2);
  });
});

describe("briefing", () => {
  it("sem descrição e sem arquivos, o card não existe", () => {
    const { container } = render(
      <RequestBriefCard descricao={null} entregaveis={[]} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("preserva a quebra de linha do texto do cliente", () => {
    // A quebra vinha de `whitespace-pre-wrap`; desde 9/set/2026 a descrição
    // passa pelo renderizador de marcação, que a transforma num `<br>`. O
    // que este caso protege é a QUEBRA continuar existindo — o mecanismo é
    // detalhe, e prender o teste a ele foi o que o fez falhar sem nada ter
    // se quebrado.
    const { container } = render(
      <RequestBriefCard
        descricao={"Primeira linha\nSegunda"}
        entregaveis={[]}
      />
    );
    expect(container.querySelectorAll("br")).toHaveLength(1);
    expect(container.textContent).toContain("Primeira linha");
    expect(container.textContent).toContain("Segunda");
  });

  it("a marcação escrita na descrição chega desenhada ao cliente", () => {
    const { container } = render(
      <RequestBriefCard
        descricao={"## Briefing\n- primeiro\n- segundo"}
        entregaveis={[]}
      />
    );
    expect(container.querySelector("h4")?.textContent).toBe("Briefing");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("HTML digitado na descrição NÃO vira HTML na página do cliente", () => {
    // A fronteira que mais importa: esta página abre sem login.
    const { container } = render(
      <RequestBriefCard
        descricao={"<script>alert(1)</script>"}
        entregaveis={[]}
      />
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });
});

// ------------------------------------------------------- versão e recado
describe("a versão que o cliente está vendo", () => {
  it("no primeiro envio NÃO diz 'versão 1'", () => {
    render(
      <MediaArea
        token={TOKEN}
        arquivos={[arquivo({ versao: 1 })]}
        aprovado={false}
      />
    );
    expect(screen.queryByText(/Versão 1/)).not.toBeInTheDocument();
  });

  it("da segunda em diante diz qual é", () => {
    render(
      <MediaArea
        token={TOKEN}
        arquivos={[arquivo({ versao: 2 })]}
        aprovado={false}
      />
    );
    expect(screen.getByText("Versão 2")).toBeInTheDocument();
  });

  it("mostra o recado que acompanha a peça", () => {
    render(
      <MediaArea
        token={TOKEN}
        arquivos={[
          arquivo({ versao: 2, mensagemAoCliente: "aumentei o logo" }),
        ]}
        aprovado={false}
      />
    );
    expect(screen.getByText("aumentei o logo")).toBeInTheDocument();
  });

  /**
   * O recado é escrito num campo comum por quem produz, e chega aqui como
   * texto. Desenhado como texto, marcação não vira elemento — a mesma
   * garantia que a descrição da demanda já tinha.
   */
  it("recado com HTML aparece como texto, não como elemento", () => {
    const { container } = render(
      <MediaArea
        token={TOKEN}
        arquivos={[
          arquivo({
            versao: 2,
            mensagemAoCliente: "<script>alert(1)</script> pronto",
          }),
        ]}
        aprovado={false}
      />
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });
});

// -------------------------------------------------------------- decisão
describe("decisão do cliente", () => {
  function montar(
    over: Partial<Parameters<typeof ApprovalDecisionCard>[0]> = {}
  ) {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: true, error: null });
    render(
      <ApprovalDecisionCard
        token={TOKEN}
        demanda="Campanha conscientização"
        totalDeMateriais={3}
        versaoId={null}
        ultimaDecisao={null}
        ultimaEm={null}
        {...over}
      />
    );
  }

  it("aprovar PEDE CONFIRMAÇÃO antes de registrar", async () => {
    montar();
    await userEvent.click(
      screen.getByRole("button", { name: /Aprovar esta versão/ })
    );
    // Ainda não gravou nada.
    expect(rpc).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: /Aprovar este material/ })
    ).toBeInTheDocument();
  });

  it("a confirmação diz que a aprovação cobre TODOS os materiais", async () => {
    // A aprovação é da demanda, não do arquivo em foco. Dizer o contrário
    // faria o cliente achar que os outros ficaram de fora.
    montar();
    await userEvent.click(
      screen.getByRole("button", { name: /Aprovar esta versão/ })
    );
    expect(
      screen.getByText(
        /os 3 materiais desta demanda, e não apenas o que está na tela/
      )
    ).toBeInTheDocument();
  });

  it("só grava depois de confirmar, e com a decisão certa", async () => {
    montar();
    await userEvent.click(
      screen.getByRole("button", { name: /Aprovar esta versão/ })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar aprovação/ })
    );
    expect(rpc).toHaveBeenCalledWith("record_task_approval", {
      p_token: TOKEN,
      p_decision: "aprovado",
      p_comment: null,
      p_author: null,
      p_attachment_id: null,
    });
    expect(await screen.findByText("Aprovação registrada")).toBeInTheDocument();
  });

  it("pedir ajustes SEM escrever nada é recusado", async () => {
    montar();
    await userEvent.click(
      screen.getByRole("button", { name: /Pedir ajustes/ })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Enviar pedido de ajustes/ })
    );
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escreva o que precisa mudar."
    );
  });

  it("o pedido de ajustes leva o comentário e o nome", async () => {
    montar();
    await userEvent.type(screen.getByLabelText("Seu nome"), "Maria");
    await userEvent.click(
      screen.getByRole("button", { name: /Pedir ajustes/ })
    );
    await userEvent.type(
      screen.getByLabelText("Quais ajustes são necessários?"),
      "Trocar a cor do fundo"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Enviar pedido de ajustes/ })
    );
    expect(rpc).toHaveBeenCalledWith("record_task_approval", {
      p_token: TOKEN,
      p_decision: "ajuste",
      p_comment: "Trocar a cor do fundo",
      p_author: "Maria",
      p_attachment_id: null,
    });
  });

  /**
   * O ponto todo da 0093: a resposta precisa dizer O QUE foi aprovado. Sem
   * este carimbo, "o cliente aprovou" continuaria apontando para o que
   * estivesse publicado no dia em que alguém fosse conferir.
   */
  it("com uma peça publicada, a resposta carimba a versão", async () => {
    montar({ versaoId: "aaaaaaaa-1111-1111-1111-111111111111" });
    await userEvent.click(
      screen.getByRole("button", { name: /Aprovar esta versão/ })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar aprovação/ })
    );
    expect(rpc).toHaveBeenCalledWith(
      "record_task_approval",
      expect.objectContaining({
        p_attachment_id: "aaaaaaaa-1111-1111-1111-111111111111",
      })
    );
  });

  it("link expirado no meio do caminho vira mensagem, não silêncio", async () => {
    montar();
    rpc.mockResolvedValue({ data: false, error: null });
    await userEvent.click(
      screen.getByRole("button", { name: /Aprovar esta versão/ })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar aprovação/ })
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /link pode ter expirado/
    );
  });

  it("quem já respondeu vê o que respondeu, e pode responder de novo", () => {
    montar({ ultimaDecisao: "ajuste", ultimaEm: "02/09/2026" });
    expect(screen.getByText(/Você já respondeu/)).toBeInTheDocument();
    expect(screen.getByText("pedindo ajustes")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Aprovar esta versão/ })
    ).toBeInTheDocument();
  });

  it("depois de responder, NÃO promete download", async () => {
    // O modelo não versiona anexo, então não há "arquivo da versão
    // aprovada" para liberar. Prometer e não entregar é pior que não
    // prometer.
    montar();
    await userEvent.click(
      screen.getByRole("button", { name: /Aprovar esta versão/ })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar aprovação/ })
    );
    await screen.findByText("Aprovação registrada");
    expect(
      screen.queryByRole("button", { name: /baixar|download/i })
    ).not.toBeInTheDocument();
  });
});

// ------------------------------------------------- arquivo com prazo vencido
describe("material que saiu do servidor por prazo (0086)", () => {
  it("explica o que houve em vez de tentar carregar", () => {
    render(
      <MediaArea
        token={TOKEN}
        arquivos={[arquivo({ retiradoEm: "2026-10-04T03:00:00Z" })]}
        aprovado={false}
      />
    );
    expect(screen.getByText(/saiu do servidor em 04\/10\/2026/)).toBeTruthy();
    expect(screen.getByText(/Peça uma nova cópia/)).toBeTruthy();
    // Nada de player nem de imagem apontando para a rota do anexo.
    expect(document.querySelector("img[src*='/anexo/']")).toBeNull();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("o item continua na lista — sumir faria o cliente achar que nunca houve peça", () => {
    render(
      <MediaArea
        token={TOKEN}
        arquivos={[
          arquivo({
            filename: "radio-v1.mp3",
            retiradoEm: "2026-10-04T03:00:00Z",
          }),
        ]}
        aprovado={false}
      />
    );
    expect(screen.getByText("radio-v1.mp3")).toBeTruthy();
  });
});
