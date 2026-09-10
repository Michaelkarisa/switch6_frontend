'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, SectionHeader, EmptyState, Icon } from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import {
  UserPrefs, getRevenueSummary,
  type RevenueSummary, type MatchRevenueRow, ROLES,
} from '@/lib/api';

const PERIOD_LABEL: Record<string, string> = {
  before_match: 'Before match',
  halftime:     'Half-time',
  fulltime:     'Full-time',
};

const fmtKes = (n: number) => `KES ${n.toLocaleString()}`;

export default function RevenuePage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);
  const router = useRouter();

  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const user = UserPrefs.get();
    if (!user) { router.replace('/login'); return; }
    setLoading(true);
    try {
      setSummary(await getRevenueSummary());
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group revenue rows by match so each match shows its before/half/full breakdown together.
  const byMatch = useMemo(() => {
    const groups = new Map<string, MatchRevenueRow[]>();
    (summary?.matches ?? []).forEach(row => {
      const list = groups.get(row.match_id) ?? [];
      list.push(row);
      groups.set(row.match_id, list);
    });
    return Array.from(groups.entries());
  }, [summary]);

  const platformTotal = (summary?.total_gross ?? 0) - (summary?.total_earned ?? 0);

  return (
    <PageShell title="Revenue">
      <div className="fluid-pad flex w-full flex-col gap-4 pb-10">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[.04em] text-[color:var(--muted)]">Ad revenue share</div>
          <h1 className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.04em] text-[color:var(--text)] sm:text-[32px]">
            Revenue
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--muted)]">
            How your matches are performing in bid-slot ad revenue, and what you can expect to be paid.
          </p>
        </div>

        {!loading && summary && !summary.enabled && (
          <div className="rounded-lg border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/10 px-4 py-3 text-[13px] text-[color:var(--text)]">
            Revenue sharing isn't switched on for your account yet. Figures below will start counting once it is.
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="broadcast-card h-24 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex flex-col gap-3 rounded-lg p-3.5 broadcast-card sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: 'var(--blue)20', color: 'var(--blue)' }}>
                    <Icon name="chart" size={17} />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--muted)]">Total</span>
                </div>
                <div>
                  <div className="font-mono text-[26px] font-semibold leading-none tracking-[-0.04em] text-[color:var(--text)] sm:text-[32px]">
                    {fmtKes(summary?.total_gross ?? 0)}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">Gross ad revenue across your matches</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg p-3.5 broadcast-card sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: 'var(--green)20', color: 'var(--green)' }}>
                    <Icon name="payment" size={17} />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--muted)]">Yours</span>
                </div>
                <div>
                  <div className="font-mono text-[26px] font-semibold leading-none tracking-[-0.04em] text-[color:var(--green)] sm:text-[32px]">
                    {fmtKes(summary?.total_earned ?? 0)}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">What you're expected to be paid</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg p-3.5 broadcast-card sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: 'var(--muted)20', color: 'var(--muted)' }}>
                    <Icon name="chart" size={17} />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--muted)]">Platform</span>
                </div>
                <div>
                  <div className="font-mono text-[26px] font-semibold leading-none tracking-[-0.04em] text-[color:var(--text)] sm:text-[32px]">
                    {fmtKes(platformTotal)}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">Platform's share of the same revenue</div>
                </div>
              </div>
            </div>

            {byMatch.length === 0 ? (
              <EmptyState
                icon="chart"
                title="No ad revenue yet"
                subtitle="Once advertisers win bid slots on your matches, the revenue split shows up here."
              />
            ) : (
              <div className="flex flex-col gap-2">
                <SectionHeader title="By match" subtitle="Broken down by ad period (before match, half-time, full-time)" />
                {byMatch.map(([matchId, rows]) => {
                  const match = rows[0].match;
                  const matchGross = rows.reduce((s, r) => s + r.gross_amount, 0);
                  const matchEarned = rows.reduce((s, r) => s + r.broadcaster_amount, 0);
                  return (
                    <div key={matchId} className="broadcast-card rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[14px] font-semibold text-[color:var(--text)]">
                            {match?.homeTeam?.name ?? '—'} <span className="text-[color:var(--muted)]">vs</span> {match?.awayTeam?.name ?? '—'}
                          </div>
                          <div className="mt-0.5 text-xs text-[color:var(--muted)]">{match?.date}{match?.stadium ? ` · ${match.stadium}` : ''}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-[15px] font-semibold text-[color:var(--green)]">{fmtKes(matchEarned)}</div>
                          <div className="text-[11px] text-[color:var(--muted)]">of {fmtKes(matchGross)} total</div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {rows.map(row => (
                          <div key={row.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-2.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[color:var(--muted)]">
                              {PERIOD_LABEL[row.period] ?? row.period}
                            </div>
                            <div className="mt-1 font-mono text-[15px] font-semibold text-[color:var(--text)]">{fmtKes(row.broadcaster_amount)}</div>
                            <div className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                              {row.share_percent}% of {fmtKes(row.gross_amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
