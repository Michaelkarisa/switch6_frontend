'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageShell, StatCard, EmptyState, SectionHeader,
  StatusBadge, MatchCard, DashboardSkeleton,
} from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import { startReverbListener, stopReverbListener, pushNotification } from '@/lib/notifications';
import { UserPrefs, getMatchesByAuthorId, type MatchData, ROLES } from '@/lib/api';

export default function DashboardPage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);
  const router = useRouter();

  const [matches,  setMatches]  = useState<Record<string, MatchData>>({});
  const [loading,  setLoading]  = useState(true);
  const [userName, setUserName] = useState('Guest');

  const matchList = useMemo(() => Object.values(matches), [matches]);

  const stats = useMemo(() => ({
    upcoming:  matchList.filter(m => m.status === 'scheduled').length,
    scheduled: matchList.filter(m => m.status === 'scheduled').length,
    live:      matchList.filter(m => m.status === 'live').length,
    completed: matchList.filter(m => m.status === 'finished').length,
    total:     matchList.length,
  }), [matchList]);

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

  return (
    <PageShell title="Dashboard">
      <div className="fluid-pad flex w-full flex-col gap-4 pb-10">

        {/* Hero grid: stacked on mobile, side-by-side on md+ */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.45fr)_minmax(240px,.75fr)]">

          {/* Hero card */}
          <div className="broadcast-card relative overflow-hidden rounded-lg p-4 sm:p-5">
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
                {[
                  { label: 'Stream health',  value: '98%',     tone: 'var(--green)' },
                  { label: 'Overlay engine', value: 'Ready',   tone: 'var(--blue)'  },
                  { label: 'Ad injector',    value: 'Standby', tone: 'var(--gold)'  },
                ].map(({ label, value, tone }) => (
                  <div key={label} className="broadcast-card rounded-lg p-2.5 sm:p-3">
                    <div className="text-[9px] font-medium uppercase tracking-[.04em] text-[color:var(--muted)] sm:text-[10px]">{label}</div>
                    <div className="mt-1 text-[13px] font-semibold sm:text-[15px]" style={{ color: tone }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live match card */}
          <div className="broadcast-card rounded-lg p-4" style={{ borderColor: stats.live ? 'rgba(192,41,29,.25)' : 'var(--border)' }}>
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
            {/* Stats: 2-col on mobile, 3-col on sm, 5-col on xl */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5 sm:gap-3">
              <StatCard label="Upcoming"  count={stats.upcoming}  color="var(--green)" iconName="schedule" isDark />
              <StatCard label="Scheduled" count={stats.scheduled} color="var(--blue)"  iconName="event"    isDark />
              <StatCard label="Live"      count={stats.live}      color="var(--red)"   iconName="live-tv"  isDark />
              <StatCard label="Completed" count={stats.completed} color="var(--muted)" iconName="history"  isDark />
              <StatCard label="Total"     count={stats.total}     color="var(--gold)"  iconName="soccer"   isDark />
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
