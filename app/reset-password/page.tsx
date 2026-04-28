import Link from "next/link";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { updatePassword } from "../login/auth-actions";

export const metadata = {
  title: "Reset Password | Convenience Store Inventory",
  description: "Set a new password after following a recovery link.",
};

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    loginPath?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "missing-fields": "Enter and confirm your new password.",
  "password-mismatch": "The passwords do not match.",
  "reset-failed": "We could not update the password. Try again.",
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const session = await getCurrentSessionUser();
  const params = await searchParams;
  const loginPath = params?.loginPath && params.loginPath.startsWith("/") ? params.loginPath : "/login";
  const errorKey = params?.error;

  if (!session) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#f7fafc_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
          <section className="w-full rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Password reset</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Recovery link required</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Open the password reset link from your email to continue.
            </p>
            <p className="mt-6 text-sm text-slate-500">
              <Link href={loginPath} className="font-medium text-sky-700 hover:text-sky-800">
                Return to login
              </Link>
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#f7fafc_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Password reset</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Choose a new password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Set a stronger password for your account to complete recovery.
          </p>

          {errorKey ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {errorMessages[errorKey] ?? "Unable to update password."}
            </div>
          ) : null}

          <form action={updatePassword} className="mt-8 space-y-5">
            <input type="hidden" name="loginPath" value={loginPath} />
            <label className="block text-sm">
              <span className="font-semibold text-slate-800">New password</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            <label className="block text-sm">
              <span className="font-semibold text-slate-800">Confirm password</span>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter password"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Update password
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}