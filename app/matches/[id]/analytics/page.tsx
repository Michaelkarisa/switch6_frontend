'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { PageShell } from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import { ROLES, getMatchAnalytics, type MatchAnalyticsData } from '@/lib/api';
import {
  Users, Eye, Play, CheckCircle2, TrendingUp, Tv, ArrowLeft,
  RefreshCw, Clock, Globe,
} from 'lucide-react';

// ─── palette ─────────────────────────────────────────────────
const GREEN  = '#0a8f52';
const BLUE   = '#1a5fd4';
const GOLD   = '#c47f00';
const RED    = '#c0291d';
const PURPLE = '#7c3aed';
const TEAL   = '#0891b2';
const MUTED  = '#6b7280';
const PIE_COLORS = [BLUE, GREEN, GOLD, RED, PURPLE, TEAL, '#ec4899', '#f97316'];

// ─── types ───────────────────────────────────────────────────
// MatchAnalyticsData is the canonical type defined in lib/api.ts
// and used here as a local alias for readability.
type MatchAnalytics = MatchAnalyticsData;

// ─── helpers ─────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${(n / 1_000).toFixed(1)}K`      : String(n);

const fmtTime = (secs: number) => {
  if (secs < 60) return `${Math.round(secs)}s`;
  return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
};

// ─── shared sub-components ───────────────────────────────────

function KpiCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: ReactNode; color: string;
}) {
  return (
    <div className="broadcast-card rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">
          {label}
        </span>
        <span className="w-7 h-7 rounded-lg grid place-items-center"
          style={{ background: color + '22', color }}>
          {icon}
        </span>
      </div>
      <div className="text-[26px] font-bold leading-none tracking-[-0.03em]" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[color:var(--muted)]">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[13px] font-semibold text-[color:var(--text)] mb-4">{children}</div>
  );
}

type CTP = {
  active?: boolean;
  payload?: Array<{ name: string; value: unknown; color: string }>;
  label?: string;
};
function ChartTooltip({ active, payload, label }: CTP) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 shadow-xl text-[12px]">
      <div className="font-semibold text-[color:var(--muted)] mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[color:var(--text2)] capitalize">{p.name}:</span>
          <span className="font-semibold text-[color:var(--text)]">
            {((p.value as number) ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

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
        <div className="h-36 flex items-center justify-center text-[color:var(--muted)] text-[13px]">
          No data yet
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={60}
                dataKey="value" nameKey="name">
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => [(v as number).toLocaleString(), '']} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => (
                  <span className="text-[11px] text-[color:var(--muted)]">{v}</span>
                )} />
            </PieChart>
          </ResponsiveContainer>
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
                  <span className="text-[color:var(--muted)] w-9 text-right">
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

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[color:var(--surface2)] rounded-lg ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-72" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    </div>
  );
}

// getMatchAnalytics is imported from @/lib/api — it uses the shared
// apiFetch helper (BASE_URL env var + Bearer token from getAuthToken).

