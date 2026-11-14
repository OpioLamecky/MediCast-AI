import React, { useState } from 'react';
import { enqueueOffline } from '@/lib/offlineQueue';
import { CheckSquare, ShieldCheck } from 'lucide-react';

const ITEMS = {
  signIn: ['Patient identity, site & consent confirmed', 'Anesthesia safety check complete', 'Pulse oximeter active', 'Allergies & airway risk checked'],
  timeOut: ['Team roles & names confirmed', 'Patient, site & procedure verified', 'Antibiotic prophylaxis given (<60m)', 'Critical events & blood loss reviewed'],
  signOut: ['Instrument, sponge & needle counts match', 'Specimens labeled', 'Equipment issues logged', 'Post-op recovery plan confirmed']
};

export default function WhoSafetyChecklist({ userEmail = 'clinician@medicast.local' }) {
  const [phase, setPhase] = useState('signIn');
  const [checked, setChecked] = useState({});
  const [ackMsg, setAckMsg] = useState('');
  const toggle = (k) => setChecked(c => ({ ...c, [k]: !c[k] }));
  const logAck = async (label) => {
    const body = { actor_email: userEmail, event_label: label, shadow_mode: true };
    try {
      const r = await fetch('/api/admin/telemetry/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      setAckMsg(`Logged: ${label}`);
    } catch { enqueueOffline('/api/admin/telemetry/ack', body); setAckMsg(`Queued offline: ${label}`); }
  };
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-stone-800 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-teal-700" /> WHO Surgical Safety Checklist</div>
        <div className="flex gap-1.5">{[['signIn','1. Sign In'],['timeOut','2. Time Out'],['signOut','3. Sign Out']].map(([k, lbl]) => <button key={k} type="button" onClick={() => setPhase(k)} className={`px-2.5 py-1 rounded text-xs font-medium ${phase === k ? 'bg-teal-700 text-white' : 'bg-stone-100 text-stone-700'}`}>{lbl}</button>)}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">{ITEMS[phase].map((txt, i) => { const k = `${phase}_${i}`; return <label key={k} className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 cursor-pointer"><input type="checkbox" checked={!!checked[k]} onChange={() => toggle(k)} /><span>{txt}</span></label>; })}</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => logAck(`WHO_${phase}_verified`)} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Log Clinician Verification</button>
        {ackMsg && <span className="text-xs text-teal-700 font-medium">{ackMsg}</span>}
      </div>
    </div>
  );
}
