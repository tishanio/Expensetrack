/**
 * Test C step 1 — Click "Pick from Gallery" (native chooseFromGallery path).
 */
(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    /Pick from Gallery/.test(b.textContent.trim())
  );
  if (!btn) return { error: "Pick from Gallery button not found" };
  btn.click();
  return { clicked: true };
})()
