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
 *
 * **A Inter vem do repositório, não de pacote nem da rede.** O
 * `@vercel/og` só traz a Geist embutida, e a imagem sairia numa fonte
 * que o resto do produto não usa. São dois arquivos `.woff` do subset
 * latino, 61KB somados, em `assets/fonts` — com a licença SIL OFL ao
 * lado, que é o que a fonte exige de quem a redistribui.
 *
 * `.woff` e não `.woff2`: o Satori lê TTF, OTF e WOFF, e o WOFF2 ele
 * não abre. Ficam fora de `public/` porque são lidos no servidor, na
 * geração da imagem — não servidos ao navegador.
 */

export const alt =
  "TAFLOW — Cresça sem perder o fluxo. Demandas, aprovações, contratos e cobranças em um só lugar.";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRAFITE = "#171717";
const NUVEM = "#f5f7f2";
const LIME = "#c7ff38";

const fonte = (peso: "Regular" | "Bold") =>
  readFile(join(process.cwd(), `assets/fonts/Inter-${peso}.woff`));

const [interRegular, interBold] = await Promise.all([
  fonte("Regular"),
  fonte("Bold"),
]);

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
        fontFamily: "Inter",
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
    {
      ...size,
      fonts: [
        { name: "Inter", data: interRegular, style: "normal", weight: 400 },
        { name: "Inter", data: interBold, style: "normal", weight: 700 },
      ],
    }
  );
}
