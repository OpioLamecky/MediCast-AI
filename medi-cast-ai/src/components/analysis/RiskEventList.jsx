import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const severityConfig = {
  critical: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  high: { icon: AlertTriangle, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  moderate: { icon: AlertCircle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  low: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
};

export default function RiskEventList({ events = [] }) {
  const validEvents = Array.isArray(events) ? events : [];
  if (!validEvents.length) {
    return <p className="text-sm text-slate-400 italic">No risk events detected</p>;
  }

  return (
    <div className="space-y-3">
      {validEvents.map((event, i) => {
        const config = severityConfig[event.severity] || severityConfig.low;
        const Icon = config.icon;
        return (
          <div key={i} className={`rounded-lg border p-3 ${config.bg} ${config.border}`}>
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 mt-0.5 ${config.text}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${config.badge}`}>
                    {event.severity}
                  </span>
                  {event.timestamp && <span className="text-[10px] text-slate-400">{event.timestamp}</span>}
                </div>
                <p className="text-sm text-slate-800 mt-1">{event.description}</p>
                {event.recommendation && (
                  <p className="text-xs text-slate-600 mt-1 italic">→ {event.recommendation}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}