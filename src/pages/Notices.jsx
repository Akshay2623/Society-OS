import { useEffect, useState } from "react";
import { Bell, PlusCircle, Pin } from "lucide-react";
import { api } from "../services/api";

const noticeCategories = [
  { value: "digital_notice", label: "Digital Notice" },
  { value: "emergency_alert", label: "Emergency Alert" },
  { value: "society_event", label: "Society Event" },
  { value: "festival_celebration", label: "Festival Celebration" },
];

function Notices() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category: "digital_notice",
    title: "",
    message: "",
    isPinned: false,
  });
  const [notices, setNotices] = useState([]);

  const loadNotices = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getNotifications();
      setNotices(data || []);
    } catch (err) {
      setError(err?.message || "Unable to load notices");
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.title.trim() || !form.message.trim()) {
      setError("Notice title and details are required");
      return;
    }

    setSaving(true);
    try {
      await api.createNotification({
        category: form.category,
        title: form.title.trim(),
        message: form.message.trim(),
        isPinned: form.isPinned,
      });
      setForm({
        category: "digital_notice",
        title: "",
        message: "",
        isPinned: false,
      });
      await loadNotices();
    } catch (err) {
      setError(err?.message || "Unable to publish notice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-cyan-300/40 bg-cyan-500/10 p-6">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 text-cyan-300" size={22} />
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Notice Board</h3>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Admin can publish notices. All users can read notices in the notification panel.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 backdrop-blur dark:border-white/15 dark:bg-slate-900/55">
        <h4 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">Post Notice</h4>
        <form onSubmit={onSubmit} className="space-y-4">
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100"
          >
            {noticeCategories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Notice title"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
          />

          <textarea
            rows={5}
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="Notice details"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
          />

          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(event) => setForm((prev) => ({ ...prev, isPinned: event.target.checked }))}
              className="h-4 w-4 rounded border border-slate-300 bg-white dark:border-white/20 dark:bg-slate-900/70"
            />
            Pin this notice
          </label>

          {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <PlusCircle size={18} />
            {saving ? "Publishing..." : "Publish Notice"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 backdrop-blur dark:border-white/15 dark:bg-slate-900/55">
        {loading && <p className="text-slate-600 dark:text-slate-300">Loading notices...</p>}
        {!loading && notices.length === 0 && <p className="text-slate-600 dark:text-slate-300">No notices available.</p>}
        {!loading && notices.length > 0 && (
          <div className="space-y-3">
            {notices.map((notice) => (
              <article key={notice.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-white/5">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-white">{notice.title}</h5>
                  {notice.is_pinned && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100">
                      <Pin size={11} />
                      Pinned
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-200">{notice.message}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Notices;
