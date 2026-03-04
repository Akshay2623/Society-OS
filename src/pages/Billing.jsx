import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { RevenueBarChart } from "../components/Charts";
import { api } from "../services/api";

const toAmount = (value) => Number(value) || 0;
const formatINR = (value) => `₹${toAmount(value).toLocaleString("en-IN")}`;

function Billing() {
  const [billingData, setBillingData] = useState([]);
  const [maintenanceCollection, setMaintenanceCollection] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([api.getBilling(), api.getMaintenance()])
      .then(([billing, maintenance]) => {
        setBillingData(billing || []);
        setMaintenanceCollection(maintenance || []);
      })
      .catch(() => {
        setBillingData([]);
        setMaintenanceCollection([]);
      });
  }, []);

  const totalRevenue = billingData
    .filter((item) => item.status === "Paid")
    .reduce((sum, item) => sum + toAmount(item.amount), 0);
  const outstanding = billingData
    .filter((item) => item.status === "Unpaid")
    .reduce((sum, item) => sum + toAmount(item.amount), 0);

  return (
    <section className="space-y-6">
      {/* Revenue summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
          <p className="text-sm text-slate-300">Collected This Month</p>
          <h3 className="mt-2 text-3xl font-bold text-emerald-300">{formatINR(totalRevenue)}</h3>
        </motion.div>
        <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
          <p className="text-sm text-slate-300">Outstanding Amount</p>
          <h3 className="mt-2 text-3xl font-bold text-rose-300">{formatINR(outstanding)}</h3>
        </motion.div>
      </div>

      <RevenueBarChart data={maintenanceCollection} />

      {/* Payments table */}
      <div className="rounded-2xl border border-white/15 bg-slate-900/55 overflow-x-auto p-6 backdrop-blur">
        <h3 className="mb-4 text-lg font-semibold text-white">Payment Records</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-300">
              <th className="pb-3">Invoice</th>
              <th className="pb-3">Resident</th>
              <th className="pb-3">Flat</th>
              <th className="pb-3">Month</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-100">
            {billingData.map((row) => (
              <tr key={row.id}>
                <td className="py-3 font-medium">{row.id}</td>
                <td className="py-3">{row.resident}</td>
                <td className="py-3">{row.flat}</td>
                <td className="py-3">{row.month}</td>
                <td className="py-3">{formatINR(row.amount)}</td>
                <td className="py-3">
                  <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${row.status === "Paid" ? "bg-emerald-500/20 text-emerald-100" : "bg-rose-500/20 text-rose-100"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => api.getPaymentHistory(row.id).then(setSelected).catch(() => setSelected(row))}
                    className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment history modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-soft"
            >
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">Payment History</h4>
                <button onClick={() => setSelected(null)} className="rounded-xl p-2 text-slate-200 hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 text-sm text-slate-200">
                <p>Invoice: <span className="font-semibold">{selected.id}</span></p>
                <p>Resident: <span className="font-semibold">{selected.resident}</span></p>
                <p>Flat: <span className="font-semibold">{selected.flat}</span></p>
                <p>Amount: <span className="font-semibold">{formatINR(selected.amount)}</span></p>
                <p>Status: <span className="font-semibold">{selected.status}</span></p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default Billing;
