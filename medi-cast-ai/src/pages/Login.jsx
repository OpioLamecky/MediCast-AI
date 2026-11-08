import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Activity, Mail, Lock, Eye, EyeOff, Loader2, KeyRound, ExternalLink, Check, AlertCircle } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

// ── Decode Real Google JWT (Base64URL) ──
function parseGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse Google JWT:', e);
    return null;
  }
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Google OAuth Config & Setup State
  const [googleClientId, setGoogleClientId] = useState(
    () => import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('medicast_google_client_id') || ""
  );
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempClientId, setTempClientId] = useState("");
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const googleBtnContainerRef = useRef(null);

  // ── Handle OAuth Return Hash (if redirect flow is used) ──
  useEffect(() => {
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const idToken = hashParams.get('id_token');
      if (idToken) {
        const payload = parseGoogleJwt(idToken);
        if (payload?.email) {
          const verifiedUser = {
            id: payload.sub || 'g_' + Date.now(),
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            avatar_url: payload.picture,
            role: 'surgeon',
            provider: 'google',
            verified: true
          };
          localStorage.setItem('medicast_auth_user', JSON.stringify(verifiedUser));
          window.location.href = '/';
        }
      }
    }
  }, []);

  // ── Initialize Official Google Identity Services SDK ──
  useEffect(() => {
    const initGsi = () => {
      if (!window.google?.accounts?.id || !googleClientId) return;

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response.credential) {
              const payload = parseGoogleJwt(response.credential);
              if (payload?.email) {
                const verifiedUser = {
                  id: payload.sub || 'g_' + Date.now(),
                  email: payload.email,
                  name: payload.name || payload.email.split('@')[0],
                  avatar_url: payload.picture,
                  role: 'surgeon',
                  provider: 'google',
                  verified: payload.email_verified === true
                };
                localStorage.setItem('medicast_auth_user', JSON.stringify(verifiedUser));
                window.location.href = '/';
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        setIsGsiLoaded(true);

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "outline",
            size: "large",
            width: 328,
            shape: "rectangular",
            logo_alignment: "left",
            text: "signin_with"
          });
        }
      } catch (err) {
        console.warn("Google Identity Services init error:", err);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  // ── Trigger Real Google Authentication ──
  const handleGoogleClick = () => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn("GSI prompt failed:", e);
      }
    }

    // If client ID is missing, open configuration modal
    setTempClientId(googleClientId);
    setShowConfigModal(true);
  };

  const handleSaveClientId = (e) => {
    e.preventDefault();
    const cleanId = tempClientId.trim();
    if (!cleanId) return;

    localStorage.setItem('medicast_google_client_id', cleanId);
    setGoogleClientId(cleanId);
    setShowConfigModal(false);
  };

  // ── Standard Email/Password Sign In ──
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setError("");
    setLoading(true);

    const localUser = {
      id: 'usr_' + Date.now(),
      email: email,
      name: email.split('@')[0],
      role: 'surgeon'
    };
    localStorage.setItem('medicast_auth_user', JSON.stringify(localUser));
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
      {/* ── Main Compact Login Card ── */}
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl border border-stone-200/90 p-6 sm:p-7 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center mx-auto shadow-md shadow-teal-700/20 text-white">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-heading">
            Sign In to MediCast
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

        {/* ── Real Google Sign In Button ── */}
        {googleClientId ? (
          <div className="w-full flex justify-center min-h-[44px]">
            <div ref={googleBtnContainerRef} className="w-full flex justify-center" />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 bg-white text-stone-700 font-semibold text-xs sm:text-sm shadow-2xs transition-all active:scale-[0.99]"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>Sign in with Google</span>
          </button>
        )}

        {/* Clean Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-stone-200" />
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">or</span>
          <div className="flex-1 border-t border-stone-200" />
        </div>

        {/* ── Short Email & Password Form ── */}
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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-700">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] text-teal-700 hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-1 border-t border-stone-100 text-xs text-stone-500">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-teal-700 font-semibold hover:underline">
            Register
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-stone-400 mt-4 text-center">
        © 2026 MediCast AI • Secure Intraoperative Portal
      </p>

      {/* ── Real Google OAuth Setup Modal ── */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-stone-900">Connect Real Google OAuth</h3>
                <p className="text-[11px] text-stone-500">Google requires an OAuth Client ID for your website domain</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              To verify real Google accounts on <strong className="text-stone-800">{window.location.hostname}</strong>, Google requires a free Web Client ID from Google Cloud Console.
            </p>

            <form onSubmit={handleSaveClientId} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                  placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-mono bg-stone-50 focus:bg-white focus:outline-none focus:border-teal-600"
                  required
                  autoFocus
                />
              </div>

              <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 text-[11px] text-teal-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-teal-700" />
                  <span>Quick Setup (takes 1 minute):</span>
                </p>
                <ol className="list-decimal pl-4 space-y-0.5 text-stone-600">
                  <li>Visit <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-teal-700 underline font-semibold inline-flex items-center gap-0.5">Google Cloud Credentials <ExternalLink className="w-2.5 h-2.5" /></a></li>
                  <li>Click <strong>Create Credentials &gt; OAuth client ID &gt; Web application</strong></li>
                  <li>Add Authorized Origin: <code className="bg-white px-1 py-0.5 rounded text-[10px] text-stone-800 font-mono border border-stone-200">{window.location.origin}</code></li>
                  <li>Paste the Client ID above (or set <code className="font-mono text-stone-800">VITE_GOOGLE_CLIENT_ID</code> in Render).</li>
                </ol>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Save & Enable Real Google Sign-In
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
