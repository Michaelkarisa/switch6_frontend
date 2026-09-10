'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Aperture,
  ArrowDownToLine,
  BadgeCheck,
  Bell,
  BellOff,
  Calendar,
  CalendarPlus,
  CalendarRange,
  ChartColumn,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  CirclePlus,
  CircleUserRound,
  CircuitBoard,
  Clapperboard,
  Clock,
  Crosshair,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  LayoutList,
  ListFilter,
  LogOut,
  Mail,
  Megaphone,
  MonitorDot,
  MonitorPlay,
  MoonStar,
  OctagonAlert,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Radio,
  RotateCcw,
  ScrollText,
  Search,
  SendHorizontal,
  Settings2,
  Signal,
  Smartphone,
  SunMedium,
  Swords,
  Timer,
  Trash2,
  TriangleAlert,
  Trophy,
  Tv,
  Users,
  Wallet,
  X,
  Volleyball,
  Lock,
  Share,
  Pause,
  Phone,
  LucideCornerLeftUp,
  ArrowDownWideNarrowIcon,
  ArrowBigDownIcon
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { loadNotifications, onNotifications, markAllRead, markRead, clearAll, type AppNotification } from '@/lib/notifications';
import { logoutUser, UserPrefs, BASE_URL } from '@/lib/api';

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: MonitorPlay,
  matches: Swords,
  'create-match': CalendarPlus,
  advertisement: Megaphone,
  payment: Wallet,
  settings: Settings2,
  terms: ScrollText,
  logout: LogOut,
  menu1: PanelLeftClose,
  menu0: PanelLeftOpen,
  refresh: RotateCcw,
  download: ArrowDownToLine,
  sun: SunMedium,
  moon: MoonStar,
  search: Search,
  eye: Eye,
  'eye-off': EyeOff,
  person: CircleUserRound,
  mail: Mail,
  lock: KeyRound,
  phone: Smartphone,

  // FIXED
  soccer: Trophy,            // instead of Volleyball
  chart: ChartColumn,        // instead of Signal
  analytics: ChartColumn,    // better semantic match

  'live-tv': Signal,
  schedule: Timer,
  event: CalendarRange,
  history: Clock,
  error: OctagonAlert,
  warning: TriangleAlert,
  check: CircleCheck,
  'arrow-back': ChevronLeft,

  // ADD THESE
  calendar: Calendar,
  'chevron-right': ChevronRight,

  'add-circle': CirclePlus,
  edit: PenLine,
  delete: Trash2,
  filter: ListFilter,
  'external-link': ExternalLink,
  tv: MonitorDot,
  video: Clapperboard,
  squad: Users,
  lineup: LayoutList,
  location: Crosshair,
  camera: Aperture,
  gauge: Activity,
  encoder: CircuitBoard,
  overlay: Layers,
  output: SendHorizontal,
  shield: BadgeCheck,
  users: Users,
  system: CircuitBoard,
  share: Share,
  close: X,
  privacy: Lock,
  pause: Pause,
  'arrow-down': ArrowDownToLine
};
const missingIcons = new Set<string>();

