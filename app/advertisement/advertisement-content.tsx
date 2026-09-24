'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid,
} from 'recharts';
import {
  BadgeCheck, CalendarDays, CheckCircle2, ChevronDown, CircleMinus, CirclePlus,
  Clapperboard, Clock3, Megaphone, RadioTower, Send, UploadCloud, Video, XCircle,
  BarChart3, TrendingUp, Eye, Users, Wifi, Youtube, Facebook, MonitorPlay, Activity,
  Zap, Target, ArrowUpRight, ArrowDownRight, Globe, Loader2, Trash2, RefreshCw,
  Image as ImageIcon, Info, Gavel, MapPin, Trophy, X as XIcon,
} from 'lucide-react';
import { Icon, PageShell } from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import {
  UserPrefs, getMatchesByAuthorId, isBroadcaster, isAdvertiser, getClubs,
  getAdvertisements, createAdvertisement, deleteAdvertisement,
  pollPaymentUntilSettled,
  getBidEligibleMatches, getBidBasePrice, getBidAuctionStatus, createBidCampaign, getMyBids,
  type MatchData, type AdvertisementData, type AdAnalyticsData, type Club,
  type BidPeriod, type BidEntry, type MatchBidData, type BidAuctionStatus,
  ROLES,
} from '@/lib/api';

const isValidKenyanPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return /^254[0-9]{9}$/.test(cleaned) || /^0[79][0-9]{8}$/.test(cleaned);
};

type Platform = 'youtube' | 'facebook' | 'rtmp_custom';
type Tab = 'campaign' | 'bid' | 'analytics';
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
  youtube:     'text-[var(--red)] border-[var(--red)]/30 bg-[var(--red)]/10',
  facebook:    'text-[var(--blue)] border-[var(--blue)]/30 bg-[var(--blue)]/10',
  rtmp_custom: 'text-[var(--gold)] border-[var(--gold)]/30 bg-[var(--gold)]/10',
};
const platformBar: Record<Platform, string> = {
  youtube: 'bg-[var(--red)]', facebook: 'bg-[var(--blue)]', rtmp_custom: 'bg-[var(--gold)]',
};

