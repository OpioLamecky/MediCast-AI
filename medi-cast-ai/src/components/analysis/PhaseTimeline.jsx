import { Clock } from 'lucide-react';

const phaseColors = [
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-amber-500', 'bg-rose-500', 'bg-emerald-500', 'bg-cyan-500',
];

export default function PhaseTimeline({ phases = [] }) {
  const validPhases = Array.isArray(phases) ? phases : [];
  if (!validPhases.length) return null;

  return (
    <div className="space-y-3">
      {validPhases.map((phase, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${phaseColors[i % phaseColors.length]}`} />
            {i < phases.length - 1 && <div className="w-px h-8 bg-slate-200" />}
          </div>
          <div className="flex-1 -mt-0.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">{phase.name}</p>
              {phase.score != null && (
                <span className="text-xs font-semibold text-slate-500">{phase.score}/100</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400">{phase.start_time} – {phase.end_time}</span>
            </div>
            {phase.notes && <p className="text-xs text-slate-500 mt-1">{phase.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}