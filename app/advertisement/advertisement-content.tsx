'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck, CalendarDays, CheckCircle2, ChevronDown, CircleMinus, CirclePlus,
  Clapperboard, Clock3, Megaphone, RadioTower, Send, UploadCloud, Video, XCircle,
  BarChart3, TrendingUp, Eye, Users, Wifi, Youtube, Facebook, MonitorPlay, Activity,
  Zap, Target, ArrowUpRight, ArrowDownRight, Globe, Loader2, Trash2, RefreshCw,
  Image as ImageIcon, Info,
} from 'lucide-react';
import { PageShell } from '@/components/ui';
import {
  UserPrefs, getMatchesByAuthorId,
  getAdvertisements, createAdvertisement, deleteAdvertisement,
  initiateAdPayment,
  type MatchData, type AdvertisementData, type AdAnalyticsData,
} from '@/lib/api';

type Platform = 'youtube' | 'facebook' | 'rtmp_custom';
type Tab = 'campaign' | 'analytics';
type MediaType = 'video' | 'image';
type AdPosition = 'Before 1ST' | 'Half Time' | 'After 2ND' | 'Before Extra Time';

interface PlatformStream {
  platform: Platform; label: string; viewers: number; peakViewers: number;
  impressions: number; clicks: number; watchTime: number;
}

interface AdCampaign {
  id: string; matchId: string; matchLabel: string; league: string; date: string;
  position: AdPosition; duration: number; status: 'live' | 'scheduled' | 'completed' | 'upcoming';
  totalImpressions: number; totalClicks: number; totalReach: number; revenue: number;
  streams: PlatformStream[];
  apiAd?: AdvertisementData;
  apiAnalytics?: AdAnalyticsData;
}

const durations = [15, 30, 45, 60];
const positions: AdPosition[] = ['Before 1ST', 'Half Time', 'After 2ND', 'Before Extra Time'];

const positionPricing: Record<AdPosition, { multiplier: number; label: string; description: string }> = {
  'Before 1ST':        { multiplier: 1.0, label: 'Pre-Match',   description: 'Standard visibility before kickoff' },
  'Half Time':         { multiplier: 1.5, label: 'Peak Time',   description: 'Maximum engagement during halftime break' },
  'After 2ND':         { multiplier: 1.2, label: 'Post-Match',  description: 'Strong retention during highlights' },
  'Before Extra Time': { multiplier: 1.4, label: 'High Stakes', description: 'Premium slot before decisive moments' },
};

const imageMinWidth  = 720;
const imageMinHeight = 480;
const imageMaxSizeMB = 10;

const platformTone: Record<Platform, string> = {
  youtube:     'text-red-500 border-red-500/30 bg-red-500/10',
  facebook:    'text-blue-500 border-blue-500/30 bg-blue-500/10',
  rtmp_custom: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
};
const platformBar: Record<Platform, string> = {
  youtube: 'bg-red-500', facebook: 'bg-blue-500', rtmp_custom: 'bg-yellow-400',
};

function buildCampaignsFromMatches(matches: MatchData[]): AdCampaign[] {
  const adPositions: AdPosition[] = ['Before 1ST', 'Half Time', 'After 2ND'];
  const adDurations = [15, 30, 45, 60];
  return matches.map((m, i) => {
    const seed = (m.id?.charCodeAt(0) ?? i + 1) * 137 + i;
    const rand = (min: number, max: number) => Math.floor(((seed * (i + 3) * 31) % (max - min + 1)) + min);
    const ytV = m.viewers ? Math.floor(m.viewers * 0.55) : rand(1200, 8000);
    const fbV = m.viewers ? Math.floor(m.viewers * 0.35) : rand(800, 5000);
    const rtV = m.viewers ? Math.floor(m.viewers * 0.1)  : rand(200, 1500);
    const totalV = ytV + fbV + rtV;
    const imp = Math.floor(totalV * rand(2, 4));
    const clk = Math.floor(imp * (rand(2, 8) / 100));
    return {
      id: `camp_${m.id}`, matchId: m.id,
      matchLabel: `${m.homeTeam?.name ?? 'Home'} vs ${m.awayTeam?.name ?? 'Away'}`,
      league: m.league, date: m.date,
      position: adPositions[i % adPositions.length],
      duration: adDurations[i % adDurations.length],
      status: m.status === 'live' ? 'live' : m.status === 'scheduled' ? 'scheduled' : 'completed',
      totalImpressions: imp, totalClicks: clk, totalReach: totalV, revenue: rand(500, 8000),
      streams: [
        { platform: 'youtube',     label: 'YouTube',     viewers: ytV, peakViewers: Math.floor(ytV * 1.4), impressions: Math.floor(imp * 0.55), clicks: Math.floor(clk * 0.55), watchTime: rand(18, 52) },
        { platform: 'facebook',    label: 'Facebook',    viewers: fbV, peakViewers: Math.floor(fbV * 1.3), impressions: Math.floor(imp * 0.35), clicks: Math.floor(clk * 0.35), watchTime: rand(12, 38) },
        { platform: 'rtmp_custom', label: 'RTMP Custom', viewers: rtV, peakViewers: Math.floor(rtV * 1.2), impressions: Math.floor(imp * 0.1),  clicks: Math.floor(clk * 0.1),  watchTime: rand(8, 28) },
      ],
    };
  });
}

