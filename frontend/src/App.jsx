import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import AddExpense from "./pages/AddExpense.jsx";
import ReceiptUpload from "./pages/ReceiptUpload.jsx";
import ExpenseList from "./pages/ExpenseList.jsx";
import Categories from "./pages/Categories.jsx";
import Breakdown from "./pages/Breakdown.jsx";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/add", label: "Add", icon: "✏️" },
  { to: "/upload", label: "Scan", icon: "📸" },
  { to: "/expenses", label: "Expenses", icon: "📋" },
  { to: "/breakdown", label: "Breakdown", icon: "📈" },
  { to: "/categories", label: "Categories", icon: "📂" },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📸</span>
              <h1 className="text-xl font-bold text-brand-700">
                Expense<span className="text-brand-500">Snap</span>
              </h1>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? "text-brand-600" : "text-gray-500 hover:text-gray-900"
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddExpense />} />
          <Route path="/upload" element={<ReceiptUpload />} />
          <Route path="/expenses" element={<ExpenseList />} />
          <Route path="/breakdown" element={<Breakdown />} />
          <Route path="/categories" element={<Categories />} />
        </Routes>
      </main>
    </div>
  );
}
