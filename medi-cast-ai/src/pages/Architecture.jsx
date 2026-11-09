import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Cpu,
  Monitor,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Check,
  CheckCircle2,
  Radio,
  ArrowRight,
  Activity,
  Eye,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Download,
  Layers,
  Sparkles,
  Zap,
  Flame,
  Info,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateWordReport } from '@/utils/reportGenerator';
import { useToast } from '@/components/ui/use-toast';

// ── 5 Subsystems on the Real OR Image ──
const HOTSPOTS = [
  {
    id: 'camera',
    num: 1,
    title: 'Camera',
    fullTitle: '1. Overhead OR Camera / Surgical Laparoscope',
    x: 32, // percentage on image
    y: 16,
    badge: '1080p / 30fps UVC',
    color: 'teal',
    summary: 'High-definition ceiling camera & laparoscopic optic stack capturing sterile incision & surgical cavity.',
    specs: [
      { label: 'Video Input', value: 'UVC 1080p @ 30 FPS / HDMI / RTSP' },
      { label: 'Optical Sampling', value: 'Sub-millisecond frame buffer (<1ms)' },
      { label: 'Field of View', value: '110° wide-angle over operative table' }
    ]
  },
  {
    id: 'bed',
    num: 2,
    title: 'Operating Bed (with Patient)',
    fullTitle: '2. Operating Bed (with Patient) & Sterile Field',
    x: 34,
    y: 54,
    badge: 'Sterile Zone',
    color: 'cyan',
    summary: 'Sterile surgical drape boundary, patient anatomy, and surgeon hand / instrument trajectory.',
    specs: [
      { label: 'Zone Monitoring', value: 'Drape boundary perimeter tracking' },
      { label: 'Tissue Plane Focus', value: 'Calot’s triangle, fascia, peritoneum' },
      { label: 'Hygienic Tracking', value: 'Glove integrity & instrument sterile field' }
    ]
  },
  {
    id: 'workstation',
    num: 3,
    title: 'Medicast AI Workstation',
    fullTitle: '3. Medicast AI (Processing & Analysis Interface)',
    x: 52,
    y: 50,
    badge: 'Dual-Engine Edge AI',
    color: 'teal',
    summary: 'Local edge computing unit running instantaneous optical sensor algorithms and multimodal AI vision.',
    specs: [
      { label: 'Optical Engine', value: '<1ms luminance, contrast & redness analysis' },
      { label: 'Vision AI Model', value: 'Real-time surgical scene intelligence' },
      { label: 'Inference Latency', value: '12ms end-to-end processing budget' }
    ]
  },
  {
    id: 'wallscreen',
    num: 4,
    title: 'Wall Screen Cockpit',
    fullTitle: '4. Wall Screen (Real-time Monitoring & Alerts)',
    x: 77,
    y: 28,
    badge: 'Heads-Up Display',
    color: 'red',
    summary: 'Large Operating Room heads-up screen delivering zero-distraction telemetry, 96% accuracy gauge, and high-visibility acoustic warnings.',
    specs: [
      { label: 'Display Resolution', value: '4K / 1080p wall monitor cockpit' },
      { label: 'Alert Dispatch', value: 'Visual flashing banner + acoustic voice' },
      { label: 'Telemetry Rate', value: 'Continuous live synchronization' }
    ]
  },
  {
    id: 'report',
    num: 5,
    title: 'Final Clinical Report',
    fullTitle: '5. Auto-Generated Clinical Report (.docx)',
    x: 82,
    y: 68,
    badge: 'Audit Ready',
    color: 'emerald',
    summary: 'Auto-compiled intraoperative audit document recording safety compliance, procedure phases, detected instruments, and resolved warnings.',
    specs: [
      { label: 'Output Format', value: 'Standard Microsoft Word (.docx) & JSON' },
      { label: 'Compliance Index', value: 'Objective safety & hygiene rating (98%)' },
      { label: 'Medico-Legal', value: 'Timestamped verifiable intraoperative audit' }
    ]
  }
];

