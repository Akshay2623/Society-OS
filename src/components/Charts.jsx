import {
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ErrorBar,
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

export function VisitorsCandleChart({ data }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-white">Visitors Candle Trend</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
            <XAxis dataKey="label" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" allowDecimals={false} />
            <Tooltip
              formatter={(value, key) => {
                if (key === "bodySize" || key === "bodyBase" || key === "wickCenter") return null;
                return [value, key];
              }}
            />

            {/* Transparent stack base to position candle body between open/close */}
            <Bar dataKey="bodyBase" stackId="candle" fill="transparent" />
            <Bar dataKey="bodySize" stackId="candle" radius={[4, 4, 0, 0]}>
              {data.map((row) => (
                <Cell key={row.label} fill={row.trend === "up" ? "#10B981" : "#F43F5E"} />
              ))}
            </Bar>

            {/* Wick from low to high */}
            <Line dataKey="wickCenter" stroke="transparent" dot={false} activeDot={false}>
              <ErrorBar dataKey="wickRange" width={6} stroke="#94A3B8" direction="y" />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-300">Open: Pending, Close: Approved+Exited, High: Total visitors, Low: Rejected.</p>
    </div>
  );
}
