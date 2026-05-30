'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, CheckCircle2, CreditCard, Loader2, Megaphone,
  PlusCircle, Trash2, UploadCloud, Video,
  Image as ImageIcon, XCircle, Target, Clock3, Zap, Play,
} from 'lucide-react';
import { PageShell } from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';

import {
  UserPrefs,
  isAdmin,
  isBroadcaster,
  isAdvertiser,
  getAdvertisements,
  createAdvertisement,
  deleteAdvertisement,
  getAdvertisementAnalytics,
  initiateAdPayment,
  getMyAdPayments,
  type AdvertisementData,
  type AdAnalyticsData,
  type AdPaymentData,
  ROLES,
} from '@/lib/api';
import { AdvertiserAnalyticsPanel } from './_analytics';
type Tab        = 'campaigns' | 'create' | 'analytics' | 'payments';
type MediaType  = 'video' | 'image';
type AdPosition = 'Before 1ST' | 'Half Time' | 'After 2ND' | 'Before Extra Time';

const positions: AdPosition[] = ['Before 1ST', 'Half Time', 'After 2ND', 'Before Extra Time'];
const durations = [15, 30, 45, 60];

const positionMeta: Record<AdPosition, { label: string; desc: string; mult: number; color: string }> = {
  'Before 1ST':        { label: 'Pre-Match',  desc: 'Standard slot before kickoff',         mult: 1.0, color: 'var(--blue)'  },
  'Half Time':         { label: 'Half Time',  desc: 'Peak engagement during the break',     mult: 1.5, color: 'var(--green)' },
  'After 2ND':         { label: 'Post-Match', desc: 'High retention during highlights',     mult: 1.2, color: 'var(--gold)'  },
  'Before Extra Time': { label: 'Extra Time', desc: 'Premium slot before decisive moments', mult: 1.4, color: 'var(--red)'   },
};

const BASE_KES = 500;
const kes  = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const fmt  = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="broadcast-card rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{label}</span>
        <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: color + '22', color }}>{icon}</span>
      </div>
      <div className="text-[26px] font-bold leading-none tracking-[-0.03em]" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-[color:var(--muted)]">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    active:    'bg-green-500/10 text-[color:var(--green)] border-green-500/30',
    paused:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    expired:   'bg-[color:var(--surface3)] text-[color:var(--muted)] border-[color:var(--border)]',
    pending:   'bg-blue-500/10 text-[color:var(--blue)] border-blue-500/30',
    completed: 'bg-green-500/10 text-[color:var(--green)] border-green-500/30',
    failed:    'bg-red-500/10 text-[color:var(--red)] border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-[.05em] border ${cfg[status] ?? cfg.expired}`}>
      {status}
    </span>
  );
}

