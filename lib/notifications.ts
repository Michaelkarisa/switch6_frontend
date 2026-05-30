// ─── Notification System — Laravel Reverb (WebSocket) ────────────────────────
'use client';

export type NotificationType = 'live' | 'match' | 'alert' | 'info' | 'success';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  matchId?: string;
}

// Shape of what Laravel broadcasts via toArray() / toBroadcast() on your
// Notification class. Adjust field names to match your actual implementation.
interface LaravelNotificationPayload {
  id?: string;
  type?: string;                    // e.g. "App\\Notifications\\MatchWentLive"
  notification_type?: NotificationType; // optional explicit field you can add
  title?: string;
  message?: string;
  match_id?: string;
  created_at?: string;              // injected automatically by Laravel
}

const STORAGE_KEY = 'switch6-notifications';
const EVENT_NAME  = 'switch6:notification';

// ─── Storage ──────────────────────────────────────────────────────────────────
export function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveNotifications(notifications: AppNotification[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
}

export function markAllRead() {
  const updated = loadNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(updated);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
}

export function markRead(id: string) {
  const updated = loadNotifications().map(n =>
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(updated);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
}

export function clearAll() {
  saveNotifications([]);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: [] }));
}

// ─── Push a notification into the store ───────────────────────────────────────
export function pushNotification(
  notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
) {
  const notification: AppNotification = {
    ...notif,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    read: false,
  };
  const updated = [notification, ...loadNotifications()].slice(0, 50);
  saveNotifications(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  }
  return notification;
}

// ─── Subscribe to live notification store changes ─────────────────────────────
export function onNotifications(
  cb: (notifications: AppNotification[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

// ─── Map Laravel FQN → our UI type ───────────────────────────────────────────
function resolveType(payload: LaravelNotificationPayload): NotificationType {
  // Prefer an explicit field your notification sends, e.g. 'notification_type'
  if (payload.notification_type) return payload.notification_type;

  // Fall back to inspecting the FQN Laravel injects as `type`
  const fqn = (payload.type ?? '').toLowerCase();
  if (fqn.includes('live'))    return 'live';
  if (fqn.includes('match'))   return 'match';
  if (fqn.includes('alert'))   return 'alert';
  if (fqn.includes('success')) return 'success';
  return 'info';
}

// ─── Laravel Echo + Reverb WebSocket listener ─────────────────────────────────
//
// SETUP:
//   npm install laravel-echo pusher-js
//
// Add to .env.local:
//   NEXT_PUBLIC_REVERB_APP_KEY=your-key
//   NEXT_PUBLIC_REVERB_HOST=127.0.0.1      # or your server IP
//   NEXT_PUBLIC_REVERB_PORT=6001
//   NEXT_PUBLIC_REVERB_SCHEME=http         # or https in production
//
// LARAVEL SIDE — your Notification class must implement ShouldBroadcast:
//
//   use Illuminate\Notifications\Notification;
//   use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
//
//   class MatchWentLive extends Notification implements ShouldBroadcast
//   {
//       public function via($notifiable): array
//       {
//           return ['broadcast', 'database'];
//       }
//
//       public function toBroadcast($notifiable): array   // or toArray()
//       {
//           return [
//               'title'             => 'Match is LIVE!',
//               'message'           => "{$this->match->home} vs {$this->match->away} kicked off.",
//               'notification_type' => 'live',
//               'match_id'          => $this->match->id,
//           ];
//       }
//   }
//
// The private channel is automatically  App.Models.User.{id}
// as long as your broadcastOn() returns:
//   new PrivateChannel("App.Models.User.{$this->notifiable->id}")
// (Laravel does this by default for User model notifications.)

let _echoCleanup: (() => void) | null = null;

export async function startReverbListener(userId: string): Promise<() => void> {
  if (typeof window === 'undefined' || !userId) return () => {};

  // Tear down any existing connection first (e.g. on hot-reload)
  if (_echoCleanup) { _echoCleanup(); _echoCleanup = null; }

  // Lazy-load browser-only packages — safe with Next.js 'use client' pages
  const [{ default: Echo }, { default: Pusher }] = await Promise.all([
    import('laravel-echo'),
    import('pusher-js'),
  ]);

  // Echo requires Pusher on window
  (window as unknown as Record<string, unknown>).Pusher = Pusher;

  const echo = new Echo({
    broadcaster      : 'reverb',
    key              : process.env.NEXT_PUBLIC_REVERB_APP_KEY  ?? '',
    wsHost           : process.env.NEXT_PUBLIC_REVERB_HOST     ?? window.location.hostname,
    wsPort           : Number(process.env.NEXT_PUBLIC_REVERB_PORT  ?? 6001),
    wssPort          : Number(process.env.NEXT_PUBLIC_REVERB_PORT  ?? 6001),
    forceTLS         : (process.env.NEXT_PUBLIC_REVERB_SCHEME  ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],

    // Laravel's broadcasting auth endpoint (default). Update if using a custom
    // route or API prefix, e.g. '/api/broadcasting/auth'.
    authEndpoint: '/broadcasting/auth',

    auth: {
      headers: {
        // Sanctum API token auth for broadcasting — reads the same token used by apiFetch
        Authorization: `Bearer ${localStorage.getItem('switch6-token') ?? ''}`,
        Accept: 'application/json',
      },
    },
  });

  // Subscribe to the private user notification channel.
  // Laravel routes all notifiable broadcasts here automatically.
  echo
    .private(`App.Models.User.${userId}`)
    .notification((payload: LaravelNotificationPayload) => {
      console.log('[Reverb] notification received:', payload);

      pushNotification({
        type   : resolveType(payload),
        title  : payload.title   ?? 'New notification',
        message: payload.message ?? '',
        matchId: payload.match_id,
      });
    });

  const cleanup = () => {
    echo.leave(`App.Models.User.${userId}`);
    echo.disconnect();
    _echoCleanup = null;
  };

  _echoCleanup = cleanup;
  return cleanup;
}

// Call on logout / unmount if you don't have the cleanup reference
export function stopReverbListener() {
  if (_echoCleanup) { _echoCleanup(); _echoCleanup = null; }
}
