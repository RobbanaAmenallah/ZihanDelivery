import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Package,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
  Volume2,
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { type Notification, type NotificationType } from '@/services/notificationsDb';
import { cn } from '@/lib/utils';

// ─── Icon per notification type ───────────────────────────────────────────────

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  parcel: { icon: Package, color: 'text-[#1B3D87]', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40' },
  info: { icon: Info, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800' },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'À l\'instant';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    triggerSoundTest,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleNotificationClick = async (notif: Notification) => {
    await markAsRead(notif.id);
    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors"
        title="Notifications en direct (avec son)"
      >
        <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EA4E52] text-[9px] font-black text-white ring-2 ring-background px-0.5 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-16px)] rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#1B3D87]" />
              <h3 className="text-sm font-black text-foreground">Notifications Live</h3>
              {unreadCount > 0 && (
                <span className="bg-[#EA4E52] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={triggerSoundTest}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-[#1B3D87] p-1 rounded hover:bg-muted transition-colors"
                title="Tester le son de notification"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[10px]">Test Son</span>
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#1B3D87] hover:underline"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout lire
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="ml-1 text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Chargement des notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-muted-foreground">Aucune notification</p>
                <p className="text-xs text-muted-foreground">Toutes les notifications en temps réel apparaîtront ici.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = typeConfig[notif.type] ?? typeConfig.info;
                const IconComp = cfg.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors',
                      !notif.is_read && 'bg-blue-50/40 dark:bg-blue-950/20'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', cfg.bg)}>
                      <IconComp className={cn('h-3.5 w-3.5', cfg.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-bold leading-snug', !notif.is_read ? 'text-[#1B3D87] dark:text-blue-300' : 'text-foreground')}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.is_read && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#EA4E52]" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground font-medium">
                {notifications.length} notification{notifications.length > 1 ? 's' : ''} au total
              </p>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Realtime Actif
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
