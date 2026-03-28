import Link from "next/link";
import { signupStaff } from "../login/auth-actions";

export const metadata = {
  title: "Staff Sign Up | Convenience Store Inventory",
  description: "Create a staff account for the Convenience Store Inventory System.",
};

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "missing-fields": "Please complete all required fields.",
  "password-mismatch": "Passwords do not match.",
  "supabase-not-configured": "Authentication is not configured yet. Contact your admin.",
  "signup-failed": "Could not create account. Try a different email or try again later.",
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const errorKey = params?.error;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_45%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.22),transparent_55%)]" />
      <main className="relative z-10 mx-auto max-w-xl px-6 py-12">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.7)]">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Staff onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Create staff account</h1>
          <p className="mt-3 text-slate-300">
            Register a staff login to access the staff workspace. New accounts are linked to admin user management.
          </p>

          {errorKey && errorMessages[errorKey] && (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessages[errorKey]}
            </div>
          )}

          <form action={signupStaff} className="mt-8 space-y-5">
            <label className="block text-sm">
              <span className="text-slate-300">Full name</span>
              <input
                name="fullName"
                type="text"
                required
                placeholder="Staff member name"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <label className="block text-sm">
              <span className="text-slate-300">Work email</span>
              <input
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
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <label className="block text-sm">
              <span className="text-slate-300">Confirm password</span>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                placeholder="Retype password"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-linear-to-r from-emerald-300 to-cyan-300 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:brightness-105"
            >
              Create staff account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
              Log in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
