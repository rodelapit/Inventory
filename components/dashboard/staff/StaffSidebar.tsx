"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ClipboardList } from "lucide-react";

const staffNavItems = [
  { label: "Staff Home", href: "/staff", icon: Home },
  { label: "Products", href: "/staff/products", icon: Package },
  { label: "Inventory", href: "/staff/inventory", icon: ClipboardList },
];

export function StaffSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-emerald-900/70 bg-[#020817] text-emerald-50 lg:h-screen lg:border-r lg:border-b-0">
      <div className="border-b border-emerald-900/70 px-4 py-3 sm:px-5 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xl font-bold text-emerald-400">SmartStock</p>
            <p className="text-xs text-emerald-200/70">Staff Workspace</p>
          </div>
          <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Shift
            </p>
            <p className="text-sm font-bold text-white">Live</p>
          </div>
        </div>

        <nav className="mt-3 flex flex-wrap gap-2">
          {staffNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                pathname === item.href
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "border border-white/10 text-emerald-100 hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="hidden h-full flex-col overflow-x-hidden overflow-y-auto lg:flex">
        <div className="border-b border-emerald-900/70 px-4 py-3.5 sm:px-5 sm:py-4">
          <p className="text-xl font-bold text-emerald-400 sm:text-2xl">SmartStock</p>
          <p className="text-xs text-emerald-200/80 sm:text-sm">Staff Workspace</p>
        </div>

        <div className="px-4 py-3.5 sm:px-5 sm:py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500/80 sm:text-sm">
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
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-sm font-semibold transition sm:text-base ${
                    active
                      ? "bg-emerald-500/20 text-emerald-100"
                      : "text-emerald-50/80 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="h-2 w-2 rounded-full bg-emerald-300" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 sm:p-4.5">
          <div className="rounded-2xl bg-emerald-600/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 sm:text-sm">
              Shift focus
            </p>
            <p className="mt-2 text-sm text-emerald-50/90">
              Quickly check low stock, expiry alerts, and update quantities as you process sales.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
