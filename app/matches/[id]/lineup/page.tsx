'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, Icon, LineupSkeleton } from '@/components/ui';
import { useRoleGuard } from '@/lib/auth';
import { UserPrefs, getMatchById, getPlayersByClub, MatchData, ROLES, searchBroadcasters, shareLineup, type BroadcasterOption } from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_POSITIONS = [
  { code: 'GK',  label: 'Goalkeeper',           group: 'GK'  },
  { code: 'SW',  label: 'Sweeper',              group: 'DEF' },
  { code: 'LCB', label: 'Left Centre Back',     group: 'DEF' },
  { code: 'CB',  label: 'Centre Back',          group: 'DEF' },
  { code: 'RCB', label: 'Right Centre Back',    group: 'DEF' },
  { code: 'LB',  label: 'Left Back',            group: 'DEF' },
  { code: 'RB',  label: 'Right Back',           group: 'DEF' },
  { code: 'LWB', label: 'Left Wing-Back',       group: 'DEF' },
  { code: 'RWB', label: 'Right Wing-Back',      group: 'DEF' },
  { code: 'CDM', label: 'Central Def Mid',      group: 'MID' },
  { code: 'LCM', label: 'Left Central Mid',     group: 'MID' },
  { code: 'CM',  label: 'Central Mid',          group: 'MID' },
  { code: 'RCM', label: 'Right Central Mid',    group: 'MID' },
  { code: 'CAM', label: 'Central Att Mid',      group: 'MID' },
  { code: 'LM',  label: 'Left Mid',             group: 'MID' },
  { code: 'RM',  label: 'Right Mid',            group: 'MID' },
  { code: 'LW',  label: 'Left Winger',          group: 'ATT' },
  { code: 'RW',  label: 'Right Winger',         group: 'ATT' },
  { code: 'SS',  label: 'Second Striker',       group: 'ATT' },
  { code: 'CF',  label: 'Centre Forward',       group: 'ATT' },
  { code: 'ST',  label: 'Striker',              group: 'ATT' },
];

const POS_GROUPS = ['GK', 'DEF', 'MID', 'ATT'] as const;
const POS_GROUP_LABELS: Record<string, string> = { GK: 'Goalkeeper', DEF: 'Defence', MID: 'Midfield', ATT: 'Attack'};
const POS_GROUP_COLORS: Record<string, string> = { GK: 'var(--gold)', DEF: 'var(--blue)', MID: 'var(--green)', ATT: 'var(--red)'};

const POS_ALIAS: Record<string, string> = {
  FWD: 'ST', FW: 'ST', ATT: 'ST',
  DEF: 'CB', DF: 'CB',
  MID: 'CM', MD: 'CM', MF: 'CM',
  DM: 'CDM', AM: 'CAM', FLD: 'CM',
};

function normalisePos(raw: string | undefined): string {
  if (!raw) return 'CM';
  const up = raw.toUpperCase().trim();
  if (ALL_POSITIONS.some(p => p.code === up)) return up;
  return POS_ALIAS[up] ?? up;
}

// Position compatibility for slot fallbacks
const SLOT_FALLBACK: Record<string, string[]> = {
  CB: ['LCB', 'RCB'], LCB: ['CB', 'RCB'], RCB: ['CB', 'LCB'],
  CDM: ['CM', 'LCM', 'RCM'], CAM: ['CM', 'LCM', 'RCM'],
  CM: ['LCM', 'RCM', 'CDM', 'CAM'], LCM: ['CM', 'CDM', 'CAM'], RCM: ['CM', 'CDM', 'CAM'],
  CF: ['ST', 'SS'], SS: ['CF', 'ST'], ST: ['CF', 'SS'],
  RW: ['RM'], LW: ['LM'], RM: ['RW'], LM: ['LW'],
};

// Whether two positions are compatible (no mismatch warning needed)
const COMPATIBLE_GROUPS: Record<string, string[]> = {
  GK: ['GK', 'SW'],
  LCB: ['LCB', 'CB', 'RCB', 'SW'], CB: ['CB', 'LCB', 'RCB', 'SW'], RCB: ['RCB', 'CB', 'LCB', 'SW'],
  LB: ['LB', 'LWB'], RB: ['RB', 'RWB'], LWB: ['LWB', 'LB'], RWB: ['RWB', 'RB'],
  CDM: ['CDM', 'CM', 'LCM', 'RCM'], CM: ['CM', 'LCM', 'RCM', 'CDM', 'CAM'],
  LCM: ['LCM', 'CM', 'CDM', 'CAM'], RCM: ['RCM', 'CM', 'CDM', 'CAM'],
  CAM: ['CAM', 'CM', 'LCM', 'RCM', 'SS'],
  LM: ['LM', 'LW'], RM: ['RM', 'RW'], LW: ['LW', 'LM'], RW: ['RW', 'RM'],
  ST: ['ST', 'CF', 'SS'], CF: ['CF', 'ST', 'SS'], SS: ['SS', 'CF', 'ST', 'CAM'],
};

function isPositionCompatible(playerPos: string, slotPos: string): boolean {
  if (playerPos === slotPos) return true;
  return COMPATIBLE_GROUPS[slotPos]?.includes(playerPos) ?? false;
}

