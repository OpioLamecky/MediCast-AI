import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Mail, ArrowLeft, Loader2, Check } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl border border-stone-200/90 p-6 sm:p-7 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center mx-auto shadow-md shadow-teal-700/20 text-white">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-heading">
            Reset Password
          </h1>
          <p className="text-xs text-stone-500">
            MediCast Surgical Intelligence
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              If an account exists for <strong className="text-stone-800">{email}</strong>, a recovery link has been dispatched.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="surgeon@hospital.org"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:border-teal-600 transition-colors"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Recovery Link</span>}
            </button>
          </form>
        )}

        <div className="text-center pt-1 border-t border-stone-100 text-xs">
          <Link to="/login" className="text-stone-500 hover:text-teal-700 font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-stone-400 mt-4 text-center">
        © 2026 MediCast AI • Secure Intraoperative Portal
      </p>
    </div>
  );
}
