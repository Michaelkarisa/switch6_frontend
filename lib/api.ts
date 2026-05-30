const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/v1';

// ─────────────────────────────────────────────────────────────────────────────
// Auth token
// ─────────────────────────────────────────────────────────────────────────────
let AUTH_TOKEN: string | null = null;

export function setAuthToken(token: string | null) {
  AUTH_TOKEN = token;
  if (typeof window !== 'undefined') {
     const isDev = process.env.NODE_ENV === 'development';
      document.cookie = `switch6-token=${token}; path=/; SameSite=Lax${isDev ? '' : '; Secure'}`;
    if (token) localStorage.setItem('switch6-token', token);
    else        localStorage.removeItem('switch6-token');
  }
}


export function setRoleCookie(role: string) {
  if (typeof window !== 'undefined') {
    const isDev = process.env.NODE_ENV === 'development';
    document.cookie = `switch6-role=${role}; path=/; SameSite=Lax${isDev ? '' : '; Secure'}`;
    // ✅ Save for all roles (or remove the condition entirely)
    localStorage.setItem('switch6-role', role);
  }
}

export function getAuthToken(): string | null {
  if (AUTH_TOKEN) return AUTH_TOKEN;
  if (typeof window !== 'undefined') return localStorage.getItem('switch6-token');
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role constants
// ─────────────────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:       'admin',
  SUPERADMIN:  'superadmin',
  BROADCASTER: 'broadcaster',
  ADVERTISER:  'advertiser',
} as const;
export type Role = typeof ROLES[keyof typeof ROLES];

// ─────────────────────────────────────────────────────────────────────────────
// Backend response envelope
// { success, message, data, meta? }
// ─────────────────────────────────────────────────────────────────────────────
interface Envelope<T = unknown> {
  success: boolean;
  message: string;
  data:    T;
  meta?:   Record<string, unknown>;
  errors?: unknown;
}

// Paginated response shape from Api::paginated()
export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page:     number;
    total:        number;
    last_page:    number;
    from:         number | null;
    to:           number | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain types — matched exactly to backend model fields
// ─────────────────────────────────────────────────────────────────────────────

/** AuthService::userPayload() */
export interface UserData {
  id:      string;
  name:    string;
  email:   string;
  phone?:  string;
  role:    string;          // legacy single-role string
  roles:   string[];        // Spatie getRoleNames()
  status:  string;
  camera?: number;
  api_token?: string;       // kept for legacy compat — token is in meta.token
}

/** MatchFormatterService::format() */
export interface MatchData {
  id:         string;
  league:     string;          // league.leaguename or league.name
  date:       string;          // Y-m-d
  time:       string;          // H:i
  stadium:    string;          // venue field
  status:     'scheduled' | 'live' | 'finished' | 'cancelled';
  viewers:    number;
  camera:     number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;  // soft-delete timestamp
  author: {
    id:     string;
    name:   string;
    email:  string;
    phone:  string;
    camera: number;
  };
  referee: {
    id:    string;
    name:  string;
    phone: string;
  };
  homeTeam: TeamData;
  awayTeam: TeamData;
}

export interface TeamData {
  id:              string;  // club uuid
  name:            string;
  formation:       string;
  urlA?:           string;  // homeTeam logo_url
  urlB?:           string;  // awayTeam logo_url
  color?:          string | null;
  goals:           number;  // home_score / away_score cast to int
  startingPlayers: PlayerData[];
  substitutes:     PlayerData[];
}

/** MatchFormatterService::players() */
export interface PlayerData {
  id:        string;
  name:      string;
  number?:   number;        // jersey_number
  position?: string;
  team:      string;        // club.name
  lineup_id: string;
}

export interface Club {
  id:           string;
  name:         string;
  city?:        string;
  stadium?:     string;
  logo_url?:    string;
  jersey_color?: string;
  players?:     ClubPlayer[];
}

export interface ClubPlayer {
  id:             string;
  name:           string;
  position?:      string;
  jersey_number?: number;
  age?:           number;
  nationality?:   string;
  market_value?:  number;
  club_id:        string;
}

export interface Referee {
  id:    string;
  name:  string;
  phone?: string;
}

export interface League {
  id:          string;
  name?:       string;
  leaguename?: string;      // primary field
  type?:       string;
}

/** Plan model */
export interface PlanData {
  id:                 string;
  name:               string;
  slug:               string;
  description:        string | null;
  price_kes:          number;
  duration_days:      number;
  max_matches:        number | null;
  max_streams:        number | null;
  ads_enabled:        boolean;
  analytics_enabled:  boolean;
  is_active:          boolean;
  features:           Record<string, boolean> | null;
  most_popular?:      boolean;
  created_at?:        string;
  deleted_at?:        string | null;  // soft-delete timestamp
}

/** UserPlanSubscription model */
export interface SubscriptionData {
  id:                     string;
  user_id:                string;
  plan_id:                string;
  plan?:                  PlanData;
  user?:                  Pick<AdminUserData, 'id' | 'name' | 'email'>;
  status:                 'active' | 'expired' | 'cancelled' | 'grace';
  starts_at:              string;
  expires_at:             string;
  cancelled_at:           string | null;
  expiry_warning_sent_at: string | null;
  payment_id:             string | null;
  created_at?:            string;
}

/** Advertisement model */
export interface AdvertisementData {
  id:            string;
  title:         string;
  file_type:     'image' | 'video';
  file_path:     string;
  duration:      number;
  period:        string | null;
  end_date:      string | null;
  status:        'active' | 'paused' | 'expired' | 'pending';
  target_tags:   string[] | null;
  user_id?:      string;
  alt_text?:     string | null;
  events_count?: number;
  created_at?:   string;
  deleted_at?:   string | null;  // soft-delete timestamp
}

