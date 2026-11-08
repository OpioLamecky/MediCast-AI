import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { SURGICAL_PROCEDURES, SURGICAL_DEPARTMENTS } from '@/api/aiService';
import { Upload, FileVideo, Loader2, Radio, Video, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useSubscription } from '@/lib/SubscriptionContext';

const procedures = SURGICAL_PROCEDURES;
const departments = SURGICAL_DEPARTMENTS;

export default function UploadVideo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAnalyzeVideo, openUpgradeModal, isProOrHigher } = useSubscription();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    procedure_type: '',
    surgeon_name: '',
    patient_id: '',
    surgery_date: '',
    duration_minutes: '',
    department: '',
    notes: '',
  });

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.procedure_type) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    // Verify video analysis subscription quota
    const quota = canAnalyzeVideo();
    if (!quota.allowed) {
      toast({
        title: 'Monthly Analysis Limit Reached',
        description: quota.reason,
        variant: 'destructive'
      });
      openUpgradeModal('Video Analysis Monthly Quota');
      return;
    }

    setUploading(true);
    try {
      // Create local blob URL for immediate high-performance playback
      const localBlobUrl = file ? URL.createObjectURL(file) : '';

      // Create the database record immediately, set as uploaded so it doesn't spin
      const { data: video, error: insertError } = await supabase.from('SurgeryVideo').insert([{
        ...form,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        video_url: localBlobUrl,
        status: 'uploaded', // Skip the 'uploading' status entirely!
      }]).select().single();

      if (insertError) throw insertError;

      // Start cloud upload if storage is configured
      if (file) {
        const fileName = `${Date.now()}_${file.name}`;
        supabase.storage.from('videos').upload(fileName, file).then(async ({ error: uploadError }) => {
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
            if (urlData?.publicUrl) {
              await supabase.from('SurgeryVideo').update({ video_url: urlData.publicUrl }).eq('id', video.id);
            }
          }
        }).catch(() => {});
      }

      // Immediately navigate the user and pass the raw File object in router state so it plays instantly!
      toast({ title: 'Success', description: 'Video uploaded! Ready for AI analysis.' });
      navigate(`/analysis/${video.id}`, { state: { localVideoFile: file, freshUpload: true } });
    } catch (err) {
      console.error('[UploadVideo] Failed to insert:', err);
      toast({ title: 'Failed to create record', description: err.message, variant: 'destructive' });
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-heading">Upload Pre-Recorded Surgery</h1>
          <p className="text-sm text-slate-500 mt-1">Upload a recorded surgical video or switch to Live PC Camera stream</p>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-stone-200/75 border border-stone-300/60 self-start sm:self-auto shrink-0">
          <Link
            to={`/live?mode=live${form.procedure_type ? `&procedure=${encodeURIComponent(form.procedure_type)}` : ''}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 transition-all"
          >
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <span>Live Camera</span>
          </Link>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-teal-800 shadow-xs border border-teal-200/80">
            <Video className="w-3.5 h-3.5 text-teal-600" />
            <span>Pre-Recorded</span>
          </span>
        </div>
      </div>

      {/* Subscription Quota Status Banner */}
      <div className="mb-6 p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-stone-900">
              {isProOrHigher ? 'Pro Surgeon Plan · Unlimited Video Analyses' : 'Resident Tier Quota'}
            </p>
            <p className="text-stone-500">
              {isProOrHigher
                ? 'Full multi-phase surgical AI vision & kinematics tracking unlocked.'
                : `${canAnalyzeVideo().remaining} of 3 video analyses remaining this calendar month.`}
            </p>
          </div>
        </div>

        {!isProOrHigher && (
          <button
            type="button"
            onClick={() => openUpgradeModal('Video Upload Page')}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-xs self-start sm:self-auto shrink-0"
          >
            Upgrade to Pro
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File upload */}
        <div>
          <Label className="text-sm font-medium text-slate-700">Video File</Label>
          <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all">
            <input type="file" accept="video/*" onChange={handleFile} className="hidden" />
            {file ? (
              <div className="text-center">
                <FileVideo className="w-10 h-10 text-teal-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI up to 500MB</p>
              </div>
            )}
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Lap Chole #247" className="mt-1.5" />
          </div>
          <div>
            <Label>Procedure Type *</Label>
            <Select value={form.procedure_type} onValueChange={v => setForm(f => ({ ...f, procedure_type: v }))}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select procedure" /></SelectTrigger>
              <SelectContent>
                {procedures.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="surgeon">Surgeon Name</Label>
            <Input id="surgeon" value={form.surgeon_name} onChange={e => setForm(f => ({ ...f, surgeon_name: e.target.value }))} placeholder="Enter your name" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="patient">Patient ID (Anonymized)</Label>
            <Input id="patient" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} placeholder="PT-00123" className="mt-1.5" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="date">Surgery Date</Label>
            <Input id="date" type="date" value={form.surgery_date} onChange={e => setForm(f => ({ ...f, surgery_date: e.target.value }))} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="duration">Duration (min)</Label>
            <Input id="duration" type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="90" className="mt-1.5" />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional observations or context..." className="mt-1.5" rows={3} />
        </div>

        <Button type="submit" disabled={uploading} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11">
          {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : 'Upload & Continue'}
        </Button>
      </form>
    </div>
  );
}