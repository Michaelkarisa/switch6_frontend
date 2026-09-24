'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell, MatchesListSkeleton, EmptyState, StatusBadge, Icon } from '@/components/ui';
import { UserPrefs, getMatchesByAuthorId, getReceivedSharedLineups, importSharedLineup, deleteSharedLineup, type MatchData, type ShareLineupData } from '@/lib/api';
import { useRoleGuard, usePermissions } from '@/lib/auth';
import { ROLES } from '@/lib/api';
import { ImageIcon } from 'lucide-react';

const FILTERS = [
  { key: 'all',       label: 'All'       },
  { key: 'live',      label: 'Live'      },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed'  },
  { key: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 20;

function TeamBadge({ name }: { name?: string }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-[color:var(--surface3)] border border-[color:var(--border)] flex items-center justify-center font-semibold text-sm text-[color:var(--green)] shrink-0 sm:w-9 sm:h-9">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function ScoreDisplay({ homeScore, awayScore, status }: {
  homeScore?: number | null; awayScore?: number | null; status?: string;
}) {
  const isFinished = status === 'completed';
  const hasScores  = homeScore != null && awayScore != null;
  if (!hasScores && !isFinished) {
    return <span className="text-[12px] font-medium text-[color:var(--muted)] px-2 py-1 rounded-md bg-[color:var(--surface2)] sm:px-3 sm:text-[13px]">VS</span>;
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[color:var(--surface3)] border border-[color:var(--border)] sm:gap-2 sm:px-3 sm:py-1.5">
      <span className={`text-[13px] font-bold sm:text-[15px] ${isFinished && (homeScore ?? 0) > (awayScore ?? 0) ? 'text-[color:var(--green)]' : 'text-[color:var(--text)]'}`}>
        {homeScore ?? 0}
      </span>
      <span className="text-[color:var(--faint)] text-[11px]">•</span>
      <span className={`text-[13px] font-bold sm:text-[15px] ${isFinished && (awayScore ?? 0) > (homeScore ?? 0) ? 'text-[color:var(--green)]' : 'text-[color:var(--text)]'}`}>
        {awayScore ?? 0}
      </span>
    </div>
  );
}

export default function MatchesPage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);
  const router = useRouter();
  const can    = usePermissions();

  const [allMatches, setAllMatches] = useState<MatchData[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);

  // Shared lineups
  const [sharedOpen,    setSharedOpen]    = useState(false);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedLineups, setSharedLineups] = useState<ShareLineupData[]>([]);
  const [importingId,   setImportingId]   = useState<string | null>(null);
  const [importTarget,  setImportTarget]  = useState('');

  useEffect(() => {
    const user = UserPrefs.get();
    if (!user) { router.replace('/login'); return; }
    getMatchesByAuthorId(user.id)
      .then(d => setAllMatches(Object.values(d ?? {})))
      .catch(() => setAllMatches([]))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => allMatches.filter(m => {
    const matchesFilter = filter === 'all' || m.status?.toLowerCase() === filter;
    const matchesSearch = !search ||
      [m.homeTeam?.name, m.awayTeam?.name, m.league.name, m.stadium]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  }), [allMatches, filter, search]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filter, search]);

  const shareToWhatsApp = (match: MatchData) => {
    const hs = match.homeTeam?.goals ?? '–';
    const as_ = match.awayTeam?.goals ?? '–';
    const text = `🏟️ *${match.homeTeam?.name ?? 'Home'}* ${hs} – ${as_} *${match.awayTeam?.name ?? 'Away'}*\n🏆 ${match.league?.name ?? 'League'}\n📅 ${match.date}${match.time ? ` at ${match.time}` : ''}\n📍 ${match.stadium ?? ''}\n⚽ Status: ${match.status?.toUpperCase() ?? ''}\n🔗 ID: ${match.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const loadSharedLineups = () => {
    setSharedOpen(true);
    setSharedLoading(true);
    getReceivedSharedLineups()
      .then(setSharedLineups)
      .catch(() => setSharedLineups([]))
      .finally(() => setSharedLoading(false));
  };

  // Only matches the recipient owns that actually field the shared club —
  // mirrors the backend's own validation so the picker can't offer an
  // invalid target.
  const eligibleTargetsFor = (share: ShareLineupData) =>
    allMatches.filter(m => m.homeTeam?.id === share.club_id || m.awayTeam?.id === share.club_id);

  const handleImport = async (share: ShareLineupData) => {
    if (!importTarget) return;
    setImportingId(share.id);
    try {
      await importSharedLineup(share.id, importTarget);
      const target = allMatches.find(m => m.id === importTarget);
      setSharedOpen(false);
      router.push(`/matches/${target?.slug ?? importTarget}/lineup`);
    } catch (e: any) {
      alert(e.message || 'Could not import this lineup. Please try again.');
    } finally {
      setImportingId(null);
      setImportTarget('');
    }
  };

  const handleDismissShare = async (share: ShareLineupData) => {
    try {
      await deleteSharedLineup(share.id);
      setSharedLineups(prev => prev.filter(s => s.id !== share.id));
    } catch {
      // no-op — leave it in the list if the delete failed
    }
  };

  return (
    <PageShell title="Matches">
      <div className="fluid-pad flex flex-col gap-4 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">Matches</h1>
            <p className="text-[13px] text-[color:var(--muted)] mt-0.5">
              {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
              {filtered.length !== allMatches.length ? ` of ${allMatches.length}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadSharedLineups}
              className="flex items-center gap-2 px-3.5 h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-[13px] font-medium cursor-pointer hover:border-green-500/40 transition-colors">
              <Icon name="share" size={14} /> Shared lineups
            </button>
            {can.createMatch && (
              <Link href="/matches/create"
                className="flex items-center gap-2 px-4 h-9 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold no-underline cursor-pointer">
                <Icon name="add-circle" size={14} /> Create match
              </Link>
            )}
          </div>
        </div>

        {/* Filters: search full-width on mobile, inline on sm */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[color:var(--faint)]"><Icon name="search" size={14} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search matches…"
              className="h-9 w-full pl-9 pr-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none sm:w-56" />
          </div>
          {/* Filter pills: scrollable row on mobile */}
          <div className="flex gap-1 overflow-x-auto p-1 bg-[color:var(--surface2)] rounded-xl scrollbar-none">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`whitespace-nowrap px-3 h-7 rounded-lg text-[12px] font-medium cursor-pointer border-none transition-all ${filter === f.key ? 'bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm' : 'bg-transparent text-[color:var(--muted)]'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <MatchesListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="soccer"
            title="No matches found"
            subtitle={search || filter !== 'all' ? 'Try adjusting your filters.' : 'Create your first match to get started.'}
            action={can.createMatch ? { label: 'Create match', href: '/matches/create' } : undefined}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {paginated.map(match => (
                <div key={match.id} className="broadcast-card rounded-lg px-3 py-3 flex items-center gap-2 sm:px-4 sm:gap-4">
                  <TeamBadge name={match.homeTeam?.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="font-medium text-[13px] text-[color:var(--text)] truncate">
                        {match.homeTeam?.name ?? '—'} vs {match.awayTeam?.name ?? '—'}
                      </span>
                      <StatusBadge status={match.status} />
                    </div>
                    <div className="text-[11px] text-[color:var(--muted)] truncate">
                      {match.league.name} · {match.date}{match.time ? ` · ${match.time}` : ''}
                    </div>
                    {/* Stadium on its own line on very small screens */}
                    {match.stadium && (
                      <div className="text-[11px] text-[color:var(--faint)] truncate sm:hidden">{match.stadium}</div>
                    )}
                  </div>

                  <ScoreDisplay homeScore={match.homeTeam?.goals} awayScore={match.awayTeam?.goals} status={match.status} />

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => shareToWhatsApp(match)} title="Share on WhatsApp" aria-label="Share on WhatsApp"
                      className="w-7 h-7 grid place-items-center rounded-lg border-none bg-green-500/10 text-[color:var(--green)] cursor-pointer hover:bg-green-500/20 transition-colors sm:w-8 sm:h-8">
                      <Icon name="share" size={13} />
                    </button>
                    {can.manageLineups && (
                      <Link href={`/matches/${match.slug}/lineup`} title="Lineup" 
                        className="w-7 h-7 grid place-items-center rounded-lg no-underline bg-[color:var(--surface2)] text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface3)] transition-colors sm:w-8 sm:h-8">
                        <img src={'/lineup.png'} alt='lineup' height={20} width={20} color='white'/>
                      </Link>
                    )}
                    {can.editMatch && (
                      <Link href={`/matches/${match.slug}/edit`} title="Edit match" aria-label="Edit match"
                        className="w-7 h-7 grid place-items-center rounded-lg no-underline bg-[color:var(--surface2)] text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface3)] transition-colors sm:w-8 sm:h-8">
                        <Icon name="edit" size={13} />
                      </Link>
                    )}
                     <Link href={`/matches/${match.slug}/analytics`} title="Match Analytics" aria-label="Match analytics"
                        className="w-7 h-7 grid place-items-center rounded-lg no-underline bg-[color:var(--surface2)] text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface3)] transition-colors sm:w-8 sm:h-8">
                        <Icon name="analytics" size={13} />
                      </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination: compact on mobile */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <span className="text-[12px] text-[color:var(--muted)]">
                  Page {currentPage} of {totalPages} · {filtered.length} matches
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setPage(p => p - 1)} disabled={currentPage <= 1}
                    className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] text-[color:var(--text)] cursor-pointer disabled:opacity-40">
                    ←
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg = currentPage <= 3 ? i + 1
                      : currentPage >= totalPages - 2 ? totalPages - 4 + i
                      : currentPage - 2 + i;
                    if (pg < 1 || pg > totalPages) return null;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        className={`w-8 h-8 rounded-lg border text-[12px] cursor-pointer transition-colors ${pg === currentPage ? 'border-green-500/40 bg-green-500/10 text-[color:var(--green)] font-semibold' : 'border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)]'}`}>
                        {pg}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => p + 1)} disabled={currentPage >= totalPages}
                    className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] text-[color:var(--text)] cursor-pointer disabled:opacity-40">
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {sharedOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-sm" onClick={() => setSharedOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md mx-4 rounded-xl broadcast-card overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)] shrink-0">
              <div className="text-[15px] font-semibold text-[color:var(--text)]">Shared lineups</div>
              <button onClick={() => setSharedOpen(false)} aria-label="Close shared lineups" className="w-8 h-8 rounded-md grid place-items-center text-[color:var(--muted)] hover:text-[color:var(--text)] cursor-pointer border-none bg-transparent">
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-2.5">
              {sharedLoading ? (
                <div className="text-[13px] text-[color:var(--muted)] text-center py-6">Loading…</div>
              ) : sharedLineups.length === 0 ? (
                <div className="text-[13px] text-[color:var(--muted)] text-center py-6">
                  No lineups have been shared with you yet.
                </div>
              ) : (
                sharedLineups.map(share => {
                  const targets = eligibleTargetsFor(share);
                  const isChoosing = importingId === null && targets.length > 0;
                  return (
                    <div key={share.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[13px] font-medium text-[color:var(--text)]">
                            {share.club?.name ?? 'A lineup'}
                          </div>
                          <div className="text-[11px] text-[color:var(--muted)] mt-0.5">
                            Shared by {share.sender?.name ?? 'a broadcaster'}
                            {share.match && ` · from ${share.match.homeTeam?.name ?? '—'} vs ${share.match.awayTeam?.name ?? '—'}`}
                          </div>
                          {share.status === 'imported' && (
                            <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-[.04em] text-green-400">Imported</span>
                          )}
                        </div>
                        <button onClick={() => handleDismissShare(share)} title="Dismiss" aria-label="Dismiss shared lineup"
                          className="w-7 h-7 shrink-0 rounded-md grid place-items-center text-[color:var(--faint)] hover:text-[color:var(--text)] cursor-pointer border-none bg-transparent">
                          <Icon name="close" size={12} />
                        </button>
                      </div>

                      {share.status !== 'imported' && (
                        targets.length === 0 ? (
                          <p className="text-[11px] text-[color:var(--faint)] mt-2.5">
                            You don't have any matches involving {share.club?.name ?? 'this club'} to import into yet.
                          </p>
                        ) : (
                          <div className="mt-2.5 flex items-center gap-2">
                            <select
                              value={importingId === share.id ? importTarget : ''}
                              onChange={(e) => { setImportingId(share.id); setImportTarget(e.target.value); }}
                              className="flex-1 h-8 px-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-[12px] text-[color:var(--text)] outline-none"
                            >
                              <option value="">Choose a match…</option>
                              {targets.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.homeTeam?.name ?? '—'} vs {m.awayTeam?.name ?? '—'} · {m.date}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleImport(share)}
                              disabled={importingId !== share.id || !importTarget}
                              className="h-8 px-3 rounded-md border-none bg-[color:var(--green)] text-white text-[12px] font-semibold cursor-pointer disabled:opacity-40"
                            >
                              Import
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