function buildCampaignsFromMatches(matches: MatchData[]): AdCampaign[] {
  const adPositions: AdPosition[] = ['Before 1ST', 'Half Time', 'After 2ND'];
  const adDurations = [15, 30, 45, 60];
  return matches.map((m, i) => {
    const seed = (m.id?.charCodeAt(0) ?? i + 1) * 137 + i;
    const rand = (min: number, max: number) => Math.floor(((seed * (i + 3) * 31) % (max - min + 1)) + min);
    const ytV = m.views ? Math.floor(m.views * 0.55) : rand(1200, 8000);
    const fbV = m.views ? Math.floor(m.views * 0.35) : rand(800, 5000);
    const rtV = m.views ? Math.floor(m.views * 0.1)  : rand(200, 1500);
    const totalV = ytV + fbV + rtV;
    const imp = Math.floor(totalV * rand(2, 4));
    const clk = Math.floor(imp * (rand(2, 8) / 100));
    return {
      id: `camp_${m.id}`, matchId: m.id,
      matchLabel: `${m.homeTeam?.name ?? 'Home'} vs ${m.awayTeam?.name ?? 'Away'}`,
      league: m.league.id,
      date: m.created_at?.toString()||"",
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
  useRoleGuard([ROLES.ADVERTISER, ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);

  const [tab, setTab] = useState<Tab>(() => isAdvertiser() ? 'analytics' : 'campaign');
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
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [generalSelfAdvertise, setGeneralSelfAdvertise] = useState(false);

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
    if (!isValidKenyanPhone(mpesaPhone)) { showNotice('error', 'Enter a valid M-Pesa phone (e.g., 0712 345 678).'); return; }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', adTitle.trim());
      form.append('file_type', mediaType);
      form.append('file', mediaType === 'video' ? videoFile! : imageFile!);
      form.append('duration', mediaType === 'video' ? String(selectedDuration) : '10');
      if (mediaType === 'image' && adAltText.trim()) form.append('alt_text', adAltText.trim());
      form.append('period', selectedPosition);
      form.append('currency', 'KES');
      form.append('method', 'mpesa');
      form.append('details[phone]', mpesaPhone);
      if (generalSelfAdvertise) form.append('self_advertise', '1');
      const ad = await createAdvertisement(form);
      showNotice('success', `Advertisement created for KES ${ad.price ?? '—'}. Check your phone for the M-Pesa prompt.`);
      setAdTitle(''); setAdAltText(''); setGeneralSelfAdvertise(false); resetMedia();
      await loadData();

      if (ad.payment_id) {
        setAwaitingPayment(true);
        try {
          const settled = await pollPaymentUntilSettled(ad.payment_id);
          if (settled.status === 'completed') {
            showNotice('success', 'Payment confirmed — your campaign is now active.');
          } else {
            showNotice('error', 'Payment was not completed. The campaign stays paused until it is paid.');
          }
        } catch {
          showNotice('error', 'Still waiting on M-Pesa confirmation — check your Advertisements list shortly.');
        } finally {
          setAwaitingPayment(false);
          await loadData();
        }
      }
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
                notice.type === 'success' ? 'border-[var(--green)]/40 bg-[var(--green)]/15 text-[var(--green)]' : 'border-[var(--red)]/40 bg-[var(--red)]/15 text-[var(--red)]',
              ].join(' ')}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >{notice.text}</motion.div>
          )}
        </AnimatePresence>

        {/* Tab switcher — full width on mobile */}
        <div className="mb-5 flex w-full gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-1 sm:w-fit">
          {([
            { key: 'campaign',  label: 'Campaign Builder', icon: <Megaphone size={15} /> },
            ...(isBroadcaster() ? [] : [{ key: 'bid' as Tab, label: 'Bid Tab', icon: <Gavel size={15} /> }]),
            { key: 'analytics', label: 'Analytics',        icon: <BarChart3 size={15} /> },
          ] as { key: Tab; label: string; icon: ReactNode }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={['flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4', tab === t.key ? 'bg-[var(--green)] text-black shadow-lg shadow-[var(--green)]/30' : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'].join(' ')}>
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
                mpesaPhone={mpesaPhone} setMpesaPhone={setMpesaPhone}
                awaitingPayment={awaitingPayment}
                selfAdvertise={generalSelfAdvertise} setSelfAdvertise={setGeneralSelfAdvertise}
                onMediaPick={handleMediaPick} onResetMedia={() => inputRef.current?.click()}
                onSubmit={submitAdvertisement}
              />
              <input ref={inputRef} type="file" accept="video/*,image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => handleMediaPick(e.target.files?.[0])} />
            </motion.div>
          )}

          {tab === 'bid' && (
            <motion.div key="bid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <BidTab onNotice={showNotice} />
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
  mpesaPhone, setMpesaPhone, awaitingPayment,
  selfAdvertise, setSelfAdvertise,
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
  mpesaPhone: string; setMpesaPhone: (v: string) => void; awaitingPayment: boolean;
  selfAdvertise: boolean; setSelfAdvertise: (v: boolean) => void;
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
              className="w-full h-11 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[15px] text-[var(--text)] outline-none focus:border-[var(--green)]/60 transition-colors" />
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--muted)] mb-2">M-Pesa Phone *</label>
            <input value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} placeholder="0712 345 678"
              className="w-full h-11 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[15px] text-[var(--text)] outline-none focus:border-[var(--green)]/60 transition-colors" />
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">The STK push to pay for this campaign will be sent here.</p>
          </div>

          {isBroadcaster() && (
            <label className="mt-4 flex items-start gap-2 text-xs text-[var(--muted)]">
              <input type="checkbox" checked={selfAdvertise} onChange={e => setSelfAdvertise(e.target.checked)} className="mt-0.5" />
              <span>
                Self-advertise (e.g. showing a sponsor's involvement with your club, or promoting your own merchandise).
                Restricted to showing only on matches you created.
              </span>
            </label>
          )}

          {mediaType === 'image' && (
            <div className="mt-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--muted)] mb-2">Alt Text (Accessibility)</label>
              <input value={adAltText} onChange={e => setAdAltText(e.target.value)} placeholder="Describe the image for screen readers..."
                className="w-full h-11 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[15px] text-[var(--text)] outline-none focus:border-[var(--green)]/60 transition-colors" />
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
                <div className="grid h-12 flex-1 place-items-center rounded-lg border border-[var(--green)]/40 bg-[var(--green)]/10 text-[20px] font-semibold text-[var(--text)]">
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
                    className={['flex-1 min-w-[52px] rounded-lg border px-2 py-2 text-sm font-semibold transition', selectedDuration === secs ? 'border-[var(--green)] bg-[var(--green)]/15 text-[var(--green)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)]'].join(' ')}>
                    {secs}s
                  </button>
                )) : (
                  <div className="text-sm text-[var(--muted)]">
                    Images display for <span className="font-semibold text-[var(--green)]">10 seconds</span> by default
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
              <Info size={14} className="mt-0.5 shrink-0 text-[var(--blue)]" />
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
                  mediaType === mt ? 'border-[var(--green)] bg-[var(--green)]/15 text-[var(--green)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)]'].join(' ')}>
                {mt === 'video' ? <Video size={14} /> : <ImageIcon size={14} />}
                {mt.charAt(0).toUpperCase() + mt.slice(1)}
              </button>
            ))}
          </div>

          {/* Preview or drop zone */}
          {isMediaValid && (mediaType === 'video' ? videoUrl : imageUrl) ? (
            <div className="mt-5">
              <div className="overflow-hidden rounded-lg border border-[var(--green)]/30 bg-[var(--bg3)]">
                {mediaType === 'video'
                  ? <video src={videoUrl!} controls className="block max-h-[280px] w-full sm:max-h-[360px]" />
                  : <img src={imageUrl!} alt={adAltText || 'Ad creative preview'} className="block max-h-[280px] w-full object-contain sm:max-h-[360px]" />
                }
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <CheckCircle2 size={18} className="text-[var(--green)] shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--green)]">{mediaFileName}</span>
                {mediaType === 'video' && videoDurationSeconds && <span className="broadcast-label shrink-0">{videoDurationSeconds}s</span>}
                {mediaType === 'image' && imageDimensions && <span className="broadcast-label shrink-0">{imageDimensions.width}×{imageDimensions.height}</span>}
                <button onClick={onResetMedia} className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface3)]">Change</button>
              </div>
            </div>
          ) : (
            <button onClick={() => inputRef.current?.click()}
              style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--blue) 10%, transparent), color-mix(in srgb, var(--green) 10%, transparent))' }}
              className={['mt-5 flex min-h-[160px] w-full items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition sm:min-h-[190px]',
                mediaFileName && !isMediaValid ? 'border-[var(--red)]/60 text-[var(--red)]' : 'border-[var(--border)] text-[var(--green)] hover:border-[var(--green)]/50'].join(' ')}>
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
        <section className="broadcast-card rounded-lg border-[var(--gold)]/30 p-4 sm:p-5">
          <SectionTitle icon={<BadgeCheck size={19} />} title="Pricing Summary" tone="gold" />
          <div className="mt-4 grid gap-3">
            <PriceRow label="Base Rate"  value={`KES 500 × ${selectedEventCount}`} />
            <PriceRow label="Position"   value={<span className="flex items-center gap-1">{positionInfo.label} <span className="text-xs font-normal text-[var(--muted)]">×{positionInfo.multiplier}</span></span>} />
            <PriceRow label="Duration"   value={mediaType === 'video' ? `${selectedDuration}s${selectedDuration > 30 ? ' (+50%)' : ''}` : '10s (image)'} />
          </div>
          <div className="my-4 h-px bg-[var(--surface3)]" />
          <div className="flex items-end justify-between gap-3">
            <div className="broadcast-label">Estimated total</div>
            <div className="text-[22px] font-semibold leading-none text-[var(--green)] sm:text-[24px]">KES {price.toLocaleString()}</div>
          </div>
          <button onClick={onSubmit} disabled={!isMediaValid || submitting || awaitingPayment || !adTitle.trim() || !isValidKenyanPhone(mpesaPhone)}
            className={['mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition',
              isMediaValid && !submitting && !awaitingPayment && adTitle.trim() && isValidKenyanPhone(mpesaPhone) ? 'bg-[var(--green)] text-white hover:bg-[var(--green)]' : 'cursor-not-allowed bg-[var(--green)]/60 text-[var(--text)]/80'].join(' ')}>
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              : awaitingPayment
              ? <><Loader2 size={16} className="animate-spin" /> Waiting for M-Pesa…</>
              : <><Send size={16} />{isMediaValid ? 'Submit & Pay' : `Upload ${mediaType} first`}</>}
          </button>
          {isMediaValid && adTitle.trim() && (
            <p className="mt-2 text-xs text-[var(--muted)] text-center">An STK push will be sent to your phone to complete payment.</p>
          )}
        </section>

        {/* Workflow */}
        <section className="broadcast-card rounded-lg p-4 sm:p-5">
          <SectionTitle icon={<Clapperboard size={19} />} title="Injector Workflow" tone="blue" />
          <WorkflowStep label="Campaign settings"           active />
          <WorkflowStep label={`Creative (${mediaType})`}  active={isMediaValid} />
          <WorkflowStep label="Pricing confirmation"        active />
          <WorkflowStep label="Submit & pay"                active={isMediaValid && !!adTitle.trim() && isValidKenyanPhone(mpesaPhone)} />
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
                  isSel ? 'border-[var(--green)]/40 bg-[var(--green)]/10' : 'border-[var(--border)] bg-[var(--surface2)] hover:bg-[var(--surface3)]'].join(' ')}>
                  <div className="min-w-0 mr-2">
                    <div className={['text-sm font-semibold truncate', isSel ? 'text-[var(--green)]' : 'text-[var(--text)]'].join(' ')}>{pos}</div>
                    <div className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{info.description}</div>
                  </div>
                  <div className={['text-sm font-bold shrink-0', isSel ? 'text-[var(--green)]' : 'text-[var(--gold)]'].join(' ')}>×{info.multiplier}</div>
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
        <KpiCard icon={<Eye size={20} />}      label="Impressions" value={fmt(totals.impressions)} sub={`${campaigns.length} matches`}    tone="blue"  />
        <KpiCard icon={<Target size={20} />}   label="Clicks"      value={fmt(totals.clicks)}      sub={`${overallCtr}% CTR`}             tone="green" />
        <KpiCard icon={<Users size={20} />}    label="Reach"       value={fmt(totals.reach)}        sub="unique viewers"                   tone="gold"  />
        <KpiCard icon={<Activity size={20} />} label="Revenue"     value={`KES ${fmt(totals.revenue)}`} sub="all campaigns"               tone="green"   />
      </div>

      {/* Spend by campaign — what the advertiser actually wants to see: how their money performed */}
      {campaigns.length > 1 && (
        <div className="broadcast-card rounded-lg p-4">
          <SectionTitle icon={<BarChart3 size={18} />} title="Performance by campaign" tone="green" />
          <ResponsiveContainer width="100%" height={180} className="mt-3">
            <RBarChart data={campaigns.slice(0, 8).map(c => ({ name: c.matchLabel, clicks: c.totalClicks, impressions: c.totalImpressions }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted)' }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={42} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={40} />
              <RTooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1.5 text-[11px] text-[var(--text)]">
                      <div>{fmt(payload[0]?.value as number)} clicks</div>
                      <div className="text-[var(--muted)]">{fmt(payload[1]?.value as number)} impressions</div>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="clicks" fill="var(--green)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="impressions" fill="var(--blue)" fillOpacity={0.35} radius={[3, 3, 0, 0]} />
            </RBarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign list + detail */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,.45fr)_1fr]">
        {/* Campaign list */}
        <div className="broadcast-card overflow-hidden rounded-xl">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <MonitorPlay size={16} className="text-[var(--green)]" />
            <span className="text-sm font-semibold text-[var(--text)]">Campaigns</span>
            <span className="ml-auto rounded-full bg-[var(--green)]/10 px-2 py-1 text-xs font-medium text-[var(--green)]">{campaigns.length}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto lg:max-h-[520px]">
            {campaigns.map((camp) => (
              <button key={camp.id} onClick={() => handleSelect(camp)}
                className={['block w-full border-b border-[var(--border)] px-4 py-3 text-left transition',
                  selected?.id === camp.id ? 'border-l-4 border-l-[var(--green)] bg-[var(--green)]/10' : 'border-l-4 border-l-transparent hover:bg-[var(--surface2)]'].join(' ')}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 truncate text-sm font-semibold text-[var(--text)]">{camp.matchLabel}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusDot status={camp.status} />
                    {camp.apiAd && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteAd(camp.apiAd!); }}
                        className="grid place-items-center w-6 h-6 rounded text-[var(--faint)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-xs font-medium text-[var(--muted)]">{camp.league} · {camp.date}</div>
                <div className="mt-2 flex flex-wrap gap-2 sm:gap-3">
                  <span className="text-xs font-medium text-[var(--blue)]">{fmt(camp.totalImpressions)} imp</span>
                  <span className="text-xs font-medium text-[var(--green)]">{pct(camp.totalClicks, camp.totalImpressions)} CTR</span>
                  {camp.apiAd && <span className="text-xs font-medium text-[var(--gold)] capitalize">{camp.apiAd.status}</span>}
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
            <span className="rounded-lg bg-[var(--gold)]/10 px-3 py-2 text-sm font-semibold text-[var(--gold)]">KES {campaign.revenue.toLocaleString()}</span>
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
              <Globe size={16} className="text-[var(--blue)]" />
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
              <TrendingUp size={16} className="text-[var(--green)]" />
              <span className="text-sm font-semibold text-[var(--text)]">Viewer Engagement</span>
            </div>
            <ViewerChart streams={campaign.streams} />
          </div>
        </>
      )}

      <div className="broadcast-card rounded-lg p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Zap size={16} className="text-[var(--gold)]" />
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
          <div className={['z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border', ev.done ? 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]'].join(' ')}>
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
const TONE_COLOR: Record<string, string> = {
  green: 'var(--green)', blue: 'var(--blue)', gold: 'var(--gold)', red: 'var(--red)', muted: 'var(--muted)',
};

/** Inline style using the app's actual palette tokens — not generic Tailwind colors. */
function toneStyle(tone: string): React.CSSProperties {
  const color = TONE_COLOR[tone] ?? TONE_COLOR.muted;
  if (tone === 'muted' || !TONE_COLOR[tone]) {
    return { color, borderColor: 'var(--border)', background: 'var(--surface2)' };
  }
  return {
    color,
    borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
    background: `color-mix(in srgb, ${color} 10%, transparent)`,
  };
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
  return <div className="rounded-lg border px-3 py-2" style={toneStyle(tone)}><div className="broadcast-label">{label}</div><div className="text-[15px] font-medium">{value}</div></div>;
}

function SectionTitle({ icon, title, tone }: { icon: ReactNode; title: string; tone: 'green' | 'blue' | 'gold' | 'red' }) {
  const style = toneStyle(tone);
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg border sm:h-10 sm:w-10" style={style}>{icon}</span>
      <h2 className="text-[15px] font-medium sm:text-[16px]" style={{ color: style.color }}>{title}</h2>
    </div>
  );
}

function Label({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.04em] text-[var(--muted)]">{icon}{text}</div>;
}

function IconButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button onClick={onClick} disabled={disabled} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)] transition hover:bg-[var(--green)]/20 disabled:cursor-not-allowed disabled:opacity-40">{children}</button>;
}

function PriceRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex justify-between gap-3 text-[var(--text)]"><span className="font-medium text-[var(--muted)]">{label}</span><span className="text-right font-semibold">{value}</span></div>;
}

function WorkflowStep({ label, active }: { label: string; active: boolean }) {
  return <div className={['mt-3 flex items-center justify-between gap-3 rounded-lg border p-2.5 sm:p-3', active ? 'border-[var(--green)]/30 bg-[var(--green)]/10' : 'border-[var(--border)] bg-[var(--surface2)]'].join(' ')}>
    <span className="text-sm font-semibold text-[var(--text)] truncate">{label}</span>
    <span className={['text-xs font-semibold uppercase tracking-[.04em] shrink-0', active ? 'text-[var(--green)]' : 'text-[var(--muted)]'].join(' ')}>{active ? 'READY' : 'WAITING'}</span>
  </div>;
}

function KpiCard({ icon, label, value, sub, tone, delta }: { icon: ReactNode; label: string; value: string; sub: string; tone: string; delta?: number }) {
  const up = delta != null && delta >= 0;
  return (
    <div className="broadcast-card relative overflow-hidden rounded-lg p-3 sm:p-5">
      <div style={{ position: 'absolute', right: -40, top: -40, width: 128, height: 128, borderRadius: '50%', background: tone === 'green' ? 'rgba(10,143,82,.08)' : tone === 'blue' ? 'rgba(26,95,212,.08)' : tone === 'gold' ? 'rgba(143,101,0,.08)' : 'rgba(192,41,29,.08)', filter: 'blur(16px)', pointerEvents: 'none' }} />
      <div className="relative flex items-start justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg border sm:h-11 sm:w-11" style={toneStyle(tone)}>{icon}</div>
        {delta != null && (
          <span className={['flex items-center gap-0.5 text-xs font-semibold', up ? 'text-[var(--green)]' : 'text-[var(--red)]'].join(' ')}>{up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}%</span>
        )}
      </div>
      <div className="relative mt-3 text-[20px] font-semibold leading-none text-[var(--text)] sm:mt-4 sm:text-[24px]">{value}</div>
      <div className="relative mt-1.5 text-xs font-medium text-[var(--text)] sm:text-sm">{label}</div>
      <div className="relative mt-0.5 text-xs font-medium text-[var(--muted)] truncate">{sub}</div>
    </div>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="rounded-lg border p-2.5 text-center sm:p-3" style={toneStyle(tone)}><div className="text-[15px] font-semibold sm:text-[16px]">{value}</div><div className="mt-1 text-[10px] font-medium uppercase tracking-[.04em] text-[var(--muted)]">{label}</div></div>;
}

function StatCell({ label, value, tone }: { label: string; value: string; tone: string | Platform }) {
  const isPlatform = tone === 'youtube' || tone === 'facebook' || tone === 'rtmp_custom';
  const style: React.CSSProperties = isPlatform ? {} : { color: toneStyle(tone).color };
  const className = isPlatform ? ['text-xs font-semibold sm:text-sm', platformTone[tone as Platform].split(' ')[0]].join(' ') : 'text-xs font-semibold sm:text-sm';
  return <div className="text-center"><div className={className} style={style}>{value}</div><div className="text-[10px] font-medium uppercase tracking-[.04em] text-[var(--muted)]">{label}</div></div>;
}

function HeroMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="rounded-lg border px-3 py-2 sm:px-4 sm:py-3" style={toneStyle(tone)}><div className="broadcast-label">{label}</div><div className="mt-0.5 text-[18px] font-semibold sm:mt-1 sm:text-[20px]">{value}</div></div>;
}

