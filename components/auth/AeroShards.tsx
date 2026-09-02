import type { CSSProperties } from "react";

/**
 * Aero shards — três placas.
 *
 * O erro que este componente evita é o de sempre com esse efeito: muitos
 * fragmentos pequenos, e a tela vira vidro quebrado. Aqui são TRÊS, todas
 * grandes, quase transparentes, de canto arredondado, com um reflexo
 * interno de um lado só.
 *
 * **Elas flutuam.** Cada uma sobe e desce a própria distância, no próprio
 * ritmo, com uma inclinação que respira 1.2 grau junto. Os três períodos
 * são diferentes de propósito (11s, 14s, 12s): com o mesmo período elas
 * voltariam a se alinhar a cada volta e o conjunto denunciaria que é um
 * laço. Assim, o padrão só se repete depois de muitos minutos.
 *
 * A primeira versão andava 20px em 22 segundos — meio pixel por segundo,
 * que é o mesmo que estar parada. Hoje a placa mais lenta percorre 60px
 * por ciclo e a mais rápida, 96px, com pico de uns 25px/s no meio do
 * balanço.
 *
 * Nenhuma cruza a headline: as posições foram escolhidas para passar pelo
 * topo, pela base e pela margem direita, longe do texto.
 *
 * Server Component, CSS puro. O bloco global de `prefers-reduced-motion`
 * congela tudo isto sem precisar de código aqui.
 */

type Placa = {
  /** Posição e tamanho, em % do painel. */
  caixa: { top: string; left: string; width: string; height: string };
  /** Inclinação de repouso. O respiro oscila em volta dela. */
  inclinacao: string;
  /** Metade do percurso vertical. O ciclo anda o dobro disto. */
  amplitude: string;
  /** Período do sobe-e-desce. */
  duracao: string;
  /** Negativo: entra com o ciclo já em andamento, sem esperar. */
  atraso: string;
};

const PLACAS: Placa[] = [
  {
    caixa: { top: "-8%", left: "48%", width: "42%", height: "34%" },
    inclinacao: "-18deg",
    amplitude: "40px",
    duracao: "11s",
    atraso: "0s",
  },
  {
    // Ela morava em left:-6%, ou seja, inteira dentro da faixa que a
    // máscara apaga: com a presença nova ficaria a única placa invisível.
    // Daqui ela atravessa a fronteira, e some gradualmente para a
    // esquerda — vidro entrando na sombra, que é o que se quer.
    caixa: { top: "58%", left: "22%", width: "46%", height: "40%" },
    inclinacao: "12deg",
    amplitude: "30px",
    duracao: "14s",
    atraso: "-6s",
  },
  {
    caixa: { top: "34%", left: "62%", width: "38%", height: "44%" },
    inclinacao: "-8deg",
    amplitude: "48px",
    duracao: "12s",
    atraso: "-11s",
  },
];

export function AeroShards({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`tf-auth-mask pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {PLACAS.map((placa, i) => (
        <div
          key={i}
          className="absolute rounded-lg"
          style={
            {
              ...placa.caixa,
              // Base de repouso: é o que vale se as animações não rodarem
              // (movimento reduzido). Sem isto a placa ficaria sem
              // inclinação nenhuma nesse caso.
              rotate: placa.inclinacao,
              "--tf-shard-amp": placa.amplitude,
              "--tf-shard-rot": placa.inclinacao,
              // Um gradiente muito suave em diagonal faz a placa parecer
              // ter espessura. O `inset` do box-shadow é a aresta iluminada.
              background:
                "linear-gradient(135deg, var(--auth-shard-fill), transparent 62%)",
              boxShadow: "inset 1px 1px 0 0 var(--auth-shard-edge)",
              // Duas animações, propriedades distintas (`transform` e
              // `rotate`), então elas somam em vez de brigar. A do
              // respiro é mais longa que a do sobe-e-desce para os dois
              // movimentos não baterem no mesmo instante.
              animation: [
                `tf-shard-drift ${placa.duracao} var(--ease-float) ${placa.atraso} infinite alternate`,
                `tf-shard-tilt calc(${placa.duracao} * 1.7) var(--ease-float) ${placa.atraso} infinite alternate`,
              ].join(", "),
              willChange: "transform, rotate",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
