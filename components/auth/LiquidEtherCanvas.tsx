"use client";

import { useEffect, useRef } from "react";

/**
 * As correntes do painel institucional, e o rastro do cursor.
 *
 * **Por que escrito à mão e não o LiquidEther do React Bits.** O
 * componente de lá roda sobre three.js, e three.js não está no projeto:
 * entraria uns 150KB comprimidos NA TELA DE LOGIN, que é a página em que
 * o produto tem uma chance de carregar rápido. O que a referência pede
 * aqui cabe em gradientes radiais num canvas 2D, e é o que este arquivo
 * faz. A direção visual é a mesma; a conta de desempenho, não.
 *
 * São duas camadas, e a segunda é a que responde ao mouse:
 *
 * 1. **correntes** — cinco manchas grandes que passeiam sozinhas em
 *    lissajous, com volta completa em ~40 segundos. É o fundo respirando.
 *    Elas também são EMPURRADAS pelo cursor, e forte o bastante para se
 *    ver: até 20% da largura do painel;
 * 2. **rastro** — uma corrente de 18 pontos que persegue o ponteiro, cada
 *    um perseguindo o anterior. É isso que dá a sensação de líquido:
 *    parar o mouse faz a cauda alcançar a cabeça e a poça se juntar;
 *    mover rápido estica o rastro. A cabeça é lime, a cauda é nuvem.
 *
 * Quando o ponteiro sai do painel, `presenca` cai a zero em ~1s e o
 * rastro se apaga — em vez de congelar uma cobra luminosa no canto.
 *
 * Quem protege o texto é a classe `.tf-auth-mask`, aplicada por fora.
 * Ela apaga a atmosfera na coluna da esquerda, onde ficam a marca e a
 * manchete — sem isso o rastro passava por baixo do texto branco e
 * derrubava o contraste dele para 1.27:1, medido. A máscara mora no CSS
 * e não aqui porque precisa valer também para os fragmentos e para o
 * degradê estático, que são camadas de DOM acima deste canvas.
 *
 * Cuidados para não atrapalhar a página mais crítica do produto:
 *
 * - **resolução própria.** Pinta a 50% do tamanho na tela e o navegador
 *   amplia. São manchas desfocadas: ninguém vê a diferença, e a área a
 *   pintar cai a um quarto;
 * - **cada mancha pinta só a própria caixa**, nunca a tela inteira;
 * - **para quando a aba some.** `visibilitychange` cancela o laço;
 * - **cor vem dos tokens.** Lê `--auth-accent` e `--auth-brand-fg` do
 *   próprio elemento, então trocar a paleta em `tokens.css` troca aqui;
 * - **não escuta nada além do próprio painel**, e o canvas é
 *   `pointer-events: none`.
 *
 * Quem decide se este componente sequer é carregado é o `AuthBackground`:
 * movimento reduzido e tela estreita não chegam aqui.
 */

type Corrente = {
  /** Centro em fração do painel (0–1). */
  bx: number;
  by: number;
  /** Amplitude do passeio, em fração do painel. */
  ax: number;
  ay: number;
  /** Velocidade angular. Números pequenos = movimento lento. */
  vx: number;
  vy: number;
  fase: number;
  /** Raio como fração da maior dimensão. */
  raio: number;
  tinta: "acento" | "nuvem";
  alfa: number;
  /** Quanto o cursor empurra esta corrente, em fração do painel. */
  atracao: number;
};