// ── Simulation Scenarios ──
const SCENARIOS = [
  {
    id: 'safe',
    name: 'Safe Dissection (Normal)',
    icon: ShieldCheck,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    description: 'Routine safe dissection. Sterile field intact, vital telemetries normal, 98% compliance.',
    wallAlert: null,
    safetyStatus: 'All Clear — Sterile Field Maintained',
    accuracy: 96,
    compliance: 98,
    phase: 'Active Dissection',
    alertsLogged: 0,
    opticalMetrics: { brightness: 88, contrast: 92, redness: 14, latency: 12 }
  },
  {
    id: 'unsterile',
    name: 'Unsterile Instrument Breach',
    icon: AlertTriangle,
    color: 'text-red-700 bg-red-50 border-red-300',
    description: 'Surgeon instrument or nurse hand crosses unsterile perimeter. Triggers immediate flashing warning & voice alarm.',
    wallAlert: {
      title: 'ALERT! Instrument Not Sterile',
      message: 'Perimeter breach detected at patient right flank. Re-sterilize or replace tool.',
      severity: 'critical'
    },
    safetyStatus: 'BREACH DETECTED — 1 Unsterile Tool',
    accuracy: 91,
    compliance: 86,
    phase: 'Boundary Warning',
    alertsLogged: 1,
    opticalMetrics: { brightness: 85, contrast: 89, redness: 18, latency: 11 }
  },
  {
    id: 'bleed',
    name: 'Hemorrhage / Redness Spike',
    icon: Flame,
    color: 'text-amber-800 bg-amber-50 border-amber-300',
    description: 'Optical sensor detects sudden red-spectrum surge (>35%) indicating vascular injury or brisk capillary ooze.',
    wallAlert: {
      title: 'CAUTION! Vascular Bleed Detected',
      message: 'Sudden optical redness index spike to 41%. Apply suction & inspect cystic artery.',
      severity: 'warning'
    },
    safetyStatus: 'HAZARD — Rapid Redness Surge',
    accuracy: 89,
    compliance: 92,
    phase: 'Hemostasis Control',
    alertsLogged: 1,
    opticalMetrics: { brightness: 72, contrast: 96, redness: 41, latency: 9 }
  },
  {
    id: 'planes',
    name: 'Critical View Anatomy Verified',
    icon: Sparkles,
    color: 'text-teal-800 bg-teal-50 border-teal-300',
    description: 'AI vision verifies hepatocystic triangle clearance and Critical View of Safety (CVS) criteria.',
    wallAlert: null,
    safetyStatus: 'Optimal Safety — CVS 3/3 Attained',
    accuracy: 98,
    compliance: 99,
    phase: 'Critical View Verification',
    alertsLogged: 0,
    opticalMetrics: { brightness: 91, contrast: 94, redness: 16, latency: 13 }
  }
];

