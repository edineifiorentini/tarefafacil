// Notificação nativa do navegador quando um ciclo de pomodoro termina —
// funciona mesmo com a aba em segundo plano ou minimizada (diferente do
// toast, que só aparece se a pessoa estiver olhando pro site).
export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

// Chamar a partir de um clique do usuário (ex.: "Iniciar pomodoro") — a
// maioria dos navegadores só concede a permissão em resposta a um gesto.
export async function requestNotifyPermission(): Promise<void> {
  if (!canNotify() || Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // usuário pode ter bloqueado no SO; segue sem notificação nativa
  }
}

export function notifyPhaseComplete(title: string, body: string) {
  if (!canNotify() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico", tag: "tf-pomodoro" });
  } catch {
    // alguns navegadores exigem contexto extra (ex.: Service Worker) —
    // falha silenciosa, o toast + bipe dentro do site já cobrem o alerta
  }
}
