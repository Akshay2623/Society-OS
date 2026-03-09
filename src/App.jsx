import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Residents from "./pages/Residents";
import Visitors from "./pages/Visitors";
import Complaints from "./pages/Complaints";
import Billing from "./pages/Billing";
import Amenities from "./pages/Amenities";
import Financial from "./pages/Financial";
import Assistant from "./pages/Assistant";
import Notices from "./pages/Notices";
import Login from "./pages/Login";
import { getRoleHome } from "./utils/auth";

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: "easeOut" },
};

function AdminLayout({ themeMode, onToggleTheme }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="relative flex">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        {mobileMenu && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenu(false)}>
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              className="h-full w-64 border-r border-white/15 bg-slate-950 p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <Sidebar collapsed={false} setCollapsed={() => {}} mobile onNavigate={() => setMobileMenu(false)} />
            </motion.div>
          </div>
        )}

        <main className={`w-full p-3 sm:p-6 ${collapsed ? "lg:ml-[88px]" : "lg:ml-[264px]"}`}>
          <Navbar onMenuClick={() => setMobileMenu(true)} themeMode={themeMode} onToggleTheme={onToggleTheme} />

          <AnimatePresence mode="sync">
            <motion.div key={location.pathname} {...pageTransition} className="transition-all duration-300">
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === "undefined") return "night";
    return localStorage.getItem("smart-society-theme") || "night";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    // Per request: Night Mode uses the light palette, Day Mode uses the dark palette.
    root.classList.toggle("day", themeMode === "night");
    root.classList.toggle("dark", themeMode === "day");
    localStorage.setItem("smart-society-theme", themeMode);
  }, [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === "night" ? "day" : "night"));
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={["admin", "resident", "security"]}>
            <AdminLayout themeMode={themeMode} onToggleTheme={toggleThemeMode} />
          </ProtectedRoute>
        }
      >
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "resident"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/residents"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Residents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visitors"
          element={
            <ProtectedRoute allowedRoles={["admin", "resident", "security"]}>
              <Visitors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints"
          element={
            <ProtectedRoute allowedRoles={["admin", "resident"]}>
              <Complaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute allowedRoles={["admin", "resident"]}>
              <Billing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/amenities"
          element={
            <ProtectedRoute allowedRoles={["admin", "resident"]}>
              <Amenities />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financial"
          element={
            <ProtectedRoute allowedRoles={["admin", "resident"]}>
              <Financial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notices"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Notices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Assistant />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/resident-dashboard" element={<Navigate to={getRoleHome("resident")} replace />} />
      <Route path="/security-dashboard" element={<Navigate to={getRoleHome("security")} replace />} />

      <Route path="/" element={<Navigate to={getRoleHome()} replace />} />
      <Route path="*" element={<Navigate to={getRoleHome()} replace />} />
    </Routes>
  );
}

export default App;
