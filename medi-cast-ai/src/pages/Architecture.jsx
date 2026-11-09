import { useState, useEffect, useRef, useCallback } from 'react';
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
  SkipForward,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateWordReport } from '@/utils/reportGenerator';
import { useToast } from '@/components/ui/use-toast';

// ───────────────────────────────────────────────────────────────
//  SIMULATION TIMELINE – Each step is a "scene" in the walkthrough
// ───────────────────────────────────────────────────────────────
const TIMELINE = [
  {
    id: 'cam_boot',
    phase: 1,
    label: 'Camera Activation',
    duration: 5000,
    highlight: 'camera',
    narration: 'The overhead camera mounted above the operating table powers on. A continuous 1080p 30-FPS video stream initializes through the USB or HDMI capture interface.',
    wallStatus: null,
    safetyPct: null,
    accuracyPct: null,
    alertBanner: null,
    opticalBar: { brightness: 45, contrast: 30, redness: 5 },
    flowSegments: ['cam'],
    orClock: '0:00:00',
    voice: 'Camera activated. Video stream initializing.',
  },
  {
    id: 'sterile_setup',
    phase: 2,
    label: 'Sterile Field Established',
    duration: 5000,
    highlight: 'bed',
    narration: "The patient is draped and the sterile boundary perimeter is set. Medicast AI begins optical tracking of the drape edges, instrument tray, and the surgeon's gloved hands.",
    wallStatus: null,
    safetyPct: null,
    accuracyPct: null,
    alertBanner: null,
    opticalBar: { brightness: 72, contrast: 68, redness: 8 },
    flowSegments: ['cam', 'cam_bed'],
    orClock: '0:04:12',
    voice: 'Sterile field established. Optical boundary tracking active.',
  },
  {
    id: 'ai_init',
    phase: 3,
    label: 'Medicast AI Processing Begins',
    duration: 5000,
    highlight: 'workstation',
    narration: 'The Medicast AI workstation starts analyzing every incoming video frame. The sub-millisecond optical sensor checks luminance, contrast, and red-spectrum intensity. The multimodal vision AI identifies anatomy and surgical phase.',
    wallStatus: 'Standby Ready',
    safetyPct: 90,
    accuracyPct: 88,
    alertBanner: null,
    opticalBar: { brightness: 85, contrast: 88, redness: 12 },
    flowSegments: ['cam', 'cam_bed', 'bed_ai'],
    orClock: '0:06:30',
    voice: 'Medicast AI online. Dual-engine surgical intelligence processing active.',
  },
  {
    id: 'live_monitoring',
    phase: 4,
    label: 'Live Surgery Monitoring Active',
    duration: 6000,
    highlight: 'wallscreen',
    narration: 'The Wall Screen cockpit lights up. Real-time live camera feed, safety compliance gauge (96%), phase detection, and OR checklist are continuously displayed for the entire surgical team to see.',
    wallStatus: 'All Clear — Sterile Field Maintained',
    safetyPct: 96,
    accuracyPct: 94,
    alertBanner: null,
    opticalBar: { brightness: 88, contrast: 92, redness: 14 },
    flowSegments: ['cam', 'cam_bed', 'bed_ai', 'ai_wall'],
    orClock: '0:22:15',
    voice: 'Wall screen active. Live telemetry, safety compliance, and anatomy overlay displayed.',
  },
  {
    id: 'alert_trigger',
    phase: 5,
    label: '⚠ ALERT: Instrument Not Sterile!',
    duration: 7000,
    highlight: 'wallscreen',
    narration: 'The AI optical sensor detects a surgeon\'s instrument crossing the unsterile perimeter boundary. An immediate high-visibility red ALERT flashes on the Wall Screen. A voice acoustic alarm fires in the operating room: "Alert — Instrument not sterile."',
    wallStatus: 'BREACH DETECTED — 1 Unsterile Instrument',
    safetyPct: 82,
    accuracyPct: 91,
    alertBanner: {
      title: 'ALERT! Instrument Not Sterile',
      message: 'Perimeter breach detected. Re-sterilize or replace instrument immediately.',
      severity: 'critical'
    },
    opticalBar: { brightness: 85, contrast: 89, redness: 18 },
    flowSegments: ['cam', 'cam_bed', 'bed_ai', 'ai_wall'],
    orClock: '0:34:07',
    voice: 'Alert! Instrument not sterile. Perimeter breach detected. Re-sterilize immediately.',
  },
  {
    id: 'alert_resolved',
    phase: 6,
    label: 'Alert Resolved — Sterility Restored',
    duration: 5000,
    highlight: 'workstation',
    narration: 'The scrub nurse removes the contaminated instrument and replaces it with a sterile one. Medicast AI confirms the sterile field boundary is intact once again. Safety compliance recovers to 96%.',
    wallStatus: 'All Clear — Sterile Field Restored',
    safetyPct: 96,
    accuracyPct: 95,
    alertBanner: null,
    opticalBar: { brightness: 88, contrast: 91, redness: 13 },
    flowSegments: ['cam', 'cam_bed', 'bed_ai', 'ai_wall'],
    orClock: '0:35:42',
    voice: 'Alert resolved. Sterile field restored. Safety compliance recovered.',
  },
  {
    id: 'cvs_verified',
    phase: 7,
    label: 'Critical View of Safety Verified ✓',
    duration: 6000,
    highlight: 'workstation',
    narration: 'The AI vision model verifies all 3 criteria of the Critical View of Safety: the hepatocystic triangle is cleared, the cystic duct and cystic artery are the only two structures entering the gallbladder, and the lower third of the gallbladder is dissected off the liver bed. Surgical accuracy reaches 98%.',
    wallStatus: 'Optimal Safety — CVS 3/3 Attained',
    safetyPct: 99,
    accuracyPct: 98,
    alertBanner: null,
    opticalBar: { brightness: 91, contrast: 94, redness: 16 },
    flowSegments: ['cam', 'cam_bed', 'bed_ai', 'ai_wall'],
    orClock: '0:52:18',
    voice: 'Critical View of Safety verified. All three criteria confirmed.',
  },
  {
    id: 'report_generated',
    phase: 8,
    label: 'Clinical Report Auto-Generated',
    duration: 6000,
    highlight: 'report',
    narration: 'Surgery complete. Medicast AI auto-compiles the entire intraoperative session into a downloadable .docx Clinical Audit Report — including phases observed, instruments detected, anatomy verified, 1 resolved sterility alert, and a final 98% safety compliance score.',
    wallStatus: 'Surgery Complete — Report Ready',
    safetyPct: 98,
    accuracyPct: 98,
    alertBanner: null,
    opticalBar: { brightness: 60, contrast: 55, redness: 6 },
    flowSegments: ['cam', 'cam_bed', 'bed_ai', 'ai_wall', 'wall_report'],
    orClock: '1:12:04',
    voice: 'Surgery complete. Clinical audit report auto-generated and ready for download.',
  },
];

