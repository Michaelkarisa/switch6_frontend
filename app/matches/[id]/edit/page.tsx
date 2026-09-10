'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell } from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import { getMatchById, updateMatch, type UpdateMatchPayload, type MatchData, ROLES } from '@/lib/api';

const SH = 'animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-black/[0.03] via-black/[0.07] to-black/[0.03] rounded-md shrink-0';
const STATUSES = ['upcoming', 'scheduled', 'live', 'finished'];
const fieldCls = 'w-full h-11 px-3.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--field-bg)] text-[14px] text-[color:var(--text)] outline-none focus:border-[color:var(--green)]/60 transition-colors placeholder:text-[color:var(--faint)]';
const labelCls = 'block mb-1.5 text-[12px] font-medium tracking-[.03em] text-[color:var(--muted)]';

export default function EditMatchPage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);

  const params  = useParams();
  const router  = useRouter();
  const matchId = params.id as string;

  const [match,     setMatch]     = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [status,    setStatus]    = useState('');
  const [venue,     setVenue]     = useState('');
  const [date,      setDate]      = useState('');
  const [time,      setTime]      = useState('');
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  
  useEffect(() => {
    getMatchById(matchId)
      .then((m: MatchData) => {
        setMatch(m);
        setStatus(m.status || 'upcoming');
        setVenue(m.stadium || '');
        if (m.date) setDate(m.date.split('T')[0] || m.date);
        if (m.time) setTime(m.time);
        setHomeGoals(m.homeTeam?.goals ?? 0);
        setAwayGoals(m.awayTeam?.goals ?? 0);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [matchId]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload: UpdateMatchPayload = { status: status as MatchData['status'], venue, date, time, home_score: homeGoals, away_score: awayGoals };
      await updateMatch(match.id, payload);
      setSuccess('Match updated!');
      setTimeout(() => router.push('/matches'), 1500);
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <PageShell title="Edit Match">
      <div className="w-full max-w-[600px] px-4 py-6 pb-10 flex flex-col gap-5 sm:px-6">
        <div className="flex flex-col gap-2">
          <div className={`${SH} h-6 w-40`} /><div className={`${SH} h-3.5 w-56`} />
        </div>
        {[1,2].map(i => (
          <div key={i} className="broadcast-card rounded-lg p-4 flex flex-col gap-4 sm:p-6">
            <div className={`${SH} h-4 w-32`} />
            {[1,2,3].map(j => <div key={j} className="flex flex-col gap-1.5"><div className={`${SH} h-2.5 w-24`} /><div className={`${SH} h-11 w-full rounded-lg`} /></div>)}
          </div>
        ))}
      </div>
    </PageShell>
  );

  return (
    <PageShell title="Edit Match">
      {/* max-w ensures it stays readable on desktop, px-4 for mobile breathing room */}
      <div className="w-full max-w-[600px] px-4 py-4 pb-10 sm:px-6 sm:py-6">

        <div className="mb-5">
          <h1 className="text-[20px] font-semibold text-[color:var(--text)] tracking-tight mb-1 sm:text-[22px]">Edit Match</h1>
          {match && <p className="text-sm text-[color:var(--muted)]">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>}
        </div>

        {error   && <div className="px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/[.08] text-[color:var(--red)] text-sm mb-4">{error}</div>}
        {success && <div className="px-4 py-3 rounded-lg border border-green-500/20 bg-green-500/[.08] text-[color:var(--green)] text-sm mb-4">{success}</div>}

        <div className="broadcast-card rounded-lg p-4 mb-4 sm:p-6 sm:mb-5">
          <h2 className="text-[15px] font-semibold text-[color:var(--text)] tracking-tight mb-4 sm:mb-5">Match Details</h2>
          <div className="mb-4">
            <label className={labelCls}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={`${fieldCls} cursor-pointer`}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className={labelCls}>Venue / Stadium</label>
            <input value={venue} onChange={e => setVenue(e.target.value)} className={fieldCls} placeholder="Stadium name" />
          </div>
          {/* Date + Time: side-by-side always (both are compact inputs) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={fieldCls} />
            </div>
          </div>
        </div>

        <div className="broadcast-card rounded-lg p-4 mb-4 sm:p-6 sm:mb-5">
          <h2 className="text-[15px] font-semibold text-[color:var(--text)] tracking-tight mb-4 sm:mb-5">Score</h2>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex-1 text-center">
              <div className="text-[13px] font-medium text-[color:var(--muted)] mb-2 truncate">{match?.homeTeam?.name || 'Home'}</div>
              <input type="number" min={0} value={homeGoals}
                onChange={e => setHomeGoals(parseInt(e.target.value) || 0)}
                className="w-full h-14 text-center text-[24px] font-semibold font-mono text-[color:var(--text)] rounded-lg border border-[color:var(--border)] bg-[color:var(--field-bg)] outline-none focus:border-[color:var(--green)]/60 transition-colors sm:text-[26px]" />
            </div>
            <div className="text-[22px] font-semibold text-[color:var(--muted)] mt-6 sm:text-[26px]">–</div>
            <div className="flex-1 text-center">
              <div className="text-[13px] font-medium text-[color:var(--muted)] mb-2 truncate">{match?.awayTeam?.name || 'Away'}</div>
              <input type="number" min={0} value={awayGoals}
                onChange={e => setAwayGoals(parseInt(e.target.value) || 0)}
                className="w-full h-14 text-center text-[24px] font-semibold font-mono text-[color:var(--text)] rounded-lg border border-[color:var(--border)] bg-[color:var(--field-bg)] outline-none focus:border-[color:var(--green)]/60 transition-colors sm:text-[26px]" />
            </div>
          </div>
        </div>

        {/* Action buttons: full-width stacked on mobile, right-aligned on sm */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button onClick={() => router.push('/matches')}
            className="w-full h-11 rounded-lg border border-[color:var(--border)] bg-transparent text-[color:var(--text)] text-sm font-medium cursor-pointer hover:border-[color:var(--green)]/40 transition-colors sm:w-auto sm:min-w-[120px] sm:px-5">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="w-full h-11 rounded-lg border-none bg-[color:var(--green)] text-white text-sm font-medium cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity sm:w-auto sm:min-w-[160px] sm:px-5">
            {saving ? <span className="spinner" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
