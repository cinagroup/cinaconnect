interface BarChartProps {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
}

export default function BarChart({ data, labels, color = "#6366f1", height = 120 }: BarChartProps) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="bg-dashboard-surface rounded-xl border border-dashboard-border p-4">
      <div
        className="flex items-end gap-1"
        style={{ height: `${height}px` }}
      >
        {data.map((value, i) => {
          const pct = (value / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all hover:opacity-80 group relative"
              style={{
                height: `${pct}%`,
                backgroundColor: color,
                minWidth: "4px",
              }}
              title={`${labels[i]}: ${value}`}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dashboard-bg text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2">
        {labels.map((label, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[10px] text-dashboard-muted truncate"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
