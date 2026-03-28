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
        return "border-amber-500/18";
      case "error":
        return "border-rose-500/18";
      case "info":
        return "border-sky-500/18";
      default:
        return "border-slate-900/8";
    }
  };

  const getTone = () => {
    switch (alert.type) {
      case "warning":
        return "bg-[linear-gradient(160deg,rgba(254,243,199,0.88),rgba(255,255,255,0.92))]";
      case "error":
        return "bg-[linear-gradient(160deg,rgba(255,228,230,0.88),rgba(255,255,255,0.92))]";
      case "info":
        return "bg-[linear-gradient(160deg,rgba(224,242,254,0.88),rgba(255,255,255,0.92))]";
      default:
        return "bg-white";
    }
  };

  return (
    <div className={`rounded-3xl border ${getBorderColor()} ${getTone()} p-4 shadow-[0_18px_44px_rgba(148,163,184,0.14)]`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-900/8 bg-white/70">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
            <span className="rounded-full border border-slate-900/8 bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
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