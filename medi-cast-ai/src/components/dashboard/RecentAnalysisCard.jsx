import { Link } from 'react-router-dom';
import { ArrowRight, Trash2, FileText, Download } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { generateWordReport } from '@/utils/reportGenerator';

const riskColors = {
  low: 'bg-emerald-100 text-emerald-700',
  moderate: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function RecentAnalysisCard({ video, analysis, onDelete }) {
  const { toast } = useToast();

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this video and all associated analyses?")) return;
    
    try {
      const { error } = await supabase.from('SurgeryVideo').delete().eq('id', video.id);
      if (error) throw error;
      toast({ title: 'Deleted successfully' });
      if (onDelete) onDelete(video.id);
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await generateWordReport(video, analysis);
      toast({ title: 'Report downloaded' });
    } catch (err) {
      toast({ title: 'Report download failed', variant: 'destructive' });
    }
  };

  return (
    <Link
      to={`/analysis/${video.id}`}
      className="block bg-white rounded-xl border border-slate-200/80 p-4 hover:shadow-md hover:border-slate-300 transition-all group relative"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {analysis && (
          <button onClick={handleDownload} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors" title="Download Word Report">
            <Download className="w-4 h-4" />
          </button>
        )}
        <button onClick={handleDelete} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-md transition-colors" title="Delete Surgery">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start justify-between pr-16">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{video.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{video.procedure_type}</p>
        </div>
      </div>

      {analysis && (
        <div className="mt-3 flex items-center gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Score</p>
            <p className="text-lg font-semibold text-slate-900">{analysis.overall_score || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Safety</p>
            <p className="text-lg font-semibold text-slate-900">{analysis.safety_score || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Risk</p>
            {analysis?.risk_level ? (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${riskColors[analysis.risk_level]}`}>
                {analysis.risk_level}
              </span>
            ) : <p className="text-sm text-slate-400">—</p>}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center text-xs text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View analysis <ArrowRight className="w-3 h-3 ml-1" />
        </div>
        {analysis && (
          <div className="flex items-center text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            <FileText className="w-3 h-3 mr-1" /> Report Ready
          </div>
        )}
      </div>
    </Link>
  );
}