import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const riskOrder = { low: 1, moderate: 2, high: 3, critical: 4 };
const riskColors = {
  low: '#10b981',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export default function SurgeonPerformanceChart({ analyses = [], videos = [] }) {
  const videoMap = {};
  videos.forEach(v => { videoMap[v.id] = v; });

  // Group by surgeon
  const surgeonData = {};
  analyses.forEach(a => {
    const video = videoMap[a.surgery_video_id];
    if (!video || !video.surgeon_name) return;
    const name = video.surgeon_name;
    if (!surgeonData[name]) {
      surgeonData[name] = { surgeon: name, scores: [], safety: [], efficiency: [], skill: [], risks: [] };
    }
    if (a.overall_score != null) surgeonData[name].scores.push(a.overall_score);
    if (a.safety_score != null) surgeonData[name].safety.push(a.safety_score);
    if (a.efficiency_score != null) surgeonData[name].efficiency.push(a.efficiency_score);
    if (a.skill_score != null) surgeonData[name].skill.push(a.skill_score);
    if (a.risk_level) surgeonData[name].risks.push(a.risk_level);
  });

  const data = Object.values(surgeonData).map(d => {
    const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    // Most severe risk
    const topRisk = d.risks.length
      ? d.risks.reduce((max, r) => (riskOrder[r] > riskOrder[max] ? r : max), d.risks[0])
      : null;
    return {
      surgeon: d.surgeon.length > 12 ? d.surgeon.slice(0, 12) + '…' : d.surgeon,
      Overall: avg(d.scores),
      Safety: avg(d.safety),
      Efficiency: avg(d.efficiency),
      Skill: avg(d.skill),
      topRisk,
    };
  });

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 font-heading">Surgeon Performance</h2>
        <div className="h-48 flex items-center justify-center text-sm text-slate-400">
          No analysis data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 font-heading">Surgeon Performance</h2>
          <p className="text-xs text-slate-400 mt-0.5">Average scores and dominant risk level per surgeon</p>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(riskColors).map(([level, color]) => (
            <div key={level} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-slate-500 capitalize">{level}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="surgeon" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="Overall" fill="#0d9488" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Safety" fill="#d97706" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Efficiency" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Skill" fill="#7c3aed" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Risk level summary per surgeon */}
      <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">{d.surgeon}:</span>
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize text-white"
              style={{ backgroundColor: d.topRisk ? riskColors[d.topRisk] : '#94a3b8' }}
            >
              {d.topRisk || 'n/a'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}