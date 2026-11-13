import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Activity, Mail, Lock, Eye, EyeOff, Loader2, KeyRound, ExternalLink, Check, CheckCircle2, AlertCircle } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

const DEFAULT_GOOGLE_CLIENT_ID = '';

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
  const [successMessage, setSuccessMessage] = useState("");

  // ── Auto-Fill Registered Credentials on Redirect ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const registeredEmail = params.get('registered');
    if (registeredEmail) {
      setEmail(registeredEmail);
      setSuccessMessage("Account registered successfully! Sign in to enter your workstation.");

      try {
        const lastRegRaw = localStorage.getItem('medicast_last_registered');
        if (lastRegRaw) {
          const lastReg = JSON.parse(lastRegRaw);
          if (lastReg?.email?.toLowerCase() === registeredEmail.toLowerCase() && lastReg?.password) {
            setPassword(lastReg.password);
          }
        }
      } catch (e) {
        console.warn("Error reading registration cache:", e);
      }
    }
  }, []);

  // Google OAuth Config State
  const [googleClientId, setGoogleClientId] = useState(
    () => import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('medicast_google_client_id') || DEFAULT_GOOGLE_CLIENT_ID
  );
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempClientId, setTempClientId] = useState("");
  const [buttonRendered, setButtonRendered] = useState(false);
  const googleBtnContainerRef = useRef(null);

  // ── Handle OAuth Return Hash (Redirect Flow) ──
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
    let checkInterval = null;

    const setupGoogle = () => {
      if (!window.google?.accounts || !googleClientId) return;

      try {
        // 1. Initialize Google ID (One-Tap / JWT)
        if (window.google.accounts.id) {
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
            setButtonRendered(true);
          }
        }
      } catch (err) {
        console.warn("Google Identity Services setup:", err);
      }
    };

    if (window.google?.accounts) {
      setupGoogle();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(checkInterval);
          setupGoogle();
        }
      }, 150);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [googleClientId]);

  // ── Trigger Real Google Authentication (Popup Flow) ──
  const handleGoogleClick = () => {
    if (!googleClientId) {
      setTempClientId(DEFAULT_GOOGLE_CLIENT_ID);
      setShowConfigModal(true);
      return;
    }

    // Attempt Google OAuth 2.0 Token Client (Opens Real Google Login Popup)
    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              setLoading(true);
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userinfo = await res.json();
                if (userinfo?.email) {
                  const verifiedUser = {
                    id: userinfo.sub || 'g_' + Date.now(),
                    email: userinfo.email,
                    name: userinfo.name || userinfo.email.split('@')[0],
                    avatar_url: userinfo.picture,
                    role: 'surgeon',
                    provider: 'google',
                    verified: userinfo.email_verified === true
                  };
                  localStorage.setItem('medicast_auth_user', JSON.stringify(verifiedUser));
                  window.location.href = '/';
                  return;
                }
              } catch (e) {
                console.error("Failed to fetch Google profile:", e);
                setError("Unable to retrieve Google profile. Please try again.");
              } finally {
                setLoading(false);
              }
            }
          }
        });
        client.requestAccessToken();
        return;
      } catch (e) {
        console.warn("Token client launch:", e);
      }
    }

    // Fallback to GSI One-Tap Prompt
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn("GSI prompt launch:", e);
      }
    }

    // Direct OAuth endpoint redirect as last resort
    const redirectUri = encodeURIComponent(window.location.origin + '/login');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=id_token%20token&scope=openid%20email%20profile&nonce=${Date.now()}`;
    window.location.href = authUrl;
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
      email: email.trim(),
      name: email.split('@')[0],
      role: 'surgeon',
      authenticatedAt: new Date().toISOString()
    };
    localStorage.setItem('medicast_auth_user', JSON.stringify(localUser));
    localStorage.removeItem('medicast_last_registered');
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
      {/* ── Main Compact Login Card ── */}
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl border border-stone-200/90 p-6 sm:p-7 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/medicast-logo.png"
            alt="MediCast AI"
            className="h-14 w-auto object-contain mx-auto drop-shadow-xs"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 font-heading">
              Sign In to MediCast
            </h1>
            <p className="text-xs text-stone-500">
              Intraoperative Surgical Intelligence
            </p>
          </div>
        </div>

        {/* Registration Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        {/* ── Single Clean Google Sign In Button ── */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 bg-white text-stone-700 font-semibold text-xs sm:text-sm shadow-2xs transition-all active:scale-[0.99]"
        >
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <span>{loading ? "Authenticating with Google..." : "Sign in with Google"}</span>
        </button>

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

      {/* ── Client ID Setup Modal (Optional custom override) ── */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-stone-900">Google OAuth Client ID</h3>
                <p className="text-[11px] text-stone-500">Active Google Client ID configured for this domain</p>
              </div>
            </div>

            <form onSubmit={handleSaveClientId} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                  placeholder="e.g. 678354836912-...apps.googleusercontent.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-mono bg-stone-50 focus:bg-white focus:outline-none focus:border-teal-600"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Save & Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
