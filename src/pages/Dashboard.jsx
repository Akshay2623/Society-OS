import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import StatCard from "../components/StatCard";
import { ComplaintsPieChart, MaintenanceLineChart } from "../components/Charts";
import { api } from "../services/api";

function timeAgo(isoValue) {
  if (!isoValue) return "just now";
  const diffMin = Math.max(1, Math.floor((Date.now() - new Date(isoValue).getTime()) / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return `${Math.floor(diffHr / 24)} day ago`;
}

function Dashboard() {
  const [summaryStats, setSummaryStats] = useState([]);
  const [maintenanceCollection, setMaintenanceCollection] = useState([]);
  const [complaintCategories, setComplaintCategories] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getDashboardSummary(),
      api.getMaintenance(),
      api.getComplaintCategories(),
      api.getActivities(),
    ])
      .then(([summary, maintenance, categories, activities]) => {
        if (!isMounted) return;
        setSummaryStats([
          { id: 1, title: "Total Residents", value: Number(summary.total_residents || 0), accent: "bg-indigo-500/20 text-indigo-100" },
          { id: 2, title: "Total Flats", value: Number(summary.total_flats || 0), accent: "bg-emerald-500/20 text-emerald-100" },
          { id: 3, title: "Pending Complaints", value: Number(summary.pending_complaints || 0), accent: "bg-amber-500/20 text-amber-100" },
          { id: 4, title: "Monthly Revenue", value: Number(summary.monthly_revenue || 0), prefix: "Rs ", accent: "bg-cyan-500/20 text-cyan-100" },
        ]);
        setMaintenanceCollection(maintenance || []);
        setComplaintCategories(categories || []);
        setRecentActivities((activities || []).map((item, index) => ({
          id: item.id || index + 1,
          message: item.message,
          time: timeAgo(item.created_at),
        })));
      })
      .catch(() => {
        if (!isMounted) return;
        setSummaryStats([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MaintenanceLineChart data={maintenanceCollection} />
        </div>
        <ComplaintsPieChart data={complaintCategories} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur"
      >
        <h3 className="mb-4 text-lg font-semibold text-white">Recent Activities</h3>
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-sm text-slate-100">{activity.message}</p>
              <span className="text-xs font-medium text-slate-300">{activity.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default Dashboard;
