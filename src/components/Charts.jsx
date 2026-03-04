import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";

const piePalette = ["#4F46E5", "#10B981", "#22C55E", "#06B6D4", "#60A5FA"];

export function MaintenanceLineChart({ data }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-white">Monthly Maintenance Collection</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Line type="monotone" dataKey="collection" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ComplaintsPieChart({ data }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-white">Complaint Categories</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} label>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={piePalette[index % piePalette.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RevenueBarChart({ data }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-white">Monthly Revenue Trends</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#06B6D4" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RevenueExpenseLineChart({ data }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-white">Revenue vs Expense</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
            <XAxis dataKey="month" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#06B6D4" strokeWidth={3} />
            <Line type="monotone" dataKey="expense" stroke="#22C55E" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
