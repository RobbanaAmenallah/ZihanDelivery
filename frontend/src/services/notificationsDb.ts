import { getSupabaseClient, getActiveSupabaseConfig } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'parcel';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  link?: string;
  meta?: Record<string, unknown>;
  created_at: string;
}

export interface CreateNotificationPayload {
  user_id: string;
  title: string;
  body: string;
  type?: NotificationType;
  link?: string;
  meta?: Record<string, unknown>;
}

const NOTIFICATIONS_STORAGE_KEY = 'zihan_notifications';

// ─── Local storage fallback ───────────────────────────────────────────────────

function getStoredNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: 'notif-demo-1',
      user_id: 'all',
      title: 'Bienvenue sur ZIHAN Express !',
      body: 'Votre compte et système de notifications sont activés.',
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ];
}

function saveStoredNotifications(notifs: Notification[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
  } catch {
    // ignore
  }
}

// ─── Fetch notifications for current user ─────────────────────────────────────

export async function getNotifications(userId: string, role?: string): Promise<{
  notifications: Notification[];
  error: string | null;
}> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured && userId && userId !== 'demo') {
    try {
      // If admin, fetch notifications for this user OR role 'admin'
      let query = client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40);

      if (role === 'admin') {
        query = query.or(`user_id.eq.${userId},user_id.eq.admin`);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (!error && data) {
        saveStoredNotifications(data as Notification[]);
        return { notifications: data as Notification[], error: null };
      }
    } catch {
      // fall through
    }
  }

  // Local fallback
  const stored = getStoredNotifications();
  const filtered = stored.filter(
    (n) => n.user_id === userId || n.user_id === 'all' || (role === 'admin' && n.user_id === 'admin')
  );
  return {
    notifications: filtered.length ? filtered : stored,
    error: null,
  };
}

// ─── Mark single notification as read ─────────────────────────────────────────

export async function markAsRead(id: string, userId: string): Promise<void> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured && userId && userId !== 'demo') {
    try {
      await client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch {
      // fall through
    }
  }

  const stored = getStoredNotifications();
  saveStoredNotifications(
    stored.map((n) => (n.id === id ? { ...n, is_read: true } : n))
  );
}

// ─── Mark all as read ─────────────────────────────────────────────────────────

export async function markAllAsRead(userId: string): Promise<void> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured && userId && userId !== 'demo') {
    try {
      await client
        .from('notifications')
        .update({ is_read: true })
        .or(`user_id.eq.${userId},user_id.eq.admin`);
    } catch {
      // fall through
    }
  }

  const stored = getStoredNotifications();
  saveStoredNotifications(stored.map((n) => ({ ...n, is_read: true })));
}

// ─── Create a new notification (broadcast / single) ───────────────────────────

export async function createNotification(
  payload: CreateNotificationPayload
): Promise<{ notification: Notification | null; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  const newNotif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: payload.user_id,
    title: payload.title,
    body: payload.body,
    type: payload.type ?? 'info',
    is_read: false,
    link: payload.link,
    meta: payload.meta,
    created_at: new Date().toISOString(),
  };

  if (isConfigured) {
    try {
      const { data, error } = await client
        .from('notifications')
        .insert({
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          type: payload.type ?? 'info',
          link: payload.link,
          meta: payload.meta,
        })
        .select()
        .single();

      if (!error && data) {
        return { notification: data as Notification, error: null };
      }
    } catch (e) {
      console.warn('Could not insert notification in Supabase:', e);
    }
  }

  // Local fallback
  const stored = getStoredNotifications();
  saveStoredNotifications([newNotif, ...stored]);
  return { notification: newNotif, error: null };
}

// ─── Subscribe to realtime changes with Sound & Toasts ────────────────────────

export function subscribeToNotifications(
  userId: string,
  role: string | undefined,
  onNew: (notif: Notification) => void
): (() => void) | null {
  const { isConfigured } = getActiveSupabaseConfig();
  if (!isConfigured || !userId || userId === 'demo') return null;

  const client = getSupabaseClient();
  const channelId = `notifications_channel_${userId}_${Date.now()}`;

  const channel = client
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        const newNotif = payload.new as Notification;
        // Check if this notification belongs to this user or is for admins
        const isForMe =
          newNotif.user_id === userId ||
          newNotif.user_id === 'all' ||
          (role === 'admin' && newNotif.user_id === 'admin');

        if (isForMe) {
          onNew(newNotif);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Notifications connected for ${userId}`);
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}