function PlatformPill({ icon, label, platform }: { icon: ReactNode; label: string; platform: Platform }) {
  return <span className={['inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium sm:px-3', platformTone[platform]].join(' ')}>{icon}{label}</span>;
}

function StatusDot({ status }: { status: AdCampaign['status'] }) {
  const cfg   = { live: 'bg-[var(--red)]/10 text-[var(--red)]', scheduled: 'bg-[var(--blue)]/10 text-[var(--blue)]', upcoming: 'bg-[var(--gold)]/10 text-[var(--gold)]', completed: 'bg-[var(--green)]/10 text-[var(--green)]' }[status];
  const label = { live: 'LIVE', scheduled: 'SCHED', upcoming: 'UPCOMING', completed: 'DONE' }[status];
  return <span className={['shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-[.04em]', cfg].join(' ')}>{label}</span>;
}

function StatusBadgeAd({ status }: { status: AdCampaign['status'] }) {
  const cfg   = { live: 'bg-[var(--red)]/10 text-[var(--red)]', scheduled: 'bg-[var(--blue)]/10 text-[var(--blue)]', upcoming: 'bg-[var(--gold)]/10 text-[var(--gold)]', completed: 'bg-[var(--green)]/10 text-[var(--green)]' }[status];
  const label = { live: '● LIVE', scheduled: 'SCHEDULED', upcoming: 'UPCOMING', completed: 'COMPLETED' }[status];
  return <span className={['rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[.04em]', cfg].join(' ')}>{label}</span>;
}

