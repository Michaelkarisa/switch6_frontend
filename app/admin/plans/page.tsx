'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell, Icon } from '@/components/ui';

import { useRoleGuard } from '@/lib/auth';

import {
  adminGetPlans,
  adminTogglePlan,
  adminDeletePlan,
  adminGetSubscriptions,
  adminRevokeSubscription,
  adminExtendSubscription,
  adminCreatePlan,
  adminUpdatePlan,
  adminGetTrashedPlans,
  adminRestorePlan,
  adminForceDeletePlan,
  type PlanData,
  type SubscriptionData,
  type Paginated,
  ROLES,
} from '@/lib/api';
import { BoxSelect } from 'lucide-react';

type Tab = 'plans' | 'subscriptions' | 'trash';

export default function AdminPlansPage() {
  useRoleGuard([ROLES.ADMIN, ROLES.SUPERADMIN]);

  const [tab,    setTab]    = useState<Tab>('plans');
  const [plans,  setPlans]  = useState<PlanData[]>([]);
  const [subRes, setSubRes] = useState<Paginated<SubscriptionData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [acting,  setActing]  = useState<string | null>(null);
  const [extendModal, setExtendModal] = useState<{ subId: string; days: string } | null>(null);
  const [planForm, setPlanForm] = useState<Partial<PlanData> & { editing?: string } | null>(null);
  const [subPage, setSubPage] = useState(1);
  const [trashedPlans, setTrashedPlans] = useState<PlanData[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true); setError('');
    try { setPlans(await adminGetPlans()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const loadSubs = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try { setSubRes(await adminGetSubscriptions({ page: String(page), per_page: '20' })); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const loadTrash = useCallback(async () => {
    setTrashLoading(true);
    try { setTrashedPlans(await adminGetTrashedPlans()); }
    catch (e: any) { setError((e as Error).message); }
    finally { setTrashLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'plans') loadPlans();
    else if (tab === 'subscriptions') loadSubs(subPage);
    else loadTrash();
  }, [tab, subPage, loadPlans, loadSubs, loadTrash]);

  const handleToggle = async (planId: string) => {
    setActing(planId);
    try { await adminTogglePlan(planId); loadPlans(); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Delete this plan? This will fail if it has active subscribers.')) return;
    setActing(planId);
    try { await adminDeletePlan(planId); loadPlans(); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const handleRevoke = async (subId: string) => {
    if (!confirm('Revoke this subscription?')) return;
    setActing(subId);
    try { await adminRevokeSubscription(subId); loadSubs(subPage); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const handleExtend = async () => {
    if (!extendModal) return;
    const days = parseInt(extendModal.days);
    if (!days || days < 1) return;
    setActing(extendModal.subId);
    try { await adminExtendSubscription(extendModal.subId, days); loadSubs(subPage); setExtendModal(null); }
    catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const handleRestorePlan = async (planId: string) => {
    setActing(planId);
    try { await adminRestorePlan(planId); loadTrash(); loadPlans(); }
    catch (e: any) { setError((e as Error).message); }
    finally { setActing(null); }
  };

  const handleForceDeletePlan = async (planId: string) => {
    if (!confirm('Permanently delete this plan? This cannot be undone.')) return;
    setActing(planId);
    try { await adminForceDeletePlan(planId); loadTrash(); }
    catch (e: any) { setError((e as Error).message); }
    finally { setActing(null); }
  };

  const handleSavePlan = async () => {
    if (!planForm) return;
    setActing('plan-form');
    try {
      if (planForm.editing) {
        await adminUpdatePlan(planForm.editing, planForm);
      } else {
        await adminCreatePlan(planForm);
      }
      setPlanForm(null);
      loadPlans();
    } catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  };

  const subs = subRes?.data ?? [];
  const meta = subRes?.meta;

  return (
    <PageShell title="Plans & Billing">
      <div className="fluid-pad flex flex-col gap-4 pb-10">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">Plans & Billing</h1>
          {tab === 'plans' && (
            <button onClick={() => setPlanForm({})}
              className="flex items-center gap-2 px-4 h-9 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer">
              <Icon name="add-circle" size={14} /> New plan
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[color:var(--surface2)] rounded-xl w-fit">
          {(['plans', 'subscriptions', 'trash'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 h-8 rounded-lg text-[13px] font-medium cursor-pointer border-none transition-all capitalize ${tab === t ? 'bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm' : 'bg-transparent text-[color:var(--muted)]'}`}>
              {t === 'trash' && <Icon name="delete" size={12} />}
              {t === 'trash' ? 'Trash' : t}
            </button>
          ))}
        </div>

        {error && <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.08] text-[color:var(--red)] text-[13px]">{error}</div>}

        {/* ── Plans tab ─────────────────────────────────── */}
        {tab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-[color:var(--surface2)] animate-pulse" />
            )) : plans.map(plan => (
              <div key={plan.id} className="broadcast-card rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-[color:var(--text)]">{plan.name}</div>
                    <div className="text-[11px] text-[color:var(--muted)] mt-0.5">{plan.description ?? '—'}</div>
                  </div>
                  <span className={`px-2 py-px rounded-full text-[10px] font-bold uppercase border ${plan.is_active ? 'border-green-500/30 bg-green-500/10 text-[color:var(--green)]' : 'border-[color:var(--border)] text-[color:var(--muted)]'}`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-[24px] font-bold text-[color:var(--text)]">
                  KES {plan.price.toLocaleString()}
                  <span className="text-[13px] font-normal text-[color:var(--muted)] ml-1">/ {plan.duration_days}d</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[color:var(--muted)]">
                  <span>Max matches: {plan.max_matches ?? '∞'}</span>
                  <span>Max cameras: {plan.max_cameras ?? '∞'}</span>
                  <span>Ads: {plan.ads_enabled ? '✓' : '✗'}</span>
                  <span>Analytics: {plan.analytics_enabled ? '✓' : '✗'}</span>
                   {plan.quality.map((q)=>(
                    <span>Quality: {q?? 720}p</span>
                   ))} 
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => handleToggle(plan.id)} disabled={acting === plan.id}
                    className={`flex-1 h-8 rounded-lg border text-[12px] font-medium cursor-pointer transition-colors disabled:opacity-50 ${plan.is_active ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 'border-green-500/30 bg-green-500/10 text-[color:var(--green)]'}`}>
                    {plan.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setPlanForm({ ...plan, editing: plan.id })}
                    className="w-8 h-8 grid place-items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)] cursor-pointer hover:text-[color:var(--text)] transition-colors">
                    <Icon name="edit" size={13} />
                  </button>
                  <button onClick={() => handleDeletePlan(plan.id)} disabled={acting === plan.id}
                    className="w-8 h-8 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                    <Icon name="delete" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Subscriptions tab ─────────────────────────── */}
        {tab === 'subscriptions' && (
          <div className="broadcast-card rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    {['User', 'Plan', 'Status', 'Expires', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-[color:var(--surface3)] animate-pulse" /></td>
                    ))}</tr>
                  )) : subs.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-[color:var(--muted)]">No subscriptions</td></tr>
                  ) : subs.map((s: SubscriptionData) => (
                    <tr key={s.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[color:var(--text)]">{s.user?.name ?? s.user_id}</div>
                        <div className="text-[11px] text-[color:var(--muted)]">{s.user?.email ?? ''}</div>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text2)]">{s.plan?.name ?? s.plan_id}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-px rounded-full text-[10px] font-bold uppercase border ${s.status === 'active' ? 'border-green-500/30 bg-green-500/10 text-[color:var(--green)]' : s.status === 'expired' ? 'border-red-500/30 bg-red-500/10 text-[color:var(--red)]' : 'border-[color:var(--border)] text-[color:var(--muted)]'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setExtendModal({ subId: s.id, days: '30' })}
                            title="Extend"
                            className="w-7 h-7 grid place-items-center rounded-lg border-none bg-blue-500/10 text-[color:var(--blue)] cursor-pointer hover:bg-blue-500/20 transition-colors">
                            <Icon name="add-circle" size={13} />
                          </button>
                          <button onClick={() => handleRevoke(s.id)} disabled={acting === s.id}
                            title="Revoke"
                            className="w-7 h-7 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                            {acting === s.id ? <span className="spinner" /> : <Icon name="delete" size={13} />}
                          </button>
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
                  <button onClick={() => setSubPage(p => p - 1)} disabled={meta.current_page <= 1}
                    className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">← Prev</button>
                  <button onClick={() => setSubPage(p => p + 1)} disabled={meta.current_page >= meta.last_page}
                    className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extend modal */}
        {extendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[color:var(--surface)] rounded-2xl border border-[color:var(--border)] p-4 sm:p-6 w-full max-w-xs mx-4 shadow-2xl">
              <h3 className="text-[16px] font-semibold text-[color:var(--text)] mb-4">Extend subscription</h3>
              <label className="block text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-[.05em] mb-2">Days to add</label>
              <input type="number" min="1" max="3650" value={extendModal.days}
                onChange={e => setExtendModal(m => m ? { ...m, days: e.target.value } : null)}
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setExtendModal(null)} className="flex-1 h-9 rounded-lg border border-[color:var(--border)] bg-transparent text-[13px] text-[color:var(--text)] cursor-pointer">Cancel</button>
                <button onClick={handleExtend} disabled={acting === extendModal.subId}
                  className="flex-1 h-9 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50">
                  {acting === extendModal.subId ? <span className="spinner" /> : 'Extend'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Trash tab ──────────────────────────────────── */}
        {tab === 'trash' && (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/[.07] text-orange-400 text-[13px]">
              <Icon name="delete" size={14} />
              Showing soft-deleted plans — restore to reactivate, or permanently delete to remove forever.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trashLoading ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 rounded-lg bg-[color:var(--surface2)] animate-pulse" />
              )) : trashedPlans.length === 0 ? (
                <div className="col-span-3 py-10 text-center text-[color:var(--muted)] text-[13px]">Trash is empty</div>
              ) : trashedPlans.map(plan => (
                <div key={plan.id} className="broadcast-card rounded-lg p-4 flex flex-col gap-3 opacity-70">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[15px] font-semibold text-[color:var(--text)]">{plan.name}</div>
                      <div className="text-[11px] text-[color:var(--muted)] mt-0.5">{plan.description ?? '—'}</div>
                    </div>
                    <span className="px-2 py-px rounded-full text-[10px] font-bold uppercase border border-orange-500/30 bg-orange-500/10 text-orange-400">
                      Deleted
                    </span>
                  </div>
                  <div className="text-[20px] font-bold text-[color:var(--text)]">
                    KES {plan.price.toLocaleString()}
                    <span className="text-[13px] font-normal text-[color:var(--muted)] ml-1">/ {plan.duration_days}d</span>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => handleRestorePlan(plan.id)} disabled={acting === plan.id}
                      className="flex-1 h-8 rounded-lg border border-green-500/30 bg-green-500/10 text-[color:var(--green)] text-[12px] font-medium cursor-pointer hover:bg-green-500/20 transition-colors disabled:opacity-50">
                      {acting === plan.id ? <span className="spinner" /> : 'Restore'}
                    </button>
                    <button onClick={() => handleForceDeletePlan(plan.id)} disabled={acting === plan.id}
                      className="w-8 h-8 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50">
                      <Icon name="delete" size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Plan create/edit modal */}
        {planForm !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[color:var(--surface)] rounded-2xl border border-[color:var(--border)] p-4 sm:p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-[16px] font-semibold text-[color:var(--text)] mb-4">
                {planForm.editing ? 'Edit plan' : 'New plan'}
              </h3>
              <div className="flex flex-col gap-3">
                {[
                  { key: 'name',          label: 'Name',              type: 'text'   },
                  { key: 'description',   label: 'Description',       type: 'text'   },
                  { key: 'price',         label: 'Price',             type: 'number' },
                  { key: 'duration_days', label: 'Duration (days)',   type: 'number' },
                  { key: 'max_matches',   label: 'Max matches',       type: 'number' },
                  { key: 'max_cameras',   label: 'Max cameras',       type: 'number' },
                  { key: 'currency',      label: 'Currency',          type: 'text' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-[.05em] mb-1">{label}</label>
                    <input type={type} value={(planForm as Record<string, unknown>)[key] as string ?? ''}
                      onChange={e => setPlanForm(f => f ? { ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value } : null)}
                      className="w-full h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none" />
                  </div>
                ))}
                <div className="flex gap-4">
                  {[
                    { key: 'ads_enabled',       label: 'Ads enabled'       },
                    { key: 'analytics_enabled', label: 'Analytics enabled' },
                    { key: 'is_active',         label: 'Active'            },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-[13px] text-[color:var(--text)] cursor-pointer">
                      <input type="checkbox" checked={!!(planForm as Record<string, unknown>)[key]}
                        onChange={e => setPlanForm(f => f ? { ...f, [key]: e.target.checked } : null)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setPlanForm(null)} className="flex-1 h-9 rounded-lg border border-[color:var(--border)] bg-transparent text-[13px] text-[color:var(--text)] cursor-pointer">Cancel</button>
                <button onClick={handleSavePlan} disabled={acting === 'plan-form'}
                  className="flex-1 h-9 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50">
                  {acting === 'plan-form' ? <span className="spinner" /> : planForm.editing ? 'Save changes' : 'Create plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
