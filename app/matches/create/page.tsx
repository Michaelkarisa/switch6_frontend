'use client';

import { useState, useRef } from 'react';
import { Home, Plane, Trophy, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageShell, Icon } from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import {
  UserPrefs,
  searchClubs,
  searchLeagues,
  searchReferees,
  addClub,
  addReferee,
  addLeague,
  addMatch,
  ROLES,
  type Club,
  type Referee,
  type League,
} from '@/lib/api';

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '4-5-1', '4-1-4-1'];
const STATUSES = ['upcoming', 'scheduled', 'live'];

export default function CreateMatchPage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);
  const router = useRouter();

  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [homeFormation, setHomeFormation] = useState('4-4-2');
  const [awayFormation, setAwayFormation] = useState('4-4-2');

  const [homeClub, setHomeClub] = useState<Club | null>(null);
  const [awayClub, setAwayClub] = useState<Club | null>(null);
  const [referee, setReferee] = useState<Referee | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [leagueType, setLeagueType] = useState<'League' | 'Friendly'>('League');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [clubQuery, setClubQuery] = useState('');
  const [clubResults, setClubResults] = useState<Club[]>([]);
  const [clubTarget, setClubTarget] = useState<'home' | 'away' | null>(null);
  const [clubSearched, setClubSearched] = useState(false);

  const [refQuery, setRefQuery] = useState('');
  const [refResults, setRefResults] = useState<Referee[]>([]);
  const [refSearched, setRefSearched] = useState(false);

  const [leagueQuery, setLeagueQuery] = useState('');
  const [leagueResults, setLeagueResults] = useState<League[]>([]);
  const [leagueSearched, setLeagueSearched] = useState(false);

  const [showNewClub, setShowNewClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubCity, setNewClubCity] = useState('');
  const [newClubStadium, setNewClubStadium] = useState('');
  const [newClubUrl, setNewClubUrl] = useState('');
  const [savingClub, setSavingClub] = useState(false);

  const [showNewRef, setShowNewRef] = useState(false);
  const [newRefName, setNewRefName] = useState('');
  const [savingRef, setSavingRef] = useState(false);

  const [showNewLeague, setShowNewLeague] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [savingLeague, setSavingLeague] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const inputClass =
    'w-full h-[42px] px-3 rounded-[7px] border border-[var(--border)] bg-[var(--field-bg)] text-[14px] text-[var(--text)] font-normal outline-none placeholder:text-[var(--faint)] focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/10';
  const labelClass = 'mb-1.5 block text-[12px] font-[500] tracking-[.03em] text-[var(--muted)]';
  const cardClass = 'relative mb-5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6';
  const dropdownClass = 'mt-2 w-full max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-xl';
  const dropdownItemClass = 'cursor-pointer border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--text)] transition hover:bg-green-500/10';

  const doSearchClub = (q: string, side: 'home' | 'away') => {
    setClubQuery(q);
    setClubTarget(side);
    setClubSearched(false);
    clearTimeout(searchTimeout.current);

    if (q.length < 2) { setClubResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      try {
        setClubResults(await searchClubs(q));
      } catch {
        setClubResults([]);
      } finally {
        setClubSearched(true);
      }
    }, 400);
  };

  const doSearchRef = (q: string) => {
    setRefQuery(q);
    setRefSearched(false);
    clearTimeout(searchTimeout.current);

    if (q.length < 2) { setRefResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      try {
        setRefResults(await searchReferees(q));
      } catch {
        setRefResults([]);
      } finally {
        setRefSearched(true);
      }
    }, 400);
  };

  const doSearchLeague = (q: string) => {
    setLeagueQuery(q);
    setLeagueSearched(false);
    clearTimeout(searchTimeout.current);

    if (q.length < 2) { setLeagueResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      try {
        setLeagueResults(await searchLeagues(q));
      } catch {
        setLeagueResults([]);
      } finally {
        setLeagueSearched(true);
      }
    }, 400);
  };

  const handleCreateClub = async () => {
    if (!newClubName) return;
    setSavingClub(true);
    try {
      const club = await addClub({
        name: newClubName,
        city: newClubCity,
        stadium: newClubStadium,
        logo_url: newClubUrl,
      });
      if (clubTarget === 'home') setHomeClub(club);
      if (clubTarget === 'away') setAwayClub(club);
      setShowNewClub(false);
      setNewClubName('');
      setNewClubCity('');
      setNewClubStadium('');
      setNewClubUrl('');
      setClubQuery('');
      setClubResults([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingClub(false);
    }
  };

  const handleCreateRef = async () => {
    if (!newRefName) return;
    setSavingRef(true);
    try {
      setReferee(await addReferee({ name: newRefName }));
      setShowNewRef(false);
      setNewRefName('');
      setRefQuery('');
      setRefResults([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingRef(false);
    }
  };

  const handleCreateLeague = async () => {
    if (!newLeagueName) return;
    setSavingLeague(true);
    try {
      setLeague(await addLeague({ name: newLeagueName, type: 'League' }));
      setShowNewLeague(false);
      setNewLeagueName('');
      setLeagueQuery('');
      setLeagueResults([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingLeague(false);
    }
  };

  const handleSubmit = async () => {
    if (!homeClub || !awayClub) return setError('Please select both home and away clubs');
    if (homeClub.id === awayClub.id) return setError('Home and away clubs cannot be the same');
    if (!date || !time) return setError('Please select a date and time');
    if (leagueType === 'League' && !league) return setError('Please select a league');

    setLoading(true);
    setError('');
    try {
      const user = UserPrefs.get();
      const matchDateTime = new Date(`${date}T${time}:00.000Z`).toISOString();
      new Date()
      await addMatch({
        authorid: user?.id,
        home_club_id: homeClub.id,
        away_club_id: awayClub.id,
        match_date: matchDateTime,
        status,
        venue,
        referee_id: referee?.id,
        league_id: leagueType === 'Friendly' ? null : league?.id,
        home_formation: homeFormation,
        away_formation: awayFormation,
      });
      setSuccess('Match created successfully!');
      setTimeout(() => router.push('/matches'), 1500);
    } catch (e: any) {
      setError(e.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  const SelectedBox = ({
    name,
    icon,
    onClear,
  }: {
    name: string;
    icon?: React.ReactNode;
    onClear: () => void;
  }) => (
    <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
      <span className="inline-flex items-center gap-2 font-black text-green-400">{icon}{name}</span>
      <button onClick={onClear} className="grid place-items-center text-slate-400 hover:text-red-400">
        <X size={15} />
      </button>
    </div>
  );

  return (
    <PageShell title="Create Match">
      <div className="w-full p-6 pb-10">
        <div className="mb-7">
          <h1 className="mb-3 text-[15px] font-medium text-[color:var(--text)] tracking-[-0.01em]">Create Match</h1>
          <p className="text-sm text-[var(--muted)]">Set up a new match, select clubs and configure details</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{success}</div>
        )}

        {/* ── Teams ─────────────────────────────────────────── */}
        <div className={cardClass}>
          <h2 className="mb-3 text-[15px] font-medium text-[color:var(--text)] tracking-[-0.01em]">Teams</h2>

          <div className="grid grid-cols-1 gap-5 min-[450px]:grid-cols-2">
            {(['home', 'away'] as const).map(side => {
              const selectedClub = side === 'home' ? homeClub : awayClub;
              return (
                <div key={side}>
                  <label className={labelClass}>
                    <span className="inline-flex items-center gap-2">
                      {side === 'home' ? <Home size={14} /> : <Plane size={14} />}
                      {side === 'home' ? 'Home Club' : 'Away Club'}
                    </span>
                  </label>

                  {selectedClub ? (
                    <SelectedBox
                      name={selectedClub.name}
                      icon={side === 'home' ? <Home size={14} /> : <Plane size={14} />}
                      onClear={() => side === 'home' ? setHomeClub(null) : setAwayClub(null)}
                    />
                  ) : (
                    <div className="flex flex-col">
                      <input
                        placeholder="Search clubs..."
                        value={clubTarget === side ? clubQuery : ''}
                        onFocus={() => setClubTarget(side)}
                        onChange={e => doSearchClub(e.target.value, side)}
                        onBlur={() => setTimeout(() => { setClubResults([]); setClubTarget(null); }, 180)}
                        className={inputClass}
                      />
                      {clubTarget === side && clubQuery.length >= 2 && (
                        <div className={dropdownClass}>
                          {clubResults.length > 0 ? (
                            clubResults.map(c => (
                              <div
                                key={c.id}
                                onMouseDown={() => {
                                  if (side === 'home') setHomeClub(c);
                                  else setAwayClub(c);
                                  setClubResults([]);
                                  setClubQuery('');
                                  setClubTarget(null);
                                }}
                                className={dropdownItemClass}
                              >
                                <div className="font-black">{c.name}</div>
                                {c.city && <div className="mt-1 text-xs text-[var(--muted)]">{c.city}</div>}
                              </div>
                            ))
                          ) : clubSearched ? (
                            <div className="p-3">
                              <div className="mb-2 text-sm text-slate-400">No clubs found</div>
                              <button
                                onMouseDown={() => {
                                  setNewClubName(clubQuery);
                                  setClubTarget(side);
                                  setShowNewClub(true);
                                }}
                                className="w-full rounded-lg bg-green-500 px-3 py-2 text-xs font-black text-white hover:bg-green-400"
                              >
                                + Create "{clubQuery}"
                              </button>
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-sm text-[var(--muted)]">Searching...</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <label className={`${labelClass} mt-4`}>Formation</label>
                  <select
                    value={side === 'home' ? homeFormation : awayFormation}
                    onChange={e => side === 'home' ? setHomeFormation(e.target.value) : setAwayFormation(e.target.value)}
                    className={inputClass}
                  >
                    {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Match Details ──────────────────────────────────── */}
        <div className={cardClass}>
          <h2 className="mb-3 text-[15px] font-medium text-[color:var(--text)] tracking-[-0.01em]">Match Details</h2>

          <div className="grid grid-cols-1 gap-4 min-[450px]:grid-cols-2">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Stadium / Venue</label>
            <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Kasarani Stadium" className={inputClass} />
          </div>

          <div className="mt-4">
            <label className={labelClass}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── League ────────────────────────────────────────── */}
        <div className={cardClass}>
          <h2 className="mb-3 text-[15px] font-medium text-[color:var(--text)] tracking-[-0.01em]">League</h2>

          <div className="mb-4 flex gap-3">
            {(['League', 'Friendly'] as const).map(t => (
              <button
                key={t}
                onClick={() => setLeagueType(t)}
                className={`rounded-lg px-5 py-2 text-sm font-bold transition ${
                  leagueType === t ? 'bg-green-500 text-white' : 'bg-[var(--field-bg)] text-slate-400 hover:text-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {leagueType === 'League' && (
            league ? (
              <SelectedBox name={(league as any).leaguename ?? league.name} icon={<Trophy size={14} />} onClear={() => setLeague(null)} />
            ) : (
              <div className="flex flex-col">
                <input
                  placeholder="Search leagues..."
                  value={leagueQuery}
                  onChange={e => doSearchLeague(e.target.value)}
                  onBlur={() => setTimeout(() => setLeagueResults([]), 180)}
                  className={inputClass}
                />
                {leagueQuery.length >= 2 && (
                  <div className={dropdownClass}>
                    {leagueResults.length > 0 ? (
                      leagueResults.map(lg => (
                        <div
                          key={lg.id}
                          onMouseDown={() => { setLeague(lg); setLeagueResults([]); setLeagueQuery(''); }}
                          className={dropdownItemClass}
                        >
                          <div className="font-black">{lg.name}</div>
                          {lg.type && <div className="mt-1 text-xs text-[var(--muted)]">{lg.type}</div>}
                        </div>
                      ))
                    ) : leagueSearched ? (
                      <div className="p-3">
                        <div className="mb-2 text-sm text-[var(--muted)]">No leagues found</div>
                        <button
                          onMouseDown={() => { setNewLeagueName(leagueQuery); setShowNewLeague(true); }}
                          className="w-full rounded-lg bg-green-500 px-3 py-2 text-xs font-black text-white hover:bg-green-400"
                        >
                          + Create "{leagueQuery}"
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-[var(--muted)]">Searching...</div>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* ── Referee ───────────────────────────────────────── */}
        <div className={cardClass}>
          <h2 className="mb-3 text-[15px] font-medium text-[color:var(--text)] tracking-[-0.01em]">
            Referee <span className="text-sm font-normal text-[var(--muted)]">(optional)</span>
          </h2>

          {referee ? (
            <SelectedBox name={referee.name} icon={<Icon name="shield" size={14} />} onClear={() => setReferee(null)} />
          ) : (
            <div className="flex flex-col">
              <input
                placeholder="Search referees..."
                value={refQuery}
                onChange={e => doSearchRef(e.target.value)}
                onBlur={() => setTimeout(() => setRefResults([]), 180)}
                className={inputClass}
              />
              {refQuery.length >= 2 && (
                <div className={dropdownClass}>
                  {refResults.length > 0 ? (
                    refResults.map(r => (
                      <div
                        key={r.id}
                        onMouseDown={() => { setReferee(r); setRefResults([]); setRefQuery(''); }}
                        className={dropdownItemClass}
                      >
                        <div className="font-black">{r.name}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">Referee</div>
                      </div>
                    ))
                  ) : refSearched ? (
                    <div className="p-3">
                      <div className="mb-2 text-sm text-[var(--muted)]">No referees found</div>
                      <button
                        onMouseDown={() => { setNewRefName(refQuery); setShowNewRef(true); }}
                        className="w-full rounded-lg bg-green-500 px-3 py-2 text-xs font-black text-white hover:bg-green-400"
                      >
                        + Create "{refQuery}"
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-[var(--muted)]">Searching...</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Submit ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-gradient-to-br from-green-500/10 to-blue-600/10 p-6">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Final action</div>
            <div className="mt-1 text-[14px] font-[500] text-[var(--text)]">Confirm teams, date, venue and league before creating.</div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex min-w-44 items-center justify-center gap-2 rounded-lg bg-green-500 px-5 py-3 text-sm font-black text-white transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <span className="spinner" /> : <><Icon name="add-circle" size={16} /> Create Match</>}
          </button>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────── */}
      {showNewClub && (
        <Modal title="Create New Club" onClose={() => setShowNewClub(false)}>
          <Field label="Club Name *" value={newClubName} onChange={setNewClubName} inputClass={inputClass} labelClass={labelClass} />
          <Field label="City" value={newClubCity} onChange={setNewClubCity} inputClass={inputClass} labelClass={labelClass} />
          <Field label="Stadium" value={newClubStadium} onChange={setNewClubStadium} inputClass={inputClass} labelClass={labelClass} />
          <Field label="Logo URL" value={newClubUrl} onChange={setNewClubUrl} inputClass={inputClass} labelClass={labelClass} />
          <ModalActions onCancel={() => setShowNewClub(false)} onConfirm={handleCreateClub} loading={savingClub} confirmText="Create Club" />
        </Modal>
      )}

      {showNewRef && (
        <Modal title="Create Referee" onClose={() => setShowNewRef(false)}>
          <Field label="Name *" value={newRefName} onChange={setNewRefName} inputClass={inputClass} labelClass={labelClass} />
          <ModalActions onCancel={() => setShowNewRef(false)} onConfirm={handleCreateRef} loading={savingRef} confirmText="Create" />
        </Modal>
      )}

      {showNewLeague && (
        <Modal title="Create League" onClose={() => setShowNewLeague(false)}>
          <Field label="League Name *" value={newLeagueName} onChange={setNewLeagueName} inputClass={inputClass} labelClass={labelClass} />
          <ModalActions onCancel={() => setShowNewLeague(false)} onConfirm={handleCreateLeague} loading={savingLeague} confirmText="Create" />
        </Modal>
      )}
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  inputClass,
  labelClass,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <div className="mb-4">
      <label className={labelClass}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="mb-3 text-[15px] font-medium text-[color:var(--text)] tracking-[-0.01em]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  loading,
  confirmText,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  confirmText: string;
}) {
  return (
    <div className="mt-5 flex gap-3">
      <button
        onClick={onCancel}
        className="h-10 px-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-[14px] cursor-pointer hover:border-[color:var(--green)]/40 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className="rounded-lg bg-green-500 px-5 py-3 text-sm font-black text-white hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Saving...' : confirmText}
      </button>
    </div>
  );
}