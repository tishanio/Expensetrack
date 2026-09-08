import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createExpense, fetchCategories, searchItems } from "../api.js";
import { today } from "../constants.js";

export default function AddExpense() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    amount: "",
    category: "",
    itemType: "",
    description: "",
    date: today(),
  });
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load categories
  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setForm((p) => ({ ...p, category: cats[0].name }));
      })
      .catch(() => {});
  }, []);

  // Get items for selected category
  const selectedCat = categories.find((c) => c.name === form.category);
  const categoryItems = selectedCat?.items || [];

  // Search handler with debounce
  const handleItemSearch = useCallback(
    (value) => {
      setForm((p) => ({ ...p, itemType: value }));

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length >= 2) {
        debounceRef.current = setTimeout(async () => {
          try {
            const results = await searchItems(value, form.category);
            setItemSuggestions(results);
            setShowSuggestions(results.length > 0);
          } catch {
            setItemSuggestions([]);
          }
        }, 300);
      } else {
        setItemSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [form.category]
  );

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Reset item type when category changes
      if (name === "category") {
        next.itemType = "";
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!form.category) {
      toast.error("Please select a category");
      return;
    }
    if (!form.date) {
      toast.error("Please select a date");
      return;
    }

    setSaving(true);
    try {
      await createExpense({
        amount: parseFloat(form.amount),
        category: form.category,
        itemType: form.itemType || "Other",
        description: form.description,
        date: form.date,
        source: "manual",
      });
      toast.success("Expense added successfully!");
      navigate("/expenses");
    } catch (err) {
      toast.error(err.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Expense</h2>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Amount */}
        <div>
          <label className="label">Amount (₹)</label>
          <input
            type="number"
            name="amount"
            className="input"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={handleChange}
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, category: cat.name, itemType: "" }))
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.category === cat.name
                    ? "bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-500/20"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Item Type (with autocomplete) */}
        <div ref={searchRef} className="relative">
          <label className="label">Item Type</label>
          <input
            type="text"
            className="input"
            placeholder={
              categoryItems.length > 0
                ? `e.g. ${categoryItems.slice(0, 3).join(", ")}...`
                : "Type an item name..."
            }
            value={form.itemType}
            onChange={(e) => handleItemSearch(e.target.value)}
            onFocus={() => {
              if (itemSuggestions.length > 0) setShowSuggestions(true);
            }}
          />

          {/* Quick-select chips from category items */}
          {categoryItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categoryItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, itemType: item }))
                  }
                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
                    form.itemType === item
                      ? "bg-brand-50 border-brand-500 text-brand-700"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* Search suggestions dropdown */}
          {showSuggestions && itemSuggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
              {itemSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between"
                  onClick={() => {
                    setForm((p) => ({ ...p, itemType: s.itemType }));
                    setShowSuggestions(false);
                  }}
                >
                  <span>
                    <span className="font-medium">{s.itemType}</span>
                    <span className="text-gray-400 ml-2">({s.category})</span>
                  </span>
                  <span className="text-gray-400">
                    {s.count}x · ₹{s.totalAmount.toLocaleString("en-IN")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description (optional)</label>
          <input
            type="text"
            name="description"
            className="input"
            placeholder="Any additional notes..."
            value={form.description}
            onChange={handleChange}
          />
        </div>

        {/* Date */}
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            name="date"
            className="input"
            value={form.date}
            onChange={handleChange}
            required
          />
        </div>

        {/* Submit */}
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
          ) : (
            "Save Expense"
          )}
        </button>
      </form>
    </div>
  );
}
