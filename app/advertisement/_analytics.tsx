'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  BarChart3, Eye, Play, CheckCircle2, Clock, Users,
  TrendingUp, Video, Image as ImageIcon, Loader2,
  Globe, Activity,
} from 'lucide-react';
import {
  getAdvertisementAnalytics,
  type AdvertisementData,
} from '@/lib/api';

// ─── palette ─────────────────────────────────────────────────
const BLUE   = '#1a5fd4';
const GREEN  = '#0a8f52';
const GOLD   = '#c47f00';
const RED    = '#c0291d';
const PURPLE = '#7c3aed';
const TEAL   = '#0891b2';
const MUTED  = '#6b7280';
const PIE_COLORS = [BLUE, GREEN, GOLD, RED, PURPLE, TEAL, '#ec4899', '#f97316'];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${(n/1_000).toFixed(1)}K`      : String(n);

// ─── rich analytics shape from updated backend ───────────────
interface RichAdAnalytics {
  // Core funnel
  impressions:         number;
  plays:               number;
  completed:           number;
  // Rates
  play_rate_pct:       number;
  completion_rate_pct: number;
  // Watch-time
  total_play_time:     number;   // seconds
  avg_play_time:       number;   // seconds
  // Audience
  avg_viewers:         number;
  peak_viewers:        number;
  // Breakdowns
  by_period:           Record<string, number>;
  by_platform:         Record<string, number>;
  impressions_per_day: { date: string; count: number }[];
  by_match:            Record<string, number>;
}

// ─── sub-components ──────────────────────────────────────────
function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="broadcast-card rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{label}</span>
        <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: color + '22', color }}>
          {icon}
        </span>
      </div>
      <div className="text-[26px] font-bold leading-none tracking-[-0.03em]" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-[color:var(--muted)]">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] font-semibold text-[color:var(--text)] mb-4">{children}</div>;
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
  title, data,
}: {
  title: string; data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="broadcast-card rounded-lg p-4">
      <SectionTitle>{title}</SectionTitle>
      {total === 0 ? (
        <div className="h-36 flex items-center justify-center text-[color:var(--muted)] text-[13px]">No data yet</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name">
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => [(v as number).toLocaleString(), '']} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span className="text-[11px] text-[color:var(--muted)]">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-1">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[color:var(--text2)]">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[color:var(--text)]">{d.value.toLocaleString()}</span>
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

// ─── Main analytics panel ─────────────────────────────────────
export function AdvertiserAnalyticsPanel({ ads }: { ads: AdvertisementData[] }) {
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [data,         setData]         = useState<RichAdAnalytics | null>(null);
  const [loading,      setLoading]      = useState(false);

  const selectedAd = useMemo(
    () => ads.find(a => a.id === selectedId) ?? null,
    [ads, selectedId],
  );

  const loadAnalytics = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const raw = await getAdvertisementAnalytics(id);
      setData(raw as unknown as RichAdAnalytics);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-select first ad
  useEffect(() => {
    if (ads.length > 0 && !selectedId) {
      loadAnalytics(ads[0].id);
    }
  }, [ads, selectedId, loadAnalytics]);

  if (ads.length === 0) {
    return (
      <div className="broadcast-card rounded-lg p-10 text-center text-[color:var(--muted)]">
        <BarChart3 size={36} className="mx-auto mb-3 opacity-40" />
        <p className="font-semibold text-[color:var(--text)] mb-1">No data yet</p>
        <p className="text-[13px]">Create a campaign to start tracking performance</p>
      </div>
    );
  }

  // Build derived data for charts
  const impressions  = data?.impressions         ?? 0;
  const plays        = data?.plays               ?? 0;
  const completed    = data?.completed           ?? 0;
  const playRatePct  = data?.play_rate_pct       ?? 0;
  const compRatePct  = data?.completion_rate_pct ?? 0;
  const avgPlay      = data?.avg_play_time        ?? 0;
  const totalPlay    = data?.total_play_time      ?? 0;
  const avgViewers   = data?.avg_viewers          ?? 0;
  const peakViewers  = data?.peak_viewers         ?? 0;

  const funnelData = [
    { stage: 'Impressions', value: impressions, fill: BLUE  },
    { stage: 'Plays',       value: plays,       fill: GREEN },
    { stage: 'Completions', value: completed,   fill: GOLD  },
  ];

  const periodPie = Object.entries(data?.by_period ?? {})
    .map(([name, value]) => ({ name, value: value as number }));

  const platformPie = Object.entries(data?.by_platform ?? {})
    .map(([name, value]) => ({ name, value: value as number }));

  const perDay = (data?.impressions_per_day ?? []);

  const radialData = [
    { name: 'Completion %', value: compRatePct, fill: GREEN },
    { name: 'Play rate %',  value: playRatePct, fill: BLUE  },
  ];

  const fmtTime = (secs: number) => {
    if (secs < 60) return `${Math.round(secs)}s`;
    return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Campaign selector */}
      <div className="flex flex-wrap gap-2">
        {ads.map(ad => (
          <button key={ad.id} type="button" onClick={() => loadAnalytics(ad.id)}
            className={`flex items-center gap-2 px-3 h-8 rounded-lg text-[12px] font-medium cursor-pointer border transition-colors
              ${selectedId === ad.id
                ? 'border-green-500/40 bg-green-500/[.08] text-[color:var(--green)]'
                : 'border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)] hover:text-[color:var(--text)]'}`}>
            {ad.file_type === 'video' ? <Video size={12}/> : <ImageIcon size={12}/>}
            <span className="max-w-[140px] truncate">{ad.title}</span>
            {selectedId === ad.id && loading && <Loader2 size={11} className="animate-spin" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-[color:var(--surface2)] animate-pulse" />)}
          </div>
          <div className="h-64 rounded-lg bg-[color:var(--surface2)] animate-pulse" />
        </div>
      ) : !data ? (
        <div className="broadcast-card rounded-lg p-8 text-center text-[color:var(--muted)] text-[13px]">
          {selectedId ? 'No analytics data available yet for this campaign' : 'Select a campaign above to view analytics'}
        </div>
      ) : (
        <>
          {/* Selected campaign info */}
          {selectedAd && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[color:var(--surface2)] border border-[color:var(--border)]">
              <div className="w-8 h-8 rounded-lg bg-[color:var(--surface3)] grid place-items-center text-[color:var(--muted)]">
                {selectedAd.file_type === 'video' ? <Video size={15}/> : <ImageIcon size={15}/>}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[color:var(--text)]">{selectedAd.title}</div>
                <div className="text-[11px] text-[color:var(--muted)]">
                  {selectedAd.file_type} · {selectedAd.duration}s ·{' '}
                  {selectedAd.period ?? 'All periods'} ·{' '}
                  <span className={`font-semibold ${selectedAd.status === 'active' ? 'text-green-400' : 'text-[color:var(--muted)]'}`}>
                    {selectedAd.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Impressions"     value={fmt(impressions)} sub="ad injections"        icon={<Eye size={14}/>}          color="var(--blue)"   />
            <StatCard label="Plays"           value={fmt(plays)}       sub="started"               icon={<Play size={14}/>}         color="var(--green)"  />
            <StatCard label="Completions"     value={fmt(completed)}   sub="watched to end"        icon={<CheckCircle2 size={14}/>} color="var(--gold)"   />
            <StatCard label="Completion rate" value={`${compRatePct}%`} sub={`${playRatePct}% play rate`} icon={<TrendingUp size={14}/>} color="var(--muted)" />
          </div>

          {/* Second KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Avg watch time" value={fmtTime(avgPlay)}      sub="per play"       icon={<Clock size={14}/>}    color={TEAL}   />
            <StatCard label="Total watch time" value={fmtTime(totalPlay)}  sub="cumulative"     icon={<Activity size={14}/>} color={PURPLE} />
            <StatCard label="Avg viewers"    value={fmt(avgViewers)}        sub="per event"      icon={<Users size={14}/>}    color={BLUE}   />
            <StatCard label="Peak viewers"   value={fmt(peakViewers)}       sub="single event"   icon={<Globe size={14}/>}    color={GOLD}   />
          </div>

          {/* Impressions trend */}
          {perDay.length > 0 && (
            <div className="broadcast-card rounded-lg p-4">
              <SectionTitle>Impressions per day</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={perDay} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <defs>
                    <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={BLUE} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BLUE} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false}
                    tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" name="Impressions" stroke={BLUE} strokeWidth={2} fill="url(#impGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Funnel + Engagement radial */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="broadcast-card rounded-lg p-4">
              <SectionTitle>Campaign funnel</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart layout="vertical" data={funnelData} margin={{ top:0, right:16, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:10, fill:MUTED }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmt(v)} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize:11, fill:MUTED }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip formatter={(v: unknown) => [(v as number).toLocaleString(), '']} />
                  <Bar dataKey="value" name="Count" radius={[0,3,3,0]}>
                    {funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* drop-off indicators */}
              <div className="flex gap-4 mt-3">
                {[
                  { label: 'Play rate',       value: `${playRatePct}%`,  color: BLUE  },
                  { label: 'Completion rate', value: `${compRatePct}%`,  color: GOLD  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex-1 text-center py-2 rounded-lg bg-[color:var(--surface2)]">
                    <div className="text-[18px] font-bold" style={{ color }}>{value}</div>
                    <div className="text-[11px] text-[color:var(--muted)]">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="broadcast-card rounded-lg p-4">
              <SectionTitle>Engagement scores</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="90%"
                  data={radialData}>
                  <RadialBar dataKey="value" background={{ fill: 'rgba(255,255,255,.04)' }} cornerRadius={4} />
                  <Tooltip formatter={(v: unknown) => `${v as number}%`} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2">
                {radialData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-[color:var(--muted)]">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                    {d.name}: <span className="font-semibold" style={{ color: d.fill }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Period + Platform pies */}
          <div className="grid gap-4 md:grid-cols-2">
            <PieCard title="Impressions by match period" data={periodPie} />
            <PieCard title="Impressions by platform"    data={platformPie} />
          </div>

          {/* Watch time breakdown bar */}
          {(avgPlay > 0 && selectedAd) && (
            <div className="broadcast-card rounded-lg p-4">
              <SectionTitle>Watch-time vs ad length</SectionTitle>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[color:var(--muted)]">Ad duration</span>
                  <span className="font-semibold text-[color:var(--text)]">{selectedAd.duration}s</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[color:var(--muted)]">Avg watch time</span>
                  <span className="font-semibold text-[color:var(--text)]">{fmtTime(avgPlay)}</span>
                </div>
                {/* Progress bar */}
                <div className="relative h-3 rounded-full bg-[color:var(--surface3)] overflow-hidden">
                  <div className="absolute left-0 top-0 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, selectedAd.duration > 0 ? avgPlay / selectedAd.duration * 100 : 0)}%`,
                      background: compRatePct >= 70 ? GREEN : compRatePct >= 40 ? GOLD : RED,
                    }} />
                </div>
                <div className="text-[11px] text-[color:var(--muted)]">
                  Viewers watched {Math.round(Math.min(100, selectedAd.duration > 0 ? avgPlay / selectedAd.duration * 100 : 0))}% of the ad on average
                </div>
              </div>
            </div>
          )}

          {/* Match distribution (if available) */}
          {Object.keys(data.by_match ?? {}).length > 0 && (
            <div className="broadcast-card rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[color:var(--border)] text-[13px] font-semibold text-[color:var(--text)]">
                Events by match
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[color:var(--border)]">
                      {['Match ID', 'Events', 'Share'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.by_match).slice(0, 10).map(([matchId, count]) => {
                      const total = Object.values(data.by_match).reduce((s, v) => s + (v as number), 0);
                      return (
                        <tr key={matchId} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--muted)]">{matchId.slice(0, 8)}…</td>
                          <td className="px-4 py-3 font-semibold text-[color:var(--text)]">{(count as number).toLocaleString()}</td>
                          <td className="px-4 py-3 text-[color:var(--muted)]">
                            {total > 0 ? Math.round((count as number) / total * 100) : 0}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}