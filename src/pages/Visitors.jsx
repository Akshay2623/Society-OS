import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, X } from "lucide-react";
import { api } from "../services/api";
import { VisitorsCandleChart } from "../components/Charts";

const badgeStyles = {
  Approved: "bg-emerald-500/20 text-emerald-100",
  Pending: "bg-amber-500/20 text-amber-100",
  Rejected: "bg-rose-500/20 text-rose-100",
  Exited: "bg-slate-500/20 text-slate-200",
};

function Visitors() {
  const [visitorsData, setVisitorsData] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    purpose: "",
    flatId: "",
    status: "Pending",
  });
  const [editForm, setEditForm] = useState({
    id: null,
    status: "Pending",
    exitTime: "",
  });

  const loadVisitors = async () => {
    const data = await api.getVisitors();
    setVisitorsData(data || []);
  };

  useEffect(() => {
    loadVisitors().catch(() => setVisitorsData([]));
  }, []);

  const filteredVisitors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visitorsData;
    return visitorsData.filter((visitor) => {
      return [visitor.name, visitor.phone, visitor.purpose, visitor.flat, visitor.status].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [search, visitorsData]);

  const candleData = useMemo(() => {
    const buckets = new Map();

    visitorsData.forEach((visitor) => {
      const dt = visitor.entry_at ? new Date(visitor.entry_at) : null;
      if (!dt || Number.isNaN(dt.getTime())) return;

      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
          sort: dt.getTime(),
          total: 0,
          pending: 0,
          approved: 0,
          exited: 0,
          rejected: 0,
        });
      }

      const row = buckets.get(key);
      row.total += 1;
      const status = String(visitor.status || "").toLowerCase();
      if (status === "pending") row.pending += 1;
      else if (status === "approved") row.approved += 1;
      else if (status === "exited") row.exited += 1;
      else if (status === "rejected") row.rejected += 1;
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.sort - b.sort)
      .slice(-8)
      .map((row) => {
        const open = row.pending;
        const close = row.approved + row.exited;
        let high = Math.max(row.total, open, close);
        let low = Math.min(row.rejected, open, close);

        if (high === low) high += 1;

        const bodyBase = Math.min(open, close);
        const bodySize = Math.max(Math.abs(close - open), 0.3);
        const wickCenter = (high + low) / 2;
        const wickRange = (high - low) / 2;

        return {
          label: row.label,
          open,
          close,
          high,
          low,
          bodyBase,
          bodySize,
          wickCenter,
          wickRange,
          trend: close >= open ? "up" : "down",
        };
      });
  }, [visitorsData]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.flatId) {
      setFormError("Name and Flat ID are required");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.addVisitor({
        name: form.name,
        phone: form.phone,
        purpose: form.purpose,
        flatId: Number(form.flatId),
        status: form.status,
      });
      setVisitorsData((prev) => [created, ...prev]);
      setForm({ name: "", phone: "", purpose: "", flatId: "", status: "Pending" });
      setShowModal(false);
    } catch (error) {
      setFormError(error?.message || "Unable to add visitor");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (visitor) => {
    const dt = visitor.exit_at ? new Date(visitor.exit_at) : null;
    const localValue = dt && !Number.isNaN(dt.getTime()) ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setEditError("");
    setEditForm({
      id: visitor.id,
      status: visitor.status || "Pending",
      exitTime: localValue,
    });
    setShowEditModal(true);
  };

  const onEditSubmit = async (event) => {
    event.preventDefault();
    if (!editForm.id) return;
    setEditing(true);
    setEditError("");
    try {
      const updated = await api.updateVisitor(editForm.id, {
        status: editForm.status,
        exitTime: editForm.exitTime ? new Date(editForm.exitTime).toISOString() : null,
      });
      setVisitorsData((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setShowEditModal(false);
    } catch (error) {
      setEditError(error?.message || "Unable to update visitor");
    } finally {
      setEditing(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-5 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Visitor Log</h3>
            <p className="text-sm text-slate-300">Add new visitors and view complete details.</p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone, purpose, flat, status..."
              className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/30 md:w-80"
            />
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-500"
            >
              <Plus size={16} />
              Add Visitor
            </button>
          </div>
        </div>
      </div>

      {candleData.length > 0 && <VisitorsCandleChart data={candleData} />}

      {/* Desktop table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden rounded-2xl border border-white/15 bg-slate-900/55 overflow-x-auto p-6 backdrop-blur md:block"
      >
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-slate-300">
              <th className="pb-3">Visitor</th>
              <th className="pb-3">Phone</th>
              <th className="pb-3">Purpose</th>
              <th className="pb-3">Flat</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Entry Time</th>
              <th className="pb-3">Exit Time</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-100">
            {filteredVisitors.map((visitor) => (
              <tr key={visitor.id}>
                <td className="py-3 font-medium">{visitor.name}</td>
                <td className="py-3">{visitor.phone || "-"}</td>
                <td className="py-3">{visitor.purpose}</td>
                <td className="py-3">{visitor.flat}</td>
                <td className="py-3">
                  <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${badgeStyles[visitor.status] || "bg-slate-500/20 text-slate-200"}`}>
                    {visitor.status}
                  </span>
                </td>
                <td className="py-3">{visitor.entry}</td>
                <td className="py-3">{visitor.exit}</td>
                <td className="py-3">
                  <button
                    onClick={() => openEditModal(visitor)}
                    className="rounded-lg p-2 text-cyan-300 transition hover:bg-white/10"
                  >
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredVisitors.map((visitor) => (
          <motion.article
            key={visitor.id}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-white/15 bg-slate-900/55 p-5 backdrop-blur"
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold text-white">{visitor.name}</h4>
              <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${badgeStyles[visitor.status] || "bg-slate-500/20 text-slate-200"}`}>
                {visitor.status}
              </span>
            </div>
            <p className="text-sm text-slate-200">Phone: {visitor.phone || "-"}</p>
            <p className="text-sm text-slate-200">Purpose: {visitor.purpose}</p>
            <p className="text-sm text-slate-200">Flat: {visitor.flat}</p>
            <p className="mt-2 text-xs text-slate-300">
              Entry {visitor.entry} | Exit {visitor.exit}
            </p>
            <button
              onClick={() => openEditModal(visitor)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-white/10"
            >
              <Pencil size={13} />
              Edit
            </button>
          </motion.article>
        ))}
      </div>

      <AnimatePresence>
        {showEditModal && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={onEditSubmit}
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/15 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Edit Visitor</h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid gap-3">
                <select
                  value={editForm.status}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                  <option>Exited</option>
                </select>
                <input
                  type="datetime-local"
                  value={editForm.exitTime}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, exitTime: event.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100"
                />
              </div>
              {editError && <p className="mt-3 text-sm text-rose-600">{editError}</p>}
              <button
                type="submit"
                disabled={editing}
                className="mt-5 w-full rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {editing ? "Updating..." : "Update Visitor"}
              </button>
            </motion.form>
          </motion.div>
        )}

        {showModal && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={onSubmit}
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/15 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Add Visitor</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-3">
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Visitor Name"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone Number"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <input
                  value={form.purpose}
                  onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
                  placeholder="Purpose (delivery, guest, etc.)"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <input
                  required
                  type="number"
                  min="1"
                  value={form.flatId}
                  onChange={(event) => setForm((prev) => ({ ...prev, flatId: event.target.value }))}
                  placeholder="Flat ID"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                  <option>Exited</option>
                </select>
              </div>

              {formError && <p className="mt-3 text-sm text-rose-600">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Save Visitor"}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default Visitors;
