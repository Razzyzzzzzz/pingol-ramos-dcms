import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Users,
  Package,
  Wallet,
  Receipt,
  FileBarChart2,
  Settings as SettingsIcon,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../services/endpoints';
import { initials, timeAgo } from '../../lib/format';
import logo from '../../assets/logo.png';
import Chatbot from '../Chatbot';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/revenue', label: 'Revenue', icon: Wallet },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer on route change.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar (desktop) */}
      <Sidebar className="hidden lg:flex" />

      {/* Sidebar (mobile drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <Sidebar className="absolute inset-y-0 left-0 flex animate-fade-in" onClose={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <Chatbot />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function Sidebar({ className = '', onClose }) {
  return (
    <aside className={`w-64 flex-col bg-navy-800 no-print ${className} lg:fixed lg:inset-y-0`}>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <img src={logo} alt="Pingol Ramos Dental Clinic" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" />
        <div className="leading-tight">
          <p className="font-display text-sm font-bold text-white">Pingol Ramos</p>
          <p className="text-[11px] font-medium text-lime-300">Dental Clinic</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto rounded-md p-1 text-white/70 hover:bg-white/10" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="scroll-slim flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-navy-100/70 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`h-5 w-0.5 rounded-full transition ${
                    isActive ? 'bg-lime-400' : 'bg-transparent group-hover:bg-white/20'
                  }`}
                />
                <Icon size={18} className={isActive ? 'text-lime-300' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[11px] text-navy-100/50">v1.0 · Pulilan, Bulacan</p>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------
function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/patients?search=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8 no-print">
      <button onClick={onMenu} className="rounded-lg p-2 text-muted hover:bg-canvas lg:hidden" aria-label="Open menu">
        <Menu size={20} />
      </button>

      <form onSubmit={onSearch} className="relative hidden max-w-md flex-1 sm:block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patients…"
          className="input-base pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationsBell />
        <UserMenu user={user} onLogout={() => { logout(); navigate('/login'); }} />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Notifications bell
// ---------------------------------------------------------------------------
function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await notificationsApi.list(15);
      setItems(res.data.items || []);
      setUnread(res.data.unread || 0);
    } catch {
      /* silent */
    }
  };

  // Poll unread count periodically; refresh full list when opened.
  useEffect(() => {
    load();
    const t = setInterval(async () => {
      try {
        const res = await notificationsApi.count();
        setUnread(res.data.unread || 0);
      } catch {
        /* silent */
      }
    }, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setUnread(0);
    setItems((list) => list.map((n) => ({ ...n, is_read: 1 })));
  };

  const openItem = async (n) => {
    if (!Number(n.is_read)) {
      await notificationsApi.markRead(n.id);
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 animate-scale-in overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-800">
                <Check size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="scroll-slim max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">You're all caught up.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left transition hover:bg-canvas ${
                    Number(n.is_read) ? '' : 'bg-navy-50/40'
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${Number(n.is_read) ? 'bg-transparent' : 'bg-lime-500'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{n.title}</span>
                    {n.message && <span className="block truncate text-xs text-muted">{n.message}</span>}
                    <span className="mt-0.5 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User menu
// ---------------------------------------------------------------------------
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-canvas"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-700 text-xs font-bold text-white">
          {initials(user?.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-semibold leading-tight text-ink">{user?.name}</span>
          <span className="block text-[11px] capitalize leading-tight text-muted">{user?.role}</span>
        </span>
        <ChevronDown size={15} className="hidden text-muted sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 animate-scale-in overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/settings'); }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink transition hover:bg-canvas"
          >
            <SettingsIcon size={16} className="text-muted" /> Settings
          </button>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