const FORMATIONS: Record<string, { pos: string; x: number; y: number }[]> = {
  '4-4-2': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RB', x: 25, y: 15 }, { pos: 'LCB', x: 25, y: 38 }, { pos: 'RCB', x: 25, y: 62 }, { pos: 'LB', x: 25, y: 85 },
    { pos: 'RM', x: 50, y: 10 }, { pos: 'LCM', x: 50, y: 35 }, { pos: 'RCM', x: 50, y: 65 }, { pos: 'LM', x: 50, y: 90 },
    { pos: 'SS', x: 78, y: 35 }, { pos: 'ST', x: 78, y: 65 },
  ],
  '4-3-3': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RB', x: 25, y: 15 }, { pos: 'LCB', x: 25, y: 38 }, { pos: 'RCB', x: 25, y: 62 }, { pos: 'LB', x: 25, y: 85 },
    { pos: 'CDM', x: 45, y: 50 }, { pos: 'LCM', x: 55, y: 35 }, { pos: 'RCM', x: 55, y: 65 },
    { pos: 'RW', x: 78, y: 12 }, { pos: 'CF', x: 82, y: 50 }, { pos: 'LW', x: 78, y: 88 },
  ],
  '4-2-3-1': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RB', x: 25, y: 15 }, { pos: 'LCB', x: 25, y: 38 }, { pos: 'RCB', x: 25, y: 62 }, { pos: 'LB', x: 25, y: 85 },
    { pos: 'CDM', x: 42, y: 35 }, { pos: 'CDM', x: 42, y: 65 },
    { pos: 'RM', x: 62, y: 12 }, { pos: 'CAM', x: 62, y: 50 }, { pos: 'LM', x: 62, y: 88 },
    { pos: 'ST', x: 82, y: 50 },
  ],
  '3-5-2': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'LCB', x: 25, y: 25 }, { pos: 'CB', x: 25, y: 50 }, { pos: 'RCB', x: 25, y: 75 },
    { pos: 'RWB', x: 50, y: 8 }, { pos: 'LCM', x: 50, y: 30 }, { pos: 'CM', x: 50, y: 50 }, { pos: 'RCM', x: 50, y: 70 }, { pos: 'LWB', x: 50, y: 92 },
    { pos: 'SS', x: 78, y: 35 }, { pos: 'ST', x: 78, y: 65 },
  ],
  '4-1-4-1': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RB', x: 25, y: 15 }, { pos: 'LCB', x: 25, y: 38 }, { pos: 'RCB', x: 25, y: 62 }, { pos: 'LB', x: 25, y: 85 },
    { pos: 'CDM', x: 40, y: 50 },
    { pos: 'RM', x: 58, y: 10 }, { pos: 'LCM', x: 58, y: 35 }, { pos: 'RCM', x: 58, y: 65 }, { pos: 'LM', x: 58, y: 90 },
    { pos: 'CF', x: 82, y: 50 },
  ],
  '3-4-3': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'LCB', x: 25, y: 25 }, { pos: 'CB', x: 25, y: 50 }, { pos: 'RCB', x: 25, y: 75 },
    { pos: 'RM', x: 50, y: 12 }, { pos: 'LCM', x: 50, y: 38 }, { pos: 'RCM', x: 50, y: 62 }, { pos: 'LM', x: 50, y: 88 },
    { pos: 'RW', x: 78, y: 12 }, { pos: 'CF', x: 82, y: 50 }, { pos: 'LW', x: 78, y: 88 },
  ],
  '5-3-2': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RWB', x: 25, y: 8 }, { pos: 'LCB', x: 25, y: 28 }, { pos: 'CB', x: 25, y: 50 }, { pos: 'RCB', x: 25, y: 72 }, { pos: 'LWB', x: 25, y: 92 },
    { pos: 'LCM', x: 52, y: 28 }, { pos: 'CM', x: 52, y: 50 }, { pos: 'RCM', x: 52, y: 72 },
    { pos: 'SS', x: 78, y: 35 }, { pos: 'ST', x: 78, y: 65 },
  ],
  '4-3-2-1': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RB', x: 25, y: 15 }, { pos: 'LCB', x: 25, y: 38 }, { pos: 'RCB', x: 25, y: 62 }, { pos: 'LB', x: 25, y: 85 },
    { pos: 'CDM', x: 45, y: 25 }, { pos: 'CM', x: 45, y: 50 }, { pos: 'CDM', x: 45, y: 75 },
    { pos: 'CAM', x: 65, y: 35 }, { pos: 'CAM', x: 65, y: 65 },
    { pos: 'ST', x: 82, y: 50 },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Three explicit squad groups:
 *   'starter'   — player is in the starting XI for this match (from API or user-placed)
 *   'sub'       — player is on the bench for this match
 *   'unassigned'— club player not yet added to match squad
 */
type SquadGroup = 'starter' | 'sub' | 'unassigned';

type Player = {
  id: string;
  name: string;
  number: number;
  /** Player's NATURAL position — metadata only, never persisted as lineup position */
  naturalPosition: string;
  teamId: string;
  fromApi?: boolean;
  squadGroup: SquadGroup;
  role: string;
};

/** Maps playerId → slot index on the current formation */
type SlotAssignment = { playerId: string; slotIndex: number };

type MismatchWarning = {
  player: Player;
  targetSlotIdx: number;
  slotPos: string;
};

type ConflictDialog = {
  player: Player;
  targetSlotIdx: number;
  slotPos: string;
  incumbent: Player;
};

// ─── Normalisers ──────────────────────────────────────────────────────────────

function normalisePlayer(p: any, teamId: string, squadGroup: SquadGroup): Player {
  return {
    id: p.id,
    name: p.name ?? p.player_name ?? 'Unknown',
    number: p.number ?? p.jersey_number ?? 0,
    naturalPosition: normalisePos(p.position),
    teamId,
    fromApi: true,
    role: normaliseRole(p.role ?? p.isCaptain ?? "player"),
    squadGroup,
  };
}

function normaliseRole(role:any):string{
  if(role !=  undefined){
  if(role =="captain" || role =="player"){
   return role;
  }else{
    if(role == true){
     return "captain";
    }else{
      return "player";
    }
  }
}
  return "player";
}

function buildPlayersFromTeam(team: any): Player[] {
  if (!team) return [];
  const starters = (team.startingPlayers ?? []).map((p: any) => normalisePlayer(p, team.id ?? '', 'starter'));
  const subs = (team.substitutes ?? []).map((p: any) => normalisePlayer(p, team.id ?? '', 'sub'));
  return [...starters, ...subs];
}

// ─── Auto-hydration ───────────────────────────────────────────────────────────

