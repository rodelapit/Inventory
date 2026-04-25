"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarChart3, ChevronRight, Home, LogOut, Package, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Products", href: "/products", icon: Package },
  { label: "POS", href: "/pos", icon: ReceiptText },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const prefetchAll = () => {
      for (const item of navItems) {
        router.prefetch(item.href);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetchAll);
      return () => window.cancelIdleCallback(id);
    }

    const timeoutId = setTimeout(prefetchAll, 200);
    return () => clearTimeout(timeoutId);
  }, [router]);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();
      let refreshTimer: ReturnType<typeof setTimeout> | null = null;

      const scheduleRefresh = () => {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
        }

        refreshTimer = setTimeout(() => {
          router.refresh();
        }, 350);
      };

      const channel = supabase
        .channel("admin-global-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "zones" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleRefresh)
        .subscribe();

      return () => {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
        }
        channel.unsubscribe();
      };
    } catch {
      return;
    }
  }, [router]);

  const prefetchRoute = (href: string) => {
    router.prefetch(href);
  };

  return (
    <aside className="relative border-b border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,248,252,0.82))] text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:h-screen lg:border-r lg:border-b-0 lg:shadow-[0_28px_80px_rgba(15,23,42,0.1)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.1),transparent_30%)]" />

      <div className="relative border-b border-slate-900/5 px-4 py-4 sm:px-5 lg:hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-[0.22em] text-slate-950">SMARTSTOCK</p>
            <p className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-500">Operations hub</p>
          </div>
          <div className="rounded-full border border-sky-100 bg-white/90 px-3 py-1.5 text-right shadow-[0_18px_40px_rgba(148,163,184,0.14)]">
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
                onMouseEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-emerald-500/20 bg-white text-slate-950 shadow-[0_18px_34px_rgba(16,185,129,0.12)]"
                    : "border-slate-900/6 bg-white/70 text-slate-600 hover:border-slate-900/10 hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action="/logout" method="post" className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </form>
      </div>

      <div className="relative hidden h-full flex-col overflow-x-hidden overflow-y-auto lg:flex">
        <div className="border-b border-slate-900/5 px-5 py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.1)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Live workspace
          </div>
          <p className="mt-4 text-2xl font-extrabold tracking-[0.22em] text-slate-950">SMARTSTOCK</p>
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
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
                  className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "border-emerald-500/20 bg-white text-slate-950 shadow-[0_18px_42px_rgba(15,23,42,0.12)]"
                      : "border-slate-900/6 bg-white/70 text-slate-600 hover:border-slate-900/10 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                        active
                          ? "border-emerald-500/20 bg-emerald-50 text-emerald-700"
                            : "border-slate-900/6 bg-slate-50 text-slate-500 group-hover:text-slate-950"
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
          <form action="/logout" method="post" className="mb-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>

          <div className="overflow-hidden rounded-[28px] border border-slate-900/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(240,249,255,0.82))] p-5 shadow-[0_24px_60px_rgba(148,163,184,0.16)]">
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
