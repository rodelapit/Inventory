"use client";

import { useMemo, useState } from "react";
import { Banknote, CreditCard, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";

type PosProduct = {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  status: "In Stock" | "Low" | "Critical";
  price: number;
  supplier: string;
  storageZone?: string | null;
};

type CartItem = PosProduct & {
  cartQuantity: number;
};

type PosTerminalProps = {
  initialProducts: PosProduct[];
};

type CheckoutResponse = {
  action: "checkout" | "refund" | "void";
  sourceOrderNumber?: string | null;
  orderNumber: string;
  orderStatus?: string;
  cashierName: string;
  paymentMethod: string;
  promoCode?: string | null;
  discountType?: "none" | "percent" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  subtotal?: number;
  taxAmount?: number;
  completedAt: string;
  totalAmount: number;
  itemCount: number;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusPill(status: PosProduct["status"]): string {
  if (status === "Critical") return "bg-rose-100 text-rose-700";
  if (status === "Low") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export function PosTerminal({ initialProducts }: PosTerminalProps) {
  const [products, setProducts] = useState<PosProduct[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashierName, setCashierName] = useState("Counter 1");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState<"none" | "percent" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState("0");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutResponse | null>(null);
  const [lastCompletedSale, setLastCompletedSale] = useState<CheckoutResponse | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.sku.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.supplier.toLowerCase().includes(query);

      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, products, search]);

  const cartCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  const parsedDiscountValue = Number(discountValue);
  const safeDiscountValue = Number.isFinite(parsedDiscountValue) ? Math.max(0, parsedDiscountValue) : 0;
  const discountAmount =
    discountType === "percent"
      ? Math.min(subtotal, Number((subtotal * (Math.min(100, safeDiscountValue) / 100)).toFixed(2)))
      : discountType === "fixed"
      ? Math.min(subtotal, Number(safeDiscountValue.toFixed(2)))
      : 0;
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const tax = Number((taxableBase * 0.08).toFixed(2));
  const total = Number((taxableBase + tax).toFixed(2));

  function addToCart(product: PosProduct) {
    setReceipt(null);
    setActionError(null);

    setCart((current) => {
      const existing = current.find((item) => item.sku === product.sku);
      if (!existing) {
        return [...current, { ...product, cartQuantity: 1 }];
      }

      return current.map((item) =>
        item.sku === product.sku
          ? { ...item, cartQuantity: Math.min(item.cartQuantity + 1, product.quantity) }
          : item,
      );
    });
  }

  function updateCartQuantity(sku: string, nextQuantity: number) {
    setReceipt(null);
    setActionError(null);
    setCart((current) =>
      current
        .map((item) =>
          item.sku === sku
            ? { ...item, cartQuantity: Math.max(0, Math.min(nextQuantity, item.quantity)) }
            : item,
        )
        .filter((item) => item.cartQuantity > 0),
    );
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      setActionError("Add at least one item before checking out.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout",
          cashierName,
          paymentMethod,
          promoCode,
          discountType,
          discountValue: safeDiscountValue,
          items: cart.map((item) => ({ sku: item.sku, quantity: item.cartQuantity })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.data) {
        setActionError(json?.error || "Unable to complete sale.");
        return;
      }

      const data = json.data as CheckoutResponse;
      setReceipt(data);
      setLastCompletedSale(data);
      setCart([]);

      setProducts((current) =>
        current.map((product) => {
          const soldItem = data.items.find((item) => item.sku === product.sku);
          if (!soldItem) return product;

          const nextQuantity = Math.max(0, product.quantity - soldItem.quantity);
          const nextStatus: PosProduct["status"] =
            nextQuantity <= 0 ? "Critical" : nextQuantity <= 10 ? "Low" : "In Stock";

          return {
            ...product,
            quantity: nextQuantity,
            status: nextStatus,
          };
        }),
      );
    } catch (error) {
      console.error("POS checkout failed", error);
      setActionError("Unable to complete sale right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReversal(action: "refund" | "void") {
    if (!lastCompletedSale) {
      setActionError("Complete a sale first before processing a refund or void.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          cashierName,
          paymentMethod,
          sourceOrderNumber: lastCompletedSale.orderNumber,
          items: lastCompletedSale.items.map((item) => ({ sku: item.sku, quantity: item.quantity })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.data) {
        setActionError(json?.error || `Unable to ${action} sale.`);
        return;
      }

      const reversal = json.data as CheckoutResponse;
      setReceipt(reversal);
      setLastCompletedSale(null);

      setProducts((current) =>
        current.map((product) => {
          const reversedItem = reversal.items.find((item) => item.sku === product.sku);
          if (!reversedItem) return product;

          const nextQuantity = product.quantity + reversedItem.quantity;
          const nextStatus: PosProduct["status"] =
            nextQuantity <= 0 ? "Critical" : nextQuantity <= 10 ? "Low" : "In Stock";

          return {
            ...product,
            quantity: nextQuantity,
            status: nextStatus,
          };
        }),
      );
    } catch (error) {
      console.error(`POS ${action} failed`, error);
      setActionError(`Unable to ${action} sale right now.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePrintReceipt() {
    if (!receipt) return;

    const lines = receipt.items
      .map(
        (item) =>
          `<tr><td style=\"padding:6px 0;\">${item.name} x${item.quantity}</td><td style=\"padding:6px 0;text-align:right;\">${formatMoney(item.lineTotal)}</td></tr>`,
      )
      .join("");

    const printable = `
      <html>
        <head>
          <title>Receipt ${receipt.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h1 { font-size: 18px; margin: 0 0 8px; }
            p { margin: 4px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            tfoot td { border-top: 1px solid #cbd5e1; padding-top: 8px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>SmartStock Internal POS Receipt</h1>
          <p>Order: ${receipt.orderNumber}</p>
          <p>Status: ${receipt.orderStatus ?? "Completed"}</p>
          <p>Cashier: ${receipt.cashierName}</p>
          <p>Payment: ${receipt.paymentMethod}</p>
          <p>Date: ${new Date(receipt.completedAt).toLocaleString()}</p>
          <table>
            <tbody>${lines}</tbody>
            <tfoot>
              <tr><td>Total</td><td style=\"text-align:right;\">${formatMoney(receipt.totalAmount)}</td></tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    const popup = window.open("", "_blank", "width=460,height=680");
    if (!popup) {
      setActionError("Pop-up blocked. Allow pop-ups to print receipts.");
      return;
    }

    popup.document.open();
    popup.document.write(printable);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  const lowStockCount = products.filter((product) => product.status !== "In Stock").length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
      <section className="rounded-4xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Product lookup</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Scan or add items</h2>
            <p className="mt-1 text-sm text-slate-500">Search the catalog, add items to the cart, and complete the sale from one screen.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-slate-200 bg-white p-3 text-center shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Items</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{products.length}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Low stock</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{lowStockCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Cart</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{cartCount}</p>
            </div>
          </div>
        </div>

        {actionError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {actionError}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search SKU, product, supplier"
              className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <article
              key={product.sku}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{product.sku}</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-950">{product.name}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusPill(product.status)}`}>
                  {product.status}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Category</span>
                  <span className="font-semibold text-slate-900">{product.category || "Uncategorized"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Stock</span>
                  <span className="font-semibold text-slate-900">{product.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Zone</span>
                  <span className="font-semibold text-slate-900">{product.storageZone ?? "Unassigned"}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Price</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{formatMoney(product.price)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={product.quantity <= 0}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </article>
          ))}

          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
              No products match your search.
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-5 rounded-4xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Internal only</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">POS checkout</h2>
          <p className="mt-1 text-sm text-slate-500">Record a sale, update stock, and write the transaction to Orders.</p>
        </div>

        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Cashier / Counter
            <input
              value={cashierName}
              onChange={(event) => setCashierName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-sky-400"
            />
          </label>

          <div className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Payment method</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("Cash")}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                  paymentMethod === "Cash"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("Card")}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                  paymentMethod === "Card"
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Card</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Discount / promotion</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType("none")}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                  discountType === "none" ? "border-slate-300 bg-slate-100 text-slate-900" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                No discount
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("percent")}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                  discountType === "percent" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Percent
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("fixed")}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                  discountType === "fixed" ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Fixed
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                type="number"
                min={0}
                step="0.01"
                disabled={discountType === "none"}
                placeholder={discountType === "percent" ? "%" : "$"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-800 outline-none disabled:opacity-50"
              />
              <input
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                placeholder="Promo code"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-800 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setPromoCode("SAVE5");
                  setDiscountType("percent");
                  setDiscountValue("5");
                }}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700"
              >
                Apply SAVE5
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromoCode("SAVE10");
                  setDiscountType("percent");
                  setDiscountValue("10");
                }}
                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 font-semibold text-sky-700"
              >
                Apply SAVE10
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cart</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{cartCount} item(s)</p>
            </div>

            <button
              type="button"
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div key={item.sku} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{item.sku}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(item.price * item.cartQuantity)}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-1 py-1">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.sku, item.cartQuantity - 1)}
                        aria-label={`Decrease quantity for ${item.name}`}
                        title={`Decrease quantity for ${item.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold text-slate-900">{item.cartQuantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.sku, item.cartQuantity + 1)}
                        disabled={item.cartQuantity >= item.quantity}
                        aria-label={`Increase quantity for ${item.name}`}
                        title={`Increase quantity for ${item.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.sku, 0)}
                      className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Cart is empty. Add items from the catalog to start a sale.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span className="font-semibold text-slate-900">-{formatMoney(discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tax estimate</span>
              <span className="font-semibold text-slate-900">{formatMoney(tax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-950">{formatMoney(total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            {isSubmitting ? "Completing sale..." : "Complete sale"}
          </button>
        </div>

        {receipt ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_32px_rgba(16,185,129,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {receipt.action === "checkout" ? "Sale completed" : receipt.action === "refund" ? "Sale refunded" : "Sale voided"}
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-950">{receipt.orderNumber}</p>
              </div>
              <p className="text-sm font-semibold text-emerald-800">{formatMoney(receipt.totalAmount)}</p>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl bg-white/75 p-3 text-sm text-slate-700">
              {receipt.items.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-3">
                  <span>{item.name} x{item.quantity}</span>
                  <span className="font-semibold text-slate-900">{formatMoney(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-emerald-900">
              <span>{receipt.paymentMethod}</span>
              <span>{receipt.itemCount} units</span>
            </div>

            {(receipt.discountAmount ?? 0) > 0 || receipt.promoCode ? (
              <p className="mt-2 text-xs font-semibold text-emerald-800">
                {receipt.promoCode ? `Promo ${receipt.promoCode}` : "Discount applied"} - {formatMoney(receipt.discountAmount ?? 0)}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Print receipt
              </button>
              <button
                type="button"
                onClick={() => handleReversal("void")}
                disabled={isSubmitting || !lastCompletedSale}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Void sale
              </button>
              <button
                type="button"
                onClick={() => handleReversal("refund")}
                disabled={isSubmitting || !lastCompletedSale}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refund sale
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}