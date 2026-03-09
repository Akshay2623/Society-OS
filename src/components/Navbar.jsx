import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { motion } from "framer-motion";
import { clearAuth } from "../utils/auth";
import { api } from "../services/api";

function Navbar({ onMenuClick, themeMode, onToggleTheme }) {
  const [openPanel, setOpenPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const noticeCount = useMemo(() => notifications.length, [notifications]);

  const loadNotifications = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (error) {
      setLoadError(error?.message || "Unable to load notices");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!openPanel) return;
    loadNotifications();
  }, [openPanel]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-[200] mb-6 flex items-center justify-between rounded-2xl border border-white/15 bg-slate-900/55 px-5 py-4 backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <button
          className="rounded-xl border border-white/20 p-2 text-slate-200 transition hover:bg-white/10 lg:hidden"
          onClick={onMenuClick}
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Society Management</p>
          <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        <button
          onClick={() => setOpenPanel((prev) => !prev)}
          className="relative rounded-xl border border-white/20 p-2 text-slate-200 transition hover:scale-105 hover:bg-white/10"
        >
          <Bell size={18} />
          {noticeCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />}
        </button>
        <button
          onClick={onToggleTheme}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:scale-105 hover:bg-white/10"
          title={themeMode === "night" ? "Switch to Day Mode" : "Switch to Night Mode"}
        >
          {themeMode === "night" ? <Sun size={14} /> : <Moon size={14} />}
          <span>{themeMode === "night" ? "Day" : "Night"}</span>
        </button>
        <button
          onClick={() => {
            clearAuth();
            window.location.href = "/login";
          }}
          className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 transition hover:bg-white/10"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400" />
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-white">Admin User</p>
            <p className="text-xs text-slate-300">Logout</p>
          </div>
          <ChevronDown size={16} className="text-slate-300" />
        </button>

        {openPanel && (
          <div className="absolute right-0 top-full z-[300] mt-2 w-[30rem] max-w-[92vw] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl backdrop-blur dark:border-white/20 dark:bg-slate-900/95">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notice Details</h3>
              <button
                onClick={() => setOpenPanel(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {loading && <p className="text-xs text-slate-500 dark:text-slate-300">Loading notices...</p>}
              {!loading && loadError && <p className="text-xs text-rose-600 dark:text-rose-300">{loadError}</p>}
              {!loading && !loadError && notifications.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-300">No notices available.</p>}
              {!loading &&
                notifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-white/5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {String(item.category || "notice").replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-200">{item.message}</p>
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.header>
  );
}

export default Navbar;
