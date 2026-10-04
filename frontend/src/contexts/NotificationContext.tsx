import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
  type Notification,
} from '@/services/notificationsDb';
import { playSound } from '@/utils/sound';
import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import type { Parcel } from '@/types';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  activeToast: Notification | null;
  dismissToast: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  triggerSoundTest: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  const userId = user?.id || profile?.id || 'demo';

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const { notifications: fetched } = await getNotifications(userId, role);
    setNotifications(fetched);
    setIsLoading(false);
  }, [userId, role]);

  const handleIncomingNotification = useCallback((newNotif: Notification) => {
    // Add to state
    setNotifications((prev) => {
      if (prev.some((n) => n.id === newNotif.id)) return prev;
      return [newNotif, ...prev];
    });

    // Play chime sound
    if (newNotif.type === 'success') {
      playSound('success');
    } else if (newNotif.type === 'warning' || newNotif.type === 'error') {
      playSound('alert');
    } else {
      playSound('notification');
    }

    // Show floating toast
    setActiveToast(newNotif);
  }, []);

  // Dismiss toast after 6 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Initial fetch and subscription to `notifications` table
  useEffect(() => {
    refreshNotifications();

    if (userId && userId !== 'demo') {
      const unsub = subscribeToNotifications(userId, role, (notif) => {
        handleIncomingNotification(notif);
      });

      return () => {
        if (unsub) unsub();
      };
    }
  }, [userId, role, refreshNotifications, handleIncomingNotification]);

  // Direct realtime listener on `parcels` table as fallback or instant feedback!
  useEffect(() => {
    const { isConfigured } = getActiveSupabaseConfig();
    if (!isConfigured || !userId || userId === 'demo') return;

    const client = getSupabaseClient();
    const parcelsChannel = client
      .channel(`live_parcel_notifications_${userId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcels',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const p = payload.new as Parcel;
            // Notify Admin
            if (role === 'admin') {
              handleIncomingNotification({
                id: `instant-insert-${p.id || Date.now()}`,
                user_id: userId,
                title: `📦 Nouveau Colis Enregistré (${p.tracking_number})`,
                body: `${p.sender_name || 'Client'} -> ${p.recipient_name} (${p.recipient_governorate}) • ${p.total_amount?.toFixed(3)} DT`,
                type: 'parcel',
                is_read: false,
                link: '/admin/shipments',
                created_at: new Date().toISOString(),
              });
            } else if (role === 'client' && (p.sender_id === userId || p.sender_name === profile?.company_name)) {
              handleIncomingNotification({
                id: `instant-client-${p.id || Date.now()}`,
                user_id: userId,
                title: `✅ Colis ${p.tracking_number} Enregistré`,
                body: `Votre colis vers ${p.recipient_name} (${p.recipient_governorate}) a été pris en charge.`,
                type: 'success',
                is_read: false,
                link: '/client',
                created_at: new Date().toISOString(),
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const newP = payload.new as Parcel;
            const oldP = payload.old as Partial<Parcel>;

            // Driver assignment notification
            if (role === 'driver' && newP.driver_name && (!oldP.driver_name || oldP.driver_name !== newP.driver_name)) {
              const driverName = profile?.full_name || '';
              if (driverName && newP.driver_name.toLowerCase().includes(driverName.toLowerCase())) {
                handleIncomingNotification({
                  id: `instant-driver-${newP.id}-${Date.now()}`,
                  user_id: userId,
                  title: `🚛 Nouveau Colis Assigné !`,
                  body: `Colis ${newP.tracking_number} (${newP.recipient_governorate} — ${newP.recipient_name}) ajouté à votre tournée.`,
                  type: 'parcel',
                  is_read: false,
                  link: '/driver/tour',
                  created_at: new Date().toISOString(),
                });
              }
            }

            // Status update notification for clients and admins
            if (oldP.status && oldP.status !== newP.status) {
              if (role === 'client' && (newP.sender_id === userId || newP.sender_name === profile?.company_name)) {
                let msgTitle = `Colis ${newP.tracking_number} : Statut mis à jour`;
                let msgBody = `Nouveau statut : ${newP.status}`;
                let msgType: 'info' | 'success' | 'warning' = 'info';

                if (newP.status === 'delivered') {
                  msgTitle = `🎉 Colis ${newP.tracking_number} Livré !`;
                  msgBody = `Votre colis a été remis à ${newP.recipient_name} avec succès.`;
                  msgType = 'success';
                } else if (newP.status === 'in_transit') {
                  msgTitle = `🚚 Colis ${newP.tracking_number} En Route`;
                  msgBody = `Le livreur ${newP.driver_name || ''} est en cours de livraison.`;
                  msgType = 'info';
                } else if (['returned', 'refused', 'cancelled'].includes(newP.status)) {
                  msgTitle = `⚠️ Colis ${newP.tracking_number} : ${newP.status}`;
                  msgBody = `Le colis rencontre un retour ou un refus.`;
                  msgType = 'warning';
                }

                handleIncomingNotification({
                  id: `instant-status-${newP.id}-${Date.now()}`,
                  user_id: userId,
                  title: msgTitle,
                  body: msgBody,
                  type: msgType,
                  is_read: false,
                  link: '/client',
                  created_at: new Date().toISOString(),
                });
              } else if (role === 'admin' && newP.status === 'delivered') {
                handleIncomingNotification({
                  id: `instant-admin-deliv-${newP.id}-${Date.now()}`,
                  user_id: userId,
                  title: `✅ Colis Livré : ${newP.tracking_number}`,
                  body: `Livré par ${newP.driver_name || 'Livreur'} (${newP.total_amount?.toFixed(3)} DT encaissé)`,
                  type: 'success',
                  is_read: false,
                  link: '/admin/shipments',
                  created_at: new Date().toISOString(),
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(parcelsChannel);
    };
  }, [userId, role, profile, handleIncomingNotification]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markAsRead(id, userId);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllAsRead(userId);
  };

  const triggerSoundTest = () => {
    playSound('notification');
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        activeToast,
        dismissToast: () => setActiveToast(null),
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        refreshNotifications,
        triggerSoundTest,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
