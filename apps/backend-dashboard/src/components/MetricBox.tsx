interface MetricBoxProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: "up" | "down" | "stable";
  color?: string;
}

export default function MetricBox({ label, value, icon, trend, color = "text-white" }: MetricBoxProps) {
  return (
    <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-dashboard-muted">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        {trend && (
          <span className={`text-xs mb-1 ${
            trend === "up" ? "text-dashboard-success" :
            trend === "down" ? "text-dashboard-danger" : "text-dashboard-muted"
          }`}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
    </div>
  );
}
