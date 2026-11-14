import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Shield, Activity, Users, Building2, CreditCard, Server, RefreshCw, UserPlus } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const email = (user?.email || '').toLowerCase();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('users');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [newTier, setNewTier] = useState('hospital');
  const [newUserHosp, setNewUserHosp] = useState('');
  const [hospName, setHospName] = useState('');
  const [hospLoc, setHospLoc] = useState('');
  const [assignHosp, setAssignHosp] = useState({});
  const [msg, setMsg] = useState('');

  const load = async () => {
    if (!email) return;
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin/overview', { headers: { 'X-Admin-Email': email } });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [email]);
  const postJson = async (url, body, okMsg) => {
    setMsg('');
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Email': email }, body: JSON.stringify(body) });
    if (r.ok) { setMsg(okMsg); load(); } else { setMsg('Action failed'); }
  };

  if (!email) return <div className="p-8 text-center text-stone-600">Sign in to access Admin Console.</div>;
  const h = data?.health || {}, users = data?.users || [], subscribers = data?.subscribers || [], hospitals = data?.hospitals || [], activities = data?.activities || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2"><Shield className="w-6 h-6 text-teal-700" /> Super Admin Control Center</h1>
          <p className="text-xs text-stone-500">Unrestricted access for {email}</p>
        </div>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-medium flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>
      {msg && <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-sm">{msg}</div>}
      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-stone-200"><div className="text-xs text-stone-500 flex items-center gap-1"><Server className="w-3.5 h-3.5" /> CPU / Load</div><div className="text-xl font-bold mt-1">{h.cpu_percent ?? '--'}%</div><div className="text-xs text-stone-500">Load: {(h.load_avg || []).join(', ')}</div></div>
        <div className="p-4 rounded-xl bg-white border border-stone-200"><div className="text-xs text-stone-500 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Memory / Disk</div><div className="text-xl font-bold mt-1">{h.ram_percent ?? '--'}% RAM</div><div className="text-xs text-stone-500">{h.ram_used_gb}/{h.ram_total_gb} GB  Disk {h.disk_percent}%</div></div>
        <div className="p-4 rounded-xl bg-white border border-stone-200"><div className="text-xs text-stone-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Onboarded</div><div className="text-xl font-bold mt-1">{users.length} Users</div><div className="text-xs text-stone-500">{subscribers.length} Subscribers  {hospitals.length} Hospitals</div></div>
        <div className="p-4 rounded-xl bg-white border border-stone-200"><div className="text-xs text-stone-500 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> AI & Services</div><div className="text-xs font-medium mt-1 truncate">{h.text_model || 'Vultr Inference'}</div><div className="text-xs text-teal-700 mt-1">{Object.entries(h.services || {}).map(([k, v]) => `${k}:${v}`).join('  ')}</div></div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <form onSubmit={e => { e.preventDefault(); postJson('/api/admin/users/onboard', { email: newEmail, full_name: newName, role: newRole, subscription_tier: newTier, hospital_id: newUserHosp ? Number(newUserHosp) : null }, `Onboarded ${newEmail}`); setNewEmail(''); setNewName(''); }} className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><UserPlus className="w-4 h-4 text-teal-700" /> Onboard User / Admin</h2>
          <div className="grid grid-cols-2 gap-2">
            <input required value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email address" className="col-span-2 px-3 py-1.5 border rounded-lg text-sm" />
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" className="px-3 py-1.5 border rounded-lg text-sm" />
            <select value={newRole} onChange={e => setNewRole(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm"><option value="admin">Admin</option><option value="super_admin">Super Admin</option><option value="user">User</option></select>
            <select value={newTier} onChange={e => setNewTier(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm"><option value="hospital">Hospital (Unlimited)</option><option value="pro">Pro</option><option value="free">Free</option></select>
            <select value={newUserHosp} onChange={e => setNewUserHosp(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm"><option value="">No Hospital</option>{hospitals.map(hp => <option key={hp.id} value={hp.id}>{hp.name}</option>)}</select>
          </div>
          <button type="submit" className="px-4 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold">Save & Onboard</button>
        </form>
        <form onSubmit={e => { e.preventDefault(); postJson('/api/admin/hospitals', { name: hospName, location: hospLoc, tier: 'hospital' }, `Hospital "${hospName}" created`); setHospName(''); setHospLoc(''); }} className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="w-4 h-4 text-teal-700" /> Add Hospital</h2>
          <input required value={hospName} onChange={e => setHospName(e.target.value)} placeholder="Hospital Name" className="w-full px-3 py-1.5 border rounded-lg text-sm" />
          <input value={hospLoc} onChange={e => setHospLoc(e.target.value)} placeholder="Location / City" className="w-full px-3 py-1.5 border rounded-lg text-sm" />
          <button type="submit" className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold">Create Hospital</button>
        </form>
      </div>
      <div className="flex gap-2 border-b pb-2">{['users', 'subscribers', 'hospitals', 'activities'].map(t => <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${tab === t ? 'bg-teal-700 text-white' : 'bg-stone-100'}`}>{t}</button>)}</div>
      {loading ? <div className="text-sm text-stone-500">Loading...</div> : (
        <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-left text-xs">
          {tab === 'users' && <><thead><tr className="bg-stone-50"><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Plan</th><th className="p-3">Hospital</th><th className="p-3">Assign</th></tr></thead><tbody>{users.map(u => <tr key={u.email} className="border-t"><td className="p-3 font-medium">{u.email}</td><td className="p-3">{u.role}</td><td className="p-3">{u.subscription_tier}</td><td className="p-3">{u.hospital_name || ''}</td><td className="p-3 flex gap-1"><select value={assignHosp[u.email] || ''} onChange={e => setAssignHosp({ ...assignHosp, [u.email]: e.target.value })} className="border rounded px-2 py-1"><option value="">Select...</option>{hospitals.map(hp => <option key={hp.id} value={hp.id}>{hp.name}</option>)}</select><button onClick={() => postJson('/api/admin/users/assign-hospital', { email: u.email, hospital_id: Number(assignHosp[u.email]) }, `Assigned hospital to ${u.email}`)} className="px-2 py-1 rounded bg-stone-800 text-white">Assign</button></td></tr>)}</tbody></>}
          {tab === 'subscribers' && <><thead><tr className="bg-stone-50"><th className="p-3">Email</th><th className="p-3">Tier</th><th className="p-3">Status</th><th className="p-3">Hospital</th></tr></thead><tbody>{subscribers.map(u => <tr key={u.email} className="border-t"><td className="p-3">{u.email}</td><td className="p-3">{u.subscription_tier}</td><td className="p-3">{u.subscription_status}</td><td className="p-3">{u.hospital_name || ''}</td></tr>)}</tbody></>}
          {tab === 'hospitals' && <><thead><tr className="bg-stone-50"><th className="p-3">Hospital</th><th className="p-3">Location</th><th className="p-3">Staff</th></tr></thead><tbody>{hospitals.map(hp => <tr key={hp.id} className="border-t"><td className="p-3">{hp.name}</td><td className="p-3">{hp.location || ''}</td><td className="p-3">{hp.staff_count}</td></tr>)}</tbody></>}
          {tab === 'activities' && <><thead><tr className="bg-stone-50"><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Details</th></tr></thead><tbody>{activities.map(a => <tr key={a.id} className="border-t"><td className="p-3">{a.actor_email}</td><td className="p-3">{a.action}</td><td className="p-3">{a.target}</td><td className="p-3">{a.details}</td></tr>)}</tbody></>}
        </table></div>
      )}
    </div>
  );
}
