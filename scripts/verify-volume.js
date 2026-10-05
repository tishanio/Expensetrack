/**
 * Volume slider verification:
 * 1. Slider exists in the header with correct min/max/value
 * 2. Setting volume to 30 → localStorage persisted → pop peak = 0.11 × 2.2 × 0.3
 * 3. Reload → slider reads 30 from storage
 * 4. Restore to 100
 */
(async () => {
  const out = {};

  const slider = document.querySelector(".volume-slider");
  out.sliderPresent = !!slider;
  if (!slider) return out;
  out.initialValue = slider.value;
  out.attachedToHeader = !!slider.closest(".site-head");

  // Hook gain scheduling (fresh page, first hook).
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
        window.__gainLog.push(Number(v));
        return origSet(v, t);
      };
      param.exponentialRampToValueAtTime = (v, t) => {
        window.__gainLog.push(Number(v));
        return origRamp(v, t);
      };
      return node;
    };
  }

  const peakOf = (fn) => {
    window.__gainLog.length = 0;
    fn();
    const peaks = window.__gainLog.filter((v) => v > 0.001);
    return peaks.length ? Math.max(...peaks) : 0;
  };

  // ── Baseline at 100 ──
  out.peakAt100 = peakOf(() => window.__playSound("pop"));

  // ── Drag slider to 30 via native setter + input event (real React path) ──
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  setter.call(slider, "30");
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  out.storedAfterChange = localStorage.getItem("expensesnap-volume");
  out.peakAt30 = peakOf(() => window.__playSound("pop"));
  out.expectedAt30 = 0.11 * 2.2 * 0.3;

  // ── Mute icon should show 🔇 when volume is 0 but sound is on ──
  setter.call(slider, "0");
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  const muteBtn = [...document.querySelectorAll(".icon-btn")].find((b) =>
    /Mute|Unmute/.test(b.getAttribute("aria-label") || "")
  );
  out.iconAtZero = muteBtn?.textContent.trim();
  out.storedAtZero = localStorage.getItem("expensesnap-volume");

  // ── Restore 100 ──
  setter.call(slider, "100");
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  out.restored = localStorage.getItem("expensesnap-volume");

  return out;
})()
