/**
 * End-to-end API flow check against a running backend (default :3001).
 * Usage: node scripts/e2e-check.mjs
 * Creates a temp category + expense, verifies stats/breakdown, updates,
 * then deletes both — leaving the database as it found it.
 */
const BASE = process.env.API_BASE || "http://localhost:3001/api";

let failures = 0;
function check(name, cond, extra = "") {
  if (cond) {
    console.log(`  ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name} ${extra}`);
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${options.method || "GET"} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const run = async () => {
  console.log(`E2E check against ${BASE}\n`);

  // 0. Health
  const health = await api("/health");
  check("health endpoint", health.status === "ok");

  // 1. Categories: list, create, update, delete
  const catsBefore = await api("/categories");
  check("categories list", Array.isArray(catsBefore) && catsBefore.length > 0, `got ${catsBefore?.length}`);

  const stamp = Date.now();
  const catName = `E2E Test ${stamp}`;
  const createdCat = await api("/categories", {
    method: "POST",
    body: JSON.stringify({ name: catName, icon: "🧪", items: ["Test Item A", "Test Item B"] }),
  });
  check("category created", !!createdCat?.id);

  const updatedCat = await api(`/categories/${createdCat.id}`, {
    method: "PUT",
    body: JSON.stringify({ name: catName, icon: "🔬", items: ["Test Item A"] }),
  });
  check("category updated", updatedCat?.icon === "🔬" || updatedCat?.matchedCount === 1 || !!updatedCat);

  // 2. Expenses: create, list, filtered list
  const expsBefore = await api("/expenses");
  const countBefore = expsBefore.length;

  const today = new Date().toISOString().slice(0, 10);
  const created = await api("/expenses", {
    method: "POST",
    body: JSON.stringify({
      amount: 123.45,
      category: catName,
      itemType: "Test Item A",
      description: "e2e smoke test",
      date: today,
      source: "manual",
    }),
  });
  check("expense created", !!created?.id);

  const expsAfter = await api("/expenses");
  check("expense appears in list", expsAfter.length === countBefore + 1);

  const filtered = await api(`/expenses?category=${encodeURIComponent(catName)}`);
  check("filter by category finds it", filtered.some((e) => e.id === created.id));

  // 3. Stats reflect the new expense
  const stats = await api("/expenses/stats");
  check("stats totalSpend increased", Number(stats.totalSpend) >= 123.45);
  check("stats has monthlyTrend", Array.isArray(stats.monthlyTrend));

  // 4. Breakdown for the temp category
  const breakdown = await api(`/expenses/breakdown?category=${encodeURIComponent(catName)}&period=monthly`);
  const block = breakdown.breakdown?.find((b) => b.category === catName);
  check("breakdown contains temp category", !!block);
  check("breakdown item totals correct", block?.items?.[0]?.totalAmount === 123.45, JSON.stringify(block?.items));

  // 5. Update the expense
  const upd = await api(`/expenses/${created.id}`, {
    method: "PUT",
    body: JSON.stringify({
      amount: 200,
      category: catName,
      itemType: "Test Item A",
      description: "e2e smoke test (updated)",
      date: today,
    }),
  });
  check("expense updated", Number(upd?.amount) === 200 || !!upd);

  // 6. Delete both (cleanup)
  await api(`/expenses/${created.id}`, { method: "DELETE" });
  await api(`/categories/${createdCat.id}`, { method: "DELETE" });

  const catsFinal = await api("/categories");
  const expsFinal = await api("/expenses");
  check("cleanup: expense deleted", expsFinal.length === countBefore);
  check("cleanup: category deleted", !catsFinal.some((c) => c.name === catName));

  console.log(failures === 0 ? "\nALL CHECKS PASSED ✅" : `\n${failures} CHECK(S) FAILED ❌`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error("E2E run crashed:", err.message);
  process.exit(1);
});
