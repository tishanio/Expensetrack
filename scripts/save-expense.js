/**
 * Test D — Save the OCR'd expense and confirm navigation to /expenses.
 */
(async () => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    /Save Expense/.test(b.textContent.trim())
  );
  if (!btn) return { error: "Save Expense button not found" };
  btn.click();

  // Wait for either navigation to /expenses or an error toast (max 8s).
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (location.pathname === "/expenses") break;
    await new Promise((r) => setTimeout(r, 250));
  }

  return {
    pathname: location.pathname,
    toasts: [...(document.querySelectorAll("#toasts > *") || [])].map((t) =>
      t.textContent.trim()
    ),
  };
})()
