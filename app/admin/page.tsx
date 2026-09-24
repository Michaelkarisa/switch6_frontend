'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useCallback, useEffect, useState } from 'react';
import { PageShell, Icon } from '@/components/ui';
import {
  adminGetDashboard,
  adminGetRevenueSummary,
  type AdminDashboardData,
  type AdminRevenueData,
} from '@/lib/api';
import { useRoleGuard } from '@/lib/auth';
import { ROLES } from '@/lib/api';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`;
  return String(n);
}
function kes(n: number): string { return `KES ${n.toLocaleString()}`; }

function Stat({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
}) {
  return (
    <div className="stat-card-gradient rounded-xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{label}</span>
        <span className="grid place-items-center w-9 h-9 rounded-lg" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="text-[30px] font-bold leading-none tracking-[-0.03em]" style={{ color }}>
        {typeof value === 'number' ? fmt(value) : value}
      </div>
      {sub && <div className="text-[11px] text-[color:var(--muted)]">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[.06em] text-[color:var(--muted)] mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[color:var(--border)] last:border-0">
      <span className="text-[13px] text-[color:var(--muted)]">{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  useRoleGuard([ROLES.ADMIN, ROLES.SUPERADMIN]);

  const [data,    setData]    = useState<AdminDashboardData | null>(null);
  const [revenue, setRevenue] = useState<AdminRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [dash, rev] = await Promise.all([adminGetDashboard(), adminGetRevenueSummary()]);
      setData(dash);
      setRevenue(rev);
    } catch (e: any) { setError(e.message ?? 'Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ✅ FIX 1: Declare sparkline safely (fallback to [] if API field name differs or is missing)
  const sparkline = (revenue?.sparkline as Array<{ date?: string; total_kes?: number }>) ?? [];

  return (
    <PageShell title="Admin Overview">
      <div className="fluid-pad flex flex-col gap-4 pb-10 sm:gap-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">System Overview</h1>
            <p className="text-[13px] text-[color:var(--muted)] mt-1">Real-time platform health and metrics</p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 px-4 h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] font-medium text-[color:var(--text)] cursor-pointer hover:bg-[color:var(--surface3)] transition-colors">
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>

        {error && <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.08] text-[color:var(--red)] text-[13px]">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[100px] rounded-lg bg-[color:var(--surface2)] animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Revenue leads the overview — this is what admins check first */}
            <Section title="Revenue">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-3">
                <Stat label="Total"        value={kes(data.revenue.total)}   color="var(--green)" icon="payment" sub={`${data.revenue.transactions} transactions`} />
                <Stat label="Today"        value={kes(data.revenue.today)}   color="var(--blue)"  icon="calendar" />
                <Stat label="This month"   value={kes(data.revenue.month)}   color="var(--gold)"  icon="chart" />
                <Stat label="Pending"      value={kes(revenue?.pending_total ?? 0)} color="var(--muted)" icon="schedule" sub={revenue ? `${revenue.pending_count} awaiting confirmation` : undefined} />
              </div>
              <div className="stat-card-gradient rounded-xl p-4">
                {sparkline.length > 1 ? (
                  <>
                    <div className="text-[10px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)] mb-2">14-day trend</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#0a8f52" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0a8f52" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <Tooltip
                          content={({ active, payload, label }) =>
                            active && payload?.length ? (
                              <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded px-2 py-1 text-[11px] text-[color:var(--text)]">
                                <div className="text-[color:var(--muted)]">
                                  {typeof label === 'string' ? label.slice(5) : String(label ?? '')}
                                </div>
                                <div className="font-semibold text-[color:var(--green)]">
                                  KES {((payload[0]?.value as number) ?? 0).toLocaleString()}
                                </div>
                              </div>
                            ) : null
                          }
                        />
                        <Area type="monotone" dataKey="total_kes" stroke="#0a8f52" strokeWidth={1.5} fill="url(#adminRevGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="text-[12px] text-[color:var(--muted)] py-4 text-center">Not enough data yet for a trend line.</div>
                )}
                {revenue && revenue.by_method.length > 0 && (
                  <div className="mt-3 pt-1 border-t border-[color:var(--border)]">
                    {revenue.by_method.map(m => (
                      <InfoRow key={m.payment_method} label={m.payment_method} value={`${kes(m.total)} (${m.count})`} />
                    ))}
                  </div>
                )}
              </div>
            </Section>

            <Section title="Users">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Stat label="Total"       value={data.users.total}       color="var(--text)"  icon="person" sub={`${data.users.active} active, ${data.users.suspended} suspended`} />
                <Stat label="Active"      value={data.users.active}      color="var(--green)" icon="check" />
                <Stat label="Suspended"   value={data.users.suspended}   color="var(--red)"   icon="error" />
                <Stat label="New today"   value={data.users.new_today}   color="var(--blue)"  icon="add-circle" />
                <Stat label="Last 7 days" value={data.users.new_7_days}  color="var(--gold)"  icon="schedule" />
              </div>
            </Section>

            <Section title="Matches">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Stat label="Total"     value={data.matches.total}     color="var(--text)"  icon="soccer" sub={`${data.matches.today} today`} />
                <Stat label="Live"      value={data.matches.live}      color="var(--red)"   icon="live-tv" />
                <Stat label="Scheduled" value={data.matches.scheduled} color="var(--blue)"  icon="event" />
                <Stat label="Finished"  value={data.matches.finished}  color="var(--muted)" icon="history" />
                <Stat label="Today"     value={data.matches.today}     color="var(--green)" icon="calendar" />
              </div>
            </Section>

            <Section title="Subscriptions">
              <div className="broadcast-card rounded-lg p-4">
                <InfoRow label="Active total"   value={data.subscriptions.active_total}    color="var(--green)" />
                <InfoRow label="Expiring in 7d" value={data.subscriptions.expiring_7_days} color="var(--gold)" />
                {data.subscriptions.by_plan.map(p => (
                  <InfoRow key={p.plan} label={p.plan} value={`${p.active} active`} />
                ))}
              </div>
            </Section>

            <Section title="System">
              <div className="broadcast-card rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <Stat label="Audit logs today" value={data.system.audit_logs_today} color="var(--blue)"  icon="history" />
                  <Stat label="Pending jobs"     value={data.system.pending_jobs}     color="var(--gold)"  icon="schedule" />
                  <Stat label="Failed jobs"      value={data.system.failed_jobs}      color={data.system.failed_jobs > 0 ? 'var(--red)' : 'var(--green)'} icon="error" sub={data.system.failed_jobs > 0 ? 'Needs attention' : 'All clear'} />
                  <Stat label="Cache"            value={data.system.cache_driver}     color="var(--muted)" icon="encoder" />
                  <Stat label="Queue"            value={data.system.queue_driver}     color="var(--muted)" icon="output" />
                </div>
              </div>
            </Section>

            <Section title="Quick actions">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Manage users',    href: '/admin/users',          icon: 'person',        color: 'var(--blue)'  },
                  { label: 'All matches',     href: '/admin/matches',         icon: 'soccer',        color: 'var(--green)' },
                  { label: 'Plans & billing', href: '/admin/plans',           icon: 'payment',       color: 'var(--gold)'  },
                  { label: 'System health',   href: '/admin/system',          icon: 'encoder',       color: 'var(--red)'   },
                  { label: 'Advertisements',  href: '/admin/advertisements',  icon: 'advertisement', color: 'var(--blue)'  },
                  { label: 'Analytics',       href: '/admin/analytics',       icon: 'chart',         color: 'var(--gold)'  },
                  { label: 'Audit logs',      href: '/admin/analytics?tab=audit', icon: 'history',   color: 'var(--muted)' },
                  { label: 'Subscriptions',   href: '/admin/plans?tab=subs',  icon: 'check',         color: 'var(--green)' },
                ].map(({ label, href, icon, color }) => (
                  <a key={href} href={href}
                    className="broadcast-card rounded-lg p-4 flex items-center gap-3 no-underline hover:opacity-80 transition-opacity cursor-pointer">
                    <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
                      <Icon name={icon} size={16} />
                    </span>
                    <span className="text-[13px] font-medium text-[color:var(--text)]">{label}</span>
                    {/* ✅ FIX 3: Restored truncated chevron icon */}
                    <Icon name="chevron-right" size={14} className="ml-auto text-[color:var(--faint)]" />
                  </a>
                ))}
              </div>
            </Section>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}