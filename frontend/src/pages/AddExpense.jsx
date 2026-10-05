import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../sounds.js";
import { createExpense, fetchCategories, searchItems } from "../api.js";
import { today } from "../constants.js";
import { ScreenHead, catIcon } from "../components/retro.jsx";

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

  const pickCategory = (name) => {
    setForm((p) => ({ ...p, category: name, itemType: "" }));
    setItemSuggestions([]);
    setShowSuggestions(false);
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
    <div>
      <ScreenHead title="Add Expense" sub="Smash the numbers in. Big buttons, no mistakes." />

      <form onSubmit={handleSubmit} className="card" noValidate>
        <div className="od-stack" style={{ "--od-gap": "18px" }}>
          {/* Amount */}
          <div className="od-field">
            <label className="field-label" htmlFor="addAmount">Amount (₹) <span aria-hidden="true">*</span></label>
            <input
              id="addAmount"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              required
            />
            <span className="field-hint">Required. Must be more than zero.</span>
          </div>

          {/* Category chips */}
          <div className="od-field">
            <span className="field-label">Category <span aria-hidden="true">*</span></span>
            <div className="od-cluster" style={{ "--od-gap": "8px" }}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={"chip chip--icon" + (form.category === cat.name ? " is-on" : "")}
                  aria-pressed={form.category === cat.name}
                  onClick={() => pickCategory(cat.name)}
                >
                  {!cat.icon || cat.icon.includes("?") ? catIcon(cat.name) : cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Item Type (with autocomplete) */}
          <div className="od-field" ref={searchRef} style={{ position: "relative" }}>
            <label className="field-label" htmlFor="addItem">Item Type</label>
            <input
              id="addItem"
              className="input"
              type="text"
              placeholder="e.g. Groceries, Uber, Movie..."
              value={form.itemType}
              onChange={(e) => handleItemSearch(e.target.value)}
              onFocus={() => { if (itemSuggestions.length > 0) setShowSuggestions(true); }}
              autoComplete="off"
            />

            {/* Quick-select chips from category items */}
            {categoryItems.length > 0 && (
              <div className="od-cluster" style={{ "--od-gap": "6px", marginTop: 10 }}>
                {categoryItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={"chip chip--sm" + (form.itemType === item ? " is-on" : "")}
                    onClick={() => setForm((p) => ({ ...p, itemType: item }))}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {/* Search suggestions dropdown */}
            {showSuggestions && itemSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute", zIndex: 20, left: 0, right: 0, top: "100%",
                  background: "var(--paper)", border: "3px solid var(--ink)",
                  borderRadius: "var(--r)", boxShadow: "var(--shadow-sm)",
                  maxHeight: 200, overflow: "auto", marginTop: 4,
                }}
              >
                {itemSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    style={{
                      display: "flex", width: "100%", justifyContent: "space-between", gap: 8,
                      padding: "10px 14px", background: "none", border: "none",
                      borderBottom: "2px dashed #d9d9e6", cursor: "pointer",
                      fontFamily: "var(--font-body)", fontSize: 15,
                    }}
                    onClick={() => {
                      setForm((p) => ({ ...p, itemType: s.itemType }));
                      setShowSuggestions(false);
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      {s.itemType}
                      <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 6 }}>({s.category})</span>
                    </span>
                    <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {s.count}x · ₹{s.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="od-field">
            <label className="field-label" htmlFor="addDesc">Description (optional)</label>
            <input
              id="addDesc"
              className="input"
              type="text"
              placeholder="Any little notes..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Date */}
          <div className="od-field">
            <label className="field-label" htmlFor="addDate">Date <span aria-hidden="true">*</span></label>
            <input
              id="addDate"
              className="input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              required
            />
          </div>

          {/* Submit */}
          <button className="btn btn--pink btn--block" type="submit" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner" style={{ width: 22, height: 22, borderWidth: 4, margin: 0 }} aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                Save Expense
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
