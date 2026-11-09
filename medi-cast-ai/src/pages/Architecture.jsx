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
  ArrowDown,
  Activity,
  Eye,
  Volume2,
  Sparkles,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Architecture() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 w-full overflow-x-hidden">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <img
            src="/medicast-logo.png"
            alt="Medicast AI"
            className="h-11 w-auto object-contain rounded-xl bg-white p-1 border border-stone-200/80 shadow-2xs"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-heading">
              Operating Room System Architecture
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              End-to-end intraoperative pipeline: Camera → Operating Bed → Medicast AI Interface → Wall Screen & Clinical Report
            </p>
          </div>
        </div>

        <Link to="/live">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl gap-2 shadow-xs">
            <Radio className="w-4 h-4" />
            <span>Open Live Surgery</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* ── Interactive Architectural Blueprint (Built as Native UI Components, Not an Image) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 5 Columns: Physical OR Capture & Edge Processing Flow */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          {/* 1. Camera Node */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                1. Camera
              </span>
              <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                1080p / 30fps UVC
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Overhead OR Camera / Surgical Laparoscope
              </h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Mounted above the operating bed or connected via laparoscopic HDMI-to-USB capture card. Streams live video frames directly into the workstation.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-[#FAF8F5] border border-stone-200/80 rounded-xl p-2 text-center">
                <span className="text-stone-500 block">Input</span>
                <strong className="text-stone-800">USB / HDMI</strong>
              </div>
              <div className="bg-[#FAF8F5] border border-stone-200/80 rounded-xl p-2 text-center">
                <span className="text-stone-500 block">Optical Check</span>
                <strong className="text-stone-800">Every 1.5s</strong>
              </div>
              <div className="bg-[#FAF8F5] border border-stone-200/80 rounded-xl p-2 text-center">
                <span className="text-stone-500 block">Vision Scan</span>
                <strong className="text-stone-800">Every 7s</strong>
              </div>
            </div>
          </div>

          {/* Optical Cone Connector */}
          <div className="flex items-center justify-center py-0.5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 text-stone-600 text-[11px] font-semibold">
              <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
              <span>Continuous Optical Field of View</span>
            </div>
          </div>

          {/* 2. Operating Bed (with Patient) Node */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold">
                <Eye className="w-3.5 h-3.5 text-cyan-600" />
                2. Operating Bed (with Patient)
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Sterile Zone
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Sterile Surgical Field & Instrument Tray
              </h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Non-invasive optical tracking of the operative incision, tissue dissection planes, surgeon glove hygiene, and instrument tray perimeter.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Tissue Planes', 'Sterile Drape Boundary', 'Instrument Trajectory', 'Vascular Perfusion'].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-stone-200/80 text-[11px] font-medium text-stone-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stream Connector */}
          <div className="flex items-center justify-center py-0.5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 text-stone-600 text-[11px] font-semibold">
              <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
              <span>Real-Time Frame Buffer (480×270 Base64 + RGBA)</span>
            </div>
          </div>

          {/* 3. Medicast AI (Processing & Analysis Interface) */}
          <div className="bg-white rounded-2xl border-2 border-teal-500/40 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold">
                <Cpu className="w-3.5 h-3.5" />
                3. Medicast AI (Processing & Analysis Interface)
              </span>
              <Activity className="w-4 h-4 text-teal-600" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Dual-Engine Surgical Intelligence Workstation
              </h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Processes live video frames locally for sub-millisecond optical hazards and via multimodal AI vision for anatomy, phase, and sterility verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-stone-200/90">
                <span className="font-bold text-stone-900 block">Optical Sensor (&lt;1ms)</span>
                <span className="text-[11px] text-stone-600">
                  Luminance, contrast, red-spectrum hemorrhage & motion velocity
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-stone-200/90">
                <span className="font-bold text-stone-900 block">Vision AI (Qwen3.8-27B)</span>
                <span className="text-[11px] text-stone-600">
                  Sterile field check, anatomy recognition & clinical report synthesis
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Columns: 4. Wall Screen (Real-time Monitoring & Alerts) + 5. Final Clinical Report */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-between space-y-5">
            {/* Wall Screen Top Header */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-stone-900 font-heading">
                      4. Wall Screen (Real-time Monitoring & Alerts)
                    </h2>
                  </div>
                  <p className="text-xs text-stone-500">
                    Heads-up Operating Room display synchronized with the Medicast AI workstation
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                LIVE OR FEED
              </span>
            </div>

            {/* Top Split: Live Stream Box + Alert Warning Card */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Live Feed Representation */}
              <div className="sm:col-span-6 bg-[#FAF8F5] rounded-2xl border border-stone-200/90 p-4 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="flex items-center justify-between z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-[11px] font-medium text-stone-600 bg-white/90 px-2 py-0.5 rounded-md border border-stone-200">
                    Active Dissection
                  </span>
                </div>

                <div className="my-3 border border-dashed border-teal-600/40 rounded-xl p-3 bg-white/70 text-center space-y-1">
                  <Camera className="w-6 h-6 text-teal-600 mx-auto" />
                  <p className="text-xs font-bold text-stone-800">Live Surgical Stream</p>
                  <p className="text-[11px] text-stone-500">
                    Real-time anatomical corridor & instrument tracking
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-stone-500 font-medium">
                  <span>Illumination: 88%</span>
                  <span>Contrast: 92%</span>
                  <span>Latency: &lt;14ms</span>
                </div>
              </div>

              {/* High-Visibility ALERT! Card */}
              <div className="sm:col-span-6 bg-red-50/90 rounded-2xl border-2 border-red-300 p-4 flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-red-600 text-white shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-red-700 block">
                      ⚠️ ALERT!
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-red-950 mt-0.5">
                      Instrument Not Sterile
                    </h3>
                    <p className="text-xs text-red-800 mt-1 leading-relaxed">
                      Immediate visual & acoustic warning when an unsterile instrument or perimeter breach is detected.
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-red-200/80 flex items-center justify-between text-[11px] text-red-800 font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    Voice + Acoustic Alarm
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-red-200 text-red-700">
                    Auto-Logged
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Row: Safety Status + 96% Surgery Accuracy + OR Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Safety Status */}
              <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200/90 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-emerald-700 stroke-[3]" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Safety Status
                  </span>
                  <span className="text-base font-bold text-stone-900">Mostly OK</span>
                  <span className="text-[11px] text-emerald-700 font-semibold block">98% Compliance</span>
                </div>
              </div>

              {/* 96% Surgery Accuracy Gauge */}
              <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200/90 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Precision
                  </span>
                  <span className="text-sm font-bold text-stone-900">Surgery Accuracy</span>
                  <span className="text-[11px] text-teal-700 font-semibold block">Vision Verified</span>
                </div>
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-stone-200"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-teal-600"
                      strokeDasharray="96, 100"
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-xs font-extrabold text-stone-900">96%</span>
                </div>
              </div>

              {/* OR Checklist */}
              <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200/90 p-4 space-y-2">
                {['Hand Hygiene', 'Sterile Field', 'Vital Signs OK'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Section: 5. Clinical Report (Auto-Generated) */}
            <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200/90 overflow-hidden">
              <div className="bg-stone-100/80 px-4 py-2.5 border-b border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-700" />
                  <span className="text-xs sm:text-sm font-bold text-stone-900">
                    5. Clinical Report (Auto-Generated)
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  Final Clinical Report (.docx)
                </span>
              </div>

              <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-stone-500 block">Procedure</span>
                  <strong className="text-stone-900">Laparoscopic Appendectomy</strong>
                </div>
                <div>
                  <span className="text-stone-500 block">Duration</span>
                  <strong className="text-stone-900">1h 12min</strong>
                </div>
                <div>
                  <span className="text-stone-500 block">Safety Compliance</span>
                  <strong className="text-emerald-700">98%</strong>
                </div>
                <div>
                  <span className="text-stone-500 block">Alerts</span>
                  <strong className="text-amber-700">1 (Resolved)</strong>
                </div>
                <div>
                  <span className="text-stone-500 block">Outcome</span>
                  <strong className="text-emerald-700 inline-flex items-center gap-1">
                    Successful <CheckCircle2 className="w-3.5 h-3.5" />
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Tagline Banner ── */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-stone-900">
            Medicast AI — Watch • Warn • Report — For a Safer, Smarter Surgery
          </span>
        </div>

        <Link to="/live">
          <Button variant="outline" size="sm" className="border-stone-200 text-stone-700 hover:bg-stone-100 text-xs rounded-xl gap-1.5">
            <span>Go to Live Surgery Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

