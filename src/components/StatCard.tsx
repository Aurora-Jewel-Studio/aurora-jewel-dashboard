interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: { value: string; positive: boolean };
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  trend,
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-5 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 group shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                trend.positive
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
              }`}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center shadow-md opacity-90 group-hover:opacity-100 transition-opacity`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