export default function AdvertisementPage() {
  useRoleGuard([ROLES.ADVERTISER, ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);

  const router = useRouter();

  const [tab,      setTab]      = useState<Tab>('campaigns');
  const [ads,      setAds]      = useState<AdvertisementData[]>([]);
  const [payments, setPayments] = useState<AdPaymentData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [notice,   setNotice]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [analyticsAd,      setAnalyticsAd]      = useState<string | null>(null);
  const [analyticsData,    setAnalyticsData]    = useState<AdAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [title,      setTitle]      = useState('');
  const [position,   setPosition]   = useState<AdPosition>('Before 1ST');
  const [duration,   setDuration]   = useState(30);
  const [eventCount, setEventCount] = useState(1);
  const [mediaType,  setMediaType]  = useState<MediaType>('video');
  const [mediaFile,  setMediaFile]  = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [adsPage,      setAdsPage]      = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const ADS_PAGE_SIZE = 10;
  const PAY_PAGE_SIZE = 10;

  const price = useMemo(() => {
    const mult = positionMeta[position].mult * (duration <= 30 ? 1 : 1.5);
    return eventCount * BASE_KES * mult;
  }, [eventCount, position, duration]);

  const totals = useMemo(() => ({
    campaigns: ads.length,
    active:    ads.filter(a => a.status === 'active').length,
    spend:     payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount_kes, 0),
  }), [ads, payments]);

  const adsTotalPages = Math.max(1, Math.ceil(ads.length / ADS_PAGE_SIZE));
  const paginatedAds  = ads.slice((adsPage - 1) * ADS_PAGE_SIZE, adsPage * ADS_PAGE_SIZE);

  const payTotalPages  = Math.max(1, Math.ceil(payments.length / PAY_PAGE_SIZE));
  const paginatedPays  = payments.slice((paymentsPage - 1) * PAY_PAGE_SIZE, paymentsPage * PAY_PAGE_SIZE);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [adsRes, payRes] = await Promise.allSettled([getAdvertisements(), getMyAdPayments()]);
      if (adsRes.status === 'fulfilled') setAds(adsRes.value);
      if (payRes.status === 'fulfilled') setPayments(payRes.value);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const user = UserPrefs.get();
    if (!user) { router.replace('/login'); return; }
    loadData();
  }, [loadData, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!title.trim()) { showNotice('error', 'Campaign title is required'); return; }
    if (!mediaFile)    { showNotice('error', 'Please upload your ad media'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', title); fd.append('file_type', mediaType);
      fd.append('file', mediaFile); fd.append('duration', String(duration));
      fd.append('period', position);
      const ad = await createAdvertisement(fd);
      await initiateAdPayment(ad.id, { amount_kes: Math.round(price), payment_method: 'mpesa' });
      showNotice('success', `Campaign "${title}" created! Proceed to payment to go live.`);
      setTitle(''); setMediaFile(null); setMediaPreview(null); setEventCount(1);
      await loadData();
      setTab('payments');
    } catch (e: any) { showNotice('error', e.message || 'Failed to create campaign'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    setDeleting(id);
    try { await deleteAdvertisement(id); await loadData(); showNotice('success', 'Campaign deleted'); }
    catch (e: any) { showNotice('error', e.message); }
    finally { setDeleting(null); }
  };

  const handleViewAnalytics = async (ad: AdvertisementData) => {
    setAnalyticsAd(ad.id); setAnalyticsData(null); setAnalyticsLoading(true); setTab('analytics');
    try { setAnalyticsData(await getAdvertisementAnalytics(ad.id)); }
    catch { setAnalyticsData(null); }
    finally { setAnalyticsLoading(false); }
  };

  const pageTitle = isAdvertiser() && !isAdmin() ? 'My Campaigns' : 'Advertise';

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'campaigns', label: 'Campaigns',    icon: <Megaphone size={14} /> },
    { key: 'create',    label: 'New Campaign', icon: <PlusCircle size={14} /> },
    { key: 'analytics', label: 'Analytics',    icon: <BarChart3 size={14} /> },
    { key: 'payments',  label: 'Payments',     icon: <CreditCard size={14} /> },
  ];

  return (
    <PageShell title={pageTitle}>
      <div className="fluid-pad flex flex-col gap-5 pb-10">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[color:var(--text)]">{pageTitle}</h1>
            <p className="text-[13px] text-[color:var(--muted)] mt-1">
              {isAdvertiser() && !isAdmin()
                ? 'Create and track your sponsorship campaigns across live matches'
                : 'Manage ad campaigns and sponsor integrations for your broadcasts'}
            </p>
          </div>
          <button onClick={() => setTab('create')}
            className="flex items-center gap-2 px-4 h-9 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity">
            <PlusCircle size={14} /> New Campaign
          </button>
        </div>

        {notice && (
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-[13px] font-medium ${notice.type === 'success' ? 'border-green-500/30 bg-green-500/[.08] text-[color:var(--green)]' : 'border-red-500/30 bg-red-500/[.08] text-[color:var(--red)]'}`}>
            {notice.type === 'success' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {notice.text}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Campaigns" value={String(totals.campaigns)} sub="total created"      icon={<Megaphone size={14} />}  color="var(--blue)"  />
          <StatCard label="Active"    value={String(totals.active)}    sub="running now"         icon={<Play size={14} />}       color="var(--green)" />
          <StatCard label="Spend"     value={kes(totals.spend)}        sub="completed payments"  icon={<CreditCard size={14} />} color="var(--muted)" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[color:var(--surface2)] rounded-xl w-full overflow-x-auto sm:w-fit scrollbar-none">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap flex items-center gap-1.5 px-3 h-8 rounded-lg text-[13px] font-medium cursor-pointer border-none transition-all ${tab === t.key ? 'bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm' : 'bg-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {error && <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.08] text-[color:var(--red)] text-[13px]">{error}</div>}

        {/* ── Campaigns ─────────────────────────────────── */}
        {tab === 'campaigns' && (
          <div className="flex flex-col gap-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-[color:var(--surface2)] animate-pulse" />
            )) : ads.length === 0 ? (
              <div className="broadcast-card rounded-lg p-12 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[color:var(--surface2)] grid place-items-center">
                  <Megaphone size={24} className="text-[color:var(--muted)]" />
                </div>
                <div>
                  <p className="font-semibold text-[color:var(--text)]">No campaigns yet</p>
                  <p className="text-[13px] text-[color:var(--muted)] mt-1">Create your first campaign to reach match audiences</p>
                </div>
                <button onClick={() => setTab('create')}
                  className="flex items-center gap-2 px-5 h-9 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer mt-1">
                  <PlusCircle size={14} /> Create campaign
                </button>
              </div>
            ) : ads.map(ad => (
              <div key={ad.id} className="broadcast-card rounded-lg px-4 py-3 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[color:var(--surface2)] border border-[color:var(--border)] grid place-items-center shrink-0 text-[color:var(--muted)]">
                  {ad.file_type === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-semibold text-[13px] text-[color:var(--text)] truncate">{ad.title}</span>
                    <StatusPill status={ad.status} />
                  </div>
                  <div className="text-[11px] text-[color:var(--muted)]">
                    {ad.file_type} · {ad.duration}s · {ad.period ?? 'Any period'}
                    {ad.end_date ? ` · ends ${new Date(ad.end_date).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleViewAnalytics(ad)} title="Analytics"
                    className="w-8 h-8 grid place-items-center rounded-lg border-none bg-blue-500/10 text-[color:var(--blue)] cursor-pointer hover:bg-blue-500/20 transition-colors">
                    <BarChart3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(ad.id)} disabled={deleting === ad.id} title="Delete"
                    className="w-8 h-8 grid place-items-center rounded-lg border-none bg-red-500/10 text-[color:var(--red)] cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-40">
                    {deleting === ad.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}

            {/* Campaigns pagination */}
            {adsTotalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px] text-[color:var(--muted)]">Page {adsPage} of {adsTotalPages} · {ads.length} campaigns</span>
                <div className="flex gap-2">
                  <button onClick={() => setAdsPage(p => p - 1)} disabled={adsPage <= 1}
                    className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">← Prev</button>
                  <button onClick={() => setAdsPage(p => p + 1)} disabled={adsPage >= adsTotalPages}
                    className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Create ────────────────────────────────────── */}
        {tab === 'create' && (
          <div className="grid gap-5 md:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-4">

              <div className="broadcast-card rounded-lg p-5">
                <h3 className="text-[13px] font-semibold text-[color:var(--text)] mb-3 flex items-center gap-2">
                  <Target size={14} className="text-[color:var(--muted)]" /> Campaign title
                </h3>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Sportika Premier Sponsorship"
                  className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--field-bg)] text-[13px] text-[color:var(--text)] outline-none focus:border-[color:var(--green)]/50 transition-colors" />
              </div>

              <div className="broadcast-card rounded-lg p-5">
                <h3 className="text-[13px] font-semibold text-[color:var(--text)] mb-3 flex items-center gap-2">
                  <Clock3 size={14} className="text-[color:var(--muted)]" /> Ad slot &amp; timing
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {positions.map(pos => {
                    const meta = positionMeta[pos];
                    const active = position === pos;
                    return (
                      <button key={pos} type="button" onClick={() => setPosition(pos)}
                        className={`flex flex-col items-start p-3 rounded-lg cursor-pointer text-left border transition-all ${active ? 'border-green-500/40 bg-green-500/[.06]' : 'border-[color:var(--border)] bg-[color:var(--surface2)]'}`}>
                        <span className="text-[11px] font-bold uppercase tracking-[.05em] mb-0.5" style={{ color: active ? meta.color : 'var(--muted)' }}>{meta.label}</span>
                        <span className="text-[10px] text-[color:var(--muted)] leading-tight">{meta.desc}</span>
                        <span className="text-[10px] font-semibold mt-1.5" style={{ color: meta.color }}>{meta.mult}× rate</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mb-3">
                  <label className="block text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-[.05em] mb-1.5">Duration</label>
                  <div className="flex gap-2">
                    {durations.map(d => (
                      <button key={d} type="button" onClick={() => setDuration(d)}
                        className={`flex-1 h-9 rounded-lg text-[13px] font-semibold cursor-pointer border transition-colors ${duration === d ? 'border-green-500/40 bg-green-500/[.08] text-[color:var(--green)]' : 'border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)]'}`}>
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-[.05em] mb-1.5">Number of matches</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setEventCount(Math.max(1, eventCount - 1))}
                      className="w-9 h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-lg font-bold cursor-pointer hover:border-[color:var(--green)]/40 transition-colors">−</button>
                    <span className="text-[22px] font-bold text-[color:var(--text)] w-8 text-center">{eventCount}</span>
                    <button type="button" onClick={() => setEventCount(eventCount + 1)}
                      className="w-9 h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-lg font-bold cursor-pointer hover:border-[color:var(--green)]/40 transition-colors">+</button>
                  </div>
                </div>
              </div>

              <div className="broadcast-card rounded-lg p-5">
                <h3 className="text-[13px] font-semibold text-[color:var(--text)] mb-3 flex items-center gap-2">
                  <UploadCloud size={14} className="text-[color:var(--muted)]" /> Ad media
                </h3>
                <div className="flex gap-2 mb-3">
                  {(['video', 'image'] as MediaType[]).map(t => (
                    <button key={t} type="button" onClick={() => { setMediaType(t); setMediaFile(null); setMediaPreview(null); }}
                      className={`flex-1 h-9 flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium cursor-pointer border transition-colors ${mediaType === t ? 'border-green-500/40 bg-green-500/[.08] text-[color:var(--green)]' : 'border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)]'}`}>
                      {t === 'video' ? <Video size={13} /> : <ImageIcon size={13} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                <input ref={fileRef} type="file"
                  accept={mediaType === 'video' ? 'video/*' : 'image/jpeg,image/png,image/webp'}
                  onChange={handleFileChange} className="hidden" />
                {mediaPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-[color:var(--border)] bg-black">
                    {mediaType === 'video'
                      ? <video src={mediaPreview} controls className="w-full max-h-44 object-contain" />
                      : <img src={mediaPreview} alt="preview" className="w-full max-h-44 object-contain" />}
                    <button onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-lg bg-black/60 text-white border-none cursor-pointer">
                      <XCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)] cursor-pointer hover:border-[color:var(--green)]/40 hover:text-[color:var(--text)] transition-colors">
                    <UploadCloud size={20} />
                    <span className="text-[13px]">Upload {mediaType}</span>
                    <span className="text-[11px]">{mediaType === 'video' ? 'MP4, MOV, AVI' : 'JPG, PNG, WebP'}</span>
                  </button>
                )}
                {mediaFile && <p className="mt-2 text-[11px] text-[color:var(--muted)]">{mediaFile.name} · {(mediaFile.size/1_048_576).toFixed(1)} MB</p>}
              </div>
            </div>

            {/* Summary panel */}
            <div className="broadcast-card rounded-lg p-5 h-fit md:sticky md:top-4">
              <h3 className="text-[13px] font-semibold text-[color:var(--text)] mb-4 flex items-center gap-2">
                <Zap size={14} className="text-[color:var(--muted)]" /> Order summary
              </h3>
              <div className="flex flex-col gap-0 text-[13px] mb-4">
                {[
                  { label: 'Slot',     value: positionMeta[position].label },
                  { label: 'Duration', value: `${duration}s` },
                  { label: 'Matches',  value: String(eventCount) },
                  { label: 'Rate',     value: `${positionMeta[position].mult}×${duration > 30 ? ' · 1.5×' : ''}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[color:var(--border)] last:border-0">
                    <span className="text-[color:var(--muted)]">{label}</span>
                    <span className="font-medium text-[color:var(--text)]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-3 border-t border-[color:var(--border)] mb-4">
                <span className="text-[15px] font-semibold text-[color:var(--text)]">Total</span>
                <span className="text-[22px] font-bold text-[color:var(--green)]">{kes(price)}</span>
              </div>
              <button onClick={handleCreate} disabled={submitting || !title.trim() || !mediaFile}
                className="w-full h-10 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><CheckCircle2 size={14} /> Submit Campaign</>}
              </button>
              <p className="mt-2.5 text-[11px] text-[color:var(--muted)] text-center leading-relaxed">
                M-Pesa payment initiated after submission. Campaign goes live once confirmed.
              </p>
            </div>
          </div>
        )}

        {/* ── Analytics ─────────────────────────────────── */}
        {tab === 'analytics' && (
          <AdvertiserAnalyticsPanel ads={ads} />
        )}

        {/* ── Payments ──────────────────────────────────── */}
        {tab === 'payments' && (
          <div className="flex flex-col gap-3">
            {loading ? <div className="h-40 rounded-lg bg-[color:var(--surface2)] animate-pulse" />
            : payments.length === 0 ? (
              <div className="broadcast-card rounded-lg p-10 text-center text-[color:var(--muted)]">
                <CreditCard size={36} className="mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-[color:var(--text)] mb-1">No payments yet</p>
                <p className="text-[13px]">Submit a campaign to generate a payment record</p>
              </div>
            ) : (
              <div className="broadcast-card rounded-lg overflow-hidden"><div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[color:var(--border)]">
                      {['Campaign', 'Amount', 'Method', 'Reference', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPays.map(p => (
                      <tr key={p.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface2)] transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--muted)]">{p.advertisement_id.slice(0,8)}…</td>
                        <td className="px-4 py-3 font-semibold text-[color:var(--text)]">{kes(p.amount_kes)}</td>
                        <td className="px-4 py-3 text-[color:var(--muted)] capitalize">{p.payment_method.replace('_', ' ')}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--muted)]">{p.transaction_code ?? p.mpesa_reference ?? '—'}</td>
                        <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                        <td className="px-4 py-3 text-[color:var(--muted)]">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>

                {payTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--border)]">
                    <span className="text-[12px] text-[color:var(--muted)]">Page {paymentsPage} of {payTotalPages} · {payments.length} payments</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPaymentsPage(p => p - 1)} disabled={paymentsPage <= 1}
                        className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">← Prev</button>
                      <button onClick={() => setPaymentsPage(p => p + 1)} disabled={paymentsPage >= payTotalPages}
                        className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40">Next →</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </PageShell>
  );
}
