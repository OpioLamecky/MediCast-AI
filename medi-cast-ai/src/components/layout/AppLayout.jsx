import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Upload,
  Brain,
  MessageSquare,
  Activity,
  GitCompare,
  Plus,
  Trash2,
  Crown,
  Sparkles,
  ArrowRight,
  Lock,
  LogOut
} from 'lucide-react';
import { getSavedConversations, saveConversations, createNewChat } from '@/lib/chatStorage';
import { useSubscription } from '@/lib/SubscriptionContext';
import { useAuth } from '@/lib/AuthContext';
import SubscriptionModal from '@/components/subscription/SubscriptionModal';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/live', label: 'Live Surgery', icon: Radio, isLive: true },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/analyses', label: 'Analyses', icon: Brain },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/assistant', label: 'AI Assistant', icon: MessageSquare },
  { path: '/subscription', label: 'Subscription', icon: Crown },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const { plan, planId, isProOrHigher, usage, openUpgradeModal } = useSubscription();
  const { user, isAuthenticated, isLoadingAuth, logout } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoadingAuth, isAuthenticated, navigate]);

  const activeChatId = searchParams.get('c');
  const isAssistantPage = location.pathname.startsWith('/assistant');

  const refreshConvos = () => {
    setConversations(getSavedConversations());
  };

  useEffect(() => {
    refreshConvos();
    window.addEventListener('medicast_convos_changed', refreshConvos);
    window.addEventListener('storage', refreshConvos);
    return () => {
      window.removeEventListener('medicast_convos_changed', refreshConvos);
      window.removeEventListener('storage', refreshConvos);
    };
  }, []);

  const handleNewChat = (e) => {
    e.preventDefault();
    const newChat = createNewChat();
    refreshConvos();
    navigate(`/assistant?c=${newChat.id}`);
  };

  const handleDeleteChat = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    const updated = conversations.filter(c => c.id !== id);
    saveConversations(updated);
    refreshConvos();
    if (activeChatId === id) {
      if (updated.length > 0) {
        navigate(`/assistant?c=${updated[0].id}`);
      } else {
        navigate('/assistant');
      }
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-800 flex items-center justify-center text-white shadow-md animate-pulse">
            <Activity className="w-5 h-5 text-teal-300" />
          </div>
          <p className="text-xs text-stone-500 font-mono">Verifying workstation session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] w-full max-w-full overflow-x-hidden relative">
      {/* ── Left Sidebar (Dashboard Navigation & Integrated Recent Chats) ── */}
      <aside className="w-64 bg-white border-r border-stone-200/80 flex flex-col fixed inset-y-0 left-0 h-full z-30 max-md:hidden">
        {/* Brand Header */}
        <div className="p-5 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 font-heading">MediCast</h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-widest uppercase">AI Surgery</p>
            </div>
          </div>
        </div>

        {/* Primary Navigation Links */}
        <nav className="p-3 space-y-1 shrink-0">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={`w-4.5 h-4.5 ${isActive ? (item.isLive ? 'text-red-600' : 'text-teal-600') : (item.isLive ? 'text-red-500' : '')}`} />
                  {item.label}
                </span>
                {item.isLive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    OR
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Recent Chats Section (Moved to the Left Sidebar of Dashboard) ── */}
        {isAssistantPage && (
          <div className="flex-1 flex flex-col min-h-0 px-3 pb-3 border-t border-stone-200/80 mt-1 pt-3">
            <div className="flex items-center justify-between px-2 mb-2 shrink-0">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Recent Chats
              </span>
              <button
                onClick={handleNewChat}
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1 hover:bg-teal-50 px-2 py-0.5 rounded-md transition-colors border border-teal-200/70"
                title="Start New Chat"
              >
                <Plus className="w-3 h-3 text-teal-600" />
                <span>New</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-6">No recent chats</p>
              ) : (
                conversations.map(c => {
                  const isActive = activeChatId === c.id || (!activeChatId && conversations[0]?.id === c.id);
                  return (
                    <div
                      key={c.id}
                      className={`group flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-200/60'
                          : 'text-stone-600 hover:bg-stone-100/70 hover:text-stone-900'
                      }`}
                    >
                      <button
                        onClick={() => navigate(`/assistant?c=${c.id}`)}
                        className="flex-1 text-left truncate flex items-center gap-2"
                      >
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-600' : 'text-stone-400'}`} />
                        <span className="truncate">{c.metadata?.name || 'Untitled Discussion'}</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded text-stone-400 transition-all shrink-0 ml-1"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Sidebar Bottom Subscription Widget ── */}
        <div className="p-3 border-t border-stone-200/80 bg-stone-50/70 mt-auto shrink-0">
          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Plan Status
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isProOrHigher ? 'bg-teal-100 text-teal-800' : 'bg-stone-100 text-stone-700'
              }`}>
                {plan.name}
              </span>
            </div>

            <p className="text-xs text-stone-600">
              {isProOrHigher ? (
                <span className="font-semibold text-teal-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Unlimited AI & Video Analyses
                </span>
              ) : (
                <span>
                  {Math.max(0, (plan.limits.videosPerMonth || 3) - (usage.videosAnalyzedThisMonth || 0))} videos left this month
                </span>
              )}
            </p>

            <div className="flex items-center gap-1.5 pt-1">
              {!isProOrHigher ? (
                <button
                  type="button"
                  onClick={() => openUpgradeModal('Sidebar Upgrade')}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Crown className="w-3 h-3" />
                  <span>Upgrade to Pro</span>
                </button>
              ) : (
                <Link
                  to="/subscription"
                  className="w-full flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors"
                >
                  <span>Manage Plan</span>
                </Link>
              )}
            </div>

            {/* Surgeon Workstation Authentication Status */}
            <div className="pt-2 mt-2 border-t border-stone-200/80 flex items-center justify-between text-[11px]">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-1.5 min-w-0 text-stone-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Workstation Verified" />
                    <span className="truncate max-w-[130px] font-mono" title={user?.email}>
                      {user?.email ? user.email.split('@')[0] : 'Surgeon Active'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="text-stone-400 hover:text-red-600 p-1 rounded transition-colors"
                    title="Sign Out of Workstation"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-stone-600 hover:text-teal-700 hover:bg-teal-50/60 transition-colors font-medium text-[11px]"
                >
                  <Lock className="w-3 h-3 text-stone-400" />
                  <span>Surgeon Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900">MediCast</span>
        </div>
        <div>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => logout()}
              className="text-xs text-stone-500 hover:text-red-600 font-medium flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="text-xs text-teal-700 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200"
            >
              <Lock className="w-3 h-3" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                isActive ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Main Content Area (md:pl-64 guarantees perfect 100% width with ZERO horizontal scroll) */}
      <div className="md:pl-64 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <main className="flex-1 w-full max-w-full overflow-x-hidden pt-14 md:pt-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Global Subscription & Plan Upgrade Dialog */}
      <SubscriptionModal />
    </div>
  );
}