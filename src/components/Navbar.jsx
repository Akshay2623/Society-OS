import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Menu, Moon, Plus, Sun, X } from "lucide-react";
import { motion } from "framer-motion";
import { clearAuth } from "../utils/auth";
import { api } from "../services/api";

const notificationTabs = [
  { id: "digital_notice", label: "Digital Notices" },
  { id: "emergency_alert", label: "Emergency Alerts" },
  { id: "society_event", label: "Society Events" },
  { id: "festival_celebration", label: "Festival Celebrations" },
];

function Navbar({ onMenuClick, themeMode, onToggleTheme }) {
  const [openPanel, setOpenPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("digital_notice");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ title: "", message: "" });

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(activeTab);
      setNotifications(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!openPanel) return;
    loadNotifications().catch(() => setNotifications([]));
  }, [openPanel, activeTab]);

  const onCreateNotification = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      await api.createNotification({
        category: activeTab,
        title: form.title.trim(),
        message: form.message.trim(),
      });
      setForm({ title: "", message: "" });
      setShowComposer(false);
      await loadNotifications();
    } finally {
      setSaving(false);
    }
  };

  const toggleRead = async (item) => {
    await api.setNotificationRead(item.id, !item.is_read);
    await loadNotifications();
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-center justify-between rounded-2xl border border-white/15 bg-slate-900/55 px-5 py-4 backdrop-blur"
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
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />}
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
          <div className="absolute right-0 top-14 z-[70] w-[28rem] max-w-[90vw] rounded-2xl border border-white/20 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <button
                onClick={() => setOpenPanel(false)}
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              {notificationTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeTab === tab.id ? "bg-indigo-600 text-white" : "border border-white/20 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => setShowComposer((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Plus size={13} />
                Add
              </button>
              <span className="text-xs text-slate-300">{unreadCount} unread</span>
            </div>

            {showComposer && (
              <form onSubmit={onCreateNotification} className="mb-3 space-y-2 rounded-xl border border-white/20 bg-white/5 p-3">
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Title"
                  className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <textarea
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Message"
                  rows={3}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving ? "Posting..." : "Post"}
                </button>
              </form>
            )}

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {loading && <p className="text-xs text-slate-300">Loading notifications...</p>}
              {!loading && notifications.length === 0 && <p className="text-xs text-slate-300">No notifications found.</p>}
              {!loading &&
                notifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <button
                        onClick={() => toggleRead(item)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                          item.is_read
                            ? "border border-white/20 text-slate-200 hover:bg-white/10"
                            : "bg-emerald-600 text-white hover:bg-emerald-500"
                        }`}
                      >
                        {item.is_read ? "Unread" : "Read"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-200">{item.message}</p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleString()} • {item.created_by_name || "System"}
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
