/**
 * Sound verification v2: instruments AudioContext.createGain so ONLY gain
 * params are logged (frequency params share the same prototype). Measures
 * peak gain + envelope duration per effect, and mute behavior.
 */
(async () => {
  const report = { native: null, muted: null, effects: {}, muteTest: {} };

  if (!window.__gainHooked) {
    window.__gainHooked = true;
    window.__gainLog = [];
    const AC = window.AudioContext || window.webkitAudioContext;
    const origCreateGain = AC.prototype.createGain;
    AC.prototype.createGain = function (...args) {
      const node = origCreateGain.apply(this, args);
      const param = node.gain;
      const origSet = param.setValueAtTime.bind(param);
      const origRamp = param.exponentialRampToValueAtTime.bind(param);
      param.setValueAtTime = (v, t) => {
        window.__gainLog.push({ op: "set", v: Number(v), t: Number(t) });
        return origSet(v, t);
      };
      param.exponentialRampToValueAtTime = (v, t) => {
        window.__gainLog.push({ op: "ramp", v: Number(v), t: Number(t) });
        return origRamp(v, t);
      };
      return node;
    };
  }
  window.__gainLog.length = 0;

  const names = ["click", "pop", "success", "error", "boing", "whoosh"];
  for (const n of names) {
    const before = window.__gainLog.length;
    const meta = window.__playSound(n);
    report.native = meta.native;
    report.muted = meta.muted;
    const ops = window.__gainLog.slice(before);
    const peaks = ops.filter((o) => o.v > 0.001).map((o) => o.v);
    const t0 = ops.length ? ops[0].t : 0;
    report.effects[n] = {
      peakGain: peaks.length ? Math.max(...peaks) : 0,
      gainOps: ops.length,
      envDurationMs: ops.length ? Math.round((ops[ops.length - 1].t - t0) * 1000) : 0,
    };
  }

  // Mute test
  const before = window.__gainLog.length;
  localStorage.setItem("expensesnap-sound", "off");
  window.__playSound("pop");
  report.muteTest.scheduledWhileMuted = window.__gainLog.length - before;
  localStorage.setItem("expensesnap-sound", "on");
  window.__playSound("pop");
  report.muteTest.scheduledAfterUnmute = window.__gainLog.length - before;

  // Expected: definition vol × NATIVE_BOOST (emulator is native)
  report.expectedPeak = {
    click: 0.132, pop: 0.242, success: 0.22, error: 0.198, boing: 0.264, whoosh: 0.099,
  };

  return report;
})()
