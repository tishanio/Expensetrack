/**
 * CSV export for record keeping. Generates the file client-side from the
 * expenses currently shown (filters respected) and triggers a download.
 */

/** Quote a cell when it contains commas, quotes, or newlines (RFC 4180). */
function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV document from expenses. Amount is exported as a bare number
 * (no currency symbol/formatting) so spreadsheets can compute on it.
 * A UTF-8 BOM is prepended so Excel opens ₹/unicode correctly.
 */
export function expensesToCsv(expenses) {
  const header = [
    "Date",
    "Item Type",
    "Description",
    "Category",
    "Amount (INR)",
    "Source",
    "Created At",
  ];
  const rows = expenses.map((e) => [
    e.date || "",
    e.item_type || "Other",
    e.description || "",
    e.category || "",
    typeof e.amount === "number" ? e.amount : parseFloat(e.amount) || 0,
    e.source || "manual",
    e.created_at || "",
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
  );
}

/** Generate the CSV from expenses and download it as expenses-YYYYMMDD.csv. */
export function exportExpensesCsv(expenses) {
  const csv = expensesToCsv(expenses);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
