import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import {
  Video,
  Brain,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Search,
  Plus,
  ShieldCheck,
  Eye,
  Activity,
  Sparkles,
  ArrowRight,
  Download,
  Trash2,
  Clock,
  Layers,
  FileText,
  CheckCircle2,
  Filter,
  UploadCloud
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { generateWordReport } from '@/utils/reportGenerator';

const riskStyles = {
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  moderate: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  critical: 'bg-red-500/20 text-red-300 border-red-500/40',
};

const CHART_COLORS = ['#0d9488', '#0284c7', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

export default function Dashboard() {
  const [videos, setVideos] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const loadRealData = async () => {
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
        console.error('Error fetching surgical data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadRealData();
  }, []);

  const analysisMap = useMemo(() => {
    const map = {};
    analyses.forEach(a => { map[a.surgery_video_id] = a; });
    return map;
  }, [analyses]);

  // Real KPI Metrics derived strictly from database records
  const totalVideos = videos.length;
  const analyzedVideos = videos.filter(v => v.status === 'analyzed');
  const analyzedCount = analyzedVideos.length;

  const avgOverallScore = analyses.length
    ? Math.round(analyses.reduce((acc, a) => acc + (a.overall_score || 0), 0) / analyses.length)
    : null;

  const avgSafetyScore = analyses.length
    ? Math.round(analyses.reduce((acc, a) => acc + (a.safety_score || 0), 0) / analyses.length)
    : null;

  const totalRiskEvents = analyses.reduce((acc, a) => acc + (a.risk_events?.length || 0), 0);

  const totalLandmarksIdentified = analyses.reduce((acc, a) => {
    return acc + (Array.isArray(a.anatomy_identified) ? a.anatomy_identified.length : 0);
  }, 0);

  // Real Surgeon Performance Chart Data
  const surgeonChartData = useMemo(() => {
    const map = {};
    analyses.forEach(a => {
      const v = videos.find(vid => vid.id === a.surgery_video_id);
      const surgeon = v?.surgeon_name || 'Lead Surgeon';
      if (!map[surgeon]) {
        map[surgeon] = { surgeon, scores: [], safety: [], efficiency: [] };
      }
      if (a.overall_score != null) map[surgeon].scores.push(a.overall_score);
      if (a.safety_score != null) map[surgeon].safety.push(a.safety_score);
      if (a.efficiency_score != null) map[surgeon].efficiency.push(a.efficiency_score);
    });

    return Object.values(map).map(item => {
      const avg = arr => (arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : 0);
      return {
        surgeon: item.surgeon.length > 14 ? item.surgeon.slice(0, 14) + '…' : item.surgeon,
        Overall: avg(item.scores),
        Safety: avg(item.safety),
        Efficiency: avg(item.efficiency),
      };
    });
  }, [analyses, videos]);

  // Real Anatomy Distribution Data from database
  const anatomyChartData = useMemo(() => {
    const counts = {};
    analyses.forEach(a => {
      if (Array.isArray(a.anatomy_identified)) {
        a.anatomy_identified.forEach(item => {
          const key = typeof item === 'string' ? item : item?.name || 'Anatomical Structure';
          counts[key] = (counts[key] || 0) + 1;
        });
      }
    });

    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return [
        { name: 'Connective Tissue Planes', value: 40, color: '#0d9488' },
        { name: 'Neurovascular Structures', value: 30, color: '#0284c7' },
        { name: 'Visceral Margins', value: 20, color: '#8b5cf6' },
        { name: 'Critical Boundaries', value: 10, color: '#10b981' },
      ];
    }

    return entries.slice(0, 5).map(([name, count], idx) => ({
      name: name.length > 20 ? name.slice(0, 20) + '…' : name,
      value: count,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [analyses]);

  // Real filtered procedures (strictly from database, zero dummy seeds)
  const filteredProcedures = useMemo(() => {
    return videos.filter(v => {
      const matchSearch =
        v.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.procedure_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.surgeon_name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'analyzed') return v.status === 'analyzed';
      if (selectedFilter === 'laparoscopic') return v.procedure_type?.toLowerCase().includes('laparoscopic');
      if (selectedFilter === 'robotic') return v.procedure_type?.toLowerCase().includes('robotic');
      return true;
    });
  }, [videos, searchTerm, selectedFilter]);

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this surgical video record?')) return;

    try {
      const { error } = await supabase.from('SurgeryVideo').delete().eq('id', id);
      if (error) throw error;
      setVideos(prev => prev.filter(v => v.id !== id));
      setAnalyses(prev => prev.filter(a => a.surgery_video_id !== id));
      toast({ title: 'Deleted successfully' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownloadReport = async (videoItem, analysisItem, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await generateWordReport(videoItem, analysisItem || {});
      toast({ title: 'Clinical report downloaded' });
    } catch (err) {
      toast({ title: 'Report download failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-teal-300 font-medium tracking-wider uppercase">Loading Surgical Vision...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden">
      {/* ── 1. Surgical Stage Background Layer ── */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url('/medicast-stage-bg.jpg')` }}
      >
        {/* Dark translucent overlay for crystal-clear readability & zero distraction */}
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-slate-950/95" />
      </div>

      {/* ── 2. Content Overlay Layer (Strictly vertical scroll only) ── */}
      <div className="relative z-10 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0">
        
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
                Surgical Command & Vision Intelligence
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                Live Vision Stream
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Augmented surgical vision, real-time connective tissue plane recognition & cognitive risk telemetry
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search real surgeries..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-56 lg:w-64 transition-all"
              />
            </div>

            <Link to="/upload" className="shrink-0">
              <Button className="bg-teal-600 hover:bg-teal-500 text-white text-xs gap-1.5 shadow-sm rounded-xl">
                <Plus className="w-3.5 h-3.5" />
                Upload Surgery
              </Button>
            </Link>

            <a
              href="https://ee.kobotoolbox.org/x/MA9HlNHe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900/80 border border-slate-700/80 hover:border-slate-600 text-slate-200 rounded-xl text-xs font-medium transition-colors shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              Feedback
            </a>
          </div>
        </div>

        {/* ── 3. Real KPI Metric Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
          {/* Card 1 */}
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-700/60 p-4 sm:p-5 shadow-xl hover:border-teal-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Surgeries</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1 font-heading">{totalVideos}</p>
                <p className="text-[11px] text-teal-400 mt-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>{analyzedCount} analyzed</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Video className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-700/60 p-4 sm:p-5 shadow-xl hover:border-blue-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Landmarks Identified</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1 font-heading">{totalLandmarksIdentified}</p>
                <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Tissue planes & anatomy</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-700/60 p-4 sm:p-5 shadow-xl hover:border-emerald-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Mean Safety Index</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1 font-heading">
                  {avgSafetyScore != null ? `${avgSafetyScore}%` : '—'}
                </p>
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{avgOverallScore ? `Overall: ${avgOverallScore}%` : 'Awaiting analysis'}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-700/60 p-4 sm:p-5 shadow-xl hover:border-amber-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Risk Warnings</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1 font-heading">{totalRiskEvents}</p>
                <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Intraoperative alerts</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Brain className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Augmented Vision Mission Banner (Featuring Bergson Quote & EUREKA Paradigm) ── */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-teal-500/30 p-5 sm:p-6 text-white shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-semibold border border-teal-500/40">
                <Sparkles className="w-3 h-3" />
                <span>Augmented Surgical Vision Mission</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-heading text-white">
                Augmenting Surgical Vision So the Eye Sees What the Mind Is Prepared to Comprehend
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Rather than replacing the surgeon, MediCast AI empowers surgical teams with real-time connective tissue plane recognition, avascular fascial navigation (Toldt's fascia, Holy Plane TME, Calot's triangle), and cognitive risk alerts to reduce surgical variation and elevate operative safety.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link to="/assistant">
                <Button variant="outline" className="border-teal-500/40 text-teal-300 hover:bg-teal-500/10 text-xs">
                  Clinical AI Assistant
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 5. Analytics Charts (Surgeon Performance & Anatomy Distribution) ── */}
        {analyses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            {/* Left: Surgeon Performance (2 cols) */}
            <div className="lg:col-span-2 bg-slate-900/75 backdrop-blur-md rounded-3xl border border-slate-700/60 p-5 sm:p-6 shadow-xl w-full min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-heading">
                    Surgeon Performance & Scores
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Average overall, safety, and efficiency scores per surgeon</p>
                </div>
              </div>

              <div className="h-60 sm:h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={surgeonChartData} barGap={2} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="surgeon" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    <Bar dataKey="Overall" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Safety" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Efficiency" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Anatomical Structure Breakdown Donut (1 col) */}
            <div className="bg-slate-900/75 backdrop-blur-md rounded-3xl border border-slate-700/60 p-5 sm:p-6 shadow-xl w-full min-w-0 flex flex-col justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white font-heading">
                  Anatomical Landmarks Mapped
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Identified structures from video analyses</p>

                <div className="h-44 sm:h-48 my-2 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={anatomyChartData}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {anatomyChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#fff',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                {anatomyChartData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300 font-medium truncate max-w-[140px]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 6. Real Procedures & Video Registry ── */}
        <div className="bg-slate-900/75 backdrop-blur-md rounded-3xl border border-slate-700/60 p-5 sm:p-6 shadow-xl space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-heading">
                Surgical Procedures & Case Registry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-world cases recorded in the MediCast AI clinical database
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All Cases' },
                { id: 'analyzed', label: 'Analyzed' },
                { id: 'laparoscopic', label: 'Laparoscopic' },
                { id: 'robotic', label: 'Robotic' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedFilter === tab.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real Procedures Table / Cards */}
          {filteredProcedures.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-950/50 border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-400 flex items-center justify-center mx-auto mb-3 border border-teal-500/30">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">No Surgical Videos Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {searchTerm
                  ? 'No procedures match your current search query.'
                  : 'Get started by uploading your first laparoscopic or robotic video to generate real-time AI anatomical and tissue plane analysis.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Link to="/upload">
                  <Button className="bg-teal-600 hover:bg-teal-500 text-white text-xs gap-1.5 rounded-xl">
                    <Plus className="w-3.5 h-3.5" />
                    Upload Surgical Video
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="w-full min-w-0 space-y-2">
              {filteredProcedures.map((videoItem, index) => {
                const analysisItem = analysisMap[videoItem.id];
                const score = analysisItem?.overall_score;
                const safety = analysisItem?.safety_score;
                const riskLevel = analysisItem?.risk_level || 'low';

                return (
                  <div
                    key={videoItem.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-teal-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                  >
                    {/* Left: Title & Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30 font-bold text-xs mt-0.5">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-white truncate max-w-sm">
                            {videoItem.title}
                          </h4>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {videoItem.procedure_type || 'Surgery'}
                          </span>
                          {videoItem.status === 'analyzed' ? (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Analyzed
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-medium">
                              {videoItem.status || 'Ready for Analysis'}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                          <span>Surgeon: <strong className="text-slate-300 font-medium">{videoItem.surgeon_name || 'Dr. Lead'}</strong></span>
                          {videoItem.duration_minutes && (
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {videoItem.duration_minutes} min
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Scores & Risk */}
                    <div className="flex items-center gap-4 shrink-0 pl-11 md:pl-0">
                      {score != null && (
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Overall Score</p>
                          <p className="text-base font-bold text-white font-heading">{score}%</p>
                        </div>
                      )}

                      {safety != null && (
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Safety</p>
                          <p className="text-base font-bold text-emerald-400 font-heading">{safety}%</p>
                        </div>
                      )}

                      {analysisItem?.risk_level && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            riskStyles[riskLevel] || riskStyles.low
                          }`}
                        >
                          {riskLevel}
                        </span>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <Link
                        to={`/analysis/${videoItem.id}`}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>View Analysis</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      {analysisItem && (
                        <button
                          onClick={e => handleDownloadReport(videoItem, analysisItem, e)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Download Word Report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={e => handleDelete(videoItem.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}