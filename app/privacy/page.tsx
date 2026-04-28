import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Convenience Store Inventory",
  description: "Privacy policy for the Convenience Store Inventory System.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.7)]">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Privacy</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-4 text-slate-300">
          This system stores account and inventory data needed to run the business, secure access, and support audit trails.
        </p>
        <div className="mt-8 space-y-4 text-sm leading-6 text-slate-300">
          <p>We use sign-in credentials only for access control and session management.</p>
          <p>Operational data such as products, sales, zones, and reports is processed to support store operations.</p>
          <p>Contact your administrator before enabling any new third-party integrations.</p>
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