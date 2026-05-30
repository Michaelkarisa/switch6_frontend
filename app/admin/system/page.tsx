'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell, Icon } from '@/components/ui';
import {
  adminGetHealth,
  adminClearCache,
  adminGetFailedJobs,
  adminRetryJob,
  adminFlushFailedJobs,
  type SystemHealthData,
  type FailedJob,
  type Paginated,
} from '@/lib/api';
import { useRoleGuard } from '@/lib/auth';
import { ROLES } from '@/lib/api';

function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${ok ? 'text-[color:var(--green)]' : 'text-[color:var(--red)]'}`}>
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: ok ? 'var(--green)' : 'var(--red)' }} />
      {ok ? 'OK' : 'Error'}
    </span>
  );
}

export default function AdminSystemPage() {
  useRoleGuard([ROLES.ADMIN, ROLES.SUPERADMIN]);

  const [health,  setHealth]  = useState<SystemHealthData | null>(null);
  const [jobs,    setJobs]    = useState<Paginated<FailedJob> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice,  setNotice]  = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [acting,  setActing]  = useState<string | null>(null);
  const [jobPage, setJobPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, j] = await Promise.all([
        adminGetHealth(),
        adminGetFailedJobs({ page: String(jobPage), per_page: '20' }),
      ]);
      setHealth(h);
      setJobs(j);
    } catch (e: any) {
      setNotice({ type: 'error', text: e.message });
    } finally { setLoading(false); }
  }, [jobPage]);

  useEffect(() => { load(); }, [load]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleClearCache = async () => {
    setActing('cache');
    try { await adminClearCache(); showNotice('success', 'Cache cleared successfully'); }
    catch (e: any) { showNotice('error', e.message); }
    finally { setActing(null); }
  };

  const handleRetryJob = async (id: number) => {
    setActing(`job-${id}`);
    try { await adminRetryJob(id); showNotice('success', `Job #${id} queued for retry`); load(); }
    catch (e: any) { showNotice('error', e.message); }
    finally { setActing(null); }
  };

  const handleFlushJobs = async () => {
    if (!confirm('Flush ALL failed jobs?')) return;
    setActing('flush');
    try { await adminFlushFailedJobs(); showNotice('success', 'All failed jobs flushed'); load(); }
    catch (e: any) { showNotice('error', e.message); }
    finally { setActing(null); }
  };

  const failedJobs = jobs?.data ?? [];
  const meta       = jobs?.meta;

  // Helper to parse job class from payload JSON
  const jobClass = (job: FailedJob): string => {
    try { return (JSON.parse(job.payload) as { displayName?: string; job?: string }).displayName ?? 'Unknown'; }
    catch { return 'Unknown'; }
  };

  return (
    <PageShell title="System">
      <div className="fluid-pad flex flex-col gap-4 pb-10 sm:gap-5">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">System</h1>
          <button onClick={load}
            className="flex items-center gap-2 px-4 h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] font-medium text-[color:var(--text)] cursor-pointer hover:bg-[color:var(--surface3)] transition-colors">
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>

        {notice && (
          <div className={`px-4 py-3 rounded-xl border text-[13px] ${notice.type === 'success' ? 'border-green-500/30 bg-green-500/[.08] text-[color:var(--green)]' : 'border-red-500/30 bg-red-500/[.08] text-[color:var(--red)]'}`}>
            {notice.text}
          </div>
        )}

        {/* Health sections */}
        {loading ? (
          <div className="h-40 rounded-lg bg-[color:var(--surface2)] animate-pulse" />
        ) : health && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* App */}
            <div className="broadcast-card rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[.06em] text-[color:var(--muted)] mb-3">App</h3>
              {Object.entries(health.app).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-[color:var(--border)] last:border-0">
                  <span className="text-[13px] text-[color:var(--muted)] capitalize">{k.replaceAll('_', ' ')}</span>
                  <span className="text-[13px] font-semibold text-[color:var(--text)]">{String(v)}</span>
                </div>
              ))}
            </div>

            {/* Database */}
            <div className="broadcast-card rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[.06em] text-[color:var(--muted)] mb-3">Database</h3>
              {Object.entries(health.database).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-[color:var(--border)] last:border-0">
                  <span className="text-[13px] text-[color:var(--muted)] capitalize">{k.replaceAll('_', ' ')}</span>
                  <span className="text-[13px] font-semibold text-[color:var(--text)]">{String(v)}</span>
                </div>
              ))}
            </div>

            {/* Cache */}
            <div className="broadcast-card rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[.06em] text-[color:var(--muted)] mb-3">Cache</h3>
              <div className="flex items-center justify-between py-1.5 border-b border-[color:var(--border)]">
                <span className="text-[13px] text-[color:var(--muted)]">Status</span>
                <HealthDot ok={health.cache.status === 'connected'} />
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-[color:var(--muted)]">Driver</span>
                <span className="text-[13px] font-semibold text-[color:var(--text)]">{health.cache.driver}</span>
              </div>
              {health.cache.error && (
                <p className="text-[11px] text-[color:var(--red)] mt-1">{health.cache.error}</p>
              )}
              <button onClick={handleClearCache} disabled={acting === 'cache'}
                className="mt-3 flex items-center gap-2 px-3 h-8 rounded-lg border-none bg-red-500/10 text-[color:var(--red)] text-[12px] font-medium cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                {acting === 'cache' ? <span className="spinner" /> : <Icon name="delete" size={13} />}
                Flush cache
              </button>
            </div>

            {/* Queue */}
            <div className="broadcast-card rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[.06em] text-[color:var(--muted)] mb-3">Queue</h3>
              <div className="flex items-center justify-between py-1.5 border-b border-[color:var(--border)]">
                <span className="text-[13px] text-[color:var(--muted)]">Driver</span>
                <span className="text-[13px] font-semibold text-[color:var(--text)]">{health.queue.driver}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[color:var(--border)]">
                <span className="text-[13px] text-[color:var(--muted)]">Pending</span>
                <span className="text-[13px] font-semibold text-[color:var(--text)]">{health.queue.pending}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[color:var(--border)]">
                <span className="text-[13px] text-[color:var(--muted)]">Failed</span>
                <span className="text-[13px] font-semibold" style={{ color: health.queue.failed > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {health.queue.failed}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-[color:var(--muted)]">After commit</span>
                <HealthDot ok={health.queue.after_commit === true} />
              </div>
            </div>
          </div>
        )}

        {/* Failed jobs */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[.06em] text-[color:var(--muted)]">
              Failed jobs {meta ? `(${meta.total})` : ''}
            </h2>
            {failedJobs.length > 0 && (
              <button onClick={handleFlushJobs} disabled={acting === 'flush'}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg border-none bg-red-500/10 text-[color:var(--red)] text-[12px] font-medium cursor-pointer hover:bg-red-500/20 disabled:opacity-50">
                {acting === 'flush' ? <span className="spinner" /> : <Icon name="delete" size={13} />} Flush all
              </button>
            )}
          </div>

          <div className="broadcast-card rounded-lg overflow-hidden">
            {failedJobs.length === 0 ? (
              <div className="px-4 py-8 text-center text-[color:var(--green)] text-[13px]">
                <Icon name="check" size={20} className="mx-auto mb-2" />
                No failed jobs — queue is healthy
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[color:var(--border)]">
                      {['#', 'Queue', 'Job class', 'Failed at', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {failedJobs.map((job: FailedJob) => (
                      <tr key={job.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors">
                        <td className="px-4 py-3 font-mono text-[color:var(--muted)]">{job.id}</td>
                        <td className="px-4 py-3 text-[color:var(--text2)]">{job.queue}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--muted)] max-w-[200px] truncate">{jobClass(job)}</td>
                        <td className="px-4 py-3 text-[color:var(--muted)]">{new Date(job.failed_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleRetryJob(job.id)} disabled={acting === `job-${job.id}`}
                            className="flex items-center gap-1.5 px-3 h-7 rounded-lg border-none bg-blue-500/10 text-[color:var(--blue)] text-[11px] font-medium cursor-pointer hover:bg-blue-500/20 disabled:opacity-50">
                            {acting === `job-${job.id}` ? <span className="spinner" /> : <Icon name="refresh" size={11} />}
                            Retry
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--border)]">
                <span className="text-[12px] text-[color:var(--muted)]">
                  Page {meta.current_page} of {meta.last_page} · {meta.total} jobs
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setJobPage(p => p - 1)} disabled={meta.current_page <= 1}
                    className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">← Prev</button>
                  <button onClick={() => setJobPage(p => p + 1)} disabled={meta.current_page >= meta.last_page}
                    className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
