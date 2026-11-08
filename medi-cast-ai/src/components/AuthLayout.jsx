import React from "react";
import { Activity, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF8F5] px-4 py-8 relative overflow-x-hidden selection:bg-teal-500 selection:text-white">
      {/* Background Subtle Surgical Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.035] pointer-events-none" />

      {/* Top Brand Nav */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between z-10">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-700 flex items-center justify-center shadow-md shadow-teal-700/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 font-heading">MediCast</span>
            <span className="text-[10px] text-teal-600 font-extrabold tracking-widest uppercase block -mt-1">Surgical AI</span>
          </div>
        </Link>

        {/* Security Status Indicator */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>TLS 1.3 Verified</span>
        </div>
      </div>

      {/* Main Auth Card Container */}
      <div className="w-full max-w-md mx-auto my-auto py-6 z-10">
        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-200/90 overflow-hidden">
          {/* Card Clinical Header Strip */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-teal-300" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-heading">{title}</h1>
                {subtitle && <p className="text-xs text-teal-100/80 mt-0.5 leading-relaxed">{subtitle}</p>}
              </div>
            </div>
          </div>

          {/* Form Children */}
          <div className="p-6 sm:p-7 space-y-5">
            {children}
          </div>

          {/* Institutional Security Notice Inside Card */}
          <div className="bg-stone-50/80 px-6 py-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-teal-600" />
              <span>256-Bit Encrypted Workstation</span>
            </div>
            <span className="font-medium text-stone-400">HIPAA Compliant</span>
          </div>
        </div>

        {footer && (
          <div className="text-center text-xs text-stone-600 mt-5 leading-relaxed">
            {footer}
          </div>
        )}
      </div>

      {/* Bottom Legal & Accreditation Strip */}
      <div className="w-full max-w-md mx-auto text-center text-[11px] text-stone-400 py-2 z-10 flex items-center justify-center gap-3 flex-wrap">
        <span>© 2026 MediCast AI</span>
        <span>•</span>
        <span>Intraoperative Surgical Intelligence</span>
        <span>•</span>
        <Link to="/subscription" className="hover:text-teal-700 underline underline-offset-2">Pricing & Tiers</Link>
      </div>
    </div>
  );
}
