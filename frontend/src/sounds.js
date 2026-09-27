import rawToast from "react-hot-toast";

/* ── Tiny synth engine (no audio assets) ─────────────────────────── */

let ctx = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function soundEnabled() {
  try {
    return localStorage.getItem("expensesnap-sound") !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem("expensesnap-sound", on ? "on" : "off");
  } catch {
    /* private mode — ignore */
  }
}

function tone({ freq = 440, end = null, type = "sine", dur = 0.12, vol = 0.12, delay = 0, attack = 0.012 }) {
  if (!soundEnabled()) return;
  const audio = ac();
  if (!audio) return;

  const t0 = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (end) osc.frequency.exponentialRampToValueAtTime(end, t0 + dur);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/* ── Named effects — tuned "subtle & soft": pure sine/triangle timbres,
   gentle attack ramps, relaxed timing, no harsh overtones ────────── */

/** Soft tick for chips, tabs, icon buttons. */
export function playClick() {
  tone({ freq: 560, type: "sine", dur: 0.06, vol: 0.06, attack: 0.008 });
}

/** Gentle pop for primary buttons and info toasts. */
export function playPop() {
  tone({ freq: 420, end: 640, type: "sine", dur: 0.11, vol: 0.11, attack: 0.01 });
}

/** Mellow rising arpeggio for saved/created toasts. */
export function playSuccess() {
  tone({ freq: 494, type: "triangle", dur: 0.12, vol: 0.1, attack: 0.012 });
  tone({ freq: 587, type: "triangle", dur: 0.12, vol: 0.1, attack: 0.012, delay: 0.1 });
  tone({ freq: 740, type: "sine", dur: 0.2, vol: 0.1, attack: 0.012, delay: 0.2 });
}

/** Soft descending sigh for errors (no sawtooth buzz). */
export function playError() {
  tone({ freq: 320, end: 200, type: "triangle", dur: 0.24, vol: 0.09, attack: 0.01 });
  tone({ freq: 240, end: 150, type: "sine", dur: 0.3, vol: 0.09, attack: 0.01, delay: 0.2 });
}

/** Slow gentle boing for confirm dialogs / delete actions. */
export function playBoing() {
  tone({ freq: 440, end: 190, type: "sine", dur: 0.34, vol: 0.12, attack: 0.01 });
}

/** Soft rising whoosh for page transitions. */
export function playWhoosh() {
  tone({ freq: 240, end: 460, type: "sine", dur: 0.22, vol: 0.045, attack: 0.02 });
  tone({ freq: 360, end: 690, type: "sine", dur: 0.18, vol: 0.03, attack: 0.02, delay: 0.05 });
}

/* ── Toast proxy: same API as react-hot-toast, but musical ────────── */

export const toast = new Proxy(rawToast, {
  get(target, prop) {
    if (prop === "success") {
      return (...args) => {
        playSuccess();
        return target.success(...args);
      };
    }
    if (prop === "error") {
      return (...args) => {
        playError();
        return target.error(...args);
      };
    }
    if (prop === "custom" || prop === "loading" || typeof prop === "string") {
      const value = target[prop];
      if (typeof value === "function") {
        return (...args) => {
          if (prop === "custom") playPop();
          return value.apply(target, args);
        };
      }
      return value;
    }
    return target[prop];
  },
});
