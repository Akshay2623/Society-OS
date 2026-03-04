import CountUp from "react-countup";
import { motion } from "framer-motion";

function StatCard({ title, value, prefix = "", accent }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-300">{title}</p>
        <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${accent}`}>Live</span>
      </div>
      <h3 className="mt-4 text-3xl font-bold text-white">
        <CountUp end={value} duration={1.8} separator="," prefix={prefix} />
      </h3>
    </motion.article>
  );
}

export default StatCard;
