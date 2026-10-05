/**
 * Test B step 1 — reset to upload step, then click "Take Photo".
 * (After Test A the page sits on the review form; the dropzone is only
 * rendered on the upload step.)
 */
(async () => {
  const reset = [...document.querySelectorAll("button")].find((b) =>
    /Start Over/i.test(b.textContent.trim())
  );
  if (reset) {
    reset.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  const btn = [...document.querySelectorAll("button")].find((b) =>
    /^Take Photo/.test(b.textContent.trim())
  );
  if (!btn) return { error: "Take Photo button not found", step: document.body.innerText.slice(0, 120) };
  btn.click();
  return { clicked: true, isNative: !!window.Capacitor?.isNativePlatform?.() };
})()
