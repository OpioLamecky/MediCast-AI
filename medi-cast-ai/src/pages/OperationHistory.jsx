import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Calendar, Upload, Download, Clock } from 'lucide-react';

export default function OperationHistory() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [proc, setProc] = useState('Laparoscopic Surgery');
  const [source, setSource] = useState('live');
  const [opDate, setOpDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => { const r = await fetch('/api/history'); if (r.ok) { const d = await r.json(); setGroups(d.dates || []); } };
  useEffect(() => { load(); }, []);

  const onSaveVideo = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setMsg('');
    const fd = new FormData();
    fd.append('file', f); fd.append('title', title || f.name.replace(/\.[^/.]+$/, ''));
    fd.append('procedure_type', proc); fd.append('source_type', source);
    fd.append('operation_date', opDate); fd.append('actor_email', user?.email || 'clinician@medicast.local');
    const r = await fetch('/api/history/upload', { method: 'POST', body: fd });
    setBusy(false);
    if (r.ok) { setMsg('Saved to Operation History'); setTitle(''); load(); } else setMsg('Upload failed');
  };
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2"><Calendar className="w-6 h-6 text-teal-700" /> Operation Video History</h1><p className="text-xs text-stone-500">Live OR recordings and uploaded videos grouped by date</p></div>
        <div className="flex gap-1.5">{[['all','All'],['live','Live OR'],['upload','Uploaded']].map(([k, lbl]) => <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === k ? 'bg-teal-700 text-white' : 'bg-stone-100'}`}>{lbl}</button>)}</div>
      </div>
      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-center">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Operation title" className="px-3 py-2 border rounded-lg text-sm" />
        <input value={proc} onChange={e => setProc(e.target.value)} placeholder="Procedure" className="px-3 py-2 border rounded-lg text-sm" />
        <select value={source} onChange={e => setSource(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="live">Live Operation</option><option value="upload">Uploaded Video</option></select>
        <input type="date" value={opDate} onChange={e => setOpDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
        <label className="px-3 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-4 h-4" /> {busy ? 'Saving...' : 'Save Video'}<input type="file" accept="video/*" onChange={onSaveVideo} className="hidden" /></label>
      </div>
      {msg && <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs">{msg}</div>}
      {groups.length === 0 ? <div className="p-8 text-center text-sm text-stone-400 bg-white border rounded-xl">No operation videos archived yet.</div> : groups.map(g => {
        const ops = g.operations.filter(o => filter === 'all' || o.source_type === filter);
        if (!ops.length) return null;
        return (<div key={g.date} className="space-y-3"><h2 className="text-sm font-bold text-teal-800 border-b pb-1 flex items-center gap-1.5"><Clock className="w-4 h-4" /> {g.date} ({ops.length})</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{ops.map(op => (<div key={op.id} className="bg-white border rounded-xl p-3 space-y-2"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-sm text-stone-900 truncate">{op.title}</span><span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${op.source_type === 'live' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>{op.source_type === 'live' ? 'Live OR' : 'Uploaded'}</span></div><video src={op.video_url} controls playsInline className="w-full rounded-lg bg-black aspect-video" /><div className="flex items-center justify-between text-xs text-stone-500"><span>{op.procedure_type}</span><a href={op.video_url} download className="text-teal-700 font-semibold flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Download</a></div></div>))}</div></div>);
      })}
    </div>
  );
}
