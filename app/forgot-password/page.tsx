import Link from "next/link";
import { requestPasswordReset } from "../login/auth-actions";

export const metadata = {
  title: "Forgot Password | Convenience Store Inventory",
  description: "Request a password reset link for your account.",
};

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    sent?: string;
    loginPath?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "missing-fields": "Enter the email address linked to your account.",
  "supabase-not-configured": "Password reset is not configured yet. Contact your admin.",
  "reset-failed": "We could not send the reset link. Try again in a moment.",
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const loginPath = params?.loginPath && params.loginPath.startsWith("/") ? params.loginPath : "/login";
  const errorKey = params?.error;
  const sent = params?.sent === "1";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#f7fafc_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Account recovery</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Reset your password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter the email you use to sign in. We’ll send you a secure reset link.
          </p>

          {sent ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              If the email exists, a reset link has been sent.
            </div>
          ) : null}

          {errorKey ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {errorMessages[errorKey] ?? "Unable to start password reset."}
            </div>
          ) : null}

          <form action={requestPasswordReset} className="mt-8 space-y-5">
            <input type="hidden" name="loginPath" value={loginPath} />
            <label className="block text-sm">
              <span className="font-semibold text-slate-800">Email address</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Send reset link
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Back to sign in?{" "}
            <Link href={loginPath} className="font-medium text-sky-700 hover:text-sky-800">
              Return to login
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}