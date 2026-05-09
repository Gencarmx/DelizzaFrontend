import { useRef, useCallback, useEffect, useState } from "react";

/**
 * Genera y controla una alarma sonora con Web Audio API para avisar al
 * restaurante de un nuevo pedido. El sonido se produce íntegramente en el
 * navegador — no requiere ningún archivo de audio.
 *
 * Patrón: bip(880Hz·120ms) — bip(880Hz·120ms) — BEEP(1047Hz·280ms) — silencio(800ms)
 * Ciclo total ≈ 1.44 s. Se repite hasta que se llame a stopAlarm().
 *
 * Restricción de autoplay: los navegadores requieren un gesto del usuario antes
 * de permitir audio. Llama a unlockAudio() en el primer touch/click del layout
 * para dejar el AudioContext en estado "running".
 */
export function useOrderAlarm() {
  const ctxRef    = useRef<AudioContext | null>(null);
  const loopRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  /** Debe llamarse en el primer gesto del usuario para desbloquear el AudioContext. */
  const unlockAudio = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }, [getCtx]);

  const scheduleBeep = useCallback(
    (ctx: AudioContext, freq: number, start: number, duration: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle"; // más presencia que sine, menos agresivo que square
      osc.frequency.value = freq;

      // Envelope suave para evitar chasquidos
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.45, start + 0.012);
      gain.gain.setValueAtTime(0.45, start + duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    },
    []
  );

  const playOneCycle = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const t = ctx.currentTime;
    scheduleBeep(ctx, 880,  t,        0.12); // bip
    scheduleBeep(ctx, 880,  t + 0.22, 0.12); // bip
    scheduleBeep(ctx, 1047, t + 0.44, 0.28); // BEEP

    // Programar el siguiente ciclo tras el silencio final
    loopRef.current = setTimeout(() => {
      if (activeRef.current) playOneCycle();
    }, 1440);
  }, [getCtx, scheduleBeep]);

  const startAlarm = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsPlaying(true);
    playOneCycle();
  }, [playOneCycle]);

  const stopAlarm = useCallback(() => {
    activeRef.current = false;
    setIsPlaying(false);
    if (loopRef.current) {
      clearTimeout(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (loopRef.current) clearTimeout(loopRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return { startAlarm, stopAlarm, unlockAudio, isPlaying };
}
