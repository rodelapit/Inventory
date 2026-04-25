import { BarChart3, Boxes, ShieldCheck } from "lucide-react";
import { LoginFormCard } from "@/components/auth/LoginFormCard";
import { loginWithPassword } from "./auth-actions";

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
  "invalid-credentials": "Invalid credentials or insufficient permissions.",
  "supabase-not-configured": "Authentication is not configured yet. Contact your admin.",
  "staff-role-required": "This account does not have staff access.",
  "admin-role-required": "This account does not have admin access.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorKey = params?.error;
  const statusRegistered = params?.registered === "1";
  const statusMessage = statusRegistered ? "Staff account created. You can now log in." : null;

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-900">
      <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(520px,1fr)]">
        <section className="relative overflow-hidden bg-[linear-gradient(165deg,#2f5be7_0%,#1f5fe3_35%,#0f8aa1_100%)] px-6 py-10 text-white sm:px-8 lg:px-10 lg:py-12">
          <div className="absolute -right-28 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">SmartStock</p>
                  <p className="text-xs text-white/80">Secure Login</p>
                </div>
              </div>

              <h2 className="mt-14 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.02em]">
                Inventory and operations management for your team
              </h2>
              <p className="mt-5 max-w-xl text-xl leading-relaxed text-white/80">
                Real-time tracking, role-based access, and powerful analytics to streamline your warehouse operations.
              </p>

              <div className="mt-10 grid max-w-2xl gap-4">
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <BarChart3 className="mt-0.5 h-5 w-5 text-cyan-100" />
                  <div>
                    <p className="text-xl font-semibold">Real-time Analytics</p>
                    <p className="text-base text-white/80">Track inventory levels and trends as they happen.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-100" />
                  <div>
                    <p className="text-xl font-semibold">Enterprise Security</p>
                    <p className="text-base text-white/80">Bank-level encryption and audit trails for every action.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-auto inline-flex items-center gap-2 pt-8 text-sm text-white/85">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              All systems operational
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <LoginFormCard
            action={loginWithPassword}
            title="Sign in to SmartStock"
            subtitle="Access your admin or staff workspace"
            loginPath="/login"
            defaultRole="Admin"
            allowRoleSelection
            roleHint="Admins and staff have different access levels"
            errorMessage={errorKey ? (errorMessages[errorKey] ?? null) : null}
            successMessage={statusMessage}
            forgotPasswordHref="#"
            footerPrimaryLabel="Privacy Policy"
            footerPrimaryHref="#"
            footerSecondaryLabel="Terms of Service"
            footerSecondaryHref="#"
          />
        </section>
      </main>
    </div>
  );
}
