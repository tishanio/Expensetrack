import { useState, useEffect } from "react";
import { toast } from "../sounds.js";
import {
  fetchExpenses,
  updateExpense,
  deleteExpense,
  fetchCategories,
} from "../api.js";
import { exportExpensesCsv } from "../csv.js";
import { formatCurrency, formatDate } from "../constants.js";
import { ScreenHead, EmptyState, Loading, catColor, catIcon } from "../components/retro.jsx";

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("date");
  const [order, setOrder] = useState("desc");

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    category: "",
    itemType: "",
    description: "",
    date: "",
  });
  const [saving, setSaving] = useState(false);

  // Load categories once
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (category) filters.category = category;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (source) filters.source = source;
      if (sort) filters.sort = sort;
      if (order) filters.order = order;

      const data = await fetchExpenses(filters);
      setExpenses(data);
    } catch (err) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [category, startDate, endDate, source, sort, order]);

  const startEditing = (expense) => {
    setEditingId(expense.id);
    setEditForm({
      amount: String(expense.amount),
      category: expense.category,
      itemType: expense.item_type || "",
      description: expense.description,
      date: expense.date,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ amount: "", category: "", itemType: "", description: "", date: "" });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "category") next.itemType = "";
      return next;
    });
  };

  const handleSave = async (id) => {
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!editForm.date) {
      toast.error("Please select a date");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateExpense(id, {
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        itemType: editForm.itemType || "Other",
        description: editForm.description,
        date: editForm.date,
      });

      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updated } : e))
      );
      cancelEditing();
      toast.success("Expense updated!");
    } catch (err) {
      toast.error(err.message || "Failed to update expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      toast.success("Expense deleted");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const clearFilters = () => {
    setCategory("");
    setStartDate("");
    setEndDate("");
    setSource("");
  };

  const hasFilters = category || startDate || endDate || source;

  // Get items for the edit form's selected category, keeping the expense's
  // current item_type selectable even when it isn't in the category list.
  const editCatItems = categories.find((c) => c.name === editForm.category)?.items || [];
  const editOptions =
    editForm.itemType && !editCatItems.includes(editForm.itemType)
      ? [editForm.itemType, ...editCatItems]
      : editCatItems;

  return (
    <div>
      <ScreenHead
        title="All Expenses"
        extra={
          <div className="od-row" style={{ "--od-gap": "10px", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => exportExpensesCsv(expenses)}
              disabled={expenses.length === 0}
              title={hasFilters ? "Exports the filtered list" : "Exports all expenses"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4" /><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
              Export CSV
            </button>
            <span className="tag" style={{ fontSize: 14, padding: "6px 12px" }}>
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </span>
          </div>
        }
      />

      {/* Filters */}
      <div className="card card--flat">
        <div className="od-grid filter-grid">
          <div className="od-field">
            <label className="field-label" htmlFor="fCat">Category</label>
            <select id="fCat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="od-field">
            <label className="field-label" htmlFor="fStart">From</label>
            <input id="fStart" className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="od-field">
            <label className="field-label" htmlFor="fEnd">To</label>
            <input id="fEnd" className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="od-field">
            <label className="field-label" htmlFor="fSource">Source</label>
            <select id="fSource" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All Sources</option>
              <option value="manual">Manual</option>
              <option value="ocr">OCR</option>
            </select>
          </div>
          <div className="od-field">
            <label className="field-label" htmlFor="fSort">Sort By</label>
            <div className="od-row" style={{ "--od-gap": "8px" }}>
              <select id="fSort" className="input od-fill" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="created_at">Created</option>
              </select>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setOrder((p) => (p === "asc" ? "desc" : "asc"))}
                aria-label="Toggle sort direction"
                title={`Currently ${order === "asc" ? "ascending" : "descending"}`}
              >
                {order === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
          {hasFilters && (
            <div className="od-field" style={{ alignSelf: "end" }}>
              <button type="button" className="btn btn--ghost btn--block btn--sm" onClick={clearFilters}>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expense list */}
      {loading ? (
        <div style={{ marginTop: 20 }}>
          <Loading label="Loading expenses..." />
        </div>
      ) : expenses.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState
            emoji="📭"
            title="No expenses found"
            text={hasFilters ? "Try adjusting your filters." : "Add your first expense to get started!"}
          />
        </div>
      ) : (
        <div className="list" style={{ marginTop: 20 }}>
          {expenses.map((expense, i) => {
            const isEditing = editingId === expense.id;

            if (isEditing) {
              return (
                <div className="list__row" key={expense.id} style={{ background: "var(--canvas)", flexWrap: "wrap", animation: "none" }}>
                  <div className="od-grid edit-grid" style={{ width: "100%" }}>
                    <div className="od-field">
                      <label className="field-label" htmlFor="edAmt">Amount (₹)</label>
                      <input id="edAmt" name="amount" className="input" type="number" step="0.01" min="0" value={editForm.amount} onChange={handleEditChange} />
                    </div>
                    <div className="od-field">
                      <label className="field-label" htmlFor="edCat">Category</label>
                      <select id="edCat" name="category" className="input" value={editForm.category} onChange={handleEditChange}>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="od-field">
                      <label className="field-label" htmlFor="edItem">Item Type</label>
                      <select id="edItem" name="itemType" className="input" value={editForm.itemType} onChange={handleEditChange}>
                        <option value="">Select item…</option>
                        {editOptions.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                    <div className="od-field">
                      <label className="field-label" htmlFor="edDate">Date</label>
                      <input id="edDate" name="date" className="input" type="date" value={editForm.date} onChange={handleEditChange} />
                    </div>
                    <div className="od-field">
                      <label className="field-label" htmlFor="edDesc">Description</label>
                      <input id="edDesc" name="description" className="input" type="text" value={editForm.description} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="od-row" style={{ "--od-gap": "10px" }}>
                    <button className="btn btn--green btn--sm" type="button" disabled={saving} onClick={() => handleSave(expense.id)}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button className="btn btn--ghost btn--sm" type="button" disabled={saving} onClick={cancelEditing}>
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div className="list__row" key={expense.id} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                <span className="row-icon" style={{ background: catColor(expense.category) + "33" }} aria-hidden="true">
                  {catIcon(expense.category)}
                </span>
                <div className="row-main od-field">
                  <span className="row-name od-truncate">
                    {expense.item_type || expense.description || expense.category}
                  </span>
                  <span className="row-meta">
                    <span className="tag">{expense.category}</span>
                    {expense.source === "ocr" && <span className="tag tag--ocr">OCR</span>}
                    <span className="screen-sub">{formatDate(expense.date)}</span>
                  </span>
                </div>
                <span className="row-amt od-nowrap">{formatCurrency(expense.amount)}</span>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => startEditing(expense)}
                  aria-label={`Edit ${expense.item_type || expense.category}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" />
                  </svg>
                </button>
                <button
                  className="icon-btn icon-btn--del"
                  type="button"
                  onClick={() => handleDelete(expense.id)}
                  aria-label={`Delete ${expense.item_type || expense.category}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