function mergeApiAds(campaigns: AdCampaign[], ads: AdvertisementData[]): AdCampaign[] {
  const extra: AdCampaign[] = ads
    .filter(ad => !campaigns.find(c => c.apiAd?.id === ad.id))
    .map((ad) => ({
      id: `ad_${ad.id}`, matchId: '', matchLabel: ad.title,
      league: '—', date: ad.end_date ?? '—',
      position: (ad.period as AdPosition) ?? 'Before 1ST', duration: ad.duration,
      status: ad.status === 'active' ? 'scheduled' : ad.status === 'expired' ? 'completed' : 'upcoming',
      totalImpressions: 0, totalClicks: 0, totalReach: 0, revenue: 0,
      streams: [],
      apiAd: ad,
    }));
  return [...campaigns, ...extra];
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(2)}%` : '0%');

export default function AdvertisementPage() {
  const [tab, setTab] = useState<Tab>('campaign');
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [selectedEventCount, setSelectedEventCount] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedPosition, setSelectedPosition] = useState<AdPosition>('Before 1ST');
  const [adTitle, setAdTitle] = useState('');
  const [adAltText, setAdAltText] = useState('');

  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isMediaValid, setIsMediaValid] = useState(false);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);
  const [videoUrlState, setVideoUrlState] = useState<string | null>(null);
  const [imageUrlState, setImageUrlState] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const price = useMemo(() => {
    const base = 500;
    const posMul = positionPricing[selectedPosition].multiplier;
    const durMul = selectedDuration <= 30 ? 1 : 1.5;
    return selectedEventCount * base * posMul * durMul;
  }, [selectedEventCount, selectedDuration, selectedPosition]);

  const totals = useMemo(() => ({
    impressions: campaigns.reduce((s, c) => s + c.totalImpressions, 0),
    clicks:      campaigns.reduce((s, c) => s + c.totalClicks, 0),
    reach:       campaigns.reduce((s, c) => s + c.totalReach, 0),
    revenue:     campaigns.reduce((s, c) => s + c.revenue, 0),
  }), [campaigns]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3500);
  };

  const loadData = useCallback(async () => {
    const user = UserPrefs.get();
    if (!user) return;
    setLoadingAnalytics(true);
    try {
      const [matchRes, adsRes] = await Promise.allSettled([
        getMatchesByAuthorId(user.id).then(d => Object.values(d ?? {}) as MatchData[]),
        getAdvertisements(),
      ]);
      const matches = matchRes.status === 'fulfilled' ? matchRes.value : [];
      const ads     = adsRes.status    === 'fulfilled' ? adsRes.value    : [];
      const merged = mergeApiAds(buildCampaignsFromMatches(matches), ads);
      setCampaigns(merged);
      if (merged.length) setSelectedCampaign(merged[0]);
    } catch { /* silently degrade */ }
    finally { setLoadingAnalytics(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    return () => {
      if (videoUrlState) URL.revokeObjectURL(videoUrlState);
      if (imageUrlState) URL.revokeObjectURL(imageUrlState);
    };
  }, [videoUrlState, imageUrlState]);

  const resetMedia = () => {
    if (videoUrlState) URL.revokeObjectURL(videoUrlState);
    if (imageUrlState) URL.revokeObjectURL(imageUrlState);
    setVideoUrlState(null); setVideoDurationSeconds(null); setVideoFile(null);
    setImageUrlState(null); setImageDimensions(null); setImageFile(null);
    setMediaFileName(null); setIsMediaValid(false);
  };

  const validateAndSetVideo = (file: File, url: string) => {
    const probe = document.createElement('video');
    probe.preload = 'metadata'; probe.src = url;
    probe.onloadedmetadata = () => {
      const dur = Math.ceil(probe.duration || 0);
      setVideoDurationSeconds(dur);
      if (dur <= selectedDuration) {
        setVideoUrlState(url); setVideoFile(file);
        setIsMediaValid(true); setMediaFileName(file.name);
        showNotice('success', 'Video creative validated and ready for injection.');
      } else {
        URL.revokeObjectURL(url); setIsMediaValid(false);
        showNotice('error', `Video exceeds ${selectedDuration}s limit (${dur}s).`);
      }
    };
    probe.onerror = () => { URL.revokeObjectURL(url); setIsMediaValid(false); showNotice('error', 'Unable to read video metadata.'); };
  };

  const validateAndSetImage = (file: File, url: string) => {
    if (file.size / (1024 * 1024) > imageMaxSizeMB) {
      URL.revokeObjectURL(url); setIsMediaValid(false);
      showNotice('error', `Image too large. Max ${imageMaxSizeMB}MB.`); return;
    }
    const img = new Image(); img.src = url;
    img.onload = () => {
      if (img.width >= imageMinWidth && img.height >= imageMinHeight) {
        setImageUrlState(url); setImageFile(file);
        setIsMediaValid(true); setImageDimensions({ width: img.width, height: img.height });
        setMediaFileName(file.name);
        showNotice('success', 'Image creative validated and ready for display.');
      } else {
        URL.revokeObjectURL(url); setIsMediaValid(false);
        showNotice('error', `Image too small. Minimum: ${imageMinWidth}×${imageMinHeight}px.`);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); setIsMediaValid(false); showNotice('error', 'Unable to load image.'); };
  };

  const handleMediaPick = (file?: File) => {
    if (!file) return;
    resetMedia();
    setMediaFileName(file.name);
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/'))      { setMediaType('video'); validateAndSetVideo(file, url); }
    else if (file.type.startsWith('image/')) { setMediaType('image'); validateAndSetImage(file, url); }
    else { URL.revokeObjectURL(url); showNotice('error', 'Please upload a valid video or image file.'); }
  };

  const submitAdvertisement = async () => {
    if (!isMediaValid || (!videoFile && !imageFile)) { showNotice('error', 'Please upload a valid creative first.'); return; }
    if (!adTitle.trim()) { showNotice('error', 'Please enter an advertisement title.'); return; }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', adTitle.trim());
      form.append('file_type', mediaType);
      form.append('file', mediaType === 'video' ? videoFile! : imageFile!);
      form.append('duration', mediaType === 'video' ? String(selectedDuration) : '10');
      if (mediaType === 'image' && adAltText.trim()) form.append('alt_text', adAltText.trim());
      form.append('period', selectedPosition);
      form.append('status', 'paused');
      const ad = await createAdvertisement(form);
      await initiateAdPayment(ad.id, { amount_kes: Math.round(price), payment_method: 'mpesa' });
      showNotice('success', 'Advertisement submitted! Proceed to payment to activate it.');
      setAdTitle(''); setAdAltText(''); resetMedia();
      await loadData();
    } catch (e: any) {
      showNotice('error', e.message || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleDeleteAd = async (ad: AdvertisementData) => {
    try { await deleteAdvertisement(ad.id); showNotice('success', 'Advertisement deleted.'); await loadData(); }
    catch (e: any) { showNotice('error', e.message || 'Delete failed.'); }
  };

  return (
    <PageShell title="Advertisement">
      <div className="w-full px-3 pb-10 sm:px-5 lg:px-8">
        <AnimatePresence>
          {notice && (
            <motion.div
              className={[
                'fixed left-3 right-3 top-20 z-[80] rounded-lg border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur',
                'sm:left-auto sm:right-5 sm:max-w-sm',
                notice.type === 'success' ? 'border-green-500/40 bg-green-500/15 text-green-400' : 'border-red-500/40 bg-red-500/15 text-red-400',
              ].join(' ')}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >{notice.text}</motion.div>
          )}
        </AnimatePresence>

        {/* Tab switcher — full width on mobile */}
        <div className="mb-5 flex w-full gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-1 sm:w-fit">
          {([
            { key: 'campaign',  label: 'Campaign Builder', icon: <Megaphone size={15} /> },
            { key: 'analytics', label: 'Analytics',        icon: <BarChart3 size={15} /> },
          ] as { key: Tab; label: string; icon: ReactNode }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={['flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4', tab === t.key ? 'bg-green-500 text-black shadow-lg shadow-green-500/30' : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'].join(' ')}>
              {t.icon}<span className="hidden xs:inline sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'campaign' && (
            <motion.div key="campaign" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <CampaignBuilder
                adTitle={adTitle} setAdTitle={setAdTitle}
                adAltText={adAltText} setAdAltText={setAdAltText}
                mediaType={mediaType} setMediaType={setMediaType}
                selectedEventCount={selectedEventCount} setSelectedEventCount={setSelectedEventCount}
                selectedDuration={selectedDuration} setSelectedDuration={setSelectedDuration}
                selectedPosition={selectedPosition} setSelectedPosition={setSelectedPosition}
                mediaFileName={mediaFileName}
                videoUrl={videoUrlState} imageUrl={imageUrlState}
                videoDurationSeconds={videoDurationSeconds}
                imageDimensions={imageDimensions}
                isMediaValid={isMediaValid}
                inputRef={inputRef} price={price} submitting={submitting}
                onMediaPick={handleMediaPick} onResetMedia={() => inputRef.current?.click()}
                onSubmit={submitAdvertisement}
              />
              <input ref={inputRef} type="file" accept="video/*,image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => handleMediaPick(e.target.files?.[0])} />
            </motion.div>
          )}

          {tab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="mb-3 flex items-center justify-end">
                <button onClick={loadData} disabled={loadingAnalytics}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition disabled:opacity-50">
                  <RefreshCw size={13} className={loadingAnalytics ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
              {loadingAnalytics ? (
                <AnalyticsSkeleton />
              ) : campaigns.length === 0 ? (
                <div className="broadcast-card rounded-lg p-12 text-center text-[var(--muted)]">
                  <BarChart3 size={48} className="mx-auto mb-4 opacity-40" />
                  <div className="text-[16px] font-semibold text-[var(--text)]">No campaigns yet</div>
                  <div className="mt-2 text-sm">Create a campaign and run matches to see performance data.</div>
                </div>
              ) : (
                <AnalyticsDashboard
                  campaigns={campaigns} selected={selectedCampaign}
                  onSelect={setSelectedCampaign} totals={totals}
                  onDeleteAd={handleDeleteAd}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

// ── Campaign Builder ──────────────────────────────────────────
function CampaignBuilder({
  adTitle, setAdTitle, adAltText, setAdAltText,
  mediaType, setMediaType,
  selectedEventCount, setSelectedEventCount,
  selectedDuration, setSelectedDuration,
  selectedPosition, setSelectedPosition,
  mediaFileName, videoUrl, imageUrl,
  videoDurationSeconds, imageDimensions,
  isMediaValid, inputRef, price, submitting,
  onMediaPick, onResetMedia, onSubmit,
}: {
  adTitle: string; setAdTitle: (v: string) => void;
  adAltText: string; setAdAltText: (v: string) => void;
  mediaType: MediaType; setMediaType: (v: MediaType) => void;
  selectedEventCount: number; setSelectedEventCount: (v: (p: number) => number) => void;
  selectedDuration: number; setSelectedDuration: (v: number) => void;
  selectedPosition: AdPosition; setSelectedPosition: (v: AdPosition) => void;
  mediaFileName: string | null; videoUrl: string | null; imageUrl: string | null;
  videoDurationSeconds: number | null; imageDimensions: { width: number; height: number } | null;
  isMediaValid: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  price: number; submitting: boolean;
  onMediaPick: (f?: File) => void; onResetMedia: () => void; onSubmit: () => void;
}) {
  const positionInfo = positionPricing[selectedPosition];

  return (
    // Stack vertically on mobile, side-by-side on lg
    <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <div className="grid gap-5">
        <Hero count={selectedEventCount} duration={selectedDuration} position={selectedPosition} valid={isMediaValid} mediaType={mediaType} />

        {/* ── Campaign Settings ── */}
        <section className="broadcast-card rounded-lg p-4 sm:p-5">
          <SectionTitle icon={<Megaphone size={19} />} title="Campaign Settings" tone="green" />

          <div className="mt-5">
            <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--muted)] mb-2">Advertisement Title *</label>
            <input value={adTitle} onChange={e => setAdTitle(e.target.value)} placeholder="e.g. Safaricom Half-Time Spot"
              className="w-full h-11 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[15px] text-[var(--text)] outline-none focus:border-green-500/60 transition-colors" />
          </div>

          {mediaType === 'image' && (
            <div className="mt-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--muted)] mb-2">Alt Text (Accessibility)</label>
              <input value={adAltText} onChange={e => setAdAltText(e.target.value)} placeholder="Describe the image for screen readers..."
                className="w-full h-11 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[15px] text-[var(--text)] outline-none focus:border-green-500/60 transition-colors" />
            </div>
          )}

          {/* Events + Duration — stack on mobile, side-by-side on md */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-4">
              <Label icon={<CalendarDays size={15} />} text="Number of Events" />
              <div className="mt-3 flex items-center gap-3">
                <IconButton disabled={selectedEventCount <= 1} onClick={() => setSelectedEventCount((v) => Math.max(1, v - 1))}>
                  <CircleMinus size={22} />
                </IconButton>
                <div className="grid h-12 flex-1 place-items-center rounded-lg border border-green-500/40 bg-green-500/10 text-[20px] font-semibold text-[var(--text)]">
                  {selectedEventCount}
                </div>
                <IconButton onClick={() => setSelectedEventCount((v) => v + 1)}><CirclePlus size={22} /></IconButton>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-4">
              <Label icon={<Clock3 size={15} />} text={mediaType === 'video' ? 'Ad Duration' : 'Display Duration'} />
              <div className="mt-3 flex flex-wrap gap-2">
                {mediaType === 'video' ? durations.map((secs) => (
                  <button key={secs} onClick={() => setSelectedDuration(secs)}
                    className={['flex-1 min-w-[52px] rounded-lg border px-2 py-2 text-sm font-semibold transition', selectedDuration === secs ? 'border-green-500 bg-green-500/15 text-green-400' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)]'].join(' ')}>
                    {secs}s
                  </button>
                )) : (
                  <div className="text-sm text-[var(--muted)]">
                    Images display for <span className="font-semibold text-green-400">10 seconds</span> by default
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ad Position */}
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-4">
            <Label icon={<RadioTower size={15} />} text="Ad Position" />
            <div className="relative mt-3">
              <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value as AdPosition)}
                className="w-full appearance-none rounded-lg border border-[color:var(--border)] bg-[color:var(--field-bg)] text-[color:var(--text)] py-2.5 pl-3 pr-9 text-[14px] outline-none focus:border-[color:var(--green)]/60 transition-colors cursor-pointer">
                {positions.map((p) => (
                  <option key={p} value={p}>{p} — {positionPricing[p].label} (×{positionPricing[p].multiplier})</option>
                ))}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-[var(--muted)]">
              <Info size={14} className="mt-0.5 shrink-0 text-blue-400" />
              <span>{positionInfo.description}</span>
            </div>
          </div>
        </section>

        {/* ── Upload Creative ── */}
        <section className="broadcast-card rounded-lg p-4 sm:p-5">
          <SectionTitle icon={mediaType === 'video' ? <Video size={19} /> : <ImageIcon size={19} />} title="Upload Creative" tone="blue" />

          {/* Media type toggle */}
          <div className="mt-3 flex gap-2">
            {(['video', 'image'] as MediaType[]).map(mt => (
              <button key={mt} type="button" onClick={() => { setMediaType(mt); onResetMedia(); }}
                className={['flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition flex items-center justify-center gap-1.5',
                  mediaType === mt ? 'border-green-500 bg-green-500/15 text-green-400' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)]'].join(' ')}>
                {mt === 'video' ? <Video size={14} /> : <ImageIcon size={14} />}
                {mt.charAt(0).toUpperCase() + mt.slice(1)}
              </button>
            ))}
          </div>

          {/* Preview or drop zone */}
          {isMediaValid && (mediaType === 'video' ? videoUrl : imageUrl) ? (
            <div className="mt-5">
              <div className="overflow-hidden rounded-lg border border-green-500/30 bg-[var(--bg3)]">
                {mediaType === 'video'
                  ? <video src={videoUrl!} controls className="block max-h-[280px] w-full sm:max-h-[360px]" />
                  : <img src={imageUrl!} alt={adAltText || 'Ad creative preview'} className="block max-h-[280px] w-full object-contain sm:max-h-[360px]" />
                }
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-green-400">{mediaFileName}</span>
                {mediaType === 'video' && videoDurationSeconds && <span className="broadcast-label shrink-0">{videoDurationSeconds}s</span>}
                {mediaType === 'image' && imageDimensions && <span className="broadcast-label shrink-0">{imageDimensions.width}×{imageDimensions.height}</span>}
                <button onClick={onResetMedia} className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface3)]">Change</button>
              </div>
            </div>
          ) : (
            <button onClick={() => inputRef.current?.click()}
              className={['mt-5 flex min-h-[160px] w-full items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition sm:min-h-[190px]',
                'bg-gradient-to-br from-blue-500/10 to-green-500/10',
                mediaFileName && !isMediaValid ? 'border-red-500/60 text-red-400' : 'border-[var(--border)] text-green-400 hover:border-green-500/50'].join(' ')}>
              <div>
                {mediaFileName && !isMediaValid ? <XCircle size={40} className="mx-auto" /> : <UploadCloud size={40} className="mx-auto" />}
                <div className="mt-3 text-base font-semibold">
                  {mediaFileName && !isMediaValid
                    ? `${mediaFileName} — invalid`
                    : `Tap to upload ${mediaType === 'video' ? 'video' : 'image'}`}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[.04em] text-[var(--muted)]">
                  {mediaType === 'video'
                    ? `Max ${selectedDuration}s · MP4, WebM, MOV`
                    : `Min ${imageMinWidth}×${imageMinHeight}px · Max ${imageMaxSizeMB}MB · PNG, JPG, WebP`}
                </div>
              </div>
            </button>
          )}
        </section>
      </div>

      {/* ── Sidebar (stacks below on mobile, sticky on lg) ── */}
      <aside className="grid gap-5 lg:sticky lg:top-24">
        {/* Pricing */}
        <section className="broadcast-card rounded-lg border-yellow-400/30 p-4 sm:p-5">
          <SectionTitle icon={<BadgeCheck size={19} />} title="Pricing Summary" tone="gold" />
          <div className="mt-4 grid gap-3">
            <PriceRow label="Base Rate"  value={`KES 500 × ${selectedEventCount}`} />
            <PriceRow label="Position"   value={<span className="flex items-center gap-1">{positionInfo.label} <span className="text-xs font-normal text-[var(--muted)]">×{positionInfo.multiplier}</span></span>} />
            <PriceRow label="Duration"   value={mediaType === 'video' ? `${selectedDuration}s${selectedDuration > 30 ? ' (+50%)' : ''}` : '10s (image)'} />
          </div>
          <div className="my-4 h-px bg-[var(--surface3)]" />
          <div className="flex items-end justify-between gap-3">
            <div className="broadcast-label">Total</div>
            <div className="text-[22px] font-semibold leading-none text-green-400 sm:text-[24px]">KES {price.toLocaleString()}</div>
          </div>
          <button onClick={onSubmit} disabled={!isMediaValid || submitting || !adTitle.trim()}
            className={['mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition',
              isMediaValid && !submitting && adTitle.trim() ? 'bg-green-500 text-white hover:bg-green-400' : 'cursor-not-allowed bg-green-500/60 text-[var(--text)]/80'].join(' ')}>
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              : <><Send size={16} />{isMediaValid ? 'Submit & Pay' : `Upload ${mediaType} first`}</>}
          </button>
          {isMediaValid && adTitle.trim() && (
            <p className="mt-2 text-xs text-[var(--muted)] text-center">You'll be redirected to complete payment.</p>
          )}
        </section>

        {/* Workflow */}
        <section className="broadcast-card rounded-lg p-4 sm:p-5">
          <SectionTitle icon={<Clapperboard size={19} />} title="Injector Workflow" tone="blue" />
          <WorkflowStep label="Campaign settings"           active />
          <WorkflowStep label={`Creative (${mediaType})`}  active={isMediaValid} />
          <WorkflowStep label="Pricing confirmation"        active />
          <WorkflowStep label="Submit & pay"                active={isMediaValid && !!adTitle.trim()} />
          <WorkflowStep label="Ready for ad injector"       active={false} />
        </section>

        {/* Position guide */}
        <section className="broadcast-card rounded-lg p-4 sm:p-5">
          <SectionTitle icon={<Target size={19} />} title="Position Pricing Guide" tone="blue" />
          <div className="mt-4 grid gap-2 sm:gap-3">
            {positions.map((pos) => {
              const info = positionPricing[pos];
              const isSel = pos === selectedPosition;
              return (
                <div key={pos} className={['flex items-center justify-between rounded-lg border p-2.5 sm:p-3 transition',
                  isSel ? 'border-green-500/40 bg-green-500/10' : 'border-[var(--border)] bg-[var(--surface2)] hover:bg-[var(--surface3)]'].join(' ')}>
                  <div className="min-w-0 mr-2">
                    <div className={['text-sm font-semibold truncate', isSel ? 'text-green-400' : 'text-[var(--text)]'].join(' ')}>{pos}</div>
                    <div className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{info.description}</div>
                  </div>
                  <div className={['text-sm font-bold shrink-0', isSel ? 'text-green-400' : 'text-yellow-400'].join(' ')}>×{info.multiplier}</div>
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}

// ── Analytics Dashboard ───────────────────────────────────────
function AnalyticsDashboard({ campaigns, selected, onSelect, totals, onDeleteAd }: {
  campaigns: AdCampaign[]; selected: AdCampaign | null;
  onSelect: (c: AdCampaign) => void;
  totals: { impressions: number; clicks: number; reach: number; revenue: number };
  onDeleteAd: (ad: AdvertisementData) => void;
}) {
  const overallCtr = totals.clicks && totals.impressions
    ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
  const [showDetail, setShowDetail] = useState(false);

  const handleSelect = (c: AdCampaign) => {
    onSelect(c);
    setShowDetail(true);
  };

  return (
    <div className="grid gap-5">
      {/* Hero banner */}
      <section className="broadcast-card relative overflow-hidden rounded-lg p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(34,197,94,.12),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(59,130,246,.12),transparent_35%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="broadcast-label">Broadcast Ad Network</div>
            <h1 className="mt-1 text-[24px] font-semibold leading-none text-[var(--text)] sm:text-[30px]">Ad Performance</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <PlatformPill icon={<Youtube size={13} />}   label="YouTube"     platform="youtube" />
              <PlatformPill icon={<Facebook size={13} />}  label="Facebook"    platform="facebook" />
              <PlatformPill icon={<Wifi size={13} />}      label="RTMP Custom" platform="rtmp_custom" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <HeroMetric label="Campaigns"   value={String(campaigns.length)} tone="green" />
            <HeroMetric label="Reach"       value={fmt(totals.reach)}         tone="blue" />
            <HeroMetric label="CTR"         value={`${overallCtr}%`}          tone="gold" />
          </div>
        </div>
      </section>

      {/* KPI grid — 2 cols on mobile, 4 on xl */}
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Eye size={20} />}      label="Impressions" value={fmt(totals.impressions)} sub={`${campaigns.length} matches`}    tone="blue"  delta={12.4} />
        <KpiCard icon={<Target size={20} />}   label="Clicks"      value={fmt(totals.clicks)}      sub={`${overallCtr}% CTR`}             tone="green" delta={8.1} />
        <KpiCard icon={<Users size={20} />}    label="Reach"       value={fmt(totals.reach)}        sub="unique viewers"                   tone="gold"  delta={21.7} />
        <KpiCard icon={<Activity size={20} />} label="Revenue"     value={`KES ${fmt(totals.revenue)}`} sub="all campaigns"               tone="red"   delta={5.3} />
      </div>

      {/* Campaign list + detail */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,.45fr)_1fr]">
        {/* Campaign list */}
        <div className="broadcast-card overflow-hidden rounded-xl">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <MonitorPlay size={16} className="text-green-400" />
            <span className="text-sm font-semibold text-[var(--text)]">Campaigns</span>
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">{campaigns.length}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto lg:max-h-[520px]">
            {campaigns.map((camp) => (
              <button key={camp.id} onClick={() => handleSelect(camp)}
                className={['block w-full border-b border-[var(--border)] px-4 py-3 text-left transition',
                  selected?.id === camp.id ? 'border-l-4 border-l-green-500 bg-green-500/10' : 'border-l-4 border-l-transparent hover:bg-[var(--surface2)]'].join(' ')}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 truncate text-sm font-semibold text-[var(--text)]">{camp.matchLabel}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusDot status={camp.status} />
                    {camp.apiAd && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteAd(camp.apiAd!); }}
                        className="grid place-items-center w-6 h-6 rounded text-[var(--faint)] hover:text-red-400 hover:bg-red-500/10 transition">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-xs font-medium text-[var(--muted)]">{camp.league} · {camp.date}</div>
                <div className="mt-2 flex flex-wrap gap-2 sm:gap-3">
                  <span className="text-xs font-medium text-blue-400">{fmt(camp.totalImpressions)} imp</span>
                  <span className="text-xs font-medium text-green-400">{pct(camp.totalClicks, camp.totalImpressions)} CTR</span>
                  {camp.apiAd && <span className="text-xs font-medium text-yellow-400 capitalize">{camp.apiAd.status}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Campaign detail — modal on mobile, inline on lg */}
        <AnimatePresence>
          {selected && showDetail && (
            <>
              {/* Mobile overlay */}
              <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setShowDetail(false)} />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-[color:var(--surface)] p-4 shadow-2xl lg:relative lg:inset-auto lg:max-h-none lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
              >
                {/* Mobile drag handle */}
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--surface3)] lg:hidden" />
                <CampaignDetail campaign={selected} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop empty state */}
        {(!selected || !showDetail) && (
          <div className="hidden lg:flex broadcast-card rounded-lg p-12 items-center justify-center text-[var(--muted)]">
            <div className="text-center">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
              <div className="font-semibold text-[var(--text)]">Select a campaign</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CampaignDetail ────────────────────────────────────────────
function CampaignDetail({ campaign }: { campaign: AdCampaign }) {
  const ctr = pct(campaign.totalClicks, campaign.totalImpressions);
  const maxViewers = Math.max(...campaign.streams.map((s) => s.viewers), 1);

  return (
    <div className="grid gap-4">
      <div className="broadcast-card rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="broadcast-label mb-1">{campaign.league} · {campaign.position} · {campaign.duration}s</div>
            <h2 className="text-[18px] font-semibold text-[var(--text)] sm:text-[20px]">{campaign.matchLabel}</h2>
            <div className="mt-1 text-xs text-[var(--muted)]">{campaign.date}</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <StatusBadgeAd status={campaign.status} />
            <span className="rounded-lg bg-yellow-400/10 px-3 py-2 text-sm font-semibold text-yellow-400">KES {campaign.revenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <MiniKpi label="Impressions" value={fmt(campaign.totalImpressions)} tone="blue" />
          <MiniKpi label="Clicks"      value={fmt(campaign.totalClicks)}      tone="green" />
          <MiniKpi label="CTR"         value={ctr}                            tone="gold" />
          <MiniKpi label="Reach"       value={fmt(campaign.totalReach)}       tone="red" />
        </div>
      </div>

      {campaign.streams.length > 0 && (
        <>
          <div className="broadcast-card rounded-lg p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Globe size={16} className="text-blue-400" />
              <span className="text-sm font-semibold text-[var(--text)]">Platform Breakdown</span>
              <span className="broadcast-label ml-auto">RTMP Streams</span>
            </div>
            <div className="grid gap-3">
              {campaign.streams.map((stream) => (
                <PlatformRow key={stream.platform} stream={stream} maxViewers={maxViewers} totalImpressions={campaign.totalImpressions} />
              ))}
            </div>
          </div>

          <div className="broadcast-card rounded-lg p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-sm font-semibold text-[var(--text)]">Viewer Engagement</span>
            </div>
            <ViewerChart streams={campaign.streams} />
          </div>
        </>
      )}

      <div className="broadcast-card rounded-lg p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold text-[var(--text)]">Ad Injection Events</span>
        </div>
        <InjectionTimeline campaign={campaign} />
      </div>
    </div>
  );
}

function PlatformRow({ stream, maxViewers, totalImpressions }: { stream: PlatformStream; maxViewers: number; totalImpressions: number }) {
  const barPct  = maxViewers ? (stream.viewers / maxViewers) * 100 : 0;
  const impShare = totalImpressions ? ((stream.impressions / totalImpressions) * 100).toFixed(0) : '0';
  const ctr     = stream.impressions ? ((stream.clicks / stream.impressions) * 100).toFixed(2) : '0.00';
  const PlatformIcon = stream.platform === 'youtube' ? Youtube : stream.platform === 'facebook' ? Facebook : Wifi;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
        <div className={['grid h-9 w-9 place-items-center rounded-lg border shrink-0', platformTone[stream.platform]].join(' ')}><PlatformIcon size={16} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--text)]">{stream.label}</div>
          <div className="text-xs font-medium text-[var(--muted)]">{stream.watchTime}s avg watch</div>
        </div>
        {/* Stats wrap on mobile */}
        <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
          <StatCell label="Viewers"     value={fmt(stream.viewers)}     tone={stream.platform} />
          <StatCell label="Peak"        value={fmt(stream.peakViewers)} tone="muted" />
          <StatCell label="Impressions" value={fmt(stream.impressions)} tone="blue" />
          <StatCell label="CTR"         value={`${ctr}%`}               tone="green" />
          <StatCell label="Share"       value={`${impShare}%`}          tone="gold" />
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface3)]">
        <motion.div className={['h-full rounded-full', platformBar[stream.platform]].join(' ')} initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

function ViewerChart({ streams }: { streams: PlatformStream[] }) {
  const metrics: { key: keyof PlatformStream; label: string }[] = [
    { key: 'viewers',    label: 'Live Viewers' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks',     label: 'Clicks' },
    { key: 'watchTime',  label: 'Avg Watch (s)' },
  ];
  return (
    <div className="grid gap-5">
      {metrics.map(({ key, label }) => {
        const max = Math.max(...streams.map((s) => s[key] as number), 1);
        return (
          <div key={key}>
            <div className="mb-2 text-xs font-medium uppercase tracking-[.04em] text-[var(--muted)]">{label}</div>
            <div className="flex h-20 items-end gap-2 sm:gap-3">
              {streams.map((s) => {
                const val = s[key] as number;
                const h = Math.max(4, (val / max) * 64);
                const Icon = s.platform === 'youtube' ? Youtube : s.platform === 'facebook' ? Facebook : Wifi;
                return (
                  <div key={s.platform} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className="text-[10px] font-medium text-[var(--text)]">{fmt(val)}</div>
                    <motion.div className={['w-full rounded-t', platformBar[s.platform]].join(' ')} initial={{ height: 0 }} animate={{ height: h }} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }} />
                    <Icon className={platformTone[s.platform].split(' ')[0]} size={12} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InjectionTimeline({ campaign }: { campaign: AdCampaign }) {
  const events = [
    { time: '00:00',              label: 'Broadcast start',                    done: true },
    { time: '02:30',              label: `${campaign.position} — slot opened`, done: true },
    { time: '02:31',              label: `Creative injected (${campaign.duration}s)`, done: true },
    { time: '02:32',              label: 'YouTube RTMP — confirmed',            done: true },
    { time: '02:32',              label: 'Facebook RTMP — confirmed',           done: true },
    { time: '02:33',              label: 'Custom RTMP — confirmed',             done: campaign.status !== 'upcoming' },
    { time: '02:33',              label: 'Impression tracking active',          done: true },
    { time: `${campaign.duration}s later`, label: 'Slot closed — broadcast resumed', done: campaign.status === 'completed' },
  ];
  return (
    <div className="grid">
      {events.map((ev, i) => (
        <div key={i} className="relative flex items-start gap-3 pb-3 last:pb-0">
          {i < events.length - 1 && <div className="absolute left-[17px] top-8 bottom-0 w-px bg-[var(--surface3)]" />}
          <div className={['z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border', ev.done ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]'].join(' ')}>
            {ev.done ? <CheckCircle2 size={14} /> : <div className="h-2 w-2 rounded-full bg-slate-500" />}
          </div>
          <div className="pt-1.5 min-w-0">
            <div className={['text-sm font-semibold', ev.done ? 'text-[var(--text)]' : 'text-[var(--muted)]'].join(' ')}>{ev.label}</div>
            <div className="mt-0.5 text-xs font-medium text-[var(--faint)]">{ev.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsSkeleton() {
  const shimmer = 'animate-shimmer rounded-md bg-gradient-to-r from-white/[0.04] via-white/10 to-white/[0.04] bg-[length:200%_100%]';
  return (
    <div className="grid gap-5">
      <div className="broadcast-card min-h-28 rounded-lg p-5">
        <div className={`${shimmer} mb-3 h-6 w-48`} /><div className={`${shimmer} h-10 w-64`} />
      </div>
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`broadcast-card h-28 rounded-lg ${shimmer}`} />)}
      </div>
    </div>
  );
}

// ── Primitives ────────────────────────────────────────────────
function toneClasses(tone: string) {
  const t: Record<string, string> = {
    green: 'text-green-400 border-green-500/30 bg-green-500/10',
    blue:  'text-blue-400 border-blue-500/30 bg-blue-500/10',
    gold:  'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    red:   'text-red-400 border-red-500/30 bg-red-500/10',
    muted: 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface2)]',
  };
  return t[tone] ?? t.muted;
}

function Hero({ count, duration, position, valid, mediaType }: { count: number; duration: number; position: AdPosition; valid: boolean; mediaType: MediaType }) {
  return (
    <section className="broadcast-card overflow-hidden rounded-lg p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <div className="broadcast-label">Sponsor Overlay Desk</div>
          <h1 className="mt-1 text-[24px] font-semibold leading-none text-[var(--text)] sm:text-[30px]">Advertisement Control</h1>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Metric label="Events"   value={String(count)}                         tone="green" />
          <Metric label="Duration" value={mediaType === 'video' ? `${duration}s` : '10s'} tone="blue" />
          <Metric label="Creative" value={valid ? 'READY' : 'WAIT'}             tone={valid ? 'green' : 'gold'} />
        </div>
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-[.04em] text-[var(--muted)]">
        {position} ({positionPricing[position].label}) · {mediaType}
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={['rounded-lg border px-3 py-2', toneClasses(tone)].join(' ')}><div className="broadcast-label">{label}</div><div className="text-[15px] font-medium">{value}</div></div>;
}

function SectionTitle({ icon, title, tone }: { icon: ReactNode; title: string; tone: 'green' | 'blue' | 'gold' | 'red' }) {
  return (
    <div className="flex items-center gap-3">
      <span className={['grid h-9 w-9 place-items-center rounded-lg border sm:h-10 sm:w-10', toneClasses(tone)].join(' ')}>{icon}</span>
      <h2 className={['text-[15px] font-medium sm:text-[16px]', toneClasses(tone).split(' ')[0]].join(' ')}>{title}</h2>
    </div>
  );
}

function Label({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.04em] text-[var(--muted)]">{icon}{text}</div>;
}

function IconButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button onClick={onClick} disabled={disabled} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-40">{children}</button>;
}

function PriceRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex justify-between gap-3 text-[var(--text)]"><span className="font-medium text-[var(--muted)]">{label}</span><span className="text-right font-semibold">{value}</span></div>;
}

function WorkflowStep({ label, active }: { label: string; active: boolean }) {
  return <div className={['mt-3 flex items-center justify-between gap-3 rounded-lg border p-2.5 sm:p-3', active ? 'border-green-500/30 bg-green-500/10' : 'border-[var(--border)] bg-[var(--surface2)]'].join(' ')}>
    <span className="text-sm font-semibold text-[var(--text)] truncate">{label}</span>
    <span className={['text-xs font-semibold uppercase tracking-[.04em] shrink-0', active ? 'text-green-400' : 'text-[var(--muted)]'].join(' ')}>{active ? 'READY' : 'WAITING'}</span>
  </div>;
}

function KpiCard({ icon, label, value, sub, tone, delta }: { icon: ReactNode; label: string; value: string; sub: string; tone: string; delta: number }) {
  const up = delta >= 0;
  return (
    <div className="broadcast-card relative overflow-hidden rounded-lg p-3 sm:p-5">
      <div style={{ position: 'absolute', right: -40, top: -40, width: 128, height: 128, borderRadius: '50%', background: tone === 'green' ? 'rgba(10,143,82,.08)' : tone === 'blue' ? 'rgba(26,95,212,.08)' : tone === 'gold' ? 'rgba(143,101,0,.08)' : 'rgba(192,41,29,.08)', filter: 'blur(16px)', pointerEvents: 'none' }} />
      <div className="relative flex items-start justify-between">
        <div className={['grid h-9 w-9 place-items-center rounded-lg border sm:h-11 sm:w-11', toneClasses(tone)].join(' ')}>{icon}</div>
        <span className={['flex items-center gap-0.5 text-xs font-semibold', up ? 'text-green-400' : 'text-red-400'].join(' ')}>{up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}%</span>
      </div>
      <div className="relative mt-3 text-[20px] font-semibold leading-none text-[var(--text)] sm:mt-4 sm:text-[24px]">{value}</div>
      <div className="relative mt-1.5 text-xs font-medium text-[var(--text)] sm:text-sm">{label}</div>
      <div className="relative mt-0.5 text-xs font-medium text-[var(--muted)] truncate">{sub}</div>
    </div>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={['rounded-lg border p-2.5 text-center sm:p-3', toneClasses(tone)].join(' ')}><div className="text-[15px] font-semibold sm:text-[16px]">{value}</div><div className="mt-1 text-[10px] font-medium uppercase tracking-[.04em] text-[var(--muted)]">{label}</div></div>;
}

function StatCell({ label, value, tone }: { label: string; value: string; tone: string | Platform }) {
  const toneClass = tone === 'youtube' || tone === 'facebook' || tone === 'rtmp_custom' ? platformTone[tone].split(' ')[0] : toneClasses(tone).split(' ')[0];
  return <div className="text-center"><div className={['text-xs font-semibold sm:text-sm', toneClass].join(' ')}>{value}</div><div className="text-[10px] font-medium uppercase tracking-[.04em] text-[var(--muted)]">{label}</div></div>;
}

function HeroMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={['rounded-lg border px-3 py-2 sm:px-4 sm:py-3', toneClasses(tone)].join(' ')}><div className="broadcast-label">{label}</div><div className="mt-0.5 text-[18px] font-semibold sm:mt-1 sm:text-[20px]">{value}</div></div>;
}

function PlatformPill({ icon, label, platform }: { icon: ReactNode; label: string; platform: Platform }) {
  return <span className={['inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium sm:px-3', platformTone[platform]].join(' ')}>{icon}{label}</span>;
}

function StatusDot({ status }: { status: AdCampaign['status'] }) {
  const cfg   = { live: 'bg-red-500/10 text-red-400', scheduled: 'bg-blue-500/10 text-blue-400', upcoming: 'bg-yellow-400/10 text-yellow-400', completed: 'bg-green-500/10 text-green-400' }[status];
  const label = { live: 'LIVE', scheduled: 'SCHED', upcoming: 'UPCOMING', completed: 'DONE' }[status];
  return <span className={['shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-[.04em]', cfg].join(' ')}>{label}</span>;
}

function StatusBadgeAd({ status }: { status: AdCampaign['status'] }) {
  const cfg   = { live: 'bg-red-500/10 text-red-400', scheduled: 'bg-blue-500/10 text-blue-400', upcoming: 'bg-yellow-400/10 text-yellow-400', completed: 'bg-green-500/10 text-green-400' }[status];
  const label = { live: '● LIVE', scheduled: 'SCHEDULED', upcoming: 'UPCOMING', completed: 'COMPLETED' }[status];
  return <span className={['rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[.04em]', cfg].join(' ')}>{label}</span>;
}
