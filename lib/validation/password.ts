/**
 * Regra de senha do cadastro.
 *
 * O dono pediu letras, números e caracteres especiais. Vai junto um mínimo
 * de dez caracteres, porque **comprimento protege mais que composição**:
 * uma frase de dezesseis letras resiste muito mais que `S3nh@1`. Exigir só
 * a composição empurra todo mundo para a mesma senha curta com um `@` no
 * meio, que é justamente o padrão que os ataques testam primeiro.
 *
 * As mensagens são frases inteiras, não códigos: elas vão para a tela do
 * jeito que estão, e o erro precisa dizer o que fazer.
 */

export const PASSWORD_MIN = 10;

/** O que ainda falta na senha. Lista vazia significa aprovada. */
export function passwordIssues(password: string): string[] {
  const faltas: string[] = [];

  if (password.length < PASSWORD_MIN) {
    faltas.push(`Use pelo menos ${PASSWORD_MIN} caracteres`);
  }
  if (!/\p{L}/u.test(password)) {
    faltas.push("Inclua ao menos uma letra");
  }
  if (!/\d/.test(password)) {
    faltas.push("Inclua ao menos um número");
  }
  // Qualquer coisa que não seja letra, número ou espaço conta como especial
  // — inclusive acentuação de teclado brasileiro como ç e ~.
  if (!/[^\p{L}\d\s]/u.test(password)) {
    faltas.push("Inclua ao menos um caractere especial, como ! ? @ ou #");
  }
  if (/\s/.test(password.trim()) && password.trim().length < 16) {
    // Frase curta com espaço costuma ser "senha 123" — sem ganho nenhum.
    faltas.push("Se usar espaços, escreva uma frase de 16 caracteres ou mais");
  }

  return faltas;
}

export function isPasswordStrong(password: string): boolean {
  return passwordIssues(password).length === 0;
}

/**
 * Força aproximada, só para a barra da tela. Não é medida de segurança.
 *
 * O topo exige doze caracteres além de passar em todas as regras: o mínimo
 * de dez é o que o cadastro aceita, não o que se deveria usar.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  const faltas = passwordIssues(password).length;
  if (faltas > 1) return 1;
  if (faltas === 1) return 2;
  return password.length >= 12 ? 3 : 2;
}
