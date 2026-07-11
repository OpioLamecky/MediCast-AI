import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Video, Brain, AlertTriangle, TrendingUp, MessageSquare } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentAnalysisCard from '@/components/dashboard/RecentAnalysisCard';
import SurgeonPerformanceChart from '@/components/dashboard/SurgeonPerformanceChart';

export default function Dashboard() {
  const [videos, setVideos] = useState([]);
  const [analyses, setAnalyses] = useState([]);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  const analyzedCount = videos.filter(v => v.status === 'analyzed').length;
  const avgScore = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + (a.overall_score || 0), 0) / analyses.length)
    : 0;
  const riskEvents = analyses.reduce((s, a) => s + (a.risk_events?.length || 0), 0);

  const analysisMap = {};
  analyses.forEach(a => { analysisMap[a.surgery_video_id] = a; });

  const recentVideos = videos.slice(0, 6);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-heading">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Surgical video analysis overview</p>
        </div>
        <a 
          href="https://ee.kobotoolbox.org/x/MA9HlNHe" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
        >
          <MessageSquare className="w-4 h-4" />
          Give us feedback
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard icon={Video} label="Total Videos" value={videos.length} sub="Uploaded" color="teal" />
        <StatsCard icon={Brain} label="Analyzed" value={analyzedCount} sub="Completed" color="blue" />
        <StatsCard icon={TrendingUp} label="Avg Score" value={avgScore || '—'} sub="Performance" color="amber" />
        <StatsCard icon={AlertTriangle} label="Risk Events" value={riskEvents} sub="Detected" color="rose" />
      </div>

      {analyses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 font-heading">Surgeon Performance Trends</h2>
          <SurgeonPerformanceChart analyses={analyses} videos={videos} />
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 font-heading">Recent Surgeries</h2>
        {recentVideos.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
            <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No surgery videos yet</p>
            <p className="text-slate-400 text-xs mt-1">Upload your first surgical video to get started</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentVideos.map(v => (
              <RecentAnalysisCard 
                key={v.id} 
                video={v} 
                analysis={analysisMap[v.id]} 
                onDelete={(id) => {
                  setVideos(prev => prev.filter(vid => vid.id !== id));
                  setAnalyses(prev => prev.filter(a => a.surgery_video_id !== id));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}