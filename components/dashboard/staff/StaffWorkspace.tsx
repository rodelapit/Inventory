import Link from "next/link";
import { ThemeProvider } from "../../ThemeProvider/ThemeProvider";
import { StaffSidebar } from "./StaffSidebar";
import { StaffHeroSectionLive } from "./StaffHeroSectionLive";
import { ProductManagementSectionLive } from "../shared/ProductManagementSectionLive";
import { AlertCard } from "../shared/AlertCard";
import type { DashboardData } from "@/data/dashboard";
import type { AdminPerformanceData } from "@/lib/dashboard/get-admin-performance-data";
import { StaffShiftTracker } from "./StaffShiftTracker";
import { BarChart3, CalendarDays, CreditCard, ReceiptText, ShoppingCart, Tag } from "lucide-react";

export function StaffWorkspaceShell({
  title,
  subtitle,
  badgeLabel,
  children,
}: {
  title: string;
  subtitle: string;
  badgeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-(--bg) text-(--text)">
      <ThemeProvider initial="staff">
        <div className="grid min-h-screen lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]">
          <StaffSidebar />

          <main className="flex min-w-0 flex-col bg-(--bg)">
            <header className="flex shrink-0 items-center justify-between border-b border-emerald-100 bg-white px-4 py-3 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Staff workspace</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{subtitle}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500">
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400/40" />
                  </span>
                  <span className="whitespace-nowrap">{badgeLabel}</span>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 sm:px-8 lg:px-10">
              <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
            </div>
          </main>
        </div>
      </ThemeProvider>
    </div>
  );
}

