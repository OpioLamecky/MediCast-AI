import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import {
  SURGICAL_PROCEDURES,
  SURGICAL_DEPARTMENTS,
  getProcedureProfile,
  extractFrameOpticalMetrics,
  evaluateImmediateOpticalHazards,
  analyzeLiveSurgeryFrame,
  compileLiveSessionAnalysis
} from '@/api/aiService';
import { generateWordReport } from '@/utils/reportGenerator';
import {
  Radio,
  Video,
  Camera,
  CameraOff,
  AlertTriangle,
  ShieldCheck,
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Download,
  FileText,
  Sparkles,
  Upload,
  FlipHorizontal,
  Eye,
  Wrench,
  Layers,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ScanLine,
  Film,
  Loader2,
  Settings2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

// ─────────────────────────────────────────────────────────────
// Clinical Acoustic & Voice Alert Synthesizer (Zero External Assets)
// ─────────────────────────────────────────────────────────────
function playClinicalAlertTone(severity = 'moderate') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const createBeep = (freq, startOffset, duration, gainVal = 0.12, type = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(gainVal, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    if (severity === 'critical') {
      createBeep(880, 0, 0.16, 0.18, 'triangle');
      createBeep(880, 0.2, 0.16, 0.18, 'triangle');
      createBeep(1046, 0.4, 0.24, 0.2, 'triangle');
    } else if (severity === 'high') {
      createBeep(740, 0, 0.18, 0.14, 'sine');
      createBeep(880, 0.22, 0.2, 0.14, 'sine');
    } else if (severity === 'moderate') {
      createBeep(587, 0, 0.16, 0.08, 'sine');
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch {
    // AudioContext blocked prior to user gesture — safely ignore
  }
}

function speakSurgicalAlert(text) {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 1.0;
      utter.volume = 0.85;
      window.speechSynthesis.speak(utter);
    }
  } catch {
    // Ignore speech synthesis errors
  }
}

function formatDuration(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const severityStyles = {
  critical: {
    badge: 'bg-red-600 text-white',
    card: 'bg-red-50/95 border-red-300 text-red-950',
    hud: 'bg-red-950/90 border-red-500/80 text-white',
    dot: 'bg-red-500'
  },
  high: {
    badge: 'bg-orange-500 text-white',
    card: 'bg-orange-50/95 border-orange-300 text-orange-950',
    hud: 'bg-orange-950/90 border-orange-400/80 text-white',
    dot: 'bg-orange-500'
  },
  moderate: {
    badge: 'bg-amber-500 text-white',
    card: 'bg-amber-50/95 border-amber-200 text-amber-950',
    hud: 'bg-amber-950/85 border-amber-400/70 text-white',
    dot: 'bg-amber-500'
  },
  low: {
    badge: 'bg-teal-600 text-white',
    card: 'bg-teal-50/80 border-teal-200 text-teal-950',
    hud: 'bg-slate-900/85 border-teal-400/50 text-white',
    dot: 'bg-teal-500'
  }
};

export default function LiveSurgery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const initialMode = searchParams.get('mode') === 'prerecorded' ? 'prerecorded' : 'live';
  const initialProc = searchParams.get('procedure') || 'Laparoscopic Cholecystectomy';

  // ── Mode State: 'live' (PC Camera) vs 'prerecorded' (Pre-Recorded Surgical Videos) ──
  const [mode, setMode] = useState(initialMode);

  // ── Case & Procedure Configuration ──
  const [procedureType, setProcedureType] = useState(
    SURGICAL_PROCEDURES.includes(initialProc) ? initialProc : 'Laparoscopic Cholecystectomy'
  );
  const [caseMeta, setCaseMeta] = useState({
    title: '',
    surgeon_name: '',
    patient_id: '',
    department: getProcedureProfile(initialProc).department || 'General Surgery',
    notes: ''
  });
  const [showCaseConfig, setShowCaseConfig] = useState(false);

  // ── PC Camera & Recording State ──
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing' | 'ready' | 'error' | 'off'
  const [cameraError, setCameraError] = useState('');
  const [cameraErrorKind, setCameraErrorKind] = useState('browser'); // 'browser' | 'system' | 'busy' | 'not_found' | 'other'
  const [isVirtualScope, setIsVirtualScope] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [micEnabled, setMicEnabled] = useState(false);
  const [mirrorCamera, setMirrorCamera] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [aiWatchActive, setAiWatchActive] = useState(true);
  const [isScanningFrame, setIsScanningFrame] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);

  // ── Recorded Output & Final Report State ──
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  const [recordedFile, setRecordedFile] = useState(null);
  const [completedSession, setCompletedSession] = useState(null); // { videoRecord, analysisRecord }

  // ── Pre-Recorded Mode State ──
  const [savedVideos, setSavedVideos] = useState([]);
  const [savedAnalysesMap, setSavedAnalysesMap] = useState({});
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [prerecordedFilter, setPrerecordedFilter] = useState('all');
  const [activePrerecordedVideo, setActivePrerecordedVideo] = useState(null); // { url, title, procedure_type, file, dbVideo }
  const [isPrerecordedPlaying, setIsPrerecordedPlaying] = useState(false);

  // ── Real-Time AI Telemetry & Alerts State ──
  const [opticalMetrics, setOpticalMetrics] = useState({
    brightness: 62,
    contrastScore: 54,
    rednessRatio: 10,
    motionScore: 6
  });
  const [liveTelemetry, setLiveTelemetry] = useState(() => {
    const prof = getProcedureProfile(initialProc);
    return {
      phase: prof.phases[0],
      scene_observed: 'Initializing surgical vision stream...',
      risk_level: 'low',
      safety_score: 95,
      efficiency_score: 91,
      skill_score: 93,
      anatomy_identified: prof.landmarks.slice(0, 3),
      instruments_detected: prof.instruments.slice(0, 2),
      guidance_tip: 'Center surgical field and verify optical clarity prior to incision.',
      engine: 'MediCast Vision Ready'
    };
  });
  const [alertsFeed, setAlertsFeed] = useState([]);
  const [activeBannerAlert, setActiveBannerAlert] = useState(null);

  // ── Refs ──
  const liveVideoRef = useRef(null);
  const prerecordedVideoRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const prevGrayRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const sessionIdRef = useRef(`live_${Date.now()}`);
  const frameCounterRef = useRef(0);
  const isAnalyzingRef = useRef(false);
  const lastAudioAlertTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const virtualAnimRef = useRef(null);

  // Accumulators for final post-operative report synthesis
  const sessionLogRef = useRef({
    phasesObserved: [],
    instrumentsSet: new Set(),
    anatomySet: new Set(),
    safetyScores: [],
    efficiencyScores: [],
    skillScores: [],
    alerts: []
  });

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  // Update procedure department & initial telemetry when procedure changes
  const handleProcedureChange = (newProc) => {
    setProcedureType(newProc);
    const prof = getProcedureProfile(newProc);
    setCaseMeta(prev => ({
      ...prev,
      department: prof.department || prev.department
    }));
    setLiveTelemetry(prev => ({
      ...prev,
      phase: prof.phases[0],
      anatomy_identified: prof.landmarks.slice(0, 3),
      instruments_detected: prof.instruments.slice(0, 2),
      guidance_tip: `Configured for ${newProc}: Verify ${prof.landmarks[0]} exposure and safe dissection planes.`
    }));
  };

  // ── Stop PC Camera Cleanly ──
  const stopCameraStream = useCallback(() => {
    if (virtualAnimRef.current) {
      cancelAnimationFrame(virtualAnimRef.current);
      virtualAnimRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop error if already inactive
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsVirtualScope(false);
    setCameraStatus('off');
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  // ── Start PC Camera Stream (with Automatic Constraint Fallback & Permission Diagnostics) ──
  const startCameraStream = useCallback(async (deviceIdOverride) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraErrorKind('other');
      setCameraError('Camera API is not supported in this browser or non-secure context.');
      return;
    }

    if (virtualAnimRef.current) {
      cancelAnimationFrame(virtualAnimRef.current);
      virtualAnimRef.current = null;
    }
    setIsVirtualScope(false);
    setCameraStatus('initializing');
    setCameraError('');

    // Stop existing tracks before re-acquiring
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    const targetDevice = deviceIdOverride !== undefined ? deviceIdOverride : selectedDeviceId;

    try {
      let stream = null;
      try {
        const primaryConstraints = {
          video: targetDevice
            ? { deviceId: { ideal: targetDevice }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: micEnabled
        };
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (primaryErr) {
        // If high-res or mic constraint failed (not permission denial), fallback to basic { video: true }
        if (primaryErr.name !== 'NotAllowedError' && primaryErr.name !== 'PermissionDeniedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (micEnabled) setMicEnabled(false);
        } else {
          throw primaryErr;
        }
      }

      mediaStreamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }

      // Enumerate available cameras (PC webcam, USB surgical scope, capture card)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(cams);
      if (!targetDevice && cams.length > 0) {
        const activeTrack = stream.getVideoTracks()[0];
        const activeDeviceId = activeTrack?.getSettings?.()?.deviceId || cams[0].deviceId;
        setSelectedDeviceId(activeDeviceId);
      }

      setCameraStatus('ready');
    } catch (err) {
      console.error('[LiveSurgery] Camera access error:', err);
      setCameraStatus('error');
      const msg = (err.message || '').toLowerCase();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        if (msg.includes('system')) {
          setCameraErrorKind('system');
          setCameraError('Windows OS Privacy Settings are currently blocking your browser from using the PC camera.');
        } else {
          setCameraErrorKind('browser');
          setCameraError('Browser camera access is currently blocked or dismissed for this site.');
        }
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraErrorKind('busy');
        setCameraError('Your PC camera is currently in use by another app (e.g. Zoom, Teams, or Windows Camera). Close the other app and click Retry.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraErrorKind('not_found');
        setCameraError('No PC camera or surgical capture device was detected on this computer.');
      } else {
        setCameraErrorKind('other');
        setCameraError(err.message || 'Unable to initialize PC camera stream.');
      }
    }
  }, [selectedDeviceId, micEnabled]);

  // ── Start Virtual Surgical Endoscope Stream (Fallback when PC Camera is unavailable/locked) ──
  const startVirtualScopeStream = useCallback(() => {
    stopCameraStream();
    const simCanvas = document.createElement('canvas');
    simCanvas.width = 960;
    simCanvas.height = 540;
    const ctx = simCanvas.getContext('2d');
    let t = 0;

    const renderFrame = () => {
      t += 0.035;
      const w = simCanvas.width;
      const h = simCanvas.height;
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, w * 0.55);
      grad.addColorStop(0, '#c86d66');
      grad.addColorStop(0.65, '#883e3b');
      grad.addColorStop(1, '#18141c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Simulated microvascular network & avascular plane
      ctx.strokeStyle = 'rgba(153, 27, 27, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(90, h * 0.25);
      ctx.bezierCurveTo(w * 0.35, h * 0.4 + Math.sin(t) * 12, w * 0.6, h * 0.2, w - 90, h * 0.38);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(94, 234, 212, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(140, h * 0.68);
      ctx.quadraticCurveTo(w * 0.5, h * 0.42 + Math.sin(t * 0.8) * 16, w - 140, h * 0.62);
      ctx.stroke();
      ctx.setLineDash([]);

      // Simulated laparoscopic dissector tip
      const tipX = w * 0.52 + Math.cos(t * 1.2) * 55;
      const tipY = h * 0.5 + Math.sin(t * 1.5) * 30;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w - 40, h + 10);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      virtualAnimRef.current = requestAnimationFrame(renderFrame);
    };
    renderFrame();

    const stream = simCanvas.captureStream(25);
    mediaStreamRef.current = stream;
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
      liveVideoRef.current.play().catch(() => {});
    }
    setIsVirtualScope(true);
    setCameraError('');
    setCameraStatus('ready');
    toast({
      title: 'Virtual Surgical Scope Active',
      description: 'Streaming live simulated surgical scope feed for AI monitoring & recording.'
    });
  }, [stopCameraStream, toast]);

  // Auto-listen to browser camera permission changes so flipping "Allow" in Chrome URL bar connects immediately!
  useEffect(() => {
    if (mode !== 'live' || !navigator.permissions?.query) return;
    let permStatus = null;
    let cancelled = false;

    navigator.permissions.query({ name: 'camera' }).then((status) => {
      if (cancelled) return;
      permStatus = status;
      status.onchange = () => {
        if (status.state === 'granted' && mode === 'live') {
          startCameraStream();
        }
      };
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (permStatus) permStatus.onchange = null;
    };
  }, [mode, startCameraStream]);

  // Activate PC camera automatically when mode === 'live', release when switching to 'prerecorded'
  useEffect(() => {
    if (mode === 'live') {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-acquire stream if user switches camera device or mic while in live mode and not actively recording
  const handleDeviceChange = async (newDeviceId) => {
    setSelectedDeviceId(newDeviceId);
    if (mode === 'live' && !isRecording) {
      await startCameraStream(newDeviceId);
    }
  };

  const handleToggleMic = async () => {
    const nextMic = !micEnabled;
    setMicEnabled(nextMic);
    if (mode === 'live' && !isRecording && mediaStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: nextMic
        });
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
      } catch (e) {
        toast({ title: 'Microphone access unavailable', description: e.message, variant: 'destructive' });
        setMicEnabled(false);
      }
    }
  };

  // Load saved pre-recorded surgical videos when entering 'prerecorded' mode
  useEffect(() => {
    if (mode !== 'prerecorded') return;
    let cancelled = false;
    const fetchSaved = async () => {
      setLoadingSaved(true);
      try {
        const [{ data: v }, { data: a }] = await Promise.all([
          supabase.from('SurgeryVideo').select('*').order('created_date', { ascending: false }).limit(50),
          supabase.from('AnalysisResult').select('*').order('created_date', { ascending: false }).limit(50)
        ]);
        if (cancelled) return;
        setSavedVideos(v || []);
        const map = {};
        (a || []).forEach(item => { map[item.surgery_video_id] = item; });
        setSavedAnalysesMap(map);
      } catch (e) {
        console.error('Failed loading saved videos:', e);
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    };
    fetchSaved();
    return () => { cancelled = true; };
  }, [mode]);

  // ── Mode Switch Handler ──
  const switchOperatingMode = (targetMode) => {
    if (targetMode === mode) return;
    if (isRecording) {
      const confirmSwitch = window.confirm(
        'A live surgery recording is currently in progress. Stop recording and switch mode?'
      );
      if (!confirmSwitch) return;
    }
    setActiveBannerAlert(null);
    setMode(targetMode);
    setSearchParams({ mode: targetMode, procedure: procedureType });
  };

  // ── Push Alerts & Trigger Audio/HUD Warnings ──
  const registerAlerts = useCallback((incomingAlerts = []) => {
    if (!incomingAlerts.length) return;

    setAlertsFeed(prev => {
      const recentKeys = new Set(prev.slice(0, 8).map(a => `${a.title}_${a.severity}`));
      const fresh = incomingAlerts.filter(a => !recentKeys.has(`${a.title}_${a.severity}`));
      if (!fresh.length) return prev;

      // Log into session accumulator
      sessionLogRef.current.alerts.push(...fresh);

      // Check if we should display HUD banner & trigger audio warning
      const urgent = fresh.find(a => a.severity === 'critical' || a.severity === 'high')
        || fresh.find(a => a.severity === 'moderate');

      if (urgent) {
        setActiveBannerAlert(urgent);
        const now = Date.now();
        if (audioAlertsEnabled && now - lastAudioAlertTimeRef.current > 6500) {
          lastAudioAlertTimeRef.current = now;
          playClinicalAlertTone(urgent.severity);
          if (urgent.severity === 'critical' || urgent.severity === 'high') {
            speakSurgicalAlert(`${urgent.severity} surgical alert. ${urgent.title}. ${urgent.recommendation || ''}`);
          }
        }
      }

      return [...fresh, ...prev].slice(0, 40);
    });
  }, [audioAlertsEnabled]);

  // ── Timer Effect (During Live Recording or Pre-Recorded Playback) ──
  useEffect(() => {
    const shouldTick = (mode === 'live' && isRecording && !isPaused) || (mode === 'prerecorded' && isPrerecordedPlaying);
    if (!shouldTick) return;

    const timer = setInterval(() => {
      if (mode === 'prerecorded' && prerecordedVideoRef.current) {
        setElapsedSeconds(Math.floor(prerecordedVideoRef.current.currentTime || 0));
      } else {
        setElapsedSeconds(s => s + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, isRecording, isPaused, isPrerecordedPlaying]);

  // ── Fast Optical Telemetry Loop (Every 1.5s) ──
  useEffect(() => {
    const isStreamActive =
      (mode === 'live' && cameraStatus === 'ready' && aiWatchActive && !isPaused) ||
      (mode === 'prerecorded' && isPrerecordedPlaying && aiWatchActive);

    if (!isStreamActive) return;

    const interval = setInterval(() => {
      const videoEl = mode === 'live' ? liveVideoRef.current : prerecordedVideoRef.current;
      const canvasEl = hiddenCanvasRef.current;
      if (!videoEl || !canvasEl) return;

      const metrics = extractFrameOpticalMetrics(videoEl, canvasEl, prevGrayRef);
      if (metrics) {
        setOpticalMetrics({
          brightness: metrics.brightness,
          contrastScore: metrics.contrastScore,
          rednessRatio: metrics.rednessRatio,
          motionScore: metrics.motionScore
        });

        const immediateHazards = evaluateImmediateOpticalHazards(metrics, elapsedRef.current);
        if (immediateHazards.length > 0) {
          registerAlerts(immediateHazards);
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [mode, cameraStatus, aiWatchActive, isPaused, isPrerecordedPlaying, registerAlerts]);

  // ── Deep AI Frame Vision Analysis Function ──
  const runSingleFrameAnalysis = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    const videoEl = mode === 'live' ? liveVideoRef.current : prerecordedVideoRef.current;
    const canvasEl = hiddenCanvasRef.current;
    if (!videoEl || !canvasEl || videoEl.readyState < 2) return;

    isAnalyzingRef.current = true;
    setIsScanningFrame(true);

    try {
      const metrics = extractFrameOpticalMetrics(videoEl, canvasEl, prevGrayRef);
      frameCounterRef.current += 1;

      const activeProc = mode === 'prerecorded' && activePrerecordedVideo?.procedure_type
        ? activePrerecordedVideo.procedure_type
        : procedureType;

      const result = await analyzeLiveSurgeryFrame({
        imageBase64: metrics?.imageBase64 || '',
        procedureType: activeProc,
        elapsedSeconds: elapsedRef.current,
        frameIndex: frameCounterRef.current,
        surgeonName: caseMeta.surgeon_name || 'Attending Surgeon',
        sessionId: sessionIdRef.current,
        frameMetrics: metrics
          ? {
              brightness: metrics.brightness,
              contrastScore: metrics.contrastScore,
              rednessRatio: metrics.rednessRatio,
              motionScore: metrics.motionScore
            }
          : null
      });

      setLiveTelemetry(result);

      // Accumulate into session log
      const log = sessionLogRef.current;
      log.safetyScores.push(result.safety_score);
      log.efficiencyScores.push(result.efficiency_score);
      log.skillScores.push(result.skill_score);
      (result.instruments_detected || []).forEach(i => log.instrumentsSet.add(i));
      (result.anatomy_identified || []).forEach(a => log.anatomySet.add(a));

      if (result.phase) {
        const lastPhase = log.phasesObserved[log.phasesObserved.length - 1];
        if (!lastPhase || lastPhase.name !== result.phase) {
          if (lastPhase) lastPhase.end_time = result.timestamp;
          log.phasesObserved.push({
            name: result.phase,
            start_time: result.timestamp,
            end_time: result.timestamp,
            score: result.safety_score,
            notes: result.guidance_tip || result.scene_observed
          });
        } else {
          lastPhase.end_time = result.timestamp;
        }
      }

      if (Array.isArray(result.alerts) && result.alerts.length > 0) {
        registerAlerts(result.alerts);
      }
    } catch (err) {
      console.warn('[LiveSurgery] Frame scan error:', err);
    } finally {
      isAnalyzingRef.current = false;
      setIsScanningFrame(false);
    }
  }, [mode, procedureType, caseMeta.surgeon_name, activePrerecordedVideo, registerAlerts]);

  // ── Periodic Deep AI Frame Analysis Loop (Every 8s while active) ──
  useEffect(() => {
    const shouldAnalyze =
      (mode === 'live' && cameraStatus === 'ready' && aiWatchActive && !isPaused) ||
      (mode === 'prerecorded' && isPrerecordedPlaying && aiWatchActive);

    if (!shouldAnalyze) return;

    // Trigger an initial scan shortly after stream starts
    const initialTimeout = setTimeout(() => {
      runSingleFrameAnalysis();
    }, 1800);

    const interval = setInterval(() => {
      runSingleFrameAnalysis();
    }, 8000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [mode, cameraStatus, aiWatchActive, isPaused, isPrerecordedPlaying, runSingleFrameAnalysis]);

  // ── Start Live Surgery Recording (PC Camera -> MediaRecorder) ──
  const startLiveRecording = () => {
    if (!mediaStreamRef.current || cameraStatus !== 'ready') {
      toast({
        title: 'PC Camera Not Ready',
        description: 'Please ensure camera access is enabled before starting surgery recording.',
        variant: 'destructive'
      });
      return;
    }

    // Reset session accumulators
    recordedChunksRef.current = [];
    sessionIdRef.current = `live_${Date.now()}`;
    frameCounterRef.current = 0;
    sessionLogRef.current = {
      phasesObserved: [],
      instrumentsSet: new Set(),
      anatomySet: new Set(),
      safetyScores: [],
      efficiencyScores: [],
      skillScores: [],
      alerts: []
    };
    setRecordedBlobUrl(null);
    setRecordedFile(null);
    setCompletedSession(null);
    setAlertsFeed([]);
    setElapsedSeconds(0);
    setAiWatchActive(true);

    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    const selectedMime = mimeCandidates.find(m =>
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)
    ) || '';

    try {
      const recorder = selectedMime
        ? new MediaRecorder(mediaStreamRef.current, { mimeType: selectedMime })
        : new MediaRecorder(mediaStreamRef.current);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.start(1000); // Collect 1-second chunks reliably
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);

      toast({
        title: 'Live Surgery Recording & AI Watch Active',
        description: `Recording ${procedureType} from PC camera with real-time intraoperative risk alerts.`
      });

      // Kick off immediate frame check
      setTimeout(() => runSingleFrameAnalysis(), 600);
    } catch (err) {
      console.error('MediaRecorder start failed:', err);
      toast({
        title: 'Recording Failed to Start',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const togglePauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (rec.state === 'recording') {
      rec.pause();
      setIsPaused(true);
      toast({ title: 'Live Recording Paused' });
    } else if (rec.state === 'paused') {
      rec.resume();
      setIsPaused(false);
      toast({ title: 'Live Recording Resumed' });
    }
  };

  // ── Stop Live Recording, Compile Video & Save Clinical Audit Report ──
  const stopAndFinalizeLiveSurgery = async () => {
    setIsSavingSession(true);

    try {
      const rec = mediaRecorderRef.current;
      let mimeType = rec?.mimeType || 'video/webm';

      if (rec && rec.state !== 'inactive') {
        await new Promise((resolve) => {
          rec.onstop = resolve;
          rec.stop();
        });
      }

      setIsRecording(false);
      setIsPaused(false);

      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const blobUrl = blob.size > 0 ? URL.createObjectURL(blob) : '';
      const timestampLabel = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const autoTitle = caseMeta.title?.trim() || `Live ${procedureType} (${timestampLabel})`;
      const fileName = `live_surgery_${Date.now()}.${ext}`;
      const videoFile = blob.size > 0 ? new File([blob], fileName, { type: mimeType }) : null;

      if (blobUrl) setRecordedBlobUrl(blobUrl);
      if (videoFile) setRecordedFile(videoFile);

      const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Insert recorded live surgery into SurgeryVideo table
      const videoPayload = {
        title: autoTitle,
        procedure_type: procedureType,
        surgeon_name: caseMeta.surgeon_name || 'Attending Surgeon',
        patient_id: caseMeta.patient_id || `LIVE-${String(Date.now()).slice(-5)}`,
        surgery_date: todayStr,
        duration_minutes: durationMins,
        department: caseMeta.department || getProcedureProfile(procedureType).department,
        notes: caseMeta.notes
          ? `[Live Camera Stream] ${caseMeta.notes}`
          : `Recorded live via MediCast OR Camera Stream (${formatDuration(elapsedSeconds)}).`,
        video_url: blobUrl,
        status: 'analyzing'
      };

      const { data: savedVideo, error: vErr } = await supabase
        .from('SurgeryVideo')
        .insert([videoPayload])
        .select()
        .single();

      if (vErr) throw vErr;

      // Background upload to Supabase Storage if configured
      if (videoFile) {
        supabase.storage.from('videos').upload(fileName, videoFile).then(async ({ error: upErr }) => {
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
            if (urlData?.publicUrl) {
              await supabase.from('SurgeryVideo').update({ video_url: urlData.publicUrl }).eq('id', savedVideo.id);
            }
          }
        }).catch(() => {});
      }

      // 2. Compile comprehensive AnalysisResult incorporating all live alerts, phases & telemetry
      const log = sessionLogRef.current;
      const compiledAnalysis = await compileLiveSessionAnalysis(savedVideo, {
        alerts: log.alerts,
        phasesObserved: log.phasesObserved,
        instrumentsSet: Array.from(log.instrumentsSet),
        anatomySet: Array.from(log.anatomySet),
        safetyScores: log.safetyScores,
        efficiencyScores: log.efficiencyScores,
        skillScores: log.skillScores,
        durationSeconds: elapsedSeconds
      });

      const { data: savedAnalysis } = await supabase
        .from('AnalysisResult')
        .insert([{
          surgery_video_id: savedVideo.id,
          ...compiledAnalysis
        }])
        .select()
        .single();

      await supabase.from('SurgeryVideo').update({ status: 'analyzed' }).eq('id', savedVideo.id);

      setCompletedSession({
        videoRecord: { ...savedVideo, status: 'analyzed' },
        analysisRecord: savedAnalysis || compiledAnalysis
      });

      toast({
        title: 'Live Surgery Saved & Analyzed',
        description: 'Recorded video and post-operative clinical audit report are ready!'
      });
    } catch (err) {
      console.error('[LiveSurgery] Finalize error:', err);
      toast({
        title: 'Error Finalizing Session',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsSavingSession(false);
    }
  };

  // ── Download Recorded Camera Video File (.webm / .mp4) ──
  const handleDownloadRecordedVideo = () => {
    if (!recordedBlobUrl) return;
    const a = document.createElement('a');
    a.href = recordedBlobUrl;
    const ext = recordedFile?.name?.split('.').pop() || 'webm';
    const cleanName = (caseMeta.title || procedureType).replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `MediCast_Live_${cleanName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Download Word Audit Report (.docx) ──
  const handleDownloadAuditReport = async () => {
    if (!completedSession) return;
    try {
      await generateWordReport(completedSession.videoRecord, completedSession.analysisRecord);
      toast({ title: 'Clinical Audit Report (.docx) downloaded' });
    } catch (err) {
      toast({ title: 'Failed to generate Word report', description: err.message, variant: 'destructive' });
    }
  };

  // ── Pre-Recorded Video File Loader for Real-Time AI Monitor ──
  const handleLoadLocalPrerecordedFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAlertsFeed([]);
    setActiveBannerAlert(null);
    setElapsedSeconds(0);
    setCompletedSession(null);
    sessionLogRef.current = {
      phasesObserved: [],
      instrumentsSet: new Set(),
      anatomySet: new Set(),
      safetyScores: [],
      efficiencyScores: [],
      skillScores: [],
      alerts: []
    };
    setActivePrerecordedVideo({
      url,
      title: f.name.replace(/\.[^/.]+$/, ''),
      procedure_type: procedureType,
      file: f,
      dbVideo: null
    });
    toast({
      title: 'Pre-Recorded Surgery Loaded',
      description: `Press Play to watch "${f.name}" with live AI warnings & alerts, or save to registry.`
    });
  };

  const handleSelectSavedVideoForMonitor = (v) => {
    if (v.procedure_type && SURGICAL_PROCEDURES.includes(v.procedure_type)) {
      handleProcedureChange(v.procedure_type);
    }
    if (v.video_url && !v.video_url.startsWith('blob:')) {
      setAlertsFeed([]);
      setActiveBannerAlert(null);
      setElapsedSeconds(0);
      setActivePrerecordedVideo({
        url: v.video_url,
        title: v.title,
        procedure_type: v.procedure_type || procedureType,
        file: null,
        dbVideo: v
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(`/analysis/${v.id}`);
    }
  };

  const handleSaveAndAnalyzePrerecorded = async () => {
    if (!activePrerecordedVideo) return;
    if (activePrerecordedVideo.dbVideo) {
      navigate(`/analysis/${activePrerecordedVideo.dbVideo.id}`);
      return;
    }

    setIsSavingSession(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: videoRec, error: insErr } = await supabase
        .from('SurgeryVideo')
        .insert([{
          title: caseMeta.title?.trim() || activePrerecordedVideo.title || `${procedureType} Case`,
          procedure_type: procedureType,
          surgeon_name: caseMeta.surgeon_name || 'Attending Surgeon',
          patient_id: caseMeta.patient_id || `PR-${String(Date.now()).slice(-5)}`,
          surgery_date: todayStr,
          duration_minutes: Math.max(1, Math.round((prerecordedVideoRef.current?.duration || elapsedSeconds || 60) / 60)),
          department: caseMeta.department || getProcedureProfile(procedureType).department,
          notes: caseMeta.notes || 'Analyzed via Pre-Recorded Surgical Video Stream.',
          video_url: activePrerecordedVideo.url,
          status: 'analyzed'
        }])
        .select()
        .single();

      if (insErr) throw insErr;

      const log = sessionLogRef.current;
      const compiled = await compileLiveSessionAnalysis(videoRec, {
        alerts: log.alerts,
        phasesObserved: log.phasesObserved,
        instrumentsSet: Array.from(log.instrumentsSet),
        anatomySet: Array.from(log.anatomySet),
        safetyScores: log.safetyScores,
        efficiencyScores: log.efficiencyScores,
        skillScores: log.skillScores,
        durationSeconds: elapsedSeconds || 60
      });

      const { data: analysisRec } = await supabase
        .from('AnalysisResult')
        .insert([{ surgery_video_id: videoRec.id, ...compiled }])
        .select()
        .single();

      setCompletedSession({
        videoRecord: videoRec,
        analysisRecord: analysisRec || compiled
      });

      toast({ title: 'Pre-Recorded Analysis Saved', description: 'Full clinical report generated!' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingSession(false);
    }
  };

  const filteredSavedVideos = savedVideos.filter(v => {
    if (prerecordedFilter === 'all') return true;
    return (v.procedure_type || '').toLowerCase() === prerecordedFilter.toLowerCase();
  });

  const currentRiskStyle = severityStyles[liveTelemetry.risk_level] || severityStyles.low;

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hidden offscreen canvas for <1ms optical telemetry & frame capture */}
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* ── Top Header & Seamless Mode Switcher ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-heading">
              {mode === 'live' ? 'Live Surgical Vision & Camera Stream' : 'Pre-Recorded Surgical Video Studio'}
            </h1>
            {mode === 'live' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <span className={`w-2 h-2 rounded-full ${cameraStatus === 'ready' ? 'bg-red-600 animate-ping' : 'bg-stone-400'}`} />
                {isRecording ? 'RECORDING LIVE SURGERY' : cameraStatus === 'ready' ? 'PC CAMERA ACTIVE' : 'CAMERA STANDBY'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                <Film className="w-3.5 h-3.5 text-teal-600" />
                PRE-RECORDED MODE
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            {mode === 'live'
              ? 'Real-time PC camera capture, continuous intraoperative AI risk warnings, anatomical plane tracking & live recording'
              : 'Continue watching, uploading, or analyzing pre-recorded surgical videos across all surgical procedures'}
          </p>
        </div>

        {/* Segmented Mode Switcher: Live Surgery vs Pre-Recorded Videos */}
        <div className="inline-flex p-1 rounded-2xl bg-stone-200/75 border border-stone-300/60 self-start lg:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => switchOperatingMode('live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === 'live'
                ? 'bg-white text-teal-800 shadow-sm border border-teal-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Radio className={`w-4 h-4 ${mode === 'live' ? 'text-red-500 animate-pulse' : 'text-stone-400'}`} />
            <span>Live Surgery (PC Camera)</span>
          </button>
          <button
            type="button"
            onClick={() => switchOperatingMode('prerecorded')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === 'prerecorded'
                ? 'bg-white text-teal-800 shadow-sm border border-teal-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Video className={`w-4 h-4 ${mode === 'prerecorded' ? 'text-teal-600' : 'text-stone-400'}`} />
            <span>Pre-Recorded Videos</span>
          </button>
        </div>
      </div>

      {/* ── Procedure & OR Configuration Control Bar ── */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
            {/* Surgical Procedure Selector */}
            <div>
              <Label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Surgical Procedure
              </Label>
              <Select value={procedureType} onValueChange={handleProcedureChange}>
                <SelectTrigger className="mt-1 bg-stone-50/70 border-stone-200 font-medium text-xs sm:text-sm">
                  <SelectValue placeholder="Select surgical procedure" />
                </SelectTrigger>
                <SelectContent>
                  {SURGICAL_PROCEDURES.map(proc => (
                    <SelectItem key={proc} value={proc}>{proc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Camera Input Device Selector (Live Mode) or Video Source Action (Pre-Recorded Mode) */}
            {mode === 'live' ? (
              <div>
                <Label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  Camera Source (PC / Scope)
                </Label>
                <Select
                  value={selectedDeviceId || 'default'}
                  onValueChange={(val) => handleDeviceChange(val === 'default' ? '' : val)}
                  disabled={isRecording}
                >
                  <SelectTrigger className="mt-1 bg-stone-50/70 border-stone-200 text-xs sm:text-sm">
                    <SelectValue placeholder="Default PC Camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {videoDevices.length === 0 ? (
                      <SelectItem value="default">Default PC Camera</SelectItem>
                    ) : (
                      videoDevices.map((dev, idx) => (
                        <SelectItem key={dev.deviceId || idx} value={dev.deviceId || 'default'}>
                          {dev.label || `Camera Input ${idx + 1}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  Load Pre-Recorded Video File
                </Label>
                <label className="mt-1 flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-teal-300 bg-teal-50/60 hover:bg-teal-100/70 text-teal-800 text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{activePrerecordedVideo ? 'Change Video File' : 'Select Surgical Video (.mp4/.mov)'}</span>
                  <input type="file" accept="video/*" onChange={handleLoadLocalPrerecordedFile} className="hidden" />
                </label>
              </div>
            )}

            {/* Attending Surgeon Quick Input */}
            <div>
              <Label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Attending Surgeon
              </Label>
              <Input
                value={caseMeta.surgeon_name}
                onChange={e => setCaseMeta(m => ({ ...m, surgeon_name: e.target.value }))}
                placeholder="e.g. Dr. Sarah Chen"
                className="mt-1 h-9 bg-stone-50/70 border-stone-200 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAudioAlertsEnabled(a => !a)}
              className={`text-xs gap-1.5 ${audioAlertsEnabled ? 'border-teal-300 bg-teal-50 text-teal-800' : 'text-stone-500'}`}
              title="Toggle voice & acoustic clinical warnings"
            >
              {audioAlertsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{audioAlertsEnabled ? 'Voice Alerts On' : 'Muted'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHudVisible(h => !h)}
              className={`text-xs gap-1.5 ${hudVisible ? 'border-stone-300 bg-stone-100 text-stone-800' : 'text-stone-500'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>HUD {hudVisible ? 'On' : 'Off'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCaseConfig(c => !c)}
              className="text-xs gap-1.5 border-stone-200 text-stone-700"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Case Details</span>
            </Button>
          </div>
        </div>

        {/* Collapsible Extended Case Details */}
        {showCaseConfig && (
          <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-stone-500">Case Title</Label>
              <Input
                value={caseMeta.title}
                onChange={e => setCaseMeta(m => ({ ...m, title: e.target.value }))}
                placeholder={`Live ${procedureType}`}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-stone-500">Patient ID (Anonymized)</Label>
              <Input
                value={caseMeta.patient_id}
                onChange={e => setCaseMeta(m => ({ ...m, patient_id: e.target.value }))}
                placeholder="PT-00492"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-stone-500">Department</Label>
              <Select
                value={caseMeta.department}
                onValueChange={v => setCaseMeta(m => ({ ...m, department: v }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SURGICAL_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-stone-500">Operative Notes</Label>
              <Input
                value={caseMeta.notes}
                onChange={e => setCaseMeta(m => ({ ...m, notes: e.target.value }))}
                placeholder="Optional clinical context..."
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Completed Session Banner (Download Recorded Video & Word Audit Report) ── */}
      {completedSession && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-950 font-heading">
                Surgical Session Recorded & Clinical Telemetry Verified
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                <strong>{completedSession.videoRecord.title}</strong> • Overall Score:{' '}
                <strong>{completedSession.analysisRecord.overall_score}%</strong> • Safety:{' '}
                <strong>{completedSession.analysisRecord.safety_score}%</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {recordedBlobUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadRecordedVideo}
                className="border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Save Video Recording
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadAuditReport}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Download Report (.docx)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(`/analysis/${completedSession.videoRecord.id}`, {
                  state: recordedFile ? { localVideoFile: recordedFile } : undefined
                })
              }
              className="border-teal-300 bg-white text-teal-800 hover:bg-teal-50 text-xs font-semibold"
            >
              <span>Open Full Analysis</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Surgical Monitor + Real-Time AI Warnings & Telemetry Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Surgical Video / Live Camera Monitor + Action Bar */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video shadow-xl ring-1 ring-stone-900/15 flex items-center justify-center">
            {mode === 'live' ? (
              <>
                {/* Live PC Camera Video Feed */}
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-transform ${
                    mirrorCamera ? 'scale-x-[-1]' : ''
                  } ${cameraStatus === 'ready' ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Camera Initializing Overlay */}
                {cameraStatus === 'initializing' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-950/90 p-6 text-center">
                    <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-3" />
                    <p className="text-sm font-semibold">Activating PC Surgical Camera Stream...</p>
                    <p className="text-xs text-slate-400 mt-1">Grant browser camera permission if prompted</p>
                  </div>
                )}

                {/* Camera Error / Permission Unlock Guide Overlay */}
                {cameraStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-950/95 p-5 sm:p-6 text-center max-w-lg mx-auto">
                    <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mb-2.5">
                      <CameraOff className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold">Enable PC Camera Access</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{cameraError}</p>

                    {cameraErrorKind === 'browser' && (
                      <div className="mt-3 w-full rounded-xl bg-slate-900/90 border border-slate-700/80 p-3 text-left text-xs text-slate-200 space-y-1.5">
                        <p className="font-semibold text-teal-300">How to unlock in Chrome / Edge (takes 5 seconds):</p>
                        <p>1. Click the <strong>Site Settings sliders icon</strong> on the left side of the URL address bar.</p>
                        <p>2. Switch <strong>Camera</strong> to <strong>On / Allow</strong> — your camera feed will start automatically!</p>
                      </div>
                    )}

                    {cameraErrorKind === 'system' && (
                      <div className="mt-3 w-full rounded-xl bg-slate-900/90 border border-slate-700/80 p-3 text-left text-xs text-slate-200 space-y-1.5">
                        <p className="font-semibold text-amber-300">Blocked by Windows Privacy Settings:</p>
                        <p>Open <strong>Windows Settings → Privacy &amp; security → Camera</strong> and turn ON <strong>Camera access</strong> &amp; <strong>Let desktop apps access your camera</strong>, then click Retry below.</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => startCameraStream()}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Retry PC Camera
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={startVirtualScopeStream}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Use Virtual Surgical Scope
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => switchOperatingMode('prerecorded')}
                        className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs"
                      >
                        <Video className="w-3.5 h-3.5 mr-1.5" />
                        Pre-Recorded Videos
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Pre-Recorded Video Monitor */
              activePrerecordedVideo ? (
                <video
                  ref={prerecordedVideoRef}
                  src={activePrerecordedVideo.url}
                  controls
                  onPlay={() => setIsPrerecordedPlaying(true)}
                  onPause={() => setIsPrerecordedPlaying(false)}
                  onEnded={() => setIsPrerecordedPlaying(false)}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 text-white max-w-md">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center mb-3">
                    <Film className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-semibold">Pre-Recorded Surgical Video Mode</h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Load any pre-recorded surgical video for <strong>{procedureType}</strong> to watch with real-time AI alerts, upload a new case, or select an existing surgery from your registry below.
                  </p>
                  <div className="flex items-center gap-2.5 mt-5 flex-wrap justify-center">
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer shadow-md transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Load Video into AI Monitor</span>
                      <input type="file" accept="video/*" onChange={handleLoadLocalPrerecordedFile} className="hidden" />
                    </label>
                    <Link to="/upload">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs rounded-xl"
                      >
                        Standard Upload Form
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            )}

            {/* ── Augmented Surgical Vision HUD Overlays ── */}
            {hudVisible && ((mode === 'live' && cameraStatus === 'ready') || (mode === 'prerecorded' && activePrerecordedVideo)) && (
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3.5 sm:p-4">
                {/* Top HUD Row */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {mode === 'live' && isRecording ? (
                      <div className="px-2.5 py-1 rounded-full bg-red-600/95 text-white text-[11px] font-bold tracking-wider flex items-center gap-1.5 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>{isPaused ? 'PAUSED' : 'REC'} {formatDuration(elapsedSeconds)}</span>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-teal-300 border border-teal-500/30 text-[11px] font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                        <span>{mode === 'live' ? 'LIVE CAMERA FEED' : `PLAYBACK ${formatDuration(elapsedSeconds)}`}</span>
                      </div>
                    )}

                    <div className="px-2.5 py-1 rounded-full bg-slate-900/75 backdrop-blur-md text-white border border-white/15 text-[11px] font-medium">
                      {mode === 'prerecorded' && activePrerecordedVideo?.procedure_type
                        ? activePrerecordedVideo.procedure_type
                        : procedureType}
                    </div>

                    <div className="hidden sm:flex px-2.5 py-1 rounded-full bg-teal-950/80 backdrop-blur-md text-teal-200 border border-teal-400/30 text-[11px] font-medium items-center gap-1.5">
                      <Layers className="w-3 h-3 text-teal-400" />
                      <span className="truncate max-w-[220px]">{liveTelemetry.phase}</span>
                    </div>
                  </div>

                  {/* Top Right Safety & Risk HUD */}
                  <div className="flex items-center gap-2">
                    {isScanningFrame && (
                      <div className="px-2.5 py-1 rounded-full bg-cyan-950/85 text-cyan-200 border border-cyan-400/40 text-[10px] font-semibold flex items-center gap-1">
                        <ScanLine className="w-3 h-3 animate-pulse text-cyan-300" />
                        <span>AI Scanning...</span>
                      </div>
                    )}
                    <div className="px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-white border border-white/15 text-[11px] font-semibold">
                      Safety: <span className="text-emerald-400">{liveTelemetry.safety_score}%</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${currentRiskStyle.badge}`}>
                      {liveTelemetry.risk_level} Risk
                    </div>
                  </div>
                </div>

                {/* Subtle Augmented Surgical Safe-Corridor Reticle */}
                <div className="relative mx-auto w-3/5 h-3/5 border border-teal-400/20 rounded-2xl flex items-center justify-center">
                  <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-teal-400/70 rounded-tl" />
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-teal-400/70 rounded-tr" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-teal-400/70 rounded-bl" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-teal-400/70 rounded-br" />
                </div>

                {/* Bottom HUD Alert Overlay + Optical Telemetry Strip */}
                <div className="space-y-2">
                  {activeBannerAlert && (
                    <div
                      className={`pointer-events-auto rounded-xl border px-3.5 py-2.5 backdrop-blur-md shadow-xl flex items-start justify-between gap-3 ${
                        (severityStyles[activeBannerAlert.severity] || severityStyles.low).hud
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300 animate-bounce" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20">
                              {activeBannerAlert.severity} ALERT • {activeBannerAlert.timestamp}
                            </span>
                            <span className="text-xs font-bold truncate">{activeBannerAlert.title}</span>
                          </div>
                          <p className="text-xs text-white/90 mt-0.5 line-clamp-2">{activeBannerAlert.description}</p>
                          {activeBannerAlert.recommendation && (
                            <p className="text-[11px] text-teal-200 mt-0.5 font-medium">
                              → Mitigation: {activeBannerAlert.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveBannerAlert(null)}
                        className="p-1 rounded-lg hover:bg-white/15 text-white/70 hover:text-white shrink-0"
                        title="Acknowledge alert"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Optical Sensor Bar */}
                  <div className="hidden sm:flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/10 text-[11px] text-slate-300">
                    <span>Illumination: <strong className="text-white">{opticalMetrics.brightness}%</strong></span>
                    <span>Vascular / Redness: <strong className={opticalMetrics.rednessRatio >= 45 ? 'text-red-400' : 'text-emerald-400'}>{opticalMetrics.rednessRatio}%</strong></span>
                    <span>Motion Velocity: <strong className={opticalMetrics.motionScore >= 50 ? 'text-amber-400' : 'text-teal-300'}>{opticalMetrics.motionScore}%</strong></span>
                    <span>Optical Contrast: <strong className="text-white">{opticalMetrics.contrastScore}%</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Primary Controls Bar Beneath Surgical Monitor ── */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {mode === 'live' ? (
              <>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {!isRecording ? (
                    <Button
                      type="button"
                      onClick={startLiveRecording}
                      disabled={cameraStatus !== 'ready' || isSavingSession}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm gap-2 px-5"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Recording Live Surgery</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={togglePauseRecording}
                        className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold gap-1.5"
                      >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        <span>{isPaused ? 'Resume' : 'Pause'}</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={stopAndFinalizeLiveSurgery}
                        disabled={isSavingSession}
                        className="bg-teal-700 hover:bg-teal-800 text-white font-semibold shadow-sm gap-1.5 px-5"
                      >
                        {isSavingSession ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Compiling Audit...</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>End Surgery & Generate Report</span>
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {isVirtualScope && !isRecording && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startCameraStream()}
                      className="text-xs gap-1.5 border-teal-300 bg-teal-50 text-teal-800"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Switch to Real PC Camera</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleMic}
                    disabled={isRecording}
                    className="text-xs gap-1.5 border-stone-200"
                    title="Include OR microphone audio in recording"
                  >
                    {micEnabled ? <Mic className="w-3.5 h-3.5 text-teal-600" /> : <MicOff className="w-3.5 h-3.5 text-stone-400" />}
                    <span>{micEnabled ? 'Mic On' : 'Mic Off'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMirrorCamera(m => !m)}
                    className="text-xs gap-1.5 border-stone-200"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span>Mirror</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAiWatchActive(w => !w)}
                    className={`text-xs font-semibold gap-1.5 ${
                      aiWatchActive ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-stone-200 text-stone-500'
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>{aiWatchActive ? 'AI Watch Active' : 'AI Watch Paused'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={cameraStatus !== 'ready' || isScanningFrame}
                    onClick={runSingleFrameAnalysis}
                    className="text-xs gap-1.5 border-stone-200"
                  >
                    <ScanLine className={`w-3.5 h-3.5 ${isScanningFrame ? 'animate-spin text-teal-600' : ''}`} />
                    <span>Scan Frame Now</span>
                  </Button>
                </div>
              </>
            ) : (
              /* Pre-Recorded Monitor Controls */
              <div className="flex items-center justify-between w-full flex-wrap gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {activePrerecordedVideo && (
                    <Button
                      type="button"
                      onClick={handleSaveAndAnalyzePrerecorded}
                      disabled={isSavingSession}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5"
                    >
                      {isSavingSession ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Full Audit...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {activePrerecordedVideo.dbVideo
                              ? 'Open Full Case Analysis'
                              : 'Save & Generate Full Clinical Report'}
                          </span>
                        </>
                      )}
                    </Button>
                  )}

                  <Link to="/upload">
                    <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5 border-stone-200">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload New Pre-Recorded Case</span>
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!activePrerecordedVideo || isScanningFrame}
                    onClick={runSingleFrameAnalysis}
                    className="text-xs gap-1.5 border-stone-200"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Scan Current Video Frame</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => switchOperatingMode('live')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Switch to Live Camera</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Real-Time Anatomical Plane, Phase & Instrument Telemetry Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Anatomical Planes & Scene
                  </h3>
                </div>
                <span className="text-[10px] font-medium text-stone-400">{liveTelemetry.engine}</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                {liveTelemetry.scene_observed}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(liveTelemetry.anatomy_identified || []).map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200/70"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Instruments & AI Guidance
                  </h3>
                </div>
                <span className="text-xs font-bold text-teal-700">Skill {liveTelemetry.skill_score}%</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed bg-blue-50/50 rounded-xl p-2.5 border border-blue-100/80">
                <strong className="text-blue-900">Coaching Tip:</strong> {liveTelemetry.guidance_tip}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(liveTelemetry.instruments_detected || []).map((inst, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Live Intraoperative Warnings, Alerts & Safety Feed */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs flex flex-col h-full max-h-[680px]">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900 font-heading">
                  Live Warnings & Alerts
                </h2>
                <p className="text-[11px] text-stone-500">
                  Real-time hazard & plane telemetry
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
              {alertsFeed.length}
            </span>
          </div>

          {/* Live Score Mini Strip */}
          <div className="grid grid-cols-3 gap-2 my-3 shrink-0">
            <div className="rounded-xl bg-stone-50 border border-stone-200/70 p-2.5 text-center">
              <p className="text-[10px] text-stone-500 uppercase font-semibold">Safety</p>
              <p className="text-base font-bold text-emerald-700 font-heading">{liveTelemetry.safety_score}%</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-200/70 p-2.5 text-center">
              <p className="text-[10px] text-stone-500 uppercase font-semibold">Skill</p>
              <p className="text-base font-bold text-indigo-700 font-heading">{liveTelemetry.skill_score}%</p>
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-200/70 p-2.5 text-center">
              <p className="text-[10px] text-stone-500 uppercase font-semibold">Efficiency</p>
              <p className="text-base font-bold text-teal-700 font-heading">{liveTelemetry.efficiency_score}%</p>
            </div>
          </div>

          {/* Scrolling Alerts Stream */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[280px]">
            {alertsFeed.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
                <ShieldCheck className="w-9 h-9 text-teal-500/70 mb-2" />
                <p className="text-xs font-semibold text-stone-700">
                  Monitoring Intraoperative Safety Corridors
                </p>
                <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                  Real-time warnings for bleeding chromaticity, vital structure proximity, lens fogging, and motion spikes appear here automatically.
                </p>
              </div>
            ) : (
              alertsFeed.map((alertItem, idx) => {
                const st = severityStyles[alertItem.severity] || severityStyles.low;
                return (
                  <div
                    key={alertItem.id || idx}
                    className={`rounded-xl border p-3 transition-all ${st.card}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${st.badge}`}>
                        {alertItem.severity}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500">
                        {alertItem.timestamp} • {alertItem.source || 'AI Vision'}
                      </span>
                    </div>
                    <p className="text-xs font-bold">{alertItem.title}</p>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{alertItem.description}</p>
                    {alertItem.recommendation && (
                      <p className="text-[11px] font-medium mt-1.5 pt-1.5 border-t border-black/10">
                        → {alertItem.recommendation}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Pre-Recorded Surgical Procedures Library Section (When in Pre-Recorded Mode) ── */}
      {mode === 'prerecorded' && (
        <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-heading">
                Continue with Pre-Recorded Surgical Procedures
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Select any recorded surgical procedure to continue AI analysis, review performance scores, or download reports
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={prerecordedFilter} onValueChange={setPrerecordedFilter}>
                <SelectTrigger className="w-56 h-9 text-xs bg-stone-50 border-stone-200">
                  <SelectValue placeholder="Filter by surgical procedure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Surgical Procedures ({savedVideos.length})</SelectItem>
                  {SURGICAL_PROCEDURES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Link to="/upload">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload New Video</span>
                </Button>
              </Link>
            </div>
          </div>

          {loadingSaved ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
            </div>
          ) : filteredSavedVideos.length === 0 ? (
            <div className="py-10 text-center rounded-2xl bg-[#FAF8F5] border border-stone-200 p-6">
              <Video className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-800">No pre-recorded surgical videos found for this filter</p>
              <p className="text-xs text-stone-500 mt-1">
                Upload a pre-recorded surgical video above or switch to Live Surgery mode to record from your PC camera.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSavedVideos.map(v => {
                const a = savedAnalysesMap[v.id];
                return (
                  <div
                    key={v.id}
                    className="p-4 rounded-2xl border border-stone-200/90 hover:border-teal-300 bg-stone-50/40 hover:bg-white transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-stone-900 truncate">{v.title}</h4>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/70">
                          {v.procedure_type}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        {v.surgeon_name || 'Attending Surgeon'}
                        {v.duration_minutes ? ` • ${v.duration_minutes} min` : ''}
                        {a?.overall_score ? ` • Score: ${a.overall_score}%` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {v.video_url && !v.video_url.startsWith('blob:') && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectSavedVideoForMonitor(v)}
                          className="text-xs h-8 border-stone-200"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Monitor
                        </Button>
                      )}
                      <Link to={`/analysis/${v.id}`}>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
