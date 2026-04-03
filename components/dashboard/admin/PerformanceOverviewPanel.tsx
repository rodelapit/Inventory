"use client";

import { useMemo, useState } from "react";
import { Eye, ShoppingCart, Users, Wallet } from "lucide-react";
import type { AdminPerformanceData, MetricKey } from "@/lib/dashboard/get-admin-performance-data";

const metricLabels: Record<MetricKey, string> = {
  revenue: "Revenue",
  orders: "Orders",
  profit: "Profit",
};

const iconByKey = {
  Wallet,
  Users,
  ShoppingCart,
  Eye,
};

type PerformanceOverviewPanelProps = {
  data: AdminPerformanceData;
};

export function PerformanceOverviewPanel({ data }: PerformanceOverviewPanelProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("revenue");

  const metricSeries = useMemo(
    () => data.monthlyPoints.map((point) => point[activeMetric]),
    [activeMetric, data.monthlyPoints],
  );

  const hasTrendData = metricSeries.some((value) => value > 0);
  const maxValue = useMemo(() => Math.max(...metricSeries, 1), [metricSeries]);
  const chartScale = hasTrendData ? maxValue : 1;

  const chartWidth = 640;
  const chartHeight = 300;
  const topPadding = 20;
  const bottomPadding = 30;
  const innerHeight = chartHeight - topPadding - bottomPadding;
  const stepX = chartWidth / Math.max(metricSeries.length - 1, 1);

  const linePoints = metricSeries
    .map((value, index) => {
      const x = Math.round(index * stepX);
      const y = Math.round(topPadding + innerHeight - (value / chartScale) * innerHeight);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath =
    linePoints.length > 0
      ? `M ${linePoints.replace(/ /g, " L ")} L ${chartWidth},${chartHeight - bottomPadding} L 0,${chartHeight - bottomPadding} Z`
      : "";

  const trafficGradientParts = data.trafficSources.reduce<string[]>((parts, source, index) => {
    const previous = index === 0 ? 0 : parts.length === 0 ? 0 : Number(parts[parts.length - 1].split(" ")[1].replace("%", ""));
    const next = Math.min(100, previous + source.percent);
    const palette = ["#3b82f6", "#14b8a6", "#0ea5e9", "#06b6d4", "#6366f1"];
    const color = palette[index] ?? "#94a3b8";
    parts.push(`${color} ${previous}% ${next}%`);
    return parts;
  }, []);
  const donutGradient = `conic-gradient(${trafficGradientParts.length > 0 ? trafficGradientParts.join(", ") : "#94a3b8 0% 100%"})`;
  const totalVisits = data.totalVisits;

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.overviewCards.map((card) => {
          const Icon = iconByKey[card.iconKey];

          return (
            <article
              key={card.title}
              className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.8))] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.title}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{card.value}</p>
                  <p className={`mt-3 text-sm font-medium ${card.trendClass}`}>{card.trendText}</p>
                </div>
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${card.iconClass}`}>
                  <Icon className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-5 h-12 rounded-2xl bg-[linear-gradient(90deg,rgba(241,245,249,0.3),rgba(226,232,240,0.9),rgba(241,245,249,0.35))]" />
            </article>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="rounded-4xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.8))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Overview</h2>
              <p className="text-sm text-slate-500">Monthly order and revenue performance</p>
            </div>
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveMetric(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    activeMetric === key
                        ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {metricLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200/70 bg-white/70 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="relative">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-70 w-full" role="img" aria-label={`${metricLabels[activeMetric]} trend by month`}>
                <defs>
                  <linearGradient id="overviewAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3, 4].map((i) => {
                  const y = topPadding + (innerHeight / 4) * i;
                  return (
                    <line
                      key={i}
                      x1={0}
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="4 6"
                      strokeWidth="1"
                    />
                  );
                })}

                {areaPath ? <path d={areaPath} fill="url(#overviewAreaGradient)" /> : null}
                <polyline fill="none" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={linePoints} />

                {metricSeries.map((value, index) => {
                  const x = Math.round(index * stepX);
                  const y = Math.round(topPadding + innerHeight - (value / chartScale) * innerHeight);
                  return <circle key={`${data.monthlyPoints[index].month}-${value}`} cx={x} cy={y} r="3.5" fill="#0284c7" />;
                })}
              </svg>

              {!hasTrendData ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/55 px-6 text-center backdrop-blur-[1px]">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">No live trend data yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add orders with dates and totals in Supabase to populate this chart.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-6 gap-2 text-center text-xs font-medium text-slate-400 sm:grid-cols-12">
            {data.monthlyPoints.map((point) => (
              <span key={point.month}>{point.month}</span>
            ))}
          </div>
        </article>

        <aside className="grid gap-5">
          <article className="rounded-4xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.8))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6 backdrop-blur-xl">
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Inventory Distribution</h3>
            <p className="mt-1 text-sm text-slate-500">Stock share by storage zone</p>

            <div className="mt-5 flex items-center gap-5">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full shadow-[0_18px_40px_rgba(15,23,42,0.08)]" style={{ background: donutGradient }}>
                <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  <span className="text-3xl font-bold text-slate-950">{totalVisits}</span>
                  <span className="text-xs text-slate-500">Units</span>
                </div>
              </div>

              <ul className="flex-1 space-y-2 text-sm">
                {data.trafficSources.map((item) => (
                  <li key={item.source} className="flex items-center justify-between gap-3 text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.colorClass}`} />
                      {item.source}
                    </span>
                    <span className="font-semibold text-slate-900">{item.percent}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="rounded-4xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.8))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6 backdrop-blur-xl">
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Monthly Goals</h3>
            <p className="mt-1 text-sm text-slate-500">Live progress based on current system data</p>

            <div className="mt-5 space-y-5">
              {data.monthlyGoals.map((goal) => (
                <div key={goal.label}>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>{goal.label}</span>
                    <span className="text-slate-500">{goal.percent}%</span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                    <div
                      className={`h-2.5 rounded-full ${goal.tone === "blue" ? "bg-blue-500" : "bg-teal-500"}`}
                      style={{ width: `${goal.percent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                    <span>{goal.value}</span>
                    <span>Target: {goal.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-4xl border border-slate-900/8 bg-[rgba(255,255,255,0.82)] p-5 shadow-[0_24px_60px_rgba(148,163,184,0.16)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Recent Orders</h3>
              <p className="text-sm text-slate-500">Latest transactions from your store</p>
            </div>
            <button type="button" className="text-sm font-semibold text-sky-700 transition hover:text-sky-600">
              View all
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Order</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200/80 text-slate-700">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{order.id}</td>
                    <td className="px-4 py-3">{order.customer}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{order.amount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          order.status === "Delivered"
                            ? "bg-emerald-100 text-emerald-700"
                            : order.status === "In Transit"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recentOrders.length === 0 ? (
              <p className="px-1 py-4 text-sm text-slate-500">No orders yet. Add your first order to populate this table.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-4xl border border-slate-900/8 bg-[rgba(255,255,255,0.82)] p-5 shadow-[0_24px_60px_rgba(148,163,184,0.16)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Recent Activity</h3>
              <p className="text-sm text-slate-500">Latest events from your store</p>
            </div>
            <button type="button" className="text-sm font-semibold text-sky-700 transition hover:text-sky-600">
              View all
            </button>
          </div>

          <ul className="mt-5 space-y-3">
            {data.recentActivity.map((item, index) => (
              <li key={`${item.actor}-${item.time}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                <p className="text-sm leading-6 text-slate-700">
                  <span className="font-semibold text-slate-900">{item.actor}</span> {item.action}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{item.time}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