// ── Hotspot positions on the real OR image (percentage-based) ──
const HOTSPOT_POSITIONS = {
  camera: { x: 32, y: 16, label: '1. Camera' },
  bed: { x: 34, y: 54, label: '2. Operating Bed' },
  workstation: { x: 52, y: 50, label: '3. Medicast AI' },
  wallscreen: { x: 77, y: 28, label: '4. Wall Screen' },
  report: { x: 82, y: 68, label: '5. Clinical Report' },
};

export default function Architecture() {
  const { toast } = useToast();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stepProgress, setStepProgress] = useState(0); // 0-100 progress within current step
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [alertFlash, setAlertFlash] = useState(false);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  const step = TIMELINE[currentStepIdx];
  const totalSteps = TIMELINE.length;
  const isLastStep = currentStepIdx === totalSteps - 1;

  // ── Step auto-advance timer ──
  const advanceStep = useCallback(() => {
    if (currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx((prev) => prev + 1);
      setStepProgress(0);
    } else {
      // Reached end
      setIsPlaying(false);
    }
  }, [currentStepIdx, totalSteps]);

  useEffect(() => {
    if (!isPlaying) {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
      return;
    }

    // Progress bar tick every 50ms
    const tickInterval = 50;
    const totalTicks = step.duration / tickInterval;
    let tick = 0;

    progressRef.current = setInterval(() => {
      tick++;
      setStepProgress(Math.min(100, (tick / totalTicks) * 100));
    }, tickInterval);

    // Advance to next step after duration
    timerRef.current = setTimeout(() => {
      clearInterval(progressRef.current);
      advanceStep();
    }, step.duration);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
    };
  }, [isPlaying, currentStepIdx, step.duration, advanceStep]);

  // ── Voice narration & alert flash on step change ──
  useEffect(() => {
    if (!hasStarted) return;

    // Alert flash
    if (step.alertBanner) {
      setAlertFlash(true);
      const t = setTimeout(() => setAlertFlash(false), 2500);
      return () => clearTimeout(t);
    } else {
      setAlertFlash(false);
    }
  }, [currentStepIdx, hasStarted]);

  useEffect(() => {
    if (!hasStarted || !isPlaying || !soundEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(step.voice);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore
    }

    return () => {
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, [currentStepIdx, isPlaying, soundEnabled, hasStarted]);

  // ── Playback Controls ──
  const handlePlayPause = () => {
    if (!hasStarted) {
      setHasStarted(true);
      setCurrentStepIdx(0);
      setStepProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setCurrentStepIdx(0);
    setStepProgress(0);
    setIsPlaying(false);
    setHasStarted(false);
    setAlertFlash(false);
  };

  const handleSkipNext = () => {
    if (currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx((prev) => prev + 1);
      setStepProgress(0);
    }
  };

  const handleJumpToStep = (idx) => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setCurrentStepIdx(idx);
    setStepProgress(0);
    setHasStarted(true);
    // Keep playing state as-is
  };

  // ── Download simulated clinical report ──
  const handleDownloadSimulatedDocx = async () => {
    setIsDownloadingDocx(true);
    try {
      const simulatedVideo = {
        id: `sim_or_${Date.now()}`,
        title: 'Laparoscopic Cholecystectomy (Simulated OR Session)',
        procedure_type: 'Laparoscopic Cholecystectomy',
        surgeon_name: 'Dr. Sarah Jenkins, MD, FACS',
        patient_id: 'OR-BED-01-PATIENT',
        department: 'General Surgery & Minimally Invasive',
        duration_minutes: 72,
        duration: 4324,
        notes: 'Simulated deployment walkthrough demonstrating Medicast AI camera-to-wall-screen pipeline with 1 resolved sterility alert.',
        created_at: new Date().toISOString()
      };
      const simulatedAnalysis = {
        procedure_type: 'Laparoscopic Cholecystectomy',
        overall_score: 98,
        safety_score: 98,
        efficiency_score: 94,
        skill_score: 95,
        summary: 'Intraoperative live session with continuous optical + AI cognitive monitoring. 1 sterility boundary breach was detected, flagged via immediate acoustic alarm, and resolved by the scrub nurse within 90 seconds. Critical View of Safety (CVS 3/3) was verified by AI vision.',
        phases: [
          { name: 'Patient Prep & Port Placement', timestamp: '00:04:12', confidence: 0.98 },
          { name: 'Calot\'s Triangle Dissection', timestamp: '00:22:15', confidence: 0.95 },
          { name: 'Critical View Verification', timestamp: '00:52:18', confidence: 0.98 },
          { name: 'Gallbladder Detachment & Extraction', timestamp: '01:02:30', confidence: 0.97 },
          { name: 'Hemostasis & Closure', timestamp: '01:10:45', confidence: 0.96 }
        ],
        instruments: ['Laparoscopic Hook Cautery', 'Atraumatic Grasper', 'Clip Applier', 'Suction-Irrigator', 'Specimen Bag'],
        anatomy: ['Gallbladder Fundus', 'Cystic Duct', 'Cystic Artery', 'Rouviere\'s Sulcus', 'Hepatocystic Triangle'],
        risk_factors: [
          { severity: 'High', description: 'Unsterile instrument perimeter breach at 0:34:07.', recommendation: 'Re-sterilized by scrub nurse — resolved within 90 seconds.' },
          { severity: 'Low', description: 'Mild thermal spread near cystic plate margin.', recommendation: 'Maintained gentle lateral traction.' }
        ],
        alerts_history: [
          { time: '0:34:07', type: 'Instrument Not Sterile', message: 'Perimeter breach detected at patient right flank.', status: 'Resolved by scrub nurse at 0:35:42' }
        ]
      };
      await generateWordReport(simulatedVideo, simulatedAnalysis);
      toast({ title: 'Clinical Audit Report (.docx) Downloaded', description: 'Simulated surgical session report compiled.' });
    } catch (err) {
      toast({ title: 'Report Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // ── Helpers ──
  const getFlowColor = (seg) => {
    if (step.alertBanner && (seg === 'ai_wall' || seg === 'bed_ai')) return '#ef4444';
    if (seg === 'wall_report') return '#10b981';
    return '#14b8a6';
  };
  const isFlowActive = (seg) => step.flowSegments.includes(seg);

  // Flow line coordinates (percentage on image)
  const FLOW_LINES = {
    cam: { x1: 32, y1: 20, x2: 32, y2: 20 }, // just a dot at camera
    cam_bed: { x1: 32, y1: 20, x2: 34, y2: 50 },
    bed_ai: { x1: 38, y1: 55, x2: 50, y2: 51 },
    ai_wall: { x1: 55, y1: 48, x2: 74, y2: 32 },
    wall_report: { x1: 78, y1: 48, x2: 81, y2: 64 },
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-3 sm:p-5 md:p-8 max-w-7xl mx-auto space-y-5 w-full overflow-x-hidden">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <img src="/medicast-logo.png" alt="Medicast AI" className="h-11 w-auto object-contain rounded-xl bg-white p-1 border border-stone-200/90 shadow-2xs" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-heading">
                Operating Room Architecture & Simulation
              </h1>
              {hasStarted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                  <span className={`w-2 h-2 rounded-full bg-red-600 ${isPlaying ? 'animate-pulse' : ''}`} />
                  {isPlaying ? 'SIMULATING' : 'PAUSED'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Watch the full intraoperative pipeline in action — from camera activation to clinical report generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={() => setSoundEnabled(!soundEnabled)} className="border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs rounded-xl gap-1.5 shadow-2xs">
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-teal-600" /> : <VolumeX className="w-3.5 h-3.5 text-stone-400" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </Button>
          <Link to="/live">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl gap-2 shadow-xs">
              <Radio className="w-4 h-4" />
              <span>Open Live Surgery</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN SIMULATION CANVAS — Real OR Image + Animated Overlays
         ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="relative">
          {/* ── Real OR Deployment Photograph ── */}
          <img
            src="/medicast-or-deployment.jpg"
            alt="Operating Room Deployment"
            className="w-full h-auto object-cover select-none block max-h-[580px] min-h-[260px]"
          />

          {/* ── Animated SVG Data-Flow Lines ── */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {Object.entries(FLOW_LINES).map(([key, coords]) => {
              if (key === 'cam') return null; // dot only
              const active = isFlowActive(key);
              if (!active) return null;
              return (
                <line
                  key={key}
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  stroke={getFlowColor(key)}
                  strokeWidth="0.8"
                  strokeDasharray="2.5, 1.5"
                  filter="url(#glow)"
                  className="animate-pulse"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Animated data packet dots traveling along active flow lines */}
            {isPlaying && isFlowActive('cam_bed') && (
              <circle r="0.9" fill="#14b8a6" filter="url(#glow)">
                <animateMotion dur="2s" repeatCount="indefinite" path="M32,20 L34,50" />
              </circle>
            )}
            {isPlaying && isFlowActive('bed_ai') && (
              <circle r="0.9" fill="#14b8a6" filter="url(#glow)">
                <animateMotion dur="1.5s" repeatCount="indefinite" path="M38,55 L50,51" />
              </circle>
            )}
            {isPlaying && isFlowActive('ai_wall') && (
              <circle r="1" fill={step.alertBanner ? '#ef4444' : '#14b8a6'} filter="url(#glow)">
                <animateMotion dur="1.8s" repeatCount="indefinite" path="M55,48 L74,32" />
              </circle>
            )}
            {isPlaying && isFlowActive('wall_report') && (
              <circle r="0.8" fill="#10b981" filter="url(#glow)">
                <animateMotion dur="2s" repeatCount="indefinite" path="M78,48 L81,64" />
              </circle>
            )}
          </svg>

          {/* ── Interactive Hotspot Nodes on Image ── */}
          {Object.entries(HOTSPOT_POSITIONS).map(([id, pos]) => {
            const isActive = step.highlight === id;
            const isInFlow = step.flowSegments.some((s) => s.includes(id.slice(0, 3)));
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleJumpToStep(TIMELINE.findIndex((t) => t.highlight === id))}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md transition-all duration-300 cursor-pointer text-xs font-bold shadow-lg border ${
                  isActive
                    ? step.alertBanner && id === 'wallscreen'
                      ? 'bg-red-600 text-white border-red-300 scale-110 ring-4 ring-red-400/60 animate-pulse'
                      : 'bg-teal-600 text-white border-white scale-110 ring-4 ring-teal-400/50'
                    : isInFlow
                    ? 'bg-stone-800/90 text-white border-teal-400/50'
                    : 'bg-stone-900/60 text-stone-300 border-stone-500/30'
                }`}
                title={`Jump to ${pos.label} stage`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  {isActive && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${step.alertBanner && id === 'wallscreen' ? 'bg-red-300' : 'bg-white'}`} />}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isActive ? 'bg-white' : isInFlow ? 'bg-teal-400' : 'bg-stone-500'}`} />
                </span>
                <span className="font-heading tracking-wide text-[11px] sm:text-xs">{pos.label}</span>
              </button>
            );
          })}

          {/* ── Alert Banner Overlay (flashes on step 5) ── */}
          {step.alertBanner && (
            <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-2xl border-2 shadow-xl flex items-center gap-3 transition-all ${
              alertFlash ? 'bg-red-600 border-red-400 scale-105' : 'bg-red-950/90 border-red-600'
            } backdrop-blur-md`}>
              <AlertTriangle className={`w-5 h-5 ${alertFlash ? 'text-white animate-bounce' : 'text-red-300'}`} />
              <div>
                <span className="text-white font-extrabold text-xs sm:text-sm block">{step.alertBanner.title}</span>
                <span className="text-red-100 text-[11px]">{step.alertBanner.message}</span>
              </div>
            </div>
          )}

          {/* ── HUD Bottom Bar ── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-stone-950/90 backdrop-blur-md border-t border-stone-800 px-3 sm:px-5 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 text-white text-xs">
                <span className="font-mono text-stone-300 bg-stone-900 px-2 py-0.5 rounded-md text-[11px]">
                  OR {step.orClock}
                </span>
                {step.safetyPct != null && (
                  <span className="text-stone-400">
                    Safety: <strong className={step.safetyPct >= 95 ? 'text-emerald-400' : step.safetyPct >= 85 ? 'text-amber-400' : 'text-red-400'}>{step.safetyPct}%</strong>
                  </span>
                )}
                {step.accuracyPct != null && (
                  <span className="text-stone-400">
                    Accuracy: <strong className="text-teal-400">{step.accuracyPct}%</strong>
                  </span>
                )}
              </div>

              {step.wallStatus && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                  step.alertBanner ? 'bg-red-950 text-red-200 border border-red-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                }`}>
                  {step.alertBanner ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{step.wallStatus}</span>
                </div>
              )}
            </div>

            {/* Optical Sensor Bars */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { label: 'Brightness', value: step.opticalBar.brightness, color: 'bg-amber-400' },
                { label: 'Contrast', value: step.opticalBar.contrast, color: 'bg-teal-400' },
                { label: 'Redness', value: step.opticalBar.redness, color: step.opticalBar.redness > 30 ? 'bg-red-500' : 'bg-rose-400' },
              ].map((m) => (
                <div key={m.label} className="text-[10px] text-stone-400">
                  <div className="flex justify-between mb-0.5">
                    <span>{m.label}</span>
                    <span className="text-white font-semibold">{m.value}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-800 overflow-hidden">
                    <div className={`h-full rounded-full ${m.color} transition-all duration-700`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Pre-Start Splash Overlay ── */}
          {!hasStarted && (
            <div className="absolute inset-0 z-40 bg-stone-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
              <div className="text-center space-y-2 px-6">
                <img src="/medicast-logo.png" alt="Medicast AI" className="h-14 w-auto mx-auto rounded-2xl bg-white/10 p-1.5" />
                <h2 className="text-white text-xl sm:text-2xl font-bold font-heading">
                  Medicast AI — Operating Room Simulation
                </h2>
                <p className="text-stone-300 text-sm max-w-xl mx-auto leading-relaxed">
                  Watch how the real-time surgical intelligence pipeline works: from camera activation through AI processing, live wall screen alerts, to the final auto-generated clinical report.
                </p>
              </div>
              <Button
                type="button"
                onClick={handlePlayPause}
                className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-2xl gap-3 px-8 py-3 shadow-lg"
              >
                <Play className="w-5 h-5" />
                <span>Play Simulation</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          PLAYBACK CONTROLS + TIMELINE STRIP
         ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs space-y-3">
        {/* Transport Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={handleRestart} className="border-stone-200 text-stone-600 hover:text-stone-900 text-xs rounded-xl gap-1 h-8">
            <RotateCcw className="w-3 h-3" />
            <span>Restart</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePlayPause}
            className={`text-xs rounded-xl gap-1.5 h-8 font-semibold shadow-xs ${
              isPlaying ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : hasStarted ? 'Resume' : 'Play'}</span>
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={handleSkipNext} disabled={isLastStep} className="border-stone-200 text-stone-600 hover:text-stone-900 text-xs rounded-xl gap-1 h-8">
            <SkipForward className="w-3 h-3" />
            <span>Next Step</span>
          </Button>

          <div className="ml-auto flex items-center gap-2 text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Phase {step.phase} / {totalSteps}</span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-75 ${step.alertBanner ? 'bg-red-500' : 'bg-teal-500'}`}
            style={{ width: `${stepProgress}%` }}
          />
        </div>

        {/* Timeline Strip — clickable step markers */}
        <div className="flex items-stretch gap-1 overflow-x-auto py-1">
          {TIMELINE.map((t, idx) => {
            const isCurrent = idx === currentStepIdx;
            const isPast = idx < currentStepIdx;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleJumpToStep(idx)}
                className={`flex-1 min-w-[80px] max-w-[160px] px-2 py-2 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? t.alertBanner
                      ? 'bg-red-50 border-red-300 ring-1 ring-red-400/30'
                      : 'bg-teal-50 border-teal-300 ring-1 ring-teal-400/30'
                    : isPast
                    ? 'bg-stone-50 border-stone-200/80 opacity-70'
                    : 'bg-[#FAF8F5] border-stone-200/80 hover:bg-stone-100/70'
                }`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${
                    isCurrent ? 'bg-teal-600 text-white' : isPast ? 'bg-stone-400 text-white' : 'bg-stone-200 text-stone-600'
                  }`}>{t.phase}</span>
                  {isPast && <Check className="w-3 h-3 text-emerald-600" />}
                </div>
                <span className={`text-[10px] leading-tight font-semibold block ${isCurrent ? 'text-stone-900' : 'text-stone-500'}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          NARRATION + ACTIVE STAGE DETAIL PANEL
         ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Narration & Current Scene Description */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              step.alertBanner ? 'bg-red-100 border border-red-300 text-red-700' : 'bg-teal-50 border border-teal-200 text-teal-700'
            }`}>
              {step.highlight === 'camera' && <Camera className="w-5 h-5" />}
              {step.highlight === 'bed' && <Eye className="w-5 h-5" />}
              {step.highlight === 'workstation' && <Cpu className="w-5 h-5" />}
              {step.highlight === 'wallscreen' && <Monitor className="w-5 h-5" />}
              {step.highlight === 'report' && <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 font-heading">
                {step.label}
              </h3>
              <span className="text-[11px] text-stone-400 font-mono">Phase {step.phase} • OR Clock {step.orClock}</span>
            </div>
          </div>

          <p className="text-sm text-stone-700 leading-relaxed">
            {step.narration}
          </p>

          {/* Live Optical Telemetry during this step */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
              <span className="text-stone-500 text-[10px] block">Brightness</span>
              <strong className="text-stone-900">{step.opticalBar.brightness}%</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
              <span className="text-stone-500 text-[10px] block">Contrast</span>
              <strong className="text-stone-900">{step.opticalBar.contrast}%</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
              <span className="text-stone-500 text-[10px] block">Redness Index</span>
              <strong className={step.opticalBar.redness > 30 ? 'text-red-600' : 'text-stone-900'}>{step.opticalBar.redness}%</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
              <span className="text-stone-500 text-[10px] block">Safety</span>
              <strong className={step.safetyPct != null ? (step.safetyPct >= 95 ? 'text-emerald-700' : step.safetyPct >= 85 ? 'text-amber-600' : 'text-red-600') : 'text-stone-400'}>
                {step.safetyPct != null ? `${step.safetyPct}%` : '—'}
              </strong>
            </div>
          </div>

          {/* Alert Detail if present */}
          {step.alertBanner && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-950">{step.alertBanner.title}</h4>
                <p className="text-xs text-red-800 mt-0.5 leading-relaxed">{step.alertBanner.message}</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-red-700 font-medium">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Voice + Acoustic Alarm Fired</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-white border border-red-200 text-red-600">Auto-Logged</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Stage Inspector + Report Download */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
          {/* Wall Screen Preview */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-stone-200">Wall Screen Preview</span>
              </div>
              {step.wallStatus && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-600 text-white font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
            </div>

            {step.wallStatus ? (
              <>
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  step.alertBanner ? 'bg-red-900/80 border border-red-600 text-red-100' : 'bg-emerald-900/60 border border-emerald-600 text-emerald-200'
                }`}>
                  {step.alertBanner ? <AlertTriangle className="w-4 h-4 inline mr-1.5 text-red-300" /> : <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-emerald-400" />}
                  {step.wallStatus}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">Phase</span>
                    <span className="text-[11px] font-semibold text-stone-100">{TIMELINE[currentStepIdx]?.label?.replace(/[⚠✓]/g, '').trim().slice(0, 18)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">Accuracy</span>
                    <span className="text-[11px] font-bold text-teal-400">{step.accuracyPct}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">Alerts</span>
                    <span className={`text-[11px] font-bold ${step.alertBanner ? 'text-red-400' : 'text-emerald-400'}`}>
                      {step.alertBanner ? '1 Active' : '0'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-center text-xs text-stone-500">
                Wall screen standby — awaiting AI initialization...
              </div>
            )}
          </div>

          {/* Download Report Button (visible on last step) */}
          {currentStepIdx >= totalSteps - 1 && (
            <Button
              type="button"
              onClick={handleDownloadSimulatedDocx}
              disabled={isDownloadingDocx}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl gap-2 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingDocx ? 'Compiling Word Document...' : 'Download Simulated Clinical Report (.docx)'}</span>
            </Button>
          )}

          {/* Data Flow Pipeline Legend */}
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-stone-200/80 space-y-2">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">Data Flow Pipeline</span>
            {[
              { seg: 'cam_bed', label: 'Camera → Operating Bed', desc: 'Optical video field of view' },
              { seg: 'bed_ai', label: 'Bed → Medicast AI', desc: 'Frame buffer for AI processing' },
              { seg: 'ai_wall', label: 'AI → Wall Screen', desc: 'Telemetry, alerts & safety data' },
              { seg: 'wall_report', label: 'Wall Screen → Report', desc: 'Auto-compiled clinical audit' },
            ].map((f) => (
              <div key={f.seg} className={`flex items-center gap-2 text-[11px] transition-opacity ${isFlowActive(f.seg) ? 'opacity-100' : 'opacity-30'}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${isFlowActive(f.seg) ? (step.alertBanner && f.seg === 'ai_wall' ? 'bg-red-500' : 'bg-teal-500') : 'bg-stone-300'}`} />
                <span className="font-semibold text-stone-700">{f.label}</span>
                <ChevronRight className="w-3 h-3 text-stone-400" />
                <span className="text-stone-500">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Tagline ── */}
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
