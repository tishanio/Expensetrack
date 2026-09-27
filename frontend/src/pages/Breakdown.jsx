import { useState, useEffect } from "react";
import { fetchBreakdown, fetchCategories } from "../api.js";
import { formatCurrency, formatDate, PERIODS } from "../constants.js";
import {
  Donut, Bars, Legend, ScreenHead, EmptyState, Loading,
  catColor, catIcon,
} from "../components/retro.jsx";

const ITEM_PALETTE = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
  "#06b6d4", "#f97316", "#14b8a6", "#84cc16", "#6366f1", "#6b7280",
];

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

  // Refresh when categories change (e.g. after a delete on Categories tab)
  useEffect(() => {
    const handler = () => {
      fetchCategories().then(setCategories).catch(() => {});
      loadBreakdown();
    };
    window.addEventListener("categoriesChanged", handler);
    return () => window.removeEventListener("categoriesChanged", handler);
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

  const segs = data.breakdown.map((b) => ({
    label: b.category,
    value: b.categoryTotal,
    color: catColor(b.category),
  }));

  const trendData = data.trend.map((t) => ({ label: t.period, value: t.total }));

  return (
    <div>
      <ScreenHead title="Category Breakdown" sub="Zoom all the way into your pennies." />

      {/* Filters */}
      <div className="card card--flat">
        <span className="sticker" aria-hidden="true" style={{ display: "grid", placeItems: "center", fontSize: 24 }}>📊</span>
        <div className="od-grid filter-grid">
          <div className="od-field">
            <label className="field-label" htmlFor="bdCat">Category</label>
            <select id="bdCat" className="input" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="od-field">
            <label className="field-label" htmlFor="bdPeriod">Period</label>
            <select id="bdPeriod" className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="od-field">
            <label className="field-label" htmlFor="bdStart">From</label>
            <input id="bdStart" className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="od-field">
            <label className="field-label" htmlFor="bdEnd">To</label>
            <input id="bdEnd" className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 20 }}>
          <Loading label="Loading breakdown..." />
        </div>
      ) : data.breakdown.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState emoji="📊" title="No data to display" text="Add some expenses to see breakdowns." />
        </div>
      ) : (
        <div className="od-stack" style={{ "--od-gap": "20px", marginTop: 20 }}>
          {/* Category donut */}
          <div className="card">
            <h3 className="card__title">Spending by Category</h3>
            <Donut segments={segs} />
            <Legend rows={segs} />
          </div>

          {/* Trend (when category selected) */}
          {selectedCategory && trendData.length > 0 && (
            <div className="card">
              <h3 className="card__title">{selectedCategory} — Trend ({period})</h3>
              <Bars data={trendData} />
            </div>
          )}

          {/* Category blocks */}
          {data.breakdown.map((catData) => (
            <div
              key={catData.category}
              className="card"
              style={{
                padding: 0,
                overflow: "hidden",
                opacity: selectedCategory && catData.category !== selectedCategory ? 0.5 : 1,
              }}
            >
              <div style={{ padding: 16 }}>
                <div className="od-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div className="od-row">
                    <span className="row-icon" style={{ background: catColor(catData.category) + "33" }} aria-hidden="true">
                      {catIcon(catData.category)}
                    </span>
                    <span className="cat-card__name">{catData.category}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="row-amt od-nowrap">{formatCurrency(catData.categoryTotal)}</span>
                    <span className="screen-sub od-nowrap">{catData.categoryCount} transactions</span>
                  </div>
                </div>
              </div>

              <div className="list" style={{ border: "none", borderTop: "3px dashed #d9d9e6", boxShadow: "none", borderRadius: 0 }}>
                {catData.items.map((item) => (
                  <div className="list__row" key={item.itemType}>
                    <div className="row-main od-field">
                      <span className="row-name od-truncate">{item.itemType}</span>
                      <span className="screen-sub">
                        Bought {item.frequency}× · Avg {formatCurrency(item.avgAmount)}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="row-amt od-nowrap">{formatCurrency(item.totalAmount)}</span>
                      <span className="screen-sub od-nowrap">Last: {formatDate(item.lastPurchase)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Item donut for the selected category */}
              {selectedCategory === catData.category && catData.items.length > 1 && (
                <div className="donut" style={{ marginTop: 12, padding: "0 16px 16px" }}>
                  <Donut
                    segments={catData.items.map((it, idx) => ({
                      label: it.itemType,
                      value: it.totalAmount,
                      color: ITEM_PALETTE[idx % ITEM_PALETTE.length],
                    }))}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
