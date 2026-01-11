import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Inbox,
  MessageSquareText,
  Settings,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useAuth } from '../auth/AuthContext';
import { useEffect, useMemo, useState } from 'react';

const navItems = [
  { to: '/app/upload', label: 'Upload & Enrich', badge: 2, icon: FileUp },
  { to: '/app/generate', label: 'Generate Messages', badge: 5, icon: MessageSquareText },
  { to: '/app/campaign', label: 'Campaign Status', icon: BarChart3 },
  { to: '/app/queue', label: 'Approval Queue', badge: 1, icon: Inbox },
  { to: '/app/booked', label: 'Booked Calls', icon: CalendarCheck2 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('outreachai.sidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('outreachai.sidebarCollapsed', collapsed ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [collapsed]);

  const gridCols = collapsed ? 'grid-cols-[5rem_1fr]' : 'grid-cols-[16rem_1fr]';
  const brand = useMemo(() => {
    return collapsed ? null : <span className="font-bold text-lg tracking-tight">OutreachAI</span>;
  }, [collapsed]);

  return (
    <div className={cn('min-h-screen bg-slate-50 grid', gridCols)}>
      <aside
        className={cn(
          'h-screen sticky top-0 flex flex-col',
          'bg-white border-r border-slate-200',
        )}
      >
        <div className={cn('px-4 py-5 border-b border-slate-200', collapsed && 'px-3')}>
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
            <div className={cn('flex items-center gap-2.5', collapsed && 'gap-0')}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">OA</span>
              </div>
              {brand}
            </div>
            {!collapsed ? (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {collapsed ? (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>

        <nav className={cn('px-2 py-4 space-y-1 flex-1', collapsed && 'px-2')}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'relative flex items-center rounded-lg transition-all duration-150',
                  collapsed ? 'justify-center h-10 px-2' : 'justify-between h-10 px-3',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
                end
              >
                <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
                  <Icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-5 h-5')} />
                  {!collapsed ? <span className="text-sm font-medium">{item.label}</span> : null}
                </div>
                {!collapsed && item.badge ? (
                  <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-md leading-none">
                    {item.badge}
                  </span>
                ) : null}
                {collapsed && item.badge ? (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-10',
              collapsed && 'justify-center px-0',
            )}
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            {collapsed ? <span className="text-sm">→</span> : 'Log out'}
          </Button>
        </div>
      </aside>

      <main className="min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

