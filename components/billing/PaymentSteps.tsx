"use client";

/**
 * As três etapas do pagamento.
 *
 * Existem porque Pix por copia e cola tem um passo que ninguém adivinha: o
 * código não é digitado num campo de valor, é colado numa opção específica
 * do app do banco. Quem nunca fez procura no lugar errado e desiste.
 *
 * Lista ordenada de verdade — o número não é decoração, é a ordem, e leitor
 * de tela precisa da mesma informação que o olho recebe.
 */
const ETAPAS = [
  "Copie o código ou escaneie o QR Code",
  "Confirme o pagamento no app do banco",
  "Aguarde a confirmação automática",
];

export function PaymentSteps() {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
      {ETAPAS.map((texto, i) => (
        <li key={texto} className="flex flex-1 items-center gap-2">
          <span
            aria-hidden
            className="border-line text-fg-secondary flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[length:var(--text-caption-size)] font-medium"
          >
            {i + 1}
          </span>
          <span className="text-fg-secondary text-[length:var(--text-caption-size)]">
            {texto}
          </span>
        </li>
      ))}
    </ol>
  );
}
