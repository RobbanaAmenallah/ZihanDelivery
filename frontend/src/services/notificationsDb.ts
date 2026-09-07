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

// ─── Local demo fallback ──────────────────────────────────────────────────────

let _demoNotifications: Notification[] = [
  {
    id: 'notif-demo-1',
    user_id: 'demo',
    title: 'Bienvenue sur ZIHAN Express !',
    body: 'Votre compte est activé et prêt à l\'emploi.',
    type: 'success',
    is_read: false,
    link: undefined,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'notif-demo-2',
    user_id: 'demo',
    title: 'Colis ZH000153 en transit',
    body: 'Votre colis est en route vers Nouvelle Médina.',
    type: 'parcel',
    is_read: false,
    link: '/admin/shipments',
    meta: { tracking_number: 'ZH000153' },
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'notif-demo-3',
    user_id: 'demo',
    title: 'Livraison confirmée',
    body: 'Le colis ZH000150 a été livré avec succès.',
    type: 'success',
    is_read: true,
    link: '/admin/shipments',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

// ─── Fetch notifications for current user ─────────────────────────────────────

export async function getNotifications(userId: string): Promise<{
  notifications: Notification[];
  error: string | null;
}> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured && userId !== 'demo') {
    try {
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        return { notifications: data as Notification[], error: null };
      }
    } catch {
      // fall through
    }
  }

  // Demo/offline fallback
  return {
    notifications: _demoNotifications,
    error: null,
  };
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured && userId !== 'demo') {
    try {
      const { count } = await client
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      return count ?? 0;
    } catch {
      // fall through
    }
  }

  return _demoNotifications.filter((n) => !n.is_read).length;
}

// ─── Mark single notification as read ─────────────────────────────────────────

export async function markAsRead(id: string, userId: string): Promise<void> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured && userId !== 'demo') {
    try {
      await client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);
      return;
    } catch {
      // fall through
    }
  }

  // Demo update
  _demoNotifications = _demoNotifications.map((n) =>
    n.id === id ? { ...n, is_read: true } : n
  );
}

// ─── Mark all as read ─────────────────────────────────────────────────────────

export async function markAllAsRead(userId: string): Promise<void> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  if (isConfigured && userId !== 'demo') {
    try {
      await client
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      return;
    } catch {
      // fall through
    }
  }

  _demoNotifications = _demoNotifications.map((n) => ({ ...n, is_read: true }));
}

// ─── Create a new notification (admin / system) ───────────────────────────────

export async function createNotification(
  payload: CreateNotificationPayload
): Promise<{ notification: Notification | null; error: string | null }> {
  const { isConfigured } = getActiveSupabaseConfig();
  const client = getSupabaseClient();

  const newNotif: Notification = {
    id: `notif-${Date.now()}`,
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
      return { notification: null, error: error?.message ?? 'Erreur inconnue' };
    } catch (e) {
      return { notification: null, error: String(e) };
    }
  }

  // Demo fallback
  _demoNotifications = [newNotif, ..._demoNotifications];
  return { notification: newNotif, error: null };
}

// ─── Subscribe to realtime changes ───────────────────────────────────────────

export function subscribeToNotifications(
  userId: string,
  onNew: (notif: Notification) => void
): (() => void) | null {
  const { isConfigured } = getActiveSupabaseConfig();
  if (!isConfigured || !userId || userId === 'demo') return null;

  const client = getSupabaseClient();
  const channel = client
    .channel(`notifications:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNew(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