/** AdvertisementAnalyticsService::summary() */
export interface AdAnalyticsData {
  impressions:   number;    // event_type = 'injected'
  plays:         number;    // event_type = 'played'
  completed:     number;    // event_type = 'completed'
  // admin analytics returns richer shape:
  advertisement_id?:  string;
  title?:             string;
  total_events?:      number;
  total_play_time?:   number;
  avg_viewers?:       number;
  by_period?:         Record<string, number>;
  by_platform?:       Record<string, number>;
}

/** AdPayment model */
export interface AdPaymentData {
  id:               string;
  advertisement_id: string;
  user_id:          string;
  amount_kes:       number;
  currency:         string;
  payment_method:   'mpesa' | 'card' | 'bank_transfer';
  mpesa_reference:  string | null;
  transaction_code: string | null;
  status:           'pending' | 'completed' | 'failed' | 'refunded';
  paid_at:          string | null;
  notes:            string | null;
  metadata:         Record<string, unknown> | null;
}

/** Admin paginated user */
export interface AdminUserData extends UserData {
  matches_count?:       number;
  subscriptions_count?: number;
  created_at?:          string;
  updated_at?:          string;
  deleted_at?:          string | null;  // soft-delete timestamp
  last_login_at?:       string | null;
}

/** AdminAnalyticsService::dashboard() */
export interface AdminDashboardData {
  users: {
    total: number; active: number; suspended: number;
    new_today: number; new_7_days: number;
  };
  matches: {
    total: number; live: number; scheduled: number;
    finished: number; today: number;
  };
  subscriptions: {
    active_total: number; expiring_7_days: number;
    by_plan: { plan: string; active: number }[];
  };
  revenue: {
    total_kes: number; today_kes: number; month_kes: number; transactions: number;
  };
  system: {
    audit_logs_today: number; failed_jobs: number;
    pending_jobs: number; cache_driver: string; queue_driver: string;
  };

}
// ─────────────────────────────────────────────────────────────────────────────
// Admin-specific typed responses
// ─────────────────────────────────────────────────────────────────────────────

/** AdminAdvertisementService::revenueBreakdown() */
export interface AdminRevenueData {
  total_kes:       number;
  today_kes:       number;
  month_kes:       number; // ← added to match UI (aligns with `this_month_kes` from backend)
  transactions:    number; // ← added (used in the Revenue summary table)
  by_method:       { payment_method: string; total: number; count: number }[];
  pending_total:   number;
  pending_count:   number;
  sparkline:       { date: string; total_kes: number }[]; // ← added for the 14-day trend chart
}

/** AdminSystemController::health() */
export interface SystemHealthData {
  app:      Record<string, string | number | boolean>;
  database: Record<string, string | number | boolean>;
  cache:    { status: string; driver: string; error?: string };
  queue:    { driver: string; pending: number; failed: number; after_commit: boolean | null };
}

/** Failed job row from DB */
export interface FailedJob {
  id:         number;
  uuid:       string;
  connection: string;
  queue:      string;
  payload:    string;
  exception:  string;
  failed_at:  string;
}

/** Audit log row */
export interface AuditLogRow {
  id:           string;
  user_id:      string | null;
  action:       string;
  module:       string | null;
  reference_id: string | null;
  description:  string | null;
  ip_address:   string | null;
  user_agent:   string | null;
  metadata:     Record<string, unknown> | null;
  created_at:   string;
  user?:        { id: string; name: string; email: string };
}

/** Revenue over time row */
export interface RevenueRow {
  date:         string;
  total_kes:    number;
  transactions: number;
}

/** User growth row */
export interface UserGrowthRow {
  date:      string;
  new_users: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// UserPrefs — persists user + token in localStorage
// ─────────────────────────────────────────────────────────────────────────────
export const UserPrefs = {
  save(user: UserData) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('switch6-user', JSON.stringify(user));
  },
  get(): UserData | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('switch6-user');
      return raw ? (JSON.parse(raw) as UserData) : null;
    } catch { return null; }
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('switch6-user');
    setAuthToken(null);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Role helpers
// ─────────────────────────────────────────────────────────────────────────────
export function getUserRole(): string | null {
  const user = UserPrefs.get();
  if (!user) return null;
  // Prefer Spatie roles[] array; fall back to legacy role string
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles[0];
  return user.role ?? null;
}

export function hasRole(...roles: string[]): boolean {
  const user = UserPrefs.get();
  if (!user) return false;
  const userRoles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(user.role ? [user.role] : []),
  ];
  return roles.some(r => userRoles.includes(r));
}

export function isAdmin():       boolean { return hasRole(ROLES.ADMIN, ROLES.SUPERADMIN); }
export function isBroadcaster(): boolean { return hasRole(ROLES.BROADCASTER); }
export function isAdvertiser():  boolean { return hasRole(ROLES.ADVERTISER); }

