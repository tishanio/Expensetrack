/**
 * Volume bubble verification:
 * 1. Not rendered at rest
 * 2. Appears on pointerdown, shows current %, tracks thumb position
 * 3. Updates % as value changes; hides on pointerup
 * 4. Also toggles on focus/blur (keyboard path)
 */
(async () => {
  const out = {};
  const slider = document.querySelector(".volume-slider");
  if (!slider) return { error: "slider missing" };
  const wrap = slider.closest(".volume-wrap");
  const bubble = () => wrap.querySelector(".volume-bubble");

  const setVal = (v) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, "value"
    ).set;
    setter.call(slider, String(v));
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // 1. At rest → no bubble
  out.bubbleAtRest = !!bubble();

  // 2. Pointer down → bubble appears with text and position
  slider.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  const b1 = bubble();
  out.bubbleOnPointerDown = !!b1;
  out.textAt100 = b1?.textContent.trim();
  out.leftAt100 = b1 ? getComputedStyle(b1).left : null;

  // 3. Drag to 60 → text and position update
  setVal(60);
  await new Promise((r) => setTimeout(r, 50));
  const b2 = bubble();
  out.textAt60 = b2?.textContent.trim();
  out.leftAt60 = b2 ? getComputedStyle(b2).left : null;

  // 4. Pointer up → bubble disappears
  slider.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  out.bubbleAfterPointerUp = !!bubble();

  // 5. Keyboard path: focus shows bubble, blur hides
  slider.focus();
  await new Promise((r) => setTimeout(r, 50));
  out.bubbleOnFocus = !!bubble();
  setVal(25);
  await new Promise((r) => setTimeout(r, 50));
  out.textAt25WhileFocused = bubble()?.textContent.trim();
  slider.blur();
  await new Promise((r) => setTimeout(r, 50));
  out.bubbleAfterBlur = !!bubble();

  // restore
  setVal(100);
  return out;
})()
