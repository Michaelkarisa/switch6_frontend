'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart3, ChevronRight, Clapperboard, Download,
  Gavel, HandCoins, Layers, Megaphone, Play, Radio, RadioTower, Share2,
  ShieldCheck, Signal, Smartphone, Users, Workflow, Wallet,
  MonitorPlay,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/components/ui';
import { UserPrefs, roleDashboard, BASE_URL } from '@/lib/api';

type Tone = 'green' | 'blue' | 'gold' | 'red';
const toneColor:  Record<Tone, string> = { green: 'var(--green)', blue: 'var(--blue)', gold: 'var(--gold)', red: 'var(--red)' };
const toneBg:     Record<Tone, string> = { green: 'rgba(10,143,82,.12)', blue: 'rgba(26,95,212,.12)', gold: 'rgba(143,101,0,.12)', red: 'rgba(192,41,29,.12)' };
const toneBorder: Record<Tone, string> = { green: 'rgba(10,143,82,.30)', blue: 'rgba(26,95,212,.30)', gold: 'rgba(143,101,0,.30)', red: 'rgba(192,41,29,.30)' };

const actions = [
  { icon: Radio,     title: 'Broadcaster', label: 'Matches, lineups & streams', href: '/register?role=broadcaster', tone: 'green' as Tone },
  { icon: Megaphone, title: 'Advertiser',  label: 'Campaigns & bid slots',      href: '/register?role=advertiser',  tone: 'gold'  as Tone },
];

const stats = [
  { value: '3',    label: 'Ad periods per match', icon: Clapperboard },
  { value: '5',    label: 'Bid slots per period',  icon: Gavel        },
  { value: '4',    label: 'Stream quality tiers',  icon: Layers       },
];

const broadcastFeatures = [
  { 
    icon: Smartphone, 
    title: 'Multi-Angle Phone Capture', 
    desc: 'Deploy multiple smartphones around the pitch to capture steady, immersive angles. Eliminates the need for heavy production hardware or a single operator trying to be everywhere at once.', 
    tone: 'green' as Tone 
  },
  { 
    icon: Workflow, 
    title: 'Real-Time Server-Side Switching', 
    desc: 'The server ingests all active smartphone streams simultaneously. The host director can seamlessly cut between camera angles in real-time, ensuring the best view of the action is always live.', 
    tone: 'blue' as Tone 
  },
  { 
    icon: Layers, 
    title: 'Hardware-Accelerated GStreamer Overlays', 
    desc: 'Custom broadcast widgets are composited directly into the video stream via GStreamer, generating a polished, low-latency HLS copy with zero client-side rendering lag for viewers.', 
    tone: 'gold' as Tone 
  },
  { 
    icon: MonitorPlay, 
    title: 'Live Match Graphics Package', 
    desc: 'A full broadcast-grade overlay suite baked into the stream: score and match clock with phase indicators (1ST, 2ND, HT, FT, ET), lineup formations mirroring your website, animated substitutions with jersey numbers, instant replay triggers, and sponsor ad slots.', 
    tone: 'green' as Tone 
  },
];

const features = [
  { icon: Smartphone,  title: 'Mobile broadcasting',   desc: 'Stream matches straight from a phone — no separate production hardware needed.',            metric: 'Broadcaster', tone: 'green' as Tone },
  { icon: Users,       title: 'Match & squad setup',   desc: 'Create fixtures, build formations, and manage starting lineups and substitutes.',            metric: 'Broadcaster', tone: 'blue'  as Tone },
  { icon: Share2,      title: 'Share lineups',         desc: 'Send a saved lineup to another broadcaster and import it straight into their match.',        metric: 'New',         tone: 'gold'  as Tone },
  { icon: Megaphone,   title: 'General campaigns',     desc: 'Advertisers upload an image or video ad and let it run across eligible matches.',             metric: 'Advertiser',  tone: 'blue'  as Tone },
  { icon: Gavel,       title: 'Bid for premium slots', desc: 'Bid for one of 5 ad slots before kickoff, at half-time, or full-time on high-traction matches.', metric: 'Advertiser', tone: 'red'   as Tone },
  { icon: HandCoins,   title: 'Broadcaster revenue share', desc: 'Broadcasters earn a share of the ad revenue their own matches generate.',                  metric: 'Payout',      tone: 'green' as Tone },
];