export default function Architecture() {
  const { toast } = useToast();
  const [activeScenarioId, setActiveScenarioId] = useState('safe');
  const [selectedHotspot, setSelectedHotspot] = useState('wallscreen');
  const [isSimulating, setIsSimulating] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [simElapsed, setSimElapsed] = useState(4332); // 1h 12m 12s in seconds
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [alertFlash, setAlertFlash] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  const hotspot = HOTSPOTS.find((h) => h.id === selectedHotspot) || HOTSPOTS[3];

  // ── Simulated Clock Ticking ──
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setSimElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimulating]);

  // ── Alert Flash & Sound Feedback on Scenario Change ──
  useEffect(() => {
    if (scenario.wallAlert) {
      setAlertFlash(true);
      const flashTimer = setTimeout(() => setAlertFlash(false), 2400);

      // Acoustic / Voice Simulation
      if (soundEnabled && typeof window !== 'undefined') {
        try {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(scenario.wallAlert.title.replace('ALERT!', 'Alert:'));
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
            utterance.volume = 0.85;
            window.speechSynthesis.speak(utterance);
          }
        } catch {
          // Ignore speech synthesis failures
        }
      }
      return () => clearTimeout(flashTimer);
    }
  }, [activeScenarioId, soundEnabled]);

  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // ── Auto-Generate Simulated Clinical Word Report (.docx) ──
  const handleDownloadSimulatedDocx = async () => {
    setIsDownloadingDocx(true);
    try {
      const simulatedVideo = {
        id: `sim_or_${Date.now()}`,
        title: 'Laparoscopic Cholecystectomy (Intraoperative OR Live Session)',
        procedure_type: 'Laparoscopic Cholecystectomy',
        surgeon_name: 'Dr. Sarah Jenkins, MD, FACS',
        patient_id: 'OR-BED-01-PATIENT',
        department: 'General Surgery & Minimally Invasive',
        duration_minutes: Math.max(1, Math.round(simElapsed / 60)),
        duration: simElapsed,
        notes: `Simulated deployment session demonstrating real-time camera-to-wall pipeline with ${scenario.name} telemetry.`,
        created_at: new Date().toISOString()
      };

      const simulatedAnalysis = {
        procedure_type: 'Laparoscopic Cholecystectomy',
        overall_score: scenario.accuracy,
        safety_score: scenario.compliance,
        efficiency_score: 94,
        skill_score: 95,
        summary: `Operating room machine vision system operated continuously during this case. Live overhead camera optical sensor operated at <1ms latency with Qwen-driven surgical cognitive assistance. Current safety index is ${scenario.compliance}% with ${scenario.alertsLogged > 0 ? '1 resolved sterility perimeter warning' : 'zero recorded boundary violations'}.`,
        phases: [
          { name: 'Patient Prep & Port Placement', timestamp: '00:04:12', confidence: 0.98 },
          { name: 'Calot’s Triangle Dissection', timestamp: '00:22:15', confidence: 0.95 },
          { name: scenario.phase, timestamp: formatTimer(simElapsed), confidence: 0.96 }
        ],
        instruments: ['Laparoscopic Hook Cautery', 'Atraumatic Grasper', 'Clip Applier', 'Suction-Irrigator'],
        anatomy: ['Gallbladder Fundus', 'Cystic Duct', 'Cystic Artery', 'Rouviere’s Sulcus', 'Duodenum Boundary'],
        risk_factors: [
          scenario.wallAlert
            ? { severity: 'High', description: scenario.wallAlert.message, recommendation: 'Immediate re-sterilization & boundary adherence.' }
            : { severity: 'Low', description: 'Thermal spread near cystic plate within safe margins.', recommendation: 'Maintain gentle lateral traction.' }
        ],
        alerts_history: scenario.wallAlert
          ? [
              {
                time: formatTimer(simElapsed),
                type: scenario.wallAlert.title,
                message: scenario.wallAlert.message,
                status: 'Resolved by scrub nurse'
              }
            ]
          : []
      };

      await generateWordReport(simulatedVideo, simulatedAnalysis);
      toast({
        title: 'Clinical Word Report (.docx) Generated',
        description: 'Auto-compiled surgical intelligence audit report downloaded successfully.'
      });
    } catch (err) {
      console.error('[Architecture] Docx generation error:', err);
      toast({
        title: 'Report Download Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-3 sm:p-5 md:p-8 max-w-7xl mx-auto space-y-6 w-full overflow-x-hidden">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <img
            src="/medicast-logo.png"
            alt="Medicast AI"
            className="h-11 w-auto object-contain rounded-xl bg-white p-1 border border-stone-200/90 shadow-2xs"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-heading">
                Operating Room System Architecture & Simulation
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                Live Digital Twin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Click any node on the real operating room image or use the dynamic simulation controls below to trigger intraoperative alerts and data flows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Audio toggle button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs rounded-xl gap-1.5 shadow-2xs"
            title={soundEnabled ? 'Acoustic & Voice Alarms Enabled' : 'Acoustic Alarms Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-teal-600" /> : <VolumeX className="w-3.5 h-3.5 text-stone-400" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio On' : 'Audio Muted'}</span>
          </Button>

          {/* Pause / Run Simulation */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsSimulating(!isSimulating)}
            className="border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs rounded-xl gap-1.5 shadow-2xs"
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-teal-600" />}
            <span>{isSimulating ? 'Pause Stream' : 'Resume Stream'}</span>
          </Button>

          {/* Direct Link to Live Surgery */}
          <Link to="/live">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl gap-2 shadow-xs">
              <Radio className="w-4 h-4" />
              <span>Open Live Surgery</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── TOP SECTION: REAL OPERATING ROOM IMAGE DISPLAY WITH INTERACTIVE CLICKABLE HOTSPOTS ── */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-3 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 font-heading">
                Physical Operating Room Deployment Display
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500">
                Interactive real-world setup: 1. Camera ➔ 2. Operating Bed ➔ 3. Medicast AI ➔ 4. Wall Screen ➔ 5. Clinical Report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-500 font-mono text-[11px] bg-stone-100 px-2 py-0.5 rounded-md">
              OR Clock: {formatTimer(simElapsed)}
            </span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
              Latency: {scenario.opticalMetrics.latency}ms
            </span>
          </div>
        </div>

        {/* ── Real Image Canvas Container with Clickable Dynamic Hotspots ── */}
        <div className="relative rounded-2xl overflow-hidden border border-stone-200/90 bg-stone-950 shadow-inner group">
          <img
            src="/medicast-or-deployment.jpg"
            alt="Operating Room Deployment Architecture"
            className="w-full h-auto object-cover select-none block max-h-[580px] min-h-[280px]"
          />

          {/* SVG Connection Pipeline Overlay (Dynamic Animated Stream Packets) */}
          {isSimulating && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="streamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Camera -> Operating Bed Beam */}
              <line
                x1="32"
                y1="18"
                x2="34"
                y2="52"
                stroke="url(#streamGrad)"
                strokeWidth="0.6"
                strokeDasharray="2, 2"
                className="animate-pulse"
              />

              {/* Bed -> Workstation Line */}
              <line
                x1="38"
                y1="56"
                x2="50"
                y2="52"
                stroke="#14b8a6"
                strokeWidth="0.5"
                strokeDasharray="1.5, 1.5"
              />

              {/* Workstation -> Wall Screen Line */}
              <line
                x1="55"
                y1="49"
                x2="74"
                y2="34"
                stroke={scenario.wallAlert ? '#ef4444' : '#14b8a6'}
                strokeWidth="0.7"
                strokeDasharray="2, 2"
              />

              {/* Wall Screen -> Clinical Report Line */}
              <line
                x1="78"
                y1="48"
                x2="80"
                y2="64"
                stroke="#10b981"
                strokeWidth="0.5"
                strokeDasharray="1, 1"
              />
            </svg>
          )}

          {/* ── Dynamic Hotspot Pins Overlaid on the Real Image ── */}
          {HOTSPOTS.map((spot) => {
            const isSelected = selectedHotspot === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => setSelectedHotspot(spot.id)}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer text-xs font-bold shadow-lg border ${
                  isSelected
                    ? 'bg-teal-600 text-white border-white scale-110 ring-4 ring-teal-400/50'
                    : 'bg-stone-900/80 hover:bg-stone-900 text-white border-stone-300/40 hover:scale-105'
                }`}
                title={`Click to inspect ${spot.fullTitle}`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isSelected ? 'bg-white' : 'bg-teal-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isSelected ? 'bg-white' : 'bg-teal-400'
                    }`}
                  />
                </span>
                <span className="font-heading tracking-wide text-[11px] sm:text-xs">
                  {spot.num}. {spot.title}
                </span>
              </button>
            );
          })}

          {/* ── Real-Time Dynamic Simulation HUD Bar Over the Image ── */}
          <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-20 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-stone-950/85 backdrop-blur-md border border-stone-800 text-white text-xs">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-red-600 text-white text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE HUD
              </span>
              <span className="font-medium text-stone-200 text-xs hidden sm:inline">
                Scenario: <strong className="text-white">{scenario.name}</strong>
              </span>
              <span className="text-stone-400 text-[11px]">
                Safety: <strong className="text-emerald-400">{scenario.compliance}%</strong>
              </span>
              <span className="text-stone-400 text-[11px]">
                Accuracy: <strong className="text-teal-400">{scenario.accuracy}%</strong>
              </span>
            </div>

            {/* Wall Alert Indicator if Active */}
            {scenario.wallAlert ? (
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold ${
                  alertFlash ? 'bg-red-600 text-white animate-bounce' : 'bg-red-950/80 text-red-200 border border-red-500'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-red-300" />
                <span>{scenario.wallAlert.title}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Sterile Field Intact</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Subsystem Quick Nav Pills Under Image ── */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-1 text-xs">
          {HOTSPOTS.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => setSelectedHotspot(spot.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                selectedHotspot === spot.id
                  ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-2xs font-bold'
                  : 'bg-[#FAF8F5] border-stone-200/90 text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {spot.num}. {spot.title}
            </button>
          ))}
        </div>
      </div>

      {/* ── MIDDLE SECTION: INTERACTIVE SIMULATION CONTROLS & DYNAMICS MECHANISM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Simulation Control Console */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 font-heading">
                  Interactive Simulation & Dynamics Mechanism
                </h3>
                <p className="text-xs text-stone-500">
                  Select a clinical scenario to trigger real-time intraoperative optical alerts & data flows:
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveScenarioId('safe');
                setSelectedHotspot('wallscreen');
                setSimElapsed(4332);
              }}
              className="text-xs border-stone-200 text-stone-600 hover:text-stone-900 h-8 gap-1 rounded-xl"
              title="Reset simulation state"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </Button>
          </div>

          {/* Scenario Trigger Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SCENARIOS.map((scen) => {
              const Icon = scen.icon;
              const isActive = scen.id === activeScenarioId;
              return (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => {
                    setActiveScenarioId(scen.id);
                    if (scen.id === 'unsterile' || scen.id === 'bleed') {
                      setSelectedHotspot('wallscreen');
                    } else if (scen.id === 'planes') {
                      setSelectedHotspot('workstation');
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    isActive
                      ? `${scen.color} ring-2 ring-teal-500/30 shadow-xs font-semibold`
                      : 'bg-[#FAF8F5] border-stone-200/90 hover:bg-stone-100/70 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">{scen.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-600 mt-1.5 leading-relaxed">
                    {scen.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Scenario Live Telemetry Card */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Active Live Stream Telemetry
              </span>
              <span className="text-xs font-mono text-stone-500">
                Frame Latency: &lt;{scenario.opticalMetrics.latency}ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                <span className="text-stone-500 text-[10px] block">Luminance</span>
                <strong className="text-stone-900">{scenario.opticalMetrics.brightness}%</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                <span className="text-stone-500 text-[10px] block">Contrast</span>
                <strong className="text-stone-900">{scenario.opticalMetrics.contrast}%</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                <span className="text-stone-500 text-[10px] block">Redness Index</span>
                <strong className={scenario.opticalMetrics.redness > 30 ? 'text-red-600 font-bold' : 'text-stone-900'}>
                  {scenario.opticalMetrics.redness}%
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                <span className="text-stone-500 text-[10px] block">AI Accuracy</span>
                <strong className="text-teal-700">{scenario.accuracy}%</strong>
              </div>
            </div>

            {/* Wall Alert Preview */}
            {scenario.wallAlert && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-950">{scenario.wallAlert.title}</h4>
                  <p className="text-[11px] text-red-800 mt-0.5">{scenario.wallAlert.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar: Download Simulated Report */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-stone-600">
              Auto-compiled clinical audit ready: <strong>Laparoscopic Cholecystectomy</strong>
            </div>

            <Button
              type="button"
              onClick={handleDownloadSimulatedDocx}
              disabled={isDownloadingDocx}
              className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl gap-2 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingDocx ? 'Compiling Word Doc...' : 'Download Simulated Report (.docx)'}</span>
            </Button>
          </div>
        </div>

        {/* Right 5 Columns: Subsystem Inspector Card (Tied to Clicked Hotspot) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                {hotspot.num}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 font-heading">
                Subsystem Specification
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
              {hotspot.badge}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-stone-900">{hotspot.fullTitle}</h4>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">{hotspot.summary}</p>
          </div>

          <div className="space-y-2 pt-1">
            {hotspot.specs.map((item) => (
              <div
                key={item.label}
                className="p-2.5 rounded-xl bg-[#FAF8F5] border border-stone-200/80 flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-stone-500 font-medium">{item.label}</span>
                <strong className="text-stone-800 text-right">{item.value}</strong>
              </div>
            ))}
          </div>

          {/* Interactive Dynamic Role in Active Scenario */}
          <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-xs space-y-1">
            <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider block">
              Dynamic Status in Current Scenario
            </span>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              {hotspot.id === 'camera' && 'Streaming 30 FPS video frames through offscreen canvas for instantaneous optical parsing.'}
              {hotspot.id === 'bed' && 'Sterile drape boundary verified; surgeon instruments localized in real-time coordinate system.'}
              {hotspot.id === 'workstation' && `Edge AI inferring scene context. Current safety index evaluated at ${scenario.compliance}%.`}
              {hotspot.id === 'wallscreen' && (scenario.wallAlert ? `Displaying HIGH-VISIBILITY ALERT: ${scenario.wallAlert.title}.` : 'Heads-up monitor showing clean surgical telemetry & checklist.')}
              {hotspot.id === 'report' && `Auto-generating procedure audit trail with ${scenario.alertsLogged} alerts logged.`}
            </p>
          </div>

          <Link to="/live" className="block pt-1">
            <Button
              variant="outline"
              className="w-full text-xs font-semibold border-teal-300 text-teal-800 bg-teal-50/50 hover:bg-teal-100 rounded-xl gap-2"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Launch Physical Camera in Live Surgery</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── BOTTOM BANNER: ARCHITECTURAL PRINCIPLES ── */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-stone-900">
            Medicast AI — Watch • Warn • Report — For a Safer, Smarter Surgery
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Info className="w-3.5 h-3.5 text-stone-400" />
          <span>Compliant with hospital OR network security protocols & local inference standards</span>
        </div>
      </div>
    </div>
  );
}
