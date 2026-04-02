"use client";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="border-b border-slate-900/8 bg-[rgba(239,244,251,0.9)] px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/85">
            Operations
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
            {description}
          </p>
        </div>

        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}