'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, Icon } from '@/components/ui';
import { useRoleGuard, getRoleLabel, getRoleColor } from '@/lib/auth';
import { UserPrefs, changePassword, getUserRole, ROLES } from '@/lib/api';

type Prefs = {
  notifications: boolean; darkMode: boolean; autoSave: boolean;
  streamQuality: string; language: string; timezone: string;
};

export default function SettingsPage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADVERTISER, ROLES.ADMIN, ROLES.SUPERADMIN]);
  const router = useRouter();

  const [prefs, setPrefs] = useState<Prefs>({
    notifications: true, darkMode: true, autoSave: true,
    streamQuality: '1080p', language: 'en', timezone: 'UTC',
  });
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [profile,  setProfile]  = useState({ name: '', email: '', phone: '' });
  const [role,     setRole]     = useState<string | null>(null);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    const user = UserPrefs.get();
    if (!user) { router.replace('/login'); return; }
    setProfile({ name: user.name ?? '', email: user.email ?? '', phone: user.phone ?? '' });
    setRole(getUserRole());
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = UserPrefs.get();
      if (!user) { router.replace('/login'); return; }
      const wants = password.current || password.next || password.confirm;
      if (wants) {
        if (!password.current)                   throw new Error('Current password is required');
        if (password.next.length < 6)            throw new Error('New password too short');
        if (password.next !== password.confirm)  throw new Error('Passwords do not match');
        await changePassword({ old_password: password.current, new_password: password.next });
        setPassword({ current: '', next: '', confirm: '' });
      }
      UserPrefs.save({ ...user, name: profile.name, email: profile.email, phone: profile.phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err?.message || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const toggle = (key: keyof Prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));
  const select = (key: keyof Prefs, value: string) => setPrefs(p => ({ ...p, [key]: value }));

  return (
    <PageShell title="Settings">
      <div className="fluid-pad flex flex-col gap-4 pb-10 sm:gap-5">

        {/* Hero */}
        <div className="broadcast-card relative overflow-hidden rounded-lg p-4 sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[rgba(26,95,212,.06)] via-transparent to-[rgba(10,143,82,.06)]" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[.04em] text-[color:var(--muted)]">Control Room Settings</div>
              <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[28px]">System Configuration</h1>
              <p className="text-[13px] text-[color:var(--muted)]">Manage profile, security, and stream behaviour</p>
            </div>
            {role && (
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">Role</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[.06em] border"
                  style={{ color: getRoleColor(role), borderColor: getRoleColor(role) + '44', background: getRoleColor(role) + '14' }}>
                  {getRoleLabel(role)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2-col on lg, single col on mobile */}
        <div className="grid gap-4 lg:grid-cols-2 sm:gap-5">
          <Section title="Profile" icon="person">
            <Field label="Name"  value={profile.name}  onChange={(v: string) => setProfile(p => ({ ...p, name:  v }))} />
            <Field label="Email" value={profile.email} onChange={(v: string) => setProfile(p => ({ ...p, email: v }))} type="email" />
            <Field label="Phone" value={profile.phone} onChange={(v: string) => setProfile(p => ({ ...p, phone: v }))} type="tel" />
          </Section>

          <Section title="Security" icon="lock">
            <Field label="Current password" value={password.current} onChange={(v: string) => setPassword(p => ({ ...p, current: v }))} type="password" />
            <Field label="New password"     value={password.next}    onChange={(v: string) => setPassword(p => ({ ...p, next:    v }))} type="password" />
            <Field label="Confirm password" value={password.confirm} onChange={(v: string) => setPassword(p => ({ ...p, confirm: v }))} type="password" />
          </Section>

          <Section title="Preferences" icon="settings">
            <Toggle label="Match notifications" sub="Live event alerts"    value={prefs.notifications} onChange={() => toggle('notifications')} />
            <Toggle label="Auto-save lineups"   sub="Instant save on edit" value={prefs.autoSave}      onChange={() => toggle('autoSave')} />
          </Section>

          <Section title="Stream" icon="video">
            <SelectField label="Quality"  value={prefs.streamQuality} options={['720p','1080p','4K']}                                               onChange={(v: string) => select('streamQuality', v)} />
            <SelectField label="Language" value={prefs.language}      options={['en','fr','es','de','pt']}                                          onChange={(v: string) => select('language', v)} />
            <SelectField label="Timezone" value={prefs.timezone}      options={['UTC','UTC+1','UTC+2','UTC+3','UTC+5:30','UTC+8','UTC-5','UTC-8']}  onChange={(v: string) => select('timezone', v)} />
          </Section>

          <div className="lg:col-span-2 flex items-center gap-3 flex-wrap">
            <button onClick={handleSave} disabled={saving}
              className="flex h-10 items-center gap-2 rounded-lg bg-[color:var(--green)] px-5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {saving ? <span className="spinner" /> : <Icon name="check" size={15} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--green)]">
                <Icon name="check" size={14} /> Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="broadcast-card overflow-hidden rounded-lg">
      <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-4 py-3">
        <Icon name={icon} size={15} />
        <span className="text-[14px] font-medium text-[color:var(--text)]">{title}</span>
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

// Stack label above input on mobile; side-by-side on sm
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-[13px] text-[color:var(--text)] sm:min-w-[120px] sm:text-[14px]">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--field-bg)] px-2.5 text-[14px] text-[color:var(--text)] sm:max-w-[320px]" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-[13px] text-[color:var(--text)] sm:min-w-[120px] sm:text-[14px]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--field-bg)] px-2.5 sm:max-w-[320px]">
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[14px] text-[color:var(--text)]">{label}</div>
        {sub && <div className="text-[12px] text-[color:var(--muted)]">{sub}</div>}
      </div>
      <button onClick={onChange} className="relative h-[22px] w-10 shrink-0 rounded-full"
        style={{ background: value ? 'var(--green)' : 'var(--border)' }}>
        <span className="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all" style={{ left: value ? 21 : 3 }} />
      </button>
    </div>
  );
}
