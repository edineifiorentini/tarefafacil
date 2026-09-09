"use client";

/**
 * O QR code da cobrança.
 *
 * Serve para quem está no computador com o celular na mão. No próprio
 * celular ele não serve para nada — ninguém aponta a câmera para a tela que
 * está segurando —, e é por isso que o copia e cola tem o mesmo peso.
 *
 * A imagem vem do provedor como data URI. Fundo branco fixo e margem larga
 * são exigência do formato, não escolha visual: leitor de QR precisa de
 * contraste e de zona de silêncio nas bordas, e no tema escuro um QR sem
 * fundo branco simplesmente não lê.
 */
export function PixQrPanel({ qrCode }: { qrCode: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-fg text-[length:var(--text-small-size)] font-medium">
        Pague pelo QR Code
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element -- data URI vinda
          do provedor; o otimizador do Next não processa e forçá-lo faria a
          imagem passar pelo servidor sem ganho nenhum. */}
      <img
        src={qrCode}
        alt="QR code para pagamento por Pix"
        className="h-44 w-44 rounded-md bg-white p-3"
      />

      <p className="text-fg-muted max-w-[26ch] text-center text-[length:var(--text-caption-size)]">
        Abra o app do seu banco e escolha pagar com Pix.
      </p>
    </div>
  );
}
