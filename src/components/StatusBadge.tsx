interface StatusBadgeProps {
  status: string;
  type?: "design" | "lead" | "interest";
}

const statusStyles: Record<string, Record<string, string>> = {
  design: {
    uploaded:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    pending:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    approved:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    ready_for_production:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
  },
  lead: {
    new: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    interested:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    ghosted:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
    bought:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  interest: {
    high: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    medium:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    low: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
  },
};

export default function StatusBadge({
  status,
  type = "design",
}: StatusBadgeProps) {
  const style =
    statusStyles[type]?.[status] ||
    "bg-slate-500/10 text-slate-400 border-slate-500/20";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize border ${style}`}
    >
      {label}
    </span>
  );
}
