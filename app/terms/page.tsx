import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Convenience Store Inventory",
  description: "Terms of service for the Convenience Store Inventory System.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.7)]">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Terms</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Terms of Service</h1>
        <p className="mt-4 text-slate-300">
          This internal system is for authorized store staff and administrators only.
        </p>
        <div className="mt-8 space-y-4 text-sm leading-6 text-slate-300">
          <p>Use your own account and do not share credentials.</p>
          <p>Inventory, sales, and user management actions may be logged for operational and audit purposes.</p>
          <p>Administrators are responsible for account provisioning and access control.</p>
        </div>
        <p className="mt-8">
          <Link href="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}