function IconBox({ icon: I, tone = 'green' }: { icon: LucideIcon; tone?: Tone }) {
  return (
    <div className="grid place-items-center rounded-lg shrink-0 w-10 h-10"
      style={{ color: toneColor[tone], border: `1px solid ${toneBorder[tone]}`, background: toneBg[tone] }}>
      <I size={20} strokeWidth={1.8} />
    </div>
  );
}

export default function WelcomePage() {
  const [ready, setReady] = useState(false);
  const [isAnyDownloading, setDownloading] = useState(false);
  const [downloadingArch, setArch] = useState<'arm64' | 'arm32' | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [authLabel, setAuthLabel] = useState('Sign in');
  const [authHref, setAuthHref] = useState('/login');
  
  const [activeStreams, setActiveStreams] = useState(42);

  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStreams(prev => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.max(35, prev + change);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const user = UserPrefs.get();
    if (user) {
      setAuthLabel('Dashboard');
      setAuthHref(roleDashboard());
    } else {
      setAuthLabel('Sign in');
      setAuthHref('/login');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const onDownload = async (arch: 'arm64' | 'arm32') => {
    setDownloading(true);
    setArch(arch);
    try {
      const fileName = arch === 'arm64' ? 'Switch6-arm64.apk' : 'Switch6-arm32.apk';
      const res = await fetch(`${BASE_URL}/download/${fileName}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setArch(null);
      setDownloading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="fixed inset-0 pointer-events-none z-0 bg-[color:var(--app-bg)]" />

      {/* Nav */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 backdrop-blur-lg h-[60px] border-b border-[color:var(--border)] bg-[color:var(--topbar-bg)] px-4 sm:h-[72px] sm:px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 no-underline">
          <div className="grid place-items-center rounded-lg shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 sm:w-[38px] sm:h-[38px]">
            <img src={'/ic_launcher.png'} alt="" />
          </div>
          <div>
            <strong className="block text-[16px] font-semibold tracking-tight text-[color:var(--text)] sm:text-[18px]">Switch6</strong>
            <span className="hidden text-[11px] font-normal text-[color:var(--muted)] sm:block">Broadcast Studio</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={authHref}
            className="inline-flex items-center justify-center rounded-lg no-underline text-[13px] font-medium h-8 px-3 bg-[color:var(--surface2)] text-[color:var(--text)] border border-[color:var(--border)] hover:border-[color:var(--green)]/40 transition-colors sm:h-[38px] sm:px-3.5">
            {authLabel}
          </Link>
          <Link href="/register"
            className="inline-flex items-center justify-center rounded-lg no-underline text-[13px] font-medium text-white h-8 px-3 bg-[color:var(--green)] hover:opacity-90 transition-opacity sm:h-[38px] sm:px-3.5">
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10">

        {/* ── Hero ── */}
        <section className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14 lg:px-12 lg:py-[clamp(28px,4vw,52px)]">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)] lg:items-center lg:gap-[clamp(24px,4vw,56px)]">

            {/* Left: copy */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 24 }} transition={{ duration: .5 }}>
              
              <div className="inline-flex items-center gap-2 rounded-full mb-4 text-[11px] font-medium tracking-[.06em] uppercase px-2.5 py-1.5 border border-green-500/25 bg-green-500/[.07] text-[color:var(--green)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                {activeStreams} active streams broadcasting right now
              </div>

              <h1 className="font-semibold leading-[.93] tracking-[-0.04em] text-[color:var(--text)] text-[clamp(36px,8vw,80px)]">
                Stream the match{' '}
                <em className="not-italic block" style={{ background: 'linear-gradient(90deg,var(--green),var(--blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  sell every ad slot
                </em>
              </h1>
              <p className="mt-4 font-normal leading-relaxed text-[color:var(--muted)] text-[clamp(14px,2vw,17px)] max-w-[640px]">
                The ultimate broadcasting tool for match operators. Set up fixtures, manage lineups, and stream multi-angle video straight from your phone — while earning a share of the ad revenue.
              </p>
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                <Link href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg no-underline text-[14px] font-medium text-white h-11 px-5 bg-[color:var(--green)] hover:opacity-90 transition-opacity">
                  <Play size={16} fill="currentColor" /> Start broadcasting
                </Link>
                <Link href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg no-underline text-[14px] font-normal h-11 px-5 bg-[color:var(--surface2)] text-[color:var(--text)] border border-[color:var(--border)] hover:border-[color:var(--green)]/40 transition-colors">
                  <ShieldCheck size={16} /> Enter studio
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-7 max-w-[480px]">
                {stats.map(({ value, label, icon: I }) => (
                  <div key={label} className="flex flex-col rounded-lg p-3 border border-[color:var(--border)] bg-[color:var(--card-bg)] sm:p-3.5">
                    <I size={15} color="var(--green)" className="mb-1.5 sm:mb-2" />
                    <strong className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-[color:var(--text)] font-mono sm:text-[28px]">{value}</strong>
                    <span className="text-[10px] font-normal mt-1 text-[color:var(--muted)] sm:text-xs sm:mt-1.5">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: control panel card */}
            <motion.aside
              initial={{ opacity: 0, scale: .98 }} animate={{ opacity: ready ? 1 : 0, scale: ready ? 1 : .98 }} transition={{ duration: .5, delay: .08 }}
              className="rounded-xl p-4 sm:p-5 border border-[color:var(--border)] bg-[color:var(--card-bg)] shadow-[var(--shadow-xl)]">
              <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-[color:var(--border)] sm:pb-4 sm:mb-4">
                <div>
                  <div className="text-[11px] font-medium tracking-[.05em] uppercase text-[color:var(--muted)]">Choose your role</div>
                  <h2 className="text-[18px] font-semibold leading-none mt-1 tracking-[-0.03em] text-[color:var(--text)] sm:text-[22px]">Get started</h2>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1.5 border border-green-500/22 bg-green-500/[.07] text-[color:var(--green)]">
                  <Signal size={13} /> Ready
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-2">
                {actions.map(({ icon: I, title, label, href, tone }) => (
                  <Link key={title} href={href} className="no-underline">
                    <motion.div whileHover={{ scale: 1.015, y: -2 }} transition={{ duration: .18 }}
                      className="flex items-center gap-3 rounded-lg p-3 cursor-pointer border border-[color:var(--border)] bg-[color:var(--surface2)]">
                      <div className="grid place-items-center rounded-lg shrink-0 w-10 h-10"
                        style={{ color: toneColor[tone], border: `1px solid ${toneBorder[tone]}`, background: toneBg[tone] }}>
                        <I size={20} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-medium tracking-[.05em] uppercase text-[color:var(--muted)]">{label}</span>
                        <strong className="block text-[14px] font-semibold leading-tight truncate text-[color:var(--text)] tracking-[-0.02em]">{title}</strong>
                      </div>
                      <ChevronRight size={16} color="var(--faint)" className="shrink-0" />
                    </motion.div>
                  </Link>
                ))}
              </div>

              <div className="rounded-lg p-3 sm:p-3.5 border border-[color:var(--border)] bg-[color:var(--surface2)]">
                <div className="flex items-center gap-2 mb-3 text-[14px] font-semibold text-[color:var(--text)] tracking-[-0.02em] sm:text-[16px]">
                  <Workflow size={15} color="var(--green)" /> How a campaign runs
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {[
                    { icon: Clapperboard, label: 'Create ad',   value: 'Image/video' },
                    { icon: Gavel,        label: 'Pick a lane', value: 'Bid or general' },
                    { icon: Wallet,       label: 'M-Pesa pay',  value: 'STK push' },
                    { icon: RadioTower,   label: 'Goes live',   value: 'On match' },
                  ].map(({ icon: I, label, value }) => (
                    <div key={label} className="flex flex-col rounded-lg p-2 border border-[color:var(--border)] bg-[color:var(--card-bg)] sm:p-2.5">
                      <I size={14} color="var(--green)" className="mb-1" />
                      <span className="text-[9px] font-medium tracking-[.04em] uppercase text-[color:var(--muted)] sm:text-[10px]">{label}</span>
                      <strong className="text-[10px] font-normal mt-0.5 text-[color:var(--text)] sm:text-xs">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          </div>
        </section>

        {/* ── Immersive Broadcasting Studio ── */}
        <section className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12 lg:px-12">
          <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:mb-5">
            <div>
              <div className="text-[11px] font-medium tracking-[.05em] uppercase mb-2 text-[color:var(--muted)]">Next-Gen Broadcasting</div>
              <h2 className="font-semibold leading-none tracking-[-0.03em] text-[color:var(--text)] text-[clamp(22px,3vw,34px)]">Immersive Multi-Angle Studio</h2>
            </div>
            <p className="text-sm font-normal leading-relaxed text-[color:var(--muted)] max-w-[520px]">
              Transform multiple smartphones into a professional broadcast setup. Switch feeds in real-time and deliver a polished stream with baked-in, TV-grade overlays.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            {broadcastFeatures.map(({ icon: I, title, desc, tone }) => (
              <motion.article key={title} whileHover={{ scale: 1.015, y: -2 }} transition={{ duration: .18 }}
                className="rounded-xl p-4 sm:p-5 flex flex-col border border-[color:var(--border)] bg-[color:var(--card-bg)] shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-2.5 mb-3 sm:mb-4">
                  <IconBox icon={I} tone={tone} />
                </div>
                <h3 className="text-[16px] font-semibold leading-tight mb-2 text-[color:var(--text)] tracking-[-0.02em] sm:text-[18px]">{title}</h3>
                <p className="text-[13px] font-normal leading-relaxed text-[color:var(--muted)]">{desc}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12 lg:px-12">
          <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:mb-5">
            <div>
              <div className="text-[11px] font-medium tracking-[.05em] uppercase mb-2 text-[color:var(--muted)]">What's actually in the box</div>
              <h2 className="font-semibold leading-none tracking-[-0.03em] text-[color:var(--text)] text-[clamp(22px,3vw,34px)]">Built for match day and ad day</h2>
            </div>
            <p className="text-sm font-normal leading-relaxed text-[color:var(--muted)] max-w-[520px]">
              Every card below maps to a real feature in the product — match operations for broadcasters, campaign tools for advertisers.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {features.map(({ icon: I, title, desc, metric, tone }) => (
              <motion.article key={title} whileHover={{ scale: 1.015, y: -2 }} transition={{ duration: .18 }}
                className="rounded-xl p-4 sm:p-5 flex flex-col border border-[color:var(--border)] bg-[color:var(--card-bg)] shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-2.5 mb-3 sm:mb-4">
                  <IconBox icon={I} tone={tone} />
                  <span className="inline-flex items-center rounded-full text-[10px] font-medium px-2 py-1 leading-none"
                    style={{ color: toneColor[tone], border: `1px solid ${toneBorder[tone]}`, background: toneBg[tone] }}>{metric}</span>
                </div>
                <h3 className="text-[16px] font-semibold leading-tight mb-2 text-[color:var(--text)] tracking-[-0.02em] sm:text-[18px]">{title}</h3>
                <p className="text-[13px] font-normal leading-relaxed text-[color:var(--muted)]">{desc}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ── Subscriptions ── */}
        <section className="mx-auto w-full max-w-[1280px] px-4 pb-10 sm:px-6 sm:pb-12 lg:px-12">
          <div className="rounded-xl p-4 sm:p-6 border border-[color:var(--border)] bg-[color:var(--card-bg)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
              <BarChart3 size={26} color="var(--green)" className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium tracking-[.05em] uppercase mb-1 text-[color:var(--muted)]">Plans</div>
                <h2 className="font-semibold leading-none tracking-[-0.03em] text-[color:var(--text)] text-[clamp(18px,2.5vw,28px)]">Pick a stream quality, pay by M-Pesa</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5 md:w-auto md:shrink-0">
                {[
                  { val: '480p', sub: 'Included' },
                  { val: '720p', sub: 'Add-on' },
                  { val: '1080p', sub: 'Add-on' },
                  { val: '4K', sub: 'Add-on' },
                ].map(({ val, sub }) => (
                  <div key={sub + val} className="rounded-lg p-2.5 sm:p-3 border border-[color:var(--border)] bg-[color:var(--surface2)]">
                    <strong className="block text-[17px] font-semibold leading-none tracking-[-0.02em] font-mono sm:text-[20px] text-[color:var(--green)]">{val}</strong>
                    <span className="block text-[10px] font-normal mt-1 text-[color:var(--muted)] sm:text-xs sm:mt-1.5">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA + Download ── */}
        <section className="mx-auto w-full max-w-[1280px] px-4 pb-16 sm:px-6 sm:pb-20 lg:px-12">
          <div className="rounded-xl border border-green-500/18 bg-[color:var(--card-bg)] overflow-hidden">
            <div className="flex flex-col md:flex-row">

              {/* Left: CTA */}
              <div className="flex-1 p-6 sm:p-8 lg:p-[clamp(24px,5vw,44px)] text-center">
                <RadioTower size={30} color="var(--green)" className="mx-auto mb-3 sm:mb-4 sm:w-[34px] sm:h-[34px]" />
                <h2 className="font-semibold leading-none mb-3 tracking-[-0.03em] text-[color:var(--text)] text-[clamp(20px,3vw,34px)]">Ready to open the control room?</h2>
                <p className="text-sm font-normal leading-relaxed mx-auto mb-6 text-[color:var(--muted)] max-w-[540px]">
                  Set up match operations, share lineups, run ad campaigns, and broadcast live — all in one place.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link href="/register"
                    className="inline-flex items-center justify-center rounded-lg no-underline text-[14px] font-medium text-white h-11 px-5 bg-[color:var(--green)] hover:opacity-90 transition-opacity">
                    Create broadcaster account
                  </Link>
                  <Link href="/terms"
                    className="inline-flex items-center justify-center rounded-lg no-underline text-[14px] font-normal h-11 px-5 bg-[color:var(--surface2)] text-[color:var(--text)] border border-[color:var(--border)] hover:border-[color:var(--green)]/40 transition-colors">
                    View terms
                  </Link>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t md:border-t-0 md:border-l border-[color:var(--border)]" />

              {/* Right: Download */}
              <div className="flex-1 p-6 sm:p-8 lg:p-[clamp(24px,5vw,44px)] text-center">
                <Download size={30} color="var(--green)" className="mx-auto mb-3 sm:mb-4 sm:w-[34px] sm:h-[34px]" />
                <h2 className="font-semibold leading-none mb-3 tracking-[-0.03em] text-[color:var(--text)] text-[clamp(20px,3vw,34px)]">Broadcasting from your phone?</h2>
                <p className="text-sm font-normal leading-relaxed mx-auto mb-6 text-[color:var(--muted)] max-w-[540px]">
                  The Switch6 app is a dedicated broadcasting tool for streaming matches from a smartphone. For the best picture, we recommend at least
                  4GB RAM, a Snapdragon or MediaTek chipset, and a rear camera capable of 720p@30fps or better.
                </p>
                <div className="relative mb-1 max-w-[260px] mx-auto" ref={menuRef}>
                  <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg text-white font-medium text-[13px] cursor-pointer border-none transition-all h-9 bg-[color:var(--green)] hover:opacity-90"
                  >
                    {isAnyDownloading ? <span className="spinner" /> : <Icon name="download" size={15} />}
                    {isAnyDownloading ? 'Downloading…' : 'Download broadcaster app'}
                  </button>

                  {open && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 max-h-[220px] flex flex-col overflow-hidden rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] shadow-[var(--shadow-xl)] z-[999] animate-[notif-drop-in_.22s_cubic-bezier(0.32,0,0.12,1)_both]">
                      <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-[color:var(--border)]">
                        <span className="text-sm font-medium text-[color:var(--text)]">Downloads</span>
                        <button
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-1 border-none bg-transparent cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
                        >
                          <Icon name="close" size={12} /> Close
                        </button>
                      </div>

                      <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-2">
                        <button
                          onClick={() => onDownload('arm64')}
                          disabled={isAnyDownloading}
                          className="w-full flex items-center justify-center gap-2 rounded-lg text-white font-medium text-[13px] cursor-pointer border-none transition-all h-9 bg-[color:var(--green)] disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90"
                        >
                          {downloadingArch === 'arm64' ? <span className="spinner" /> : <Icon name="phone" size={15} />}
                          Download ARM64 (most phones, 2018+)
                        </button>

                        <button
                          onClick={() => onDownload('arm32')}
                          disabled={isAnyDownloading}
                          className="w-full flex items-center justify-center gap-2 rounded-lg text-white font-medium text-[13px] cursor-pointer border-none transition-all h-9 bg-[color:var(--green)] disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90"
                        >
                          {downloadingArch === 'arm32' ? <span className="spinner" /> : <Icon name="phone" size={15} />}
                          Download ARM32 (older phones)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
