"use client";

import { useState, FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { InventoryZoneCard } from "./InventoryZoneCard";

export type InventoryZone = {
  id: string;
  label: string;
  name: string;
  current: number;
  capacity: number;
  utilization: number;
  temperature: string;
  humidity: string;
  color: "indigo" | "cyan" | "amber" | "blue" | "violet" | "pink";
};

type InventoryZonesSectionProps = {
  initialZones: InventoryZone[];
};

const defaultFormState: Omit<InventoryZone, "utilization" | "current"> & {
  current?: number;
} = {
  id: "",
  label: "",
  name: "",
  capacity: 1000,
  temperature: "20-25°C",
  humidity: "45-55%",
  color: "indigo",
};

export function InventoryZonesSection({ initialZones }: InventoryZonesSectionProps) {
  const [zones, setZones] = useState<InventoryZone[]>(initialZones);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<typeof defaultFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setForm(defaultFormState);
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleChange = (field: keyof typeof defaultFormState, value: string) => {
    if (field === "capacity" || field === "current") {
      const numeric = Number(value.replace(/[^0-9]/g, ""));
      setForm((prev) => ({ ...prev, [field]: Number.isNaN(numeric) ? 0 : numeric }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!form.id.trim() || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const id = form.id.trim().toUpperCase();
    const label = form.label.trim() || `ZONE ${id}`;
    const name = form.name.trim();
    const capacity = form.capacity && form.capacity > 0 ? form.capacity : 1000;
    const current = form.current && form.current >= 0 ? form.current : 0;
    const utilization = Math.min(100, Math.round((current / Math.max(1, capacity)) * 100));

    const newZone: InventoryZone = {
      id,
      label,
      name,
      capacity,
      current,
      utilization,
      temperature: form.temperature,
      humidity: form.humidity,
      color: form.color,
    };

    setZones((prev) => [...prev, newZone]);
    setIsOpen(false);

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    fetch(`${basePath}/api/zones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        label,
        name,
        capacity,
        current,
        temperature: form.temperature,
        humidity: form.humidity,
        color: form.color,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const msg = json?.error || `Failed to save zone (${res.status})`;
          setError(msg);
        }
      })
      .catch((err) => {
        console.error("Error saving zone", err);
        setError("Network error while saving zone.");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <section id="storage-zones">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-200 sm:text-2xl">Storage Zones</h2>
          <p className="mt-1 text-sm text-slate-400">
            Monitor capacity utilization and environmental conditions
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Zone
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {zones.map((zone) => (
          <InventoryZoneCard
            key={zone.id}
            id={zone.id}
            label={zone.label}
            name={zone.name}
            current={zone.current}
            capacity={zone.capacity}
            utilization={zone.utilization}
            temperature={zone.temperature}
            humidity={zone.humidity}
            color={zone.color}
            trend={{
              value: Math.round(zone.utilization - 80),
              isPositive: zone.utilization >= 80,
            }}
          />
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#050b26] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Storage Zone</h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close add zone dialog"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {error && (
                <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Zone ID
                  </label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={(e) => handleChange("id", e.target.value)}
                    placeholder="A, B, C..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Label
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => handleChange("label", e.target.value)}
                    placeholder="ZONE A"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ambient Storage"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Capacity (units)
                  </label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => handleChange("capacity", e.target.value)}
                    placeholder="15000"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Current (units)
                  </label>
                  <input
                    type="number"
                    value={form.current ?? 0}
                    onChange={(e) => handleChange("current", e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Temperature
                  </label>
                  <input
                    type="text"
                    value={form.temperature}
                    onChange={(e) => handleChange("temperature", e.target.value)}
                    placeholder="20-25°C"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Humidity
                  </label>
                  <input
                    type="text"
                    value={form.humidity}
                    onChange={(e) => handleChange("humidity", e.target.value)}
                    placeholder="45-55%"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Color
                </label>
                <select
                  value={form.color}
                  onChange={(e) => handleChange("color", e.target.value)}
                  title="Zone color theme"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                >
                  <option value="indigo">Indigo</option>
                  <option value="cyan">Cyan</option>
                  <option value="amber">Amber</option>
                  <option value="blue">Blue</option>
                  <option value="violet">Violet</option>
                  <option value="pink">Pink</option>
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save Zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