// **As posições de casa puxam para a DIREITA de propósito.** O texto vive
// na coluna esquerda, e a máscara no fim de `pintar` apaga o efeito ali;
// tudo o que uma corrente brilhar por baixo do texto é brilho jogado
// fora. Concentrando-as na metade que sobra — a mesma metade em que o
// efeito aparece na referência —, o painel ganha movimento visível sem
// custar contraste.
const CORRENTES: Corrente[] = [
  { bx: 0.44, by: 0.3, ax: 0.09, ay: 0.07, vx: 0.11, vy: 0.08, fase: 0.0, raio: 0.46, tinta: "acento", alfa: 0.26, atracao: 0.2 },
  { bx: 0.76, by: 0.58, ax: 0.11, ay: 0.08, vx: 0.08, vy: 0.13, fase: 1.7, raio: 0.56, tinta: "nuvem", alfa: 0.17, atracao: -0.15 },
  { bx: 0.62, by: 0.88, ax: 0.12, ay: 0.07, vx: 0.06, vy: 0.09, fase: 3.1, raio: 0.5, tinta: "acento", alfa: 0.18, atracao: 0.17 },
  { bx: 0.32, by: 0.7, ax: 0.08, ay: 0.09, vx: 0.14, vy: 0.06, fase: 4.4, raio: 0.38, tinta: "nuvem", alfa: 0.13, atracao: -0.12 },
  { bx: 0.86, by: 0.18, ax: 0.09, ay: 0.08, vx: 0.09, vy: 0.11, fase: 5.6, raio: 0.34, tinta: "acento", alfa: 0.16, atracao: 0.14 },
];

/** Pontos do rastro. Mais que isto vira borrão; menos, vira bolinha. */
const RASTRO = 18;
/** Quanto cada ponto persegue o anterior por quadro. */
const PERSEGUICAO = 0.32;
/** Pintar a 50% e deixar o navegador ampliar. */
const ESCALA = 0.5;

