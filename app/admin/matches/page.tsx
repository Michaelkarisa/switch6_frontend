'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell, Icon, StatusBadge } from '@/components/ui';

import { useRoleGuard } from '@/lib/auth';

import {
  adminGetMatches,
  adminForceDeleteMatch,
  adminSoftDeleteMatch,
  adminReassignMatch,
  adminGetUsers,
  adminGetTrashedMatches,
  adminRestoreMatch,
  type MatchData,
  type Paginated,
  type AdminUserData,
  ROLES,
} from '@/lib/api';

type Tab = 'active' | 'trash';
type Filter = { status: string; author_id: string; from: string; to: string; page: number };

export default function AdminMatchesPage() {
  useRoleGuard([ROLES.ADMIN, ROLES.SUPERADMIN]);

  const [tab,        setTab]        = useState<Tab>('active');
  const [result,     setResult]     = useState<Paginated<MatchData> | null>(null);
  const [users,      setUsers]      = useState<AdminUserData[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [acting,     setActing]     = useState<string | null>(null);
  const [filter,     setFilter]     = useState<Filter>({ status: '', author_id: '', from: '', to: '', page: 1 });
  const [reassign,   setReassign]   = useState<{ matchId: string; newAuthorId: string } | null>(null);
  const [confirm,    setConfirm]    = useState<{ matchId: string; action: 'softDelete' | 'force' | 'restore' } | null>(null);

  const load = useCallback(async (f: Filter, t: Tab) => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { page: String(f.page), per_page: '20' };
      if (f.status)    params.status    = f.status;
      if (f.author_id) params.author_id = f.author_id;
      if (f.from)      params.from      = f.from;
      if (f.to)        params.to        = f.to;
      if (t === 'trash') {
        setResult(await adminGetTrashedMatches(params));
      } else {
        setResult(await adminGetMatches(params));
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filter, tab); }, [filter, tab, load]);

  useEffect(() => {
    adminGetUsers({ role: 'broadcaster', per_page: '100' })
      .then(r => setUsers(r.data))
      .catch(() => {});
  }, []);

  // Soft delete (move to trash)
  const handleSoftDelete = async (matchId: string) => {
    setActing(matchId);
    try { await adminSoftDeleteMatch(matchId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleRestore = async (matchId: string) => {
    setActing(matchId);
    try { await adminRestoreMatch(matchId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleForceDelete = async (matchId: string) => {
    setActing(matchId);
    try { await adminForceDeleteMatch(matchId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleReassign = async () => {
    if (!reassign?.matchId || !reassign.newAuthorId) return;
    setActing(reassign.matchId);
    try { await adminReassignMatch(reassign.matchId, reassign.newAuthorId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setReassign(null); }
  };

  const matches = result?.data ?? [];
  const meta    = result?.meta;

  return (
    <PageShell title="All Matches">
      <div className="fluid-pad flex flex-col gap-4 pb-10">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">All Matches</h1>
            {meta && <p className="text-[13px] text-[color:var(--muted)] mt-0.5">{meta.total} total</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[color:var(--surface2)] rounded-xl w-fit">
          {(['active', 'trash'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setFilter(f => ({ ...f, page: 1 })); }}
              className={`flex items-center gap-1.5 px-4 h-8 rounded-lg text-[13px] font-medium cursor-pointer border-none transition-all capitalize ${tab === t ? 'bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm' : 'bg-transparent text-[color:var(--muted)]'}`}>
              {t === 'trash' && <Icon name="delete" size={12} />}
              {t === 'trash' ? 'Trash' : 'Active'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {tab === 'active' && (
            <select value={filter.status}
              onChange={e => setFilter(f => ({ ...f, status: e.target.value, page: 1 }))}
              className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none cursor-pointer">
              <option value="">All statuses</option>
              {['scheduled','live','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input type="date" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value, page: 1 }))}
            className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none" />
          <input type="date" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value, page: 1 }))}
            className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none" />
        </div>

        {tab === 'trash' && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/[.07] text-orange-400 text-[13px]">
            <Icon name="delete" size={14} />
            Showing deleted matches — restore to recover, or permanently delete to remove forever.
          </div>
        )}

        {error && <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.08] text-[color:var(--red)] text-[13px]">{error}</div>}

        <div className="broadcast-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Match', 'League', 'Date', 'Status', 'Score', 'Author', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-[color:var(--surface3)] animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : matches.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[color:var(--muted)]">
                    {tab === 'trash' ? 'Trash is empty' : 'No matches found'}
                  </td></tr>
                ) : matches.map((m: MatchData) => (
                  <tr key={m.id} className={`border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors ${tab === 'trash' ? 'opacity-70' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[color:var(--text)]">
                        {m.home_club?.name ?? '—'} vs {m.away_club?.name ?? '—'}
                      </div>
                      <div className="text-[11px] text-[color:var(--muted)] font-mono">{m.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--text2)]">
                      {typeof m.league === 'object' && m.league !== null
                        ? (m.league as { leaguename?: string; name?: string }).leaguename
                          ?? (m.league as { name?: string }).name
                          ?? 'Freindly'
                        : (m.league as string) ?? 'Freindly'}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{new Date(m.match_date??'').toLocaleDateString() ?? '—'} . {new Date(m.match_date??'').toLocaleTimeString()}</td>
                    <td className="px-4 py-3">
                      {tab === 'trash'
                        ? <span className="px-2 py-px rounded-full text-[10px] font-bold uppercase border border-orange-500/30 bg-orange-500/10 text-orange-400">Deleted</span>
                        : <StatusBadge status={m.status} />
                      }
                    </td>
                    <td className="px-4 py-3 font-mono text-[color:var(--text2)]">
                      {m.homeTeam?.goals ?? 0} – {m.awayTeam?.goals ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{m.author?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {tab === 'trash' ? (
                          <>
                            <button title="Restore" onClick={() => setConfirm({ matchId: m.id, action: 'restore' })} disabled={acting === m.id}
                              className="w-7 h-7 grid place-items-center rounded-lg border-none bg-green-500/10 text-[color:var(--green)] cursor-pointer hover:bg-green-500/20 transition-colors disabled:opacity-50">
                              <Icon name="check" size={13} />
                            </button>
                            <button title="Delete forever" onClick={() => setConfirm({ matchId: m.id, action: 'force' })} disabled={acting === m.id}
                              className="w-7 h-7 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                              {acting === m.id ? <span className="spinner" /> : <Icon name="delete" size={13} />}
                            </button>
                          </>
                        ) : (
                          <>
                            <button title="Reassign author" onClick={() => setReassign({ matchId: m.id, newAuthorId: '' })}
                              className="w-7 h-7 grid place-items-center rounded-lg border-none bg-blue-500/10 text-[color:var(--blue)] cursor-pointer hover:bg-blue-500/20 transition-colors">
                              <Icon name="person" size={13} />
                            </button>
                            <button title="Move to trash" onClick={() => setConfirm({ matchId: m.id, action: 'softDelete' })} disabled={acting === m.id}
                              className="w-7 h-7 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                              {acting === m.id ? <span className="spinner" /> : <Icon name="delete" size={13} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--border)]">
              <span className="text-[12px] text-[color:var(--muted)]">Page {meta.current_page} of {meta.last_page}</span>
              <div className="flex gap-2">
                <button onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))} disabled={meta.current_page <= 1}
                  className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">← Prev</button>
                <button onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))} disabled={meta.current_page >= meta.last_page}
                  className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Action confirm modal */}
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[color:var(--surface)] rounded-2xl border border-[color:var(--border)] p-4 sm:p-6 w-full max-w-sm mx-4 shadow-2xl">
              <h3 className="text-[16px] font-semibold text-[color:var(--text)] mb-2">
                {confirm.action === 'softDelete' ? 'Move match to trash?' :
                 confirm.action === 'restore'    ? 'Restore match?'       :
                                                   'Delete match forever?'}
              </h3>
              <p className="text-[13px] text-[color:var(--muted)] mb-5">
                {confirm.action === 'softDelete' ? 'The match will be moved to trash. You can restore it later.' :
                 confirm.action === 'restore'    ? 'The match will be restored and visible again.' :
                                                   'This permanently deletes the match, all its lineups and scorers. This cannot be undone.'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(null)} className="flex-1 h-9 rounded-lg border border-[color:var(--border)] bg-transparent text-[13px] text-[color:var(--text)] cursor-pointer">Cancel</button>
                <button
                  onClick={() => {
                    if (confirm.action === 'softDelete') handleSoftDelete(confirm.matchId);
                    if (confirm.action === 'restore')    handleRestore(confirm.matchId);
                    if (confirm.action === 'force')      handleForceDelete(confirm.matchId);
                  }}
                  disabled={acting === confirm.matchId}
                  className="flex-1 h-9 rounded-lg border-none text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50"
                  style={{ background: confirm.action === 'restore' ? 'var(--green)' : 'var(--red)' }}>
                  {acting === confirm.matchId ? <span className="spinner" /> :
                    confirm.action === 'softDelete' ? 'Move to Trash' :
                    confirm.action === 'restore'    ? 'Restore'       :
                                                      'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reassign modal */}
        {reassign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[color:var(--surface)] rounded-2xl border border-[color:var(--border)] p-4 sm:p-6 w-full max-w-sm mx-4 shadow-2xl">
              <h3 className="text-[16px] font-semibold text-[color:var(--text)] mb-4">Reassign match author</h3>
              <select value={reassign.newAuthorId}
                onChange={e => setReassign(r => r ? { ...r, newAuthorId: e.target.value } : null)}
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none mb-4">
                <option value="">Select broadcaster…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setReassign(null)} className="flex-1 h-9 rounded-lg border border-[color:var(--border)] bg-transparent text-[13px] text-[color:var(--text)] cursor-pointer">Cancel</button>
                <button onClick={handleReassign} disabled={!reassign.newAuthorId || acting === reassign.matchId}
                  className="flex-1 h-9 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50">
                  {acting === reassign.matchId ? <span className="spinner" /> : 'Reassign'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}