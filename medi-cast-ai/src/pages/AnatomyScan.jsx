import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Camera, RefreshCw, Upload, Scan, AlertTriangle, Layers } from 'lucide-react';

const REGIONS = ['Abdominal / Laparoscopic', 'Thoracic', 'Orthopedic / Extremity', 'Head & Neck', 'General Surface'];
const ATLAS = {
  'Abdominal / Laparoscopic': { organs: ['Liver', 'Gallbladder', 'Stomach', 'Spleen', 'Pancreas', 'Intestines', 'Kidneys'], vessels: ['Abdominal Aorta', 'IVC', 'Portal Vein', 'Celiac Trunk', 'SMA/SMV', 'Iliac Vessels'], bones: ['Lower Ribs', 'Xiphoid', 'Lumbar L1-L5', 'Pelvis'] },
  'Thoracic': { organs: ['Heart', 'Lungs', 'Trachea', 'Esophagus', 'Diaphragm'], vessels: ['Aortic Arch', 'SVC', 'Pulmonary Vessels', 'Subclavian Vessels'], bones: ['Sternum', 'Clavicles', 'Ribs 1-12', 'Thoracic T1-T12'] },
  'Orthopedic / Extremity': { organs: ['Muscle Compartments', 'Tendons', 'Peripheral Nerves'], vessels: ['Brachial/Radial/Ulnar', 'Femoral/Popliteal/Tibial'], bones: ['Humerus/Radius/Ulna', 'Femur/Tibia/Fibula'] },
  'Head & Neck': { organs: ['Thyroid', 'Larynx/Pharynx', 'Salivary Glands'], vessels: ['Carotid Arteries', 'Jugular Veins', 'Vertebral Arteries'], bones: ['Cranium/Mandible', 'Hyoid', 'Cervical C1-C7'] },
  'General Surface': { organs: ['Skin & Subcutaneous Tissue'], vessels: ['Superficial Venous Plexus'], bones: ['Palpable Bony Landmarks'] }
};
export default function AnatomyScan() {
  const { user } = useAuth();
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null);
  const [facing, setFacing] = useState('environment'), [camOn, setCamOn] = useState(false);
  const [scanMode, setScanMode] = useState('surface'), [region, setRegion] = useState(REGIONS[0]);
  const [layer, setLayer] = useState('organs'), [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(''), [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null), [err, setErr] = useState('');
  const stopCam = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setCamOn(false); };
  const startCam = async (m = facing) => { stopCam(); setErr(''); try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: m }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); streamRef.current = s; if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); } setCamOn(true); } catch (e) { setErr(e.message || 'Camera denied'); } };
  useEffect(() => () => stopCam(), []);
  const flipCam = () => { const n = facing === 'environment' ? 'user' : 'environment'; setFacing(n); if (camOn) startCam(n); };
  const runScan = async (img) => { setLoading(true); setErr(''); setResult(null); try { const r = await fetch('/api/anatomy/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_base64: img, region, scan_mode: scanMode, notes, actor_email: user?.email || 'clinician@medicast.local' }) }); const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Scan failed'); setResult(d); } catch (e) { setErr(e.message); } finally { setLoading(false); } };
  const captureAndScan = () => { const v = videoRef.current, c = canvasRef.current; if (!v || !c) return; c.width = v.videoWidth || 640; c.height = v.videoHeight || 480; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); const u = c.toDataURL('image/jpeg', 0.85); setPreview(u); runScan(u); };
  const onUpload = async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.name.toLowerCase().endsWith(".dcm")) { setScanMode("medical_imaging"); setLoading(true); setErr(""); setResult(null); try { const fd = new FormData(); fd.append("file", f); fd.append("region", region); fd.append("notes", notes); fd.append("actor_email", user?.email || "clinician@medicast.local"); const r = await fetch("/api/anatomy/scan-dicom", { method: "POST", body: fd }); const d = await r.json(); if (!r.ok) throw new Error(d.detail || "DICOM failed"); setPreview(d.preview_data_url || ""); setResult(d); } catch (ex) { setErr(ex.message); } finally { setLoading(false); } return; } const rd = new FileReader(); rd.onload = () => { setPreview(rd.result); runScan(rd.result); }; rd.readAsDataURL(f); };
  const a = result?.analysis, atlas = ATLAS[region] || ATLAS['General Surface'];
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> Pre-Op Anatomy Support  RGB cameras show surface only; use Medical Scan Slice for CT/MRI/X-ray review.</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2"><Scan className="w-6 h-6 text-teal-700" /> Pre-Op Anatomy Scanner & Atlas</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setScanMode('surface')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${scanMode === 'surface' ? 'bg-teal-700 text-white' : 'bg-stone-100'}`}>Surface Camera</button>
          <button onClick={() => setScanMode('medical_imaging')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${scanMode === 'medical_imaging' ? 'bg-teal-700 text-white' : 'bg-stone-100'}`}>Medical Scan Slice</button>
          <button onClick={() => camOn ? stopCam() : startCam()} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {camOn ? 'Stop' : 'Camera'}</button>
          <button onClick={flipCam} className="px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> {facing === 'environment' ? 'Front' : 'Back'}</button>
          <label className="px-3 py-1.5 rounded-lg border bg-white text-xs font-semibold flex items-center gap-1 cursor-pointer"><Upload className="w-3.5 h-3.5" /> Upload<input type="file" accept="image/*,.dcm" onChange={onUpload} className="hidden" /></label>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="aspect-video bg-stone-950 rounded-lg overflow-hidden flex items-center justify-center"><video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${camOn ? '' : 'hidden'}`} />{!camOn && (preview ? <img src={preview} alt="Scan" className="w-full h-full object-contain" /> : <span className="text-stone-400 text-xs">Start camera or upload image / CT / MRI / X-ray</span>)}</div>
          <canvas ref={canvasRef} className="hidden" />
          <select value={region} onChange={e => setRegion(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional clinical notes" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <button disabled={!camOn || loading} onClick={captureAndScan} className="w-full py-2 rounded-lg bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold">{loading ? 'Scanning...' : 'Capture & Scan'}</button>
          {err && <div className="text-xs text-red-600">{err}</div>}
        </div>
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4 space-y-2 text-xs">
            <div className="font-semibold text-sm flex justify-between"><span>AI Scan Result ({scanMode === 'medical_imaging' ? 'Medical Slice' : 'Surface'})</span>{result && <span className="text-teal-700">{result.latency_ms} ms</span>}</div>
            {!a ? <p className="text-stone-400">Capture or upload an image to analyze.</p> : <><p><strong>Region:</strong> {a.anatomical_region}</p><ul className="list-disc pl-5">{(a.visible_landmarks || []).map((x, i) => <li key={i}>{x}</li>)}</ul><p><strong>Notes:</strong> {a.positioning_and_lighting}</p><div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900"><strong>Uncertainty:</strong> {a.uncertainty_notes}</div></>}
          </div>
          <div className="bg-white border rounded-xl p-4 space-y-2 text-xs">
            <div className="font-semibold text-sm flex items-center gap-1.5"><Layers className="w-4 h-4 text-teal-700" /> Regional Reference Atlas (Not Patient Imaging)</div>
            <div className="flex gap-1.5">{['organs', 'vessels', 'bones'].map(k => <button key={k} onClick={() => setLayer(k)} className={`px-2.5 py-1 rounded capitalize font-medium ${layer === k ? 'bg-teal-700 text-white' : 'bg-stone-100'}`}>{k}</button>)}</div>
            <ul className="list-disc pl-5 space-y-0.5 text-stone-700">{(atlas[layer] || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  );
}
