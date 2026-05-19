import { HealthCheck, ServiceDefinition } from "@/lib/services";
import { statusColor, statusBg, formatLatency } from "@/lib/utils";

interface ServiceCardProps {
  service: ServiceDefinition;
  health: HealthCheck;
  demoMode?: boolean;
}

export default function ServiceCard({ service, health, demoMode = false }: ServiceCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${statusBg(health.status)} transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{service.icon}</span>
          <div>
            <h3 className="font-semibold text-white">{service.name}</h3>
            <p className="text-xs text-dashboard-muted">{service.description}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(health.status)}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
            health.status === "healthy" ? "bg-dashboard-success animate-pulse" :
            health.status === "degraded" ? "bg-dashboard-warning" :
            health.status === "down" ? "bg-dashboard-danger" : "bg-dashboard-muted"
          }`} />
          {health.status === "unknown" ? "Checking..." : health.status}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        {health.latency !== null && health.latency >= 0 && (
          <span className="text-dashboard-muted">
            Latency: <span className="text-white font-medium">{formatLatency(health.latency)}</span>
          </span>
        )}
        {health.error && (
          <span className="text-dashboard-danger text-xs">{health.error}</span>
        )}
      </div>

      {demoMode && health.status === "down" && (
        <div className="mt-3 text-xs text-dashboard-muted">
          ℹ️ Services are running on Cloudflare Workers — enable demo mode for simulated metrics
        </div>
      )}
    </div>
  );
}
