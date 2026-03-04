import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ComplaintsPieChart, RevenueExpenseLineChart } from "../components/Charts";
import StatCard from "../components/StatCard";
import { api } from "../services/api";

function Financial() {
  const [kpiCards, setKpiCards] = useState([]);
  const [maintenanceCollection, setMaintenanceCollection] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [defaulters, setDefaulters] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getDashboardSummary(),
      api.getMaintenance(),
      api.getExpenseBreakdown(),
      api.getDefaulters(),
    ])
      .then(([summary, maintenance, expenses, due]) => {
        setKpiCards([
          { id: 1, title: "Total Residents", value: Number(summary.total_residents || 0), accent: "bg-indigo-500/20 text-indigo-100" },
          { id: 2, title: "Total Flats", value: Number(summary.total_flats || 0), accent: "bg-emerald-500/20 text-emerald-100" },
          { id: 3, title: "Monthly Revenue", value: Number(summary.monthly_revenue || 0), prefix: "Rs ", accent: "bg-cyan-500/20 text-cyan-100" },
        ]);
        setMaintenanceCollection(maintenance || []);
        setExpenseBreakdown(expenses || []);
        setDefaulters(due || []);
      })
      .catch(() => {
        setKpiCards([]);
        setMaintenanceCollection([]);
        setExpenseBreakdown([]);
        setDefaulters([]);
      });
  }, []);

  return (
    <section className="space-y-6">
      {/* Finance KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {kpiCards.map((card) => (
          <motion.div key={card.id} whileHover={{ y: -4 }}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Revenue and expense visualizations */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueExpenseLineChart data={maintenanceCollection} />
        </div>
        <ComplaintsPieChart data={expenseBreakdown} />
      </div>

      {/* Defaulters list */}
      <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
        <h3 className="mb-4 text-lg font-semibold text-white">Defaulters List</h3>
        <div className="space-y-3">
          {defaulters.map((item) => (
            <div key={item.flat} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-semibold text-white">{item.name}</p>
                <p className="text-sm text-slate-300">Flat {item.flat}</p>
              </div>
              <p className="font-semibold text-rose-300">Rs {item.due.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Financial;
