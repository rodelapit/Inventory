"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronRight, Home, Package, ShieldCheck, Users } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Products", href: "/products", icon: Package },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative border-b border-slate-900/8 bg-[rgba(255,255,255,0.76)] text-slate-900 backdrop-blur-2xl lg:h-screen lg:border-r lg:border-b-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_34%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_30%)]" />

      <div className="relative border-b border-slate-900/8 px-4 py-4 sm:px-5 lg:hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-[0.18em] text-slate-950">SMARTSTOCK</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">Operations hub</p>
          </div>
          <div className="rounded-full border border-slate-900/8 bg-white/80 px-3 py-1.5 text-right shadow-[0_18px_40px_rgba(148,163,184,0.16)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
              Network
            </p>
            <p className="text-sm font-bold text-slate-950">Stable</p>
          </div>
        </div>

        <nav className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-emerald-500/18 bg-emerald-500/10 text-slate-950 shadow-[0_18px_34px_rgba(16,185,129,0.12)]"
                    : "border-slate-900/8 bg-white/60 text-slate-600 hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative hidden h-full flex-col overflow-x-hidden overflow-y-auto lg:flex">
        <div className="border-b border-slate-900/8 px-5 py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/14 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Live workspace
          </div>
          <p className="mt-4 text-2xl font-extrabold tracking-[0.2em] text-slate-950">SMARTSTOCK</p>
          <p className="mt-2 max-w-[16rem] text-sm leading-6 text-slate-600">
            Real-time inventory, stock movement, and team activity in one place.
          </p>
        </div>

        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Navigation
          </p>
          <nav className="mt-4 grid gap-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "border-emerald-500/18 bg-white text-slate-950 shadow-[0_22px_40px_rgba(148,163,184,0.2)]"
                      : "border-slate-900/8 bg-[rgba(255,255,255,0.55)] text-slate-600 hover:border-slate-900/12 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                        active
                          ? "border-emerald-500/18 bg-emerald-500/10 text-emerald-700"
                          : "border-slate-900/8 bg-white/70 text-slate-500 group-hover:text-slate-950"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition ${active ? "text-emerald-700" : "text-slate-300 group-hover:text-slate-500"}`} />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-5">
          <div className="overflow-hidden rounded-[30px] border border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(240,249,255,0.8))] p-5 shadow-[0_24px_60px_rgba(148,163,184,0.2)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Warehouse health
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-bold text-slate-950">94%</p>
                <p className="mt-1 text-sm text-slate-600">Tasks closed on time</p>
              </div>
              <span className="rounded-full border border-emerald-500/18 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                +6.4%
              </span>
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-slate-200">
              <div className="h-2.5 w-[94%] rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,1),rgba(14,165,233,1))]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="rounded-2xl border border-slate-900/8 bg-white/80 p-3">
                <p className="text-slate-500">Orders staged</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">184 ready</p>
              </div>
              <div className="rounded-2xl border border-slate-900/8 bg-white/80 p-3">
                <p className="text-slate-500">At risk</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">9 SKUs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
