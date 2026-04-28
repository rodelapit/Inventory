import type { ActiveAlert } from "@/data/dashboard";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

type AlertCardProps = {
  alert: ActiveAlert;
};

export function AlertCard({ alert }: AlertCardProps) {
  const getIcon = () => {
    switch (alert.type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
      case "info":
        return <Info className="h-4 w-4 text-sky-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-slate-500" />;
    }
  };

  const getBorderColor = () => {
    switch (alert.type) {
      case "warning":
        return "border-amber-200";
      case "error":
        return "border-rose-200";
      case "info":
        return "border-sky-200";
      default:
        return "border-slate-200";
    }
  };

  const getTone = () => {
    switch (alert.type) {
      case "warning":
        return "bg-[linear-gradient(160deg,rgba(254,243,224,0.92),rgba(255,255,255,0.96))]";
      case "error":
        return "bg-[linear-gradient(160deg,rgba(255,228,230,0.88),rgba(255,255,255,0.92))]";
      case "info":
        return "bg-[linear-gradient(160deg,rgba(240,249,255,0.92),rgba(255,255,255,0.96))]";
      default:
        return "bg-white";
    }
  };

  return (
    <div className={`rounded-3xl border ${getBorderColor()} ${getTone()} p-4 shadow-[0_18px_44px_rgba(148,163,184,0.12)]`}>
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border ${
            alert.type === "warning"
              ? "border-amber-200 bg-amber-50"
              : alert.type === "error"
              ? "border-rose-200 bg-rose-50"
              : "border-sky-200 bg-sky-50"
          }`}
        >
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                alert.type === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : alert.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-sky-200 bg-sky-50 text-sky-700"
              }`}
            >
              {alert.type}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p>
          <p className="mt-3 text-xs text-slate-500">{alert.age}</p>
        </div>
      </div>
    </div>
  );
}