import { useState, useEffect } from "react";
import { fetchStats, fetchCategories } from "../api.js";
import { formatCurrency, formatDate } from "../constants.js";
import {
  Donut, Bars, Legend, ScreenHead, EmptyState, Wave, Loading,
  catColor, catIcon, fmtShort,
} from "../components/retro.jsx";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  // Refresh when categories change (e.g. after a delete on Categories tab)
  useEffect(() => {
    const handler = () => {
      fetchCategories().then(setCategories).catch(() => {});
      loadStats();
    };
    window.addEventListener("categoriesChanged", handler);
    return () => window.removeEventListener("categoriesChanged", handler);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      const data = await fetchStats(filters);
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [startDate, endDate]);

  const activeCategoryNames = new Set(categories.map((c) => c.name));
  const filteredBreakdown = stats?.categoryBreakdown?.filter(
    (b) => activeCategoryNames.has(b.category)
  ) || [];

  const totalSpend = stats?.totalSpend || 0;
  const thisMonth = new Date().toISOString().slice(0, 7);

  const trend = (stats?.monthlyTrend || []).map((m) => {
    const [y, mo] = String(m.month).split("-");
    const label = new Date(y, mo - 1).toLocaleString("en", { month: "short", year: "2-digit" });
    return { label, value: m.total };
  });
  const trendTotal = trend.reduce((sum, month) => sum + month.value, 0);
  const averageMonthlySpend = trend.length ? trendTotal / trend.length : 0;
  const peakMonth = trend.reduce(
    (peak, month) => (month.value > peak.value ? month : peak),
    trend[0]
  );
  const previousMonth = trend.at(-2);
  const latestMonth = trend.at(-1);
  const latestChange = previousMonth && previousMonth.value > 0
    ? ((latestMonth.value - previousMonth.value) / previousMonth.value) * 100
    : null;

  const statCards = [
    { label: "Total Spend", value: formatCurrency(totalSpend), icon: "💰", bg: "var(--yellow)" },
    { label: "Transactions", value: String(stats?.totalCount || 0), icon: "🧾", bg: "var(--cyan)" },
    { label: "This Month", value: formatCurrency(stats?.currentMonthTotal || 0), icon: "📅", bg: "var(--pink)" },
    {
      label: "Top Category",
      value: stats?.topCategoryCurrentMonth || "N/A",
      icon: stats?.topCategoryCurrentMonth ? catIcon(stats.topCategoryCurrentMonth) : "❓",
      bg: "var(--green)",
    },
  ];

  return (
    <div>
      <ScreenHead title="Dashboard" sub="Where all the rupees went, in crayon." />

      {/* Filters */}
      <div className="card card--flat">
        <span className="sticker" aria-hidden="true" style={{ display: "grid", placeItems: "center", fontSize: 24 }}>⭐</span>
        <div className="od-grid filter-grid">
          <div className="od-field">
            <label className="field-label" htmlFor="dashStart">From</label>
            <input id="dashStart" className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="od-field">
            <label className="field-label" htmlFor="dashEnd">To</label>
            <input id="dashEnd" className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="od-field" style={{ alignSelf: "end" }}>
            <button
              type="button"
              className="btn btn--ghost btn--block"
              disabled={!startDate && !endDate}
              onClick={() => { setStartDate(""); setEndDate(""); }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="od-grid stat-grid" style={{ marginTop: 20 }}>
        {statCards.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat__top">
              <span className="stat__icon" style={{ background: s.bg }} aria-hidden="true">{s.icon}</span>
              <div className="od-stat">
                <span className="stat__num od-nowrap">{s.value}</span>
                <span className="stat__lab">{s.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="od-grid chart-grid" style={{ marginTop: 20 }}>
        <div className="card">
          <h3 className="card__title">Category Breakdown</h3>
          {filteredBreakdown.length > 0 ? (
            <>
              <Donut
                segments={filteredBreakdown.map((b) => ({
                  label: b.category,
                  value: b.total,
                  color: catColor(b.category),
                }))}
              />
              <Legend
                rows={filteredBreakdown.slice(0, 8).map((b) => ({
                  name: b.category,
                  value: b.total,
                  color: catColor(b.category),
                }))}
              />
            </>
          ) : (
            <p className="empty__text" style={{ textAlign: "center" }}>No data to display</p>
          )}
        </div>

        <div className="card dashboard-trend">
          <h3 className="card__title">Monthly Trend</h3>
          <Bars data={trend} />
          {trend.length > 0 && (
            <div className="trend-insights" aria-label="Monthly trend insights">
              <div className="trend-insight trend-insight--average">
                <span className="trend-insight__label">Monthly average</span>
                <strong className="trend-insight__value">{formatCurrency(averageMonthlySpend)}</strong>
              </div>
              <div className="trend-insight trend-insight--peak">
                <span className="trend-insight__label">Biggest month</span>
                <strong className="trend-insight__value">{formatCurrency(peakMonth.value)}</strong>
                <span className="trend-insight__note">{peakMonth.label}</span>
              </div>
              <div className="trend-insight trend-insight--change">
                <span className="trend-insight__label">Latest change</span>
                <strong className="trend-insight__value">
                  {latestChange === null ? "—" : `${latestChange > 0 ? "+" : ""}${latestChange.toFixed(0)}%`}
                </strong>
                <span className="trend-insight__note">
                  {latestMonth.label}{previousMonth ? ` vs ${previousMonth.label}` : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spending by Category list */}
      {filteredBreakdown.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 16px 4px" }}>
            <h3 className="card__title" style={{ margin: 0 }}>Spending by Category</h3>
          </div>
          <div className="list" style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
            {filteredBreakdown.map((b) => {
              const pct = totalSpend > 0 ? ((b.total / totalSpend) * 100).toFixed(1) : "0";
              return (
                <div className="list__row" key={b.category}>
                  <span className="row-icon" style={{ background: catColor(b.category) + "33" }} aria-hidden="true">{catIcon(b.category)}</span>
                  <div className="row-main od-field">
                    <span className="row-name od-truncate">{b.category}</span>
                    <span className="screen-sub">{b.count} transaction{b.count !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="row-amt od-nowrap">{formatCurrency(b.total)}</span>
                    <span className="screen-sub od-nowrap">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <EmptyState emoji="🪙" title="No expenses yet" text="Add your first expense to make the chart go brrr." />
        </div>
      )}

      {stats?.categoryBreakdown?.some((b) => !categories.some((c) => c.name === b.category)) && (
        <p className="tiny-note">
          Some expenses reference categories that no longer exist.
        </p>
      )}

      <Wave />
    </div>
  );
}
