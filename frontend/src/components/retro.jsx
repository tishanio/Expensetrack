import { formatCurrency, CATEGORY_COLORS, CATEGORY_ICONS } from "../constants.js";

/** Escape a value for safe interpolation into SVG/text. */
function esc(v) {
  return String(v == null ? "" : v);
}

export function catColor(name) {
  return CATEGORY_COLORS[name] || "#6b7280";
}

export function catIcon(name) {
  return CATEGORY_ICONS[name] || "📦";
}

export function fmtShort(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return "₹" + (num / 100000).toFixed(1) + "L";
  if (num >= 1000) return "₹" + (num / 1000).toFixed(1) + "k";
  return "₹" + Math.round(num);
}

/** Crayon-style SVG donut chart with center total. */
export function Donut({ segments, size = 200 }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (!total) {
    return <p className="empty__text">No data to display</p>;
  }
  const r = 70;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const arcs = segments.map((s, i) => {
    const len = (s.value / total) * c;
    const off = -acc;
    acc += len;
    return (
      <circle
        key={i}
        cx="100"
        cy="100"
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth="34"
        strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`}
        strokeDashoffset={off.toFixed(2)}
      >
        <title>{`${s.label}: ${formatCurrency(s.value)}`}</title>
      </circle>
    );
  });
  return (
    <div className="donut">
      <svg viewBox="0 0 200 200" role="img" aria-label="Spending chart">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#ececf6" strokeWidth="34" />
        <g transform="rotate(-90 100 100)">{arcs}</g>
        <text className="donut__center" x="100" y="98" textAnchor="middle">
          {esc(fmtShort(total))}
        </text>
        <text className="donut__center-sub" x="100" y="118" textAnchor="middle">
          TOTAL SPEND
        </text>
      </svg>
    </div>
  );
}

/** Chunky retro bar chart (pure CSS bars). */
export function Bars({ data }) {
  if (!data.length) return <p className="empty__text">No data to display</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bars" role="img" aria-label="Trend chart">
      {data.map((d, i) => (
        <div key={i} className="bar-col" title={`${d.label} · ${formatCurrency(d.value)}`}>
          <div className="bar-val">{fmtShort(d.value)}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${Math.max(4, (d.value / max) * 100).toFixed(1)}%` }} />
          </div>
          <div className="bar-lab">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Legend({ rows }) {
  return (
    <div className="legend">
      {rows.map((r, i) => (
        <div key={i} className="legend__row">
          <span className="legend__dot" style={{ background: r.color }} />
          <span className="legend__name od-truncate">{r.name}</span>
          <span className="legend__val od-nowrap">{formatCurrency(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ScreenHead({ title, sub, extra }) {
  return (
    <div className="screen-head">
      <div>
        <h2 className="screen-title">{title}</h2>
        {sub ? <p className="screen-sub">{sub}</p> : null}
      </div>
      {extra}
    </div>
  );
}

export function EmptyState({ emoji, title, text }) {
  return (
    <div className="card empty">
      <span className="empty__emoji" aria-hidden="true">{emoji}</span>
      <p className="empty__title">{title}</p>
      <p className="empty__text">{text}</p>
    </div>
  );
}

export function Wave() {
  return (
    <svg className="wavy" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 12 Q 12.5 0 25 12 T 50 12 T 75 12 T 100 12 T 125 12 T 150 12 T 175 12 T 200 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  );
}

export function Loading({ label = "Loading..." }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="spinner" role="status" aria-label={label} />
      <p className="screen-sub" style={{ marginTop: 14 }}>{label}</p>
    </div>
  );
}
