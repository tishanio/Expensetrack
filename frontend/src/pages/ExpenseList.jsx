import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  fetchExpenses,
  updateExpense,
  deleteExpense,
  fetchCategories,
} from "../api.js";
import {
  formatCurrency,
  formatDate,
  CATEGORY_ICONS,
} from "../constants.js";

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

  // Get items for the edit form's selected category
  const editCatItems =
    categories.find((c) => c.name === editForm.category)?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">All Expenses</h2>
        <span className="text-sm text-gray-500">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Source</label>
            <select
              className="input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">All Sources</option>
              <option value="manual">Manual</option>
              <option value="ocr">OCR</option>
            </select>
          </div>
          <div>
            <label className="label">Sort By</label>
            <div className="flex gap-1">
              <select
                className="input flex-1"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="created_at">Created</option>
              </select>
              <button
                onClick={() => setOrder((p) => (p === "asc" ? "desc" : "asc"))}
                className="btn-secondary px-2"
                title={`Currently ${order === "asc" ? "ascending" : "descending"}`}
              >
                {order === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading expenses...
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 font-medium">No expenses found</p>
          <p className="text-sm text-gray-400 mt-1">
            {hasFilters ? "Try adjusting your filters" : "Add your first expense to get started!"}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 overflow-hidden">
          {expenses.map((expense) => {
            const isEditing = editingId === expense.id;

            return (
              <div
                key={expense.id}
                className={`px-4 sm:px-6 py-4 transition-colors ${
                  isEditing ? "bg-brand-50/50" : "hover:bg-gray-50"
                }`}
              >
                {isEditing ? (
                  /* ── Inline Edit Form ── */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="label text-xs">Amount (₹)</label>
                        <input type="number" name="amount" className="input text-sm" step="0.01" min="0" value={editForm.amount} onChange={handleEditChange} />
                      </div>
                      <div>
                        <label className="label text-xs">Category</label>
                        <select name="category" className="input text-sm" value={editForm.category} onChange={handleEditChange}>
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Item Type</label>
                        <select name="itemType" className="input text-sm" value={editForm.itemType} onChange={handleEditChange}>
                          <option value="">Select item...</option>
                          {editCatItems.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Date</label>
                        <input type="date" name="date" className="input text-sm" value={editForm.date} onChange={handleEditChange} />
                      </div>
                      <div>
                        <label className="label text-xs">Description</label>
                        <input type="text" name="description" className="input text-sm" value={editForm.description} onChange={handleEditChange} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(expense.id)} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button onClick={cancelEditing} className="btn-secondary text-xs px-3 py-1.5" disabled={saving}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal View ── */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl flex-shrink-0">
                        {CATEGORY_ICONS[expense.category] || "📦"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {expense.item_type || expense.description || expense.category}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(expense.date)}
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                            {expense.category}
                          </span>
                          {expense.source === "ocr" && (
                            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                              OCR
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                      <button onClick={() => startEditing(expense)} className="text-gray-400 hover:text-brand-600 transition-colors p-1" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(expense.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
