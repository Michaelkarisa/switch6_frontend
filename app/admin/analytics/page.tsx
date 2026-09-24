'use client';

import {
  useCallback, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { PageShell, Icon } from '@/components/ui';
import {
  adminGetAuditLogs,
  adminGetRevenue,
  adminGetUserGrowth,
  adminGetMatchAnalytics,
  adminGetAdPerformance,
  adminGetDeviceAnalytics,
  adminGetLogAnalytics,
  type AuditLogRow, type RevenueRow, type UserGrowthRow,
  type AdminMatchAnalyticsData, type AdminAdPerformanceData,
  type AdminDeviceAnalyticsData, type AdminLogAnalyticsData,
  type Paginated,
} from '@/lib/api';
import { useRoleGuard }    from '@/lib/auth';
import { ROLES }           from '@/lib/api';
import {
  TrendingUp, TrendingDown, BarChart3, Users, DollarSign,
  ShoppingCart, Activity, RefreshCw, Monitor, Smartphone,
  Tablet, Globe, Cpu, Zap, Eye, Play, CheckCircle2, Clock,
  AlertTriangle, Tv
} from 'lucide-react';

// ─── palette ─────────────────────────────────────────────────
const GREEN   = '#0a8f52';
const BLUE    = '#1a5fd4';
const GOLD    = '#c47f00';
const RED     = '#c0291d';
const PURPLE  = '#7c3aed';
const TEAL    = '#0891b2';
const MUTED   = '#6b7280';
const PIE_COLORS = [GREEN, BLUE, GOLD, RED, PURPLE, TEAL, '#ec4899', '#f97316'];

type Tab =
  | 'revenue' | 'growth' | 'matches'
  | 'ads' | 'devices' | 'logs' | 'audit';

type ChartType = 'area' | 'bar' | 'line';

// ─── helpers ─────────────────────────────────────────────────
const kes  = (n?: number) =>{
console.log("number",n);
  return `KES ${(n ?? 0).toLocaleString()}`;
}

const fmt  = (n: number) =>
  n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${(n/1_000).toFixed(1)}K`      : String(n);

const pctChg = (arr: number[]) => {
  if (arr.length < 2) return null;
  const half = Math.floor(arr.length / 2);
  const prev = arr.slice(0, half).reduce((a, b) => a + b, 0);
  const curr = arr.slice(half).reduce((a, b) => a + b, 0);
  if (prev === 0) return null;
  return ((curr - prev) / prev * 100).toFixed(1);
};

function useDebounce<T>(value: T, delay = 400): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function getStatusBadge(code?: number) {
  if (!code) return { label: '—',              bg: 'bg-gray-500/10',  text: 'text-gray-500'  };
  if (code < 300) return { label: `${code} OK`,        bg: 'bg-green-500/10', text: 'text-green-600' };
  if (code < 400) return { label: `${code} Redirect`,  bg: 'bg-blue-500/10',  text: 'text-blue-600'  };
  if (code < 500) return { label: `${code} Client Err`,bg: 'bg-amber-500/10', text: 'text-amber-600' };
  return               { label: `${code} Server Err`, bg: 'bg-red-500/10',   text: 'text-red-600'   };
}

// ─── shared sub-components ───────────────────────────────────

function KpiCard({
  icon, label, value, sub, color, change,
}: {
  icon: ReactNode; label: string; value: string;
  sub?: string; color: string; change?: string | null;
}) {
  const up = change ? parseFloat(change) >= 0 : null;
  return (
    <div className="stat-card-gradient rounded-xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="grid place-items-center w-10 h-10 rounded-lg"
          style={{ background: color + '20', color }}>
          {icon}
        </div>
        {change != null && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(parseFloat(change!))}%
          </div>
        )}
      </div>
      <div>
        <div className="text-[24px] font-semibold leading-none tracking-[-0.03em] text-[color:var(--text)] sm:text-[26px]">{value}</div>
        <div className="text-[13px] font-medium text-[color:var(--text)] mt-1.5">{label}</div>
        {sub && <div className="text-[12px] text-[color:var(--muted)] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

type CTP = {
  active?: boolean;
  payload?: Array<{ name: string; value: unknown; color: string }>;
  label?: string;
  formatter?: (v?: number) => string;
};
function ChartTooltip({ active, payload, label, formatter }: CTP) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 shadow-xl text-[12px]">
      <div className="font-semibold text-[color:var(--muted)] mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[color:var(--text2)] capitalize">{p.name}:</span>
          <span className="font-semibold text-[color:var(--text)]">
            {formatter
              ? formatter(p.value as number)
              : ((p.value as number) ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartToggle({ value, onChange }: { value: ChartType; onChange: (v: ChartType) => void }) {
  return (
    <div className="flex gap-1 p-0.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)]">
      {(['area', 'bar', 'line'] as ChartType[]).map(t => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`px-2.5 h-6 rounded text-[11px] font-medium capitalize transition-all
            ${value === t
              ? 'bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm'
              : 'text-[color:var(--muted)]'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[13px] font-semibold text-[color:var(--text)] mb-4">{children}</div>
  );
}

function ChartSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className={`grid grid-cols-2 gap-3 xl:grid-cols-${rows}`}>
        {Array.from({ length: rows }).map((_, i) =>
          <div key={i} className="h-28 rounded-lg animate-pulse bg-[color:var(--surface2)]" />
        )}
      </div>
      <div className="h-72 rounded-lg animate-pulse bg-[color:var(--surface2)]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-52 rounded-lg animate-pulse bg-[color:var(--surface2)]" />
        <div className="h-52 rounded-lg animate-pulse bg-[color:var(--surface2)]" />
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="broadcast-card rounded-lg p-10 text-center text-[color:var(--muted)]">
      <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
      <div className="font-semibold text-[color:var(--text)]">{message}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span className="block text-[11px] font-medium uppercase tracking-[.05em] text-[color:var(--muted)] mb-1">{label}</span>
      <div className="text-[13px] text-[color:var(--text)] break-words">{value}</div>
    </div>
  );
}

// ─── PieCard helper ───────────────────────────────────────────
function PieCard({
  title, data, colors = PIE_COLORS,
}: {
  title: string;
  data: { name: string; value: number }[];
  colors?: string[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="broadcast-card rounded-lg p-4">
      <SectionTitle>{title}</SectionTitle>
      {total === 0 ? (
        <div className="h-40 flex items-center justify-center text-[color:var(--muted)] text-[13px]">No data</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={70}
                dataKey="value" nameKey="name">
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => [(v as number).toLocaleString(), '']} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span className="text-[11px] text-[color:var(--muted)]">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          {/* Breakdown list */}
          <div className="flex flex-col gap-1.5 mt-2">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: colors[i % colors.length] }} />
                  <span className="text-[color:var(--text2)]">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[color:var(--text)]">
                    {d.value.toLocaleString()}
                  </span>
                  <span className="text-[color:var(--muted)] w-10 text-right">
                    {total > 0 ? Math.round(d.value / total * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Revenue tab ─────────────────────────────────────────────
function RevenueCharts({ data, loading }: { data: RevenueRow[]; loading: boolean }) {
  const [chartType, setChartType] = useState<ChartType>('area');
  const totalRevenue   = useMemo(() => data.reduce((s, r) => s + r.total, 0), [data]);
  const totalTx        = useMemo(() => data.reduce((s, r) => s + r.transactions, 0), [data]);
  const avgDaily       = useMemo(() => data.length ? Math.round(totalRevenue / data.length) : 0, [data, totalRevenue]);
  const peakDay        = useMemo(() => data.reduce((b, r) => r.total > b.total ? r : b,
    data[0] ?? { date: '—', total_kes: 0, transactions: 0 }), [data]);
  const revChange      = pctChg(data.map(r => r.total));
  const txChange       = pctChg(data.map(r => r.transactions));

  const sorted  = [...data].sort((a, b) => b.total - a.total);
  const top20   = sorted.slice(0, Math.ceil(sorted.length * 0.2)).reduce((s, r) => s + r.total, 0);
  const pieData = [
    { name: 'Top 20% days', value: top20 },
    { name: 'Other days',   value: totalRevenue - top20 },
  ].filter(d => d.value > 0);

  if (loading) return <ChartSkeleton />;
  if (!data.length) return <EmptyChart message="No revenue data for this period" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={<DollarSign size={18}/>} label="Total revenue"  value={kes(totalRevenue)}      color={GREEN} change={revChange} />
        <KpiCard icon={<ShoppingCart size={18}/>} label="Transactions" value={fmt(totalTx)}            color={BLUE}  change={txChange} />
        <KpiCard icon={<Activity size={18}/>}   label="Daily average"  value={kes(avgDaily)}           color={GOLD}  />
        <KpiCard icon={<TrendingUp size={18}/>} label="Peak day"       value={kes(peakDay.total)}  color={RED}   sub={peakDay.date} />
      </div>

      <div className="broadcast-card rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <SectionTitle>Revenue over time</SectionTitle>
            <div className="text-[12px] text-[color:var(--muted)] -mt-3">{data.length} data points</div>
          </div>
          <ChartToggle value={chartType} onChange={setChartType} />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={52} />
              <Tooltip content={<ChartTooltip formatter={kes} />} />
              <Bar dataKey="total_kes" name="Revenue" fill={GREEN} radius={[3,3,0,0]} />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={52} />
              <Tooltip content={<ChartTooltip formatter={kes} />} />
              <Line type="monotone" dataKey="total_kes" name="Revenue" stroke={GREEN} strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={52} />
              <Tooltip content={<ChartTooltip formatter={kes} />} />
              <Area type="monotone" dataKey="total_kes" name="Revenue" stroke={GREEN} strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PieCard title="Revenue concentration" data={pieData} />
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Transactions per day</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="transactions" name="Transactions" fill={BLUE} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Growth tab ───────────────────────────────────────────────
function GrowthCharts({ data, loading }: { data: UserGrowthRow[]; loading: boolean }) {
  const [chartType, setChartType] = useState<ChartType>('area');
  const totalNew   = useMemo(() => data.reduce((s, r) => s + r.new_users, 0), [data]);
  const avgDaily   = useMemo(() => data.length ? Math.round(totalNew / data.length) : 0, [data, totalNew]);
  const peakDay    = useMemo(() => data.reduce((b, r) => r.new_users > b.new_users ? r : b,
    data[0] ?? { date: '—', new_users: 0 }), [data]);

  const cumulative = useMemo(() => {
    let running = 0;
    return data.map(r => { running += r.new_users; return { ...r, cumulative: running }; });
  }, [data]);

  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowData = useMemo(() => {
    const buckets = Array(7).fill(0);
    data.forEach(r => { const d = new Date(r.date).getDay(); buckets[d] += r.new_users; });
    return DAYS.map((day, i) => ({ day, users: buckets[i] }));
  }, [data]);

  const growthChange = pctChg(data.map(r => r.new_users));

  if (loading) return <ChartSkeleton />;
  if (!data.length) return <EmptyChart message="No growth data for this period" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={<Users size={18}/>}     label="New users (period)" value={fmt(totalNew)}  color={BLUE}   change={growthChange} />
        <KpiCard icon={<TrendingUp size={18}/>} label="Daily average"     value={fmt(avgDaily)}  color={GREEN}  />
        <KpiCard icon={<Activity size={18}/>}  label="Peak day"           value={fmt(peakDay.new_users)} sub={peakDay.date} color={GOLD} />
        <KpiCard icon={<Users size={18}/>}     label="Cumulative"         value={fmt(cumulative[cumulative.length-1]?.cumulative ?? 0)} color={PURPLE} />
      </div>

      <div className="broadcast-card rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <SectionTitle>New signups per day</SectionTitle>
          <ChartToggle value={chartType} onChange={setChartType} />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="new_users" name="New users" fill={BLUE} radius={[3,3,0,0]} />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="new_users" name="New users" stroke={BLUE} strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="growGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BLUE} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="new_users" name="New users" stroke={BLUE} strokeWidth={2} fill="url(#growGrad)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Cumulative growth</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cumulative} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="cumulative" name="Total users" stroke={GREEN} strokeWidth={2} fill="url(#cumGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Signups by day of week</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="day" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="users" name="Signups" radius={[3,3,0,0]}>
                {dowData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Match analytics tab ──────────────────────────────────────
function MatchCharts({ data, loading }: { data: AdminMatchAnalyticsData | null; loading: boolean }) {
  if (loading) return <ChartSkeleton rows={4} />;
  if (!data) return <EmptyChart message="No match data available" />;

  const perDay      = data.per_day      ?? [];
  const byStatus    = data.by_status    ?? {};
  const byLeague    = data.by_league    ?? [];
  const byHour      = data.by_hour      ?? [];
  const viewerStats = data.viewer_stats ?? { total_viewers: 0, avg_viewers: 0, peak_viewers: 0 };
  const topMatches  = data.top_matches  ?? [];
  const liveNow     = data.live_now     ?? 0;
  const totalPeriod = data.total_period ?? 0;

  const statusPie = Object.entries(byStatus).map(([name, value]) => ({ name, value: value as number }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={<Tv size={18}/>}          label="Matches (period)"  value={fmt(totalPeriod)}               color={BLUE}   />
        <KpiCard icon={<Activity size={18}/>}     label="Live now"          value={fmt(liveNow)}                   color={RED}    />
        <KpiCard icon={<Users size={18}/>}        label="Peak viewers"      value={fmt(viewerStats.peak_viewers ?? 0)} color={GOLD}  />
        <KpiCard icon={<Eye size={18}/>}          label="Avg viewers"       value={fmt(Math.round(viewerStats.avg_viewers ?? 0))} color={GREEN} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Matches created per day</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={perDay} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="matchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BLUE} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" name="Matches" stroke={BLUE} strokeWidth={2} fill="url(#matchGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <PieCard title="Status breakdown" data={statusPie}
          colors={[GREEN, RED, GOLD, MUTED]} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Matches by league (top 10)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byLeague} layout="vertical" margin={{ top:0, right:16, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="league" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={100} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Matches" radius={[0,3,3,0]}>
                {byLeague.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Matches by kick-off hour</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byHour} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="hour" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false}
                tickFormatter={h => `${h}:00`} />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} labelFormatter={h => `${h}:00`} />
              <Bar dataKey="count" name="Matches" fill={GOLD} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top matches by viewers */}
      <div className="broadcast-card rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[color:var(--border)] text-[13px] font-semibold text-[color:var(--text)]">
          Top matches by viewership
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['#', 'Match ID', 'Date', 'Status', 'Viewers'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topMatches.map((m, idx) => (
                <tr key={m.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors">
                  <td className="px-4 py-3 text-[color:var(--muted)]">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--muted)]">{m.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-[color:var(--text2)]">{new Date(m.match_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                      ${m.status === 'live' ? 'bg-green-500/10 text-green-400' :
                        m.status === 'finished' ? 'bg-gray-500/10 text-gray-400' :
                        'bg-blue-500/10 text-blue-400'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[color:var(--text)]">{fmt(m.viewer_count ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Ad performance tab ───────────────────────────────────────
function AdCharts({ data, loading }: { data: AdminAdPerformanceData | null; loading: boolean }) {
  if (loading) return <ChartSkeleton rows={4} />;
  if (!data) return <EmptyChart message="No ad performance data" />;

  const funnel       = data.funnel               ?? {};
  const byPeriod     = data.by_period             ?? [];
  const perDay       = data.impressions_per_day   ?? [];
  const topAds       = data.top_ads               ?? [];
  const avgPlayTime  = data.avg_play_time_secs    ?? 0;
  const viewerMins   = data.total_viewer_minutes  ?? 0;

  const byPlatformRaw = data.by_platform ?? [];
  type PlatRow = { platform: string; event_type: string; count: number };
  const platforms = [...new Set(byPlatformRaw.map((r) => r.platform))];
  const platImpressions = platforms.map(p => ({
    name: p,
    value: byPlatformRaw.filter(r => r.platform === p && r.event_type === 'injected')
                        .reduce((s, r) => s + (r.count ?? 0), 0),
  }));

  const impressions = funnel['injected'] ?? 0;
  const plays       = funnel['played']   ?? 0;
  const completed   = funnel['completed']?? 0;
  const playRate    = impressions > 0 ? Math.round(plays / impressions * 100) : 0;
  const compRate    = plays > 0       ? Math.round(completed / plays * 100)   : 0;

  const funnelData = [
    { stage: 'Impressions', value: impressions, fill: BLUE  },
    { stage: 'Plays',       value: plays,       fill: GREEN },
    { stage: 'Completions', value: completed,   fill: GOLD  },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={<Eye size={18}/>}          label="Impressions"      value={fmt(impressions)}  color={BLUE}   />
        <KpiCard icon={<Play size={18}/>}          label="Plays"            value={fmt(plays)}        color={GREEN}  />
        <KpiCard icon={<CheckCircle2 size={18}/>}  label="Completion rate"  value={`${compRate}%`}    color={GOLD}   />
        <KpiCard icon={<Clock size={18}/>}         label="Viewer-minutes"   value={fmt(viewerMins)}   color={PURPLE} sub={`avg ${avgPlayTime}s`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Impressions per day</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={perDay} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="adGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BLUE} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" name="Impressions" stroke={BLUE} strokeWidth={2} fill="url(#adGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Engagement funnel</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart layout="vertical" data={funnelData} margin={{ top:0, right:16, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize:11, fill:MUTED }} tickLine={false} axisLine={false} width={80} />
              <Tooltip formatter={(v: unknown) => [(v as number).toLocaleString(), '']} />
              <Bar dataKey="value" name="Count" radius={[0,3,3,0]}>
                {funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-3">
            {[['Play rate', `${playRate}%`, BLUE], ['Completion rate', `${compRate}%`, GOLD]].map(([l, v, c]) => (
              <div key={l as string} className="text-center">
                <div className="text-[18px] font-bold" style={{ color: c as string }}>{v}</div>
                <div className="text-[11px] text-[color:var(--muted)]">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PieCard title="Impressions by platform" data={platImpressions.filter(d => d.value > 0)} />
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Impressions by match period</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byPeriod} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="period" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Impressions" radius={[3,3,0,0]}>
                {byPeriod.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top ads table */}
      <div className="broadcast-card rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[color:var(--border)] text-[13px] font-semibold text-[color:var(--text)]">
          Top ads by completions
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['Title', 'Type', 'Status', 'Impressions', 'Plays', 'Completions', 'Comp%'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topAds.map(ad => {
                const cr = ad.plays_count > 0 ? Math.round(ad.completions_count / ad.plays_count * 100) : 0;
                return (
                  <tr key={ad.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[color:var(--text)] max-w-[160px] truncate">{ad.title}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)] capitalize">{ad.file_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                        ${ad.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--blue)] font-semibold">{fmt(ad.impressions_count)}</td>
                    <td className="px-4 py-3 text-[color:var(--green)] font-semibold">{fmt(ad.plays_count)}</td>
                    <td className="px-4 py-3 text-[color:var(--gold)] font-semibold">{fmt(ad.completions_count)}</td>
                    <td className="px-4 py-3 font-semibold"
                      style={{ color: cr >= 70 ? GREEN : cr >= 40 ? GOLD : RED }}>
                      {cr}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Device analytics tab ─────────────────────────────────────
function DeviceCharts({ data, loading }: { data: AdminDeviceAnalyticsData | null; loading: boolean }) {
  if (loading) return <ChartSkeleton rows={4} />;
  if (!data) return <EmptyChart message="No device data available" />;

  const devices         = data.devices             ?? {};
  const browsers        = data.browsers            ?? {};
  const oses            = data.oses                ?? {};
  const topIps          = data.top_ips             ?? [];
  const heatmap         = data.hourly_heatmap      ?? [];
  const errorsByDay     = data.errors_by_day       ?? [];
  const uniqUsers       = data.unique_users_by_day ?? [];
  const totalReq        = data.total_requests      ?? 0;

  const devicePie   = Object.entries(devices).map(([name, value]) => ({ name, value }));
  const browserPie  = Object.entries(browsers).slice(0, 6).map(([name, value]) => ({ name, value }));
  const osPie       = Object.entries(oses).slice(0, 6).map(([name, value]) => ({ name, value }));

  const deviceIcons: Record<string, ReactNode> = {
    mobile: <Smartphone size={14}/>,
    tablet: <Tablet size={14}/>,
    desktop: <Monitor size={14}/>,
    bot: <Cpu size={14}/>,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={<Globe size={18}/>}      label="Total requests"  value={fmt(totalReq)}                       color={BLUE}  />
        <KpiCard icon={<Smartphone size={18}/>} label="Mobile share"    value={`${totalReq > 0 ? Math.round((devices.mobile ?? 0) / totalReq * 100) : 0}%`} color={GREEN} sub={`${fmt(devices.mobile ?? 0)} sessions`} />
        <KpiCard icon={<Monitor size={18}/>}    label="Desktop share"   value={`${totalReq > 0 ? Math.round((devices.desktop ?? 0) / totalReq * 100) : 0}%`} color={GOLD}  sub={`${fmt(devices.desktop ?? 0)} sessions`} />
        <KpiCard icon={<AlertTriangle size={18}/>} label="Bot traffic" value={`${totalReq > 0 ? Math.round((devices.bot ?? 0) / totalReq * 100) : 0}%`} color={RED} sub={`${fmt(devices.bot ?? 0)} requests`} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PieCard title="Device types" data={devicePie} />
        <PieCard title="Browsers" data={browserPie} />
        <PieCard title="Operating systems" data={osPie} />
      </div>

      {/* Hourly traffic heatmap */}
      <div className="broadcast-card rounded-lg p-4">
        <SectionTitle>Traffic by hour of day</SectionTitle>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={heatmap} margin={{ top:4, right:4, bottom:0, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
            <XAxis dataKey="hour" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false}
              tickFormatter={h => `${h}h`} />
            <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<ChartTooltip />} labelFormatter={h => `${h}:00 – ${h}:59`} />
            <Bar dataKey="count" name="Requests" radius={[3,3,0,0]}>
              {heatmap.map((d, i) => {
                const max = Math.max(...heatmap.map(x => x.count), 1);
                const alpha = 0.3 + (d.count / max) * 0.7;
                return <Cell key={i} fill={`rgba(26,95,212,${alpha})`} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Daily errors</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={errorsByDay} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="errors" name="Errors" fill={RED} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Daily active users</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={uniqUsers} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={TEAL} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="unique_users" name="Active users" stroke={TEAL} strokeWidth={2} fill="url(#dauGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top IPs */}
      <div className="broadcast-card rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[color:var(--border)] text-[13px] font-semibold text-[color:var(--text)]">
          Top requesting IPs
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['#', 'IP address', 'Requests', 'Share'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topIps.map((row, idx) => (
                <tr key={row.ip_address} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors">
                  <td className="px-4 py-3 text-[color:var(--muted)]">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-[color:var(--text)]">{row.ip_address}</td>
                  <td className="px-4 py-3 font-semibold text-[color:var(--text)]">{row.requests.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">
                    {totalReq > 0 ? (row.requests / totalReq * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Log analytics tab ────────────────────────────────────────
function LogCharts({ data, loading }: { data: AdminLogAnalyticsData | null; loading: boolean }) {
  if (loading) return <ChartSkeleton rows={4} />;
  if (!data) return <EmptyChart message="No log analytics available" />;

  const byModule      = data.by_module               ?? [];
  const topActions    = data.top_actions             ?? [];
  const statusCodes   = data.status_codes            ?? {};
  const avgResp       = data.avg_response_by_module  ?? [];
  const slowReqs      = data.slow_requests           ?? [];
  const byDow         = data.by_dow                  ?? [];
  const perDay        = data.per_day                 ?? [];

  const statusPie = Object.entries(statusCodes)
    .map(([name, value]) => ({ name: `HTTP ${name}`, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const totalReqs    = perDay.reduce((s, r) => s + r.total, 0);
  const totalErrors  = perDay.reduce((s, r) => s + r.server_errors + r.client_errors, 0);
  const errorRate    = totalReqs > 0 ? (totalErrors / totalReqs * 100).toFixed(1) : '0';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={<Activity size={18}/>}     label="Total requests"  value={fmt(totalReqs)}  color={BLUE}   />
        <KpiCard icon={<AlertTriangle size={18}/>} label="Error rate"     value={`${errorRate}%`} color={RED}    />
        <KpiCard icon={<Clock size={18}/>}         label="Modules tracked" value={fmt(byModule.length)} color={GOLD} />
        <KpiCard icon={<Zap size={18}/>}           label="Slow requests"  value={fmt(slowReqs.length)} color={PURPLE} sub=">500ms" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Requests & errors per day</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={perDay} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total"         name="Total"        fill={BLUE} radius={[3,3,0,0]} />
              <Bar dataKey="client_errors" name="4xx errors"   fill={GOLD} radius={[3,3,0,0]} />
              <Bar dataKey="server_errors" name="5xx errors"   fill={RED}  radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <PieCard title="HTTP status code distribution" data={statusPie} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Requests by module</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byModule} layout="vertical" margin={{ top:0, right:16, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
              <YAxis type="category" dataKey="module" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Requests" radius={[0,3,3,0]}>
                {byModule.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Avg response time by module (ms)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={avgResp} layout="vertical" margin={{ top:0, right:16, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="module" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="avg_ms" name="Avg ms" fill={TEAL} radius={[0,3,3,0]} />
              <Bar dataKey="max_ms" name="Max ms" fill={RED}  radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Traffic by day of week</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byDow} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="day" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Requests" radius={[3,3,0,0]}>
                {byDow.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle>Top actions</SectionTitle>
          <div className="flex flex-col gap-1.5 mt-1">
            {topActions.slice(0, 8).map((a, i) => (
              <div key={a.action} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[color:var(--muted)] w-4">{i+1}</span>
                  <span className="font-mono text-[color:var(--text2)]">{a.action}</span>
                </div>
                <span className="font-semibold text-[color:var(--text)]">{a.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slow requests */}
      <div className="broadcast-card rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[color:var(--border)] text-[13px] font-semibold text-[color:var(--text)]">
          Slowest requests (&gt;500 ms)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['Module', 'Action', 'Duration', 'IP', 'Time'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slowReqs.slice(0, 15).map((r, idx) => {
                const ms = (r.metadata?.duration_ms as number) ?? 0;
                const color = ms > 2000 ? RED : ms > 1000 ? GOLD : MUTED;
                return (
                  <tr key={`${r.id}-${idx}`} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors">
                    <td className="px-4 py-3 text-[color:var(--muted)]">{r.module ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--blue)]">{r.action}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color }}>{ms}ms</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--muted)]">{r.ip_address ?? '—'}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)] whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// All admin analytics functions are imported from @/lib/api above.
// They use the shared apiFetch helper with BASE_URL + Bearer token.

// ─── Page ─────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  useRoleGuard([ROLES.ADMIN, ROLES.SUPERADMIN]);

  const [tab,  setTab]  = useState<Tab>('revenue');
  const [days, setDays] = useState(30);

  // Data slices
  const [revenue,      setRevenue]      = useState<RevenueRow[]>([]);
  const [growth,       setGrowth]       = useState<UserGrowthRow[]>([]);
  const [matchData,    setMatchData]    = useState<AdminMatchAnalyticsData | null>(null);
  const [adData,       setAdData]       = useState<AdminAdPerformanceData | null>(null);
  const [deviceData,   setDeviceData]   = useState<AdminDeviceAnalyticsData | null>(null);
  const [logData,      setLogData]      = useState<AdminLogAnalyticsData | null>(null);
  const [audit,        setAudit]        = useState<Paginated<AuditLogRow> | null>(null);

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Audit filters
  const [auditPage,        setAuditPage]        = useState(1);
  const [auditModuleInput, setAuditModuleInput] = useState('');
  const [auditActionInput, setAuditActionInput] = useState('');
  const [selectedLog,      setSelectedLog]      = useState<AuditLogRow | null>(null);
  const auditModule = useDebounce(auditModuleInput);
  const auditAction = useDebounce(auditActionInput);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'revenue') {
        setRevenue(await adminGetRevenue(days));
      } else if (tab === 'growth') {
        setGrowth(await adminGetUserGrowth(days));
      } else if (tab === 'matches') {
        setMatchData(await adminGetMatchAnalytics(days));
      } else if (tab === 'ads') {
        setAdData(await adminGetAdPerformance(days));
      } else if (tab === 'devices') {
        setDeviceData(await adminGetDeviceAnalytics(days));
      } else if (tab === 'logs') {
        setLogData(await adminGetLogAnalytics(days));
      } else if (tab === 'audit') {
        const params: Record<string, string> = { page: String(auditPage), per_page: '50' };
        if (auditModule) params.module = auditModule;
        if (auditAction) params.action = auditAction;
        setAudit(await adminGetAuditLogs(params));
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [tab, days, auditPage, auditModule, auditAction]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && selectedLog) setSelectedLog(null); };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = selectedLog ? 'hidden' : '';
    return () => { window.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [selectedLog]);

  const switchTab = (t: Tab) => { setTab(t); setAuditPage(1); };

  const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'revenue',  label: 'Revenue',    icon: <DollarSign size={13}/> },
    { key: 'growth',   label: 'Users',      icon: <Users size={13}/> },
    { key: 'matches',  label: 'Matches',    icon: <Tv size={13}/> },
    { key: 'ads',      label: 'Ads',        icon: <Eye size={13}/> },
    { key: 'devices',  label: 'Devices',    icon: <Monitor size={13}/> },
    { key: 'logs',     label: 'Log Metrics',icon: <Activity size={13}/> },
    { key: 'audit',    label: 'Audit Logs', icon: <BarChart3 size={13}/> },
  ];

  const showPeriod = !['audit'].includes(tab);

  return (
    <PageShell title="Analytics">
      <div className="fluid-pad flex flex-col gap-3 pb-10 sm:gap-4">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">Analytics</h1>
          <button type="button" onClick={load} aria-label="Refresh"
            className="flex items-center gap-2 px-4 h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] font-medium cursor-pointer hover:bg-[color:var(--surface3)] transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[color:var(--surface2)] rounded-xl w-full overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => switchTab(t.key)}
              className={`whitespace-nowrap flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium cursor-pointer border-none transition-all
                ${tab === t.key
                  ? 'bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm'
                  : 'bg-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        {showPeriod && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-[color:var(--muted)]">Period:</span>
            {[7, 14, 30, 90].map(d => (
              <button key={d} type="button" onClick={() => setDays(d)}
                className={`px-3 h-7 rounded-lg text-[12px] font-medium cursor-pointer border transition-colors
                  ${days === d
                    ? 'border-green-500/40 bg-green-500/10 text-[color:var(--green)]'
                    : 'border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)]'}`}>
                {d}d
              </button>
            ))}
          </div>
        )}

        {/* Audit filters */}
        {tab === 'audit' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input type="text" value={auditModuleInput} onChange={e => setAuditModuleInput(e.target.value)}
              placeholder="Filter module…" aria-label="Filter by module"
              className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none w-full sm:w-40" />
            <input type="text" value={auditActionInput} onChange={e => setAuditActionInput(e.target.value)}
              placeholder="Filter action…" aria-label="Filter by action"
              className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none w-full sm:w-40" />
          </div>
        )}

        {error && (
          <div role="alert" className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.08] text-[color:var(--red)] text-[13px]">
            {error}
          </div>
        )}

        {/* Chart panels */}
        {tab === 'revenue'  && <RevenueCharts data={revenue}     loading={loading} />}
        {tab === 'growth'   && <GrowthCharts  data={growth}      loading={loading} />}
        {tab === 'matches'  && <MatchCharts   data={matchData}   loading={loading} />}
        {tab === 'ads'      && <AdCharts      data={adData}      loading={loading} />}
        {tab === 'devices'  && <DeviceCharts  data={deviceData}  loading={loading} />}
        {tab === 'logs'     && <LogCharts     data={logData}     loading={loading} />}

        {/* Audit log table */}
        {tab === 'audit' && (
          <div className="broadcast-card rounded-lg overflow-hidden">
            {loading
              ? <div className="p-8 text-center"><span className="spinner inline-block" /></div>
              : !audit || audit.data.length === 0
                ? <div className="p-8 text-center text-[color:var(--muted)]">No audit logs found</div>
                : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-[color:var(--border)]">
                            {['User', 'Action', 'Module', 'Status', 'Description', 'IP', 'Date'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {audit.data.map((row, idx) => {
                            const badge = getStatusBadge(row.metadata?.status_code as number | undefined);
                            return (
                              <tr key={`${row.id}-${idx}`} role="button" tabIndex={0}
                                onClick={() => setSelectedLog(row)}
                                onKeyDown={e => e.key === 'Enter' && setSelectedLog(row)}
                                className="border-b border-[color:var(--border)] last:border-0 cursor-pointer hover:bg-[color:var(--surface2)] transition-colors">
                                <td className="px-4 py-3">
                                  <div className="text-[color:var(--text)] font-medium">{row.user?.name ?? '—'}</div>
                                  <div className="text-[11px] text-[color:var(--muted)]">{row.user?.email ?? row.user_id ?? ''}</div>
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--blue)]">{row.action}</td>
                                <td className="px-4 py-3 text-[color:var(--muted)]">{row.module ?? '—'}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                                </td>
                                <td className="px-4 py-3 text-[color:var(--text2)] max-w-[200px] truncate">{row.description ?? '—'}</td>
                                <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--muted)]">{row.ip_address ?? '—'}</td>
                                <td className="px-4 py-3 text-[color:var(--muted)] whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {audit.meta.last_page > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--border)]">
                        <span className="text-[12px] text-[color:var(--muted)]">
                          Page {audit.meta.current_page} of {audit.meta.last_page} · {audit.meta.total} entries
                        </span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setAuditPage(p => Math.max(1, p-1))} disabled={audit.meta.current_page <= 1}
                            className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">← Prev</button>
                          <button type="button" onClick={() => setAuditPage(p => p+1)} disabled={audit.meta.current_page >= audit.meta.last_page}
                            className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">Next →</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
          </div>
        )}
      </div>

      {/* Audit detail dialog */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)] bg-[color:var(--surface)]">
              <h3 className="text-[15px] font-semibold text-[color:var(--text)]">Audit Log Details</h3>
              <button type="button" onClick={() => setSelectedLog(null)} aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-[color:var(--surface2)] transition-colors text-[color:var(--muted)]">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
              <DetailRow label="Log ID"     value={selectedLog.id} />
              <DetailRow label="Action"     value={selectedLog.action} />
              <DetailRow label="User"       value={`${selectedLog.user?.name ?? '—'} (${selectedLog.user?.email ?? selectedLog.user_id ?? '—'})`} />
              <DetailRow label="Module"     value={selectedLog.module ?? '—'} />
              <DetailRow label="Status"     value={(() => { const b = getStatusBadge(selectedLog.metadata?.status_code as number | undefined); return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${b.bg} ${b.text}`}>{b.label}</span>; })()} />
              <DetailRow label="IP Address" value={selectedLog.ip_address ?? '—'} />
              <DetailRow label="User-Agent" value={<span className="font-mono text-[11px] break-all">{selectedLog.user_agent ?? '—'}</span>} />
              <DetailRow label="Duration"   value={selectedLog.metadata?.duration_ms ? `${selectedLog.metadata.duration_ms}ms` : '—'} />
              <DetailRow label="Timestamp"  value={new Date(selectedLog.created_at).toLocaleString()} />
              <DetailRow label="Description" value={selectedLog.description ?? '—'} />
              <div className="md:col-span-2">
                <span className="block text-[11px] font-medium uppercase tracking-[.05em] text-[color:var(--muted)] mb-1">Raw Metadata</span>
                <pre className="bg-[color:var(--surface2)] p-3 rounded-lg text-[12px] text-[color:var(--text2)] overflow-x-auto whitespace-pre-wrap max-h-48">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}