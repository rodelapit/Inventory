"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function addProduct(formData: FormData) {
  if (!isSupabaseConfigured()) {
    console.error("Supabase is not configured. Skipping product insert.");
    return { success: false, message: "Supabase is not configured" };
  }

  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const status = String(formData.get("status") ?? "In Stock");
  const priceRaw = String(formData.get("price") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const expirationRaw = String(formData.get("expiration") ?? "").trim();
  const storageZoneRaw = String(formData.get("storage_zone") ?? "").trim();

  if (!sku || !name) {
    return { success: false, message: "SKU and Name are required" };
  }

  const stock_level = Number.isNaN(Number(quantityRaw)) ? 0 : Number(quantityRaw);
  const price = Number.isNaN(Number(priceRaw)) ? 0 : Number(priceRaw);
  const expiration = expirationRaw ? new Date(expirationRaw).toISOString() : null;
  const storage_zone = storageZoneRaw || null;

  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("products").insert({
    sku,
    product_name: name,
    category: category || null,
    stock_level,
    status,
    price,
    supplier: supplier || null,
    expiration,
    storage_zone,
  });

  if (error) {
    console.error("Error inserting product", error);
    return { success: false, message: "Failed to add product" };
  }

  revalidatePath("/products");
  revalidatePath("/"); // dashboard uses products feed
  // inventory overview derives its totals from products
  revalidatePath("/inventory");

  // Force a fresh render of the products page so the new item appears.
  redirect("/products");
}
