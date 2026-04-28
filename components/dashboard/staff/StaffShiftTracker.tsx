"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, LogIn, LogOut, TimerReset } from "lucide-react";

type ShiftSnapshot = {
  status: "clocked-out" | "clocked-in";
  clockedInAt: string | null;
  clockedOutAt: string | null;
  note: string;
};

type StaffShiftTrackerProps = {
  userId: string;
  email: string | null;
  role: string;
};

const getStorageKey = (userId: string) => `staff-shift:${userId}`;

function formatDuration(start?: string | null): string {
  if (!start) return "0m";
  const started = new Date(start);
  if (Number.isNaN(started.getTime())) return "0m";

  const diffMs = Date.now() - started.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function StaffShiftTracker({ userId, email, role }: StaffShiftTrackerProps) {
  const [hydrated, setHydrated] = useState(false);
  const [snapshot, setSnapshot] = useState<ShiftSnapshot>({
    status: "clocked-out",
    clockedInAt: null,
    clockedOutAt: null,
    note: "Ready to start shift",
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(getStorageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as ShiftSnapshot;
        setSnapshot(parsed);
      }
    } catch {
      // Keep the default snapshot when localStorage is unavailable.
    } finally {
      setHydrated(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(getStorageKey(userId), JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures in private mode or when storage is blocked.
    }
  }, [hydrated, snapshot, userId]);

  const isClockedIn = snapshot.status === "clocked-in";
  const shiftLength = useMemo(() => formatDuration(snapshot.clockedInAt), [snapshot.clockedInAt]);

  const handleClockIn = () => {
    const now = new Date().toISOString();
    setSnapshot({
      status: "clocked-in",
      clockedInAt: now,
      clockedOutAt: null,
      note: "Clocked in for active shift",
    });
  };

  const handleClockOut = () => {
    const now = new Date().toISOString();
    setSnapshot((prev) => ({
      ...prev,
      status: "clocked-out",
      clockedOutAt: now,
      note: "Shift ended and saved locally",
    }));
  };

  const handleReset = () => {
    setSnapshot({
      status: "clocked-out",
      clockedInAt: null,
      clockedOutAt: null,
      note: "Ready to start shift",
    });
  };

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">Shift control</p>
          <h2 className="mt-2 text-xl font-semibold text-emerald-950">Clock in / clock out</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            A lightweight staff workflow for starting and ending shifts. The state is stored locally on this device.
          </p>
        </div>

        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isClockedIn ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          {isClockedIn ? "On shift" : "Off shift"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Staff member</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{email ?? "Unknown staff member"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{role}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Shift length</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{isClockedIn ? shiftLength : "0m"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="shift-note">
            Shift note
          </label>
          <textarea
            id="shift-note"
            value={snapshot.note}
            onChange={(event) => setSnapshot((prev) => ({ ...prev, note: event.target.value }))}
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-emerald-500 transition placeholder:text-slate-400 focus:ring-2"
            placeholder="Add a quick note for the next staff member"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleClockIn}
            disabled={isClockedIn}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            <LogIn className="h-4 w-4" />
            Clock in
          </button>
          <button
            type="button"
            onClick={handleClockOut}
            disabled={!isClockedIn}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <LogOut className="h-4 w-4" />
            Clock out
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <TimerReset className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-4 w-4 text-emerald-600" />
          <p>{snapshot.note}</p>
        </div>
        {snapshot.clockedOutAt ? (
          <p className="mt-2 text-xs text-slate-500">Last clock-out: {new Date(snapshot.clockedOutAt).toLocaleString()}</p>
        ) : null}
      </div>
    </section>
  );
}
