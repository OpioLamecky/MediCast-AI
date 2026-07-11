import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, Brain, MessageSquare, Activity, GitCompare } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/analyses', label: 'Analyses', icon: Brain },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/assistant', label: 'AI Assistant', icon: MessageSquare },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-30 max-md:hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 font-heading">MediCast</h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-widest uppercase">AI Surgery</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 ${isActive ? 'text-teal-600' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900">MediCast</span>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex">
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

      {/* Main Content */}
      <main className="flex-1 md:ml-64 max-md:pt-14 max-md:pb-16">
        <Outlet />
      </main>
    </div>
  );
}