'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  PageShell, StatCard, EmptyState, SectionHeader,
  StatusBadge, MatchCard, DashboardSkeleton, Icon,
} from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import { startReverbListener, stopReverbListener, pushNotification } from '@/lib/notifications';
import { UserPrefs, getMatchesByAuthorId, getRevenueSummary, type MatchData, type RevenueSummary, ROLES } from '@/lib/api';

export default function DashboardPage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);
  const router = useRouter();

  const [matches,  setMatches]  = useState<Record<string, MatchData>>({});
  const [revenue,  setRevenue]  = useState<RevenueSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [userName, setUserName] = useState('Guest');

  const matchList = useMemo(() => Object.values(matches), [matches]);

  const fmtMatchWhen = (m?: MatchData) => {
    if (!m) return null;
    try {
      const d = new Date(m.date);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return m.time ? `${dateStr}, ${m.time}` : dateStr;
    } catch { return m.date; }
  };

  const nextScheduled = useMemo(
    () => matchList
      .filter(m => m.status === 'scheduled')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0],
    [matchList]
  );

  const mostRecentCompleted = useMemo(
    () => matchList
      .filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
    [matchList]
  );

  const stats = useMemo(() => ({
    scheduled: matchList.filter(m => m.status === 'scheduled').length,
    live:      matchList.filter(m => m.status === 'live').length,
    completed: matchList.filter(m => m.status === 'completed').length,
    total:     matchList.length,
  }), [matchList]);

  const heroMiniStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const today = matchList.filter(m => {
      const d = new Date(m.date);
      return d >= startOfToday && d < new Date(startOfToday.getTime() + 86_400_000);
    }).length;

    const thisWeek = matchList.filter(m => new Date(m.date) >= startOfWeek).length;

    const multiCam = matchList.filter(m => (m.camera ?? 0) > 1).length;

    return [
      { label: 'Today',        value: String(today),     tone: 'var(--green)' },
      { label: 'This week',    value: String(thisWeek),  tone: 'var(--blue)'  },
      { label: 'Multi-cam',    value: String(multiCam),  tone: 'var(--gold)'  },
    ];
  }, [matchList]);

  const liveMatch = useMemo(
    () => matchList.find(m => m.status === 'live') ?? matchList.find(m => m.status === 'scheduled') ?? matchList[0],
    [matchList]
  );

  const fetchData = useCallback(async () => {
    const user = UserPrefs.get();
    if (!user) { router.replace('/login'); return; }
    setLoading(true);
    setUserName(user.name || 'Guest');
    try {
      const data = await getMatchesByAuthorId(user.id);
      setMatches(data ?? {});
    } catch {
      setMatches({});
    } finally {
      setLoading(false);
    }
    getRevenueSummary().then(setRevenue).catch(() => setRevenue(null));
  }, [router]);

  useEffect(() => {
    fetchData();
    const user = UserPrefs.get();
    if (!user) return;
    pushNotification({ type: 'success', title: 'Control room ready', message: 'Dashboard loaded. Listening for live events.' });
    let cleanup: (() => void) | undefined;
    startReverbListener(user.id).then(fn => { cleanup = fn; });
    return () => { if (cleanup) cleanup(); else stopReverbListener(); };
  }, [fetchData]);

  const revenueChartData = useMemo(() => {
    if (!revenue) return [];
    return revenue.matches
      .slice(0, 8)
      .map(row => ({
        name: row.match ? `${row.match.homeTeam?.name ?? '—'} vs ${row.match.awayTeam?.name ?? '—'}` : 'Match',
        earned: row.broadcaster_amount,
      }));
  }, [revenue]);

  return (
    <PageShell title="Dashboard">
      <div className="fluid-pad flex w-full flex-col gap-4 pb-10">

        {/* Revenue — the first thing a broadcaster wants to know */}
        {revenue && revenue.total_gross > 0 && (
          <div className="stat-card-gradient rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center rounded-xl w-9 h-9"
                  style={{ background: 'color-mix(in srgb, var(--green) 16%, transparent)', color: 'var(--green)' }}>
                  <Icon name="payment" size={17} />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[.04em] text-[color:var(--muted)]">Ad revenue</div>
                  <div className="text-[13px] font-semibold text-[color:var(--text)]">Your earnings from matchday ads</div>
                </div>
              </div>
              <a href="/revenue" className="text-[12px] font-medium text-[color:var(--green)] no-underline hover:underline shrink-0">
                View all →
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
              <div>
                <div className="font-mono text-[22px] sm:text-[28px] font-semibold leading-none tracking-[-0.03em] text-[color:var(--green)]">
                  KES {revenue.total_earned.toLocaleString()}
                </div>
                <div className="text-[11px] mt-1.5 text-[color:var(--muted)]">Your share</div>
              </div>
              <div>
                <div className="font-mono text-[22px] sm:text-[28px] font-semibold leading-none tracking-[-0.03em] text-[color:var(--text)]">
                  KES {revenue.total_gross.toLocaleString()}
                </div>
                <div className="text-[11px] mt-1.5 text-[color:var(--muted)]">Total generated</div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="font-mono text-[22px] sm:text-[28px] font-semibold leading-none tracking-[-0.03em] text-[color:var(--text)]">
                  {revenue.matches.length}
                </div>
                <div className="text-[11px] mt-1.5 text-[color:var(--muted)]">Matches earning</div>
              </div>
            </div>

            {revenueChartData.length > 0 && (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={revenueChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted)' }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={38} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded px-2 py-1 text-[11px] text-[color:var(--text)]">
                          <div className="font-semibold text-[color:var(--green)]">KES {((payload[0]?.value as number) ?? 0).toLocaleString()}</div>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="earned" fill="var(--green)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Hero grid: stacked on mobile, side-by-side on md+ */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.45fr)_minmax(240px,.75fr)]">

          {/* Hero card */}
          <div className="stat-card-gradient relative overflow-hidden rounded-xl p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(135deg,rgba(26,95,212,.06) 0%,transparent 50%),radial-gradient(circle at 85% 20%,rgba(10,143,82,.06) 0%,transparent 40%)' }} />
            <div className="relative z-10 flex flex-col gap-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[.04em] text-[color:var(--muted)]">Club broadcast control room</div>
                <h1 className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.04em] text-[color:var(--text)] sm:text-[38px]">
                  Matchday<br />Operations
                </h1>
                <p className="mt-2 text-[13px] text-[color:var(--muted)]">Welcome back, {userName}</p>
              </div>
              {/* Mini status cards — 3 col always, shrink text on very small screens */}
              <div className="grid grid-cols-3 gap-2">
                {heroMiniStats.map(({ label, value, tone }) => (
                  <div key={label} className="broadcast-card rounded-lg p-2.5 sm:p-3">
                    <div className="text-[9px] font-medium uppercase tracking-[.04em] text-[color:var(--muted)] sm:text-[10px]">{label}</div>
                    <div className="mt-1 text-[13px] font-semibold sm:text-[15px]" style={{ color: tone }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live match card */}
          <div className="stat-card-gradient rounded-xl p-4" style={{ borderColor: stats.live ? 'rgba(192,41,29,.25)' : 'var(--border)' }}>
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader title="Live match" />
              <StatusBadge status={stats.live ? 'live' : 'offline'} />
            </div>
            {liveMatch ? (
              <MatchCard match={liveMatch} isDark />
            ) : (
              <EmptyState icon="live-tv" title="No active feed" subtitle="Live match telemetry appears here." />
            )}
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Stats: 2-col on mobile, 3-col on sm, 4-col on xl */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 sm:gap-3">
              <StatCard
                label="Scheduled"
                count={stats.scheduled}
                color="var(--blue)"
                iconName="event"
                insight={nextScheduled ? `Next: ${fmtMatchWhen(nextScheduled)}` : 'None on the calendar yet'}
              />
              <StatCard
                label="Live"
                count={stats.live}
                color="var(--red)"
                iconName="live-tv"
                insight={liveMatch && stats.live > 0 ? `${liveMatch.homeTeam?.name ?? 'Home'} vs ${liveMatch.awayTeam?.name ?? 'Away'}` : 'Nothing streaming right now'}
              />
              <StatCard
                label="Completed"
                count={stats.completed}
                color="var(--muted)"
                iconName="history"
                insight={mostRecentCompleted ? `Last: ${fmtMatchWhen(mostRecentCompleted)}` : 'No matches finished yet'}
              />
              <StatCard
                label="Total"
                count={stats.total}
                color="var(--gold)"
                iconName="soccer"
                insight="Across every status, all time"
              />
            </div>

            {matchList.length === 0 ? (
              <EmptyState
                icon="soccer"
                title="No matches yet"
                subtitle="Create your first match to get started."
                action={{ label: 'Create match', href: '/matches/create' }}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <SectionHeader title="Your matches" />
                {matchList.slice(0, 8).map(m => (
                  <MatchCard key={m.id} match={m} isDark />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
