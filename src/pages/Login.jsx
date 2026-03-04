import { useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { getRole, getRoleHome, getToken, isTokenStructurallyValid, saveAuth } from "../utils/auth";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "resident", label: "Resident" },
  { value: "security", label: "Security" },
];

function Login() {
  const navigate = useNavigate();
  const existingToken = getToken();
  const existingRole = getRole();
  const shouldRedirect = useMemo(
    () => Boolean(existingToken && isTokenStructurallyValid(existingToken) && existingRole),
    [existingToken, existingRole]
  );

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "admin",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Enter a valid email";
    if (!form.password) nextErrors.password = "Password is required";
    if (!form.role) nextErrors.role = "Role is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await api.login(form);
      saveAuth(data.token, data.role);
      navigate(getRoleHome(data.role), { replace: true });
    } catch (error) {
      const message = error?.message || "Unable to login. Please try again.";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  if (shouldRedirect) {
    return <Navigate to={getRoleHome(existingRole)} replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#1e1b4b_0%,#0b143a_45%,#071226_100%)] p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm md:grid-cols-[1.1fr_0.9fr]">
        <section className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-cyan-950 p-8 text-white sm:p-10">
          <img
            src="/autovyn-logo.jpg"
            alt="Autovyn logo"
            className="h-auto w-full max-w-md rounded-xl bg-white p-3 shadow-lg"
          />
          <p className="mt-6 inline-flex rounded-full border border-cyan-300/40 bg-cyan-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-100">
            Launched by Autovyn
          </p>
          <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">Smart Society OS</h1>
          <p className="mt-3 max-w-lg text-sm text-slate-200 sm:text-base">
            One secure platform for residents, security teams, and admins to run operations faster.
          </p>
        </section>

        <section className="bg-white p-7 sm:p-9">
          <div className="mb-6">
            <div className="mb-3 inline-flex rounded-xl bg-indigo-100 p-2 text-indigo-600">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Secure Sign In</h2>
            <p className="mt-1 text-sm text-slate-500">Continue to your dashboard</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                placeholder="admin@society.com"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
              <div className="flex items-center rounded-2xl border border-slate-200 bg-white pr-2 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-200">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Role</label>
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-rose-600">{errors.role}</p>}
            </div>

            {serverError && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {loading ? "Signing In..." : "Login"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Login;
