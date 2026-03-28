import { AppSidebar } from "../../../components/dashboard/admin/AppSidebar";
import { ThemeProvider } from "../../../components/ThemeProvider/ThemeProvider";
import { ShieldCheck, UserPlus, Filter, MoreVertical } from "lucide-react";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { createStaffAccount } from "./user-management-actions";

type User = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Staff";
  status: "Active" | "Invited" | "Disabled";
  lastSeen: string;
};

function mapRole(roleValue: unknown): User["role"] {
  const role = String(roleValue ?? "").toLowerCase();
  if (role === "admin" || role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Staff";
}

function mapStatus(user: { banned_until?: string | null; email_confirmed_at?: string | null }): User["status"] {
  if (user.banned_until) return "Disabled";
  if (user.email_confirmed_at) return "Active";
  return "Invited";
}

type UsersPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  let users: User[] = [];
  let loadError: string | null = null;

  type ProfileRow = {
    user_id?: string | null;
    email?: string | null;
    full_name?: string | null;
    role?: string | null;
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseAdminClient();

      const [authResult, profilesResult] = await Promise.allSettled([
        supabase.auth.admin.listUsers({ page: 1, perPage: 500 }),
        supabase.from("profiles").select("*").limit(500),
      ]);

      let authUsers: SupabaseAuthUser[] = [];
      let profileRows: ProfileRow[] = [];

      if (authResult.status === "fulfilled") {
        if (authResult.value.error) {
          loadError = "Unable to load authentication users from Supabase admin API.";
        } else {
          authUsers = authResult.value.data?.users ?? [];
        }
      } else {
        loadError = "Unable to reach Supabase admin API right now.";
      }

      if (profilesResult.status === "fulfilled") {
        if (profilesResult.value.error) {
          if (!loadError) {
            loadError = "Unable to load profile records from Supabase.";
          }
        } else {
          profileRows = (profilesResult.value.data ?? []) as ProfileRow[];
        }
      } else if (!loadError) {
        loadError = "Unable to reach profile data source right now.";
      }

      const profilesById = new Map<string, ProfileRow>();
      for (const row of profileRows) {
        const userId = String(row.user_id ?? "");
        if (!userId) continue;
        profilesById.set(userId, row);
      }

      users = authUsers.map((authUser: SupabaseAuthUser) => {
        const profile = profilesById.get(authUser.id);
        const email = String(authUser.email ?? profile?.email ?? "");
        const fallbackName = email ? email.split("@")[0] : "User";
        const displayName =
          String(profile?.full_name ?? authUser?.user_metadata?.full_name ?? fallbackName).trim() ||
          fallbackName;

        const status = mapStatus(authUser as { banned_until?: string | null; email_confirmed_at?: string | null });

        return {
          id: authUser.id,
          name: displayName,
          email: email || "No email",
          role: mapRole(profile?.role ?? authUser?.user_metadata?.role),
          status,
          lastSeen: authUser?.last_sign_in_at
            ? new Date(authUser.last_sign_in_at).toLocaleString()
            : "Never",
        };
      });

      if (users.length === 0 && profileRows.length > 0) {
        users = profileRows.map((profile, index) => {
          const email = String(profile.email ?? "");
          const fallbackName = email ? email.split("@")[0] : `User ${index + 1}`;
          const displayName = String(profile.full_name ?? fallbackName).trim() || fallbackName;

          return {
            id: String(profile.user_id ?? `profile-${index}`),
            name: displayName,
            email: email || "No email",
            role: mapRole(profile.role),
            status: "Invited",
            lastSeen: "Unknown",
          };
        });
      }
    } catch {
      users = [];
      loadError = "User data could not be loaded. Check Supabase connection and service role key.";
    }
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "Active").length;
  const invitedUsers = users.filter((u) => u.status === "Invited").length;
  const statusCreated = params?.created === "1";
  const errorKey = params?.error;

  const errorMessages: Record<string, string> = {
    "missing-fields": "Full name, email, and password are required.",
    "weak-password": "Password must be at least 8 characters.",
    "email-exists": "An account with this email already exists.",
    "create-failed": "Could not create the staff account. Please try again.",
    "supabase-not-configured": "Supabase is not configured for account creation.",
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="flex min-w-0 flex-col">
          <ThemeProvider initial="dashboard">
            <header className="border-b border-slate-900/8 bg-[rgba(244,239,230,0.9)] px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700/80">
                    Users
                  </p>
                  <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                    User management
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
                    Control who can access the inventory and what they can do.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button className="flex items-center gap-2 rounded-full border border-slate-900/8 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-[0_12px_30px_rgba(148,163,184,0.22)] sm:px-4 sm:text-sm">
                    <Filter className="h-4 w-4 text-slate-700" />
                    Filters
                  </button>
                  <button className="flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_18px_40px_rgba(16,185,129,0.65)] hover:bg-emerald-700 sm:px-4 sm:text-sm">
                    <UserPlus className="h-4 w-4" />
                    Invite user
                  </button>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              <div className="mx-auto max-w-7xl space-y-6">
                {/* Create staff account */}
                <section className="rounded-3xl border border-slate-900/8 bg-white/95 p-4 sm:p-5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Create staff account</h2>
                      <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                        Add a new staff login and automatically register it in Users.
                      </p>
                    </div>
                  </div>

                  {loadError && (
                    <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {loadError}
                    </div>
                  )}

                  {statusCreated && (
                    <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Staff account created successfully.
                    </div>
                  )}

                  {errorKey && errorMessages[errorKey] && (
                    <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {errorMessages[errorKey]}
                    </div>
                  )}

                  <form action={createStaffAccount} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                    <label className="text-sm">
                      <span className="text-slate-600">Full name</span>
                      <input
                        name="fullName"
                        type="text"
                        required
                        placeholder="Juan Dela Cruz"
                        className="mt-1 w-full rounded-2xl border border-slate-900/10 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="text-slate-600">Email</span>
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="staff@store.com"
                        className="mt-1 w-full rounded-2xl border border-slate-900/10 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="text-slate-600">Temporary password</span>
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="At least 8 characters"
                        className="mt-1 w-full rounded-2xl border border-slate-900/10 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </label>

                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(16,185,129,0.45)] hover:bg-emerald-700"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create staff
                    </button>
                  </form>
                </section>

                {/* Summary cards */}
                <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                  <div className="rounded-3xl border border-slate-900/8 bg-white/90 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.18)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Total users
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{totalUsers}</p>
                    <p className="mt-1 text-xs text-slate-500">All accounts with access</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                      Active
                    </p>
                    <p className="mt-3 text-3xl font-bold text-emerald-900">{activeUsers}</p>
                    <p className="mt-1 text-xs text-emerald-800/80">Currently allowed to sign in</p>
                  </div>

                  <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 shadow-[0_18px_40px_rgba(251,191,36,0.18)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                      Pending invites
                    </p>
                    <p className="mt-3 text-3xl font-bold text-amber-900">{invitedUsers}</p>
                    <p className="mt-1 text-xs text-amber-800/80">Users who haven&apos;t joined yet</p>
                  </div>

                  <div className="hidden rounded-3xl border border-rose-100 bg-rose-50 p-4 shadow-[0_18px_40px_rgba(244,63,94,0.18)] md:block">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-800">
                        Role model
                      </p>
                      <ShieldCheck className="h-5 w-5 text-rose-700" />
                    </div>
                    <p className="mt-3 text-sm text-rose-900">
                      Use roles like Owner, Manager, and Staff to separate responsibilities.
                    </p>
                  </div>
                </section>

                {/* Users table */}
                <section className="rounded-3xl border border-slate-900/8 bg-white/95 p-4 sm:p-5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Users</h2>
                      <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                        Overview of all users with access to this inventory.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-1 text-left text-xs sm:text-sm">
                      <thead className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2">User</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Last seen</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 && (
                          <tr className="rounded-xl bg-slate-50">
                            <td
                              colSpan={5}
                              className="px-3 py-6 text-center align-middle text-sm text-slate-500"
                            >
                              No users yet. Invite your first user to get started.
                            </td>
                          </tr>
                        )}
                        {users.map((user) => (
                          <tr key={user.id} className="rounded-xl bg-slate-50">
                            <td className="max-w-xs px-3 py-2.5 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                                  <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  {
                                    Owner: "bg-indigo-50 text-indigo-800",
                                    Manager: "bg-emerald-50 text-emerald-800",
                                    Staff: "bg-slate-100 text-slate-800",
                                  }[user.role]
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  {
                                    Active: "bg-emerald-50 text-emerald-800",
                                    Invited: "bg-amber-50 text-amber-800",
                                    Disabled: "bg-rose-50 text-rose-800",
                                  }[user.status]
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 align-middle text-[13px] text-slate-600">
                              {user.lastSeen}
                            </td>
                            <td className="px-3 py-2.5 text-right align-middle">
                              <button
                                aria-label="User actions"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}
