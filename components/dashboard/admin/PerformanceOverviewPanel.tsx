"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Eye, ShoppingCart, Users, Wallet, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
  // This panel is interactive, so it keeps local state for chart selection and the order drawer.
  const router = useRouter();
  const [activeMetric, setActiveMetric] = useState<MetricKey>("revenue");
  const [displaySeries, setDisplaySeries] = useState<number[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animatedTooltipValue, setAnimatedTooltipValue] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<AdminPerformanceData["recentOrders"][number] | null>(null);
  const previousSeriesRef = useRef<number[]>([]);
  const tooltipValueRef = useRef(0);
  const tooltipFrameRef = useRef<number | null>(null);

  // Derive the active metric series from the selected tab.
  const metricSeries = useMemo(
    () => data.monthlyPoints.map((point) => point[activeMetric]),
    [activeMetric, data.monthlyPoints],
  );

  // Animate the chart when the metric changes instead of swapping values abruptly.
  useEffect(() => {
    if (previousSeriesRef.current.length === 0) {
      previousSeriesRef.current = metricSeries;
      setDisplaySeries(metricSeries);
      return;
    }

    const from = previousSeriesRef.current;
    const to = metricSeries;
    const duration = 320;
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplaySeries(
        to.map((value, index) => {
          const fromValue = from[index] ?? 0;
          return fromValue + (value - fromValue) * eased;
        }),
      );

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        previousSeriesRef.current = to;
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [metricSeries]);

  const renderedSeries = displaySeries.length > 0 ? displaySeries : metricSeries;

  const hasTrendData = metricSeries.some((value) => value > 0);
  const maxValue = useMemo(() => Math.max(...renderedSeries, 1), [renderedSeries]);
  const chartScale = hasTrendData ? maxValue : 1;

  const chartWidth = 640;
  const chartHeight = 300;
  const topPadding = 20;
  const bottomPadding = 30;
  const innerHeight = chartHeight - topPadding - bottomPadding;
  const stepX = chartWidth / Math.max(metricSeries.length - 1, 1);

  const linePoints = renderedSeries
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

  // Convert traffic percentages into a CSS gradient for the donut chart.
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

  const formatMetricValue = (metric: MetricKey, value: number) => {
    if (metric === "orders") {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
    }

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Track the currently hovered point so the tooltip can animate smoothly.
  const hoveredValue = hoveredIndex !== null ? metricSeries[hoveredIndex] ?? 0 : 0;
  const hoveredMonth = hoveredIndex !== null ? data.monthlyPoints[hoveredIndex]?.month ?? "" : "";
  const hoveredX = hoveredIndex !== null ? Math.round(hoveredIndex * stepX) : 0;
  const hoveredY =
    hoveredIndex !== null
      ? Math.round(topPadding + innerHeight - ((renderedSeries[hoveredIndex] ?? 0) / chartScale) * innerHeight)
      : 0;
  const hoveredXPercent = Math.max(0, Math.min(100, (hoveredX / chartWidth) * 100));
  const hoveredYPercent = Math.max(8, ((hoveredY - 8) / chartHeight) * 100);

  // Animate the tooltip number so hover feedback feels responsive.
  useEffect(() => {
    if (hoveredIndex === null) {
      if (tooltipFrameRef.current) {
        window.cancelAnimationFrame(tooltipFrameRef.current);
      }
      tooltipValueRef.current = 0;
      setAnimatedTooltipValue(0);
      return;
    }

    if (tooltipFrameRef.current) {
      window.cancelAnimationFrame(tooltipFrameRef.current);
    }

    const from = tooltipValueRef.current;
    const to = hoveredValue;
    const duration = 220;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (to - from) * eased;

      tooltipValueRef.current = next;
      setAnimatedTooltipValue(next);

      if (progress < 1) {
        tooltipFrameRef.current = window.requestAnimationFrame(tick);
      }
    };

    tooltipFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (tooltipFrameRef.current) {
        window.cancelAnimationFrame(tooltipFrameRef.current);
      }
    };
  }, [hoveredIndex, hoveredValue]);

  const yAxisTicks = useMemo(
    () =>
      [0, 1, 2, 3, 4].map((i) => {
        const ratio = 1 - i / 4;
        const y = topPadding + (innerHeight / 4) * i;
        const value = hasTrendData ? chartScale * ratio : 0;
        return { value, y };
      }),
    [chartScale, hasTrendData, innerHeight, topPadding],
  );

  const formatAxisValue = (metric: MetricKey, value: number) => {
    if (metric === "orders") {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
    }

    if (Math.abs(value) >= 1000) {
      return `PHP ${Math.round(value / 1000)}k`;
    }

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Route clicks from alerts and cards to the relevant detail pages.
  const navigateTo = (href?: string) => {
    if (!href) return;
    router.push(href);
  };

  const handleKeyNavigate = (event: KeyboardEvent<HTMLElement>, href?: string) => {
    if (!href) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(href);
    }
  };

  // Keep the selected order in local state so the detail drawer can open without a route change.
  const openOrderDrawer = (order: AdminPerformanceData["recentOrders"][number]) => {
    setSelectedOrder(order);
  };

  const closeOrderDrawer = () => {
    setSelectedOrder(null);
  };

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
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-70 w-full"
                role="img"
                aria-label={`${metricLabels[activeMetric]} trend by month`}
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const relativeX = event.clientX - rect.left;
                  const ratio = rect.width > 0 ? relativeX / rect.width : 0;
                  const index = Math.round(ratio * Math.max(renderedSeries.length - 1, 1));
                  const clampedIndex = Math.max(0, Math.min(renderedSeries.length - 1, index));
                  setHoveredIndex(clampedIndex);
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  <linearGradient id="overviewAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.04" />
                  </linearGradient>
                </defs>

                {yAxisTicks.map((tick, i) => {
                  return (
                    <line
                      key={i}
                      x1={0}
                      y1={tick.y}
                      x2={chartWidth}
                      y2={tick.y}
                      stroke="#e2e8f0"
                      strokeDasharray="4 6"
                      strokeWidth="1"
                    />
                  );
                })}

                {yAxisTicks.map((tick, i) => (
                  <text
                    key={`tick-label-${i}`}
                    x={8}
                    y={tick.y - 6}
                    fontSize="10"
                    fill="#94a3b8"
                  >
                    {formatAxisValue(activeMetric, tick.value)}
                  </text>
                ))}

                {areaPath ? <path d={areaPath} fill="url(#overviewAreaGradient)" /> : null}
                <polyline
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={linePoints}
                  className="transition-all duration-300"
                />

                {hoveredIndex !== null ? (
                  <line
                    x1={hoveredX}
                    y1={topPadding}
                    x2={hoveredX}
                    y2={chartHeight - bottomPadding}
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ) : null}

                {renderedSeries.map((value, index) => {
                  const x = Math.round(index * stepX);
                  const y = Math.round(topPadding + innerHeight - (value / chartScale) * innerHeight);
                  const isHovered = hoveredIndex === index;

                  return (
                    <circle
                      key={`${data.monthlyPoints[index].month}-${value}`}
                      cx={x}
                      cy={y}
                      r={isHovered ? "6" : "3.5"}
                      fill={isHovered ? "#0369a1" : "#0284c7"}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </svg>

              {hoveredIndex !== null ? (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-2xl border border-slate-200/70 bg-white/95 px-3 py-2 text-xs shadow-[0_18px_30px_rgba(15,23,42,0.16)]"
                  style={{ left: `${hoveredXPercent}%`, top: `${hoveredYPercent}%` }}
                >
                  <p className="font-semibold text-slate-900">{formatMetricValue(activeMetric, animatedTooltipValue)}</p>
                  <p className="text-slate-500">{hoveredMonth}</p>
                </div>
              ) : null}

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
            <button type="button" onClick={() => router.push("/reports#sales-history")} className="text-sm font-semibold text-sky-700 transition hover:text-sky-600">
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
                  <tr
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`View order ${order.id}`}
                    onClick={() => openOrderDrawer(order)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openOrderDrawer(order);
                      }
                    }}
                    className="border-t border-slate-200/80 text-slate-700 transition hover:bg-sky-50/60 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
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
                            : order.status === "Voided"
                            ? "bg-rose-100 text-rose-700"
                            : order.status === "Refunded"
                            ? "bg-violet-100 text-violet-700"
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
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Alerts Center</h3>
              <p className="text-sm text-slate-500">Low stock, expiry, returns, and zone pressure signals</p>
            </div>
            <button type="button" onClick={() => router.push("/reports")} className="text-sm font-semibold text-sky-700 transition hover:text-sky-600">
              View all
            </button>
          </div>

          <ul className="mt-5 space-y-3">
            {data.alertsCenter.map((alert) => (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => navigateTo(alert.href)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-left transition hover:border-sky-200 hover:bg-sky-50/60 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        alert.severity === "critical"
                          ? "bg-rose-100 text-rose-700"
                          : alert.severity === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{alert.message}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{alert.metric}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Recent Activity</h4>
            </div>
            <ul className="space-y-3">
            {data.recentActivity.map((item, index) => (
              <li key={`${item.actor}-${item.time}-${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.orderId) {
                      const matchedOrder = data.recentOrders.find((order) => order.id === item.orderId);
                      if (matchedOrder) {
                        openOrderDrawer(matchedOrder);
                        return;
                      }
                    }
                    navigateTo(item.href);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (item.orderId) {
                        const matchedOrder = data.recentOrders.find((order) => order.id === item.orderId);
                        if (matchedOrder) {
                          openOrderDrawer(matchedOrder);
                          return;
                        }
                      }
                      navigateTo(item.href);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-left transition hover:border-sky-200 hover:bg-sky-50/60 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                >
                  <p className="text-sm leading-6 text-slate-700">
                    <span className="font-semibold text-slate-900">{item.actor}</span> {item.action}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{item.time}</p>
                </button>
              </li>
            ))}
            </ul>
          </div>
        </article>
      </div>

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]" onClick={closeOrderDrawer}>
          <aside
            className="h-full w-full max-w-md border-l border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.25)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Order details</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-950">{selectedOrder.id}</h4>
              </div>
              <button
                type="button"
                onClick={closeOrderDrawer}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close order details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold text-slate-900">{selectedOrder.customerName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold text-slate-900">{selectedOrder.amount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Items</span>
                <span className="font-semibold text-slate-900">{selectedOrder.itemCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Payment</span>
                <span className="font-semibold text-slate-900">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-900">{selectedOrder.status}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-900">{selectedOrder.date}</span>
              </div>
            </div>

            {selectedOrder.lineItems.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Line items</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {selectedOrder.lineItems.map((item, index) => (
                    <li key={`${item.sku}-${index}`} className="flex items-center justify-between gap-3 text-slate-700">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(item.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Need full record details?</p>
              <p className="mt-1">Open complete sales history in Reports for all transactions, statuses, and timeline context.</p>
              <button
                type="button"
                onClick={() => {
                  closeOrderDrawer();
                  router.push("/reports#sales-history");
                }}
                className="mt-4 inline-flex items-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Open sales history
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
