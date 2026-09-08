import { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { fetchBreakdown, fetchCategories } from "../api.js";
import {
  formatCurrency, formatDate, CATEGORY_COLORS, PERIODS,
} from "../constants.js";

export default function Breakdown() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState({ breakdown: [], trend: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    loadBreakdown();
  }, [selectedCategory, startDate, endDate, period]);

  const loadBreakdown = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedCategory) filters.category = selectedCategory;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (period) filters.period = period;
      const result = await fetchBreakdown(filters);
      setData(result);
    } catch (err) {
      console.error("Failed to load breakdown:", err);
    } finally {
      setLoading(false);
    }
  };

  // Pick a random selected category's color or use blue
  const getColor = (cat) => CATEGORY_COLORS[cat] || "#3b82f6";

  // Flatten items from breakdown for the selected category
  const selectedCatData = data.breakdown.find(
    (b) => b.category === selectedCategory
  );
  const itemChartData = selectedCatData
    ? selectedCatData.items.map((item) => ({
        name: item.itemType,
        value: item.totalAmount,
        frequency: item.frequency,
      }))
    : [];

  // Category-level pie chart (all categories)
  const categoryPieData = data.breakdown.map((b) => ({
    name: b.category,
    value: b.categoryTotal,
    count: b.categoryCount,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Category Breakdown</h2>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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
            <label className="label">Period</label>
            <select
              className="input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
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
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading breakdown...
          </div>
        </div>
      ) : data.breakdown.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500 font-medium">No data to display</p>
          <p className="text-sm text-gray-400 mt-1">Add some expenses to see breakdowns</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Category Pie Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Spending by Category
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryPieData.map((entry) => (
                    <Cell key={entry.name} fill={getColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Trend Chart (when category selected) */}
          {selectedCategory && data.trend.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedCategory} — Trend ({period})
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total" fill={getColor(selectedCategory)} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Item Breakdown Table */}
          {data.breakdown.map((catData) => (
            <div
              key={catData.category}
              className={`card overflow-hidden ${
                selectedCategory && catData.category !== selectedCategory
                  ? "opacity-50"
                  : ""
              }`}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_COLORS[catData.category] ? "📊" : "📦"}</span>
                  <h3 className="font-semibold text-gray-900">{catData.category}</h3>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(catData.categoryTotal)}</p>
                  <p className="text-xs text-gray-500">{catData.categoryCount} transactions</p>
                </div>
              </div>

              {/* Items within this category */}
              <div className="divide-y divide-gray-50">
                {catData.items.map((item) => (
                  <div
                    key={item.itemType}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{item.itemType}</p>
                      <p className="text-xs text-gray-500">
                        Bought {item.frequency} time{item.frequency !== 1 ? "s" : ""} · Avg {formatCurrency(item.avgAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(item.totalAmount)}</p>
                      <p className="text-xs text-gray-400">Last: {formatDate(item.lastPurchase)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Item Pie Chart (when this category is selected) */}
              {selectedCategory === catData.category && catData.items.length > 1 && (
                <div className="px-6 pb-6 pt-2">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={itemChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={({ name, percent }) =>
                          percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                        }
                        labelLine={false}
                      >
                        {itemChartData.map((entry, idx) => (
                          <Cell
                            key={entry.name}
                            fill={["#ef4444","#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316","#14b8a6","#84cc16","#6366f1","#6b7280"][idx % 12]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
