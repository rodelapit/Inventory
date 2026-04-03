"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Package, ClipboardList } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const staffNavItems = [
  { label: "Staff Home", href: "/staff", icon: Home },
  { label: "Products", href: "/staff/products", icon: Package },
  { label: "Inventory", href: "/staff/inventory", icon: ClipboardList },
];

export function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const prefetchAll = () => {
      for (const item of staffNavItems) {
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
        .channel("staff-global-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "zones" }, scheduleRefresh)
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
    <aside className="border-b border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.88))] text-slate-800 shadow-[0_18px_60px_rgba(15,23,42,0.06)] lg:h-screen lg:border-r lg:border-b-0">
      <div className="border-b border-emerald-100/70 px-4 py-3 sm:px-5 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xl font-bold tracking-[0.08em] text-emerald-700">SmartStock</p>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Staff Workspace</p>
          </div>
          <div className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-right shadow-[0_12px_28px_rgba(16,185,129,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
              Shift
            </p>
            <p className="text-sm font-bold text-emerald-900">Live</p>
          </div>
        </div>

        <nav className="mt-3 flex flex-wrap gap-2">
          {staffNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onMouseEnter={() => prefetchRoute(item.href)}
              onFocus={() => prefetchRoute(item.href)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                pathname === item.href
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-emerald-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="hidden h-full flex-col overflow-x-hidden overflow-y-auto lg:flex">
        <div className="border-b border-emerald-100/70 px-4 py-3.5 sm:px-5 sm:py-4">
          <p className="text-xl font-bold tracking-[0.08em] text-emerald-700 sm:text-2xl">SmartStock</p>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500 sm:text-sm">Staff Workspace</p>
        </div>

        <div className="px-4 py-3.5 sm:px-5 sm:py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 sm:text-sm">
            Today&apos;s tools
          </p>
          <nav className="mt-4 grid gap-2.5">
            {staffNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-sm font-semibold transition sm:text-base ${
                    active
                      ? "bg-emerald-600 text-white shadow-[0_12px_26px_rgba(16,185,129,0.24)]"
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="h-2 w-2 rounded-full bg-white" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 sm:p-4.5">
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm">
              Shift focus
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Quickly check low stock, expiry alerts, and update quantities as you process sales.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
