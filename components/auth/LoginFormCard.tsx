"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Info, Lock, Mail, ShieldCheck } from "lucide-react";

type LoginFormCardProps = {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  subtitle: string;
  loginPath: string;
  defaultRole: "Admin" | "Staff";
  allowRoleSelection?: boolean;
  roleHint?: string;
  errorMessage?: string | null;
  successMessage?: string | null;
  forgotPasswordHref?: string;
  footerPrimaryLabel?: string;
  footerPrimaryHref?: string;
  footerSecondaryLabel?: string;
  footerSecondaryHref?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      suppressHydrationWarning
      type="submit"
      disabled={pending}
      className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-[linear-gradient(90deg,#7ea5ef,#6cb5dc)] px-4 text-base font-semibold text-white shadow-[0_14px_30px_rgba(46,102,196,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-r-transparent" />
          Signing in...
        </span>
      ) : (
        "Sign In"
      )}
    </button>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();

  return (
    <button
      suppressHydrationWarning
      type="button"
      disabled
      aria-disabled="true"
      title="Google OAuth UI is ready. Wire your Supabase OAuth callback when needed."
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-75"
    >
      <span className="text-xl leading-none">G</span>
      {pending ? "Please wait..." : "Continue with Google"}
    </button>
  );
}

export function LoginFormCard({
  action,
  title,
  subtitle,
  loginPath,
  defaultRole,
  allowRoleSelection = true,
  roleHint = "Admins and staff have different access levels",
  errorMessage,
  successMessage,
  forgotPasswordHref = "#",
  footerPrimaryLabel,
  footerPrimaryHref,
  footerSecondaryLabel,
  footerSecondaryHref,
}: LoginFormCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"Admin" | "Staff">(defaultRole);

  return (
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure login
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-950">{title}</h1>
        <p className="mt-2 text-base text-slate-500">{subtitle}</p>
      </div>

      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <form action={action} suppressHydrationWarning className="space-y-4">
        <input type="hidden" name="loginPath" value={loginPath} />

        {allowRoleSelection ? (
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-slate-800">Workspace role</span>
            <select
              suppressHydrationWarning
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "Admin" | "Staff")}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none ring-0 transition focus:border-sky-400 focus:shadow-[0_0_0_4px_rgba(56,189,248,0.14)]"
            >
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="role" value={defaultRole} />
        )}

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-slate-800">Email address</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              suppressHydrationWarning
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-base text-slate-900 outline-none ring-0 transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.14)]"
            />
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-slate-800">Password</span>
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              suppressHydrationWarning
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-base text-slate-900 outline-none ring-0 transition focus:border-emerald-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(16,185,129,0.14)]"
            />
            <button
              suppressHydrationWarning
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <div className="flex items-center justify-between gap-3 pt-0.5 text-sm">
          <label className="flex items-center gap-2 text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600" />
            Remember me
          </label>
          <Link href={forgotPasswordHref} className="font-medium text-sky-600 transition hover:text-sky-700">
            Forgot password?
          </Link>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-sm text-sky-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{roleHint}</span>
        </div>

        <SubmitButton />

        <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <GoogleButton />
      </form>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          {footerPrimaryLabel && footerPrimaryHref ? (
            <Link href={footerPrimaryHref} className="font-medium text-slate-500 transition hover:text-slate-700">
              {footerPrimaryLabel}
            </Link>
          ) : null}
          {footerSecondaryLabel && footerSecondaryHref ? (
            <Link href={footerSecondaryHref} className="font-medium text-slate-500 transition hover:text-slate-700">
              {footerSecondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
