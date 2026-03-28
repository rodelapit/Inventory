"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function createStaffAccount(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    redirect("/users?error=missing-fields");
  }

  if (password.length < 8) {
    redirect("/users?error=weak-password");
  }

  if (!isSupabaseConfigured()) {
    redirect("/users?error=supabase-not-configured");
  }

  try {
    const adminClient = createSupabaseAdminClient();

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "staff",
      },
    });

    if (error || !data?.user) {
      const message = String(error?.message ?? "").toLowerCase();
      if (message.includes("already") || message.includes("exists")) {
        redirect("/users?error=email-exists");
      }
      redirect("/users?error=create-failed");
    }

    await adminClient.from("profiles").upsert(
      {
        user_id: data.user.id,
        full_name: fullName,
        email,
        role: "staff",
      },
      {
        onConflict: "user_id",
      },
    );

    revalidatePath("/users");
    redirect("/users?created=1");
  } catch {
    redirect("/users?error=create-failed");
  }
}
