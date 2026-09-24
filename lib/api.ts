export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/v1';

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
  quality: string;
  role:    string;          // legacy single-role string
  roles:   string[];        // Spatie getRoleNames()
  status:  string;
  camera?: number;
  api_token?: string;       // kept for legacy compat — token is in meta.token
}

/** MatchFormatterService::format() */
export interface MatchData {
  id:         string;
  slug:       string| null;
  league:{
    id:     string;
    name:   string;
  };    
  match_date?: string;   
  date:       string;           // Y-m-d
  time:       string;          // H:i
  stadium:    string;          // venue field
  status:     'scheduled' | 'live' | 'completed' | 'cancelled';
  views:    number;
  camera:     number;
  type:       string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;  // soft-delete timestamp
  author: {
    id:     string;
    name:   string;
  };
  referee: {
    id:    string;
    name:  string;
    phone: string;
  };
  homeTeam: TeamData;
  awayTeam: TeamData;
  home_club: TeamData;
  away_club: TeamData;
}

export interface TeamData {
  id:              string;  // club uuid
  name:            string;
  formation:       string;
  url?:           string;  // homeTeam logo_url
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
  role:           string;
}

export interface Referee {
  id:    string;
  name:  string;
  phone?: string;
}

export interface League {
  id:          string;
  name?:       string;   // primary field
  type?:       string;
}

/** Plan model */
export interface PlanData {
  id:                 string;
  name:               string;
  slug:               string;
  description:        string | null;
  currency:           string | null;
  price:              number;
  duration_days:      number;
  max_matches:        number | null;
  max_cameras:        number | null;
  quality:            number[];
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
  status:        'active' | 'paused' | 'expired' | 'pending' | 'payment_failed';
  target_tags:   string[] | null;
  user_id?:      string;
  alt_text?:     string | null;
  events_count?: number;
  created_at?:   string;
  deleted_at?:   string | null;  // soft-delete timestamp
  payment_id?:   string | null;
  price?:        number | null;
  campaign_type?: 'general' | 'bid';
  broadcaster_id?: string | null;
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
  avg_views?:       number;
  by_period?:         Record<string, number>;
  by_platform?:       Record<string, number>;
}

/** AdPayment model */
export interface PaymentData {
  id:               string;
  user_id:          string;
  amount:           number;
  currency:         string;
  payment_method:   'mpesa' | 'card' | 'bank_transfer';
  reference:        string | null;
  transaction_code: string | null;
  status:           'pending' | 'completed' | 'failed' | 'refunded';
  type:             'subscription' | 'advertisement';
  paid_at:          string | null;
  notes:            string | null;
  phone:            string;         
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
    total: number; today: number; month: number; transactions: number; currency:number;
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
  total:           number;
  today:           number;
  month:           number; // ← added to match UI (aligns with `this_month_kes` from backend)
  currency:        string;
  transactions:    number; // ← added (used in the Revenue summary table)
  by_method:       { payment_method: string; total: number; count: number }[];
  pending_total:   number;
  pending_count:   number;
  sparkline:       { date: string; total: number; currency: string}[]; // ← added for the 14-day trend chart
}

/** AdminSystemController::health() */
export interface SystemHealthData {
  app:      Record<string, string | number | boolean| any>;
  database: Record<string, string | number | boolean| any>;
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
  total:        number;
  transactions: number;
  currency:     string;
}

/** User growth row */
export interface UserGrowthRow {
  date:      string;
  new_users: number;
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
    unique_views:  number;
    anonymous_views: number;
    total_ad_events: number;
    ad_impressions:  number;
  };
  views: {
    peak_views:          number;
    views_first_half:    number;
    views_second_half:   number;
    views_extra_time:    number;
  };
  timeline:    { minute: number; views: number }[];
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
  engagement:   { segment: string; views: number }[];
  peak_minutes: { minute: number; views: number }[];
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
  name: string; email: string; phone: string; password: string; role: string; game_type: string;
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

