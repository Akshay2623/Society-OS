import { LogOut } from "lucide-react";
import { clearAuth } from "../utils/auth";

function ResidentDashboard() {
  return (
    <div className="min-h-screen bg-hero-gradient p-4 sm:p-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Resident Dashboard</h1>
          <button
            onClick={() => {
              clearAuth();
              window.location.href = "/login";
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
        <p className="text-slate-600">Welcome. Your resident portal is authenticated and protected.</p>
      </div>
    </div>
  );
}

export default ResidentDashboard;
