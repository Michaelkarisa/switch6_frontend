'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, Icon } from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import {
  UserPrefs, isAdvertiser, isAdmin, getPlans, subscribeToPlan,
  getCurrentSubscription, getSubscriptionHistory, cancelSubscription,
  getMyPayments, confirmAdPayment, failAdPayment, roleDashboard,
  pollPaymentUntilSettled,
  type PlanData, type SubscriptionData, type PaymentData, ROLES,
} from '@/lib/api';
import {
  Smartphone, CreditCard, X, Lock, CheckCircle2, Loader2,
  AlertCircle, Calendar, Clock, ShieldCheck,
  RefreshCw, ChevronRight, Zap,
  BoxSelect,
} from 'lucide-react';

type PayMethod = 'mpesa' | 'card';
type PayStep   = 'free' | 'method' | 'mpesa_input' | 'card_input' | 'processing' | 'success';
type PageTab   = 'plans' | 'subscription' | 'ad_payments';

// ── Formatters ─────────────────────────────────────────
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtKes = (n: number) => `KES ${n.toLocaleString()}`;
const daysLeft = (exp: string) =>
  Math.max(0, Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000));
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Kenyan Phone Validation ─────────────────────────────
const isValidKenyanPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return /^254[0-9]{9}$/.test(cleaned) || /^0[79][0-9]{8}$/.test(cleaned);
};

// ── Skeletons ───────────────────────────────────────────
function PlansSkeleton() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="h-[220px] rounded-lg animate-pulse bg-[color:var(--surface2)]" />
      ))}
    </div>
  );
}
function RowsSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-lg animate-pulse bg-[color:var(--surface2)]" />)}
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────
export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh w-full flex items-center justify-center bg-[var(--app-bg)]">
        <Loader2 size={32} className="animate-spin text-[var(--green)]" aria-label="Loading payment page" />
      </div>
    }>
      <PaymentPageInner />
    </Suspense>
  );
}

const qualityPrice: Record<number,number> = {
  480: 0,
  720: 100,
  1080: 200,
  1440: 300,
  2160: 400,
}
 
