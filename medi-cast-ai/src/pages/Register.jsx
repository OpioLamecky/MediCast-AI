import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Activity, Mail, Lock, Eye, EyeOff, Loader2, KeyRound, ExternalLink, Check } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

const DEFAULT_GOOGLE_CLIENT_ID = "678354836912-9tsolf2fbp1g5hino8eimnutic0tc2nc.apps.googleusercontent.com";

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

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Google OAuth Config State
  const [googleClientId, setGoogleClientId] = useState(
    () => import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('medicast_google_client_id') || DEFAULT_GOOGLE_CLIENT_ID
  );
  const googleBtnContainerRef = useRef(null);

  // ── Initialize Official Google Identity Services SDK ──
  useEffect(() => {
    let checkInterval = null;

    const setupGoogle = () => {
      if (!window.google?.accounts || !googleClientId) return;

      try {
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
              text: "signup_with"
            });
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

  const handleGoogleClick = () => {
    if (!googleClientId) return;

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
                setError("Unable to retrieve Google profile.");
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

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn("GSI prompt launch:", e);
      }
    }

    const redirectUri = encodeURIComponent(window.location.origin + '/login');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=id_token%20token&scope=openid%20email%20profile&nonce=${Date.now()}`;
    window.location.href = authUrl;
  };

  // ── Standard Email/Password Registration (Redirects to Login with Details) ──
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

    const cleanEmail = email.trim();

    // Store newly registered account in local registry
    try {
      const existingRaw = localStorage.getItem('medicast_registered_users');
      const users = existingRaw ? JSON.parse(existingRaw) : [];
      users.push({
        id: 'usr_' + Date.now(),
        email: cleanEmail,
        password: password,
        name: cleanEmail.split('@')[0],
        role: 'surgeon',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('medicast_registered_users', JSON.stringify(users));
    } catch (err) {
      console.warn("Storage save error:", err);
    }

    // Save temporary details for auto-filling login form
    localStorage.setItem('medicast_last_registered', JSON.stringify({
      email: cleanEmail,
      password: password
    }));

    // Redirect immediately to login with the registered details
    window.location.href = `/login?registered=${encodeURIComponent(cleanEmail)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
      {/* ── Main Compact Register Card ── */}
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

        {/* ── Single Clean Google Sign Up Button ── */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 bg-white text-stone-700 font-semibold text-xs sm:text-sm shadow-2xs transition-all active:scale-[0.99]"
        >
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <span>{loading ? "Authenticating with Google..." : "Sign up with Google"}</span>
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
    </div>
  );
}
