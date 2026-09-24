'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell, Icon } from '@/components/ui';

import { useRoleGuard } from '@/lib/auth';

import {
  adminGetAdvertisements,
  adminSetAdStatus,
  adminDeleteAd,
  adminGetAdAnalytics,
  adminGetTrashedAds,
  adminRestoreAd,
  adminForceDeleteAd,
  type AdvertisementData,
  type AdAnalyticsData,
  type Paginated,
  ROLES,
} from '@/lib/api';

type Tab = 'active' | 'trash';

export default function AdminAdvertisementsPage() {
  useRoleGuard([ROLES.ADMIN, ROLES.SUPERADMIN]);

  const [tab,       setTab]       = useState<Tab>('active');
  const [result,    setResult]    = useState<Paginated<AdvertisementData> | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [acting,    setActing]    = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{ adId: string; data: AdAnalyticsData } | null>(null);
  const [page,      setPage]      = useState(1);
  const [status,    setStatus]    = useState('');
  const [confirm,   setConfirm]   = useState<{ adId: string; action: 'delete' | 'force' | 'restore' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { page: String(page), per_page: '20' };
      if (status) params.status = status;
      if (tab === 'trash') {
        setResult(await adminGetTrashedAds(params));
      } else {
        setResult(await adminGetAdvertisements(params));
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, status, tab]);

  useEffect(() => { load(); }, [load]);

  const handleSetStatus = async (adId: string, newStatus: string) => {
    setActing(adId);
    try { await adminSetAdStatus(adId, newStatus); load(); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const handleDelete = async (adId: string) => {
    setActing(adId);
    try { await adminDeleteAd(adId); load(); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleRestore = async (adId: string) => {
    setActing(adId);
    try { await adminRestoreAd(adId); load(); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleForceDelete = async (adId: string) => {
    setActing(adId);
    try { await adminForceDeleteAd(adId); load(); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleAnalytics = async (adId: string) => {
    setActing(adId);
    try { setAnalytics({ adId, data: await adminGetAdAnalytics(adId) }); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const ads  = result?.data ?? [];
  const meta = result?.meta;

  return (
    <PageShell title="Advertisements">
      <div className="fluid-pad flex flex-col gap-4 pb-10">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">Advertisements</h1>
            {meta && <p className="text-[13px] text-[color:var(--muted)] mt-0.5">{meta.total} total</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[color:var(--surface2)] rounded-xl w-fit">
          {(['active', 'trash'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1); setStatus(''); }}
              className={`flex items-center gap-1.5 px-4 h-8 rounded-lg text-[13px] font-medium cursor-pointer border-none transition-all capitalize ${tab === t ? 'bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm' : 'bg-transparent text-[color:var(--muted)]'}`}>
              {t === 'trash' && <Icon name="delete" size={12} />}
              {t === 'trash' ? 'Trash' : 'Active'}
            </button>
          ))}
        </div>

        {tab === 'active' && (
          <div className="flex gap-2">
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none cursor-pointer">
              <option value="">All statuses</option>
              {['active','paused','expired'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {tab === 'trash' && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/[.07] text-orange-400 text-[13px]">
            <Icon name="delete" size={14} />
            Showing deleted ads — restore to recover, or permanently delete to remove forever.
          </div>
        )}

        {error && <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.08] text-[color:var(--red)] text-[13px]">{error}</div>}

        <div className="broadcast-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Title','Type','Status','Period','End date','Events','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-[color:var(--surface3)] animate-pulse" /></td>
                  ))}</tr>
                )) : ads.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[color:var(--muted)]">
                    {tab === 'trash' ? 'Trash is empty' : 'No advertisements found'}
                  </td></tr>
                ) : ads.map((ad: AdvertisementData) => (
                  <tr key={ad.id} className={`border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors ${tab === 'trash' ? 'opacity-70' : ''}`}>
                    <td className="px-4 py-3 font-medium text-[color:var(--text)]">{ad.title}</td>
                    <td className="px-4 py-3 text-[color:var(--text2)] capitalize">{ad.file_type}</td>
                    <td className="px-4 py-3">
                      {tab === 'trash' ? (
                        <span className="px-2 py-px rounded-full text-[10px] font-bold uppercase border border-orange-500/30 bg-orange-500/10 text-orange-400">Deleted</span>
                      ) : (
                        <span className={`px-2 py-px rounded-full text-[10px] font-bold uppercase border ${
                          ad.status === 'active'  ? 'border-green-500/30 bg-green-500/10 text-[color:var(--green)]' :
                          ad.status === 'paused'  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
                          'border-[color:var(--border)] text-[color:var(--muted)]'}`}>
                          {ad.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{ad.period ?? '—'}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{ad.end_date ? new Date(ad.end_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-[color:var(--text2)]">{ad.events_count ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {tab === 'trash' ? (
                          <>
                            <button onClick={() => setConfirm({ adId: ad.id, action: 'restore' })} disabled={acting === ad.id}
                              title="Restore" aria-label="Restore" className="w-8 h-8 grid place-items-center rounded-lg border-none bg-green-500/10 text-[color:var(--green)] cursor-pointer hover:bg-green-500/20 transition-colors disabled:opacity-50">
                              <Icon name="check" size={13} />
                            </button>
                            <button onClick={() => setConfirm({ adId: ad.id, action: 'force' })} disabled={acting === ad.id}
                              title="Delete forever" aria-label="Delete forever" className="w-8 h-8 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                              {acting === ad.id ? <span className="spinner" /> : <Icon name="delete" size={13} />}
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleAnalytics(ad.id)} disabled={acting === ad.id}
                              title="Analytics" aria-label="Analytics" className="w-8 h-8 grid place-items-center rounded-lg border-none bg-blue-500/10 text-[color:var(--blue)] cursor-pointer hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                              <Icon name="chart" size={13} />
                            </button>
                            {ad.status !== 'active' && (
                              <button onClick={() => handleSetStatus(ad.id, 'active')} disabled={acting === ad.id}
                                title="Activate" aria-label="Activate" className="w-8 h-8 grid place-items-center rounded-lg border-none bg-green-500/10 text-[color:var(--green)] cursor-pointer hover:bg-green-500/20 transition-colors disabled:opacity-50">
                                <Icon name="check" size={13} />
                              </button>
                            )}
                            {ad.status === 'active' && (
                              <button onClick={() => handleSetStatus(ad.id, 'paused')} disabled={acting === ad.id}
                                title="Pause" aria-label="Pause" className="w-8 h-8 grid place-items-center rounded-lg border-none bg-yellow-500/10 text-yellow-400 cursor-pointer hover:bg-yellow-500/20 transition-colors disabled:opacity-50">
                                <Icon name="pause" size={13} />
                              </button>
                            )}
                            <button onClick={() => setConfirm({ adId: ad.id, action: 'delete' })} disabled={acting === ad.id}
                              title="Move to trash" aria-label="Move to trash" className="w-8 h-8 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                              {acting === ad.id ? <span className="spinner" /> : <Icon name="delete" size={13} />}
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
                <button onClick={() => setPage(p => p - 1)} disabled={meta.current_page <= 1}
                  className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">← Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={meta.current_page >= meta.last_page}
                  className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Confirm modal */}
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[color:var(--surface)] rounded-2xl border border-[color:var(--border)] p-4 sm:p-6 w-full max-w-sm mx-4 shadow-2xl">
              <h3 className="text-[16px] font-semibold text-[color:var(--text)] mb-2">
                {confirm.action === 'delete'  ? 'Move to trash?'            :
                 confirm.action === 'restore' ? 'Restore advertisement?'    :
                                               'Delete advertisement forever?'}
              </h3>
              <p className="text-[13px] text-[color:var(--muted)] mb-5">
                {confirm.action === 'delete'  ? 'This ad will be moved to trash. You can restore it later.' :
                 confirm.action === 'restore' ? 'The advertisement will be restored and available again.' :
                                               'This permanently deletes the advertisement and all its data. This cannot be undone.'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(null)} className="flex-1 h-9 rounded-lg border border-[color:var(--border)] bg-transparent text-[13px] text-[color:var(--text)] cursor-pointer">Cancel</button>
                <button
                  onClick={() => {
                    if (confirm.action === 'delete')  handleDelete(confirm.adId);
                    if (confirm.action === 'restore') handleRestore(confirm.adId);
                    if (confirm.action === 'force')   handleForceDelete(confirm.adId);
                  }}
                  disabled={acting === confirm.adId}
                  className="flex-1 h-9 rounded-lg border-none text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50"
                  style={{ background: confirm.action === 'restore' ? 'var(--green)' : 'var(--red)' }}>
                  {acting === confirm.adId ? <span className="spinner" /> :
                    confirm.action === 'delete'  ? 'Move to Trash' :
                    confirm.action === 'restore' ? 'Restore'       :
                                                   'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics modal */}
        {analytics && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[color:var(--surface)] rounded-2xl border border-[color:var(--border)] p-4 sm:p-6 w-full max-w-md mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-semibold text-[color:var(--text)]">Ad Analytics</h3>
                <button onClick={() => setAnalytics(null)}
                  aria-label="Close analytics"
                  className="w-8 h-8 grid place-items-center rounded-lg border-none bg-transparent text-[color:var(--muted)] cursor-pointer hover:text-[color:var(--text)]">
                  <Icon name="close" size={15} />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { label: 'Impressions',   value: analytics.data.impressions ?? 0 },
                  { label: 'Plays',         value: analytics.data.plays ?? 0 },
                  { label: 'Completions',   value: analytics.data.completed ?? 0 },
                  { label: 'Avg viewers',   value: analytics.data.avg_views ?? '—' },
                  { label: 'Total play time', value: analytics.data.total_play_time ? `${analytics.data.total_play_time}s` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[color:var(--border)] last:border-0">
                    <span className="text-[13px] text-[color:var(--muted)]">{label}</span>
                    <span className="text-[13px] font-semibold text-[color:var(--text)]">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