function buildInitialAssignments(
  playerList: Player[],
  fmtSlots: { pos: string }[]
): SlotAssignment[] {
  const assigned: SlotAssignment[] = [];
  // Only auto-place starters
  playerList
    .filter(p => p.squadGroup === 'starter')
    .forEach(p => {
      const tryPositions = [p.naturalPosition, ...(SLOT_FALLBACK[p.naturalPosition] ?? [])];
      let idx = -1;
      for (const tryPos of tryPositions) {
        idx = fmtSlots.findIndex((s, i) =>
          s.pos === tryPos && !assigned.some(a => a.slotIndex === i)
        );
        if (idx >= 0) break;
      }
      // Fallback: any open slot
      if (idx < 0) {
        idx = fmtSlots.findIndex((_, i) => !assigned.some(a => a.slotIndex === i));
      }
      if (idx >= 0) assigned.push({ playerId: p.id, slotIndex: idx });
    });
  return assigned;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LineupPage() {
  useRoleGuard([ROLES.BROADCASTER, ROLES.ADMIN, ROLES.SUPERADMIN]);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  //const [id,setId] = useState('');
  const [match,        setMatch]        = useState<MatchData | null>(null);
  const [homePlayers,  setHomePlayers]  = useState<Player[]>([]);
  const [awayPlayers,  setAwayPlayers]  = useState<Player[]>([]);
  const [assignments,  setAssignments]  = useState<SlotAssignment[]>([]);
  const [formation,    setFormation]    = useState('4-3-3');
  const [isHome,       setIsHome]       = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [notice,       setNotice]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Drag state
  const dragRef    = useRef<{ playerId: string } | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null); // slot index being hovered

  // Dialogs
  const [assignDialog,   setAssignDialog]   = useState<{ player: Player } | null>(null);
  const [mismatchDialog, setMismatchDialog] = useState<MismatchWarning | null>(null);
  const [conflictDialog, setConflictDialog] = useState<ConflictDialog | null>(null);

  // Add player form
  const [showAdd, setShowAdd] = useState(false);
  const [showAlert, setAlert] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNum,  setNewNum]  = useState('');
  const [newPos,  setNewPos]  = useState('');
  const [addErr,  setAddErr]  = useState('');

  // ── Share lineup ──
  const [savedTeamIds, setSavedTeamIds] = useState<Set<string>>(new Set());
  const [shareDialog, setShareDialog] = useState<{ clubId: string; matchId: string } | null>(null);

  // Derived
  const players  = isHome ? homePlayers : awayPlayers;
  const setPlayers = isHome ? setHomePlayers : setAwayPlayers;
  const team     = isHome ? match?.homeTeam : match?.awayTeam;
  const teamId   = team?.id ?? '';
  const slots    = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];

  // Squad groups
  const starters    = players.filter(p => p.squadGroup === 'starter');
  const subs        = players.filter(p => p.squadGroup === 'sub');
  const unassigned  = players.filter(p => p.squadGroup === 'unassigned');

  // Pitch occupancy helpers
  const getPlayerAtSlot = (idx: number) => {
    const a = assignments.find(a => a.slotIndex === idx);
    return a ? players.find(p => p.id === a.playerId) ?? null : null;
  };
  const getSlotForPlayer = (pid: string) => assignments.find(a => a.playerId === pid)?.slotIndex ?? null;
  const isOnPitch        = (pid: string) => assignments.some(a => a.playerId === pid);

  // ── Notice auto-dismiss ──
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);
 
  useEffect(()=>{ 
    const height = 0;
    const width = 0;
    if(width<height){
      setAlert(true);
    }
  //  console.log("length: ",length);
  },[showAlert]);

  // ── Data loading ──
  async function fetchSquad(teamData: any): Promise<Player[]> {
    if (!teamData) return [];
    let base: Player[] = buildPlayersFromTeam(teamData);
    try {
      const clubPlayers = await getPlayersByClub(teamData.id);
      
      const extras: Player[] = (clubPlayers ?? [])
        .map((p: any) => normalisePlayer(p, teamData.id, 'unassigned'))
        .filter((cp: Player) => !base.some(b => b.id === cp.id));
      base = [...base, ...extras];
     // console.log("teamPlayers: ",base);
    } catch { /* use embedded data */ }
    return base;
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const user = UserPrefs.get();
      if (!user) { router.replace('/login'); return; }
      try {
        const m = await getMatchById(id);
       // setId(m.id);
        setMatch(m);
        const [home, away] = await Promise.all([
          fetchSquad(m.homeTeam),
          fetchSquad(m.awayTeam),
        ]);
        setHomePlayers(home);
        setAwayPlayers(away);
        setSavedTeamIds(new Set([
          ...(home.some(p => p.squadGroup === 'starter') && m.homeTeam?.id ? [m.homeTeam.id] : []),
          ...(away.some(p => p.squadGroup === 'starter') && m.awayTeam?.id ? [m.awayTeam.id] : []),
        ]));
        const fmt = m.homeTeam?.formation ?? '4-3-3';
        setFormation(fmt);
        setAssignments(buildInitialAssignments(home, FORMATIONS[fmt] ?? FORMATIONS['4-3-3']));
      } catch {
        setNotice({ type: 'error', msg: 'Failed to load match.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Team switch ──
// ── Team switch ──
const handleTeamSwitch = useCallback((home: boolean) => {
  if (!match) return;
  setIsHome(home);
  const teamData = home ? match.homeTeam : match.awayTeam;
  const pList    = home ? homePlayers : awayPlayers;
  const fmt      = teamData?.formation ?? '4-3-3';
  setFormation(fmt);
  setAssignments(buildInitialAssignments(pList, FORMATIONS[fmt] ?? FORMATIONS['4-3-3']));
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [match, homePlayers, awayPlayers]);

  // ── Formation change — clears assignments, re-hydrates from starters ──
// ── Formation change — clears assignments, re-hydrates from starters ──
// ── Formation change — clears assignments, re-hydrates from starters ──
const handleFormationChange = useCallback((fmt: string) => {
  setFormation(fmt);
  setAssignments(buildInitialAssignments(players, FORMATIONS[fmt] ?? FORMATIONS['4-3-3']));
  
  // Update the match object's formation for the active team (home/away)
  // This ensures handleSave() persists the correct formation
  if (match) {
    setMatch(prev => {
      if (!prev) return prev;
      if (isHome) {
        return {
          ...prev,
          homeTeam: prev.homeTeam ? { ...prev.homeTeam, formation: fmt } : prev.homeTeam
        };
      } else {
        return {
          ...prev,
          awayTeam: prev.awayTeam ? { ...prev.awayTeam, formation: fmt } : prev.awayTeam
        };
      }
    });
  }
}, [players, isHome, match]);

  // ─── Core assignment logic ────────────────────────────────────────────────

  /**
   * Place a player into a slot. This is the single point of truth for all
   * pitch placements. It:
   *   1. Detects position mismatch → triggers mismatch warning (unless bypassed)
   *   2. Detects slot conflict → triggers conflict dialog (unless bypassed)
   *   3. Promotes player's squadGroup to 'starter'
   *   4. Updates assignments atomically
   */
  const placePlayerInSlot = useCallback((
    playerId: string,
    slotIdx: number,
    opts: { bypassMismatch?: boolean; bypassConflict?: boolean } = {}
  ): 'placed' | 'mismatch' | 'conflict' => {
    const player = players.find(p => p.id === playerId);
    if (!player) return 'placed';
    const slotPos = slots[slotIdx]?.pos;
    if (!slotPos) return 'placed';

    // 1. Mismatch check
    if (!opts.bypassMismatch && !isPositionCompatible(player.naturalPosition, slotPos)) {
      setMismatchDialog({ player, targetSlotIdx: slotIdx, slotPos });
      return 'mismatch';
    }

    // 2. Conflict check
    const conflictAssignment = assignments.find(
      a => a.slotIndex === slotIdx && a.playerId !== playerId
    );
    if (conflictAssignment && !opts.bypassConflict) {
      const incumbent = players.find(p => p.id === conflictAssignment.playerId);
      if (incumbent) {
        setConflictDialog({ player, targetSlotIdx: slotIdx, slotPos, incumbent });
        return 'conflict';
      }
    }

    // 3. Commit assignment
    setAssignments(prev => {
      // Remove old slot for this player + vacate target slot
      const filtered = prev.filter(a => a.playerId !== playerId && a.slotIndex !== slotIdx);
      return [...filtered, { playerId, slotIndex: slotIdx }];
    });

    // 4. Promote to starter if not already
    if (player.squadGroup !== 'starter') {
      (isHome ? setHomePlayers : setAwayPlayers)(prev =>
        prev.map(p => p.id === playerId ? { ...p, squadGroup: 'starter' } : p)
      );
    }

    return 'placed';
  }, [players, slots, assignments, isHome]);

  /**
   * Remove a player from the pitch without demoting them entirely —
   * they become a sub (still in match squad) unless they were unassigned.
   */
  const removeFromPitch = useCallback((playerId: string) => {
    setAssignments(prev => prev.filter(a => a.playerId !== playerId));
    const player = players.find(p => p.id === playerId);
    if (player && player.squadGroup === 'starter') {
      (isHome ? setHomePlayers : setAwayPlayers)(prev =>
        prev.map(p => p.id === playerId ? { ...p, squadGroup: 'sub' } : p)
      );
    }
  }, [players, isHome]);

  /**
   * Set a player's squad group directly (for the assign dialog bench option)
   */
  const setSquadGroup = useCallback((playerId: string, group: SquadGroup) => {
    setAssignments(prev => prev.filter(a => a.playerId !== playerId));
    (isHome ? setHomePlayers : setAwayPlayers)(prev =>
      prev.map(p => p.id === playerId ? { ...p, squadGroup: group } : p)
    );
  }, [isHome]);

  // ─── Drag and Drop ────────────────────────────────────────────────────────

  const handleDragStart = (playerId: string) => {
    dragRef.current = { playerId };
  };

  const handleDragOver = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    setDragOver(slotIdx);
  };

  const handleDragLeave = () => setDragOver(null);

  const handleDrop = (slotIdx: number) => {
    setDragOver(null);
    if (!dragRef.current) return;
    const { playerId } = dragRef.current;
    dragRef.current = null;
    placePlayerInSlot(playerId, slotIdx);
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setDragOver(null);
  };

  // ─── Assign dialog actions ────────────────────────────────────────────────

  const handleAssignAsStarter = (player: Player) => {
    setAssignDialog(null);
    // Find best slot: matching position, empty first
    const tryPositions = [player.naturalPosition, ...(SLOT_FALLBACK[player.naturalPosition] ?? [])];
    let targetSlot = -1;
    // Prefer empty matching slot
    for (const pos of tryPositions) {
      const idx = slots.findIndex((s, i) => s.pos === pos && !getPlayerAtSlot(i));
      if (idx >= 0) { targetSlot = idx; break; }
    }
    // Fall back to occupied matching slot
    if (targetSlot < 0) {
      for (const pos of tryPositions) {
        const idx = slots.findIndex((s, i) =>
          s.pos === pos && getPlayerAtSlot(i)?.id !== player.id
        );
        if (idx >= 0) { targetSlot = idx; break; }
      }
    }
    // Last resort: any empty slot
    if (targetSlot < 0) {
      targetSlot = slots.findIndex((_, i) => !getPlayerAtSlot(i));
    }
    if (targetSlot < 0) {
      setNotice({ type: 'error', msg: 'No empty slots. Remove a starter first.' });
      return;
    }
    const result = placePlayerInSlot(player.id, targetSlot);
    if (result === 'placed') {
      setNotice({ type: 'success', msg: `${player.name} added as starter.` });
    }
  };

  const handleAssignAsSub = (player: Player) => {
    setAssignDialog(null);
    const totalSubs = (players ?? []).filter(p => p.squadGroup === "sub").length;
    if(totalSubs < 5){
    setSquadGroup(player.id, 'sub');
    setNotice({ type: 'success', msg: `${player.name} moved to bench.` });
    } else {
      setNotice({ type: 'error', msg: 'Maximum 5 substitutes allowed.' });
    }
  };

  const handleRemoveFromLineup = (player: Player) => {
    setAssignDialog(null);
    setSquadGroup(player.id, 'unassigned');
    setNotice({ type: 'success', msg: `${player.name} removed from lineup.` });
  };

  // ─── Mismatch dialog ─────────────────────────────────────────────────────

  const handleMismatchConfirm = () => {
    if (!mismatchDialog) return;
    const { player, targetSlotIdx } = mismatchDialog;
    setMismatchDialog(null);
    const result = placePlayerInSlot(player.id, targetSlotIdx, { bypassMismatch: true });
    if (result === 'placed') {
      setNotice({ type: 'success', msg: `${player.name} placed at ${slots[targetSlotIdx]?.pos}.` });
    }
  };

  // ─── Conflict dialog ─────────────────────────────────────────────────────

  const handleConflictReplace = () => {
    if (!conflictDialog) return;
    const { player, targetSlotIdx, incumbent } = conflictDialog;
    setConflictDialog(null);
    placePlayerInSlot(player.id, targetSlotIdx, { bypassMismatch: true, bypassConflict: true });
    // Incumbent moves to sub
    setSquadGroup(incumbent.id, 'sub');
    setNotice({ type: 'success', msg: `${player.name} replaced ${incumbent.name}.` });
  };

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!teamId || !match) return;
    setSaving(true);
    try {
      // Starters: slot-based position (tactical truth), not natural position
      const starterPayload = assignments.map(a => ({
        match_id: match.id,
        player_id: a.playerId,
        club_id: teamId,
        position: slots[a.slotIndex]?.pos ?? '',  // ← slot pos, not player.naturalPosition
        is_starter: true,
      }));
      // Subs: natural position is fine since they're not in a specific tactical slot
      const subPayload = subs.map(p => ({
        match_id: match.id,
        player_id: p.id,
        club_id: teamId,
        position: p.naturalPosition,
        is_starter: false,
      }));
      const { addLineups,updateMatch } = await import('@/lib/api');
      await addLineups([...starterPayload, ...subPayload]);
      await updateMatch(match.id, {home_formation:match.homeTeam.formation,away_formation:match.awayTeam.formation});
      setSavedTeamIds(prev => new Set(prev).add(teamId));
      setNotice({ type: 'success', msg: 'Lineup saved successfully.' });
    } catch {
      setNotice({ type: 'error', msg: 'Save failed. Please retry.' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Add local player ─────────────────────────────────────────────────────

  const handleAddPlayer = () => {
    setAddErr('');
    if (!newName.trim()) { setAddErr('Name is required'); return; }
    if (!newPos) { setAddErr('Select a position'); return; }
    const p: Player = {
      id: `local-${Date.now()}`,
      name: newName.trim(),
      number: parseInt(newNum) || 0,
      naturalPosition: newPos,
      teamId,
      fromApi: false,
      squadGroup: 'unassigned',
      role:"",
    };
    (isHome ? setHomePlayers : setAwayPlayers)(prev => [...prev, p]);
    setNewName(''); setNewNum(''); setNewPos('');
    setShowAdd(false);
    setNotice({ type: 'success', msg: `${p.name} added to squad.` });
  };

  if (loading) return <PageShell title="Lineup"><LineupSkeleton /></PageShell>;

  const filledSlots = assignments.length;
  const totalSlots  = slots.length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageShell title="Lineup">

      {/* ── Toast ── */}
      {notice && (
        <div className={`fixed top-[70px] right-5 z-[100] flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-[13px] font-medium shadow-[var(--shadow-lg)] transition-all
          ${notice.type === 'success'
            ? 'bg-green-500/10 border-green-500/25 text-[color:var(--green)]'
            : 'bg-red-500/10 border-red-500/25 text-[color:var(--red)]'}`}>
          <Icon name={notice.type === 'success' ? 'check' : 'error'} size={15} />
          {notice.msg}
        </div>
      )}

 {/* ── Assign dialog ── */}
      {showAlert && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setAlert(false)}
        >


        </div>
      )}

      {/* ── Position mismatch warning ── */}
      {mismatchDialog && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setMismatchDialog(null)}
        >
          <div
            className="w-full max-w-[380px] rounded-2xl border border-amber-500/30 bg-[color:var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[color:var(--border)] bg-amber-500/[.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 grid place-items-center text-amber-400 shrink-0">
                <Icon name="warning" size={18} />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[color:var(--text)]">Position mismatch</div>
                <div className="text-[12px] text-[color:var(--muted)] mt-px">
                  <span className="font-mono font-bold text-amber-400">{mismatchDialog.player.naturalPosition}</span>
                  {' → '}
                  <span className="font-mono font-bold text-[color:var(--text)]">{mismatchDialog.slotPos}</span>
                </div>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-[13px] text-[color:var(--muted)] leading-relaxed">
                <span className="font-semibold text-[color:var(--text)]">{mismatchDialog.player.name}</span> plays{' '}
                <span className="font-mono font-bold text-[color:var(--text)]">{mismatchDialog.player.naturalPosition}</span> but you're placing them at{' '}
                <span className="font-mono font-bold text-[color:var(--text)]">{mismatchDialog.slotPos}</span>. Confirm this tactical decision?
              </p>
              <button
                onClick={handleMismatchConfirm}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/[.07] cursor-pointer text-left hover:bg-amber-500/12 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 grid place-items-center text-amber-400 shrink-0">
                  <Icon name="check" size={15} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[color:var(--text)]">Confirm placement</div>
                  <div className="text-[11px] text-[color:var(--muted)] mt-px">Place {mismatchDialog.player.name} at {mismatchDialog.slotPos}</div>
                </div>
              </button>
              <button
                onClick={() => setMismatchDialog(null)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] cursor-pointer text-left hover:border-[color:var(--green)]/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[color:var(--surface3)] grid place-items-center text-[color:var(--muted)] shrink-0">
                  <Icon name="close" size={15} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[color:var(--text)]">Cancel</div>
                  <div className="text-[11px] text-[color:var(--muted)] mt-px">Keep original position</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slot conflict dialog ── */}
      {conflictDialog && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setConflictDialog(null)}
        >
          <div
            className="w-full max-w-[380px] rounded-2xl border border-red-500/30 bg-[color:var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[color:var(--border)] bg-red-500/[.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 grid place-items-center text-[color:var(--red)] shrink-0">
                <Icon name="error" size={18} />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[color:var(--text)]">Slot occupied</div>
                <div className="text-[12px] text-[color:var(--muted)] mt-px">
                  <span className="font-mono font-bold text-[color:var(--red)] px-1 rounded">{conflictDialog.slotPos}</span> already has {conflictDialog.incumbent.name}
                </div>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-[13px] text-[color:var(--muted)] leading-relaxed">
                Replace <span className="font-semibold text-[color:var(--text)]">{conflictDialog.incumbent.name}</span> with{' '}
                <span className="font-semibold text-[color:var(--text)]">{conflictDialog.player.name}</span>?{' '}
                {conflictDialog.incumbent.name} will move to the bench.
              </p>
              <button
                onClick={handleConflictReplace}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[.07] cursor-pointer text-left hover:bg-red-500/12 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/15 grid place-items-center text-[color:var(--red)] shrink-0">
                  <Icon name="edit" size={15} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[color:var(--text)]">Replace {conflictDialog.incumbent.name}</div>
                  <div className="text-[11px] text-[color:var(--muted)] mt-px">They'll move to the bench</div>
                </div>
              </button>
              <button
                onClick={() => setConflictDialog(null)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] cursor-pointer text-left hover:border-[color:var(--green)]/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[color:var(--surface3)] grid place-items-center text-[color:var(--muted)] shrink-0">
                  <Icon name="close" size={15} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[color:var(--text)]">Keep {conflictDialog.incumbent.name}</div>
                  <div className="text-[11px] text-[color:var(--muted)] mt-px">Cancel this placement</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign dialog ── */}
      {assignDialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setAssignDialog(null)}
        >
          <div
            className="w-full max-w-[340px] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[color:var(--border)] flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-[14px] border-2
                ${isOnPitch(assignDialog.player.id)
                  ? 'bg-green-500/20 border-green-500/50 text-[color:var(--green)]'
                  : 'bg-[color:var(--surface2)] border-[color:var(--border)] text-[color:var(--text)]'}`}>
                {assignDialog.player.number || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[color:var(--text)] truncate">{assignDialog.player.name}</div>
                <div className="text-[12px] text-[color:var(--muted)] flex items-center gap-1.5 mt-px flex-wrap">
                  <span className="px-1.5 py-px rounded text-[11px] font-bold font-mono border border-[color:var(--border)] bg-[color:var(--surface2)]">
                    {assignDialog.player.naturalPosition}
                  </span>
                  {isOnPitch(assignDialog.player.id)
                    ? <span className="text-[color:var(--green)] flex items-center gap-1 text-[11px]"><Icon name="check" size={11} /> On pitch</span>
                    : assignDialog.player.squadGroup === 'sub'
                      ? <span className="text-[color:var(--blue)] text-[11px]">On bench</span>
                      : <span className="text-[color:var(--muted)] text-[11px]">Not in squad</span>}
                </div>
              </div>
              <button onClick={() => setAssignDialog(null)} className="w-7 h-7 grid place-items-center rounded-lg text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface2)] border-none bg-transparent cursor-pointer transition-colors">
                <Icon name="close" size={15} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2.5">
              <p className="text-[12px] text-[color:var(--muted)] mb-1">
                Assign <span className="font-semibold text-[color:var(--text)]">{assignDialog.player.name}</span>:
              </p>

              {!isOnPitch(assignDialog.player.id) && (
                <button
                  onClick={() => handleAssignAsStarter(assignDialog.player)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-green-500/35 bg-green-500/[.07] cursor-pointer text-left transition-all hover:bg-green-500/12"
                >
                  <div className="w-9 h-9 rounded-lg grid place-items-center bg-green-500/15 text-[color:var(--green)] shrink-0">
                    <Icon name="soccer" size={18} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[color:var(--text)]">Add as Starter</div>
                    <div className="text-[12px] text-[color:var(--muted)] mt-px">Place on pitch at best matching slot</div>
                  </div>
                </button>
              )}

              {assignDialog.player.squadGroup !== 'sub' && !isOnPitch(assignDialog.player.id) && (
                <button
                  onClick={() => handleAssignAsSub(assignDialog.player)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] cursor-pointer text-left transition-all hover:border-blue-500/35 hover:bg-blue-500/[.06]"
                >
                  <div className="w-9 h-9 rounded-lg grid place-items-center bg-[color:var(--surface3)] text-[color:var(--muted)] shrink-0">
                    <Icon name="squad" size={18} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[color:var(--text)]">Add as Substitute</div>
                    <div className="text-[12px] text-[color:var(--muted)] mt-px">On the bench, available for changes</div>
                  </div>
                </button>
              )}

              {isOnPitch(assignDialog.player.id) && (
                <button
                  onClick={() => { removeFromPitch(assignDialog.player.id); setAssignDialog(null); setNotice({ type: 'success', msg: `${assignDialog.player.name} moved to bench.` }); }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-amber-500/25 bg-amber-500/[.06] cursor-pointer text-left transition-all hover:bg-amber-500/10"
                >
                  <div className="w-9 h-9 rounded-lg grid place-items-center bg-amber-500/10 text-amber-400 shrink-0">
                    <Icon name="arrow-down" size={18} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[color:var(--text)]">Move to Bench</div>
                    <div className="text-[12px] text-[color:var(--muted)] mt-px">Remove from pitch, keep in squad</div>
                  </div>
                </button>
              )}

              {(assignDialog.player.squadGroup !== 'unassigned') && (
                <button
                  onClick={() => handleRemoveFromLineup(assignDialog.player)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-500/25 bg-red-500/[.06] cursor-pointer text-left transition-all hover:bg-red-500/10"
                >
                  <div className="w-9 h-9 rounded-lg grid place-items-center bg-red-500/10 text-[color:var(--red)] shrink-0">
                    <Icon name="delete" size={18} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[color:var(--red)]">Remove from Lineup</div>
                    <div className="text-[12px] text-[color:var(--muted)] mt-px">Not in starters or subs</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add player dialog ── */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-[460px] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)] shrink-0">
              <div>
                <div className="text-[15px] font-semibold text-[color:var(--text)]">Add Player</div>
                <div className="text-[12px] text-[color:var(--muted)] mt-px">Added as unassigned — drag to pitch or assign</div>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 grid place-items-center rounded-lg text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface2)] border-none bg-transparent cursor-pointer">
                <Icon name="close" size={15} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              {addErr && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-red-500/25 bg-red-500/[.07] text-[color:var(--red)] text-[13px]">
                  <Icon name="error" size={14} />{addErr}
                </div>
              )}
              <div>
                <label className="block text-[12px] font-medium text-[color:var(--muted)] tracking-[.03em] mb-1.5">Player name *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                  className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--field-bg)] text-[color:var(--text)] text-[14px] outline-none focus:border-[color:var(--green)]/60 transition-colors placeholder:text-[color:var(--faint)]" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[color:var(--muted)] tracking-[.03em] mb-1.5">Jersey number</label>
                <input type="number" value={newNum} onChange={e => setNewNum(e.target.value)} placeholder="e.g. 10"
                  className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--field-bg)] text-[color:var(--text)] text-[14px] outline-none focus:border-[color:var(--green)]/60 transition-colors placeholder:text-[color:var(--faint)]" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[color:var(--muted)] tracking-[.03em] mb-2">
                  Natural position *{newPos && <span className="ml-1.5 text-[color:var(--green)]">— {ALL_POSITIONS.find(p => p.code === newPos)?.label}</span>}
                </label>
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] overflow-hidden divide-y divide-[color:var(--border)]">
                  {POS_GROUPS.map(group => (
                    <div key={group} className="px-3 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold tracking-[.07em] uppercase" style={{ color: POS_GROUP_COLORS[group] }}>
                          {POS_GROUP_LABELS[group]}
                        </span>
                        <div className="flex-1 h-px bg-[color:var(--border)]" />
                      </div>
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
                        {ALL_POSITIONS.filter(p => p.group === group).map(pos => {
                          const sel = newPos === pos.code;
                          return (
                            <button key={pos.code} type="button" onClick={() => setNewPos(pos.code)}
                              className={`flex flex-col items-center px-2 py-2.5 rounded-lg border text-center cursor-pointer transition-all relative
                                ${sel ? 'border-green-500/60 bg-green-500/15 shadow-[0_0_0_1px_rgba(34,197,94,.25)]' : 'border-[color:var(--border)] bg-[color:var(--surface3)] hover:border-green-500/30 hover:bg-[color:var(--hover-glow)]'}`}>
                              {sel && (
                                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[color:var(--green)] grid place-items-center">
                                  <Icon name="check" size={8} className="text-white" />
                                </span>
                              )}
                              <span className={`text-[14px] font-extrabold leading-none font-mono ${sel ? 'text-[color:var(--green)]' : 'text-[color:var(--text)]'}`}>{pos.code}</span>
                              <span className={`text-[9px] leading-tight mt-1 ${sel ? 'text-[color:var(--green)]/75' : 'text-[color:var(--faint)]'}`}>{pos.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 h-10 rounded-lg border border-[color:var(--border)] bg-transparent text-[color:var(--text)] text-[13px] font-medium cursor-pointer hover:border-[color:var(--green)]/40 transition-colors">Cancel</button>
                <button onClick={handleAddPlayer} disabled={!newName.trim() || !newPos}
                  className="flex-[2] h-10 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-medium cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-40">
                  <Icon name="add-circle" size={14} /> Add Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page body ── */}
      <div className="fluid-pad flex flex-col gap-4 pb-10">

        {/* Header */}
        <div className="broadcast-card rounded-lg px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium text-[color:var(--muted)] tracking-[.04em] uppercase mb-0.5">
              {match?.league.name ?? 'Lineup editor'}
            </div>
            <div className="text-[20px] font-semibold tracking-tight text-[color:var(--text)] leading-snug">
              {match?.homeTeam?.name ?? 'Home'} <span className="text-[color:var(--faint)] font-normal">vs</span> {match?.awayTeam?.name ?? 'Away'}
            </div>
            <div className="text-[12px] text-[color:var(--muted)] mt-0.5">
              {match?.date}{match?.time ? ` · ${match.time}` : ''}{match?.stadium ? ` · ${match.stadium}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => router.back()} className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-[13px] cursor-pointer flex items-center gap-1.5 hover:border-[color:var(--green)]/40 transition-colors">
              <Icon name="arrow-back" size={14} /> Back
            </button>
            <button onClick={handleSave} disabled={saving} className="h-9 px-3.5 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity">
              {saving ? <span className="spinner" /> : <Icon name="check" size={14} />}
              Save lineup
            </button>
          </div>
        </div>

        {/* Team tabs */}
        <div className="grid grid-cols-2 gap-2">
          {([true, false] as const).map(home => {
            const t     = home ? match?.homeTeam : match?.awayTeam;
            const pList = home ? homePlayers : awayPlayers;
            const active = isHome === home;
            const isSaved = !!(t?.id && savedTeamIds.has(t.id));
            return (
              <div key={String(home)} className="relative">
                <button onClick={() => handleTeamSwitch(home)}
                  className={`w-full h-13 py-2 rounded-xl border text-[14px] cursor-pointer transition-all font-medium flex flex-col items-center justify-center gap-0.5 px-3
                    ${active ? 'border-green-500/40 bg-green-500/[.09] text-[color:var(--green)]' : 'border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--muted)] hover:border-green-500/20'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-[color:var(--green)]' : 'bg-[color:var(--faint)]'}`} />
                    <span className="truncate">{t?.name ?? (home ? 'Home' : 'Away')}</span>
                  </div>
                  <span className={`text-[10px] font-normal ${active ? 'text-[color:var(--green)]/70' : 'text-[color:var(--faint)]'}`}>
                    {pList.filter(p => p.squadGroup === 'starter').length} starters
                    · {pList.filter(p => p.squadGroup === 'sub').length} subs
                    {pList.filter(p => p.squadGroup === 'unassigned').length > 0 && ` · ${pList.filter(p => p.squadGroup === 'unassigned').length} unassigned`}
                  </span>
                </button>
                {isSaved && t?.id && match?.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShareDialog({ clubId: t.id, matchId: match.id }); }}
                    title={`Share ${t?.name ?? ''} lineup`}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md grid place-items-center bg-[color:var(--surface3)] text-[color:var(--muted)] hover:text-[color:var(--green)] hover:bg-green-500/10 transition-colors cursor-pointer border-none"
                  >
                    <Icon name="share" size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Formation pills */}
        <div>
          <div className="text-[11px] font-medium text-[color:var(--muted)] tracking-[.04em] uppercase mb-2">Formation</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(FORMATIONS).map(f => {
              const active = formation === f;
              return (
                <button key={f} onClick={() => handleFormationChange(f)}
                  className={`h-8 px-3 rounded-md border text-[13px] cursor-pointer transition-all
                    ${active ? 'border-green-500/45 bg-green-500/10 text-[color:var(--green)] font-semibold' : 'border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] font-normal hover:border-green-500/25'}`}>
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main layout grid ── */}
        <div className="lineup-layout-grid grid gap-4 items-start" style={{ gridTemplateColumns: '1fr 300px' }}>

          {/* ── LEFT: Pitch + bench ── */}
          <div className="flex flex-col gap-3">

            {/* Pitch */}
            <div
              className="relative w-full overflow-hidden rounded-xl shadow-[0_6px_28px_rgba(0,0,0,.28)]"
              style={{ paddingBottom: '66%', background: 'linear-gradient(180deg,var(--pitch-top) 0%,var(--pitch-mid) 35%,var(--pitch-mid) 65%,var(--pitch-bot) 100%)' }}
            >
              {/* Field lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 132" preserveAspectRatio="none">
                <rect x="3" y="3" width="194" height="126" fill="none" stroke="rgba(255,255,255,.50)" strokeWidth=".7"/>
                <line x1="100" y1="3" x2="100" y2="129" stroke="rgba(255,255,255,.50)" strokeWidth=".7"/>
                <circle cx="100" cy="66" r="18" fill="none" stroke="rgba(255,255,255,.50)" strokeWidth=".7"/>
                <circle cx="100" cy="66" r="1.2" fill="rgba(255,255,255,.75)"/>
                <rect x="3" y="29" width="28" height="74" fill="none" stroke="rgba(255,255,255,.40)" strokeWidth=".6"/>
                <rect x="3" y="46" width="11" height="40" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".5"/>
                <rect x="0" y="54" width="3" height="24" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.35)" strokeWidth=".4"/>
                <circle cx="20" cy="66" r=".8" fill="rgba(255,255,255,.65)"/>
                <path d="M 31 52 A 13 13 0 0 1 31 80" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".6"/>
                <rect x="169" y="29" width="28" height="74" fill="none" stroke="rgba(255,255,255,.40)" strokeWidth=".6"/>
                <rect x="186" y="46" width="11" height="40" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".5"/>
                <rect x="197" y="54" width="3" height="24" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.35)" strokeWidth=".4"/>
                <circle cx="180" cy="66" r=".8" fill="rgba(255,255,255,.65)"/>
                <path d="M 169 52 A 13 13 0 0 0 169 80" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".6"/>
              </svg>

              {/* Slots */}
              {slots.map((slot, idx) => {
                const player      = getPlayerAtSlot(idx);
                const isHoverTarget = dragOver === idx;
                return (
                  <div
                    key={idx}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(idx)}
                    onClick={() => { if (player) setAssignDialog({ player }); }}
                    className="absolute flex flex-col items-center gap-1 z-[2] select-none"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      transform: 'translate(-50%,-50%)',
                      cursor: player ? 'pointer' : 'default',
                    }}
                  >
                    <div
                      className="w-[44px] h-[44px] rounded-full flex flex-col items-center justify-center transition-all"
                      style={{
                        background: player
                          ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
                          : isHoverTarget
                            ? 'rgba(34,197,94,.25)'
                            : 'rgba(255,255,255,.10)',
                        border: `2px solid ${
                          player
                            ? 'rgba(255,255,255,.75)'
                            : isHoverTarget
                              ? 'rgba(34,197,94,.80)'
                              : 'rgba(255,255,255,.28)'
                        }`,
                        boxShadow: player ? '0 3px 10px rgba(0,0,0,.40)' : isHoverTarget ? '0 0 0 4px rgba(34,197,94,.15)' : 'none',
                        transform: isHoverTarget ? 'scale(1.12)' : 'scale(1)',
                      }}
                    >
                      {player ? (
                        <>
                          <span className="text-[8px] font-semibold leading-none font-mono text-blue-200">{player.naturalPosition}</span>
                          <span className="text-[14px] font-bold leading-none text-white font-mono">#{player.number}</span>
                        </>
                      ) : (
                        <span className="text-[10px] font-semibold text-white/40">{slot.pos}</span>
                      )}
                    </div>
                    {player && (
                      <div className="text-[10px] font-semibold text-white max-w-[64px] text-center truncate leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>
                        {player.name.split(' ').pop()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Bench (subs only — explicit squad group) ── */}
            <div className="broadcast-card rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <span className="text-[11px] font-semibold text-[color:var(--muted)] tracking-[.04em] uppercase">Substitutes bench</span>
                  <span className="text-[11px] font-medium text-[color:var(--faint)] ml-2">{subs.length} players</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {subs.map(p => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(p.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setAssignDialog({ player: p })}
                    className="w-12 h-14 rounded-xl bg-[color:var(--surface2)] border border-[color:var(--border)] flex flex-col items-center justify-center cursor-pointer gap-px px-1 select-none hover:border-[color:var(--blue)]/40 hover:bg-blue-500/[.05] transition-all"
                  >
                    <span className="text-[12px] font-bold text-[color:var(--text)] font-mono leading-none">#{p.number}</span>
                    <span className="text-[9px] text-[color:var(--muted)] text-center leading-tight truncate w-full px-0.5">{p.name.split(' ').pop()}</span>
                    <span className="text-[9px] font-bold text-[color:var(--blue)] font-mono">{p.naturalPosition}</span>
                  </div>
                ))}
                {subs.length === 0 && (
                  <span className="text-[13px] text-[color:var(--faint)] py-1.5 italic">No subs assigned</span>
                )}
              </div>
            </div>

            {/* ── Unassigned players (separate card, clearly outside match squad) ── */}
            {unassigned.length > 0 && (
              <div className="broadcast-card rounded-xl p-3.5 border-dashed border-[color:var(--border)] opacity-80">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <span className="text-[11px] font-semibold text-[color:var(--faint)] tracking-[.04em] uppercase">Not in squad</span>
                    <span className="text-[11px] font-medium text-[color:var(--faint)] ml-2">{unassigned.length} players</span>
                  </div>
                  <span className="text-[10px] text-[color:var(--faint)] italic">Drag to pitch or tap to add</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {unassigned.map(p => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(p.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setAssignDialog({ player: p })}
                      className="w-12 h-14 rounded-xl bg-[color:var(--surface3)] border border-dashed border-[color:var(--border)] flex flex-col items-center justify-center cursor-pointer gap-px px-1 select-none hover:border-[color:var(--green)]/30 hover:bg-[color:var(--hover-glow)] transition-all opacity-70 hover:opacity-100"
                    >
                      <span className="text-[12px] font-bold text-[color:var(--muted)] font-mono leading-none">#{p.number}</span>
                      <span className="text-[9px] text-[color:var(--faint)] text-center leading-tight truncate w-full px-0.5">{p.name.split(' ').pop()}</span>
                      <span className="text-[9px] font-bold text-[color:var(--muted)] font-mono">{p.naturalPosition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Player list ── */}
          <div className="flex flex-col gap-3">
            <div className="broadcast-card rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[13px] font-semibold text-[color:var(--text)]">{team?.name ?? 'Squad'}</div>
                  <div className="text-[11px] text-[color:var(--muted)] mt-px flex items-center gap-1.5 flex-wrap">
                    <span className="text-[color:var(--green)]">{starters.length} starters</span>
                    <span className="text-[color:var(--blue)]">· {subs.length} subs</span>
                    {unassigned.length > 0 && <span className="text-[color:var(--faint)]">· {unassigned.length} unassigned</span>}
                  </div>
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  className="h-8 px-2.5 rounded-lg border border-green-500/35 bg-green-500/[.08] text-[color:var(--green)] text-[12px] font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-green-500/15 transition-colors"
                >
                  <Icon name="add-circle" size={13} /> Add
                </button>
              </div>

              <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 500 }}>
                {players.length === 0 && (
                  <div className="text-center py-8 text-[13px] text-[color:var(--faint)]">
                    <Icon name="squad" size={32} className="mx-auto mb-2 opacity-40" />
                    No players found
                  </div>
                )}

                {/* Sorted: starters → subs → unassigned */}
                {[...players]
                  .sort((a, b) => {
                    const rank = (g: SquadGroup) => g === 'starter' ? 0 : g === 'sub' ? 1 : 2;
                    return rank(a.squadGroup) - rank(b.squadGroup);
                  })
                  .map(p => {
                    const onPitch       = isOnPitch(p.id);
                    const isStarter     = p.squadGroup === 'starter';
                    const isSub         = p.squadGroup === 'sub';
                    const isUnassigned  = p.squadGroup === 'unassigned';
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => handleDragStart(p.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setAssignDialog({ player: p })}
                        className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer select-none transition-all
                          ${onPitch
                            ? 'bg-green-500/[.08] border border-green-500/30 hover:bg-green-500/12'
                            : isSub
                              ? 'bg-blue-500/[.05] border border-blue-500/20 hover:border-blue-500/30 hover:bg-blue-500/[.08]'
                              : isUnassigned
                                ? 'bg-[color:var(--surface2)] border border-dashed border-[color:var(--border)] hover:border-[color:var(--border)] hover:bg-[color:var(--hover-glow)] opacity-60 hover:opacity-100'
                                : 'bg-[color:var(--surface2)] border border-[color:var(--border)] hover:bg-[color:var(--hover-glow)]'}`}
                      >
                        {/* Jersey avatar */}
                        <div className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-[13px] border-2
                          ${onPitch
                            ? 'bg-green-500/25 text-[color:var(--green)] border-green-500/50 ring-2 ring-green-500/30'
                            : isStarter
                              ? 'bg-green-500/15 text-[color:var(--green)] border-green-500/30'
                              : isSub
                                ? 'bg-blue-500/15 text-[color:var(--blue)] border-blue-500/30'
                                : 'bg-[color:var(--surface3)] text-[color:var(--faint)] border-[color:var(--border)]'}`}>
                          {p.number || '—'}
                          {onPitch && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[color:var(--green)] border-2 border-[color:var(--surface)] grid place-items-center">
                              <Icon name="check" size={7} className="text-white" />
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <div className="text-[13px] font-medium text-[color:var(--text)] truncate leading-snug">{p.name} </div>
                           {p.role.toLowerCase() =="captain" && (<span className={`text-[14px] font-bold px-1.5 py-px rounded border font-mono
                              ${'text-[color:var(--green)] border-black-500/25 bg-black-500/25'}`}>
                              C
                            </span>)}
                           
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-px rounded border font-mono
                              ${onPitch
                                ? 'text-[color:var(--green)] border-green-500/35 bg-green-500/10'
                                : isStarter
                                  ? 'text-[color:var(--green)] border-green-500/25 bg-green-500/[.06]'
                                  : isSub
                                    ? 'text-[color:var(--blue)] border-blue-500/25 bg-blue-500/[.06]'
                                    : 'text-[color:var(--faint)] border-[color:var(--border)] bg-[color:var(--surface3)]'}`}>
                              {p.naturalPosition}
                            </span>
                            <span className="text-[10px] text-[color:var(--faint)]">#{p.number || '—'}</span>
                          </div>
                        </div>

                        {/* Squad badge */}
                        <div className="shrink-0">
                          {isStarter ? (
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold leading-none
                              ${onPitch
                                ? 'bg-green-500/20 border-green-500/50 text-[color:var(--green)]'
                                : 'bg-green-500/10 border-green-500/25 text-[color:var(--green)]/80'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${onPitch ? 'bg-[color:var(--green)]' : 'bg-[color:var(--green)]/60'}`} />
                              Starter
                            </span>
                          ) : isSub ? (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 text-[10px] font-bold text-[color:var(--blue)] leading-none">
                              <span className="text-[9px]">↕</span>
                              Sub
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[color:var(--surface3)] border border-dashed border-[color:var(--border)] text-[10px] font-medium text-[color:var(--faint)] leading-none">
                              Club
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Lineup summary */}
            <div className="broadcast-card rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-[color:var(--muted)] tracking-[.04em] uppercase mb-3">Lineup summary</div>
              {[
                { label: 'On pitch (XI)',   value: `${filledSlots} / ${totalSlots}`, color: filledSlots === totalSlots ? 'var(--green)' : 'var(--text)' },
                { label: 'Match starters',  value: String(starters.length),           color: 'var(--green)' },
                { label: 'Match subs',      value: String(subs.length),               color: 'var(--blue)' },
                { label: 'Unassigned',      value: String(unassigned.length),          color: 'var(--faint)' },
                { label: 'Formation',       value: formation,                          color: 'var(--text)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-[color:var(--border2)] last:border-0">
                  <span className="text-[12px] text-[color:var(--muted)]">{label}</span>
                  <span className="text-[13px] font-semibold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {shareDialog && (
        <ShareLineupDialog
          matchId={shareDialog.matchId}
          clubId={shareDialog.clubId}
          onClose={() => setShareDialog(null)}
        />
      )}
    </PageShell>
  );
}
// ─── Share lineup dialog ───────────────────────────────────────────────────
function ShareLineupDialog({ matchId, clubId, onClose }: {
  matchId: string; clubId: string; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BroadcasterOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<BroadcasterOption | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchBroadcasters(query.trim());
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const handleShare = async () => {
    if (!selected) return;
    setSending(true);
    setError('');
    try {
      await shareLineup(matchId, clubId, selected.id);
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Could not share this lineup. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-4 rounded-xl broadcast-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)]">
          <div className="text-[15px] font-semibold text-[color:var(--text)]">Share lineup</div>
          <button onClick={onClose} className="w-7 h-7 rounded-md grid place-items-center text-[color:var(--muted)] hover:text-[color:var(--text)] cursor-pointer border-none bg-transparent">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/15 grid place-items-center mx-auto mb-3">
                <Icon name="check" size={22} />
              </div>
              <div className="text-[14px] font-medium text-[color:var(--text)] mb-1">
                Lineup shared with {selected?.name}.
              </div>
              <p className="text-[12px] text-[color:var(--muted)] mb-4">
                They'll see it on their Shared lineups page and can import it into one of their own matches.
              </p>
              <button onClick={onClose} className="h-9 px-4 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-medium cursor-pointer">
                Done
              </button>
            </div>
          ) : (
            <>
              <label className="block text-[12px] text-[color:var(--muted)] mb-1.5">Search broadcasters by name or email</label>
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                placeholder="e.g. jane@stream.co"
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[13px] text-[color:var(--text)] outline-none focus:border-green-500/40"
              />

              <div className="mt-3 max-h-56 overflow-y-auto flex flex-col gap-1.5">
                {searching && (
                  <div className="text-[12px] text-[color:var(--muted)] py-3 text-center">Searching…</div>
                )}
                {!searching && query.trim() && results.length === 0 && (
                  <div className="text-[12px] text-[color:var(--muted)] py-3 text-center">No broadcasters found.</div>
                )}
                {results.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className={[
                      'flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                      selected?.id === b.id
                        ? 'border-green-500/45 bg-green-500/[.07]'
                        : 'border-[color:var(--border)] bg-[color:var(--surface2)] hover:border-green-500/25',
                    ].join(' ')}
                  >
                    <div>
                      <div className="text-[13px] font-medium text-[color:var(--text)]">{b.name}</div>
                      <div className="text-[11px] text-[color:var(--muted)]">{b.email}</div>
                    </div>
                    {selected?.id === b.id && <Icon name="check" size={14} />}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/[.08] px-3 py-2 text-[12px] text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleShare}
                disabled={!selected || sending}
                className="mt-4 w-full h-10 rounded-lg border-none bg-[color:var(--green)] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? <span className="spinner" /> : <Icon name="share" size={14} />}
                {selected ? `Share with ${selected.name}` : 'Select a broadcaster'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
