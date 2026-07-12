import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Brain, Search, Trash2, FileText, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { generateWordReport } from '@/utils/reportGenerator';

const riskColors = {
  low: 'bg-emerald-100 text-emerald-700',
  moderate: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const statusColors = {
  uploaded: 'bg-slate-100 text-slate-600',
  uploading: 'bg-indigo-100 text-indigo-600',
  analyzing: 'bg-blue-100 text-blue-600',
  analyzed: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-600',
};

export default function Analyses() {
  const { toast } = useToast();
  const [videos, setVideos] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: v, error: vError }, { data: a, error: aError }] = await Promise.all([
          supabase.from('SurgeryVideo').select('*').order('created_date', { ascending: false }).limit(50),
          supabase.from('AnalysisResult').select('*').order('created_date', { ascending: false }).limit(50),
        ]);
        if (vError) throw vError;
        if (aError) throw aError;
        setVideos(v || []);
        setAnalyses(a || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const analysisMap = {};
  analyses.forEach(a => { analysisMap[a.surgery_video_id] = a; });

  const filtered = videos.filter(v =>
    v.title?.toLowerCase().includes(search.toLowerCase()) ||
    v.procedure_type?.toLowerCase().includes(search.toLowerCase()) ||
    v.surgeon_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this surgery video? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from('SurgeryVideo').delete().eq('id', id);
      if (error) throw error;
      setVideos(prev => prev.filter(v => v.id !== id));
      setAnalyses(prev => prev.filter(a => a.surgery_video_id !== id));
      toast({ title: 'Video deleted successfully' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownload = async (video, analysis) => {
    try {
      await generateWordReport(video, analysis);
      toast({ title: 'Report downloaded' });
    } catch (err) {
      toast({ title: 'Report download failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-heading">All Analyses</h1>
          <p className="text-sm text-slate-500 mt-1">{videos.length} surgeries recorded</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, procedure, or surgeon..."
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Brain className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No results found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Surgery</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Procedure</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Score</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Risk</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const a = analysisMap[v.id];
                  return (
                    <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-3">
                        <Link to={`/analysis/${v.id}`} className="font-medium text-slate-900 hover:text-teal-600 transition-colors">
                          {v.title}
                        </Link>
                        {v.surgeon_name && <p className="text-xs text-slate-400">{v.surgeon_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.procedure_type}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusColors[v.status] || statusColors.uploaded}`}>
                          {v.status}
                        </span>
                        {a && (
                          <div className="mt-1 flex items-center text-[9px] text-blue-600 font-semibold uppercase tracking-wide">
                            <FileText className="w-2.5 h-2.5 mr-1" /> Report Ready
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{a?.overall_score || '—'}</td>
                      <td className="px-4 py-3">
                        {a?.risk_level ? (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${riskColors[a.risk_level]}`}>
                            {a.risk_level}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          {a && (
                            <button onClick={() => handleDownload(v, a)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors" title="Download Word Report">
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(v.id)} className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors" title="Delete Video">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}