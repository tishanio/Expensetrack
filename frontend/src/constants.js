export const DEFAULT_CATEGORIES = [
  { name: "Food", icon: "🍔" },
  { name: "Transport", icon: "🚗" },
  { name: "Shopping", icon: "🛍️" },
  { name: "Bills", icon: "📄" },
  { name: "Entertainment", icon: "🎬" },
  { name: "Healthcare", icon: "🏥" },
  { name: "Education", icon: "📚" },
  { name: "Utilities", icon: "💡" },
  { name: "Rent", icon: "🏠" },
  { name: "Travel", icon: "✈️" },
  { name: "Stationery", icon: "📝" },
  { name: "Others", icon: "📦" },
];

export const CATEGORY_COLORS = {
  Food: "#ef4444",
  Transport: "#3b82f6",
  Shopping: "#8b5cf6",
  Bills: "#10b981",
  Entertainment: "#f59e0b",
  Healthcare: "#ec4899",
  Education: "#6366f1",
  Utilities: "#14b8a6",
  Rent: "#f97316",
  Travel: "#06b6d4",
  Stationery: "#84cc16",
  Others: "#6b7280",
};

export const CATEGORY_ICONS = {
  Food: "🍔",
  Transport: "🚗",
  Shopping: "🛍️",
  Bills: "📄",
  Entertainment: "🎬",
  Healthcare: "🏥",
  Education: "📚",
  Utilities: "💡",
  Rent: "🏠",
  Travel: "✈️",
  Stationery: "📝",
  Others: "📦",
};

// Time period options
export const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/**
 * Format a number as INR currency.
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get today's date in YYYY-MM-DD format.
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}