// ─── Bid Tab ────────────────────────────────────────────────────────────────
const PERIOD_LABEL: Record<BidPeriod, string> = {
  before_match: 'Before match',
  halftime:     'Half-time',
  fulltime:     'Full-time',
};

/** "Closes in 42m" / "Closes in 1h 12m" from an ISO deadline string. */
function deadlineLabel(deadlineIso: string): string {
  const msLeft = new Date(deadlineIso).getTime() - Date.now();
  if (msLeft <= 0) return 'Closing…';
  const totalMinutes = Math.ceil(msLeft / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `Closes in ${hours}h ${minutes}m` : `Closes in ${minutes}m`;
}

type BasketEntry = BidEntry & { key: string; matchLabel: string };

function BidTab({ onNotice }: { onNotice: (type: 'success' | 'error', text: string) => void }) {
  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [stadiumFilter, setStadiumFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);

  // Matches + base prices
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [basePrices, setBasePrices] = useState<Record<BidPeriod, number>>({ before_match: 0, halftime: 0, fulltime: 0 });

  // Per-card bid amount inputs, keyed by `${matchId}:${period}`
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});

  // Basket
  const [basket, setBasket] = useState<BasketEntry[]>([]);

  // Campaign fields
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  // Live auction status per match+period ("<matchId>:<period>"), fetched
  // for whatever's currently displayed so bidders see the real minimum
  // (they must outbid the current highest, not just meet the base price).
  const [auctionStatus, setAuctionStatus] = useState<Record<string, BidAuctionStatus>>({});

  // My bids
  const [myBids, setMyBids] = useState<MatchBidData[]>([]);
  const [loadingMyBids, setLoadingMyBids] = useState(true);

  useEffect(() => {
    getClubs().then(setClubs).catch(() => setClubs([]));
    Promise.all([getBidBasePrice('before_match'), getBidBasePrice('halftime'), getBidBasePrice('fulltime')])
      .then(([b, h, f]) => setBasePrices({ before_match: b, halftime: h, fulltime: f }))
      .catch(() => {});
    refreshMyBids();
  }, []);

  const refreshMyBids = () => {
    setLoadingMyBids(true);
    getMyBids().then(setMyBids).catch(() => setMyBids([])).finally(() => setLoadingMyBids(false));
  };

  useEffect(() => {
    setLoadingMatches(true);
    const handle = setTimeout(() => {
      getBidEligibleMatches({
        date: dateFilter || undefined,
        stadium: stadiumFilter.trim() || undefined,
        club_id: clubFilter || undefined,
      }).then(setMatches).catch(() => setMatches([])).finally(() => setLoadingMatches(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [dateFilter, stadiumFilter, clubFilter]);

  const displayedMatches = matches;

  // Fetch live auction status (current highest bid, minimum to outbid,
  // deadline) for whatever matches are currently displayed.
  useEffect(() => {
    if (displayedMatches.length === 0) return;
    let cancelled = false;
    const periods: BidPeriod[] = ['before_match', 'halftime', 'fulltime'];
    Promise.all(
      displayedMatches.flatMap(m => periods.map(async period => {
        try {
          const status = await getBidAuctionStatus(m.id, period);
          return [`${m.id}:${period}`, status] as const;
        } catch {
          return null;
        }
      }))
    ).then(results => {
      if (cancelled) return;
      setAuctionStatus(prev => {
        const next = { ...prev };
        for (const r of results) {
          if (r) next[r[0]] = r[1];
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [displayedMatches]);

  const minimumFor = (matchId: string, period: BidPeriod) =>
    auctionStatus[`${matchId}:${period}`]?.minimum_next_bid ?? basePrices[period];

  const addToBasket = (match: MatchData, period: BidPeriod) => {
    const key = `${match.id}:${period}`;
    const status = auctionStatus[key];
    if (status?.bidding_closed) {
      onNotice('error', `Bidding has closed for ${PERIOD_LABEL[period]} on this match.`);
      return;
    }
    const raw = amountInputs[key];
    const amount = Number(raw);
    const min = minimumFor(match.id, period);
    if (!amount || amount < min) {
      const reason = status && status.current_highest > 0
        ? `must outbid the current highest bid — at least KES ${min.toLocaleString()}`
        : `must be at least KES ${min.toLocaleString()}`;
      onNotice('error', `Bid for ${PERIOD_LABEL[period]} ${reason}.`);
      return;
    }
    if (basket.some(b => b.key === key)) {
      onNotice('error', 'You already added a bid for this match and period.');
      return;
    }
    setBasket(prev => [...prev, {
      key, match_id: match.id, period, amount,
      matchLabel: `${match.homeTeam?.name ?? '—'} vs ${match.awayTeam?.name ?? '—'}`,
    }]);
    setAmountInputs(prev => ({ ...prev, [key]: '' }));
  };

  const removeFromBasket = (key: string) => setBasket(prev => prev.filter(b => b.key !== key));

  const total = basket.reduce((s, b) => s + b.amount, 0);

  const handleFilePick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { onNotice('error', 'Bid-slot ads must be images.'); return; }
    setFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { onNotice('error', 'Please enter a title for this bid campaign.'); return; }
    if (!file) { onNotice('error', 'Please upload an image for this bid campaign.'); return; }
    if (!isValidKenyanPhone(phone)) { onNotice('error', 'Enter a valid M-Pesa phone (e.g., 0712 345 678).'); return; }
    if (basket.length === 0) { onNotice('error', 'Add at least one match bid first.'); return; }

    setSubmitting(true);
    try {
      const result = await createBidCampaign({
        title: title.trim(),
        file,
        bids: basket.map(({ match_id, period, amount }) => ({ match_id, period, amount })),
        details: { phone },
      });
      onNotice('success', `Bid campaign submitted for KES ${result.total.toLocaleString()}. Check your phone for the M-Pesa prompt.`);
      setBasket([]); setTitle(''); setFile(null); setImagePreview(null);

      setAwaitingPayment(true);
      try {
        const settled = await pollPaymentUntilSettled(result.payment_id);
        onNotice(
          settled.status === 'completed' ? 'success' : 'error',
          settled.status === 'completed'
            ? 'Payment confirmed — your bids are now competing for their slots.'
            : 'Payment was not completed. Your bids will not be entered.',
        );
      } catch {
        onNotice('error', 'Still waiting on M-Pesa confirmation — check My Bids shortly.');
      } finally {
        setAwaitingPayment(false);
        refreshMyBids();
      }
    } catch (e: any) {
      onNotice('error', e.message || 'Could not submit bid campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: MatchBidData['status']) => {
    const cfg: Record<MatchBidData['status'], string> = {
      pending_payment: 'bg-yellow-500/15 text-yellow-500',
      pending:         'bg-[var(--blue)]/15 text-[var(--blue)]',
      won:             'bg-[var(--green)]/15 text-[var(--green)]',
      lost:            'bg-[var(--red)]/15 text-[var(--red)]',
      refunded:        'bg-[var(--surface3)] text-[var(--muted)]',
    };
    const label: Record<MatchBidData['status'], string> = {
      pending_payment: 'Awaiting payment', pending: 'Awaiting result', won: 'Won slot', lost: 'Outbid', refunded: 'Refunded',
    };
    return <span className={['rounded-md px-2 py-1 text-[11px] font-semibold', cfg[status]].join(' ')}>{label[status]}</span>;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <section className="broadcast-card rounded-lg p-4">
          <SectionTitle icon={<Gavel size={19} />} title="Bid on match ad slots" tone="blue" />
          <p className="mb-3 text-xs text-[var(--muted)]">
            5 ad slots exist per period (before match, half-time, full-time) on each match below. Highest bids win. Matches are ranked by viewer traction.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--green)]/60" />
            <div className="relative">
              <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input value={stadiumFilter} onChange={e => setStadiumFilter(e.target.value)} placeholder="Stadium / ground"
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--field-bg)] pl-8 pr-3 text-sm text-[var(--text)] outline-none focus:border-[var(--green)]/60" />
            </div>
            <select value={clubFilter} onChange={e => setClubFilter(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--green)]/60">
              <option value="">All clubs</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </section>

        {/* Matches */}
        {loadingMatches ? (
          <div className="broadcast-card rounded-lg p-10 text-center text-sm text-[var(--muted)]">Loading matches…</div>
        ) : displayedMatches.length === 0 ? (
          <div className="broadcast-card rounded-lg p-10 text-center text-sm text-[var(--muted)]">No matches match your filters.</div>
        ) : (
          displayedMatches.map((m, idx) => (
            <div key={m.id} className="broadcast-card rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--green)]">
                    <Trophy size={12} /> Rank #{idx + 1} by traction
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-[var(--text)]">
                    {m.homeTeam?.name ?? '—'} <span className="text-[var(--muted)]">vs</span> {m.awayTeam?.name ?? '—'}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">
                    {m.date}{m.time ? ` · ${m.time}` : ''}{m.stadium ? ` · ${m.stadium}` : ''}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(['before_match', 'halftime', 'fulltime'] as BidPeriod[]).map(period => {
                  const key = `${m.id}:${period}`;
                  const inBasket = basket.some(b => b.key === key);
                  const status = auctionStatus[key];
                  const minimum = status?.minimum_next_bid ?? basePrices[period];
                  const closed = !!status?.bidding_closed;
                  return (
                    <div key={period} className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[var(--muted)]">{PERIOD_LABEL[period]}</div>
                        {status?.deadline && !closed && (
                          <span className="text-[9px] font-semibold text-[var(--gold)]">{deadlineLabel(status.deadline)}</span>
                        )}
                      </div>
                      {status && status.current_highest > 0 ? (
                        <div className="mt-0.5 text-xs text-[var(--muted)]">
                          Highest: <span className="font-semibold text-[var(--text)]">KES {status.current_highest.toLocaleString()}</span>
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-[var(--muted)]">No bids yet · base KES {basePrices[period].toLocaleString()}</div>
                      )}
                      {closed ? (
                        <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
                          <Icon name="close" size={12} /> Bidding closed
                        </div>
                      ) : inBasket ? (
                        <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[var(--green)]">
                          <CheckCircle2 size={13} /> Added
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-1.5">
                          <input
                            type="number" min={minimum}
                            value={amountInputs[key] ?? ''}
                            onChange={e => setAmountInputs(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={`Min ${minimum}`}
                            className="h-8 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--field-bg)] px-2 text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/60"
                          />
                          <button onClick={() => addToBasket(m, period)}
                            className="h-8 shrink-0 rounded-md bg-[var(--green)] px-2 text-xs font-semibold text-black hover:bg-[var(--green)]">
                            Bid
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* My bids */}
        <section className="broadcast-card rounded-lg p-4">
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle icon={<Target size={19} />} title="My bids" tone="blue" />
            <button onClick={refreshMyBids} className="text-[var(--muted)] hover:text-[var(--text)]"><RefreshCw size={14} /></button>
          </div>
          {loadingMyBids ? (
            <div className="py-6 text-center text-sm text-[var(--muted)]">Loading…</div>
          ) : myBids.length === 0 ? (
            <div className="py-6 text-center text-sm text-[var(--muted)]">You haven't placed any bids yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {myBids.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">
                      {b.match?.homeTeam?.name ?? '—'} vs {b.match?.awayTeam?.name ?? '—'}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {PERIOD_LABEL[b.period]} · KES {b.amount.toLocaleString()}{b.slot_rank ? ` · Slot #${b.slot_rank}` : ''}
                    </div>
                  </div>
                  {statusBadge(b.status)}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Basket / checkout */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <section className="broadcast-card rounded-lg p-4">
          <SectionTitle icon={<Gavel size={19} />} title="Bid basket" tone="green" />
          {basket.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--muted)]">Add bids from the matches on the left.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {basket.map(b => (
                <div key={b.key} className="flex items-center justify-between rounded-md bg-[var(--surface2)] px-2.5 py-2">
                  <div>
                    <div className="text-xs font-medium text-[var(--text)]">{b.matchLabel}</div>
                    <div className="text-[11px] text-[var(--muted)]">{PERIOD_LABEL[b.period]} · KES {b.amount.toLocaleString()}</div>
                  </div>
                  <button onClick={() => removeFromBasket(b.key)} className="text-[var(--muted)] hover:text-[var(--red)]"><XIcon size={14} /></button>
                </div>
              ))}
              <div className="my-2 h-px bg-[var(--surface3)]" />
              <div className="flex items-center justify-between text-sm font-semibold text-[var(--text)]">
                <span>Total</span><span className="text-[var(--green)]">KES {total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </section>

        <section className="broadcast-card rounded-lg p-4">
          <SectionTitle icon={<UploadCloud size={19} />} title="Campaign creative" tone="blue" />
          <label className="mt-2 block text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--muted)]">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Derby Day Half-time Spot"
            className="mt-1.5 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--green)]/60" />

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--muted)]">Image (image only for bid slots) *</label>
          <label className="mt-1.5 flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--field-bg)] text-xs text-[var(--muted)] hover:border-[var(--green)]/50">
            {imagePreview ? <img src={imagePreview} alt="" className="h-full rounded-lg object-contain" /> : <span className="flex items-center gap-1.5"><ImageIcon size={15} /> Upload image</span>}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => handleFilePick(e.target.files?.[0])} />
          </label>

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--muted)]">M-Pesa phone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678"
            className="mt-1.5 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--green)]/60" />

          <button
            onClick={handleSubmit}
            disabled={submitting || awaitingPayment || basket.length === 0}
            className={['mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition',
              !submitting && !awaitingPayment && basket.length > 0 ? 'bg-[var(--green)] text-black hover:bg-[var(--green)]' : 'cursor-not-allowed bg-[var(--green)]/60 text-black/70'].join(' ')}
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              : awaitingPayment
              ? <><Loader2 size={16} className="animate-spin" /> Waiting for M-Pesa…</>
              : <><Send size={16} /> Submit {basket.length > 0 ? `& Pay KES ${total.toLocaleString()}` : 'bid campaign'}</>}
          </button>
        </section>
      </div>
    </div>
  );
}