// ── Inner Component ─────────────────────────────────────
function PaymentPageInner() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADVERTISER, ROLES.ADMIN, ROLES.SUPERADMIN]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const advertiserOnly = isAdvertiser() && !isAdmin();
  const [tab, setTab] = useState<PageTab>(advertiserOnly ? 'ad_payments' : 'plans');

  const [plans, setPlans] = useState<PlanData[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState('pro');
  const [selectedQuality, setSelectedQuality] = useState<number>(480);
  const [currentSub, setCurrentSub] = useState<SubscriptionData | null>(null);
  const [subHistory, setSubHistory] = useState<SubscriptionData[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [adPayments, setAdPayments] = useState<PaymentData[]>([]);
  const [adPaymentsLoading, setAdPaymentsLoading] = useState(false);
  const [adPayPage, setAdPayPage] = useState(1);
  const AD_PAY_PAGE_SIZE = 10;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>('method');
  const [payMethod, setPayMethod] = useState<PayMethod>('mpesa');
  const [processing, setProcessing] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaError, setMpesaError] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardError, setCardError] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelDialogRef = useRef<HTMLDivElement>(null);

  const selectedPlan = plans.find(p => p.slug === selectedSlug) ?? plans[0];

  // ── Data Loaders ──────────────────────────────────────
  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const data = await getPlans();
      setPlans(data);
      const qs = searchParams?.get('plan');
      if (qs && data.find(p => p.slug === qs)) setSelectedSlug(qs);
      else if (data.length) setSelectedSlug(data.find(p => p.most_popular)?.slug ?? data[0].slug);
    } catch (err: any) {
      console.error('Failed to load plans:', err);
      setDialogError('Unable to load plans. Please retry.');
    } finally {
      setPlansLoading(false);
    }
  }, [searchParams]);

  const loadSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const [cur, hist] = await Promise.all([getCurrentSubscription(), getSubscriptionHistory()]);
      setCurrentSub(cur);
      setSubHistory(hist);
    } catch (err: any) {
      console.error('Failed to load subscription:', err);
    } finally {
      setSubLoading(false);
    }
  }, []);

  const loadAdPayments = useCallback(async () => {
    setAdPaymentsLoading(true);
    try {
      const response = await getMyPayments();
      setAdPayments(response);
     // console.log("MMMM:",response);
    } catch (err: any) {
      console.error('Failed to load ad payments:', err);
    } finally {
      setAdPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = UserPrefs.get();
    if (!user) { router.replace('/login'); return; }
    console.log('plans quality price', qualityPrice[selectedQuality]);
    if (!advertiserOnly) { loadPlans(); loadSubscription(); }
    loadAdPayments();
  }, [loadPlans, loadSubscription, loadAdPayments, router, advertiserOnly]);

  // ── Modal Focus Management ────────────────────────────
  useEffect(() => {
    if (dialogOpen && dialogRef.current) {
      const focusable = dialogRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, [dialogOpen, payStep]);

  // ── Dialog Handlers ───────────────────────────────────
  const openDialog = () => {
    if (!selectedPlan) return;
    setDialogError('');
    setMpesaPhone(''); setMpesaError('');
    setCardName(''); setCardNum(''); setCardExp(''); setCardCvc(''); setCardError('');
    setProcessing(false);
    setPayStep(selectedPlan.price === 0 ? 'free' : 'method');
    setDialogOpen(true);
  };

  const openCancelDialog = (subId: string) => { setPendingCancelId(subId); setCancelDialogOpen(true); };
  const closeCancelDialog = () => { setCancelDialogOpen(false); setPendingCancelId(null); };

  const confirmCancelSubscription = async () => {
    if (!pendingCancelId) return;
    closeCancelDialog();
    setCancellingId(pendingCancelId);
    try {
      await cancelSubscription(pendingCancelId);
      await loadSubscription();
    } catch (err: any) {
      setDialogError(err.message || 'Cancellation failed. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const finishPayment = async (txCode: string) => {
    const pendingAdPay = adPayments.find(p => p.status === 'pending');
   // if (pendingAdPay) await confirmAdPayment(pendingAdPay.id, txCode);
    await Promise.all([loadSubscription(), loadAdPayments()]);
    setPayStep('success');
  };

  const handleMpesaPay = async () => {
    if (!isValidKenyanPhone(mpesaPhone)) {
      setMpesaError('Enter a valid Kenyan phone (e.g., 0712 345 678 or 254712345678).');
      return;
    }
    setMpesaError(''); setDialogError(''); setProcessing(true); setPayStep('processing');
    try {
      const paymentDetails={
        phone:mpesaPhone
      }
      const subscription = await subscribeToPlan(selectedPlan.id,selectedQuality,paymentDetails,"mpesa");

      if (!subscription.payment_id) {
        throw new Error('Could not start the payment. Please try again.');
      }

      // Poll the real payment status (driven by the M-Pesa callback) instead
      // of assuming success — the customer might cancel or fail the STK
      // prompt on their phone.
      const settled = await pollPaymentUntilSettled(subscription.payment_id);

      if (settled.status === 'completed') {
        await finishPayment(settled.transaction_code ?? `MPESA${Date.now()}`);
      } else {
        throw new Error('Payment was not completed. Please check your phone and try again.');
      }
    } catch (e: any) {
      console.error('M-Pesa payment error:', e);
      setDialogError(e.message || 'Payment failed. Check your M-Pesa prompts and retry.');
      setPayStep('mpesa_input');
    } finally { setProcessing(false); }
  };

  const handleCardPay = async () => {
    if (!cardName.trim())                       { setCardError('Enter cardholder name.'); return; }
    if (cardNum.replace(/\s/g, '').length < 16) { setCardError('Enter a valid 16-digit card number.'); return; }
    if (!cardExp.match(/^\d{2}\/\d{2}$/))       { setCardError('Enter expiry as MM/YY.'); return; }
    if (cardCvc.length < 3)                     { setCardError('Enter a valid CVV.'); return; }
    setCardError(''); setDialogError(''); setProcessing(true); setPayStep('processing');
    try {
       const paymentDetails={
        card_name:cardName,
        card_number: cardNum,
        card_expiry: cardExp,
        card_cvc: cardCvc
      }
     const response = await subscribeToPlan(selectedPlan.id,selectedQuality,paymentDetails,"card");
      console.log('repsonse: ', response);
      await delay(2800);
     // await finishPayment(`CARD${Date.now()}`);
    } catch (e: any) {
      console.error('Card payment error:', e);
      setDialogError(e.message || 'Payment failed. Please verify your card details.');
      setPayStep('card_input');
    } finally { setProcessing(false); }
  };


  const handleConfirmAdPay = async (payment: PaymentData) => {
    const code = prompt('Enter M-Pesa transaction code:');
    if (!code?.trim()) return;
    try {
      await confirmAdPayment(payment.id, code.trim());
      await loadAdPayments();
    } catch (e: any) {
      console.error('Ad payment confirmation error:', e);
      alert(e.message || 'Confirmation failed. Ensure the code is correct.');
    }
  };

  const handleFailAdPay = async (payment: PaymentData) => {
    try {
      await failAdPayment(payment.id, 'Cancelled by user');
      await loadAdPayments();
    } catch (e: any) {
      console.error('Ad payment cancellation error:', e);
    }
  };

  // ── Input Formatters ──────────────────────────────────
  const formatCardNum = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExp = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  // ── Pagination ────────────────────────────────────────
  const adPayTotalPages = Math.max(1, Math.ceil(adPayments.length / AD_PAY_PAGE_SIZE));
  const paginatedAdPays = adPayments.slice(
    (adPayPage - 1) * AD_PAY_PAGE_SIZE,
    adPayPage * AD_PAY_PAGE_SIZE
  );

  // ── Role-Based Tabs ───────────────────────────────────
  const availableTabs = [
    !advertiserOnly && { key: 'plans' as PageTab,        label: 'Plans',        icon: <Zap size={14} aria-hidden="true" /> },
    !advertiserOnly && { key: 'subscription' as PageTab, label: 'Subscription', icon: <ShieldCheck size={14} aria-hidden="true" /> },
    { key: 'ad_payments' as PageTab, label: 'Payments', icon: <CreditCard size={14} aria-hidden="true" /> },
  ].filter(Boolean) as { key: PageTab; label: string; icon: React.ReactNode }[];

  // ── Render ────────────────────────────────────────────
  return (
    <PageShell title="Plans & Billing">
      <div className="fluid-pad flex flex-col gap-4 pb-10 sm:gap-6" style={{ maxWidth: 940 }}>

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[28px]">
              {advertiserOnly ? 'Ad Payments' : 'Plans & Billing'}
            </h1>
            <p className="text-[14px] text-[color:var(--muted)] mt-1">
              {advertiserOnly
                ? 'Track and manage your campaign payments.'
                : 'Manage your subscription and advertisement payments.'}
            </p>
          </div>
          {currentSub && !advertiserOnly && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/[.07] px-3 py-2" role="status" aria-live="polite">
              <ShieldCheck size={15} className="text-green-400" aria-hidden="true" />
              <span className="text-sm font-semibold text-green-400">{currentSub.plan?.name ?? 'Active'} plan</span>
              <span className="text-xs text-[color:var(--muted)]">· {daysLeft(currentSub.expires_at) || 0}d left</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-1 w-fit" role="tablist" aria-label="Payment sections">
          {availableTabs.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={[
                'flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4',
                tab === t.key
                  ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
                  : 'text-[var(--muted)] hover:text-[var(--text)]',
              ].join(' ')}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Plans Tab ── */}
        {tab === 'plans' && !advertiserOnly && (
          <div id="panel-plans" role="tabpanel" aria-labelledby="plans-tab">
            {plansLoading ? <PlansSkeleton /> : plans.length === 0 ? (
              <div className="broadcast-card rounded-lg p-10 text-center text-[color:var(--muted)]">
                <p className="font-semibold text-[color:var(--text)] mb-1">Plans unavailable</p>
                <p className="text-sm mb-4">Could not reach the server.</p>
                <button onClick={loadPlans} className="inline-flex items-center gap-1.5 text-sm text-green-400 hover:underline">
                  <RefreshCw size={13} aria-hidden="true" /> Retry
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
                  {plans.map(p => {
                    const active    = selectedSlug === p.slug;
                    const isCurrent = currentSub?.plan?.slug === p.slug;
                    const price = (qualityPrice[selectedQuality] ?? 0) + p.price;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedSlug(p.slug)}
                        aria-pressed={active}
                        className={[
                          'relative rounded-lg p-5 cursor-pointer text-left transition-all',
                          active
                            ? 'border border-green-500/45 bg-green-500/[.06] shadow-[0_0_0_3px_rgba(10,143,82,.08)]'
                            : 'border border-[color:var(--border)] bg-[color:var(--card-bg)] hover:border-green-500/25',
                        ].join(' ')}
                      >
                        {p.most_popular && (
                          <div className="absolute top-[-1px] left-1/2 -translate-x-1/2 bg-[color:var(--green)] text-white text-[10px] font-medium px-2.5 py-[3px] rounded-b-md tracking-[.04em]">
                            Most popular
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/15 border border-green-500/30 rounded-full px-2 py-0.5">
                            <CheckCircle2 size={10} className="text-green-400" aria-hidden="true" />
                            <span className="text-[9px] font-bold text-green-400 uppercase tracking-[.04em]">Active</span>
                          </div>
                        )}
                        {/* Fixed-height spacer so ALL card titles align horizontally */}
                        <div className="h-5" />
                        <div>
                          <div className="text-[11px] font-medium text-[color:var(--muted)] tracking-[.04em] uppercase mb-1.5">{p.name}</div>
                          <div className="flex items-baseline gap-1">
                            <span
                              className="text-[34px] font-semibold tracking-[-0.04em] font-mono"
                              style={{ color: active ? 'var(--green)' : 'var(--text)' }}
                            >
                              {price === 0 ? 'Free' : fmtKes(price)}
                            </span>
                            {price > 0 && (
                              <span className="text-[13px] text-[color:var(--muted)]">/ {p.duration_days}d</span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-[12px] text-[color:var(--muted)] mt-1 leading-snug">{p.description}</p>
                          )}
                        </div>
                        <div className="h-px bg-[color:var(--border)] my-3.5" />
                        <ul className="list-none flex flex-col gap-2">
                          <PlanFeature text={p.max_matches !== null ? `${p.max_matches} matches / cycle` : 'Unlimited matches'} />
                          <PlanFeature text={p.max_cameras !== null ? `${p.max_cameras} cameras` : 'Unlimited cameras'} />
                          {p.ads_enabled       && <PlanFeature text="Ad injection pipeline" />}
                          {p.analytics_enabled && <PlanFeature text="Analytics dashboard" />}
                        </ul>
                         <ul className="list-none flex flex-row gap-2 mt-4">
                          {p.quality?.map(q=>{
                            return (
                              <CheckBox q={q} selected={selectedQuality==q} onClick={(q)=>setSelectedQuality(q)}/>
                            );
                          })}
                        </ul>
                          <div className="flex items-center gap-4 flex-wrap mt-4">
                  <button
                    onClick={openDialog}
                    disabled={currentSub?.plan_id==p.id}
                    className={currentSub?.plan_id==p.id?"w-full h-11 px-4 rounded-lg border-none bg-[color:var(--faint)] text-white text-[14px] font-medium cursor-pointer inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity sm:w-auto sm:px-6":"w-full h-11 px-4 rounded-lg border-none bg-[color:var(--green)] text-white text-[14px] font-medium cursor-pointer inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity sm:w-auto sm:px-6"}
                  >
                    <Icon name="check" size={16} aria-hidden="true" />
                    {p.price === 0
                      ? `Activate ${p.name}`
                      : `Subscribe — ${fmtKes(price ?? 0)}`}
                  </button>
                  </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 flex-wrap mt-4">
                  <div className="flex items-center gap-1.5 text-[12px] text-[color:var(--faint)]">
                    <Lock size={11} aria-hidden="true" /> Secure checkout · Cancel anytime
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Subscription Tab ── */}
        {tab === 'subscription' && !advertiserOnly && (
          <div id="panel-subscription" role="tabpanel" aria-labelledby="subscription-tab" className="grid gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[color:var(--text)]">Your Subscription</h2>
              <button
                onClick={loadSubscription}
                disabled={subLoading}
                className="flex items-center gap-1.5 text-xs text-[color:var(--muted)] hover:text-[color:var(--text)] transition disabled:opacity-50"
                aria-label="Refresh subscription data"
              >
                <RefreshCw size={12} className={subLoading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
              </button>
            </div>
            {subLoading ? <RowsSkeleton /> : !currentSub ? (
              <div className="broadcast-card rounded-lg p-8 text-center text-[color:var(--muted)]">
                <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="font-semibold text-[color:var(--text)] mb-1">No active subscription</p>
                <p className="text-sm mb-4">Choose a plan to unlock broadcast features.</p>
                <button
                  onClick={() => setTab('plans')}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[color:var(--green)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  View plans <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="broadcast-card rounded-lg p-5 grid gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)] mb-1">Current plan</div>
                    <div className="text-[26px] font-semibold text-[color:var(--text)] tracking-tight">{currentSub.plan?.name ?? '—'}</div>
                  </div>
                  <SubStatusBadge status={currentSub.status || 'None'} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SubMetric icon={<Calendar size={14} aria-hidden="true" />} label="Started"   value={fmtDate(currentSub.starts_at)} />
                  <SubMetric icon={<Clock size={14} aria-hidden="true" />}    label="Expires"   value={fmtDate(currentSub.expires_at)} />
                  <SubMetric
                    icon={<Zap size={14} aria-hidden="true" />}
                    label="Days left"
                    value={`${daysLeft(currentSub.expires_at) || 0}d`}
                    tone={daysLeft(currentSub.expires_at) <= 5 ? 'red' : 'green'}
                  />
                  <SubMetric icon={<CreditCard size={14} aria-hidden="true" />} label="Price" value={fmtKes(currentSub.plan?.price ?? 0)} />
                </div>
                <div className="flex gap-3 flex-wrap pt-1">
                  <button
                    onClick={() => setTab('plans')}
                    className="h-10 px-5 rounded-lg bg-[color:var(--green)] text-white text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <RefreshCw size={13} aria-hidden="true" /> Renew / Upgrade
                  </button>
                  {currentSub.status === 'active' && (
                    <button
                      onClick={() => openCancelDialog(currentSub.id)}
                      disabled={cancellingId === currentSub.id}
                      className="h-10 px-5 rounded-lg border border-red-500/30 bg-red-500/[.07] text-red-400 text-sm font-medium inline-flex items-center gap-2 hover:bg-red-500/15 transition disabled:opacity-50"
                    >
                      {cancellingId === currentSub.id
                        ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                        : <X size={13} aria-hidden="true" />}
                      Cancel subscription
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Ad Payments Tab ── */}
        {tab === 'ad_payments' && (
          <div id="panel-ad_payments" role="tabpanel" aria-labelledby="ad_payments-tab" className="grid gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[color:var(--text)]">Payments</h2>
              <button
                onClick={loadAdPayments}
                disabled={adPaymentsLoading}
                className="flex items-center gap-1.5 text-xs text-[color:var(--muted)] hover:text-[color:var(--text)] transition disabled:opacity-50"
                aria-label="Refresh ad payments"
              >
                <RefreshCw size={12} className={adPaymentsLoading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
              </button>
            </div>
            {adPaymentsLoading ? <RowsSkeleton /> : adPayments.length === 0 ? (
              <div className="broadcast-card rounded-lg p-8 text-center text-[color:var(--muted)]">
                <CreditCard size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="font-semibold text-[color:var(--text)] mb-1">No payments yet</p>
                <p className="text-sm">Submit an advertisement campaign or subscribe a plan to create a payment record.</p>
              </div>
            ) : (
              <div className="broadcast-card rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[color:var(--border)] text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">
                        {['Amount', 'Method', 'Type','Reference', 'Status', 'Date', 'Actions'].map(h => (
                          <th key={h} scope="col" className="px-4 py-3 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAdPays.map(p => (
                        <tr key={p.id} className="border-b border-[color:var(--border)] last:border-none hover:bg-[color:var(--surface2)] transition-colors">
                          <td className="px-4 py-3 font-semibold text-[color:var(--text)]">{fmtKes(p.amount)}</td>
                          <td className="px-4 py-3 text-[color:var(--muted)] capitalize">{p.payment_method.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-[color:var(--muted)] capitalize">{p.type.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-[color:var(--muted)] font-mono text-xs">{p.transaction_code ?? p.reference ?? '—'}</td>
                          <td className="px-4 py-3"><AdPayStatusBadge status={p.status} /></td>
                          <td className="px-4 py-3 text-[color:var(--muted)]">{p.paid_at ? fmtDate(p.paid_at) : '—'}</td>
                          <td className="px-4 py-3">
                            {p.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleConfirmAdPay(p)}
                                  className="h-7 px-2.5 rounded border border-green-500/30 bg-green-500/[.08] text-green-400 text-xs font-semibold hover:bg-green-500/20 transition"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleFailAdPay(p)}
                                  className="h-7 px-2.5 rounded border border-red-500/30 bg-red-500/[.08] text-red-400 text-xs font-semibold hover:bg-red-500/20 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {adPayTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--border)]">
                    <span className="text-[12px] text-[color:var(--muted)]">
                      Page {adPayPage} of {adPayTotalPages} · {adPayments.length} payments
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAdPayPage(p => Math.max(1, p - 1))}
                        disabled={adPayPage <= 1}
                        className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => setAdPayPage(p => Math.min(adPayTotalPages, p + 1))}
                        disabled={adPayPage >= adPayTotalPages}
                        className="px-3 h-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[12px] cursor-pointer disabled:opacity-40"
                        aria-label="Next page"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Payment Dialog ── */}
      {dialogOpen && selectedPlan && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-dialog-title"
          ref={dialogRef}
        >
          <div className="bg-[color:var(--surface)] rounded-xl w-full max-w-[440px] mx-4 border border-[color:var(--border)] shadow-[var(--shadow-xl)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)]">
              <div id="payment-dialog-title" className="text-[15px] font-medium text-[color:var(--text)]">
                {payStep === 'success'
                  ? 'Payment confirmed'
                  : `${selectedPlan.name}${selectedPlan.price > 0 ? ` · ${fmtKes(selectedPlan.price+(qualityPrice[selectedQuality] ?? 0))}` : ' · Free'}`}
              </div>
              {!processing && (
                <button
                  onClick={() => setDialogOpen(false)}
                  className="border-none bg-transparent cursor-pointer text-[color:var(--muted)] grid place-items-center w-[30px] h-[30px] rounded-md hover:bg-[color:var(--surface2)] transition-colors"
                  aria-label="Close payment dialog"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="p-5">
              {dialogError && (
                <div className="flex items-center gap-2 mb-4 rounded-lg border border-red-500/30 bg-red-500/[.08] px-3 py-2.5 text-sm text-red-400" role="alert">
                  <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
                  {dialogError}
                </div>
              )}

              {payStep === 'method' && (
                <div className="flex flex-col gap-2.5">
                  <MethodButton
                    icon={<Smartphone size={20} aria-hidden="true" />}
                    label="M-Pesa"
                    sub="Pay via mobile money"
                    active={payMethod === 'mpesa'}
                    onClick={() => { setPayMethod('mpesa'); setPayStep('mpesa_input'); }}
                  />
                  <MethodButton
                    icon={<CreditCard size={20} aria-hidden="true" />}
                    label="Bank card"
                    sub="Coming soon — use M-Pesa for now"
                    active={false}
                    disabled
                    onClick={() => {}}
                  />
                </div>
              )}

              {payStep === 'mpesa_input' && (
                <div className="flex flex-col gap-3.5">
                  <div className="px-3.5 py-3 rounded-lg bg-green-500/[.07] border border-green-500/20 text-[13px] text-[color:var(--text)]">
                    An STK push will be sent. Enter your M-Pesa PIN to complete.
                  </div>
                  <div>
                    <label htmlFor="mpesa-phone" className="block text-[12px] font-medium text-[color:var(--muted)] mb-1.5">
                      Phone number
                    </label>
                    <input
                      id="mpesa-phone"
                      value={mpesaPhone}
                      onChange={e => setMpesaPhone(e.target.value)}
                      placeholder="e.g. 0712 345 678"
                      type="tel"
                      inputMode="tel"
                      pattern="[0-9\s]*"
                      className={`w-full h-11 px-3 rounded-lg border bg-[color:var(--field-bg)] text-[color:var(--text)] text-[15px] outline-none ${mpesaError ? 'border-red-500/50' : 'border-[color:var(--border)]'}`}
                    />
                    {mpesaError && (
                      <div className="mt-1 text-[12px] text-[color:var(--red)]" role="alert">{mpesaError}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPayStep('method')}
                      className="flex-1 h-[42px] rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-[14px] cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleMpesaPay}
                      className="flex-[2] h-[42px] rounded-lg border-none bg-[color:var(--green)] text-white text-[14px] font-medium cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Smartphone size={15} aria-hidden="true" /> Send STK push · {fmtKes(selectedPlan.price+(qualityPrice[selectedQuality] ?? 0))}
                    </button>
                  </div>
                </div>
              )}

              {payStep === 'card_input' && (
                <div className="flex flex-col gap-3">
                  <CardField label="Cardholder name" value={cardName} onChange={setCardName}                               placeholder="Full name" />
                  <CardField label="Card number"     value={cardNum}  onChange={v => setCardNum(formatCardNum(v))}         placeholder="1234 5678 9012 3456" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <CardField label="Expiry" value={cardExp} onChange={v => setCardExp(formatExp(v))}                     placeholder="MM/YY" />
                    <CardField label="CVV"    value={cardCvc} onChange={v => setCardCvc(v.replace(/\D/g, '').slice(0, 4))} placeholder="123" />
                  </div>
                  {cardError && <div className="text-[12px] text-[color:var(--red)]" role="alert">{cardError}</div>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPayStep('method')}
                      className="flex-1 h-[42px] rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-[14px] cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCardPay}
                      className="flex-[2] h-[42px] rounded-lg border-none bg-[color:var(--green)] text-white text-[14px] font-medium cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock size={14} aria-hidden="true" /> Pay {fmtKes(selectedPlan.price+(qualityPrice[selectedQuality] ?? 0))}
                    </button>
                  </div>
                </div>
              )}

              {payStep === 'processing' && (
                <div className="text-center py-6">
                  <Loader2 size={44} color="var(--green)" className="mx-auto mb-3.5 animate-spin" aria-hidden="true" />
                  <div className="text-[15px] font-medium text-[color:var(--text)] mb-1">
                    {payMethod === 'mpesa' ? 'Waiting for M-Pesa…' : 'Processing payment…'}
                  </div>
                </div>
              )}

              {payStep === 'success' && (
                <div className="text-center py-4">
                  <CheckCircle2 size={52} color="var(--green)" className="mx-auto mb-3.5" aria-hidden="true" />
                  <div className="text-[17px] font-semibold text-[color:var(--text)] mb-4">
                    {selectedPlan.name} plan activated.
                  </div>
                  <button
                    onClick={() => { setDialogOpen(false); router.push(roleDashboard()); }}
                    className="h-[42px] px-6 rounded-lg border-none bg-[color:var(--green)] text-white text-[14px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    Go to dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Dialog ── */}
      {cancelDialogOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          ref={cancelDialogRef}
        >
          <div className="bg-[color:var(--surface)] rounded-xl w-full max-w-[400px] mx-4 border border-[color:var(--border)] shadow-[var(--shadow-xl)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)]">
              <div id="cancel-dialog-title" className="text-[15px] font-medium text-[color:var(--text)]">
                Cancel subscription?
              </div>
              <button
                onClick={closeCancelDialog}
                className="border-none bg-transparent cursor-pointer text-[color:var(--muted)] grid place-items-center w-[30px] h-[30px] rounded-md hover:bg-[color:var(--surface2)] transition-colors"
                aria-label="Close cancel dialog"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-[14px] text-[color:var(--muted)] mb-5">
                Your plan stays active until it expires. You won&apos;t be charged again.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={closeCancelDialog}
                  className="flex-1 h-[42px] rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-[14px] cursor-pointer"
                >
                  Keep subscription
                </button>
                <button
                  onClick={confirmCancelSubscription}
                  disabled={cancellingId === pendingCancelId}
                  className="flex-[1.3] h-[42px] rounded-lg border-none bg-red-500 text-white text-[14px] font-medium cursor-pointer flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {cancellingId === pendingCancelId
                    ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    : 'Yes, cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ── Small Components ──────────────────────────────────────────
function PlanFeature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-1.5 text-[13px] text-[color:var(--text)] capitalize">
      <CheckCircle2 size={13} color="var(--green)" className="mt-px shrink-0" aria-hidden="true" />
      {text}
    </li>
  );
}

function CheckBox({ q,selected,onClick }:{q:number; selected?: boolean; onClick: (q:number) => void;}){
  return (
         <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <button type="button" onClick={() => onClick(q)}
                    className={`w-5 h-5 mt-px rounded-[5px] shrink-0 flex items-center justify-center border cursor-pointer transition-all duration-[180ms] font-sans ${selected ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border)] bg-[var(--field-bg)]'}`}>
                    {selected && <Icon name="check" size={11} className="text-white" />}
                  </button>
                  <span className="text-[13px] text-[var(--muted)] leading-[1.55]">
                    {q}p
                  </span>
                </label>
              </div>
  );
}
function SubMetric({ icon, label, value, tone }: {
  icon: React.ReactNode; label: string; value: string; tone?: 'green' | 'red';
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)] mb-1">
        {icon}{label}
      </div>
      <div className={`text-[15px] font-semibold ${tone === 'red' ? 'text-red-400' : tone === 'green' ? 'text-green-400' : 'text-[color:var(--text)]'}`}>
        {value}
      </div>
    </div>
  );
}

function SubStatusBadge({ status, small }: { status: string; small?: boolean }) {
  const cfg: Record<string, string> = {
    active:    'bg-green-500/10 text-green-400 border-green-500/30',
    expired:   'bg-red-500/10 text-red-400 border-red-500/30',
    cancelled: 'bg-[var(--surface2)] text-[var(--muted)] border-[var(--border)]',
    grace:     'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  };
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 font-semibold uppercase tracking-[.04em]',
        small ? 'text-[9px]' : 'text-[11px]',
        cfg[status] ?? cfg.expired,
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      {status}
    </span>
  );
}

function AdPayStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    pending:   'bg-yellow-400/10 text-yellow-400',
    completed: 'bg-green-500/10 text-green-400',
    failed:    'bg-red-500/10 text-red-400',
    refunded:  'bg-blue-500/10 text-blue-400',
  };
  return (
    <span className={[
      'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[.04em]',
      cfg[status] ?? 'bg-[var(--surface2)] text-[var(--muted)]',
    ].join(' ')}>
      {status}
    </span>
  );
}

function MethodButton({ icon, label, sub, active, onClick, disabled }: {
  icon: React.ReactNode; label: string; sub: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        'flex items-center gap-3.5 px-4 py-3.5 rounded-lg text-left w-full transition-all',
        disabled ? 'cursor-not-allowed opacity-50 border border-[color:var(--border)] bg-[color:var(--surface2)]' : 'cursor-pointer',
        !disabled && active
          ? 'border border-green-500/45 bg-green-500/[.07]'
          : !disabled ? 'border border-[color:var(--border)] bg-[color:var(--surface2)] hover:border-green-500/25' : '',
      ].join(' ')}
    >
      <div className={[
        'w-10 h-10 rounded-lg grid place-items-center shrink-0',
        active ? 'bg-green-500/[.12] text-[color:var(--green)]' : 'bg-[color:var(--surface3)] text-[color:var(--muted)]',
      ].join(' ')}>
        {icon}
      </div>
      <div>
        <div className="text-[14px] font-medium text-[color:var(--text)]">{label}</div>
        <div className="text-[12px] text-[color:var(--muted)] mt-px">{sub}</div>
      </div>
      {active && <CheckCircle2 size={16} color="var(--green)" className="ml-auto shrink-0" aria-hidden="true" />}
    </button>
  );
}

function CardField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[color:var(--muted)] mb-1.5">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[42px] px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--field-bg)] text-[color:var(--text)] text-[14px] outline-none focus:border-[color:var(--green)]/60 transition-colors placeholder:text-[color:var(--faint)]"
      />
    </div>
  );
}
