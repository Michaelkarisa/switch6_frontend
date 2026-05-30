'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell, Icon } from '@/components/ui';
import { useRoleGuard, getRoleLabel, getRoleColor } from '@/lib/auth';
import { useRouter } from 'next/navigation';

import {
  adminGetUsers,
  adminSuspendUser,
  adminActivateUser,
  adminDeleteUser,
  adminImpersonate,
  adminGetTrashedUsers,
  adminRestoreUser,
  adminForceDeleteUser,
  setAuthToken,
  roleDashboard,
  type AdminUserData,
  type Paginated,
  ROLES,
} from '@/lib/api';

type Tab = 'active' | 'trash';
type Filter = { search: string; status: string; role: string; page: number };

function StatusDot({ status }: { status?: string }) {
  const color = status === 'active' ? 'var(--green)' : status === 'suspended' ? 'var(--red)' : 'var(--muted)';
  return <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ background: color }} />;
}

export default function AdminUsersPage() {
  useRoleGuard([ROLES.ADMIN, ROLES.SUPERADMIN]);
  const router = useRouter();

  const [tab,     setTab]     = useState<Tab>('active');
  const [result,  setResult]  = useState<Paginated<AdminUserData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState<Filter>({ search: '', status: '', role: '', page: 1 });
  const [acting,  setActing]  = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    userId: string; name: string;
    action: 'delete' | 'suspend' | 'restore' | 'force';
  } | null>(null);

  const load = useCallback(async (f: Filter, t: Tab) => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { page: String(f.page), per_page: '20' };
      if (f.search) params.search = f.search;
      if (f.status) params.status = f.status;
      if (f.role)   params.role   = f.role;
      if (t === 'trash') {
        setResult(await adminGetTrashedUsers(params));
      } else {
        setResult(await adminGetUsers(params));
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filter, tab); }, [filter, tab, load]);

  const handleSuspend = async (userId: string) => {
    setActing(userId);
    try { await adminSuspendUser(userId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleActivate = async (userId: string) => {
    setActing(userId);
    try { await adminActivateUser(userId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const handleDelete = async (userId: string) => {
    setActing(userId);
    try { await adminDeleteUser(userId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleRestore = async (userId: string) => {
    setActing(userId);
    try { await adminRestoreUser(userId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleForceDelete = async (userId: string) => {
    setActing(userId);
    try { await adminForceDeleteUser(userId); load(filter, tab); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleImpersonate = async (userId: string) => {
    setActing(userId);
    try {
      const { token } = await adminImpersonate(userId);
      localStorage.setItem('switch6-admin-token', localStorage.getItem('switch6-token') ?? '');
      setAuthToken(token);
      router.push(roleDashboard());
    } catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const users = result?.data ?? [];
  const meta  = result?.meta;

  return (
    <PageShell title="Users">
      <div className="fluid-pad flex flex-col gap-4 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">Users</h1>
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
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[color:var(--faint)]"><Icon name="search" size={14} /></span>
            <input
              value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value, page: 1 }))}
              placeholder="Search name / email…"
              className="h-9 pl-9 pr-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none w-60"
            />
          </div>

          {tab === 'active' && [
            { key: 'status' as const, options: [['', 'All status'], ['active', 'Active'], ['suspended', 'Suspended']] },
            { key: 'role' as const,   options: [['', 'All roles'], ['broadcaster', 'Broadcaster'], ['advertiser', 'Advertiser'], ['admin', 'Admin']] },
          ].map(({ key, options }) => (
            <select key={key}
              /* ✅ FIX 1: Replaced unsafe cast with typed index lookup */
              value={filter[key]}
              onChange={e => setFilter(f => ({ ...f, [key]: e.target.value, page: 1 } as Filter))}
              className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none cursor-pointer"
            >
              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>

        {/* Trash banner */}
        {tab === 'trash' && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/[.07] text-orange-400 text-[13px]">
            <Icon name="delete" size={14} />
            Showing soft-deleted users — restore to recover, or permanently delete to remove forever.
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.08] text-[color:var(--red)] text-[13px]">{error}</div>
        )}

        {/* Table */}
        <div className="broadcast-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['User', 'Role', 'Status', 'Matches', 'Subscriptions', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-[color:var(--surface3)] animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[color:var(--muted)]">
                    {tab === 'trash' ? 'Trash is empty' : 'No users found'}
                  </td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className={`border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors ${tab === 'trash' ? 'opacity-70' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center font-semibold text-white text-[11px] shrink-0">
                            {u.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <div className="font-medium text-[color:var(--text)]">{u.name}</div>
                            <div className="text-[11px] text-[color:var(--muted)]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-[.05em] border"
                          style={{ color: getRoleColor(u.role), borderColor: getRoleColor(u.role) + '44', background: getRoleColor(u.role) + '14' }}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tab === 'trash' ? (
                          <span className="inline-flex items-center px-2 py-px rounded-full text-[10px] font-bold uppercase border border-orange-500/30 bg-orange-500/10 text-orange-400">
                            Deleted
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <StatusDot status={u.status} />
                            <span className="capitalize text-[color:var(--text2)]">{u.status ?? 'active'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text2)]">{u.matches_count ?? '—'}</td>
                      <td className="px-4 py-3 text-[color:var(--text2)]">{u.subscriptions_count ?? '—'}</td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {tab === 'trash' ? (
                            <>
                              <button onClick={() => setConfirm({ userId: u.id, name: u.name, action: 'restore' })} disabled={acting === u.id}
                                title="Restore"
                                className="w-7 h-7 grid place-items-center rounded-lg border-none bg-green-500/10 text-[color:var(--green)] cursor-pointer hover:bg-green-500/20 transition-colors disabled:opacity-50">
                                <Icon name="check" size={13} />
                              </button>
                              <button onClick={() => setConfirm({ userId: u.id, name: u.name, action: 'force' })} disabled={acting === u.id}
                                title="Permanently delete"
                                className="w-7 h-7 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                                {acting === u.id ? <span className="spinner" /> : <Icon name="delete" size={13} />}
                              </button>
                            </>
                          ) : (
                            <>
                              {u.status === 'suspended' ? (
                                <button onClick={() => handleActivate(u.id)} disabled={acting === u.id}
                                  title="Activate"
                                  className="w-7 h-7 grid place-items-center rounded-lg border-none bg-green-500/10 text-[color:var(--green)] cursor-pointer hover:bg-green-500/20 transition-colors disabled:opacity-50">
                                  {acting === u.id ? <span className="spinner" /> : <Icon name="check" size={13} />}
                                </button>
                              ) : (
                                <button onClick={() => setConfirm({ userId: u.id, name: u.name, action: 'suspend' })} disabled={acting === u.id}
                                  title="Suspend"
                                  className="w-7 h-7 grid place-items-center rounded-lg border-none bg-yellow-500/10 text-yellow-400 cursor-pointer hover:bg-yellow-500/20 transition-colors disabled:opacity-50">
                                  <Icon name="pause" size={13} />
                                </button>
                              )}
                              <button onClick={() => handleImpersonate(u.id)} disabled={acting === u.id}
                                title="Impersonate"
                                className="w-7 h-7 grid place-items-center rounded-lg border-none bg-blue-500/10 text-[color:var(--blue)] cursor-pointer hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                                <Icon name="person" size={13} />
                              </button>
                              <button onClick={() => setConfirm({ userId: u.id, name: u.name, action: 'delete' })} disabled={acting === u.id}
                                title="Move to trash"
                                className="w-7 h-7 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                                <Icon name="delete" size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--border)]">
              <span className="text-[12px] text-[color:var(--muted)]">
                Page {meta.current_page} of {meta.last_page} · {meta.total} users
              </span>
              <div className="flex gap-2">
                <button onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))} disabled={meta.current_page <= 1}
                  className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] text-[color:var(--text)] cursor-pointer disabled:opacity-40">← Prev</button>
                <button onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))} disabled={meta.current_page >= meta.last_page}
                  className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] text-[color:var(--text)] cursor-pointer disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Confirm modal */}
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[color:var(--surface)] rounded-2xl border border-[color:var(--border)] p-4 sm:p-6 w-full max-w-sm mx-4 shadow-2xl">
              <h3 className="text-[16px] font-semibold text-[color:var(--text)] mb-2">
                {confirm.action === 'delete'  ? 'Move to trash?'        :
                 confirm.action === 'suspend' ? 'Suspend user?'         :
                 confirm.action === 'restore' ? 'Restore user?'         :
                                               'Permanently delete user?'}
              </h3>
              <p className="text-[13px] text-[color:var(--muted)] mb-5">
                {confirm.action === 'delete'  ? `"${confirm.name}" will be moved to trash. You can restore them later.` :
                 confirm.action === 'suspend' ? `This will suspend "${confirm.name}" and immediately revoke all active sessions.` :
                 confirm.action === 'restore' ? `"${confirm.name}" will be restored and can log in again.` :
                                               `This will permanently erase "${confirm.name}" and all their data. This cannot be undone.`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(null)}
                  className="flex-1 h-9 rounded-lg border border-[color:var(--border)] bg-transparent text-[13px] text-[color:var(--text)] cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirm.action === 'delete')  handleDelete(confirm.userId);
                    if (confirm.action === 'suspend') handleSuspend(confirm.userId);
                    if (confirm.action === 'restore') handleRestore(confirm.userId);
                    if (confirm.action === 'force')   handleForceDelete(confirm.userId);
                  }}
                  disabled={acting === confirm.userId}
                  className="flex-1 h-9 rounded-lg border-none text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50"
                  style={{
                    background:
                      confirm.action === 'restore' ? 'var(--green)' :
                      confirm.action === 'suspend' ? 'var(--gold)'  :
                                                     'var(--red)',
                  }}
                >
                  {acting === confirm.userId ? <span className="spinner" /> :
                    confirm.action === 'delete'  ? 'Move to Trash'  :
                    confirm.action === 'suspend' ? 'Suspend'        :
                    confirm.action === 'restore' ? 'Restore'        :
                                                   'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}