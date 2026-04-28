import { Boxes, PackageCheck, ShieldCheck } from "lucide-react";
import { LoginFormCard } from "@/components/auth/LoginFormCard";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
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
  const session = await getCurrentSessionUser();
  if (session?.role === "staff") {
    redirect("/staff");
  }
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorKey = params?.error;
  const statusRegistered = params?.registered === "1";
  const statusMessage = statusRegistered ? "Staff account created. You can now log in." : null;

  return (
    <div
      className="relative min-h-screen overflow-hidden text-slate-900"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(247, 249, 252, 0.84) 0%, rgba(238, 243, 248, 0.9) 100%), url("/login-background.svg")',
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.85fr)]">
        <section className="order-2 relative overflow-hidden bg-[linear-gradient(160deg,rgba(39,86,221,0.82)_0%,rgba(31,97,221,0.76)_30%,rgba(13,142,160,0.76)_100%)] px-6 py-10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-8 lg:order-1 lg:px-10 lg:py-12">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_40%,transparent_40%,transparent_100%)] opacity-70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.14),transparent_18%),radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.1),transparent_16%),radial-gradient(circle_at_70%_80%,rgba(125,211,252,0.2),transparent_18%)]" />
          <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute left-10 top-16 hidden h-36 w-36 rounded-4xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur md:block">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Staff shifts</span>
                <span className="rounded-full bg-emerald-300/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">Active</span>
              </div>
              <div>
                <p className="text-3xl font-semibold">24</p>
                <p className="mt-1 text-sm text-white/75">Tasks ready today</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-16 left-8 hidden h-20 w-44 rounded-[26px] border border-white/20 bg-white/10 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur lg:block">
            <p className="text-xs uppercase tracking-[0.2em] text-white/65">Controlled access</p>
            <p className="mt-1 text-sm font-semibold text-white/90">Operations dashboard</p>
          </div>

          <div className="relative flex h-full flex-col">
            <div>
              <div className="inline-flex items-center gap-3 rounded-[20px] border border-white/20 bg-white/12 px-4 py-2.5 shadow-[0_18px_38px_rgba(15,23,42,0.12)] backdrop-blur">
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
                <div className="flex items-start gap-3 rounded-[22px] border border-white/15 bg-white/12 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.1)] backdrop-blur">
                  <PackageCheck className="mt-0.5 h-5 w-5 text-cyan-100" />
                  <div>
                    <p className="text-lg font-semibold">Fast stock updates</p>
                    <p className="text-sm text-white/80 sm:text-base">Record stock changes and keep shelves synchronized.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-[22px] border border-white/15 bg-white/12 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.1)] backdrop-blur">
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

        <section className="order-1 flex items-center justify-center bg-white/58 px-4 py-8 backdrop-blur-xl sm:px-6 lg:order-2 lg:px-8">
          <LoginFormCard
            action={loginWithPassword}
            title="Sign in to SmartStock"
            subtitle="Access your admin or staff workspace"
            loginPath="/staff/login"
            defaultRole="Staff"
            allowRoleSelection={false}
            roleHint="Admins and staff have different access levels"
            forgotPasswordHref="/forgot-password?loginPath=%2Fstaff%2Flogin"
            errorMessage={errorKey ? (errorMessages[errorKey] ?? null) : null}
            successMessage={statusMessage}
            footerPrimaryLabel="Privacy Policy"
            footerPrimaryHref="/privacy"
            footerSecondaryLabel="Terms of Service"
            footerSecondaryHref="/terms"
          />
        </section>
      </main>
    </div>
  );
}
