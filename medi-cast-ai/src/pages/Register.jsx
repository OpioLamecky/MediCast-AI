import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Mail, Lock, Eye, EyeOff, Loader2, Check } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Google Account Chooser State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);

  // ── Execute Google Registration / Sign In ──
  const authenticateWithGoogle = (name, userEmail) => {
    setLoading(true);
    setShowGoogleModal(false);

    const googleUser = {
      id: 'google_' + Date.now(),
      email: userEmail,
      name: name,
      role: 'surgeon',
      provider: 'google',
      avatar_url: 'https://lh3.googleusercontent.com/a/default-user',
      verified: true
    };

    localStorage.setItem('medicast_auth_user', JSON.stringify(googleUser));
    window.location.href = "/";
  };

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    if (!customGoogleEmail) return;
    const namePart = customGoogleEmail.split('@')[0];
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    authenticateWithGoogle(formattedName, customGoogleEmail);
  };

  // ── Standard Email/Password Registration ──
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    const newUser = {
      id: 'usr_' + Date.now(),
      email: email,
      name: email.split('@')[0],
      role: 'surgeon',
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('medicast_auth_user', JSON.stringify(newUser));
    setShowConfirmation(true);
    setLoading(false);
  };

  // ── Small Confirmation State ──
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl border border-stone-200/90 p-6 sm:p-7 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 font-heading">
            Account Created
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Your surgeon workstation account for <strong className="text-stone-800">{email}</strong> has been registered.
          </p>
          <button
            type="button"
            onClick={() => window.location.href = "/"}
            className="w-full h-10 flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors"
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
      {/* ── Main Compact Register Card (Exact Same Dimensions as Login) ── */}
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl border border-stone-200/90 p-6 sm:p-7 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center mx-auto shadow-md shadow-teal-700/20 text-white">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-heading">
            Create Account
          </h1>
          <p className="text-xs text-stone-500">
            Intraoperative Surgical Intelligence
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        {/* ── Sign Up with Google Button ── */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 bg-white text-stone-700 font-semibold text-xs sm:text-sm shadow-2xs transition-all active:scale-[0.99]"
        >
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <span>{loading ? "Signing up..." : "Sign up with Google"}</span>
        </button>

        {/* Clean Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-stone-200" />
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">or</span>
          <div className="flex-1 border-t border-stone-200" />
        </div>

        {/* ── Short Registration Form ── */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-stone-700">
              Email
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
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-stone-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:border-teal-600 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-stone-700">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:border-teal-600 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-1 border-t border-stone-100 text-xs text-stone-500">
          <span>Already have an account? </span>
          <Link to="/login" className="text-teal-700 font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-stone-400 mt-4 text-center">
        © 2026 MediCast AI • Secure Intraoperative Portal
      </p>

      {/* ── Official Google Account Chooser Modal ── */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-stone-900">Sign up with Google</h3>
                <p className="text-[11px] text-stone-500">Choose an account to continue to MediCast AI</p>
              </div>
            </div>

            {/* Account List */}
            <div className="space-y-2">
              {/* Account 1: Lameck Opio */}
              <button
                type="button"
                onClick={() => authenticateWithGoogle('Lameck Opio', 'opiolamecky@gmail.com')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-teal-400 hover:bg-teal-50/40 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  LO
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 group-hover:text-teal-900 truncate">
                    Lameck Opio
                  </p>
                  <p className="text-[11px] text-stone-500 truncate">
                    opiolamecky@gmail.com
                  </p>
                </div>
                <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Check className="w-3 h-3" />
                </div>
              </button>

              {/* Account 2: Custom Google Account */}
              {showCustomEmailInput ? (
                <form onSubmit={handleCustomGoogleSubmit} className="p-3 rounded-xl border border-teal-300 bg-stone-50/60 space-y-2">
                  <label className="block text-[11px] font-semibold text-stone-700">
                    Enter Google Email
                  </label>
                  <input
                    type="email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="doctor@gmail.com"
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-stone-300 focus:outline-none focus:border-teal-600"
                    autoFocus
                    required
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomEmailInput(false)}
                      className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200/60 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomEmailInput(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-stone-300 hover:bg-stone-50 text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-full border border-stone-300 flex items-center justify-center text-stone-500 font-bold text-base">
                    +
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-700">Use another Google account</p>
                    <p className="text-[11px] text-stone-400">Sign up with different email</p>
                  </div>
                </button>
              )}
            </div>

            {/* Cancel Button */}
            <div className="pt-2 border-t border-stone-100 text-right">
              <button
                type="button"
                onClick={() => {
                  setShowGoogleModal(false);
                  setShowCustomEmailInput(false);
                }}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
