import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api.js";

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
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const ICON_OPTIONS = [
    "📦", "🍔", "🚗", "🛍️", "📄", "🎬", "🏥", "📚",
    "💡", "🏠", "✈️", "📝", "💊", "🎮", "🏋️", "🎵",
    "💻", "📱", "🎬", "🛒", "🐾", "☕", "🎁", "🔧",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary"
        >
          + New Category
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId ? "Edit Category" : "New Category"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Name */}
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Groceries"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Icon */}
            <div>
              <label className="label">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, icon }))}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-all ${
                      form.icon === icon
                        ? "bg-brand-50 border-brand-500 ring-2 ring-brand-500/20"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="sm:col-span-3">
              <label className="label">Item Types (comma-separated)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Rice, Bread, Milk, Eggs, Vegetables"
                value={form.items}
                onChange={(e) => setForm((p) => ({ ...p, items: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-400">
                These will be suggested when adding expenses under this category
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading categories...
          </div>
        </div>
      ) : loadError ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 font-medium">Could not load categories</p>
          <p className="text-sm text-gray-500 mt-1">{loadError}</p>
          <button type="button" onClick={loadCategories} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-500 font-medium">No categories yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first category to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(cat)}
                    className="text-gray-400 hover:text-brand-600 p-1 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Items */}
              {cat.items && cat.items.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((item) => (
                    <span
                      key={item}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {cat.isDefault && (
                <span className="text-xs text-gray-400">Default category</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
