'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerUser, setRoleCookie, UserPrefs, roleDashboard, ROLES } from '@/lib/api';
import { Radio } from 'lucide-react';
import { Icon } from '@/components/ui';
import { useTheme } from '@/lib/ThemeContext';

// Advertiser and Broadcaster are self-serve.
// Admin is created only via the seeder — not shown here.
const ROLES_OPTIONS = [
  {
    key: ROLES.BROADCASTER,
    label: 'Broadcaster',
    icon: 'camera',
    desc: 'Manage leagues, matches & squads',
    features: ['Create & schedule matches', 'Tactical lineup builder', 'Live stream control', 'Ad campaign support'],
  },
  {
    key: ROLES.ADVERTISER,
    label: 'Advertiser',
    icon: 'advertisement',
    desc: 'Run sponsor campaigns',
    features: ['Upload video / image ads', 'Choose match slots & periods', 'Track impressions & reach', 'M-Pesa payment integration'],
  },
];

export default function RegisterPage() {
  const router   = useRouter();
  const { mode } = useTheme();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role,     setRole]     = useState<string>(ROLES.BROADCASTER);
  const [agreed,   setAgreed]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [errs,     setErrs]     = useState<Record<string, string>>({});
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    const user = UserPrefs.get();
    if (user) { router.replace(roleDashboard()); return; }
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, [router]);

  const checks = useMemo(() => [
    { label: '8+ chars',  pass: password.length >= 8   },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase', pass: /[a-z]/.test(password) },
    { label: 'Number',    pass: /\d/.test(password)    },
  ], [password]);

  const strengthScore = checks.filter(c => c.pass).length;
  const strengthLabel = strengthScore <= 1 ? 'Weak' : strengthScore <= 3 ? 'Fair' : 'Strong';
  const strengthColor = strengthScore <= 1 ? 'var(--red)' : strengthScore <= 3 ? 'var(--gold)' : 'var(--green)';
  const passwordOk    = strengthScore >= 3 && password.length >= 8;

  const isValid = useMemo(() =>
    name.trim().length >= 2 &&
    /^[\w-.]+@([\w-]+\.)+[\w]{2,}$/.test(email) &&
    phone.trim().length >= 7 &&
    passwordOk && agreed,
    [name, email, phone, passwordOk, agreed]
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())  e.name     = 'Full name is required';
    if (!email)        e.email    = 'Email is required';
    else if (!/^[\w-.]+@([\w-]+\.)+[\w]{2,}$/.test(email)) e.email = 'Enter a valid email';
    if (!phone.trim()) e.phone    = 'Phone number is required';
    if (!passwordOk)   e.password = 'Use 8+ chars with uppercase, lowercase and a number';
    if (!agreed)       e.agreed   = 'You must accept the terms to continue';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const user = await registerUser({ name, email, phone, password, role });
      UserPrefs.save(user);
      if (user.role) setRoleCookie(user.role);
      const dest = role === ROLES.ADVERTISER ? '/advertisement' : '/dashboard';
      setSuccess(`Workspace created. Opening ${role === ROLES.ADVERTISER ? 'campaign centre' : 'broadcast dashboard'}…`);
      router.push(dest);
    } catch (e: any) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const fieldCls = (hasErr?: string) =>
    `relative flex items-center rounded-xl border transition-all duration-[180ms] ${hasErr ? 'border-red-500/55 bg-red-500/5' : 'border-[var(--border)] bg-[var(--field-bg)]'}`;
  const inputCls = 'w-full h-12 bg-transparent border-none outline-none text-[15px] text-[var(--text)] pl-11 pr-4 font-sans';

  const selectedRole = ROLES_OPTIONS.find(r => r.key === role);

  return (
    <div data-theme={mode} className="min-h-dvh w-full flex flex-col bg-[var(--app-bg)] text-[var(--text)]">

      {/* Mobile header */}
      <div className="reg-mobile-bar hidden items-center justify-between px-4 py-[10px] border-b border-[var(--border)] bg-[var(--topbar-bg)] backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-[10px]">
          <span className="grid place-items-center rounded-[10px] w-8 h-8 shrink-0 bg-gradient-to-br from-blue-500 to-green-500">
            <Radio size={15} color="#fff" strokeWidth={2} />
          </span>
          <div>
            <div className="font-semibold text-sm text-[var(--text)] leading-tight">Switch6</div>
            <div className="text-[10px] text-[var(--muted)] leading-tight">Broadcast OS</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-[600px]">

        {/* Form pane */}
        <div className="reg-form-pane flex flex-col w-full max-w-[540px] shrink-0 bg-[var(--surface)] border-r border-[var(--border)] relative z-10">
          <div className="absolute top-0 inset-x-0 h-60 pointer-events-none bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(34,197,94,.09),transparent)]" />

          <div className="relative flex flex-col px-[clamp(20px,6vw,44px)] py-[clamp(24px,5vw,44px)] pb-9">

            {/* Logo */}
            <Link href="/" className="reg-logo-desktop hidden items-center gap-3 mb-7 no-underline w-fit">
              <span className="grid place-items-center rounded-xl w-10 h-10 shrink-0 bg-gradient-to-br from-blue-500 to-green-500">
                <Radio size={19} color="#fff" strokeWidth={2} />
              </span>
              <span>
                <strong className="block text-[17px] font-semibold text-[var(--text)] tracking-tight">Switch6</strong>
                <small className="block text-[11px] text-[var(--muted)] font-normal">Sports Broadcast OS</small>
              </span>
            </Link>
            <div className="reg-logo-mobile-gap mb-5" />

            {/* Heading */}
            <div className="mb-5 transition-[opacity,transform] duration-[450ms] ease-out" style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(12px)' }}>
              <h1 className="font-semibold leading-none tracking-[-0.04em] text-[var(--text)] mb-2.5" style={{ fontSize: 'clamp(26px,4.5vw,36px)' }}>
                Create workspace<span className="text-[var(--green)]">.</span>
              </h1>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                Broadcast-ready club operations in minutes.
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="flex items-start gap-2.5 mb-3.5 px-[14px] py-[10px] rounded-xl border border-red-500/30 bg-red-500/[.08] text-[var(--red)] text-[13px] font-medium leading-snug">
                <span className="mt-px shrink-0 flex"><Icon name="error" size={15} /></span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 mb-3.5 px-[14px] py-[10px] rounded-xl border border-green-500/30 bg-green-500/[.08] text-[var(--green)] text-[13px] font-medium leading-snug">
                <span className="mt-px shrink-0 flex"><Icon name="check" size={15} /></span>
                <span>{success}</span>
              </div>
            )}

            <div className="flex flex-col gap-4 transition-[opacity,transform] duration-[450ms] ease-out delay-[50ms]" style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(14px)' }}>

              {/* ── Role selector ─────────────────────────────── */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] tracking-[.05em] uppercase mb-2">Workspace type</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES_OPTIONS.map(r => (
                    <button
                      key={r.key} type="button" onClick={() => setRole(r.key)}
                      className={`flex flex-col items-start p-[10px_12px] rounded-xl cursor-pointer text-left transition-all duration-[180ms] font-sans border ${
                        role === r.key
                          ? 'border-green-500/45 bg-green-500/[.08] shadow-[0_0_0_3px_rgba(34,197,94,.08)]'
                          : 'border-[var(--border)] bg-[var(--field-bg)]'
                      }`}
                    >
                      <span className={`mb-1.5 ${role === r.key ? 'text-[var(--green)]' : 'text-[var(--faint)]'}`}>
                        <Icon name={r.icon} size={16} />
                      </span>
                      <span className="text-xs font-semibold text-[var(--text)] block">{r.label}</span>
                      <span className="text-[10px] text-[var(--muted)] leading-tight mt-0.5">{r.desc}</span>
                    </button>
                  ))}
                </div>
                {/* Role feature preview */}
                {selectedRole && (
                  <div className="mt-2 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--field-bg)]">
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] mb-1.5">
                      {selectedRole.label} includes
                    </p>
                    <div className="flex flex-col gap-1">
                      {selectedRole.features.map(f => (
                        <div key={f} className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
                          <Icon name="check" size={11} className="text-[var(--green)] shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Name + Email */}
              <div className="reg-two-col grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted)] tracking-[.05em] uppercase mb-2">Full name</label>
                  <div className={fieldCls(errs.name)}>
                    <span className="absolute left-[14px] text-[var(--faint)] flex"><Icon name="person" size={16} /></span>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inputCls} />
                  </div>
                  {errs.name && <p className="mt-1.5 text-xs text-[var(--red)]">{errs.name}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted)] tracking-[.05em] uppercase mb-2">Email address</label>
                  <div className={fieldCls(errs.email)}>
                    <span className="absolute left-[14px] text-[var(--faint)] flex"><Icon name="mail" size={16} /></span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@club.com" className={inputCls} />
                  </div>
                  {errs.email && <p className="mt-1.5 text-xs text-[var(--red)]">{errs.email}</p>}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] tracking-[.05em] uppercase mb-2">Phone number</label>
                <div className={fieldCls(errs.phone)}>
                  <span className="absolute left-[14px] text-[var(--faint)] flex"><Icon name="phone" size={16} /></span>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7xx xxx xxx" className={inputCls} />
                </div>
                {errs.phone && <p className="mt-1.5 text-xs text-[var(--red)]">{errs.phone}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] tracking-[.05em] uppercase mb-2">Password</label>
                <div className={fieldCls(errs.password)}>
                  <span className="absolute left-[14px] text-[var(--faint)] flex"><Icon name="lock" size={16} /></span>
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create secure password"
                    className="w-full h-12 bg-transparent border-none outline-none text-[15px] text-[var(--text)] pl-11 pr-12 font-sans"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 w-[30px] h-[30px] grid place-items-center rounded-lg text-[var(--faint)] bg-transparent border-none cursor-pointer">
                    <Icon name={showPass ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
                {errs.password && <p className="mt-1.5 text-xs text-[var(--red)]">{errs.password}</p>}
                {password && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                      <span className="text-[var(--muted)]">Strength</span>
                      <span style={{ color: strengthColor }}>{strengthLabel}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {[0, 1, 2, 3].map(i => (
                        <span key={i} className="h-[3px] rounded-full transition-colors duration-300"
                          style={{ background: i < strengthScore ? strengthColor : 'var(--border)' }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {checks.map(c => (
                        <span key={c.label} className="text-[11px] flex items-center gap-1 transition-colors duration-200"
                          style={{ color: c.pass ? 'var(--green)' : 'var(--faint)' }}>
                          <Icon name={c.pass ? 'check' : 'error'} size={11} />{c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Terms */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <button type="button" onClick={() => setAgreed(p => !p)}
                    className={`w-5 h-5 mt-px rounded-[5px] shrink-0 flex items-center justify-center border cursor-pointer transition-all duration-[180ms] font-sans ${agreed ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border)] bg-[var(--field-bg)]'}`}>
                    {agreed && <Icon name="check" size={11} className="text-white" />}
                  </button>
                  <span className="text-[13px] text-[var(--muted)] leading-[1.55]">
                    I agree to the{' '}
                    <Link href="/terms" className="text-[var(--green)] no-underline font-medium">Terms of Service</Link>
                    {' '}and understand Switch6 is used for live sports production workflows.
                  </span>
                </label>
                {errs.agreed && <p className="mt-1.5 ml-8 text-xs text-[var(--red)]">{errs.agreed}</p>}
              </div>

              {/* Submit */}
              <button
                type="button" onClick={handleRegister} disabled={loading || !isValid}
                className="w-full h-12 rounded-xl border-none bg-[var(--green)] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(34,197,94,.28)] transition-opacity duration-200 font-sans"
                style={{ cursor: loading || !isValid ? 'not-allowed' : 'pointer', opacity: loading || !isValid ? 0.45 : 1 }}
              >
                {loading
                  ? <><span className="spinner" /> Creating workspace…</>
                  : <><Icon name="add-circle" size={16} /> Create Switch6 Workspace</>
                }
              </button>
            </div>

            {/* Footer */}
            <div className="pt-6 transition-opacity duration-[600ms] ease-out delay-[200ms]" style={{ opacity: ready ? 1 : 0 }}>
              <p className="text-[13px] text-[var(--muted)] text-center mb-2.5">
                Already have an account?{' '}
                <Link href="/login" className="text-[var(--green)] font-medium no-underline">Access control room</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — desktop */}
        <div className="reg-right-panel hidden flex-1 relative overflow-hidden flex-col justify-between p-12 bg-[var(--bg2)]">
          <div className="absolute inset-0 pointer-events-none [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:54px_54px]" />
          <div className="absolute pointer-events-none w-[500px] h-[500px] -left-[80px] -top-[100px] rounded-full bg-[radial-gradient(circle,rgba(10,143,82,.17),transparent_58%)]" />

          <div className="relative z-10 inline-flex items-center gap-2 rounded-full w-max px-4 py-[7px] border border-green-500/25 bg-green-500/[.07]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-[pulse-dot_1.4s_ease-in-out_infinite]" />
            <span className="text-[11px] font-bold text-[var(--green)] tracking-[.07em] uppercase">New workspace</span>
          </div>

          <div className="relative z-10">
            <h2 className="font-semibold leading-[.9] tracking-[-0.04em] text-[var(--text)] mb-5" style={{ fontSize: 'clamp(42px,5vw,70px)' }}>
              Your club,<br />
              <span className="bg-gradient-to-r from-green-500 to-blue-400 bg-clip-text text-transparent">broadcast-ready.</span>
            </h2>
            <p className="text-[15px] text-[var(--muted)] leading-[1.65] max-w-[420px]">
              Three roles, one platform. Broadcasters run matches and streams. Advertisers run campaigns and track ROI. Admins manage everything.
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-2.5">
            {ROLES_OPTIONS.map(r => (
              <div key={r.key} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 ${role === r.key ? 'border-green-500/40 bg-green-500/[.07]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                <div className={`w-9 h-9 rounded-[10px] grid place-items-center shrink-0 ${role === r.key ? 'bg-green-500/[.2] text-[var(--green)]' : 'bg-[var(--surface2)] text-[var(--faint)]'}`}>
                  <Icon name={r.icon} size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">{r.label}</div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">{r.desc}</div>
                </div>
                {role === r.key && <span className="ml-auto text-[var(--green)]"><Icon name="check" size={14} /></span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:1023px){
          .reg-mobile-bar{display:flex!important}
          .reg-form-pane{max-width:100%!important;border-right:none!important}
          .reg-logo-desktop{display:none!important}
          .reg-logo-mobile-gap{display:block!important}
          .reg-right-panel{display:none!important}
          .reg-two-col{grid-template-columns:1fr!important}
        }
        @media(min-width:1024px){
          .reg-mobile-bar{display:none!important}
          .reg-logo-desktop{display:inline-flex!important}
          .reg-logo-mobile-gap{display:none!important}
          .reg-right-panel{display:flex!important}
        }
      `}</style>
    </div>
  );
}
