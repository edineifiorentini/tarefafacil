/**
 * A atmosfera que aparece SEMPRE — inclusive antes de qualquer JavaScript.
 *
 * São três manchas radiais em CSS puro, na mesma paleta e nas mesmas
 * posições das correntes animadas. Serve a três papéis de uma vez:
 *
 * 1. **primeira pintura.** O painel institucional já nasce com atmosfera;
 *    o canvas entra depois, por cima, e ninguém vê a troca;
 * 2. **movimento reduzido.** Quem pediu menos animação fica só com isto;
 * 3. **celular, e qualquer falha.** Canvas não inicia em tela pequena, e
 *    se o módulo não carregar a tela continua inteira.
 *
 * É Server Component: zero JavaScript no cliente.
 */
export function StaticAtmosphere({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`tf-auth-mask pointer-events-none absolute inset-0 ${className ?? ""}`}
      style={{
        // Lime aparece em UM ponto e a 8%. Ele é a assinatura, não o fundo
        // — subir isto começaria a comer o contraste da headline.
        backgroundImage: `
          radial-gradient(58% 44% at 22% 26%, rgba(199, 255, 56, 0.08), transparent 70%),
          radial-gradient(70% 52% at 74% 62%, rgba(245, 247, 242, 0.05), transparent 72%),
          radial-gradient(90% 60% at 40% 96%, rgba(199, 255, 56, 0.05), transparent 76%)
        `,
      }}
    />
  );
}
