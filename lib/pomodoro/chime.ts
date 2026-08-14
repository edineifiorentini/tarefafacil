// Bipe curto ao trocar de fase (trabalho↔pausa) — sem arquivo de áudio,
// gerado na hora via Web Audio API. Silencioso se o navegador bloquear
// (precisa de interação prévia do usuário na página, que já existe pois
// isto só dispara depois de clicar em "Iniciar pomodoro").
export function playChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    osc.onended = () => void ctx.close();
  } catch {
    // silencioso — som é um extra, não crítico
  }
}
