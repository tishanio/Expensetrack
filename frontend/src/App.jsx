import { useState, useEffect } from "react";
import { soundEnabled, setSoundEnabled, playClick, playPop, playBoing, playWhoosh } from "./sounds.js";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import AddExpense from "./pages/AddExpense.jsx";
import ReceiptUpload from "./pages/ReceiptUpload.jsx";
import ExpenseList from "./pages/ExpenseList.jsx";
import Categories from "./pages/Categories.jsx";
import Breakdown from "./pages/Breakdown.jsx";

const NAV = [
  {
    to: "/",
    label: "Dashboard",
    tab: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
    ),
  },
  {
    to: "/add",
    label: "Add",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
    ),
  },
  {
    to: "/upload",
    label: "Scan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3" /><circle cx="12" cy="12" r="3.4" /></svg>
    ),
  },
  {
    to: "/expenses",
    label: "Expenses",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 9h6M9 13h4" /></svg>
    ),
  },
  {
    to: "/breakdown",
    label: "Breakdown",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 109 9h-9z" /><path d="M12 3v9h9A9 9 0 0012 3z" /></svg>
    ),
  },
  {
    to: "/categories",
    label: "Categories",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
    ),
  },
];

const BOTTOM_TABS = NAV.slice(0, 4);
const SHEET_LINKS = NAV.slice(4);

export default function App() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(soundEnabled());
  const location = useLocation();

  /* Global click sounds: one delegated listener instead of per-component wiring.
     Chooses the effect from the pressed element's class; tone() is a no-op when
     muted, so this respects the sound toggle automatically. */
  useEffect(() => {
    const handler = (e) => {
      const el = e.target.closest("button, a");
      if (!el || el.closest("#toasts, .go2072408551")) return;
      if (el.classList.contains("icon-btn--del") || el.classList.contains("btn--danger")) {
        playBoing();
      } else if (el.classList.contains("btn") && !el.classList.contains("btn--ghost")) {
        playPop();
      } else if (
        el.classList.contains("chip") ||
        el.classList.contains("icon-btn") ||
        el.classList.contains("tab") ||
        el.classList.contains("nav-pill") ||
        el.classList.contains("sheet-link")
      ) {
        playClick();
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  /* Page-transition whoosh on route change. */
  useEffect(() => {
    playWhoosh();
  }, [location.pathname]);

  const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <>
      {/* Chaotic ticker */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker__track">
          <span>★ fresh out of the crayon box ★</span>
          <span><b>₹</b> ALL PRICES IN RUPEES <b>₹</b></span>
          <span>☆ expenses, but make them LOUD ☆</span>
          <span>★ sticker collection: <b>99</b> ★</span>
          <span>☆ under construction forever ☆</span>
        </div>
      </div>

      {/* Header */}
      <header className="site-head">
        <div className="site-head__in">
          <NavLink to="/" className="brand" aria-label="ExpenseSnap home">
            <span className="brand__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16v12H4z" /><path d="M4 7l3-3h10l3 3" /><circle cx="12" cy="13" r="3.2" />
              </svg>
            </span>
            <span className="brand__word">Expense<i>Snap</i></span>
          </NavLink>

          {/* Sound toggle */}
          <button
            type="button"
            className="icon-btn"
            style={{ marginLeft: 4 }}
            onClick={() => {
              const next = !soundOn;
              setSoundEnabled(next);
              setSoundOn(next);
              if (next) setTimeout(playClick, 30);
            }}
            aria-pressed={soundOn}
            title={soundOn ? "Mute sounds" : "Unmute sounds"}
            aria-label={soundOn ? "Mute sounds" : "Unmute sounds"}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>

          {/* Desktop nav pills */}
          <nav className="top-nav" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={"nav-pill" + (isActive(item.to) ? " is-active" : "")}
                aria-current={isActive(item.to) ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="wrap" id="view" style={{ "--od-gap": "8px" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddExpense />} />
          <Route path="/upload" element={<ReceiptUpload />} />
          <Route path="/expenses" element={<ExpenseList />} />
          <Route path="/breakdown" element={<Breakdown />} />
          <Route path="/categories" element={<Categories />} />
        </Routes>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav" aria-label="Primary mobile">
        <div className="bottom-nav__in">
          {BOTTOM_TABS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={"tab" + (isActive(item.to) ? " is-active" : "")}
              aria-current={isActive(item.to) ? "page" : undefined}
            >
              {item.icon}
              {item.tab || item.label}
            </NavLink>
          ))}
          <button
            className={"tab" + (SHEET_LINKS.some((s) => isActive(s.to)) ? " is-active" : "")}
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
            More
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <div className={"sheet" + (moreOpen ? " open" : "")} role="dialog" aria-modal="true" aria-label="More sections">
        <button className="scrim" type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
        <div className="sheet-card" role="document">
          <p className="sheet-card__title">More sections</p>
          {SHEET_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={"sheet-link" + (isActive(item.to) ? " is-active" : "")}
              onClick={() => setMoreOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
