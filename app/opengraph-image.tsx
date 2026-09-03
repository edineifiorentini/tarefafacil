import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * A imagem que aparece quando alguém compartilha taflow.com.br.
 *
 * **Gerada por código, não desenhada à mão.** Um PNG estático precisaria
 * ser reexportado a cada ajuste de frase ou de cor; aqui a arte sai dos
 * mesmos valores da página, e o wordmark vem do ARQUIVO OFICIAL — não de
 * um texto imitando a marca.
 *
 * A versão negativa é o mesmo arquivo com a tinta trocada: grafite vira
 * nuvem, e o acid lime da ligatura "fl" fica como está. É a mesma
 * decisão que o `TaflowMark` toma por token no resto do produto, só que
 * aqui precisa ser feita na string porque o Satori (o motor do
 * `ImageResponse`) não resolve custom property.
 *
 * O Satori aceita um subconjunto do CSS: flexbox sim, grid não, e todo
 * elemento com mais de um filho precisa de `display: flex` explícito.
 * Nada aqui depende de recurso fora dessa lista.
 */

export const alt =
  "TAFLOW — Cresça sem perder o fluxo. Demandas, aprovações, contratos e cobranças em um só lugar.";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRAFITE = "#171717";
const NUVEM = "#f5f7f2";
const LIME = "#c7ff38";

/** O wordmark oficial, em negativo, como data URI. */
const marca = await (async () => {
  const bruto = await readFile(
    join(process.cwd(), "public/marca/TAFLOW-logo-principal.svg"),
    "utf8"
  );
  const negativo = bruto.replaceAll(GRAFITE, NUVEM);
  return `data:image/svg+xml;base64,${Buffer.from(negativo).toString("base64")}`;
})();

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: GRAFITE,
        padding: "64px 72px",
        position: "relative",
      }}
    >
      {/* O halo lime do canto, como no hero da página. */}
      <div
        style={{
          position: "absolute",
          top: -220,
          right: -140,
          width: 680,
          height: 680,
          borderRadius: 999,
          display: "flex",
          background:
            "radial-gradient(circle, rgba(199,255,56,0.28), rgba(199,255,56,0) 70%)",
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element -- o
            ImageResponse renderiza no servidor; não existe otimizador de
            imagem do Next aqui dentro. */}
      <img src={marca} width={300} height={86} alt="" />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Uma linha só, SEM `flexWrap`.
              Com ele o Satori quebra o texto em palavras e cada uma vira
              um item do flex — o resultado eram vãos irregulares no meio
              da frase. Uma linha e um `marginLeft` explícito na virada
              em lime dão o espaçamento certo. */}
        <div style={{ display: "flex", fontSize: 68 }}>
          <span style={{ color: NUVEM, fontWeight: 700, letterSpacing: -2 }}>
            Cresça sem perder o
          </span>
          <span
            style={{
              color: LIME,
              fontWeight: 700,
              letterSpacing: -2,
              marginLeft: 18,
            }}
          >
            fluxo.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 30,
            color: "#8b9890",
            maxWidth: 900,
          }}
        >
          Demandas, aprovações, contratos e cobranças trabalhando no mesmo
          lugar.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderRadius: 999,
            border: `1px solid rgba(199,255,56,0.35)`,
            padding: "10px 22px",
            fontSize: 22,
            color: LIME,
          }}
        >
          7 dias para testar
        </div>
        <div style={{ display: "flex", fontSize: 24, color: NUVEM }}>
          taflow.com.br
        </div>
      </div>
    </div>,
    size
  );
}
