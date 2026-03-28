import Link from "next/link";
import { loginWithPassword } from "./auth-actions";

const securityHighlights = [
  {
    title: "Password encryption",
    detail: "Argon2 hashed secrets with rotating salts per tenant.",
  },
  {
    title: "Session intelligence",
    detail: "Device fingerprinting plus idle timeout and forced logout.",
  },
  {
    title: "Audit-ready logs",
    detail: "Capture every stock edit, approval, and role escalation.",
  },
];

const activityFeed = [
  {
    title: "Shelf audit approved",
    detail: "Admin Therese green-lighted 42 SKU adjustments",
    time: "2 min ago",
  },
  {
    title: "Cold storage lock",
    detail: "Staff badge mismatch triggered an immediate hold",
    time: "14 min ago",
  },
  {
    title: "New staff invite",
    detail: "Pending onboarding for Ramon (Night shift)",
    time: "1 hr ago",
  },
];

const quickStats = [
  { label: "Active sessions", value: "24", delta: "+3 vs daily avg" },
  { label: "MFA coverage", value: "96%", delta: "2 users pending" },
  { label: "Blocked attempts", value: "18", delta: "Last 24 hours" },
];

export const metadata = {
  title: "Login | Convenience Store Inventory",
  description: "Secure authentication gateway for admins and staff.",
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    registered?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "missing-fields": "Please enter both email and password.",
  "invalid-credentials": "Invalid email or password.",
  "supabase-not-configured": "Authentication is not configured yet. Contact your admin.",
  "staff-role-required": "This account is not a staff account. Choose Admin or use a staff account.",
  "admin-role-required": "This account does not have admin permissions.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorKey = params?.error;
  const statusRegistered = params?.registered === "1";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.25),transparent_45%),radial-gradient(circle_at_bottom,rgba(14,116,144,0.3),transparent_60%)]" />
      <main className="relative z-10 mx-auto max-w-5xl space-y-10 px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/70 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
              Access gateway
            </p>
            <h1 className="text-2xl font-semibold text-white">
              Log in to the Convenience Store Smart Inventory System
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/50"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.7)]">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
              Secure sign-in
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Admin & Staff authentication
            </h2>
            <p className="mt-3 text-slate-300">
              Validate your role, keep your session compliant, and continue
              orchestrating store inventory without friction.
            </p>

            {statusRegistered && (
              <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Staff account created. You can now log in.
              </div>
            )}

            {errorKey && errorMessages[errorKey] && (
              <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessages[errorKey]}
              </div>
            )}

            <form action={loginWithPassword} className="mt-8 space-y-6">
              <label className="block text-sm">
                <span className="text-slate-300">Work email</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@storehq.com"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="block text-sm">
                <span className="text-slate-300">Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400"
                />
              </label>

              <fieldset className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <legend className="px-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                  Select role
                </legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {["Admin", "Staff"].map((role) => (
                    <label
                      key={role}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/60"
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        className="h-4 w-4 cursor-pointer accent-cyan-400"
                        defaultChecked={role === "Staff"}
                      />
                      <div>
                        <p className="font-semibold">{role}</p>
                        <p className="text-xs text-slate-400">
                          {role === "Admin"
                            ? "Product, user, and report control"
                            : "Stock updates & monitoring"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-emerald-400" />
                  Keep me signed in on this device
                </label>
                <Link href="#" className="text-cyan-300 hover:text-cyan-200">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-linear-to-r from-cyan-300 to-emerald-400 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:brightness-105"
              >
                Enter control center
              </button>

              <div className="text-center text-xs text-slate-400">
                <p>Need a staff account?</p>
                <Link href="/signup" className="mt-1 inline-block text-cyan-300 hover:text-cyan-200">
                  Create a staff account
                </Link>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-amber-300">
                Real-time posture
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-400">{stat.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-cyan-200">{stat.delta}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                Security stack
              </p>
              <div className="mt-4 space-y-4">
                {securityHighlights.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
                Activity feed
              </p>
              <ul className="mt-4 space-y-4 text-sm">
                {activityFeed.map((event) => (
                  <li key={event.title} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{event.title}</p>
                      <p className="text-slate-400">{event.detail}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {event.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
