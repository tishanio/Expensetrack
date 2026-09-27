import { useState, useEffect } from "react";
import { toast } from "../sounds.js";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api.js";
import { ScreenHead, EmptyState, Loading } from "../components/retro.jsx";

const ICON_OPTIONS = [
  "📦", "🍔", "🚗", "🛍️", "📄", "🎬", "🏥", "📚",
  "💡", "🏠", "✈️", "📝", "💊", "🎮", "🏋️", "🎵",
  "💻", "📱", "🛒", "🐾", "☕", "🎁", "🔧", "🎉",
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "📦", items: "" });
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      const message = err.message || "Failed to load categories";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => {
    setForm({ name: "", icon: "📦", items: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      icon: cat.icon,
      items: cat.items.join(", "),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      const items = form.items
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      if (editingId) {
        await updateCategory(editingId, {
          name: form.name,
          icon: form.icon,
          items,
        });
        toast.success("Category updated!");
      } else {
        await createCategory({ name: form.name, icon: form.icon, items });
        toast.success("Category created!");
      }
      resetForm();
      loadCategories();
    } catch (err) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete category "${name}"? This won't delete expenses under it.`))
      return;
    try {
      await deleteCategory(id);
      toast.success("Category deleted");
      setCategories((prev) => prev.filter((c) => c.id !== id));
      // Notify other tabs (Dashboard, Breakdown) to refresh
      window.dispatchEvent(new Event("categoriesChanged"));
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div>
      <ScreenHead title="Categories" sub="Give every rupee a labelled box." />

      <div className="od-row" style={{ justifyContent: "flex-end", marginBottom: 18 }}>
        <button
          type="button"
          className="btn btn--cyan"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          New Category
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card" noValidate>
          <h3 className="card__title">{editingId ? "Edit Category" : "New Category"}</h3>
          <div className="od-stack" style={{ "--od-gap": "16px" }}>
            <div className="od-field">
              <label className="field-label" htmlFor="catName">Name <span aria-hidden="true">*</span></label>
              <input
                id="catName"
                className="input"
                type="text"
                placeholder="e.g. Groceries"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="od-field">
              <span className="field-label">Icon</span>
              <div className="od-cluster" style={{ "--od-gap": "6px" }}>
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={"chip chip--icon" + (form.icon === icon ? " is-on" : "")}
                    aria-pressed={form.icon === icon}
                    aria-label={`Icon ${icon}`}
                    onClick={() => setForm((p) => ({ ...p, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="od-field">
              <label className="field-label" htmlFor="catItems">Item Types (comma-separated)</label>
              <input
                id="catItems"
                className="input"
                type="text"
                placeholder="e.g. Rice, Bread, Milk, Eggs"
                value={form.items}
                onChange={(e) => setForm((p) => ({ ...p, items: e.target.value }))}
              />
              <span className="field-hint">Suggested when adding expenses under this category.</span>
            </div>

            <div className="od-row" style={{ "--od-gap": "12px", flexWrap: "wrap" }}>
              <button type="submit" className="btn btn--pink" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Category list */}
      {loading ? (
        <div style={{ marginTop: 20 }}>
          <Loading label="Loading categories..." />
        </div>
      ) : loadError ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState emoji="⚠️" title="Could not load categories" text={loadError} />
        </div>
      ) : categories.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState emoji="📂" title="No categories yet" text="Create your first category to get started." />
        </div>
      ) : (
        <div className="od-grid cat-grid" style={{ marginTop: 20 }}>
          {categories.map((cat) => (
            <div key={cat.id} className="cat-card">
              <div className="cat-card__top">
                <div className="cat-card__id">
                  <span className="cat-card__emoji" style={{ background: "var(--canvas)" }} aria-hidden="true">{cat.icon}</span>
                  <span className="cat-card__name od-truncate">{cat.name}</span>
                </div>
                <div className="cat-card__acts">
                  <button className="icon-btn" type="button" onClick={() => startEdit(cat)} aria-label={`Edit ${cat.name}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" />
                    </svg>
                  </button>
                  <button className="icon-btn icon-btn--del" type="button" onClick={() => handleDelete(cat.id, cat.name)} aria-label={`Delete ${cat.name}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                    </svg>
                  </button>
                </div>
              </div>

              {cat.items && cat.items.length > 0 && (
                <div className="od-cluster" style={{ "--od-gap": "6px", marginTop: 12 }}>
                  {cat.items.map((item) => (
                    <span key={item} className="tag">{item}</span>
                  ))}
                </div>
              )}

              {cat.isDefault && <p className="field-hint">Default category</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
