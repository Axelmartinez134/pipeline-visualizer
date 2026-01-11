import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarCheck2,
  FileUp,
  Inbox,
  MessageSquareText,
  Settings,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { useAuth } from '../auth/AuthContext';

const linkedInNavItems = [
  { to: '/linkedin/upload', label: 'Upload & Enrich', badge: 2, icon: FileUp },
  { to: '/linkedin/generate', label: 'Generate Messages', badge: 5, icon: MessageSquareText },
  { to: '/linkedin/campaign', label: 'Campaign Status', icon: BarChart3 },
  { to: '/linkedin/queue', label: 'Approval Queue', badge: 1, icon: Inbox },
  { to: '/linkedin/booked', label: 'Booked Calls', icon: CalendarCheck2 },
  { to: '/linkedin/settings', label: 'Settings', icon: Settings },
];

const products = [
  { id: 'linkedin', emoji: '💼', name: 'LinkedIn Responder', path: '/linkedin/upload' },
  { id: 'carousel', emoji: '🎠', name: 'Carousel Generator', path: '/carousel' },
  { id: 'email', emoji: '✉️', name: 'Email Responder', path: '/email' },
];

function formatNavBadgeCount(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  if (value > 99) return '99+';
  return String(Math.floor(value));
}

export default function ProductShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine which product is active based on current path
  const activeProduct = location.pathname.startsWith('/linkedin') 
    ? 'linkedin' 
    : location.pathname.startsWith('/carousel')
    ? 'carousel'
    : location.pathname.startsWith('/email')
    ? 'email'
    : 'linkedin';

  const showInternalSidebar = activeProduct === 'linkedin';

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top Header Bar */}
      <header className="h-16 bg-black border-b border-white/10 flex items-stretch relative z-10">
        {/* Top-left square (reserved for logo) */}
        <div className="w-20 h-16 border-r border-white/10 flex items-center justify-center">
          {/* Empty box - logo can go here later */}
        </div>

        <div className="flex-1 relative">
          <div className="absolute right-16 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-lg px-4',
                'text-white/90 bg-white/5 border border-white/10 shadow-sm',
                'hover:bg-white/10 hover:border-white/20 hover:text-white',
              )}
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              Log Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebars */}
      <div className="flex flex-1 min-h-0">
        {/* Emoji Product Selector Sidebar */}
        <aside className="w-20 bg-black border-r border-white/10 flex flex-col overflow-visible relative z-20">
          {/* Emoji Buttons */}
          {/* Use an explicit spacer so the emoji stack visibly sits lower */}
          <div style={{ height: 28 }} />
          <div className="flex flex-col items-center gap-6">
            {products.map((product) => {
              const isActive = activeProduct === product.id;
              return (
                <button
                  key={product.id}
                  onClick={() => navigate(product.path)}
                  className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-all duration-300 relative',
                    isActive 
                      ? 'z-30 shadow-[0_0_20px_rgba(255,255,255,0.8)] bg-white/5'
                      : 'hover:bg-white/5'
                  )}
                  title={product.name}
                >
                  {product.emoji}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Internal LinkedIn Sidebar (only shown when LinkedIn is active) */}
        {showInternalSidebar && (
          <aside className="w-72 bg-black border-r border-white/10 flex flex-col relative z-10">
            <div className="px-5 py-6 border-b border-white/10">
              <div className="flex items-center justify-center">
                <div className="text-lg font-semibold text-white tracking-tight text-center">
                  LinkedIn Outreach
                </div>
              </div>
            </div>

            <nav className="px-3 py-4 space-y-1 flex-1">
              {linkedInNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                const badgeText = formatNavBadgeCount(item.badge);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'relative grid grid-cols-[1fr_auto] items-center gap-3 h-11 px-3 rounded-xl transition-all duration-150',
                      isActive
                        ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10'
                        : 'text-white/60 hover:bg-white/5 hover:text-white',
                    )}
                    end
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          isActive ? 'bg-white/10' : 'bg-white/0',
                        )}
                      >
                        <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-white/60')} />
                      </div>
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    </div>
                    {badgeText ? (
                      <Badge
                        className={cn(
                          'shrink-0 min-w-9 h-6 px-2.5 rounded-full',
                          'bg-blue-500/20 text-blue-100 border border-blue-500/20',
                        )}
                      >
                        {badgeText}
                      </Badge>
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
