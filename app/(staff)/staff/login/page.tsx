import Link from "next/link";
import { loginWithPassword } from "../../../login/auth-actions";

export const metadata = {
  title: "Staff Login | Convenience Store Inventory",
  description: "Staff authentication for the Convenience Store Inventory System.",
};

type StaffLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    registered?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "missing-fields": "Please enter both email and password.",
  "invalid-credentials": "Invalid email or password.",
  "supabase-not-configured": "Authentication is not configured yet. Contact your admin.",
  "staff-role-required": "This account is not assigned as staff.",
  "admin-role-required": "Use the admin login for admin accounts.",
};

export default async function StaffLoginPage({ searchParams }: StaffLoginPageProps) {
  const params = await searchParams;
  const errorKey = params?.error;
  const statusRegistered = params?.registered === "1";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_45%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.22),transparent_55%)]" />
      <main className="relative z-10 mx-auto max-w-xl px-6 py-12">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.7)]">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Staff workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Staff login</h1>
          <p className="mt-3 text-slate-300">
            Sign in with your staff account to access stock operations and inventory updates.
          </p>

          {statusRegistered && (
            <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Staff account created. You can now log in.
            </div>
          )}

          {errorKey && errorMessages[errorKey] && (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessages[errorKey]}
            </div>
          )}

          <form action={loginWithPassword} className="mt-8 space-y-5">
            <input type="hidden" name="role" value="Staff" />
            <input type="hidden" name="loginPath" value="/staff/login" />

            <label className="block text-sm">
              <span className="text-slate-300">Work email</span>
              <input
                suppressHydrationWarning
                name="email"
                type="email"
                required
                placeholder="staff@store.com"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <label className="block text-sm">
              <span className="text-slate-300">Password</span>
              <input
                suppressHydrationWarning
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <button
              suppressHydrationWarning
              type="submit"
              className="w-full rounded-2xl bg-linear-to-r from-emerald-300 to-cyan-300 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:brightness-105"
            >
              Log in to staff dashboard
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-400">
            <Link href="/signup" className="text-cyan-300 hover:text-cyan-200">
              Create staff account
            </Link>
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
              Admin login
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
