/**
 * Preparo da foto de perfil, em três passos separáveis.
 *
 * Estava tudo dentro de uma função só. Separou-se quando entrou o
 * recortador: agora o meio — QUAL pedaço da foto vira o avatar — pode vir do
 * recorte central automático ou da escolha da pessoa, e os outros dois
 * passos não mudam.
 *
 * O que continua valendo em qualquer caminho:
 *
 * 1. **Reduz.** A foto sai do celular com 4 MB e aparece na tela como um
 *    círculo de 32px. Subir o original faria toda lista de equipe, todo
 *    comentário e todo card baixarem megabytes para desenhar miniatura.
 * 2. **Quadrado.** O `Avatar` usa `object-cover` num círculo; sem cortar
 *    antes, a imagem viaja inteira só para o navegador jogar as bordas fora.
 * 3. **Descarta os metadados.** Foto de celular carrega EXIF com modelo do
 *    aparelho e, muitas vezes, a coordenada de onde foi tirada. Passar pelo
 *    canvas deixa isso para trás — e evita publicar num bucket público a
 *    localização de alguém junto com o rosto.
 */
export const AVATAR_SIZE = 256;
/** Teto do arquivo de entrada: acima disso o navegador engasga ao decodificar. */
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export type AvatarError =
  "nao_e_imagem" | "grande_demais" | "nao_abriu" | "sem_canvas";

export class PrepareAvatarError extends Error {
  constructor(public readonly kind: AvatarError) {
    super(kind);
  }
}

export const AVATAR_MESSAGES: Record<AvatarError, string> = {
  nao_e_imagem: "Escolha uma imagem (JPG, PNG ou WebP)",
  grande_demais: "Imagem acima de 15 MB",
  nao_abriu: "Não foi possível abrir esta imagem",
  sem_canvas: "Não foi possível processar a imagem neste navegador",
};

/** Área quadrada da imagem ORIGINAL que vira o avatar. */
export type CropBox = { x: number; y: number; size: number };

/** Valida e decodifica. Quem chama fica dono do objeto — ver `releaseImage`. */
export async function readImage(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith("image/")) {
    throw new PrepareAvatarError("nao_e_imagem");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new PrepareAvatarError("grande_demais");
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Revoga só no erro: no sucesso a URL continua viva, porque o
      // recortador precisa exibir a imagem. Quem chama revoga depois.
      URL.revokeObjectURL(url);
      reject(new PrepareAvatarError("nao_abriu"));
    };
    img.src = url;
  });
}

/** Libera a URL temporária. Sem isto, cada foto escolhida fica na memória. */
export function releaseImage(img: HTMLImageElement): void {
  if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
}

/** O maior quadrado centrado que cabe na imagem. */
export function centerSquare(img: HTMLImageElement): CropBox {
  const size = Math.min(img.width, img.height);
  return { x: (img.width - size) / 2, y: (img.height - size) / 2, size };
}

export function isSquare(img: HTMLImageElement): boolean {
  return img.width === img.height;
}

/** Recorta o quadrado indicado e devolve JPEG de 256px. */
export async function cropToBlob(
  img: HTMLImageElement,
  crop: CropBox
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PrepareAvatarError("sem_canvas");

  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.size,
    crop.size,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) throw new PrepareAvatarError("sem_canvas");
  return blob;
}

/**
 * Converte o enquadramento da tela em pixels da imagem original.
 *
 * Mora aqui, e não dentro do recortador, porque é a conta que erra calada:
 * um sinal trocado ou uma divisão pela escala errada não quebra nada — só
 * salva o pedaço errado da foto, e ninguém percebe até olhar o avatar.
 *
 * `offset` é o canto superior esquerdo da imagem em relação à caixa, em
 * pixels de tela (sempre ≤ 0, porque a imagem cobre a caixa inteira).
 */
export function cropFromView(view: {
  imageWidth: number;
  imageHeight: number;
  /** Lado da caixa quadrada de visualização, em pixels de tela. */
  box: number;
  zoom: number;
  offset: { x: number; y: number };
}): CropBox {
  const base = view.box / Math.min(view.imageWidth, view.imageHeight);
  const escala = base * view.zoom;
  return {
    // `-0 / n` dá `-0`, que atravessa comparação e serialização como um
    // valor estranho. Mesmo tratamento que `daysLeft` já precisou.
    x: semZeroNegativo(-view.offset.x / escala),
    y: semZeroNegativo(-view.offset.y / escala),
    size: view.box / escala,
  };
}

function semZeroNegativo(n: number): number {
  return n === 0 ? 0 : n;
}
