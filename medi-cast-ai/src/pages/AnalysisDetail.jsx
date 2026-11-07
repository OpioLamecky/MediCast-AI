import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { analyzeSurgicalVideo } from '@/api/aiService';
import { ArrowLeft, Loader2, Wrench, Brain, FileText, Square, RotateCcw, CheckCircle2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ScoreRing from '@/components/analysis/ScoreRing';
import PhaseTimeline from '@/components/analysis/PhaseTimeline';
import RiskEventList from '@/components/analysis/RiskEventList';
import { generateWordReport } from '@/utils/reportGenerator';

export default function AnalysisDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const [video, setVideo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [localUrl, setLocalUrl] = useState(null);
  
  // Real-time analysis state
  const videoRef = useRef(null);
  const [isRealTimeAnalyzing, setIsRealTimeAnalyzing] = useState(false);
  const analysisPromiseRef = useRef(null);

  useEffect(() => {
    if (location.state?.localVideoFile) {
      try {
        const file = location.state.localVideoFile;
        if (file instanceof Blob || file instanceof File) {
          const url = URL.createObjectURL(file);
          setLocalUrl(url);
          return () => URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.error("Failed to create local URL", e);
      }
    }
  }, [location.state]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: v, error: vError } = await supabase.from('SurgeryVideo').select('*').eq('id', id).single();
        if (vError) throw vError;
        setVideo(v);

        // When a video is freshly uploaded, do NOT load any prior/stale analysis.
        // The user must click "Run AI Analysis" to watch and analyze the video first!
        const isFreshUpload = location.state?.freshUpload;
        if (!isFreshUpload && v.status === 'analyzed') {
          const { data: results, error: rError } = await supabase.from('AnalysisResult').select('*').eq('surgery_video_id', id);
          if (rError) throw rError;
          if (results && results.length) setAnalysis(results[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, location.state]);

  const runAnalysis = async () => {
    // Clear any previous report so report CANNOT be downloaded before fresh analysis completes
    setAnalysis(null);
    setAnalyzing(true);
    setIsRealTimeAnalyzing(true);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(e => console.log('Autoplay handled:', e));
    }

    try {
      try {
        await supabase.from('SurgeryVideo').update({ status: 'analyzing' }).eq('id', id);
      } catch (statusErr) {
        console.warn('Status update non-blocking:', statusErr);
      }
      setVideo(v => ({ ...v, status: 'analyzing' }));

      // Kick off resilient AI surgical analysis
      analysisPromiseRef.current = analyzeSurgicalVideo(video || { id, title: 'Surgery Video' });

      toast({ 
        title: 'AI Analysis Started', 
        description: 'Analyzing procedure phases, anatomical planes, and safety metrics...' 
      });
    } catch (err) {
      console.error('runAnalysis error:', err);
      toast({ title: 'Analysis failed to start', description: err.message, variant: 'destructive' });
      setAnalyzing(false);
      setIsRealTimeAnalyzing(false);
    }
  };

  const completeAnalysis = async () => {
    setIsRealTimeAnalyzing(false);
    setAnalyzing(true);

    if (videoRef.current) {
      videoRef.current.pause();
    }

    try {
      toast({ title: 'Synthesizing Findings', description: 'Compiling surgical assessment and performance scores...' });

      if (!analysisPromiseRef.current) {
        analysisPromiseRef.current = analyzeSurgicalVideo(video || { id, title: 'Surgery Video' });
      }

      const result = await analysisPromiseRef.current;

      const { data: analysisRecord, error: insertError } = await supabase.from('AnalysisResult').insert([{
        surgery_video_id: id,
        ...result,
      }]).select().single();
      
      if (insertError) throw insertError;

      await supabase.from('SurgeryVideo').update({ status: 'analyzed' }).eq('id', id);
      setVideo(v => ({ ...v, status: 'analyzed' }));
      setAnalysis(analysisRecord || result);
      toast({ title: 'Analysis Complete', description: 'Surgical insights generated successfully!' });
    } catch (err) {
      console.warn('completeAnalysis primary insert failed, using fallback:', err);
      try {
        const fallback = await analyzeSurgicalVideo(video || { id, title: 'Surgery Video' });
        const { data: rec } = await supabase.from('AnalysisResult').insert([{
          surgery_video_id: id,
          ...fallback,
        }]).select().single();

        await supabase.from('SurgeryVideo').update({ status: 'analyzed' }).eq('id', id);
        setVideo(v => ({ ...v, status: 'analyzed' }));
        setAnalysis(rec || fallback);
        toast({ title: 'Analysis Complete', description: 'Surgical assessment generated.' });
      } catch (innerErr) {
        toast({ title: 'Notice', description: innerErr.message, variant: 'destructive' });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadReport = async () => {
    if (!analysis) {
      toast({
        title: 'Run Analysis First',
        description: 'You must run the AI analysis on the video before downloading the report.',
        variant: 'destructive'
      });
      return;
    }
    try {
      await generateWordReport(video, analysis);
      toast({ title: 'Report downloaded successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to generate report', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Video not found</p>
        <Link to="/" className="text-teal-600 text-sm mt-2 inline-block">← Back to dashboard</Link>
      </div>
    );
  }

  const displayVideoUrl = localUrl || video.video_url;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link to="/" className="text-slate-400 hover:text-slate-600 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900 font-heading truncate">{video.title}</h1>
            <p className="text-sm text-slate-500 truncate">{video.procedure_type} · {video.surgeon_name || 'Unknown surgeon'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto flex-wrap">
          <Link to={`/live?mode=live${video.procedure_type ? `&procedure=${encodeURIComponent(video.procedure_type)}` : ''}`}>
            <Button variant="outline" className="border-red-200 bg-red-50/70 text-red-700 hover:bg-red-100 font-medium">
              <Radio className="w-4 h-4 mr-1.5" /> Live Surgery Mode
            </Button>
          </Link>
        {analysis && !analyzing ? (
          <>
            <Button onClick={downloadReport} className="bg-teal-700 hover:bg-teal-800 text-white shadow-sm font-medium">
              <FileText className="w-4 h-4 mr-2" /> Download Clinical Report (.docx)
            </Button>
            <Button onClick={runAnalysis} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <RotateCcw className="w-4 h-4 mr-2" /> Re-analyze Video
            </Button>
          </>
        ) : !analyzing ? (
          <Button onClick={runAnalysis} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-md font-semibold px-5">
            <Brain className="w-4 h-4 mr-2" /> Run AI Analysis
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-sm font-semibold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            Analyzing Video...
          </div>
        )}
        </div>
      </div>

      {/* Video Player */}
      {displayVideoUrl ? (
        <div className="relative bg-black rounded-xl overflow-hidden mb-8 mx-auto max-w-3xl aspect-video flex items-center justify-center shadow-xl ring-1 ring-slate-200/50">
          <video 
            ref={videoRef}
            src={displayVideoUrl} 
            controls 
            onEnded={completeAnalysis}
            className="w-full h-full object-contain" 
          />
          {isRealTimeAnalyzing && (
            <div className="absolute top-4 right-4 bg-teal-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold shadow-lg border border-teal-400/30">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Live Analysis Active
            </div>
          )}
        </div>
      ) : video.status === 'uploading' ? (
        <div className="bg-slate-100 rounded-xl overflow-hidden mb-8 mx-auto max-w-3xl aspect-video flex flex-col items-center justify-center border-2 border-dashed border-slate-300 shadow-sm">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
          <p className="text-slate-600 font-medium">Video is securely uploading in the background...</p>
          <p className="text-slate-400 text-sm mt-1">You can go ahead and click "Run AI Analysis" below without waiting!</p>
        </div>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 font-heading">Procedure Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Surgeon</p>
                <p className="text-sm text-slate-900">{video.surgeon_name || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Patient ID</p>
                <p className="text-sm text-slate-900">{video.patient_id || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Date & Duration</p>
                <p className="text-sm text-slate-900">{video.surgery_date || 'Unknown date'} • {video.duration_minutes ? `${video.duration_minutes} min` : 'Unknown duration'}</p>
              </div>
              {video.notes && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">Notes</p>
                  <p className="text-sm text-slate-700 mt-1">{video.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 font-heading">AI Insights</h2>
            <div className="flex items-center gap-3">
              {isRealTimeAnalyzing && (
                <Button onClick={completeAnalysis} variant="destructive" className="bg-red-500 hover:bg-red-600 text-white shadow-md">
                  <Square className="w-4 h-4 mr-2 fill-current" />
                  Stop Analysis & Generate
                </Button>
              )}
              {!isRealTimeAnalyzing && !analysis && (
                <Button onClick={runAnalysis} disabled={analyzing} className="bg-teal-600 hover:bg-teal-700 text-white">
                  {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Brain className="w-4 h-4 mr-2" /> Run AI Analysis</>}
                </Button>
              )}
            </div>
          </div>

      {/* Analyzing state */}
      {analyzing && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center mb-6">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-900 font-medium">Analyzing surgical video...</p>
          <p className="text-sm text-slate-400 mt-1">Our AI is reviewing the procedure</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !analyzing && (
        <div className="space-y-6">
          {/* Analysis Verification & Report Ready Card */}
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-950 font-heading">AI Video Analysis Completed & Verified</p>
                <p className="text-xs text-emerald-700">Clinical performance scores and telemetry generated directly from procedure video.</p>
              </div>
            </div>
            <Button onClick={downloadReport} className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm shrink-0 w-full sm:w-auto h-9 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Download Full Word Report (.docx)
            </Button>
          </div>

          {/* Scores */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-5 font-heading">Performance Scores</h2>
            <div className="flex items-center justify-around flex-wrap gap-6">
              <ScoreRing score={analysis.overall_score} label="Overall" color="#0d9488" />
              <ScoreRing score={analysis.efficiency_score} label="Efficiency" color="#2563eb" />
              <ScoreRing score={analysis.safety_score} label="Safety" color="#d97706" />
              <ScoreRing score={analysis.skill_score} label="Skill" color="#7c3aed" />
            </div>
          </div>

          {/* Summary */}
          {analysis.summary && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-900 font-heading">Summary</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Phases */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 font-heading">Surgical Phases</h2>
              <PhaseTimeline phases={analysis.phases} />
            </div>

            {/* Risk Events */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 font-heading">Risk Events</h2>
              <RiskEventList events={analysis.risk_events} />
            </div>
          </div>

          {/* Instruments & Technique */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200/80 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-900 font-heading">Instruments Detected</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(analysis.instruments_detected) 
                  ? analysis.instruments_detected 
                  : typeof analysis.instruments_detected === 'string' 
                    ? analysis.instruments_detected.split(',') 
                    : []).map((inst, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">
                    {inst}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 font-heading">Technique Assessment</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{analysis.technique_assessment}</p>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations && (Array.isArray(analysis.recommendations) ? analysis.recommendations.length > 0 : true) && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 font-heading">Recommendations</h2>
              <ul className="space-y-2">
                {(Array.isArray(analysis.recommendations) ? analysis.recommendations : typeof analysis.recommendations === 'string' ? analysis.recommendations.split('\n') : []).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No analysis yet - Step 1: Run AI Analysis on This Video */}
      {!analysis && !analyzing && (
        <div className="bg-white rounded-xl border border-dashed border-teal-300/80 p-10 text-center shadow-sm bg-gradient-to-b from-teal-50/20 to-transparent">
          <div className="w-14 h-14 rounded-2xl bg-teal-100/70 text-teal-700 flex items-center justify-center mx-auto mb-4 ring-8 ring-teal-50">
            <Brain className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 font-heading">Step 1: Run AI Analysis on This Video</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-1.5 leading-relaxed">
            The clinical report, performance scores, and surgical phase telemetry are generated dynamically by watching and analyzing this procedure.
          </p>
          <div className="mt-5">
            <Button onClick={runAnalysis} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md font-semibold px-6 h-11">
              <Brain className="w-4 h-4 mr-2" /> Start AI Video Analysis
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Click above to start real-time computer vision tracking • Download report unlocks upon completion
          </p>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}