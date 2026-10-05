/**
 * Test A — File pick path.
 * Injects the test receipt into the Scan page's file input (the non-capture
 * one), wraps fetch to time the /ocr/ call, and dispatches a change event so
 * the page runs its own ingest() → compress → upload → OCR flow.
 */
(async () => {
  const b64 = "__B64_PLACEHOLDER__";
  const res = await fetch(`data:image/jpeg;base64,${b64}`);
  const blob = await res.blob();
  const file = new File([blob], "receipt_test.jpg", { type: "image/jpeg" });

  // Instrument fetch to time the OCR request.
  if (!window.__ocrTimings) {
    window.__ocrTimings = [];
    const orig = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      const t0 = performance.now();
      const r = await orig(...args);
      if (url.includes("/ocr/")) {
        window.__ocrTimings.push({
          url,
          ms: Math.round(performance.now() - t0),
          status: r.status,
        });
      }
      return r;
    };
  }

  // The non-capture file input (index 0) — same target as "Choose File".
  const inputs = [...document.querySelectorAll('input[type="file"]')];
  const input = inputs.find((i) => !i.hasAttribute("capture"));
  if (!input) return { error: "no file input found" };

  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));

  // Wait for the OCR result to render (poll, max ~20s).
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const el = [...document.querySelectorAll("h3")].find((h) =>
      /Extracted Details/i.test(h.textContent)
    );
    if (el) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  // Read back what the app rendered.
  const val = (id) => document.getElementById(id)?.value ?? null;
  const toast = [...document.querySelectorAll("#toasts > *")].map((t) => t.textContent.trim());
  const rawVisible = document.querySelector("pre.raw")?.textContent ?? null;

  return {
    ocrTimings: window.__ocrTimings,
    extracted: {
      amount: val("scanAmount"),
      description: val("scanDesc"),
      date: val("scanDate"),
    },
    confidenceTag: document.querySelector(".od-row .tag")?.textContent?.trim() ?? null,
    rawText: rawVisible ? rawVisible.slice(0, 200) : null,
    toasts: toast,
  };
})()
