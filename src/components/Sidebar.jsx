import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  UserRoundCheck,
  MessageSquareWarning,
  Receipt,
  Building2,
  LineChart,
  BotMessageSquare,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { getRole } from "../utils/auth";

const navItems = [
  { label: "Dashboard", path: "/admin-dashboard", icon: LayoutDashboard, allowedRoles: ["admin", "resident"] },
  { label: "Residents", path: "/residents", icon: Users, allowedRoles: ["admin"] },
  { label: "Visitors", path: "/visitors", icon: UserRoundCheck, allowedRoles: ["admin", "resident", "security"] },
  { label: "Complaints", path: "/complaints", icon: MessageSquareWarning, allowedRoles: ["admin", "resident"] },
  { label: "Billing", path: "/billing", icon: Receipt, allowedRoles: ["admin", "resident"] },
  { label: "Amenities", path: "/amenities", icon: Building2, allowedRoles: ["admin", "resident"] },
  { label: "Financial", path: "/financial", icon: LineChart, allowedRoles: ["admin", "resident"] },
  { label: "Notices", path: "/notices", icon: Bell, allowedRoles: ["admin"] },
  { label: "AI Assistant", path: "/assistant", icon: BotMessageSquare, allowedRoles: ["admin"] },
];

function Sidebar({ collapsed, setCollapsed, mobile = false, onNavigate }) {
  const role = getRole();
  const visibleItems =
    role === "security" ? navItems.filter((item) => item.path === "/visitors") : navItems.filter((item) => item.allowedRoles.includes(role));

  return (
    <motion.aside
      animate={{ width: collapsed ? 88 : 264 }}
      transition={{ duration: 0.3 }}
      className={`top-0 h-screen flex-col border-r border-white/15 bg-slate-900/70 px-3 py-4 backdrop-blur ${
        mobile ? "flex" : "fixed left-0 z-40 hidden lg:flex"
      }`}
    >
      <div className="mb-6 flex items-center justify-between px-2">
        <div className={`${collapsed ? "hidden" : "block"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Smart Society</p>
          <h1 className="text-lg font-bold text-white">Admin Console</h1>
        </div>
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-xl border border-white/20 p-2 text-slate-300 transition hover:scale-105 hover:bg-white/10"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-soft"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </motion.aside>
  );
}

export default Sidebar;
