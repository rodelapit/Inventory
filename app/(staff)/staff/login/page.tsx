import { Boxes, PackageCheck, ShieldCheck } from "lucide-react";
import { LoginFormCard } from "@/components/auth/LoginFormCard";
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
  "invalid-credentials": "Invalid credentials or insufficient permissions.",
  "supabase-not-configured": "Authentication is not configured yet. Contact your admin.",
  "staff-role-required": "This account is not assigned as staff.",
  "admin-role-required": "Use the admin login for admin accounts.",
};

export default async function StaffLoginPage({ searchParams }: StaffLoginPageProps) {
  const params = await searchParams;
  const errorKey = params?.error;
  const statusRegistered = params?.registered === "1";
  const statusMessage = statusRegistered ? "Staff account created. You can now log in." : null;

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-900">
      <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.85fr)]">
        <section className="order-2 relative overflow-hidden bg-[linear-gradient(165deg,#2756dd_0%,#1d5fd9_35%,#11869a_100%)] px-6 py-10 text-white sm:px-8 lg:order-1 lg:px-10 lg:py-12">
          <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">SmartStock</p>
                  <p className="text-xs text-white/80">Staff Workspace</p>
                </div>
              </div>

              <h2 className="mt-14 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
                Stay on top of stock updates in real time
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
                Access operational tools built for staff workflows with secure, role-based controls.
              </p>

              <div className="mt-9 grid max-w-xl gap-4">
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <PackageCheck className="mt-0.5 h-5 w-5 text-cyan-100" />
                  <div>
                    <p className="text-lg font-semibold">Fast stock updates</p>
                    <p className="text-sm text-white/80 sm:text-base">Record stock changes and keep shelves synchronized.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-100" />
                  <div>
                    <p className="text-lg font-semibold">Protected operations</p>
                    <p className="text-sm text-white/80 sm:text-base">Every action is scoped by role and logged for audit.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-auto inline-flex items-center gap-2 pt-8 text-sm text-white/85">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              Secure staff access enabled
            </p>
          </div>
        </section>

        <section className="order-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:order-2 lg:px-8">
          <LoginFormCard
            action={loginWithPassword}
            title="Sign in to SmartStock"
            subtitle="Access your admin or staff workspace"
            loginPath="/staff/login"
            defaultRole="Staff"
            allowRoleSelection={false}
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
