type StorageTransfer = {
  name: string;
  status: string;
  trend: string;
};

type MovementEntry = {
  action: string;
  detail: string;
  time: string;
};

type InventoryManagementSectionProps = {
  inventoryFunctions: string[];
  storageTransfers: StorageTransfer[];
  movementLog: MovementEntry[];
};

export function InventoryManagementSection({
  inventoryFunctions,
  storageTransfers,
  movementLog,
}: InventoryManagementSectionProps) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-600">
          Inventory Management
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">
          Track movement, levels, and adjustments
        </h2>
        <p className="mt-4 text-slate-600">
          Every delivery, transfer, or shrinkage event is captured so staff can
          trust the stock view before acting.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {inventoryFunctions.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">
            Storage utilization & transfers
          </p>
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            {storageTransfers.map((zone) => (
              <div
                key={zone.name}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-900">
                    {zone.name}
                  </p>
                  <span className="text-xs text-cyan-700">{zone.status}</span>
                </div>
                <p className="text-xs text-slate-500">{zone.trend}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-600">
            Stock movement log
          </p>
          <ul className="mt-4 space-y-4 text-sm text-slate-700">
            {movementLog.map((entry) => (
              <li
                key={entry.action}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{entry.action}</p>
                  <span className="text-xs text-slate-500">{entry.time}</span>
                </div>
                <p className="text-xs text-slate-600">{entry.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