export default function LiquidEtherCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const painel = canvas?.parentElement;
    if (!canvas || !painel) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return; // Sem contexto 2D, a atmosfera estática já está lá.

    const estilo = getComputedStyle(canvas);
    const tintas = {
      acento: estilo.getPropertyValue("--auth-accent").trim() || "#c7ff38",
      nuvem: estilo.getPropertyValue("--auth-brand-fg").trim() || "#f5f7f2",
    };

    let largura = 0;
    let altura = 0;

    function medir() {
      if (!canvas || !painel) return;
      const r = painel.getBoundingClientRect();
      largura = Math.max(1, Math.round(r.width * ESCALA));
      altura = Math.max(1, Math.round(r.height * ESCALA));
      canvas.width = largura;
      canvas.height = altura;
    }

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(painel);

    // Ponteiro em fração do painel (0–1). Começa no meio para o rastro
    // não nascer no canto quando o mouse entrar pela primeira vez.
    let alvoX = 0.5;
    let alvoY = 0.5;
    /** 0 = ponteiro fora, 1 = dentro. Sobe e desce por rampa. */
    let presenca = 0;
    let dentro = false;
    /** Posição do quadro anterior, para tirar a velocidade. */
    let ultimoX = 0.5;
    let ultimoY = 0.5;
    /** Velocidade suavizada, em frações do painel por quadro. */
    let velocidade = 0;

    const rastro = Array.from({ length: RASTRO }, () => ({ x: 0.5, y: 0.5 }));

    function aoMover(e: PointerEvent) {
      if (!painel) return;
      const r = painel.getBoundingClientRect();
      alvoX = (e.clientX - r.left) / r.width;
      alvoY = (e.clientY - r.top) / r.height;
      dentro = true;
    }

    function aoSair() {
      dentro = false;
    }

    painel.addEventListener("pointermove", aoMover, { passive: true });
    painel.addEventListener("pointerleave", aoSair, { passive: true });
    painel.addEventListener("pointerenter", aoMover, { passive: true });

    let quadro = 0;

    /** Uma mancha radial. Pinta só a própria caixa. */
    function mancha(x: number, y: number, raio: number, cor: string, alfa: number) {
      if (!ctx || alfa <= 0.002 || raio <= 0) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, raio);
      g.addColorStop(0, cor);
      // Gradiente de canvas interpola com alfa pré-multiplicado, então ir
      // para "transparent" não passa pelo preto no meio do caminho.
      g.addColorStop(1, "transparent");
      ctx.globalAlpha = alfa;
      ctx.fillStyle = g;
      ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    }

    function pintar(agora: number) {
      quadro = requestAnimationFrame(pintar);
      if (!ctx) return;

      const t = agora / 1000;
      // Rampa de entrada/saída do ponteiro. Sair é mais lento que entrar:
      // o líquido se acalma, não desliga.
      presenca += ((dentro ? 1 : 0) - presenca) * (dentro ? 0.08 : 0.03);

      // Velocidade do ponteiro, suavizada.
      //
      // **Ela existe por causa de um defeito medido, não por estética.**
      // Com o ponteiro PARADO, os 18 pontos do rastro alcançam a cabeça e
      // se empilham no mesmo lugar; em composição `lighter` os alfas
      // somam, o total encostava em 1.0 e o ponto virava um farol de lime
      // quase opaco. Sobre a headline branca isso derrubou o contraste
      // para 1.27:1 — texto ilegível debaixo do cursor.
      //
      // Amarrando o brilho à velocidade, o empilhamento só acontece
      // quando o rastro está APAGANDO. E o efeito fica mais claramente
      // interativo de quebra: ele responde ao gesto, não à presença.
      const dx = alvoX - ultimoX;
      const dy = alvoY - ultimoY;
      ultimoX = alvoX;
      ultimoY = alvoY;
      velocidade += (Math.hypot(dx, dy) - velocidade) * 0.15;
      // Piso de 0.18 para o rastro parado não sumir por completo; o teto
      // chega com ~0.011 do painel por quadro, um gesto tranquilo.
      const forca = 0.18 + 0.82 * Math.min(1, velocidade * 90);

      // Cabeça do rastro persegue o ponteiro; cada ponto persegue o
      // anterior. É a corrente inteira que dá a sensação de líquido.
      rastro[0].x += (alvoX - rastro[0].x) * PERSEGUICAO;
      rastro[0].y += (alvoY - rastro[0].y) * PERSEGUICAO;
      for (let i = 1; i < rastro.length; i++) {
        rastro[i].x += (rastro[i - 1].x - rastro[i].x) * PERSEGUICAO;
        rastro[i].y += (rastro[i - 1].y - rastro[i].y) * PERSEGUICAO;
      }

      ctx.clearRect(0, 0, largura, altura);
      ctx.globalCompositeOperation = "lighter";
      const maior = Math.max(largura, altura);

      // Deslocamento do ponteiro medido a partir do centro (-1 a 1).
      const empurraX = (alvoX - 0.5) * 2 * presenca;
      const empurraY = (alvoY - 0.5) * 2 * presenca;

      for (const c of CORRENTES) {
        const x =
          (c.bx + c.ax * Math.sin(t * c.vx + c.fase) + empurraX * c.atracao) *
          largura;
        const y =
          (c.by + c.ay * Math.cos(t * c.vy + c.fase) + empurraY * c.atracao) *
          altura;
        mancha(x, y, c.raio * maior, tintas[c.tinta], c.alfa);
      }

      // Da cauda para a cabeça, para a cabeça ficar por cima.
      for (let i = rastro.length - 1; i >= 0; i--) {
        const p = rastro[i];
        // 1 na cabeça, 0 na ponta da cauda.
        const vida = 1 - i / rastro.length;
        // A cabeça é o ponto de contato: menor e mais forte. A cauda
        // abre e desbota, como tinta se dissolvendo.
        const raio = maior * (0.05 + (1 - vida) * 0.13);
        const alfa = presenca * forca * vida * vida * 0.22;
        // Terço da frente em lime — é o toque de assinatura da marca.
        mancha(
          p.x * largura,
          p.y * altura,
          raio,
          vida > 0.66 ? tintas.acento : tintas.nuvem,
          alfa
        );
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    function retomar() {
      if (document.hidden) {
        cancelAnimationFrame(quadro);
        quadro = 0;
      } else if (quadro === 0) {
        quadro = requestAnimationFrame(pintar);
      }
    }

    document.addEventListener("visibilitychange", retomar);
    quadro = requestAnimationFrame(pintar);

    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      document.removeEventListener("visibilitychange", retomar);
      painel.removeEventListener("pointermove", aoMover);
      painel.removeEventListener("pointerleave", aoSair);
      painel.removeEventListener("pointerenter", aoMover);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="tf-auth-mask pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: "var(--auth-ether-opacity)" }}
    />
  );
}
