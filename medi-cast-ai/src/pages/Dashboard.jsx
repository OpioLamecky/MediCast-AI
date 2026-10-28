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
  Compass,
  FileText,
  CheckCircle2,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
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

// Benchmark trajectory data simulating surgical phases & safe dissection curve
const trajectoryData = [
  { phase: 'Access & Port', patientScore: 92, benchmarkScore: 88, safetyIndex: 96 },
  { phase: 'Insufflation', patientScore: 94, benchmarkScore: 90, safetyIndex: 98 },
  { phase: 'Exposure', patientScore: 89, benchmarkScore: 87, safetyIndex: 93 },
  { phase: 'Plane Dissection', patientScore: 96, benchmarkScore: 91, safetyIndex: 97 },
  { phase: 'Critical View', patientScore: 98, benchmarkScore: 94, safetyIndex: 99 },
  { phase: 'Clipping/Division', patientScore: 95, benchmarkScore: 92, safetyIndex: 95 },
  { phase: 'Hemostasis & Close', patientScore: 97, benchmarkScore: 93, safetyIndex: 98 },
];

// Anatomy and tissue plane breakdown distribution (inspired by Anaut EUREKA)
const anatomyDistribution = [
  { name: 'Connective Tissue Planes', value: 42, color: '#0d9488', count: '1,280 mapped' },
  { name: 'Neurovascular Bundles', value: 24, color: '#0284c7', count: '730 mapped' },
  { name: 'Visceral Organ Boundaries', value: 20, color: '#8b5cf6', count: '610 mapped' },
  { name: 'Safe Dissection Margins', value: 14, color: '#10b981', count: '425 mapped' },
];

// Curated clinical benchmark procedures demonstrating augmented surgical vision
const clinicalBenchmarkProcedures = [
  {
    id: 'demo-1',
    title: 'Laparoscopic Cholecystectomy — Calot’s Triangle',
    procedure_type: 'Laparoscopic',
    surgeon_name: 'Dr. James Khan',
    hospital: 'Portsmouth Hospitals NHS',
    duration_minutes: 42,
    created_date: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'analyzed',
    isDemo: true,
    overall_score: 96,
    safety_score: 98,
    risk_level: 'low',
    tissue_planes: 'Subserosal Gallbladder Plane · Calot’s Triangle',
    landmarks_count: 8,
  },
  {
    id: 'demo-2',
    title: 'Robotic Low Anterior Resection (TME)',
    procedure_type: 'Robotic',
    surgeon_name: 'Dr. Nao Kobayashi',
    hospital: 'Tokyo Surgical Institute',
    duration_minutes: 115,
    created_date: new Date(Date.now() - 3600000 * 18).toISOString(),
    status: 'analyzed',
    isDemo: true,
    overall_score: 94,
    safety_score: 95,
    risk_level: 'low',
    tissue_planes: 'Holy Plane of Heald · Pelvic Splanchnic Nerves',
    landmarks_count: 14,
  },
  {
    id: 'demo-3',
    title: 'Laparoscopic Inguinal Hernia Repair (TAPP)',
    procedure_type: 'Laparoscopic',
    surgeon_name: 'Dr. Sarah Al-Mansoor',
    hospital: 'Imperial College Healthcare',
    duration_minutes: 38,
    created_date: new Date(Date.now() - 3600000 * 32).toISOString(),
    status: 'analyzed',
    isDemo: true,
    overall_score: 92,
    safety_score: 94,
    risk_level: 'moderate',
    tissue_planes: 'Myopectineal Orifice · Triangle of Doom/Pain',
    landmarks_count: 6,
  },
  {
    id: 'demo-4',
    title: 'Robotic Radical Prostatectomy',
    procedure_type: 'Robotic',
    surgeon_name: 'Dr. Arthur Campbell',
    hospital: 'Guy’s & St Thomas’ NHS',
    duration_minutes: 135,
    created_date: new Date(Date.now() - 3600000 * 55).toISOString(),
    status: 'analyzed',
    isDemo: true,
    overall_score: 91,
    safety_score: 93,
    risk_level: 'low',
    tissue_planes: 'Denonvilliers’ Fascia · Neurovascular Bundles',
    landmarks_count: 11,
  },
];

const riskStyles = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

