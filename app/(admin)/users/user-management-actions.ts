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
      console.error("[users:create] auth.admin.createUser failed", error);
      const message = String(error?.message ?? "").toLowerCase();
      if (message.includes("already") || message.includes("exists")) {
        redirect("/users?error=email-exists");
      }
      if (message.includes("service_role") || message.includes("not authorized") || message.includes("forbidden")) {
        redirect("/users?error=service-role-missing");
      }
      redirect("/users?error=create-failed");
    }

    const profilePayload = {
      user_id: data.user.id,
      full_name: fullName,
      email,
      role: "staff",
    };

    const { error: profileUpsertError } = await adminClient.from("profiles").upsert(profilePayload, {
      onConflict: "user_id",
    });

    if (profileUpsertError) {
      console.error("[users:create] profiles upsert failed", profileUpsertError);
      const profileMessage = String(profileUpsertError.message ?? "").toLowerCase();

      if (profileMessage.includes("no unique or exclusion constraint") || profileMessage.includes("on conflict")) {
        const { error: profileInsertError } = await adminClient.from("profiles").insert(profilePayload);
        if (profileInsertError) {
          console.error("[users:create] profiles insert fallback failed", profileInsertError);
          redirect("/users?error=profile-sync-failed");
        }
      } else {
        redirect("/users?error=profile-sync-failed");
      }
    }

    revalidatePath("/users");
    redirect("/users?created=1");
  } catch (err) {
    console.error("[users:create] unexpected failure", err);
    const message = String((err as { message?: string } | null)?.message ?? "").toLowerCase();
    if (message.includes("service_role") || message.includes("missing")) {
      redirect("/users?error=service-role-missing");
    }
    redirect("/users?error=create-failed");
  }
}
