import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../services/api";

function Residents() {
  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "resident",
    flatId: "",
    password: "",
    isActive: true,
  });

  const filtered = useMemo(() => residents, [residents]);

  const loadResidents = async () => {
    const data = await api.getResidents(search, statusFilter);
    setResidents(data || []);
  };

  useEffect(() => {
    loadResidents().catch(() => setResidents([]));
  }, [search, statusFilter]);

  const addResident = (event) => {
    event.preventDefault();
    api
      .addResident(form)
      .then(() => loadResidents())
      .finally(() => {
        setForm({
          name: "",
          email: "",
          phone: "",
          role: "resident",
          flatId: "",
          password: "",
          isActive: true,
        });
        setShowModal(false);
      });
  };

  const deleteResident = (id) => {
    api.deleteResident(id).then(() => loadResidents());
  };

  return (
    <section className="space-y-6">
      {/* Filters and action bar */}
      <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, role, or flat ID..."
              className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/30"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/30"
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-500"
          >
            <Plus size={16} />
            Add Resident
          </button>
        </div>
      </div>

      {/* Residents table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/15 bg-slate-900/55 overflow-x-auto p-6 backdrop-blur"
      >
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-slate-300">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Phone</th>
              <th className="pb-3 font-medium">Role</th>
              <th className="pb-3 font-medium">Flat ID</th>
              <th className="pb-3 font-medium">Password</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-100">
            {filtered.map((resident) => (
              <tr key={resident.id} className="transition hover:bg-white/5">
                <td className="py-3 font-medium text-white">{resident.name}</td>
                <td className="py-3">{resident.email}</td>
                <td className="py-3">{resident.phone}</td>
                <td className="py-3">{resident.role}</td>
                <td className="py-3">{resident.flat_id}</td>
                <td className="py-3">{resident.password || "********"}</td>
                <td className="py-3">
                  <span
                    className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                      resident.status === "Active" ? "bg-emerald-500/20 text-emerald-100" : "bg-slate-500/20 text-slate-200"
                    }`}
                  >
                    {resident.status}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg p-2 text-cyan-300 transition hover:bg-white/10">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteResident(resident.id)}
                      className="rounded-lg p-2 text-rose-300 transition hover:bg-white/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Add resident modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={addResident}
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/15 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Add Resident</h3>
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
                  placeholder="Full Name"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email Address"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <input
                  required
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone Number"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  <option value="resident">resident</option>
                  <option value="admin">admin</option>
                  <option value="security">security</option>
                </select>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.flatId}
                  onChange={(event) => setForm((prev) => ({ ...prev, flatId: event.target.value }))}
                  placeholder="Flat ID"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Password"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <select
                  value={form.isActive ? "Active" : "Inactive"}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === "Active" }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300/30 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <button className="mt-5 w-full rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500">
                Save Resident
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default Residents;
