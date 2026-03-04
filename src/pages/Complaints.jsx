import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { api } from "../services/api";

const priorityColors = {
  Low: "bg-emerald-500/20 text-emerald-100",
  Medium: "bg-amber-500/20 text-amber-100",
  High: "bg-rose-500/20 text-rose-100",
};

function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "Maintenance",
    priority: "Low",
  });

  const loadComplaints = async () => {
    const data = await api.getComplaints();
    setComplaints(data || []);
  };

  useEffect(() => {
    loadComplaints().catch(() => setComplaints([]));
  }, []);

  const cycleStatus = (id) => {
    setComplaints((prev) =>
      prev.map((complaint) => {
        if (complaint.id !== id) return complaint;
        const next = complaint.status === "Open" ? "In Progress" : complaint.status === "In Progress" ? "Resolved" : "Open";
        api.updateComplaintStatus(id, next).catch(() => {});
        return { ...complaint, status: next };
      })
    );
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.title.trim()) {
      setFormError("Complaint description is required");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.addComplaint(form);
      setComplaints((prev) => [created, ...prev]);
      setForm({ title: "", category: "Maintenance", priority: "Low" });
      setShowModal(false);
    } catch (error) {
      setFormError(error?.message || "Unable to raise complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-5 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Complaints</h2>
            <p className="text-sm text-slate-300">Track and raise society issues from this panel.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-500"
          >
            <Plus size={16} />
            Raise Complaint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {complaints.map((complaint) => (
          <motion.article
            key={complaint.id}
            whileHover={{ y: -4, scale: 1.01 }}
            className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">{complaint.id}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{complaint.title}</h3>
              </div>
              <span className="rounded-xl bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">{complaint.category}</span>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${priorityColors[complaint.priority]}`}>
                {complaint.priority}
              </span>
              <span className="rounded-xl bg-slate-500/20 px-3 py-1 text-xs font-semibold text-slate-100">{complaint.status}</span>
            </div>
            <button
              onClick={() => cycleStatus(complaint.id)}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
            >
              Toggle Status
            </button>
          </motion.article>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={onSubmit}
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-soft"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Raise Complaint</h3>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl p-2 text-slate-200 hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-3">
                <textarea
                  required
                  rows={4}
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Describe the issue..."
                  className="rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-300/30"
                />
                <select
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-300/30"
                >
                  <option>Maintenance</option>
                  <option>Electrical</option>
                  <option>Plumbing</option>
                  <option>Security</option>
                  <option>Housekeeping</option>
                </select>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                  className="rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-300/30"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>

              {formError && <p className="mt-3 text-sm text-rose-600">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Submit Complaint"}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default Complaints;
