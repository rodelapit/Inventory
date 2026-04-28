import Link from "next/link";
import { CalendarDays, Download, Filter, ReceiptText, Search, ShoppingCart, Tag, UserCircle2 } from "lucide-react";
import { StaffWorkspaceShell } from "./StaffWorkspace";
import type { StaffTransactionData, StaffTransactionRecord } from "@/lib/staff/transactions";

type StaffTransactionsViewProps = {
  data: StaffTransactionData;
  exportHref: string;
  receiptHrefBase: string;
  selectedReceipt: string | null;
};

function buildQueryString(filters: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    const trimmed = String(value ?? "").trim();
    if (trimmed.length > 0) {
      query.set(key, trimmed);
    }
  }
  return query.toString();
}

function statusTone(status: StaffTransactionRecord["status"]): string {
  if (status === "Delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Refunded") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "Voided") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function money(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

export function StaffTransactionsView({ data, exportHref, receiptHrefBase, selectedReceipt }: StaffTransactionsViewProps) {
  const { records, cashiers, summary, loadError, filters } = data;

  return (
    <StaffWorkspaceShell title="Transaction History" subtitle="Transaction history" badgeLabel="Order history">
      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Transaction data loaded with a warning: {loadError}
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">Transaction History</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Search sales, filter by cashier, and open the full receipt for any transaction.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Revenue" value={money(summary.totalRevenue)} description="Filtered transaction revenue" icon={<ShoppingCart className="h-5 w-5 text-emerald-600" />} />
        <MetricCard title="Orders" value={summary.totalOrders} description="Matching transactions" icon={<ReceiptText className="h-5 w-5 text-emerald-600" />} />
        <MetricCard title="Items sold" value={summary.totalItems} description="Units in filtered transactions" icon={<Tag className="h-5 w-5 text-emerald-600" />} />
        <MetricCard title="Cashiers" value={cashiers.length} description="Distinct staff members in the log" icon={<UserCircle2 className="h-5 w-5 text-emerald-600" />} />
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
        <form method="get" action="/staff/transactions" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto] xl:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Search</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Order number, customer, cashier, SKU"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <select
              name="status"
              defaultValue={filters.status || "all"}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-500 transition focus:ring-2"
            >
              <option value="all">All</option>
              <option value="delivered">Delivered</option>
              <option value="in transit">In Transit</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="voided">Voided</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cashier</span>
            <select
              name="cashier"
              defaultValue={filters.cashier}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-500 transition focus:ring-2"
            >
              <option value="">All cashiers</option>
              {cashiers.map((cashier) => (
                <option key={cashier.userId} value={cashier.userId}>
                  {cashier.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
              <Filter className="h-4 w-4" />
              Apply
            </button>
            <Link href={exportHref} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <Download className="h-4 w-4" />
              Export
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-emerald-950">Receipt log</h2>
            <p className="mt-1 text-sm text-slate-600">
              Expand any transaction to see the receipt summary and line items.
            </p>
          </div>
          <CalendarDays className="h-5 w-5 text-emerald-600" />
        </div>

        <div className="mt-5 space-y-3">
          {records.length > 0 ? (
            records.map((record) => {
              const query = buildQueryString({ q: filters.q, status: filters.status, cashier: filters.cashier, receipt: record.orderNumber });
              const receiptHref = `${receiptHrefBase}?${query}#receipt-${record.orderNumber}`;
              const isOpen = selectedReceipt === record.orderNumber || selectedReceipt === record.orderId || selectedReceipt === record.id;

              return (
                <details key={record.id} id={`receipt-${record.orderNumber}`} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-[0_16px_30px_rgba(148,163,184,0.08)]" open={isOpen}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-slate-950">{record.orderNumber}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusTone(record.status)}`}>
                            {record.status}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            {record.paymentMethod}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {record.customerName} · {record.cashierName} · {formatDate(record.orderDateIso)}
                        </p>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-lg font-semibold text-slate-950">{record.amount}</p>
                        <p className="text-sm text-slate-600">{record.itemCount} item(s)</p>
                        <Link href={receiptHref} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-600">
                          Open receipt
                          <span aria-hidden>→</span>
                        </Link>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
                    <div className="rounded-2xl border border-white bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Receipt detail</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                        <InfoItem label="Order" value={record.orderNumber} />
                        <InfoItem label="Cashier" value={record.cashierName} />
                        <InfoItem label="Payment" value={record.paymentMethod} />
                        <InfoItem label="Reference" value={record.paymentReference ?? "-"} />
                        <InfoItem label="Status" value={record.status} />
                        <InfoItem label="Date" value={formatDate(record.orderDateIso)} />
                      </div>

                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                            <tr>
                              <th className="px-3 py-2">SKU</th>
                              <th className="px-3 py-2">Item</th>
                              <th className="px-3 py-2">Qty</th>
                              <th className="px-3 py-2">Unit</th>
                              <th className="px-3 py-2">Line total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {record.lineItems.length > 0 ? (
                              record.lineItems.map((item) => (
                                <tr key={`${record.id}-${item.sku}`}>
                                  <td className="px-3 py-2 font-medium text-slate-950">{item.sku}</td>
                                  <td className="px-3 py-2 text-slate-700">{item.name}</td>
                                  <td className="px-3 py-2 text-slate-700">{item.quantity}</td>
                                  <td className="px-3 py-2 text-slate-700">{money(item.unitPrice)}</td>
                                  <td className="px-3 py-2 font-semibold text-slate-950">{money(item.lineTotal)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="px-3 py-5 text-center text-slate-500" colSpan={5}>
                                  No line items were returned for this receipt.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <aside className="space-y-4 rounded-2xl border border-white bg-white p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Receipt totals</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <InfoItem label="Subtotal" value={money(record.paymentAmount)} />
                          <InfoItem label="Items" value={String(record.itemCount)} />
                          <InfoItem label="Cashier ID" value={record.cashierUserId ?? "-"} />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Clicking the row opens the receipt details. Use the export button to download the current filtered log as CSV.
                      </div>
                    </aside>
                  </div>
                </details>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
              No transaction records matched your current filters.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
        <h2 className="text-xl font-semibold text-emerald-950">Payment breakdown</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.paymentMethods.length > 0 ? summary.paymentMethods.map((method) => (
            <div key={method.method} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{method.method}</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{money(method.amount)}</p>
              <p className="mt-1 text-sm text-slate-600">{method.count} transaction(s)</p>
            </div>
          )) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No payment breakdown available for the current filters.
            </div>
          )}
        </div>
      </section>
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
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">{title}</p>
        {icon}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
