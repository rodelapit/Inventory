"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ProductRow = {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  status: "In Stock" | "Low" | "Critical";
  price: number;
  supplier: string;
  storageZone?: string | null;
};

export default function ProductsClient({ initialRows }: { initialRows: ProductRow[] }) {
  const searchParams = useSearchParams();
  const searchFromUrl = searchParams.get("q") ?? "";
  const [rows, setRows] = useState<ProductRow[]>(initialRows ?? []);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState(searchFromUrl);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "in-stock" | "low" | "critical">("all");
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    quantity: "",
    price: "",
    status: "In Stock",
    supplier: "",
    storage_zone: "",
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const json = await res.json();
        if (mounted && json && Array.isArray(json.data)) {
          setRows(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch products client-side", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    setSearch(searchFromUrl);
  }, [searchFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const p = json.data;
        const newRow: ProductRow = {
          sku: p.sku,
          name: p.product_name,
          category: p.category ?? "",
          quantity: p.stock_level ?? 0,
          status: p.status ?? "In Stock",
          price: Number(p.price ?? 0),
          supplier: p.supplier ?? "",
          storageZone: p.storage_zone ?? null,
        };
        setRows((r) => [newRow, ...r]);
        setForm({ sku: "", name: "", category: "", quantity: "", price: "", status: "In Stock", supplier: "", storage_zone: "" });
        setShowModal(false);
      } else {
        console.error("Insert failed", json);
        alert(json.error || "Failed to add product");
      }
    } catch (err) {
      console.error("Failed to POST /api/products", err);
      alert("Failed to add product");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort();

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      row.name.toLowerCase().includes(query) ||
      row.sku.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query) ||
      row.supplier.toLowerCase().includes(query);

    const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "in-stock" && row.status === "In Stock") ||
      (statusFilter === "low" && row.status === "Low") ||
      (statusFilter === "critical" && row.status === "Critical");

    return matchesSearch && matchesCategory && matchesStatus;
  });

  function getStatusPill(status: ProductRow["status"]) {
    if (status === "Critical") {
      return "bg-rose-100 text-rose-700";
    }
    if (status === "Low") {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-emerald-100 text-emerald-700";
  }

  function getStatusLabel(status: ProductRow["status"]) {
    if (status === "In Stock") return "Optimal";
    return status;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/80 px-4 pb-4 sm:px-5">
        <div className="w-full min-w-0 sm:flex-1">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              Search
            </span>
            <input
              aria-label="Search products"
              placeholder="Search products, SKU, category, supplier"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-16 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 sm:text-base"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 sm:text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by stock status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 sm:text-sm"
          >
            <option value="all">All stock states</option>
            <option value="in-stock">In stock</option>
            <option value="low">Low</option>
            <option value="critical">Critical</option>
          </select>

          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:text-sm">
            Export
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.35)] transition hover:bg-emerald-700 sm:text-sm"
          >
            + Add Product
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-3 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_25px_60px_rgba(15,23,42,0.25)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Product</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">SKU *</label>
                <input
                  required
                  placeholder="PRD-0001"
                  value={form.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Product Name *</label>
                <input
                  required
                  placeholder="Product name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Category</label>
                <input
                  placeholder="Beverages"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Quantity</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => updateField("quantity", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Price ($)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
                <select
                  aria-label="Product status"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-400"
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Low">Low</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Storage Zone</label>
                <select
                  aria-label="Storage zone"
                  value={form.storage_zone}
                  onChange={(e) => updateField("storage_zone", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-400"
                >
                  <option value="">Unassigned</option>
                  <option value="A">Zone A - Ambient</option>
                  <option value="B">Zone B - Cold</option>
                  <option value="C">Zone C - Frozen</option>
                  <option value="D">Zone D - Dry</option>
                  <option value="E">Zone E - Receiving</option>
                  <option value="Q">Zone Q - Quarantine</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-500">Supplier</label>
                <input
                  placeholder="Supplier name"
                  value={form.supplier}
                  onChange={(e) => updateField("supplier", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.35)] transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "Adding..." : "+ Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="min-h-0 overflow-x-auto px-2 sm:px-4">
        <table className="mt-2 w-full min-w-180 text-left text-xs text-slate-700 sm:text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.15em] text-slate-500 sm:text-xs">
            <tr>
              <th className="px-3 py-3 sm:px-4">SKU</th>
              <th className="px-3 py-3 sm:px-4">Product</th>
              <th className="px-3 py-3 sm:px-4">Category</th>
              <th className="px-3 py-3 sm:px-4">Quantity</th>
              <th className="px-3 py-3 sm:px-4">Status</th>
              <th className="px-3 py-3 sm:px-4">Price</th>
              <th className="px-3 py-3 sm:px-4">Supplier</th>
              <th className="px-3 py-3 sm:px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={`${row.sku}-${row.name}-${index}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                <td className="px-3 py-3 font-semibold text-indigo-600 sm:px-4">{row.sku}</td>
                <td className="px-3 py-3 font-semibold text-slate-900 sm:px-4">{row.name}</td>
                <td className="px-3 py-3 text-slate-600 sm:px-4">{row.category}</td>
                <td className="px-3 py-3 font-medium text-slate-800 sm:px-4">{row.quantity}</td>
                <td className="px-3 py-3 sm:px-4">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${getStatusPill(row.status)}`}>
                    {getStatusLabel(row.status)}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono font-semibold text-emerald-700 sm:px-4">${row.price.toFixed(2)}</td>
                <td className="px-3 py-3 text-slate-600 sm:px-4">{row.supplier}</td>
                <td className="px-3 py-3 sm:px-4">
                  <button className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 sm:text-xs">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  No products match your filters.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Loading latest products...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