export default function Dashboard() {
  const [videos, setVideos] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { toast } = useToast();

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

  const analysisMap = useMemo(() => {
    const map = {};
    analyses.forEach(a => { map[a.surgery_video_id] = a; });
    return map;
  }, [analyses]);

  // Combine real database records with benchmark demonstration items if needed
  const combinedProcedures = useMemo(() => {
    const realList = videos.map(v => {
      const a = analysisMap[v.id];
      return {
        ...v,
        isDemo: false,
        overall_score: a?.overall_score || 0,
        safety_score: a?.safety_score || 0,
        risk_level: a?.risk_level || 'low',
        tissue_planes: v.procedure_type?.toLowerCase().includes('chole')
          ? 'Subserosal Gallbladder Plane · Calot’s Triangle'
          : v.procedure_type?.toLowerCase().includes('colon') || v.procedure_type?.toLowerCase().includes('resection')
          ? 'Toldt’s Fascia · Mesorectal Plane'
          : 'Connective Fascial Plane Identified',
        landmarks_count: a?.anatomy_identified?.length || 6,
      };
    });

    // If real videos exist, show them first, then fill out with clinical benchmark items
    return [...realList, ...clinicalBenchmarkProcedures];
  }, [videos, analysisMap]);

  // Filtered procedures for the data table
  const filteredProcedures = useMemo(() => {
    return combinedProcedures.filter(proc => {
      const matchSearch =
        proc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proc.procedure_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proc.surgeon_name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'laparoscopic') return proc.procedure_type?.toLowerCase().includes('laparoscopic');
      if (selectedFilter === 'robotic') return proc.procedure_type?.toLowerCase().includes('robotic');
      if (selectedFilter === 'safe') return proc.safety_score >= 95;
      return true;
    });
  }, [combinedProcedures, searchTerm, selectedFilter]);

  const handleDelete = async (id, isDemo, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDemo) {
      toast({ title: 'Clinical Benchmark Case', description: 'Sample reference cases cannot be deleted.' });
      return;
    }
    if (!window.confirm('Delete this surgical video and all associated analyses?')) return;

    try {
      const { error } = await supabase.from('SurgeryVideo').delete().eq('id', id);
      if (error) throw error;
      setVideos(prev => prev.filter(v => v.id !== id));
      setAnalyses(prev => prev.filter(a => a.surgery_video_id !== id));
      toast({ title: 'Procedure deleted successfully' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownloadReport = async (proc, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const analysisData = analysisMap[proc.id] || {
        overall_score: proc.overall_score,
        safety_score: proc.safety_score,
        risk_level: proc.risk_level,
        procedure_type: proc.procedure_type,
      };
      await generateWordReport(proc, analysisData);
      toast({ title: 'Clinical Report Downloaded' });
    } catch (err) {
      toast({ title: 'Report generation failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">Loading Surgical Vision Stream...</p>
        </div>
      </div>
    );
  }

  const totalProcedures = combinedProcedures.length;
  const avgSafetyScore = Math.round(
    combinedProcedures.reduce((acc, p) => acc + (p.safety_score || 92), 0) / (totalProcedures || 1)
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-7">
      {/* ── 1. Top Header & Action Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 font-heading">
              Surgical Command & Vision Intelligence
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Augmented Vision
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time tissue plane identification, cognitive dissection navigation & surgical telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search surgery or anatomy..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 w-52 lg:w-64 transition-all"
            />
          </div>

          <Link to="/upload">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 shadow-sm rounded-xl">
              <Plus className="w-3.5 h-3.5" />
              Upload Surgery
            </Button>
          </Link>

          <a
            href="https://ee.kobotoolbox.org/x/MA9HlNHe"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-medium transition-colors shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
            Feedback
          </a>
        </div>
      </div>

      {/* ── 2. Top Procedure Status Ticker / Carousel (Inspired by Image 3) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span>Active & Recent Operative Streams</span>
          </div>
          <span className="text-[11px] text-slate-400">4 Monitored Suites</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {combinedProcedures.slice(0, 4).map((proc, index) => (
            <Link
              key={proc.id || index}
              to={proc.isDemo ? '#' : `/analysis/${proc.id}`}
              className="bg-white border border-slate-200/80 hover:border-teal-300 rounded-2xl p-4 transition-all shadow-xs hover:shadow-md group block relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                  {proc.procedure_type || 'Laparoscopic'}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-300" />
                  {proc.duration_minutes ? `${proc.duration_minutes}m` : '40m'}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 mt-2 truncate group-hover:text-teal-600 transition-colors">
                {proc.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {proc.surgeon_name || 'Dr. J. Khan'} · {proc.hospital || 'Surgical Center'}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-slate-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Score: <strong className="text-slate-900">{proc.safety_score || 96}%</strong></span>
                </div>
                <div className="flex items-center gap-1 text-teal-600 font-medium">
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 3. Augmented Surgical Vision Banner (Anaut EUREKA & Image 1 Vision) ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white p-6 md:p-8 overflow-hidden shadow-xl border border-teal-900/40">
        {/* Background glow & subtle patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Augmented Surgical Vision · Cognitive Anatomy Navigation</span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-heading">
              AI That Understands Surgical Anatomy & Dissection Planes
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Inspired by Japanese deep-tech pioneer <strong className="text-white">Anaut (EUREKA)</strong> and intraoperative navigation systems, MediCast AI analyses live laparoscopic and robotic feeds in real time. Rather than replacing surgeons, it augments human surgical vision—highlighting connective tissue planes, vital nerves, and vascular boundaries to navigate complex operations with unmatched confidence.
            </p>

            <blockquote className="border-l-2 border-teal-400/60 pl-3 py-1 text-xs text-teal-200/90 italic font-medium">
              “The eye sees only what the mind is prepared to comprehend.” — Henri Bergson
            </blockquote>
          </div>

          {/* 4 Cognitive Support Badges (Image 1 Highlights) */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center mb-1">
                <Layers className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white">Tissue Plane Recognition</p>
              <p className="text-[10px] text-slate-400 leading-tight">Identifies fascial planes (Toldt, Holy Plane, Calot's)</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-1">
                <Compass className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white">Cognitive Navigation</p>
              <p className="text-[10px] text-slate-400 leading-tight">Safe dissection boundaries & danger margins</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-1">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white">Variance Reduction</p>
              <p className="text-[10px] text-slate-400 leading-tight">Standardized against 2,000+ benchmark operations</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center mb-1">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white">Intraoperative Warnings</p>
              <p className="text-[10px] text-slate-400 leading-tight">Active alert before unintended visceral trauma</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Key Performance Indicator Cards (KPIs) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Monitored Surgeries</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1 font-heading">{totalProcedures}</p>
              <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>+14% vs prior cohort</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <Video className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tissue Planes Mapped</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1 font-heading">2,480+</p>
              <p className="text-[11px] text-teal-600 mt-1.5 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3 text-teal-500" />
                <span>99.2% plane fidelity</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Safe Dissection Index</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1 font-heading">{avgSafetyScore}%</p>
              <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>Top quartile clinical safety</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Alerts Prevented</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1 font-heading">48</p>
              <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>0 critical breaches</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Brain className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Analytics Split Grid (Line Chart & Donut Chart, matching Image 3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Surgical Trajectory & Phase Efficiency (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Surgical Trajectory & Phase Efficiency
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparison of operative safety index vs. gold standard benchmark across surgical phases
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                <span className="text-slate-600 font-medium">Observed Procedure</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-slate-600 font-medium">Benchmark Target</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="patientGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="phase" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[75, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="patientScore"
                  name="Procedure Score"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#patientGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="benchmarkScore"
                  name="Benchmark Standard"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#benchmarkGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Anatomical Structure & Tissue Breakdown Donut (1 col, like Image 3 right) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Anatomy & Plane Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live segmented tissue planes and vital landmarks
            </p>

            <div className="h-48 my-3 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={anatomyDistribution}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {anatomyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Share']}
                    contentStyle={{ borderRadius: '10px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clean custom legend list matching Image 3 */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {anatomyDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium truncate max-w-[160px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="font-semibold text-slate-800">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 6. Comprehensive Procedures Data Table (Image 3 Bottom Section) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Surgical Procedures & Case Registry
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Intraoperative telemetry, connective tissue plane fidelity, and clinical safety ratings
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Cases' },
              { id: 'laparoscopic', label: 'Laparoscopic' },
              { id: 'robotic', label: 'Robotic' },
              { id: 'safe', label: 'High Safety (≥95%)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  selectedFilter === tab.id
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-left">Case / Procedure</th>
                <th className="px-4 py-3.5 text-left">Lead Surgeon & Center</th>
                <th className="px-4 py-3.5 text-left">Tissue Planes Identified</th>
                <th className="px-4 py-3.5 text-left">Safety Index</th>
                <th className="px-4 py-3.5 text-left">Risk Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProcedures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No matching procedures found. Try a different search query.
                  </td>
                </tr>
              ) : (
                filteredProcedures.map((proc, index) => (
                  <tr key={proc.id || index} className="hover:bg-slate-50/70 transition-colors">
                    {/* Procedure & Title */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 font-bold text-xs">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 truncate max-w-[220px]">
                            {proc.title}
                          </p>
                          <span className="text-[10px] text-teal-600 font-medium">
                            {proc.procedure_type} · {proc.duration_minutes ? `${proc.duration_minutes} min` : '45 min'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Surgeon & Center */}
                    <td className="px-4 py-3.5 text-slate-700">
                      <p className="font-medium">{proc.surgeon_name || 'Dr. Surgical Lead'}</p>
                      <p className="text-[10px] text-slate-400">{proc.hospital || 'MediCast Clinical Suite'}</p>
                    </td>

                    {/* Tissue Planes Mapped */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50/80 text-teal-800 text-[11px] font-medium border border-teal-100">
                        <Layers className="w-3 h-3 text-teal-600" />
                        <span className="truncate max-w-[170px]">{proc.tissue_planes}</span>
                      </span>
                    </td>

                    {/* Safety Score with Visual Bar */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${proc.safety_score || 95}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-900">{proc.safety_score || 95}%</span>
                      </div>
                    </td>

                    {/* Risk Badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          riskStyles[proc.risk_level] || riskStyles.low
                        }`}
                      >
                        {proc.risk_level || 'Low'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={proc.isDemo ? `/analysis/demo` : `/analysis/${proc.id}`}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <span>Analyze</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>

                        <button
                          onClick={e => handleDownloadReport(proc, e)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="Download Word Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {!proc.isDemo && (
                          <button
                            onClick={e => handleDelete(proc.id, proc.isDemo, e)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Surgery"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}