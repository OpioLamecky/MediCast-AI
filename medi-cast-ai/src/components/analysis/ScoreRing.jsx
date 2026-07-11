export default function ScoreRing({ score, size = 80, label, color = '#0d9488' }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score ? (score / 100) * circumference : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <p className="text-xl font-bold text-slate-900 -mt-[calc(50%+10px)]">{score ?? '—'}</p>
      {label && <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-5">{label}</p>}
    </div>
  );
}