// ─── Page ─────────────────────────────────────────────────────
export default function MatchAnalyticsPage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);

  const params   = useParams();
  const router   = useRouter();
  const matchId  = params.id as string;

  const [data,    setData]    = useState<MatchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const d = await getMatchAnalytics(matchId);
      setData(d);
      setLastFetched(new Date());
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to load match analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [matchId]);

  // Live matches: auto-refresh every 30s
  useEffect(() => {
    if (data?.overview.status !== 'live') return;
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [data?.overview.status]);

  // ── Derived data ──────────────────────────────────────────────
  const ov  = data?.overview;
  const vw  = data?.viewers;
  const ads = data?.ads;

  // Merge viewer timeline + ad timeline for combined chart
  const combinedTimeline = useMemo(() => {
    if (!data) return [];
    const adMap = new Map(data.ad_timeline.map(r => [r.minute, r.impressions]));
    return data.timeline.map(r => ({
      minute: r.minute,
      viewers: r.viewers,
      ad_impressions: adMap.get(r.minute) ?? 0,
    }));
  }, [data]);

  // Device pie data
  const devicePie = useMemo(() =>
    Object.entries(data?.device_split.devices ?? {})
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })),
  [data]);

  const browserPie = useMemo(() =>
    Object.entries(data?.device_split.browsers ?? {})
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value })),
  [data]);

  const platformPie = useMemo(() =>
    Object.entries(ads?.by_platform ?? {})
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: value as number })),
  [ads]);

  // Period breakdown (impressions only)
  const periodData = useMemo(() => {
    const raw = ads?.by_period ?? [];
    const buckets: Record<string, { period: string; impressions: number; plays: number; completions: number }> = {};
    raw.forEach(r => {
      if (!buckets[r.period]) buckets[r.period] = { period: r.period, impressions: 0, plays: 0, completions: 0 };
      if (r.event_type === 'injected')  buckets[r.period].impressions += r.count;
      if (r.event_type === 'played')    buckets[r.period].plays       += r.count;
      if (r.event_type === 'completed') buckets[r.period].completions += r.count;
    });
    return Object.values(buckets);
  }, [ads]);

  const isLive = data?.overview.status === 'live';

  // ── Render ────────────────────────────────────────────────────
  return (
    <PageShell title="Match Analytics">
      <div className="fluid-pad flex flex-col gap-3 pb-10 sm:gap-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} aria-label="Back"
              className="w-8 h-8 grid place-items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)] cursor-pointer hover:text-[color:var(--text)] transition-colors">
              <ArrowLeft size={14} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">
                  {ov ? `${ov.home_club} vs ${ov.away_club}` : 'Match Analytics'}
                </h1>
                {isLive && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] font-bold uppercase text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              {ov && (
                <div className="text-[12px] text-[color:var(--muted)] mt-0.5">
                  {ov.league} · {new Date(ov.match_date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                  {lastFetched && (
                    <span className="ml-2 opacity-60">· Updated {lastFetched.toLocaleTimeString()}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={load} aria-label="Refresh"
            className="flex items-center gap-2 px-4 h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] font-medium cursor-pointer hover:bg-[color:var(--surface3)] transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Score banner */}
        {ov && (
          <div className="broadcast-card rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="text-[15px] font-semibold text-[color:var(--text)] truncate">{ov.home_club}</div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[32px] font-bold text-[color:var(--text)] leading-none">{ov.home_score}</span>
                <span className="text-[14px] text-[color:var(--muted)]">–</span>
                <span className="text-[32px] font-bold text-[color:var(--text)] leading-none">{ov.away_score}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full
                ${ov.status === 'live'      ? 'bg-green-500/10 text-green-400'  :
                  ov.status === 'finished'  ? 'bg-gray-500/10 text-gray-400'   :
                  'bg-blue-500/10 text-blue-400'}`}>
                {ov.status}
              </span>
            </div>
            <div className="text-[15px] font-semibold text-[color:var(--text)] truncate text-right">{ov.away_club}</div>
          </div>
        )}

        {error && (
          <div role="alert" className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.08] text-[color:var(--red)] text-[13px]">
            {error}
          </div>
        )}

        {loading && !data ? (
          <LoadingSkeleton />
        ) : !data ? null : (
          <>
            {/* ── KPI row 1: viewers ──────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard label="Total views"     value={fmt(ov!.total_views)}     icon={<Eye size={14}/>}       color={BLUE}   />
              <KpiCard label="Unique viewers"  value={fmt(ov!.unique_viewers)}  icon={<Users size={14}/>}     color={GREEN}  />
              <KpiCard label="Peak viewers"    value={fmt(vw!.peak_viewers)}    icon={<TrendingUp size={14}/>} color={GOLD}  />
              <KpiCard label="Anonymous"       value={fmt(ov!.anonymous_views)} icon={<Globe size={14}/>}     color={MUTED}  sub="non-logged-in" />
            </div>

            {/* ── KPI row 2: ads ──────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard label="Ad impressions"   value={fmt(ads!.impressions)}            icon={<Tv size={14}/>}           color={PURPLE} />
              <KpiCard label="Ad plays"         value={fmt(ads!.plays)}                  icon={<Play size={14}/>}         color={TEAL}   />
              <KpiCard label="Completion rate"  value={`${ads!.completion_rate_pct}%`}   icon={<CheckCircle2 size={14}/>} color={GREEN}  sub={`${ads!.play_rate_pct}% play rate`} />
              <KpiCard label="Total watch time" value={fmtTime(ads!.total_play_time_secs)} icon={<Clock size={14}/>}     color={GOLD}   sub="ads watched" />
            </div>

            {/* ── Viewer timeline with ad events overlay ──────────── */}
            {combinedTimeline.length > 0 && (
              <div className="broadcast-card rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                  <div>
                    <SectionTitle>Viewer timeline</SectionTitle>
                    <div className="text-[12px] text-[color:var(--muted)] -mt-3">
                      Viewer count and ad injections at each match minute
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[color:var(--muted)]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ background: BLUE }} />
                      Viewers
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 rounded" style={{ background: GOLD + '80' }} />
                      Ad impressions
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={combinedTimeline} margin={{ top:4, right:4, bottom:0, left:0 }}>
                    <defs>
                      <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={BLUE} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={BLUE} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="minute" tick={{ fontSize:10, fill:MUTED }}
                      tickLine={false} axisLine={false}
                      tickFormatter={m => `${m}'`} interval={4} />
                    <YAxis yAxisId="viewers" tick={{ fontSize:10, fill:MUTED }}
                      tickLine={false} axisLine={false} width={32} />
                    <YAxis yAxisId="ads" orientation="right" tick={{ fontSize:10, fill:MUTED }}
                      tickLine={false} axisLine={false} width={28} />
                    <Tooltip content={<ChartTooltip />}
                      labelFormatter={m => `Minute ${m}`} />
                    {/* HT reference line at minute 45 */}
                    <ReferenceLine yAxisId="viewers" x={45}
                      stroke={MUTED} strokeDasharray="4 2" label={{ value:'HT', fill:MUTED, fontSize:10 }} />
                    <Area yAxisId="viewers" type="monotone" dataKey="viewers" name="Viewers"
                      stroke={BLUE} strokeWidth={2} fill="url(#viewGrad)" />
                    <Bar yAxisId="ads" dataKey="ad_impressions" name="Ad impressions"
                      fill={GOLD} fillOpacity={0.7} radius={[2,2,0,0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Engagement by match segment + peak minutes ───────── */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="broadcast-card rounded-lg p-4">
                <SectionTitle>Viewership by match segment</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.engagement} margin={{ top:4, right:4, bottom:0, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="segment" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="viewers" name="Viewers" radius={[3,3,0,0]}>
                      {data.engagement.map((d, i) => {
                        const max = Math.max(...data.engagement.map(x => x.viewers), 1);
                        const alpha = 0.4 + (d.viewers / max) * 0.6;
                        return <Cell key={i} fill={BLUE} fillOpacity={alpha} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* First/second half summary */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: '1st Half',  value: fmt(vw!.viewers_first_half),  color: BLUE  },
                    { label: '2nd Half',  value: fmt(vw!.viewers_second_half), color: GREEN },
                    { label: 'Extra',     value: fmt(vw!.viewers_extra_time),  color: GOLD  },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center py-2 rounded-lg bg-[color:var(--surface2)]">
                      <div className="text-[15px] font-bold" style={{ color }}>{value}</div>
                      <div className="text-[10px] text-[color:var(--muted)]">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="broadcast-card rounded-lg p-4">
                <SectionTitle>Peak minutes</SectionTitle>
                <div className="flex flex-col gap-0.5">
                  {data.peak_minutes.map((r, idx) => {
                    const pct = vw!.peak_viewers > 0 ? Math.round(r.viewers / vw!.peak_viewers * 100) : 0;
                    const colors = [GOLD, BLUE, GREEN, PURPLE, TEAL];
                    return (
                      <div key={r.minute} className="flex items-center gap-3 py-2 border-b border-[color:var(--border)] last:border-0">
                        <div className="flex items-center gap-2 w-24 shrink-0">
                          <span className="text-[color:var(--muted)] text-[11px] w-4">{idx + 1}</span>
                          <span className="text-[13px] font-bold text-[color:var(--text)]">{r.minute}&apos;</span>
                          {r.minute === 45 && <span className="text-[10px] text-[color:var(--muted)]">HT</span>}
                          {r.minute === 90 && <span className="text-[10px] text-[color:var(--muted)]">FT</span>}
                        </div>
                        <div className="flex-1 relative h-2 rounded-full overflow-hidden bg-[color:var(--surface3)]">
                          <div className="absolute left-0 top-0 h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: colors[idx] }} />
                        </div>
                        <span className="text-[12px] font-semibold text-[color:var(--text)] w-14 text-right shrink-0">
                          {fmt(r.viewers)}
                        </span>
                      </div>
                    );
                  })}
                  {data.peak_minutes.length === 0 && (
                    <div className="py-6 text-center text-[color:var(--muted)] text-[13px]">No minute data yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Ad period breakdown ──────────────────────────────── */}
            {periodData.length > 0 && (
              <div className="broadcast-card rounded-lg p-4">
                <SectionTitle>Ad performance by match period</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={periodData} margin={{ top:4, right:4, bottom:0, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="period" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span className="text-[11px] text-[color:var(--muted)] capitalize">{v}</span>} />
                    <Bar dataKey="impressions" name="Impressions" fill={BLUE}   radius={[3,3,0,0]} />
                    <Bar dataKey="plays"       name="Plays"       fill={GREEN}  radius={[3,3,0,0]} />
                    <Bar dataKey="completions" name="Completions" fill={GOLD}   radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Device / browser / platform pies ────────────────── */}
            <div className="grid gap-4 md:grid-cols-3">
              <PieCard title="Device types"    data={devicePie}   />
              <PieCard title="Browsers"        data={browserPie}  />
              <PieCard title="Streaming platform" data={platformPie} />
            </div>

            {/* ── Ad funnel summary card ───────────────────────────── */}
            <div className="broadcast-card rounded-lg p-4">
              <SectionTitle>Ad engagement funnel</SectionTitle>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {[
                  { label: 'Impressions',      value: ads!.impressions, color: BLUE   },
                  { label: 'Plays',            value: ads!.plays,       color: GREEN  },
                  { label: 'Completions',      value: ads!.completed,   color: GOLD   },
                  { label: 'Play rate',        value: `${ads!.play_rate_pct}%`,        color: TEAL,   raw: true },
                  { label: 'Completion rate',  value: `${ads!.completion_rate_pct}%`,  color: PURPLE, raw: true },
                  { label: 'Watch time',       value: fmtTime(ads!.total_play_time_secs), color: RED, raw: true },
                ].map(({ label, value, color, raw }) => (
                  <div key={label} className="flex flex-col items-center gap-1 py-3 rounded-xl bg-[color:var(--surface2)]">
                    <div className="text-[18px] font-bold leading-none"
                      style={{ color }}>
                      {raw ? value : fmt(value as number)}
                    </div>
                    <div className="text-[10px] font-medium text-[color:var(--muted)] text-center leading-tight">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Back link ─────────────────────────────────────────── */}
            <div className="pt-2">
              <Link href="/matches"
                className="inline-flex items-center gap-2 text-[13px] text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors no-underline">
                <ArrowLeft size={13} /> Back to matches
              </Link>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}