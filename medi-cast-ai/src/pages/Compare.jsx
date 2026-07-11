import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, GitCompare, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScoreRing from '@/components/analysis/ScoreRing';
import PhaseTimeline from '@/components/analysis/PhaseTimeline';
import RiskEventList from '@/components/analysis/RiskEventList';

export default function Compare() {
  const [videos, setVideos] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leftId, setLeftId] = useState(null);
  const [rightId, setRightId] = useState(null);

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
        if (v.length >= 1) setLeftId(v[0].id);
        if (v.length >= 2) setRightId(v[1].id);
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

  const getVideo = (id) => videos.find(v => v.id === id);
  const leftVideo = leftId ? getVideo(leftId) : null;
  const rightVideo = rightId ? getVideo(rightId) : null;
  const leftAnalysis = leftId ? analysisMap[leftId] : null;
  const rightAnalysis = rightId ? analysisMap[rightId] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  const renderColumn = (video, analysis, side, selectedId, setSelectedId) => {
    const available = videos.filter(v => v.id !== (side === 'left' ? rightId : leftId));

    return (
      <div className="flex-1 min-w-0">
        <Select value={selectedId || ''} onValueChange={setSelectedId}>
          <SelectTrigger className="mb-3"><SelectValue placeholder="Select a surgery" /></SelectTrigger>
          <SelectContent>
            {available.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!video ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <GitCompare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Select a surgery to compare</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video */}
            {video.video_url && (
              <div className="bg-black rounded-xl overflow-hidden aspect-video">
                <video src={video.video_url} controls className="w-full h-full" />
              </div>
            )}

            {/* Info */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4">
              <h3 className="text-sm font-semibold text-slate-900">{video.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{video.procedure_type} · {video.surgeon_name || 'Unknown'}</p>
            </div>

            {/* Analysis */}
            {!analysis ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-400">No analysis available</p>
                <Link to={`/analysis/${video.id}`} className="text-xs text-teal-600 mt-1 inline-block">
                  Run analysis →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Scores */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <div className="flex items-center justify-around flex-wrap gap-3">
                    <ScoreRing score={analysis.overall_score} size={64} label="Overall" />
                    <ScoreRing score={analysis.safety_score} size={64} label="Safety" color="#d97706" />
                    <ScoreRing score={analysis.efficiency_score} size={64} label="Efficiency" color="#2563eb" />
                    <ScoreRing score={analysis.skill_score} size={64} label="Skill" color="#7c3aed" />
                  </div>
                </div>

                {/* Phases */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <h4 className="text-xs font-semibold text-slate-900 mb-3 uppercase tracking-wide">Phases</h4>
                  <PhaseTimeline phases={analysis.phases} />
                </div>

                {/* Risk Events */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <h4 className="text-xs font-semibold text-slate-900 mb-3 uppercase tracking-wide">Risk Events</h4>
                  <RiskEventList events={analysis.risk_events} />
                </div>

                {/* Instruments */}
                {analysis.instruments_detected?.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                    <h4 className="text-xs font-semibold text-slate-900 mb-2 uppercase tracking-wide">Instruments</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.instruments_detected.map((inst, i) => (
                        <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {inst}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (videos.length === 0) {
    return (
      <div className="p-8 text-center">
        <GitCompare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Upload at least two surgery videos to compare</p>
        <Link to="/upload" className="text-teal-600 text-sm mt-2 inline-block">Upload a video →</Link>
      </div>
    );
  }

  // Delta comparison
  let delta = null;
  if (leftAnalysis && rightAnalysis) {
    const l = leftAnalysis.overall_score || 0;
    const r = rightAnalysis.overall_score || 0;
    const diff = r - l;
    delta = { diff, better: diff > 0 ? 'right' : diff < 0 ? 'left' : 'tie' };
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 font-heading">Compare Procedures</h1>
          <p className="text-sm text-slate-500">Side-by-side comparison of two surgeries</p>
        </div>
      </div>

      {delta && (
        <div className="mb-4 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 text-sm text-teal-800 flex items-center gap-2">
          <GitCompare className="w-4 h-4" />
          {delta.better === 'tie'
            ? 'Both surgeries have identical overall scores'
            : `${delta.better === 'right' ? rightVideo?.title : leftVideo?.title} scores ${Math.abs(delta.diff)} points higher overall`}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {renderColumn(leftVideo, leftAnalysis, 'left', leftId, setLeftId)}
        <div className="hidden md:flex items-center justify-center pt-12">
          <div className="w-px h-full bg-slate-200" />
        </div>
        {renderColumn(rightVideo, rightAnalysis, 'right', rightId, setRightId)}
      </div>
    </div>
  );
}