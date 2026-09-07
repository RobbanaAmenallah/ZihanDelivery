import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Menu,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import { useAuth } from '@/contexts/AuthContext';

interface TopbarProps {
  onMenuClick?: () => void;
  className?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, className }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleNewParcel = () => {
    if (role === 'admin') {
      navigate(ROUTES.ADMIN_SHIPMENTS);
    } else if (role === 'client') {
      navigate(ROUTES.CLIENT_CREATE);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 sm:px-6 backdrop-blur-md transition-colors',
        className
      )}
    >
      {/* Left side: Hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden text-foreground"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Global Logistics Search Bar */}
        <div className="relative w-full max-w-sm hidden sm:block">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="N° de colis, client, chauffeur..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3D87] dark:focus-visible:ring-blue-500 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex h-4 items-center rounded border border-border bg-muted px-1.5 font-mono text-[9px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* System Online Badge */}
        <div className="hidden md:flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="font-semibold text-[11px]">Serveur Opérationnel</span>
        </div>

        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={resolvedTheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="text-foreground hover:bg-muted"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-[#1B3D87]" />
          )}
          <span className="sr-only">Changer de thème</span>
        </Button>

        {/* Real Notifications Bell */}
        <NotificationBell />

        {/* Quick Action: Nouveau Colis */}
        {(role === 'admin' || role === 'client') && (
          <Button
            size="sm"
            onClick={handleNewParcel}
            className="hidden sm:inline-flex bg-[#1B3D87] hover:bg-[#15316E] dark:bg-blue-600 dark:hover:bg-blue-700 text-xs font-semibold gap-1.5 h-8"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Nouveau Colis</span>
          </Button>
        )}
      </div>
    </header>
  );
};
