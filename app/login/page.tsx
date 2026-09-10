'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginUser, UserPrefs, roleDashboard, setRoleCookie } from '@/lib/api';
import { Radio } from 'lucide-react';
import { Icon } from '@/components/ui';
import { useTheme } from '@/lib/ThemeContext';

export default function LoginPage() {
  const router   = useRouter();
  const { mode } = useTheme();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passErr,  setPassErr]  = useState('');
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    const user = UserPrefs.get();
    // Already logged in → go to the correct dashboard for their role
    const dest = roleDashboard();
    console.log("dest: ",dest);
    if (user) { router.replace(dest); return; }
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, [router]);

  const isValid = useMemo(() =>
    /^[\w-.]+@([\w-]+\.)+[\w]{2,}$/.test(email) && password.length >= 6,
    [email, password]
  );

  const validate = () => {
    let ok = true;
    setEmailErr(''); setPassErr('');
    if (!email)        { setEmailErr('Email is required'); ok = false; }
    else if (!/^[\w-.]+@([\w-]+\.)+[\w]{2,}$/.test(email)) { setEmailErr('Enter a valid email'); ok = false; }
    if (!password)     { setPassErr('Password is required'); ok = false; }
    else if (password.length < 6) { setPassErr('Minimum 6 characters'); ok = false; }
    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const user = await loginUser({ email, password });
      UserPrefs.save(user);
      if (user.role) setRoleCookie(user.role);
      if (!remember) localStorage.removeItem('switch6-remember-me');
      else           localStorage.setItem('switch6-remember-me', 'true');

      // Route each role to their purpose-specific landing page
      const dest = roleDashboard();
      const label =
        dest === '/admin'         ? 'admin panel' :
        dest === '/advertisement' ? 'campaign centre' :
        'broadcast dashboard';

      setSuccess(`Authenticated. Opening ${label}…`);
      router.push(dest);
    } catch (e: any) {
      setError(e.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div data-theme={mode} className="min-h-dvh w-full flex flex-col bg-[var(--app-bg)] text-[var(--text)]">

      {/* Mobile header */}
      <div className="login-mobile-bar hidden items-center justify-between px-4 py-[10px] border-b border-[var(--border)] bg-[var(--topbar-bg)] backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-[10px]">
          <span className="grid place-items-center rounded-[10px] w-8 h-8 shrink-0 bg-gradient-to-br from-blue-500 to-green-500">
            <img src={'/ic_launcher.png'} alt=''/>
          </span>
          <div>
            <div className="font-semibold text-sm text-[var(--text)] leading-tight">Switch6</div>
            <div className="text-[10px] text-[var(--muted)] leading-tight">Broadcast OS</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-[600px]">

        {/* Form pane */}
        <div className="login-form-pane flex flex-col w-full max-w-[480px] shrink-0 bg-[var(--surface)] border-r border-[var(--border)] relative z-10">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_45%_at_50%_-10%,rgba(34,197,94,.09),transparent)]" />

          <div className="relative flex flex-col min-h-full px-[clamp(20px,6vw,48px)] py-[clamp(28px,5vw,48px)]">

            <Link href="/" className="login-logo-desktop hidden items-center gap-3 mb-12 no-underline w-fit">
              <span className="grid place-items-center rounded-xl w-10 h-10 shrink-0 bg-gradient-to-br from-blue-500 to-green-500">
                <img src={'/ic_launcher.png'} alt=''/>
              </span>
              <span>
                <strong className="block text-[17px] font-semibold text-[var(--text)] tracking-tight">Switch6</strong>
                <small className="block text-[11px] text-[var(--muted)] font-normal">Sports Broadcast OS</small>
              </span>
            </Link>
            <div className="login-logo-mobile-gap mb-6" />

            <div className="mb-7 transition-[opacity,transform] duration-[450ms] ease-out"
              style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(12px)' }}>
              <div className="inline-flex items-center gap-[7px] px-3 py-[5px] rounded-full border border-green-500/30 bg-green-500/[.08] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-[pulse-dot_1.4s_ease-in-out_infinite]" />
                <span className="text-[11px] font-semibold text-[var(--green)] tracking-[.06em] uppercase">Secure access</span>
              </div>
              <h1 className="font-semibold leading-none tracking-[-0.04em] text-[var(--text)] mb-2.5" style={{ fontSize: 'clamp(30px,5vw,42px)' }}>
                Control room<span className="text-[var(--green)]">.</span>
              </h1>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Sign in to access your workspace. Broadcasters and advertisers each land in their own panel.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 mb-4 px-[14px] py-[10px] rounded-xl border border-red-500/30 bg-red-500/[.08] text-[var(--red)] text-[13px] font-medium leading-snug">
                <span className="mt-px shrink-0 flex"><Icon name="error" size={15} /></span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 mb-4 px-[14px] py-[10px] rounded-xl border border-green-500/30 bg-green-500/[.08] text-[var(--green)] text-[13px] font-medium leading-snug">
                <span className="mt-px shrink-0 flex"><Icon name="check" size={15} /></span>
                <span>{success}</span>
              </div>
            )}

            <div className="flex flex-col gap-3.5 transition-[opacity,transform] duration-[450ms] ease-out delay-[50ms]"
              style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(14px)' }}>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] tracking-[.05em] uppercase mb-2">Email address</label>
                <div className={`relative flex items-center rounded-xl border transition-all duration-[180ms] ${emailErr ? 'border-red-500/55 bg-red-500/5' : 'border-[var(--border)] bg-[var(--field-bg)]'}`}>
                  <span className="absolute left-[14px] text-[var(--faint)] flex"><Icon name="mail" size={16} /></span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="you@club.com"
                    className="w-full h-12 bg-transparent border-none outline-none text-[15px] text-[var(--text)] pl-11 pr-4 font-sans" />
                </div>
                {emailErr && <p className="mt-1.5 text-xs text-[var(--red)]">{emailErr}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] tracking-[.05em] uppercase mb-2">Password</label>
                <div className={`relative flex items-center rounded-xl border transition-all duration-[180ms] ${passErr ? 'border-red-500/55 bg-red-500/5' : 'border-[var(--border)] bg-[var(--field-bg)]'}`}>
                  <span className="absolute left-[14px] text-[var(--faint)] flex"><Icon name="lock" size={16} /></span>
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    className="w-full h-12 bg-transparent border-none outline-none text-[15px] text-[var(--text)] pl-11 pr-12 font-sans" />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 w-[30px] h-[30px] grid place-items-center rounded-lg text-[var(--faint)] bg-transparent border-none cursor-pointer">
                    <Icon name={showPass ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
                {passErr && <p className="mt-1.5 text-xs text-[var(--red)]">{passErr}</p>}
              </div>

              <div className="flex items-center justify-between mt-0.5">
                <button type="button" onClick={() => setRemember(v => !v)}
                  className="flex items-center gap-2 text-[13px] text-[var(--muted)] bg-transparent border-none cursor-pointer p-0 font-sans">
                  <span className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 border transition-all duration-[180ms] ${remember ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border)] bg-[var(--field-bg)]'}`}>
                    {remember && <Icon name="check" size={11} className="text-white" />}
                  </span>
                  Remember me
                </button>
              </div>

              <button type="button" onClick={handleLogin} disabled={loading || !isValid}
                className="w-full h-12 rounded-xl border-none bg-[var(--green)] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(34,197,94,.30)] transition-opacity duration-200 mt-1 font-sans"
                style={{ cursor: loading || !isValid ? 'not-allowed' : 'pointer', opacity: loading || !isValid ? 0.45 : 1 }}>
                {loading
                  ? <><span className="spinner" /> Authenticating…</>
                  : <><Icon name="shield" size={16} /> Access Control Room</>
                }
              </button>
            </div>

            <div className="mt-auto pt-8 transition-opacity duration-[600ms] ease-out delay-[200ms]" style={{ opacity: ready ? 1 : 0 }}>
              <p className="text-[13px] text-[var(--muted)] text-center mb-2.5">
                New to Switch6?{' '}
                <Link href="/register" className="text-[var(--green)] font-medium no-underline">Create workspace</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — desktop */}
        <div className="login-right-panel hidden flex-1 relative overflow-hidden flex-col justify-between p-12 bg-[var(--bg2)]">
          <div className="absolute inset-0 pointer-events-none [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:54px_54px]" />
          <div className="relative z-10 inline-flex items-center gap-2 rounded-full w-max px-4 py-[7px] border border-red-500/30 bg-red-500/[.07]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-[pulse-dot_1.2s_ease-in-out_infinite]" />
            <span className="text-[11px] font-bold text-[var(--red)] tracking-[.07em] uppercase">Live system ready</span>
          </div>
          <div className="relative z-10">
            <h2 className="font-semibold leading-[.9] tracking-[-0.04em] text-[var(--text)] mb-5" style={{ fontSize: 'clamp(46px,5.5vw,76px)' }}>
              Every match,<br />
              <span className="bg-gradient-to-r from-green-500 to-blue-400 bg-clip-text text-transparent">broadcast-ready.</span>
            </h2>
            <p className="text-[15px] text-[var(--muted)] leading-[1.65] max-w-[440px]">
              One platform, two roles. Broadcasters manage match ops. Advertisers run campaigns.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[
              { val: 'Broadcaster', sub: 'Match & stream ops',    color: 'var(--green)' },
              { val: 'Advertiser',  sub: 'Campaigns & analytics', color: 'var(--blue)'  },
              { val: 'Admin',       sub: 'Full system control',   color: 'var(--gold)'  },
            ].map(({ val, sub, color }) => (
              <div key={sub} className="rounded-2xl p-4 border border-[var(--border)] bg-[var(--surface)]">
                <strong className="block text-[15px] font-bold leading-none" style={{ color }}>{val}</strong>
                <span className="block text-[10px] text-[var(--muted)] mt-2 uppercase tracking-[.05em] font-medium">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:1023px){
          .login-mobile-bar{display:flex!important}
          .login-form-pane{max-width:100%!important;border-right:none!important}
          .login-logo-desktop{display:none!important}
          .login-logo-mobile-gap{display:block!important}
          .login-right-panel{display:none!important}
        }
        @media(min-width:1024px){
          .login-mobile-bar{display:none!important}
          .login-logo-desktop{display:inline-flex!important}
          .login-logo-mobile-gap{display:none!important}
          .login-right-panel{display:flex!important}
        }
      `}</style>
    </div>
  );
}