export function StaffDashboardView({
  dashboardData,
  liveDataUnavailable,
}: {
  dashboardData: DashboardData;
  liveDataUnavailable: boolean;
}) {
  return (
    <StaffWorkspaceShell title="Staff Dashboard" subtitle="Today's store operations" badgeLabel="On shift">
      {liveDataUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Live data unavailable. Supabase is not configured, so staff data may be empty.
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/staff/pos" className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-[0_18px_40px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50">
          Open POS
          <span className="mt-1 block text-xs font-normal text-slate-500">Start a sale or process a refund.</span>
        </Link>
        <Link href="/staff/alerts" className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-[0_18px_40px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50">
          View alerts
          <span className="mt-1 block text-xs font-normal text-slate-500">Check stock, expiry, and zone issues.</span>
        </Link>
        <Link href="/staff/reports" className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-[0_18px_40px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50">
          Open reports
          <span className="mt-1 block text-xs font-normal text-slate-500">Review sales activity and operational trends.</span>
        </Link>
        <Link href="/staff/transactions" className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-[0_18px_40px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50">
          View transactions
          <span className="mt-1 block text-xs font-normal text-slate-500">Inspect recent orders and payment details.</span>
        </Link>
      </section>

      <StaffHeroSectionLive
        systemStatusTitle={dashboardData.systemStatusTitle}
        systemStatusMessage={dashboardData.systemStatusMessage}
        statCards={dashboardData.statCards}
        initialZoneCards={dashboardData.zoneCards}
        activeAlerts={dashboardData.activeAlerts}
        initialProductFeed={dashboardData.productFeed}
      />

      <section aria-label="Staff product view" className="scroll-mt-4 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-(--card-bg) pt-3.5 shadow-[0_20px_50px_rgba(148,163,184,0.14)] lg:flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 sm:px-5 lg:px-6 lg:pb-4">
          <div>
            <h2 className="text-2xl font-bold text-emerald-950 sm:text-3xl">Products &amp; Stock</h2>
            <p className="mt-1 text-sm text-slate-600">View products, update quantities, and check low / expiring items.</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-3.5 pb-3.5 sm:px-5 lg:px-6 lg:pb-5">
          <ProductManagementSectionLive initialProductFeed={dashboardData.productFeed} />
        </div>
      </section>
    </StaffWorkspaceShell>
  );
}

export function StaffAlertsView({
  performanceData,
  liveDataUnavailable,
}: {
  performanceData: AdminPerformanceData;
  liveDataUnavailable: boolean;
}) {
  const alertsRaw = performanceData.alertsCenter;
  const alerts = alertsRaw.map((alert) => ({
    id: alert.id,
    title: alert.title,
    message: alert.message,
    age: alert.metric,
    type: (alert.severity === "critical" ? "error" : alert.severity === "warning" ? "warning" : "info") as "warning" | "error" | "info",
  }));
  const criticalCount = alertsRaw.filter((alert) => alert.severity === "critical").length;
  const warningCount = alertsRaw.filter((alert) => alert.severity === "warning").length;
  const infoCount = alertsRaw.filter((alert) => alert.severity === "info").length;

  return (
    <StaffWorkspaceShell title="Alerts Center" subtitle="Alerts center" badgeLabel="Action queue">
      {liveDataUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Live data unavailable. Supabase is not configured, so alerts are using the last available snapshot.
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">Alerts Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Track stock, expiry, returns, and zone pressure in one place so the team can respond quickly.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Critical</p>
          <p className="mt-4 text-2xl font-bold text-rose-950">{criticalCount}</p>
          <p className="mt-1 text-sm text-rose-800">Items that need immediate action.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Warnings</p>
          <p className="mt-4 text-2xl font-bold text-amber-950">{warningCount}</p>
          <p className="mt-1 text-sm text-amber-800">Watchlist items that should be handled soon.</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Info</p>
          <p className="mt-4 text-2xl font-bold text-sky-950">{infoCount}</p>
          <p className="mt-1 text-sm text-sky-800">Non-urgent status updates and safe-state notices.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
        <h2 className="text-xl font-semibold text-emerald-950">Open alerts</h2>
        <div className="mt-5 grid gap-4">
          {alerts.length > 0 ? alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No open alerts right now.</div>
          )}
        </div>
      </section>
    </StaffWorkspaceShell>
  );
}

export function StaffReportsView({
  performanceData,
  liveDataUnavailable,
}: {
  performanceData: AdminPerformanceData;
  liveDataUnavailable: boolean;
}) {
  const totalRevenue = performanceData.overviewCards[0]?.value ?? "₱0.00";
  const totalOrders = performanceData.overviewCards[2]?.value ?? "0";
  const criticalItems = performanceData.overviewCards[3]?.value ?? "0";
  const alertCount = performanceData.alertsCenter.length;

  return (
    <StaffWorkspaceShell title="Staff Reports" subtitle="Operational reports" badgeLabel="Live summary">
      {liveDataUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Live data unavailable. Supabase is not configured, so reports are using the last available snapshot.
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">Staff Reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">A compact operational view for sales activity, inventory pressure, and current alerts.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Revenue" value={totalRevenue} description="Sales total captured from the live order feed." />
        <MetricCard title="Orders" value={totalOrders} description="Total orders currently available in the dataset." />
        <MetricCard title="Critical items" value={criticalItems} description="Items that need immediate attention from staff." />
        <MetricCard title="Active alerts" value={alertCount} description="Open inventory or order alerts requiring action." />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-emerald-950">Recent activity</h2>
              <p className="mt-1 text-sm text-slate-600">Most recent orders and fulfillment updates.</p>
            </div>
            <CalendarDays className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {performanceData.recentOrders.length > 0 ? performanceData.recentOrders.map((order) => (
                  <tr key={order.id} className="text-slate-700">
                    <td className="px-4 py-3 font-medium text-slate-950">{order.orderNumber}</td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3">{order.amount}</td>
                    <td className="px-4 py-3"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{order.status}</span></td>
                  </tr>
                )) : (
                  <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={4}>No recent orders are available yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
            <h2 className="text-xl font-semibold text-emerald-950">Quick reading</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>• Use POS for live checkout updates.</p>
              <p>• Check Inventory for zone pressure and stock balance.</p>
              <p>• Open Alerts for urgent issues that need action now.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
            <h2 className="text-xl font-semibold text-emerald-950">What this covers</h2>
            <p className="mt-2 text-sm text-slate-600">A staff-friendly view of sales activity and stock pressure, without the admin-only controls.</p>
          </div>
        </aside>
      </section>
    </StaffWorkspaceShell>
  );
}

export function StaffProfileView({
  userId,
  email,
  role,
}: {
  userId: string;
  email: string | null;
  role: string;
}) {
  return (
    <StaffWorkspaceShell title="Shift Profile" subtitle="Shift profile" badgeLabel="Session active">
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">Shift Profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Clock in, clock out, and keep a quick local shift note for the current session.</p>
        </div>
      </section>

      <StaffShiftTracker userId={userId} email={email} role={role} />
    </StaffWorkspaceShell>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">{title}</p>
        {icon ?? <BarChart3 className="h-5 w-5 text-emerald-600" />}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}
