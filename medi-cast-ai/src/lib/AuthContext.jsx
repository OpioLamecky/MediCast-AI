import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const resolveUser = async () => {
    try {
      // 1. Check Supabase session
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUser(data.session.user);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        return;
      }
    } catch (e) {
      console.warn("Supabase auth check:", e);
    }

    // 2. Check local authenticated user (e.g. Google Sign-In or local surgeon session)
    try {
      const raw = localStorage.getItem('medicast_auth_user');
      if (raw) {
        const localUser = JSON.parse(raw);
        if (localUser && (localUser.email || localUser.id)) {
          setUser(localUser);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Local auth parse error:", e);
    }

    setUser(null);
    setIsAuthenticated(false);
    setIsLoadingAuth(false);
  };

  useEffect(() => {
    resolveUser();

    // Listen for Supabase auth state changes
    let subscription = null;
    try {
      const res = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
        } else {
          resolveUser();
        }
      });
      subscription = res?.data?.subscription;
    } catch {}

    const handleStorage = () => resolveUser();
    window.addEventListener('storage', handleStorage);

    return () => {
      if (subscription?.unsubscribe) subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const logout = async (shouldRedirect = true) => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('medicast_auth_user');
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