export function roleDashboard(): string {
  const user = UserPrefs.get();
  console.log("userData local: ",user);
  if (isAdmin())      return '/admin';
  if (isAdvertiser()) return '/advertisement';
  return '/dashboard';
}

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency key
// ─────────────────────────────────────────────────────────────────────────────
function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch
// Response envelope: { success, message, data, meta? }
// Token lives in meta.token on login/register; data = user object
// ─────────────────────────────────────────────────────────────────────────────
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  requireAuth = false,
): Promise<{ data: T; meta: Record<string, unknown> }> {

  const method     = (options.method ?? 'GET').toUpperCase();
  const isWrite    = ['POST', 'PUT', 'PATCH'].includes(method);
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (!isFormData) headers['Content-Type'] = 'application/json';

  if (requireAuth) {
    const token = getAuthToken();

    if (!token) {
      console.error('[API REQUEST ERROR] Missing auth token');
      throw new Error('Authentication required — please log in');
    }

    headers['Authorization'] = `Bearer ${token}`;
  }

  if (isWrite) headers['Idempotency-Key'] = idempotencyKey();

  const body: BodyInit | undefined = options.body instanceof FormData
    ? options.body
    : options.body !== undefined
      ? (typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body))
      : undefined;

  const url = `${BASE_URL}${path}`;

  // REQUEST LOG
  console.groupCollapsed(`📤 API REQUEST → ${method} ${url}`);
  console.log('Method:', method);
  console.log('URL:', url);
  console.log('Headers:', headers);

  if (options.body instanceof FormData) {
    console.log('Body: FormData');
    for (const [key, value] of options.body.entries()) {
      console.log(`${key}:`, value);
    }
  } else {
    console.log('Body:', body ? JSON.parse(body as string) : null);
  }

  console.groupEnd();

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  let envelope: Envelope<T> | null = null;

  try {
    envelope = await res.json();
  } catch {
    envelope = null;
  }

  // RESPONSE LOG
  console.groupCollapsed(`📥 API RESPONSE ← ${method} ${url}`);
  console.log('Status:', res.status);
  console.log('OK:', res.ok);
  console.log('Response:', envelope);
  console.groupEnd();

  if (!res.ok) {
    const msg = envelope?.message ?? `HTTP ${res.status}`;

    console.error('❌ API ERROR:', {
      method,
      url,
      status: res.status,
      message: msg,
      response: envelope,
    });

    throw new Error(msg);
  }

  return {
    data: envelope?.data as T,
    meta: (envelope?.meta ?? {}) as Record<string, unknown>,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// Login/register: data = UserData, meta.token = string
// ─────────────────────────────────────────────────────────────────────────────
export async function loginUser(payload: { email: string; password: string }): Promise<UserData> {
  const { data, meta } = await apiFetch<UserData>('/auth/login', {
    method: 'POST', body: JSON.stringify(payload),
  });

  // token is in meta.token per AuthController
  const token = (meta.token ?? data?.api_token) as string | undefined;
  if (token) setAuthToken(token);
if (data.role) {
    setRoleCookie(data.role);
  }
  UserPrefs.save(data);
  return data;
}

export async function registerUser(payload: {
  name: string; email: string; phone: string; password: string; role: string;
}): Promise<UserData> {
  const { data, meta } = await apiFetch<UserData>('/auth/register', {
    method: 'POST', body: JSON.stringify(payload),
  });

  const token = (meta.token ?? data?.api_token) as string | undefined;
  if (token) setAuthToken(token);
if (data.role) {
    setRoleCookie(data.role);
  }
  UserPrefs.save(data);
  return data;
}

export async function logoutUser(): Promise<void> {
  try { await apiFetch('/auth/logout', { method: 'POST' }, true); } catch {}
  finally { UserPrefs.clear(); }
}

export async function changePassword(payload: {
  old_password: string; new_password: string;
}): Promise<void> {
  await apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Matches
// GET /matches → data = Record<uuid, MatchData> (mapWithKeys)
// GET /matches/{id} → data = MatchData
// ─────────────────────────────────────────────────────────────────────────────
export async function getMatches(): Promise<MatchData[]> {
  const { data } = await apiFetch<Record<string, MatchData>>('/matches');
  return Object.values(data ?? {});
}

export async function getMatchById(id: string): Promise<MatchData> {
  const { data } = await apiFetch<MatchData>(`/matches/${id}`);
  if (!data?.id) throw new Error('Match not found');
  return data;
}

export async function getMatchesByAuthorId(authorId: string): Promise<Record<string, MatchData>> {
  const { data } = await apiFetch<Record<string, MatchData>>(`/mymatches/${authorId}`);
  // data is mapWithKeys → Record<uuid, MatchData>
  return data ?? {};
}

export async function getLiveMatches(): Promise<MatchData[]> {
  const { data } = await apiFetch<Record<string, MatchData>>('/matches/live');
  return Object.values(data ?? {});
}

export async function getUpcomingMatches(): Promise<MatchData[]> {
  const { data } = await apiFetch<Record<string, MatchData>>('/matches/upcoming');
  return Object.values(data ?? {});
}

export async function getCompletedMatches(): Promise<MatchData[]> {
  const { data } = await apiFetch<Record<string, MatchData>>('/matches/completed');
  return Object.values(data ?? {});
}

export interface MatchPayload {
  // Club & league
  home_club_id?:    string;
  away_club_id?:    string;
  league_id?:       string;
  leagueid?:        string;       // alias used by create form
  // Author
  authorid?:        string;
  author_id?:       string;
  // Referee
  referee_id?:      string;
  referee?:         string;       // alias used by create form
  // Scheduling
  date?:            string;       // Y-m-d
  time?:            string;       // H:i
  match_date?:      string;       // ISO datetime alias used by create form
  venue?:           string;
  // Score
  home_score?:      number;
  away_score?:      number;
  // Meta
  status?:          MatchData['status'];
  camera?:          number;
  home_formation?:  string;
  away_formation?:  string;
  // Extra pass-through
  [key: string]:    unknown;
}

export interface UpdateMatchPayload {
  status?:     MatchData['status'];
  venue?:      string;
  date?:       string;
  time?:       string;
  home_score?: number;
  away_score?: number;
  camera?:     number;
}

export async function addMatch(payload: MatchPayload | Record<string, unknown>): Promise<MatchData> {
  // POST /matches → data = formatted match (MatchData), meta.match_id
  const { data } = await apiFetch<MatchData>('/matches', {
    method: 'POST', body: JSON.stringify(payload),
  }, true);
  return data;
}

export async function updateMatch(matchId: string, payload: UpdateMatchPayload | Record<string, unknown>): Promise<MatchData> {
  const { data } = await apiFetch<MatchData>(`/matches/${matchId}`, {
    method: 'PUT', body: JSON.stringify(payload),
  }, true);
  return data;
}

export async function updateMatchStatus(matchId: string, status: string): Promise<void> {
  await apiFetch(`/matches/${matchId}/status`, {
    method: 'POST', body: JSON.stringify({ status }),
  }, true);
}

export async function deleteMatch(matchId: string): Promise<void> {
  await apiFetch(`/delete-matches/${matchId}`, { method: 'DELETE' }, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Clubs
// GET /clubs → data = Club[]  (with players eager-loaded)
// GET /club/{identifier} → data = Club
// ─────────────────────────────────────────────────────────────────────────────
export async function getClubs(search?: string): Promise<Club[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data } = await apiFetch<Club[]>(`/clubs${qs}`);
  return Array.isArray(data) ? data : [];
}

export async function searchClubs(q: string): Promise<Club[]> {
  return getClubs(q);
}

export async function getClub(identifier: string): Promise<Club> {
  const { data } = await apiFetch<Club>(`/club/${encodeURIComponent(identifier)}`);
  return data;
}

export async function getPlayersByClub(clubId: string): Promise<ClubPlayer[]> {
  const club = await getClub(clubId);
  return club.players ?? [];
}

export async function addClub(payload: unknown): Promise<Club> {
  const { data } = await apiFetch<Club>('/clubs', { method: 'POST', body: JSON.stringify(payload) }, true);
  return data;
}

export async function deleteClub(clubId: string): Promise<void> {
  await apiFetch(`/clubs/${clubId}`, { method: 'DELETE' }, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Players
// ─────────────────────────────────────────────────────────────────────────────
export async function addPlayer(payload: unknown): Promise<ClubPlayer> {
  const { data } = await apiFetch<ClubPlayer>('/players', {
    method: 'POST', body: JSON.stringify(payload),
  }, true);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leagues
// GET /leagues → data = League[]
// ─────────────────────────────────────────────────────────────────────────────
export async function getLeagues(search?: string): Promise<League[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data } = await apiFetch<League[]>(`/leagues${qs}`);
  return Array.isArray(data) ? data : [];
}

export async function searchLeagues(q: string): Promise<League[]> {
  return getLeagues(q);
}

export async function addLeague(payload: unknown): Promise<League> {
  const { data } = await apiFetch<League>('/league', { method: 'POST', body: JSON.stringify(payload) }, true);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Referees
// GET /referees → data = Referee[]
// ─────────────────────────────────────────────────────────────────────────────
export async function getReferees(search?: string): Promise<Referee[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data } = await apiFetch<Referee[]>(`/referees${qs}`);
  return Array.isArray(data) ? data : [];
}

export async function searchReferees(q: string): Promise<Referee[]> {
  return getReferees(q);
}

export async function addReferee(payload: unknown): Promise<Referee> {
  const { data } = await apiFetch<Referee>('/referee', { method: 'POST', body: JSON.stringify(payload) }, true);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lineups
// GET /lineups/by-match/{match} → data = Lineup[] (raw model with player+club eager)
// POST /lineups → data = Lineup[]
// ─────────────────────────────────────────────────────────────────────────────
export interface LineupRow {
  id:         string;
  match_id:   string;
  player_id:  string;
  club_id:    string;
  position:   string;
  is_starter: boolean;
  minute_in?: number | null;
  minute_out?: number | null;
  player?: ClubPlayer;
  club?:   Club;
}

export async function getLineupsByMatch(matchId: string): Promise<LineupRow[]> {
  const { data } = await apiFetch<LineupRow[]>(`/lineups/by-match/${matchId}`);
  return Array.isArray(data) ? data : [];
}

export async function addLineups(items: Record<string, unknown>[]): Promise<LineupRow[]> {
  const { data } = await apiFetch<LineupRow[]>('/lineups', {
    method: 'POST', body: JSON.stringify(items),
  }, true);
  return Array.isArray(data) ? data : [];
}

export async function deleteLineupsByMatch(matchId: string): Promise<void> {
  await apiFetch(`/lineups/by-match/${matchId}`, { method: 'DELETE' }, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Plans & Subscriptions
// GET /plans → data = Plan[]
// POST /plans/{plan}/subscribe → data = SubscriptionData, meta.subscription_id, meta.expires_at
// GET /subscriptions/current → data = SubscriptionData | null
// GET /subscriptions/history → data = SubscriptionData[]
// DELETE /subscriptions/{id} → data = SubscriptionData
// ─────────────────────────────────────────────────────────────────────────────
export async function getPlans(): Promise<PlanData[]> {
  const { data } = await apiFetch<PlanData[]>('/plans');
  return Array.isArray(data) ? data : [];
}

export async function getPlan(planId: string): Promise<PlanData> {
  const { data } = await apiFetch<PlanData>(`/plans/${planId}`);
  return data;
}

export async function subscribeToPlan(planId: string, paymentId?: string): Promise<SubscriptionData> {
  const { data } = await apiFetch<SubscriptionData>(`/plans/${planId}/subscribe`, {
    method: 'POST', body: JSON.stringify({ payment_id: paymentId ?? null }),
  }, true);
  return data;
}

export async function cancelSubscription(subscriptionId: string): Promise<SubscriptionData> {
  const { data } = await apiFetch<SubscriptionData>(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  }, true);
  return data;
}

export async function getCurrentSubscription(): Promise<SubscriptionData | null> {
  const { data } = await apiFetch<SubscriptionData | null>('/subscriptions/current', {}, true);
  return data;
}

export async function getSubscriptionHistory(): Promise<SubscriptionData[]> {
  const { data } = await apiFetch<SubscriptionData[]>('/subscriptions/history', {}, true);
  return Array.isArray(data) ? data : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Advertisements
// GET /ads → data = AdvertisementData[]
// POST /ads → data = AdvertisementData, meta.advertisement_id
// GET /ads/{id} → data = AdvertisementData
// DELETE /ads/{id} → data = null
// GET /ads/{id}/analytics → data = AdAnalyticsData (impressions/plays/completed)
// GET /ads/select → data = AdvertisementData | null
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdvertisements(): Promise<AdvertisementData[]> {
  const { data } = await apiFetch<AdvertisementData[]>('/ads', {}, true);
  return Array.isArray(data) ? data : [];
}

// FormData fields: title, file_type, file (binary), duration, period?, status?, alt_text?
export async function createAdvertisement(payload: FormData): Promise<AdvertisementData> {
  const { data } = await apiFetch<AdvertisementData>('/ads', {
    method: 'POST', body: payload,
  }, true);
  return data;
}

export async function getAdvertisement(id: string): Promise<AdvertisementData> {
  const { data } = await apiFetch<AdvertisementData>(`/ads/${id}`, {}, true);
  return data;
}

export async function deleteAdvertisement(id: string): Promise<void> {
  await apiFetch(`/ads/${id}`, { method: 'DELETE' }, true);
}

export async function getAdvertisementAnalytics(id: string): Promise<AdAnalyticsData> {
  // Route: GET /v1/ads/{advertisement}/analytics → AdvertisementAnalyticsController::show()
  // Returns: { impressions, plays, completed }
  const { data } = await apiFetch<AdAnalyticsData>(`/ads/${id}/analytics`, {}, true);
  return data;
}

export async function getAdvertisementForStream(params?: {
  league?: string; match_id?: string; period?: string;
}): Promise<AdvertisementData | null> {
  const qs = new URLSearchParams();
  if (params?.league)   qs.append('league', params.league);
  if (params?.match_id) qs.append('match_id', params.match_id);
  if (params?.period)   qs.append('period', params.period);
  const { data } = await apiFetch<AdvertisementData | null>(`/ads/select?${qs.toString()}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ad Payments
// POST /ads/{advertisement}/payments → data = AdPaymentData, meta.payment_id
// POST /ads/payments/{payment}/confirm → data = AdPaymentData
// POST /ads/payments/{payment}/fail → data = AdPaymentData
// GET /ads/{advertisement}/payments → data = AdPaymentData[]
// GET /ads/payments/my → data = AdPaymentData[]
// ─────────────────────────────────────────────────────────────────────────────
export async function initiateAdPayment(
  advertisementId: string,
  payload: { amount_kes: number; payment_method?: string; mpesa_reference?: string },
): Promise<AdPaymentData> {
  const { data } = await apiFetch<AdPaymentData>(`/ads/${advertisementId}/payments`, {
    method: 'POST', body: JSON.stringify(payload),
  }, true);
  return data;
}

export async function confirmAdPayment(paymentId: string, transactionCode: string): Promise<AdPaymentData> {
  const { data } = await apiFetch<AdPaymentData>(`/ads/payments/${paymentId}/confirm`, {
    method: 'POST', body: JSON.stringify({ transaction_code: transactionCode }),
  }, true);
  return data;
}

export async function failAdPayment(paymentId: string, reason?: string): Promise<AdPaymentData> {
  const { data } = await apiFetch<AdPaymentData>(`/ads/payments/${paymentId}/fail`, {
    method: 'POST', body: JSON.stringify({ reason: reason ?? '' }),
  }, true);
  return data;
}

export async function getAdPayments(advertisementId: string): Promise<AdPaymentData[]> {
  const { data } = await apiFetch<AdPaymentData[]>(`/ads/${advertisementId}/payments`, {}, true);
  return Array.isArray(data) ? data : [];
}

export async function getMyAdPayments(): Promise<AdPaymentData[]> {
  const { data } = await apiFetch<AdPaymentData[]>('/ads/payments/my', {}, true);
  return Array.isArray(data) ? data : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin API  (/v1/admin/…)
// All paginated endpoints return Paginated<T> shape from Api::paginated()
// ─────────────────────────────────────────────────────────────────────────────
const A = '/admin';

// Dashboard
export async function adminGetDashboard(): Promise<AdminDashboardData> {
  const { data } = await apiFetch<AdminDashboardData>(`${A}/dashboard`, {}, true);
  return data;
}

// Analytics
export async function adminGetAuditLogs(params?: Record<string, string>): Promise<Paginated<AuditLogRow>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, meta } = await apiFetch<AuditLogRow[]>(`${A}/analytics/audit-logs${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}

export async function adminGetRevenue(days = 30): Promise<RevenueRow[]> {
  const { data } = await apiFetch<RevenueRow[]>(`${A}/analytics/revenue?days=${days}`, {}, true);
  return Array.isArray(data) ? data : [];
}

export async function adminGetUserGrowth(days = 30): Promise<UserGrowthRow[]> {
  const { data } = await apiFetch<UserGrowthRow[]>(`${A}/analytics/user-growth?days=${days}`, {}, true);
  return Array.isArray(data) ? data : [];
}

// Users
export async function adminGetUsers(params?: Record<string, string>): Promise<Paginated<AdminUserData>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, meta } = await apiFetch<AdminUserData[]>(`${A}/users${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}

export async function adminGetUser(userId: string): Promise<AdminUserData> {
  const { data } = await apiFetch<AdminUserData>(`${A}/users/${userId}`, {}, true);
  return data;
}

export async function adminUpdateUser(userId: string, payload: Partial<AdminUserData>): Promise<AdminUserData> {
  const { data } = await apiFetch<AdminUserData>(`${A}/users/${userId}`, {
    method: 'PUT', body: JSON.stringify(payload),
  }, true);
  return data;
}

export async function adminSuspendUser(userId: string): Promise<AdminUserData> {
  const { data } = await apiFetch<AdminUserData>(`${A}/users/${userId}/suspend`, { method: 'POST' }, true);
  return data;
}

export async function adminActivateUser(userId: string): Promise<AdminUserData> {
  const { data } = await apiFetch<AdminUserData>(`${A}/users/${userId}/activate`, { method: 'POST' }, true);
  return data;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  await apiFetch(`${A}/users/${userId}`, { method: 'DELETE' }, true);
}

export async function adminImpersonate(userId: string): Promise<{ token: string }> {
  // data = { token: string }
  const { data } = await apiFetch<{ token: string }>(`${A}/users/${userId}/impersonate`, { method: 'POST' }, true);
  return data;
}

export async function adminGetLoginHistory(userId: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiFetch<Record<string, unknown>[]>(`${A}/users/${userId}/login-history`, {}, true);
  return Array.isArray(data) ? data : [];
}

export async function adminGrantSubscription(
  userId: string, planId: string, days: number,
): Promise<SubscriptionData> {
  const { data } = await apiFetch<SubscriptionData>(`${A}/users/${userId}/subscriptions/grant`, {
    method: 'POST', body: JSON.stringify({ plan_id: planId, days }),
  }, true);
  return data;
}

// Plans
export async function adminGetPlans(): Promise<PlanData[]> {
  const { data } = await apiFetch<PlanData[]>(`${A}/plans`, {}, true);
  return Array.isArray(data) ? data : [];
}

export async function adminCreatePlan(payload: Partial<PlanData>): Promise<PlanData> {
  const { data } = await apiFetch<PlanData>(`${A}/plans`, { method: 'POST', body: JSON.stringify(payload) }, true);
  return data;
}

export async function adminUpdatePlan(planId: string, payload: Partial<PlanData>): Promise<PlanData> {
  const { data } = await apiFetch<PlanData>(`${A}/plans/${planId}`, { method: 'PUT', body: JSON.stringify(payload) }, true);
  return data;
}

export async function adminTogglePlan(planId: string): Promise<PlanData> {
  const { data } = await apiFetch<PlanData>(`${A}/plans/${planId}/toggle`, { method: 'POST' }, true);
  return data;
}

export async function adminDeletePlan(planId: string): Promise<void> {
  await apiFetch(`${A}/plans/${planId}`, { method: 'DELETE' }, true);
}

// Subscriptions
export async function adminGetSubscriptions(params?: Record<string, string>): Promise<Paginated<SubscriptionData>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, meta } = await apiFetch<SubscriptionData[]>(`${A}/subscriptions${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}

export async function adminRevokeSubscription(subId: string): Promise<SubscriptionData> {
  const { data } = await apiFetch<SubscriptionData>(`${A}/subscriptions/${subId}/revoke`, { method: 'DELETE' }, true);
  return data;
}

export async function adminExtendSubscription(subId: string, days: number): Promise<SubscriptionData> {
  const { data } = await apiFetch<SubscriptionData>(`${A}/subscriptions/${subId}/extend`, {
    method: 'POST', body: JSON.stringify({ days }),
  }, true);
  return data;
}

// Matches (admin)
export async function adminGetMatches(params?: Record<string, string>): Promise<Paginated<MatchData>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, meta } = await apiFetch<MatchData[]>(`${A}/matches${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}

export async function adminSoftDeleteMatch(matchId: string): Promise<void> {
  await apiFetch(`${A}/matches/${matchId}`, { method: 'DELETE' }, true);
}

export async function adminForceDeleteMatch(matchId: string): Promise<void> {
  await apiFetch(`${A}/matches/${matchId}/force`, { method: 'DELETE' }, true);
}

export async function adminReassignMatch(matchId: string, authorId: string): Promise<MatchData> {
  const { data } = await apiFetch<MatchData>(`${A}/matches/${matchId}/reassign`, {
    method: 'PATCH', body: JSON.stringify({ author_id: authorId }),
  }, true);
  return data;
}

// Advertisements (admin)
export async function adminGetAdvertisements(params?: Record<string, string>): Promise<Paginated<AdvertisementData>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, meta } = await apiFetch<AdvertisementData[]>(`${A}/advertisements${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}

export async function adminSetAdStatus(adId: string, status: string): Promise<AdvertisementData> {
  const { data } = await apiFetch<AdvertisementData>(`${A}/advertisements/${adId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  }, true);
  return data;
}

export async function adminDeleteAd(adId: string): Promise<void> {
  await apiFetch(`${A}/advertisements/${adId}`, { method: 'DELETE' }, true);
}

export async function adminGetAdAnalytics(adId: string): Promise<AdAnalyticsData> {
  const { data } = await apiFetch<AdAnalyticsData>(`${A}/advertisements/${adId}/analytics`, {}, true);
  return data;
}

// Payments (admin)
export async function adminGetPayments(params?: Record<string, string>): Promise<Paginated<AdPaymentData>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, meta } = await apiFetch<AdPaymentData[]>(`${A}/payments${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}

export async function adminGetRevenueSummary(): Promise<AdminRevenueData> {
  const { data } = await apiFetch<AdminRevenueData>(`${A}/payments/revenue`, {}, true);
  return data;
}

export async function adminConfirmPayment(paymentId: string, transactionCode: string): Promise<AdPaymentData> {
  const { data } = await apiFetch<AdPaymentData>(`${A}/payments/${paymentId}/confirm`, {
    method: 'POST', body: JSON.stringify({ transaction_code: transactionCode }),
  }, true);
  return data;
}

export async function adminRefundPayment(paymentId: string): Promise<AdPaymentData> {
  const { data } = await apiFetch<AdPaymentData>(`${A}/payments/${paymentId}/refund`, { method: 'POST' }, true);
  return data;
}

// Notifications (admin)
export async function adminBroadcastNotification(payload: {
  title: string; body: string; role?: string; status?: string; user_ids?: string[];
}): Promise<{ recipient_count: number }> {
  const { data } = await apiFetch<{ recipient_count: number }>(`${A}/notifications/broadcast`, {
    method: 'POST', body: JSON.stringify(payload),
  }, true);
  return data;
}

// System (admin)
export async function adminGetHealth(): Promise<SystemHealthData> {
  const { data } = await apiFetch<SystemHealthData>(`${A}/system/health`, {}, true);
  return data;
}

export async function adminClearCache(): Promise<void> {
  await apiFetch(`${A}/system/cache/clear`, { method: 'POST' }, true);
}

export async function adminGetFailedJobs(params?: Record<string, string>): Promise<Paginated<FailedJob>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, meta } = await apiFetch<FailedJob[]>(`${A}/system/failed-jobs${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}

export async function adminRetryJob(id: number): Promise<void> {
  await apiFetch(`${A}/system/failed-jobs/${id}/retry`, { method: 'POST' }, true);
}

export async function adminFlushFailedJobs(): Promise<void> {
  await apiFetch(`${A}/system/failed-jobs`, { method: 'DELETE' }, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Trash / Restore helpers  (all entities support ?deleted=true, POST /{id}/restore, DELETE /{id}/force)
// ─────────────────────────────────────────────────────────────────────────────

// Users – trash
export async function adminGetTrashedUsers(params?: Record<string, string>): Promise<Paginated<AdminUserData>> {
  const base: Record<string, string> = { deleted: 'true', ...(params ?? {}) };
  const qs = '?' + new URLSearchParams(base).toString();
  const { data, meta } = await apiFetch<AdminUserData[]>(`${A}/users${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}
export async function adminRestoreUser(userId: string): Promise<AdminUserData> {
  const { data } = await apiFetch<AdminUserData>(`${A}/users/${userId}/restore`, { method: 'POST' }, true);
  return data;
}
export async function adminForceDeleteUser(userId: string): Promise<void> {
  await apiFetch(`${A}/users/${userId}/force`, { method: 'DELETE' }, true);
}

// Matches – trash
export async function adminGetTrashedMatches(params?: Record<string, string>): Promise<Paginated<MatchData>> {
  const base: Record<string, string> = { deleted: 'true', ...(params ?? {}) };
  const qs = '?' + new URLSearchParams(base).toString();
  const { data, meta } = await apiFetch<MatchData[]>(`${A}/matches${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}
export async function adminRestoreMatch(matchId: string): Promise<MatchData> {
  const { data } = await apiFetch<MatchData>(`${A}/matches/${matchId}/restore`, { method: 'POST' }, true);
  return data;
}

// Advertisements – trash
export async function adminGetTrashedAds(params?: Record<string, string>): Promise<Paginated<AdvertisementData>> {
  const base: Record<string, string> = { deleted: 'true', ...(params ?? {}) };
  const qs = '?' + new URLSearchParams(base).toString();
  const { data, meta } = await apiFetch<AdvertisementData[]>(`${A}/advertisements${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}
export async function adminRestoreAd(adId: string): Promise<AdvertisementData> {
  const { data } = await apiFetch<AdvertisementData>(`${A}/advertisements/${adId}/restore`, { method: 'POST' }, true);
  return data;
}
export async function adminForceDeleteAd(adId: string): Promise<void> {
  await apiFetch(`${A}/advertisements/${adId}/force`, { method: 'DELETE' }, true);
}

// Plans – trash
export async function adminGetTrashedPlans(): Promise<PlanData[]> {
  const { data } = await apiFetch<PlanData[]>(`${A}/plans/deleted`, {}, true);
  return Array.isArray(data) ? data : [];
}
export async function adminRestorePlan(planId: string): Promise<PlanData> {
  const { data } = await apiFetch<PlanData>(`${A}/plans/${planId}/restore`, { method: 'POST' }, true);
  return data;
}
export async function adminForceDeletePlan(planId: string): Promise<void> {
  await apiFetch(`${A}/plans/${planId}/force`, { method: 'DELETE' }, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('switch6-token');
  if (stored) setAuthToken(stored);
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW TYPES — append after existing AdAnalyticsData interface in lib/api.ts
// ─────────────────────────────────────────────────────────────────────────────

/** Enriched per-ad analytics from AdvertisementAnalyticsService::summary() */
export interface RichAdAnalyticsData {
  impressions:          number;
  plays:                number;
  completed:            number;
  play_rate_pct:        number;
  completion_rate_pct:  number;
  total_play_time:      number;
  avg_play_time:        number;
  avg_viewers:          number;
  peak_viewers:         number;
  by_period:            Record<string, number>;
  by_platform:          Record<string, number>;
  impressions_per_day:  { date: string; count: number }[];
  by_match:             Record<string, number>;
}

/** Per-match analytics returned by MatchAnalyticsService::forMatch() */
export interface MatchAnalyticsData {
  overview: {
    match_id:        string;
    status:          string;
    home_club:       string;
    away_club:       string;
    league:          string;
    match_date:      string;
    home_score:      number;
    away_score:      number;
    total_views:     number;
    unique_viewers:  number;
    anonymous_views: number;
    total_ad_events: number;
    ad_impressions:  number;
  };
  viewers: {
    peak_viewers:          number;
    viewers_first_half:    number;
    viewers_second_half:   number;
    viewers_extra_time:    number;
  };
  timeline:    { minute: number; viewers: number }[];
  ads: {
    impressions:           number;
    plays:                 number;
    completed:             number;
    play_rate_pct:         number;
    completion_rate_pct:   number;
    total_play_time_secs:  number;
    by_period:             { period: string; event_type: string; count: number }[];
    by_platform:           Record<string, number>;
  };
  ad_timeline:  { minute: number; impressions: number }[];
  engagement:   { segment: string; viewers: number }[];
  peak_minutes: { minute: number; viewers: number }[];
  device_split: {
    devices:  Record<string, number>;
    browsers: Record<string, number>;
  };
}

/** Admin: match analytics overview */
export interface AdminMatchAnalyticsData {
  per_day:      { date: string; count: number }[];
  by_status:    Record<string, number>;
  by_league:    { league: string; count: number }[];
  viewer_stats: { total_viewers: number; avg_viewers: number; peak_viewers: number };
  by_hour:      { hour: number; count: number }[];
  top_matches:  { id: string; viewer_count: number; match_date: string; status: string }[];
  live_now:     number;
  total_period: number;
}

/** Admin: global ad performance */
export interface AdminAdPerformanceData {
  funnel:               Record<string, number>;
  by_platform:          { platform: string; event_type: string; count: number }[];
  impressions_per_day:  { date: string; count: number }[];
  by_period:            { period: string; count: number }[];
  top_ads: {
    id: string; title: string; file_type: string; status: string;
    impressions_count: number; plays_count: number; completions_count: number;
  }[];
  avg_play_time_secs:    number;
  total_viewer_minutes:  number;
}

/** Admin: device / user-agent analytics */
export interface AdminDeviceAnalyticsData {
  devices:             Record<string, number>;
  browsers:            Record<string, number>;
  oses:                Record<string, number>;
  top_ips:             { ip_address: string; requests: number }[];
  hourly_heatmap:      { hour: number; count: number }[];
  errors_by_day:       { date: string; errors: number }[];
  unique_users_by_day: { date: string; unique_users: number }[];
  total_requests:      number;
}

/** Admin: log / request analytics */
export interface AdminLogAnalyticsData {
  by_module:               { module: string; count: number }[];
  top_actions:             { action: string; count: number }[];
  status_codes:            Record<string, number>;
  avg_response_by_module:  { module: string; avg_ms: number; max_ms: number }[];
  slow_requests: {
    id: string; action: string; module: string | null;
    description: string | null; ip_address: string | null;
    created_at: string; metadata: Record<string, unknown>;
  }[];
  by_dow:  { day: string; count: number }[];
  per_day: { date: string; total: number; server_errors: number; client_errors: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW API FUNCTIONS — append after adminGetRevenueSummary() in lib/api.ts
// ─────────────────────────────────────────────────────────────────────────────

// Broadcaster: per-match analytics
// Route: GET /v1/matches/{match}/analytics → MatchAnalyticsController::show()
export async function getMatchAnalytics(matchId: string): Promise<MatchAnalyticsData> {
  const { data } = await apiFetch<MatchAnalyticsData>(`/matches/${matchId}/analytics`, {}, true);
  return data;
}

// Admin: match analytics overview
// Route: GET /admin/analytics/matches?days=N
export async function adminGetMatchAnalytics(days = 30): Promise<AdminMatchAnalyticsData> {
  const { data } = await apiFetch<AdminMatchAnalyticsData>(`${A}/analytics/matches?days=${days}`, {}, true);
  return data;
}

// Admin: global ad performance
// Route: GET /admin/analytics/ads?days=N
export async function adminGetAdPerformance(days = 30): Promise<AdminAdPerformanceData> {
  const { data } = await apiFetch<AdminAdPerformanceData>(`${A}/analytics/ads?days=${days}`, {}, true);
  return data;
}

// Admin: device / browser / OS analytics
// Route: GET /admin/analytics/devices?days=N
export async function adminGetDeviceAnalytics(days = 30): Promise<AdminDeviceAnalyticsData> {
  const { data } = await apiFetch<AdminDeviceAnalyticsData>(`${A}/analytics/devices?days=${days}`, {}, true);
  return data;
}

// Admin: log / request analytics
// Route: GET /admin/analytics/logs?days=N
export async function adminGetLogAnalytics(days = 30): Promise<AdminLogAnalyticsData> {
  const { data } = await apiFetch<AdminLogAnalyticsData>(`${A}/analytics/logs?days=${days}`, {}, true);
  return data;
}