export async function subscribeToPlan(planId: string, quality: number,paymentDetails:any,method: string): Promise<SubscriptionData> {
  const { data } = await apiFetch<SubscriptionData>(`/plans/${planId}/subscribe`, {
    method: 'POST', body: JSON.stringify({ plan_id:planId, quality:quality,details:paymentDetails,method:method}),
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
export async function initiatePayment(
  advertisementId: string,
  payload: { amount: number; payment_method?: string; mpesa_reference?: string; currency:string},
): Promise<PaymentData> {
  const { data } = await apiFetch<PaymentData>(`/payments`, {
    method: 'POST', body: JSON.stringify(payload),
  }, true);
  return data;
}

export async function confirmAdPayment(paymentId: string, transactionCode: string): Promise<PaymentData> {
  const { data } = await apiFetch<PaymentData>(`/payments/${paymentId}/confirm`, {
    method: 'POST', body: JSON.stringify({ transaction_code: transactionCode }),
  }, true);
  return data;
}

export async function failAdPayment(paymentId: string, reason?: string): Promise<PaymentData> {
  const { data } = await apiFetch<PaymentData>(`/payments/${paymentId}/fail`, {
    method: 'POST', body: JSON.stringify({ reason: reason ?? '' }),
  }, true);
  return data;
}

export async function getPayments(type: string): Promise<PaymentData[]> {
  const { data } = await apiFetch<PaymentData[]>(`/${type}/payments`, {}, true);
  return Array.isArray(data) ? data : [];
}

/** Poll GET /payments/{id}/status — mirrors "latest transaction status" on the backend. */
export async function getPaymentStatus(paymentId: string): Promise<PaymentData> {
  const { data } = await apiFetch<PaymentData>(`/payments/${paymentId}/status`, {}, true);
  return data;
}

/**
 * Poll a payment until it reaches a terminal status (completed/failed) or
 * the timeout elapses. Used instead of a fake fixed delay so the UI
 * reflects what the M-Pesa callback actually confirmed.
 */
export async function pollPaymentUntilSettled(
  paymentId: string,
  { intervalMs = 2500, timeoutMs = 60000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<PaymentData> {
  const deadline = Date.now() + timeoutMs;
  let last: PaymentData | null = null;

  while (Date.now() < deadline) {
    last = await getPaymentStatus(paymentId);
    if (last.status === 'completed' || last.status === 'failed' || last.status === 'refunded') {
      return last;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }

  if (last) return last;
  throw new Error('Payment is taking longer than expected. Check your phone for the M-Pesa prompt.');
}

export async function getMyPayments(): Promise<PaymentData[]> {
  const response = await apiFetch<PaymentData[]>('/payments/my', {}, true);
  console.log("MY",response.data);
  return Array.isArray(response.data) ? response.data : [];
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
export async function adminGetPayments(params?: Record<string, string>): Promise<Paginated<PaymentData>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const { data, meta } = await apiFetch<PaymentData[]>(`${A}/payments${qs}`, {}, true);
  return { data: Array.isArray(data) ? data : [], meta: meta as Paginated<unknown>['meta'] };
}

export async function adminGetRevenueSummary(): Promise<AdminRevenueData> {
  const { data } = await apiFetch<AdminRevenueData>(`${A}/payments/revenue`, {}, true);
  return data;
}

export async function adminConfirmPayment(paymentId: string, transactionCode: string): Promise<PaymentData> {
  const { data } = await apiFetch<PaymentData>(`${A}/payments/${paymentId}/confirm`, {
    method: 'POST', body: JSON.stringify({ transaction_code: transactionCode }),
  }, true);
  return data;
}

export async function adminRefundPayment(paymentId: string): Promise<PaymentData> {
  const { data } = await apiFetch<PaymentData>(`${A}/payments/${paymentId}/refund`, { method: 'POST' }, true);
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
// Share Lineup
// POST /share-lineups → data = ShareLineupData
// GET  /share-lineups → data = ShareLineupData[] (shared with me)
// GET  /share-lineups/sent → data = ShareLineupData[] (shared by me)
// GET  /share-lineups/{id}/preview → data = LineupRow[]
// POST /share-lineups/{id}/import → data = LineupRow[]
// DELETE /share-lineups/{id} → data = null
// GET  /broadcasters/search?q= → data = BroadcasterOption[]
// ─────────────────────────────────────────────────────────────────────────────
export interface BroadcasterOption {
  id:    string;
  name:  string;
  email: string;
}

export interface ShareLineupData {
  id:                      string;
  club_id:                 string;
  match_id:                string;
  sender_id:               string;
  recepient_id:            string;
  status:                  'pending' | 'imported';
  imported_at:             string | null;
  imported_into_match_id:  string | null;
  created_at?:             string;
  sender?:    Pick<UserData, 'id' | 'name' | 'email'>;
  recepient?: Pick<UserData, 'id' | 'name' | 'email'>;
  club?:      Club;
  match?:     MatchData;
}

export async function searchBroadcasters(q: string): Promise<BroadcasterOption[]> {
  const { data } = await apiFetch<BroadcasterOption[]>(`/broadcasters/search?q=${encodeURIComponent(q)}`, {}, true);
  return Array.isArray(data) ? data : [];
}

export async function shareLineup(matchId: string, clubId: string, recepientId: string): Promise<ShareLineupData> {
  const { data } = await apiFetch<ShareLineupData>('/share-lineups', {
    method: 'POST', body: JSON.stringify({ match_id: matchId, club_id: clubId, recepient_id: recepientId }),
  }, true);
  return data;
}

/** Lineups shared with me — backs the "Shared lineup" page on the matches page. */
export async function getReceivedSharedLineups(): Promise<ShareLineupData[]> {
  const { data } = await apiFetch<ShareLineupData[]>('/share-lineups', {}, true);
  return Array.isArray(data) ? data : [];
}

export async function getSentSharedLineups(): Promise<ShareLineupData[]> {
  const { data } = await apiFetch<ShareLineupData[]>('/share-lineups/sent', {}, true);
  return Array.isArray(data) ? data : [];
}

export async function previewSharedLineup(shareId: string): Promise<LineupRow[]> {
  const { data } = await apiFetch<LineupRow[]>(`/share-lineups/${shareId}/preview`, {}, true);
  return Array.isArray(data) ? data : [];
}

export async function importSharedLineup(shareId: string, targetMatchId: string): Promise<LineupRow[]> {
  const { data } = await apiFetch<LineupRow[]>(`/share-lineups/${shareId}/import`, {
    method: 'POST', body: JSON.stringify({ match_id: targetMatchId }),
  }, true);
  return Array.isArray(data) ? data : [];
}

export async function deleteSharedLineup(shareId: string): Promise<void> {
  await apiFetch(`/share-lineups/${shareId}`, { method: 'DELETE' }, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Match Bids (bid tab)
// GET  /match-bids/matches → data = MatchData[] (ranked by traction, filterable)
// GET  /match-bids/base-price?period= → data = { period, base_price }
// POST /match-bids → data = { advertisement: AdvertisementData, payment_id, total }
// GET  /match-bids/my → data = MatchBidData[]
// ─────────────────────────────────────────────────────────────────────────────
export type BidPeriod = 'before_match' | 'halftime' | 'fulltime';

export interface MatchBidData {
  id:                string;
  match_id:          string;
  advertisement_id:  string;
  user_id:           string;
  payment_id:        string | null;
  period:            BidPeriod;
  slot_rank:         number | null;
  amount:            number;
  currency:          string;
  status:            'pending_payment' | 'pending' | 'won' | 'lost' | 'refunded';
  created_at?:       string;
  match?: MatchData;
  ad?:    AdvertisementData;
}

export interface BidEntry {
  match_id: string;
  period:   BidPeriod;
  amount:   number;
}

export async function getBidEligibleMatches(filters?: {
  date?: string; stadium?: string; club_id?: string;
}): Promise<MatchData[]> {
  const qs = filters ? '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => !!v)) as Record<string, string>
  ).toString() : '';
  const { data } = await apiFetch<MatchData[]>(`/match-bids/matches${qs}`, {}, true);
  return Array.isArray(data) ? data : [];
}

export async function getBidBasePrice(period: BidPeriod): Promise<number> {
  const { data } = await apiFetch<{ period: string; base_price: number }>(`/match-bids/base-price?period=${period}`, {}, true);
  return data.base_price;
}

export interface BidAuctionStatus {
  base_price:        number;
  current_highest:   number;
  minimum_next_bid:  number;
  deadline:          string | null;
  bidding_closed:    boolean;
}

/** Live snapshot of a match+period auction: current leading bid, minimum to outbid it, and the 1-hour deadline. */
export async function getBidAuctionStatus(matchId: string, period: BidPeriod): Promise<BidAuctionStatus> {
  const { data } = await apiFetch<BidAuctionStatus>(`/match-bids/status?match_id=${matchId}&period=${period}`, {}, true);
  return data;
}

export async function createBidCampaign(payload: {
  title: string; file: File; bids: BidEntry[]; details: { phone: string };
  target_tags?: string[]; currency?: string;
}): Promise<{ advertisement: AdvertisementData; payment_id: string; total: number }> {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('file_type', 'image');
  form.append('file', payload.file);
  form.append('currency', payload.currency ?? 'KES');
  form.append('method', 'mpesa');
  form.append('details[phone]', payload.details.phone);
  payload.bids.forEach((b, i) => {
    form.append(`bids[${i}][match_id]`, b.match_id);
    form.append(`bids[${i}][period]`, b.period);
    form.append(`bids[${i}][amount]`, String(b.amount));
  });
  const { data } = await apiFetch<{ advertisement: AdvertisementData; payment_id: string; total: number }>('/match-bids', {
    method: 'POST', body: form,
  }, true);
  return data;
}

export async function getMyBids(): Promise<MatchBidData[]> {
  const { data } = await apiFetch<MatchBidData[]>('/match-bids/my', {}, true);
  return Array.isArray(data) ? data : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcaster Revenue tab
// GET /revenue → data = { enabled, total_gross, total_earned, matches: MatchRevenueRow[] }
// GET /revenue/matches/{match} → data = MatchRevenueRow[]
// ─────────────────────────────────────────────────────────────────────────────
export interface MatchRevenueRow {
  id:                  string;
  match_id:            string;
  broadcaster_id:      string | null;
  period:              BidPeriod;
  gross_amount:        number;
  broadcaster_amount:  number;
  platform_amount:     number;
  share_percent:       number;
  currency:            string;
  created_at?:         string;
  match?: MatchData;
}

export interface RevenueSummary {
  enabled:       boolean;
  total_gross:   number;
  total_earned:  number;
  matches:       MatchRevenueRow[];
}

export async function getRevenueSummary(): Promise<RevenueSummary> {
  const { data } = await apiFetch<RevenueSummary>('/revenue', {}, true);
  return data;
}

export async function getMatchRevenue(matchId: string): Promise<MatchRevenueRow[]> {
  const { data } = await apiFetch<MatchRevenueRow[]>(`/revenue/matches/${matchId}`, {}, true);
  return Array.isArray(data) ? data : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('switch6-token');
  if (stored) setAuthToken(stored);
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