export const Icon = memo(function Icon({
  name,
  size = 20,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const C = ICON_MAP[name];

  if (!C && !missingIcons.has(name)) {
    missingIcons.add(name);
    console.warn(`Icon not found in ICON_MAP: "${name}"`);
  }

  const Component = C ?? OctagonAlert;

  return (
    <Component
      size={size}
      className={className}
      strokeWidth={1.8}
    />
  );
});

Icon.displayName = 'Icon';

// ─── Status Badge ─────────────────────────────────────────────
export const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const isLive      = s === 'live';
  const isUpcoming  = s === 'upcoming';
  const isScheduled = s === 'scheduled' || s === 'ready';
  const isDone      = s === 'completed' || s === 'finished';

  const cls = isLive
    ? 'bg-red-500/10 text-[color:var(--red)] border-red-500/20'
    : isUpcoming
    ? 'bg-blue-500/10 text-[color:var(--blue)] border-blue-500/20'
    : isScheduled
    ? 'bg-green-500/10 text-[color:var(--green)] border-green-500/20'
    : 'bg-[color:var(--surface3)] text-[color:var(--muted)] border-[color:var(--border)]';

  const label = isLive ? 'Live'
    : isUpcoming   ? 'Upcoming'
    : isScheduled  ? (s === 'ready' ? 'Ready' : 'Scheduled')
    : isDone       ? 'Completed'
    : status || 'Offline';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium tracking-wide ${cls}`}>
      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--red)] animate-[pulse-dot_1.2s_ease-in-out_infinite]" />}
      {label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// ─── Sidebar ──────────────────────────────────────────────────

import { getUserRole, ROLES } from '@/lib/api';
import { getRoleLabel, getRoleColor } from '@/lib/auth';
import Image from 'next/image';

// ─────────────────────────────────────────────────────────────
// Role-scoped navigation items
// ─────────────────────────────────────────────────────────────
interface NavItem { icon: string; label: string; href: string; }

const BROADCASTER_NAV: NavItem[] = [
  { icon: 'dashboard',     label: 'Dashboard',       href: '/dashboard' },
  { icon: 'soccer',        label: 'Matches',          href: '/matches' },
  { icon: 'add-circle',    label: 'Create match',     href: '/matches/create' },
  { icon: 'advertisement', label: 'Advertise',        href: '/advertisement' },
  { icon: 'chart',         label: 'Revenue',          href: '/revenue' },
  { icon: 'payment',       label: 'Plans & Billing',  href: '/payment' },
  { icon: 'settings',      label: 'Settings',         href: '/settings' },
  { icon: 'terms',         label: 'Terms of service', href: '/terms' },
  { icon: 'privacy',       label: 'Privacy Policy',   href: '/privacy' },
];

const ADVERTISER_NAV: NavItem[] = [
  { icon: 'advertisement', label: 'My Campaigns',     href: '/advertisement' },
  { icon: 'payment',       label: 'Billing',         href: '/payment' },
  { icon: 'settings',      label: 'Settings',         href: '/settings' },
  { icon: 'terms',         label: 'Terms of service', href: '/terms' },
  { icon: 'privacy',       label: 'Privacy Policy',   href: '/privacy' },
];

const ADMIN_NAV: NavItem[] = [
  { icon: 'dashboard',     label: 'Overview',         href: '/admin' },
  { icon: 'person',        label: 'Users',            href: '/admin/users' },
  { icon: 'soccer',        label: 'All Matches',      href: '/admin/matches' },
  { icon: 'payment',       label: 'Plans & Billing',  href: '/admin/plans' },
  { icon: 'advertisement', label: 'Advertisements',   href: '/admin/advertisements' },
  { icon: 'chart',         label: 'Analytics',        href: '/admin/analytics' },
  { icon: 'encoder',       label: 'System',           href: '/admin/system' },
  { icon: 'settings',      label: 'Settings',         href: '/settings' },
];

function navItemsForRole(role: string | null): NavItem[] {
  if (role === ROLES.ADMIN || role === ROLES.SUPERADMIN) return ADMIN_NAV;
  if (role === ROLES.ADVERTISER)                          return ADVERTISER_NAV;
  return BROADCASTER_NAV;
}

// ── Role badge ─────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null }) {
  const label = getRoleLabel(role);
  const color = getRoleColor(role);
  return (
    <span
      className="inline-flex items-center px-[7px] py-px rounded-full text-[9px] font-bold uppercase tracking-[.06em] border"
      style={{ color, borderColor: color + '44', background: color + '14' }}
    >
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar — role-aware
// ─────────────────────────────────────────────────────────────

export const Sidebar = memo(function Sidebar({ 
  userName, 
  onDownload, 
  downloadingArch, 
  collapsed = false 
}: {
  userName: string; 
  onDownload: (arch: 'arm64' | 'arm32') => void; 
  downloadingArch: 'arm64' | 'arm32' | null; 
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  
  const role = getUserRole();
  const navItems = navItemsForRole(role);
  const initial = userName?.[0]?.toUpperCase() || 'G';
  const w = collapsed ? 72 : 256;

  // Click-outside handler to close the dropdown
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogout = useCallback(async() => { 
    UserPrefs.clear(); 
    router.push('/'); 
    await logoutUser();
  }, [router]);

  // Improved active link check
  const isActive = (href: string) => {
    if (href === '/' || href === '/dashboard' || href === '/admin') {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const isAnyDownloading = downloadingArch !== null;

  return (
    <motion.aside
      className="flex flex-col h-screen sticky top-0 overflow-hidden shrink-0 bg-[color:var(--sidebar-bg)] border-r border-[color:var(--border)]"
      initial={false}
      animate={{ width: w }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 py-5 shrink-0 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        <div className="flex items-center justify-center rounded-lg shrink-0 w-[34px] h-[34px] bg-gradient-to-br from-blue-600 to-green-600">
          <img src={'/ic_launcher.png'} alt=''/>
        </div>
        {!collapsed && (
          <div>
            <div className="text-[color:var(--sidebar-text)] font-semibold text-base tracking-tight">Switch6</div>
            <div className="text-[color:var(--sidebar-text-sub)] text-[11px] mt-px">Broadcast Studio</div>
          </div>
        )}
      </div>

      {/* User badge */}
      <div className={`mx-3 mb-4 flex items-center gap-3 rounded-lg shrink-0 bg-[color:var(--sidebar-badge-bg)] border border-[color:var(--sidebar-badge-border)] ${collapsed ? 'justify-center py-2 px-0' : 'px-3 py-2.5'}`}>
        <div className="flex items-center justify-center rounded-lg font-semibold text-white shrink-0 w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 text-[13px]">
          {initial}
        </div>
        {!collapsed && (
          <div className="overflow-hidden min-w-0 flex flex-col gap-1">
            <div className="truncate text-sm font-medium text-[color:var(--sidebar-text)]">{userName}</div>
            <RoleBadge role={role} />
          </div>
        )}
      </div>

      {/* Nav label */}
      {!collapsed && (
        <div className="px-5 pb-2 text-[11px] font-medium tracking-[.06em] uppercase shrink-0 text-[color:var(--sidebar-nav-label)]">
          Navigation
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {navItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-lg my-px transition-all duration-150 no-underline text-[13px]
                ${collapsed ? 'justify-center py-[11px] px-0' : 'gap-2.5 px-3 py-2'}
                ${active
                  ? 'font-medium text-[color:var(--sidebar-item-active-color)] bg-[color:var(--sidebar-item-active-bg)]'
                  : 'font-normal text-[color:var(--sidebar-item-color)] hover:bg-[color:var(--sidebar-item-active-bg)]/50 hover:text-[color:var(--sidebar-item-active-color)]'
                }`}
            >
              <span className="grid place-items-center shrink-0"><Icon name={item.icon} size={17} /></span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`shrink-0 border-t border-[color:var(--sidebar-divider)] ${collapsed ? 'px-2 py-2.5' : 'px-3 py-2.5'}`}>
        {role === ROLES.BROADCASTER && (
          <div className="relative mb-1">
            {/* Main Download Toggle Button */}
            <button
              onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-center gap-2 rounded-lg text-white font-medium text-[13px] cursor-pointer border-none transition-all h-9 bg-[color:var(--green)] hover:opacity-90"
            >
              {isAnyDownloading ? <span className="spinner" /> : <Icon name="download" size={15} />}
              {!collapsed && (isAnyDownloading ? 'Downloading...' : 'Download app')}
            </button>

            {/* Download Menu Dropdown */}
            {open && (
              <div
                ref={menuRef}
                // REDUCED WIDTH: Changed from w-full min-w-[260px] to w-52 (208px)
                className="absolute bottom-full mb-2 left-0 w-52 max-h-[220px] flex flex-col overflow-hidden rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] shadow-[var(--shadow-xl)] z-[999] animate-[notif-drop-in_.22s_cubic-bezier(0.32,0,0.12,1)_both]"
              >
                <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-[color:var(--border)]">
                  <span className="text-sm font-medium text-[color:var(--text)]">Downloads</span>
                  <button 
                    onClick={() => setOpen(false)} 
                    className="flex items-center gap-1 border-none bg-transparent cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
                  >
                     <Icon name='close' size={12} /> Close
                  </button>
                </div>
                
                <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-2">
                  {/* ARM 64 Button */}
                  <button
                    onClick={() => onDownload('arm64')}
                    disabled={isAnyDownloading}
                    className="w-full flex items-center justify-center gap-2 rounded-lg text-white font-medium text-[13px] cursor-pointer border-none transition-all h-9 bg-[color:var(--green)] disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    {downloadingArch === 'arm64' ? <span className="spinner" /> : <Icon name="phone" size={15} />}
                    Download Arm 64
                  </button>

                  {/* ARM 32 Button */}
                  <button
                    onClick={() => onDownload('arm32')}
                    disabled={isAnyDownloading}
                    className="w-full flex items-center justify-center gap-2 rounded-lg text-white font-medium text-[13px] cursor-pointer border-none transition-all h-9 bg-[color:var(--green)] disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    {downloadingArch === 'arm32' ? <span className="spinner" /> : <Icon name="phone" size={15} />}
                    Download Arm 32 (Older)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
          className={`w-full flex items-center rounded-lg border-none bg-transparent cursor-pointer text-[13px] font-normal transition-all h-9 text-[color:var(--sidebar-text-muted)] hover:text-[color:var(--sidebar-text)] ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'}`}
        >
          <Icon name="logout" size={16} />
          {!collapsed && 'Log out'}
        </button>
      </div>
    </motion.aside>
  );
});

Sidebar.displayName = 'Sidebar';
// ─── Notifications ────────────────────────────────────────────
function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

const NCFG: Record<AppNotification['type'], { color: string; bg: string; border: string }> = {
  live:    { color: 'var(--red)',   bg: 'rgba(192,41,29,.08)',  border: 'rgba(192,41,29,.18)' },
  match:   { color: 'var(--blue)',  bg: 'rgba(26,95,212,.08)',  border: 'rgba(26,95,212,.18)' },
  alert:   { color: 'var(--gold)',  bg: 'rgba(143,101,0,.08)',  border: 'rgba(143,101,0,.18)' },
  info:    { color: 'var(--muted)', bg: 'rgba(86,104,128,.08)', border: 'rgba(86,104,128,.18)' },
  success: { color: 'var(--green)', bg: 'rgba(10,143,82,.08)',  border: 'rgba(10,143,82,.18)' },
};

export const NotificationBell = memo(function NotificationBell() {
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setNotes(loadNotifications()); return onNotifications(setNotes); }, []);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const unread = notes.filter(n => !n.read).length;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative grid place-items-center rounded-lg border-none cursor-pointer transition-all w-[38px] h-[38px]
          ${open ? 'text-[color:var(--green)] bg-green-500/10' : 'text-[color:var(--text)] bg-[color:var(--surface2)] hover:bg-[color:var(--surface3)]'}`}
      >
        <Bell size={18} strokeWidth={1.8} />
        {unread > 0 && (
          <span
            className="absolute top-1.5 right-1.5 flex items-center justify-center font-semibold rounded-full bg-[color:var(--red)] text-white border-2 border-[color:var(--topbar-bg)]"
            style={{ width: unread > 9 ? 16 : 12, height: 12, fontSize: 9 }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute flex flex-col overflow-hidden rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] shadow-[var(--shadow-xl)] z-[999] animate-[notif-drop-in_.22s_cubic-bezier(0.32,0,0.12,1)_both]"
          style={{ top: 'calc(100% + 8px)', right: 0, width: 'min(340px, calc(100vw - 24px))', maxHeight: 460 }}
        >
          <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-[color:var(--border)]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[color:var(--text)]">Notifications</span>
              {unread > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-[color:var(--red)]">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {unread > 0 && (
                <button onClick={() => markAllRead()} className="flex items-center gap-1 border-none bg-transparent cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors">
                  <CheckCheck size={12} />All read
                </button>
              )}
              {notes.length > 0 && (
                <button onClick={() => clearAll()} className="flex items-center gap-1 border-none bg-transparent cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors">
                  <X size={12} />Clear
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {notes.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <BellOff size={32} className="text-[color:var(--faint)]" />
                <div className="text-sm font-medium text-[color:var(--text)]">No notifications</div>
                <div className="text-xs text-[color:var(--muted)]">Match events appear here</div>
              </div>
            ) : notes.map((n, i) => {
              const c = NCFG[n.type] ?? NCFG.info;
              return (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className="flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[color:var(--hover-glow)]"
                  style={{ background: n.read ? 'transparent' : `${c.color}06`, borderBottom: i < notes.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <div
                    className="grid place-items-center rounded-lg shrink-0 mt-0.5 w-[30px] h-[30px]"
                    style={{ background: c.bg, border: `1px solid ${c.border}` }}
                  >
                    {n.type === 'live'    && <Radio size={13} color={c.color} />}
                    {n.type === 'match'   && <Signal size={13} color={c.color} />}
                    {n.type === 'alert'   && <OctagonAlert size={13} color={c.color} />}
                    {n.type === 'info'    && <Bell size={13} color={c.color} />}
                    {n.type === 'success' && <CircleCheck size={13} color={c.color} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[13px] font-medium text-[color:var(--text)]">{n.title}</span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />}
                    </div>
                    <div className="text-xs leading-relaxed text-[color:var(--muted)]">{n.message}</div>
                    <div className="text-[11px] mt-0.5 text-[color:var(--faint)]">{timeAgo(n.timestamp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
NotificationBell.displayName = 'NotificationBell';

// ─── TopBar ───────────────────────────────────────────────────
export const TopBar = memo(function TopBar({ userName, isDark, isNight = false, isLight = false, onToggleTheme, onRefresh, title = 'Dashboard', onMenuToggle, menuOpen }: {
  userName: string; isDark: boolean; isNight?: boolean; isLight?: boolean;
  onToggleTheme: () => void; onRefresh?: () => void; title?: string; onMenuToggle?: () => void; menuOpen?: boolean;
}) {
  const initial = userName?.[0]?.toUpperCase() || 'G';
  return (
    <div className="flex items-center gap-3 sticky top-0 z-40 shrink-0 backdrop-blur-lg h-[60px] px-5 bg-[color:var(--topbar-bg)] border-b border-[color:var(--border)] text-[color:var(--text)]">
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="grid place-items-center rounded-lg border-none cursor-pointer transition-colors shrink-0 w-[34px] h-[34px] text-[color:var(--muted)] bg-[color:var(--surface2)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface3)]"
        >
          <Icon name={menuOpen ? 'menu1' : 'menu0'} size={18} />
        </button>
      )}
      <div>
        <div className="text-[11px] font-normal text-[color:var(--muted)] tracking-[.02em]">
          {isNight ? 'Night control room' : isLight ? 'Day mode' : 'Dark studio mode'}
        </div>
        <div className="font-semibold leading-tight text-[16px] tracking-[-0.03em] text-[color:var(--text)] truncate max-w-[140px] sm:text-[22px] sm:max-w-none">{title}</div>
      </div>
      <div className="flex-1" />
      <button
        onClick={onToggleTheme}
        className="flex items-center gap-1.5 rounded-lg border cursor-pointer text-[13px] font-normal shrink-0 transition-all h-9 px-3 border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] hover:border-[color:var(--green)]/40 hover:text-[color:var(--green)]"
      >
        <Icon name={isLight ? 'sun' : 'moon'} size={15} />
        <span className="hidden sm:inline">{isNight ? 'Night' : isLight ? 'Day' : 'Dark'}</span>
      </button>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="grid place-items-center rounded-lg border-none cursor-pointer shrink-0 w-[34px] h-[34px] text-[color:var(--muted)] bg-[color:var(--surface2)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface3)] transition-colors"
        >
          <Icon name="refresh" size={17} />
        </button>
      )}
      <NotificationBell />
      <div className="grid place-items-center rounded-lg font-semibold text-white text-[13px] shrink-0 w-[34px] h-[34px] bg-gradient-to-br from-blue-500 to-pink-500">
        {initial}
      </div>
    </div>
  );
});
TopBar.displayName = 'TopBar';

// ─── StatCard ─────────────────────────────────────────────────
export const StatCard = memo(function StatCard({ label, count, color, iconName }: {
  label: string; count: number; color: string; iconName: string; isDark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg p-3.5 broadcast-card sm:p-5 sm:gap-4">
      <div className="flex items-center justify-between">
        <div className="grid place-items-center rounded-lg w-8 h-8 sm:w-[38px] sm:h-[38px]" style={{ background: `${color}20`, color }}>
          <Icon name={iconName} size={18} />
        </div>
        <span className="text-[11px] font-medium text-[color:var(--muted)] uppercase tracking-wide">Matches</span>
      </div>
      <div>
        <div className="font-semibold leading-none text-[26px] tracking-[-0.04em] text-[color:var(--text)] font-mono sm:text-[36px]">{count}</div>
        <div className="text-xs mt-1 font-normal text-[color:var(--muted)]">{label}</div>
      </div>
    </div>
  );
});
StatCard.displayName = 'StatCard';

// ─── MatchCard ────────────────────────────────────────────────
export const MatchCard = memo(function MatchCard({ match, onClick }: { match: any; isDark?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-lg p-4 cursor-pointer transition-all border border-[color:var(--border)] bg-[color:var(--card-bg)] hover:border-green-500/30 hover:shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] font-medium text-[color:var(--muted)] tracking-wide mb-0.5 uppercase">{match.id||""}</div>
          <div className="text-[11px] text-[color:var(--faint)]">{match.date} · {match.time}</div>
        </div>
        <StatusBadge status={match.status} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-right">
          <div className="text-[13px] font-medium text-[color:var(--text)] leading-tight truncate sm:text-[14px]">{match.homeTeam?.name || 'Home'}</div>
          <div className="text-[11px] text-[color:var(--faint)] mt-0.5">Home</div>
        </div>
        <div className="text-center min-w-[52px] px-1">
          <div className="font-semibold text-[20px] tracking-tight text-[color:var(--text)] font-mono leading-none">
            {match.homeTeam?.goals ?? 0}–{match.awayTeam?.goals ?? 0}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-medium text-[color:var(--text)] leading-tight truncate sm:text-[14px]">{match.awayTeam?.name || 'Away'}</div>
          <div className="text-[11px] text-[color:var(--faint)] mt-0.5">Away</div>
        </div>
      </div>
      <div className="flex gap-3 items-center flex-wrap">
        <span className="flex items-center gap-1 text-[11px] text-[color:var(--faint)]"><Icon name="location" size={11} />{match.stadium || '—'}</span>
        <span className="flex items-center gap-1 text-[11px] text-[color:var(--faint)]"><Icon name="eye" size={11} />{match.viewers ?? 0}</span>
        <span className="flex items-center gap-1 text-[11px] text-[color:var(--faint)]"><Icon name="camera" size={11} />{match.camera ?? 0} cams</span>
      </div>
    </div>
  );
});
MatchCard.displayName = 'MatchCard';

// ─── Shimmer skeletons ────────────────────────────────────────
const SH = 'animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-black/[0.04] via-black/[0.08] to-black/[0.04] rounded shrink-0';

export function MatchCardSkeleton() {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-3 border border-[color:var(--border)] bg-[color:var(--card-bg)]">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5"><div className={`${SH} h-2.5 w-20`} /><div className={`${SH} h-2.5 w-28`} /></div>
        <div className={`${SH} h-5 w-14 rounded`} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-end gap-1.5"><div className={`${SH} h-3 w-3/4`} /><div className={`${SH} h-2.5 w-1/2`} /></div>
        <div className={`${SH} h-6 w-10 rounded`} />
        <div className="flex-1 flex flex-col gap-1.5"><div className={`${SH} h-3 w-3/4`} /><div className={`${SH} h-2.5 w-1/2`} /></div>
      </div>
      <div className="flex gap-4"><div className={`${SH} h-2.5 w-24`} /><div className={`${SH} h-2.5 w-16`} /><div className={`${SH} h-2.5 w-12`} /></div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg p-5 flex flex-col gap-4 border border-[color:var(--border)] bg-[color:var(--card-bg)]">
      <div className="flex items-center justify-between"><div className={`${SH} h-10 w-10 rounded-lg`} /><div className={`${SH} h-4 w-14`} /></div>
      <div className="flex flex-col gap-2 mt-1"><div className={`${SH} h-9 w-1/2 rounded`} /><div className={`${SH} h-3 w-[65%]`} /></div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="rounded-lg px-4 py-3.5 flex items-center justify-between gap-4 border border-[color:var(--border)] bg-[color:var(--card-bg)]">
      <div className="flex flex-col gap-1.5 flex-1"><div className={`${SH} h-3 w-2/5`} /><div className={`${SH} h-2.5 w-[28%]`} /></div>
      <div className="flex items-center gap-2"><div className={`${SH} h-5 w-12 rounded`} /><div className={`${SH} h-7 w-7 rounded-lg`} /><div className={`${SH} h-7 w-7 rounded-lg`} /></div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-5 pb-10">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.45fr)_minmax(260px,.75fr)]">
        <div className="rounded-lg p-5 flex flex-col gap-3 border border-[color:var(--border)] bg-[color:var(--card-bg)]">
          <div className={`${SH} h-2.5 w-[35%]`} /><div className={`${SH} h-9 w-[60%] rounded`} />
          <div className="grid grid-cols-3 gap-2 mt-2">{[0, 1, 2].map(i => <div key={i} className="rounded-lg p-3 flex flex-col gap-2 border border-[color:var(--border)] bg-[color:var(--card-bg)]"><div className={`${SH} h-2 w-[55%]`} /><div className={`${SH} h-4 w-[38%]`} /></div>)}</div>
        </div>
        <div className="rounded-lg p-4 flex flex-col gap-3 border border-[color:var(--border)] bg-[color:var(--card-bg)]"><MatchCardSkeleton /></div>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}</div>
    </div>
  );
}

export function MatchesListSkeleton({ count = 6 }: { count?: number }) {
  return <div className="flex flex-col gap-2">{Array.from({ length: count }).map((_, i) => <TableRowSkeleton key={i} />)}</div>;
}

export function LineupSkeleton() {
  return (
    <div className="w-full p-5 pb-10 flex flex-col gap-4">
      <div className="rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap border border-[color:var(--border)] bg-[color:var(--card-bg)]">
        <div className="flex flex-col gap-2"><div className={`${SH} h-2.5 w-24`} /><div className={`${SH} h-6 w-44`} /></div>
        <div className="flex gap-2"><div className={`${SH} h-9 w-20 rounded-lg`} /><div className={`${SH} h-9 w-28 rounded-lg`} /></div>
      </div>
      <div className="flex gap-2"><div className={`${SH} h-10 flex-1 rounded-lg`} /><div className={`${SH} h-10 flex-1 rounded-lg`} /></div>
      <div className="flex gap-2 flex-wrap">{[60, 52, 72, 60, 52, 56, 60].map((w, i) => <div key={i} className={`${SH} h-7 rounded-lg`} style={{ width: w }} />)}</div>
      <div className="grid gap-4 lineup-layout-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="flex flex-col gap-3"><div className={`${SH} w-full rounded-lg`} style={{ aspectRatio: '3/2' }} /></div>
        <div className="flex flex-col gap-3 rounded-lg p-3 border border-[color:var(--border)] bg-[color:var(--card-bg)]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg border border-[color:var(--border)]">
              <div className={`${SH} w-7 h-7 rounded-full shrink-0`} />
              <div className="flex flex-col gap-1.5 flex-1"><div className={`${SH} h-2.5 w-3/4`} /><div className={`${SH} h-2 w-1/2`} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────
export const EmptyState = memo(function EmptyState({ icon, title, subtitle, action }: {
  icon: string; title: string; subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center py-12 gap-3 text-center">
      <div className="text-[color:var(--faint)]"><Icon name={icon} size={40} /></div>
      <div className="text-sm font-medium text-[color:var(--text)]">{title}</div>
      {subtitle && <div className="text-xs font-normal text-[color:var(--muted)]">{subtitle}</div>}
      {action && (
        <a href={action.href}
          className="mt-1 inline-flex items-center gap-1.5 px-4 h-8 rounded-lg bg-[color:var(--green)] text-white text-[12px] font-semibold no-underline hover:opacity-90 transition-opacity">
          {action.label}
        </a>
      )}
    </div>
  );
});
EmptyState.displayName = 'EmptyState';

export const SectionHeader = memo(function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-[15px] font-medium text-[color:var(--text)] tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs mt-0.5 font-normal text-[color:var(--muted)]">{subtitle}</p>}
    </div>
  );
});
SectionHeader.displayName = 'SectionHeader';

// ─── Auth components ──────────────────────────────────────────
export function AuthShell({ children, maxWidth = 480, variant = 'login' }: { children: React.ReactNode; maxWidth?: number; variant?: 'login' | 'register' }) {
  const isReg = variant === 'register';
  const slides = isReg ? [
    { icon: 'soccer',        kicker: 'Workspace setup',   title: 'Create your club control room.', body: 'Set up fixtures, squads, lineups, sponsor campaigns, and live operations.' },
    { icon: 'lineup',        kicker: 'Tactical graphics', title: 'Prepare match visuals before kickoff.', body: 'Build formations, assign captains, prepare substitutes for broadcast.' },
    { icon: 'advertisement', kicker: 'Sponsor ready',     title: 'Bring advertisers into match day.', body: 'Manage placements, validate durations, and inject ads into the live pipeline.' },
  ] : [
    { icon: 'live-tv', kicker: 'Live match control', title: 'Access the broadcast control room.', body: 'Monitor stream status, manage match assets, and keep every operation ready.' },
    { icon: 'camera',  kicker: 'Video pipeline',    title: 'Camera to output, fully visible.',  body: 'Track camera, encoder, overlay, ad injector, and output readiness.' },
    { icon: 'gauge',   kicker: 'Stream health',     title: 'See what matters instantly.',       body: 'Bitrate, FPS, latency, and connection state in broadcast-style panels.' },
  ];

  return (
    <main className="grid w-screen h-screen overflow-hidden bg-[color:var(--app-bg)] text-[color:var(--text)]"
      style={{ gridTemplateColumns: 'minmax(420px,520px) minmax(0,1fr)' }}>
      <section
        className="flex items-center justify-center overflow-y-auto overflow-x-hidden h-screen border-r border-[color:var(--border)] bg-[color:var(--surface)]"
        style={{ padding: 'clamp(24px,4vw,52px)' }}
      >
        <div style={{ width: '100%', maxWidth }}>
          <Link href="/" className="inline-flex items-center gap-3 mb-8 no-underline text-[color:var(--text)]">
            <span className="grid place-items-center rounded-lg w-10 h-10 shrink-0 bg-gradient-to-br from-blue-600 to-green-600">
              <Icon name="live-tv" size={20} className="text-white" />
            </span>
            <span>
              <strong className="block text-[17px] font-semibold tracking-tight text-[color:var(--text)]">Switch6</strong>
              <small className="block text-[11px] font-normal text-[color:var(--muted)] mt-px">Sports Broadcast OS</small>
            </span>
          </Link>
          {children}
        </div>
      </section>

      <aside className="relative overflow-hidden h-screen bg-[#0F1724]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 480, height: 480, right: -140, top: -110, background: 'radial-gradient(circle,rgba(10,143,82,.22),transparent 60%)' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 560, height: 560, left: -200, bottom: -200, background: 'radial-gradient(circle,rgba(26,95,212,.16),transparent 62%)' }} />
        <div className="relative z-10 h-full flex flex-col justify-between" style={{ padding: 'clamp(28px,5vw,56px)' }}>
          <div className="inline-flex items-center gap-2 rounded-full w-max px-3 py-2 border border-red-500/30 bg-red-500/10 text-red-300 text-[11px] font-medium tracking-[.06em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-[pulse-dot_1.4s_ease-in-out_infinite]" />
            <strong>{isReg ? 'New workspace' : 'System ready'}</strong>
            <em className="text-white/40 not-italic">Broadcast-grade match ops</em>
          </div>

          <div className="w-full overflow-hidden my-auto" style={{ ['--slide-count' as any]: slides.length }}>
            <div className="flex" style={{ width: `calc(${slides.length}*100%)`, animation: 'elite-auth-slide 15s infinite ease-in-out' }}>
              {slides.map((s, i) => (
                <article key={i} style={{ width: `calc(100%/${slides.length})`, flexShrink: 0, paddingRight: 48 }}>
                  <div className="grid place-items-center rounded-xl mb-5 w-[52px] h-[52px] border border-green-500/25 bg-green-500/10 text-green-400">
                    <Icon name={s.icon} size={26} />
                  </div>
                  <p className="mb-3 text-[11px] font-medium tracking-[.08em] uppercase text-white/40">{s.kicker}</p>
                  <h2 className="font-semibold leading-[.92] text-[#EEF2FA] tracking-[-0.04em]"
                    style={{ maxWidth: 520, margin: 0, fontSize: 'clamp(40px,6vw,68px)' }}>{s.title}</h2>
                  <span className="block mt-4 leading-relaxed text-[15px] text-[rgba(200,215,235,.72)]"
                    style={{ maxWidth: 520 }}>{s.body}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 border border-white/10 bg-white/[0.04]">
            <div className="flex justify-between items-center mb-3 text-[11px] font-medium tracking-[.06em] uppercase text-white/40">
              <span>Control room</span>
              <b className="text-green-400">{isReg ? 'Setup' : 'Online'}</b>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              {[['camera', 'Camera'], ['encoder', 'Encoder'], ['overlay', 'Overlay'], ['advertisement', 'Ads'], ['output', 'Output']].map(([icon, label], idx) => (
                <div key={label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#EEF2FA]">
                  <Icon name={icon} size={14} /><span>{label}</span>
                  {idx < 4 && <span className="inline-block h-px w-4 bg-white/20" />}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[['1080p', 'Output'], ['60fps', 'Target'], ['Low', 'Latency']].map(([val, lbl]) => (
                <div key={lbl} className="rounded-lg p-2.5 border border-white/10 bg-white/[0.04]">
                  <strong className="block text-[22px] font-semibold leading-none text-green-400 font-mono">{val}</strong>
                  <span className="block mt-1.5 text-[10px] font-medium tracking-[.06em] uppercase text-white/35">{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

export function AuthHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="grid place-items-center rounded-xl mb-4 w-11 h-11 border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--green)]">
        <Icon name={icon} size={22} />
      </div>
      <p className="mb-2 text-[11px] font-medium tracking-[.06em] uppercase text-[color:var(--muted)]">
        {title.toLowerCase().includes('create') ? 'Start broadcast workspace' : 'Secure control room access'}
      </p>
      <h1 className="font-semibold leading-none text-[color:var(--text)] tracking-[-0.035em]"
        style={{ fontSize: 'clamp(32px,5vw,46px)' }}>
        {title}<span className="text-[color:var(--green)]">.</span>
      </h1>
      {subtitle && <span className="block mt-3 text-sm leading-relaxed text-[color:var(--muted)]">{subtitle}</span>}
    </div>
  );
}

export function AuthNotice({ type, message }: { type: 'error' | 'success' | 'info'; message: string }) {
  const cls = type === 'error'
    ? 'text-[color:var(--red)] bg-red-500/[0.06] border-red-500/25'
    : type === 'success'
    ? 'text-[color:var(--green)] bg-green-500/[0.06] border-green-500/[0.22]'
    : 'text-[color:var(--blue)] bg-blue-500/[0.05] border-blue-500/[0.22]';
  return (
    <div className={`flex items-start gap-2 mb-4 rounded-lg text-[13px] font-medium leading-snug px-3 py-2.5 border ${cls}`}>
      <Icon name={type === 'error' ? 'error' : type === 'success' ? 'check' : 'shield'} size={16} />
      <span>{message}</span>
    </div>
  );
}

export function InputField({ label, type = 'text', value, onChange, error, icon, rightSlot, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; error?: string; icon: string; rightSlot?: React.ReactNode; placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block mb-1.5 text-xs font-medium text-[color:var(--muted)] tracking-[.03em] ml-0.5">{label}</label>
      <div className={`relative flex items-center rounded-lg transition-all min-h-[48px] border bg-[color:var(--field-bg)] ${error ? 'border-red-500/50 focus-within:border-red-500/70' : 'border-[color:var(--border)] focus-within:border-[color:var(--green)]/60'}`}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center text-[color:var(--faint)]">
          <Icon name={icon} size={16} />
        </span>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full border-0 outline-none bg-transparent text-[15px] font-normal text-[color:var(--text)] h-[48px] pl-[42px] pr-11 placeholder:text-[color:var(--faint)]"
        />
        {rightSlot && <span className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center">{rightSlot}</span>}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-[color:var(--red)] ml-0.5">{error}</p>}
    </div>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  const label = score <= 2 ? 'Weak' : score <= 4 ? 'Medium' : 'Strong';
  const color = score <= 2 ? 'var(--red)' : score <= 4 ? 'var(--gold)' : 'var(--green)';
  return (
    <div className="mb-3 -mt-0.5">
      <div className="flex justify-between items-center mb-1.5 text-[11px] font-medium text-[color:var(--muted)]">
        <span>Password strength</span>
        <b style={{ color }}>{password ? label : 'Required'}</b>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} className="block h-[3px] rounded-full transition-colors" style={{ background: i < score ? color : 'var(--border)' }} />
        ))}
      </div>
    </div>
  );
}

export function RoleSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const roles = [
    { key: 'broadcaster', label: 'Broadcaster', icon: 'camera',        desc: 'Create matches, squads, Manage streams and overlays' },
    { key: 'advertiser',  label: 'Advertiser',  icon: 'advertisement', desc: 'Run sponsor campaigns' },
  ];
  return (
    <div className="mb-3">
      <label className="block mb-1.5 text-xs font-medium text-[color:var(--muted)] tracking-[.03em] ml-0.5">Workspace context</label>
      <div className="grid grid-cols-3 gap-2">
        {roles.map(r => (
          <button key={r.key} type="button" onClick={() => onChange(r.key)}
            className={`text-left rounded-lg p-3 cursor-pointer transition-all border min-h-[80px]
              ${value === r.key
                ? 'border-green-500/50 bg-green-500/[0.07]'
                : 'border-[color:var(--border)] bg-[color:var(--surface2)] hover:border-green-500/25'}`}
          >
            <span className={value === r.key ? 'text-[color:var(--green)]' : 'text-[color:var(--muted)]'}>
              <Icon name={r.icon} size={16} />
            </span>
            <span className="block mt-2 text-xs font-medium text-[color:var(--text)]">{r.label}</span>
            <small className="block mt-1 text-[10px] leading-snug text-[color:var(--muted)]">{r.desc}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PrimaryButton({ label, loading, onClick, disabled, fullWidth = false, loadingLabel }: {
  label: string; loading?: boolean; onClick?: () => void; disabled?: boolean; fullWidth?: boolean; loadingLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      type="button"
      className={`flex items-center justify-center gap-2 rounded-lg border-none cursor-pointer font-medium text-sm text-white transition-all min-h-[44px] px-5 bg-[color:var(--green)] disabled:opacity-50 hover:opacity-90 ${fullWidth ? 'w-full' : 'min-w-[160px]'}`}
    >
      {loading && <span className="spinner" />}
      {loading ? (loadingLabel || 'Processing…') : label}
    </button>
  );
}

// ─── PageShell ────────────────────────────────────────────────
export function PageShell({ children, title }: { children: React.ReactNode; title: string }) {
  const { isDark, isNight, isLight, toggle } = useTheme();
  
  // 1. Updated state to track the specific architecture being downloaded
  const [downloadingArch, setDownloadingArch] = useState<'arm64' | 'arm32' | null>(null);
  
  const [collapsed, setCollapsed]     = useState(false);
  const [isMobile, setIsMobile]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userName, setUserName]       = useState('Guest');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setUserName(UserPrefs.get()?.name ?? 'Guest');
    const check = () => {
      const mob = window.innerWidth < 768;
      setIsMobile(mob);
      if (mob) { setCollapsed(true); setMobileOpen(false); }
    };
    check();
    const saved = window.localStorage.getItem('switch6-sidebar-collapsed');
    if (saved !== null && window.innerWidth >= 768) setCollapsed(saved === 'true');
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggleCollapsed = useCallback(() => {
    if (isMobile) { setMobileOpen(p => !p); }
    else { setCollapsed(p => { const n = !p; window.localStorage.setItem('switch6-sidebar-collapsed', String(n)); return n; }); }
  }, [isMobile]);

  // 2. Updated download handler to accept the architecture and adjust the URL/filename
  const handleDownload = useCallback(async (arch: 'arm64' | 'arm32') => {
    setDownloadingArch(arch);
    try {
      // Adjust the filename based on the selected architecture
      const fileName = arch === 'arm64' ? 'Switch6-arm64.apk' : 'Switch6-arm32.apk';
      const res = await fetch(`${BASE_URL}/download/${fileName}`);
      
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = fileName; 
      
      // Best practice: append to DOM before clicking (fixes issues in Safari/Firefox)
      document.body.appendChild(a); 
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Optionally trigger a toast notification here
    } finally { 
      setDownloadingArch(null); 
    }
  }, []);

  return (
    <div className="app-shell grid h-screen w-full overflow-hidden bg-[color:var(--app-bg)]"
      style={{ gridTemplateColumns: 'auto minmax(0,1fr)' }}>
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[49] bg-black/50 backdrop-blur-sm" />
      )}
      <div style={isMobile ? { position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform .25s cubic-bezier(0.32,0,0.12,1)' } : {}}>
        {/* 3. Pass the new props to Sidebar */}
        <Sidebar 
          userName={userName} 
          onDownload={handleDownload} 
          downloadingArch={downloadingArch} 
          collapsed={isMobile ? false : collapsed} 
        />
      </div>
      <div className="app-workspace flex h-screen min-w-0 flex-col overflow-hidden" style={isMobile ? { gridColumn: '1/-1' } : {}}>
        <TopBar userName={userName} isDark={isDark} isNight={isNight} isLight={isLight} onToggleTheme={toggle} title={title} onMenuToggle={toggleCollapsed} menuOpen={isMobile ? mobileOpen : !collapsed} />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Btn ──────────────────────────────────────────────────────
export const Btn = memo(function Btn({
  children, onClick, variant = 'primary', size = 'md',
  disabled, loading, type = 'button', fullWidth, icon, className = '',
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  const sizeClass = size === 'sm'
    ? 'h-[30px] px-2.5 text-xs'
    : size === 'lg'
    ? 'h-[46px] px-5 text-[15px]'
    : 'h-9 px-3.5 text-[13px]';

  const variantClass = {
    primary:   'bg-[color:var(--green)] text-white border-none hover:opacity-90',
    secondary: 'bg-[color:var(--surface2)] text-[color:var(--text)] border border-[color:var(--border)] hover:border-[color:var(--green)]/30',
    ghost:     'bg-transparent text-[color:var(--muted)] border border-[color:var(--border)] hover:text-[color:var(--text)]',
    danger:    'bg-red-500/[0.08] text-[color:var(--red)] border border-red-500/25 hover:bg-red-500/15',
    outline:   'bg-transparent text-[color:var(--green)] border border-green-500/45 hover:bg-green-500/[0.07]',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-all rounded-lg font-medium shrink-0 disabled:opacity-55 ${sizeClass} ${variantClass} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? <span className="spinner" /> : icon}
      {children}
    </button>
  );
});
Btn.displayName = 'Btn';

// ─── SectionCard ──────────────────────────────────────────────
export const SectionCard = memo(function SectionCard({
  children, title, subtitle, action, className = '', noPad = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  noPad?: boolean;
}) {
  return (
    <div className={`rounded-lg overflow-hidden broadcast-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-[color:var(--border)]">
          <div>
            {title && <div className="text-[14px] font-medium text-[color:var(--text)] tracking-tight">{title}</div>}
            {subtitle && <div className="text-xs font-normal mt-0.5 text-[color:var(--muted)]">{subtitle}</div>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={noPad ? undefined : 'p-4'}>
        {children}
      </div>
    </div>
  );
});
SectionCard.displayName = 'SectionCard';

// ─── AppShell alias ───────────────────────────────────────────
export { PageShell as AppShell };
