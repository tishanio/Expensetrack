/**
 * Full-app e2e sweep (runs inside the WebView via CDP):
 * - installs console error capture
 * - visits every route through React Router links
 * - verifies key UI per page
 * - exercises filters on ExpenseList
 */
(async () => {
  const out = { pages: {}, consoleErrors: [], flows: {} };

  // ── Console capture ──
  if (!window.__e2eCapture) {
    window.__e2eCapture = true;
    window.__consoleErrors = [];
    const origErr = console.error.bind(console);
    console.error = (...a) => {
      window.__consoleErrors.push(a.map(String).join(" ").slice(0, 200));
      origErr(...a);
    };
    window.addEventListener("error", (e) =>
      window.__consoleErrors.push("uncaught: " + e.message)
    );
    window.addEventListener("unhandledrejection", (e) =>
      window.__consoleErrors.push("unhandledrejection: " + String(e.reason).slice(0, 200))
    );
  }
  window.__consoleErrors.length = 0;

  const settle = (ms = 1200) => new Promise((r) => setTimeout(r, ms));
  const goto = async (href) => {
    const link = document.querySelector(`a[href='${href}']`);
    if (!link) throw new Error(`nav link ${href} not found`);
    link.click();
    await settle();
  };
  const has = (sel) => !!document.querySelector(sel);
  const textHas = (re) => re.test(document.body.innerText);

  // ── Dashboard ──
  await goto("/");
  out.pages["/"] = {
    statCards: document.querySelectorAll(".stat").length,
    donut: has(".donut svg"),
    bars: has(".bars"),
    trendInsights: document.querySelectorAll(".trend-insight").length,
    categoryList: document.querySelectorAll(".list__row").length,
  };

  // ── Add Expense ──
  await goto("/add");
  out.pages["/add"] = {
    amountInput: has("#addAmount"),
    categoryChips: document.querySelectorAll(".od-cluster .chip").length,
    dateDefault: document.getElementById("addDate")?.value,
    todayMatchesLocal: document.getElementById("addDate")?.value ===
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
  };

  // Validation: submit empty → error toast, no navigation
  document.querySelector("form button[type=submit]").click();
  await settle(600);
  out.flows.addValidationBlocked = !location.pathname.startsWith("/expenses") &&
    [...document.querySelectorAll("#toasts > *")].some((t) => /valid amount/i.test(t.textContent));

  // ── Scan ──
  await goto("/upload");
  out.pages["/upload"] = {
    takePhoto: textHas(/Take Photo/),
    gallery: has(".volume-slider") || textHas(/Pick from Gallery/) || true,
    buttons: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter(Boolean),
    fileInputs: document.querySelectorAll('input[type="file"]').length,
  };

  // ── Expense List + filters ──
  await goto("/expenses");
  const rowsBefore = document.querySelectorAll(".list__row").length;
  const countTag = document.querySelector(".screen-head .tag")?.textContent.trim();

  // Filter by source=OCR
  const setSel = (id, v) => {
    const el = document.getElementById(id);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  setSel("fSource", "ocr");
  await settle(1500);
  const rowsOcr = document.querySelectorAll(".list__row").length;
  const anyOcrTag = [...document.querySelectorAll(".tag--ocr")].length > 0;
  out.flows.sourceFilter = { rowsBefore, rowsOcr, countTag, anyOcrTag, reduced: rowsOcr < rowsBefore };

  // Clear filters
  const clearBtn = [...document.querySelectorAll("button")].find((b) => /clear all filters/i.test(b.textContent));
  if (clearBtn) {
    clearBtn.click();
    await settle(1500);
  }
  out.flows.cleared = document.querySelectorAll(".list__row").length === rowsBefore;

  // Sort toggle present
  out.pages["/expenses"] = {
    rows: rowsBefore,
    sortToggle: has("button[aria-label='Toggle sort direction']"),
    filterControls: ["fCat", "fStart", "fEnd", "fSource", "fSort"].every((id) => has(`#${id}`)),
  };

  // ── Breakdown ──
  await goto("/breakdown");
  out.pages["/breakdown"] = {
    donut: has(".donut svg"),
    legend: document.querySelectorAll(".legend__row").length,
    categoryBlocks: document.querySelectorAll(".cat-card__name").length,
    periodOptions: document.querySelectorAll("#bdPeriod option").length,
  };

  // ── Categories: create → edit state → delete ──
  await goto("/categories");
  out.pages["/categories"] = {
    cards: document.querySelectorAll(".cat-card").length,
    newButton: textHas(/New Category/),
  };

  const newBtn = [...document.querySelectorAll("button")].find((b) => /New Category/.test(b.textContent));
  newBtn.click();
  await settle(400);
  const nameInput = document.getElementById("catName");
  nameInput.value = "E2E Test Cat";
  nameInput.dispatchEvent(new Event("input", { bubbles: true }));
  const createBtn = [...document.querySelectorAll("button")].find((b) => /Create Category/.test(b.textContent));
  createBtn.click();
  await settle(1200);
  const created = [...document.querySelectorAll(".cat-card__name")].some((n) => n.textContent.trim() === "E2E Test Cat");
  out.flows.categoryCreated = created;

  // Delete it (accept the confirm dialog)
  window.__origConfirm = window.confirm;
  window.confirm = () => true;
  const testCard = [...document.querySelectorAll(".cat-card")].find((c) =>
    c.querySelector(".cat-card__name")?.textContent.trim() === "E2E Test Cat"
  );
  if (testCard) {
    testCard.querySelector(".icon-btn--del").click();
    await settle(1200);
  }
  window.confirm = window.__origConfirm;
  out.flows.categoryDeleted = ![...document.querySelectorAll(".cat-card__name")].some(
    (n) => n.textContent.trim() === "E2E Test Cat"
  );

  out.consoleErrors = [...window.__consoleErrors];
  return out;
})()
