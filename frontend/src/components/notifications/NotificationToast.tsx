import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle2, AlertTriangle, XCircle, Info, X, Volume2 } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { type NotificationType } from '@/services/notificationsDb';
import { cn } from '@/lib/utils';

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; border: string; bg: string }
> = {
  parcel: {
    icon: Package,
    color: 'text-[#1B3D87] dark:text-blue-400',
    border: 'border-[#1B3D87]/40 dark:border-blue-700',
    bg: 'bg-white dark:bg-slate-900',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    border: 'border-emerald-300 dark:border-emerald-800',
    bg: 'bg-white dark:bg-slate-900',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    border: 'border-amber-300 dark:border-amber-800',
    bg: 'bg-white dark:bg-slate-900',
  },
  error: {
    icon: XCircle,
    color: 'text-red-600',
    border: 'border-red-300 dark:border-red-800',
    bg: 'bg-white dark:bg-slate-900',
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    border: 'border-blue-300 dark:border-blue-800',
    bg: 'bg-white dark:bg-slate-900',
  },
};

export const NotificationToast: React.FC = () => {
  const { activeToast, dismissToast, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!activeToast) return null;

  const cfg = typeConfig[activeToast.type] ?? typeConfig.info;
  const IconComp = cfg.icon;

  const handleClick = async () => {
    await markAsRead(activeToast.id);
    dismissToast();
    if (activeToast.link) {
      navigate(activeToast.link);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300">
      <div
        onClick={handleClick}
        className={cn(
          'cursor-pointer relative overflow-hidden rounded-2xl border-2 p-4 shadow-2xl backdrop-blur-md transition-all hover:scale-[1.02]',
          cfg.border,
          cfg.bg
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80">
            <IconComp className={cn('h-5 w-5', cfg.color)} />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-black text-foreground truncate">
                {activeToast.title}
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
              {activeToast.body}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold text-[#1B3D87] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                Cliquer pour ouvrir
              </span>
              <span className="text-[10px] text-muted-foreground/80 flex items-center gap-0.5">
                <Volume2 className="h-3 w-3" /> Son actif
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar animation */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden">
          <div className="h-full bg-[#1B3D87] dark:bg-blue-500 animate-[shrink_6s_linear_forwards]" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
};
