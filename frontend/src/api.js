const API_BASE = "/api";

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error("Backend unavailable. Start MongoDB and run the backend on port 3001.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Expenses ──

export async function fetchExpenses(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.source) params.set("source", filters.source);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  if (filters.itemType) params.set("itemType", filters.itemType);

  const qs = params.toString();
  return request(`/expenses${qs ? `?${qs}` : ""}`);
}

export async function createExpense(data) {
  return request("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateExpense(id, data) {
  return request(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(id) {
  return request(`/expenses/${id}`, {
    method: "DELETE",
  });
}

// ── Stats ──

export async function fetchStats(filters = {}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);

  const qs = params.toString();
  return request(`/expenses/stats${qs ? `?${qs}` : ""}`);
}

// ── Breakdown ──

export async function fetchBreakdown(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.period) params.set("period", filters.period);

  const qs = params.toString();
  return request(`/expenses/breakdown${qs ? `?${qs}` : ""}`);
}

// ── Search (autocomplete) ──

export async function searchItems(query, category = "") {
  const params = new URLSearchParams({ q: query });
  if (category) params.set("category", category);
  return request(`/expenses/search?${params.toString()}`);
}

// ── Categories ──

export async function fetchCategories() {
  return request("/categories");
}

export async function createCategory(data) {
  return request("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id, data) {
  return request(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id) {
  return request(`/categories/${id}`, {
    method: "DELETE",
  });
}

// ── OCR ──

export async function extractOcr(file) {
  const formData = new FormData();
  formData.append("receipt", file);

  const res = await fetch(`${API_BASE}/ocr/extract`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "OCR failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}
