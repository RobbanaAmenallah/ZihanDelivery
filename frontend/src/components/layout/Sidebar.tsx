import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  LogOut,
  BarChart2,
  UserCog,
  User,
  PlusCircle,
  Receipt,
  History,
  Tag,
} from 'lucide-react';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/routes/paths';
import { useAuth } from '@/contexts/AuthContext';
import { type UserRole } from '@/types';

// ─── Nav Item Definitions per Role ───────────────────────────────────────────

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'primary' | 'accent';
}

const adminNavItems: NavItem[] = [
  { title: 'Tableau de Bord', href: ROUTES.ADMIN, icon: LayoutDashboard },
  { title: 'Gestion des Colis', href: ROUTES.ADMIN_SHIPMENTS, icon: Package, badge: 'Direct', badgeVariant: 'accent' },
  { title: 'Facturation Clients', href: ROUTES.ADMIN_INVOICES, icon: Receipt, badge: '50% Retour', badgeVariant: 'accent' },
  { title: 'Tarification Clients', href: ROUTES.ADMIN_PRICING, icon: Tag, badge: 'Sur-mesure', badgeVariant: 'accent' },
  { title: 'Gestion Utilisateurs', href: ROUTES.ADMIN_USERS, icon: UserCog, badge: 'Admin', badgeVariant: 'primary' },
  { title: 'Analytiques & Stats', href: ROUTES.ADMIN_ANALYTICS, icon: BarChart2 },
];

const clientNavItems: NavItem[] = [
  { title: 'Tableau de Bord', href: ROUTES.CLIENT, icon: LayoutDashboard },
  { title: 'Mes Expéditions', href: ROUTES.CLIENT_SHIPMENTS, icon: Package, badge: 'Suivi', badgeVariant: 'primary' },
  { title: 'Nouveau Bon', href: ROUTES.CLIENT_CREATE, icon: PlusCircle, badge: '7/10 DT', badgeVariant: 'accent' },
  { title: 'Mes Factures', href: ROUTES.CLIENT_INVOICES, icon: Receipt },
];

const driverNavItems: NavItem[] = [
  { title: 'Tableau de Bord', href: ROUTES.DRIVER, icon: LayoutDashboard },
  { title: 'Ma Tournée Active', href: ROUTES.DRIVER_TOUR, icon: Truck, badge: 'Live', badgeVariant: 'accent' },
  { title: 'Historique Livraisons', href: ROUTES.DRIVER_HISTORY, icon: History },
];

function getNavItems(role: UserRole | null): NavItem[] {
  if (role === 'admin') return adminNavItems;
  if (role === 'client') return clientNavItems;
  if (role === 'driver') return driverNavItems;
  return [];
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onMobileClose,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();

  const navItems = getNavItems(role);

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const handleGoProfile = () => {
    navigate(ROUTES.PROFILE);
    if (onMobileClose) onMobileClose();
  };

  // Initials from full_name
  const initials = (profile?.full_name ?? 'ZI')
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel: Record<UserRole, string> = {
    admin: '🛡️ Administrateur',
    driver: '🚚 Livreur',
    client: '📦 Client',
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out lg:static',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          'w-72',
        )}
      >
        {/* ── Logo Header ─────────────────────────────────────────────────── */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/60">
          <Link to={role === 'admin' ? ROUTES.ADMIN : role === 'driver' ? ROUTES.DRIVER : ROUTES.CLIENT} className="flex items-center gap-2 overflow-hidden">
            <ZihanOfficialLogo
              size={collapsed ? 'sm' : 'md'}
              variant={collapsed ? 'symbol' : 'horizontal'}
              showTagline={false}
            />
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Navigation Principale
            </div>
          )}

          {navItems.map((item) => {
            const isExactMatch = location.pathname === item.href;
            const isNestedMatch =
              item.href !== ROUTES.ADMIN &&
              item.href !== ROUTES.CLIENT &&
              item.href !== ROUTES.DRIVER &&
              location.pathname.startsWith(item.href);
            const isActive = isExactMatch || isNestedMatch;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => { if (onMobileClose) onMobileClose(); }}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 relative overflow-hidden',
                  isActive
                    ? 'bg-[#EEF3F9] text-[#1B3D87] shadow-xs dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-[#667085] hover:bg-[#EEF3F9]/60 hover:text-[#162033] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.title : undefined}
              >
                {/* Active bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#EA4E52] rounded-r" />
                )}

                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive
                      ? 'text-[#1B3D87] dark:text-blue-400'
                      : 'text-muted-foreground group-hover:text-[#1B3D87]',
                  )}
                />

                {!collapsed && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={cn(
                      'text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase',
                      item.badgeVariant === 'accent'
                        ? 'bg-[#EA4E52] text-white'
                        : 'bg-[#1B3D87] text-white',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* ── Mon Profil link ─────────────────────────────────────────── */}
          <div className={cn('pt-3', !collapsed && 'px-3 pb-1')}>
            {!collapsed && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Compte &amp; Sécurité
              </div>
            )}
            <button
              onClick={handleGoProfile}
              className={cn(
                'group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 relative overflow-hidden',
                location.pathname === ROUTES.PROFILE
                  ? 'bg-[#EEF3F9] text-[#1B3D87] shadow-xs dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-[#667085] hover:bg-[#EEF3F9]/60 hover:text-[#162033] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? 'Mon Profil' : undefined}
            >
              {location.pathname === ROUTES.PROFILE && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#EA4E52] rounded-r" />
              )}
              <User
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  location.pathname === ROUTES.PROFILE
                    ? 'text-[#1B3D87] dark:text-blue-400'
                    : 'text-muted-foreground group-hover:text-[#1B3D87]',
                )}
              />
              {!collapsed && <span className="flex-1 truncate text-left">Mon Profil</span>}
            </button>
          </div>
        </div>

        {/* ── Support Encart (admin only) ──────────────────────────────────── */}
        {!collapsed && role === 'admin' && (
          <div className="p-3 m-3 rounded-xl bg-[#EEF3F9] dark:bg-slate-800/60 border border-[#DCE3EC] dark:border-slate-700/60 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-[#1B3D87] dark:text-blue-400">
              <Shield className="h-4 w-4 text-[#EA4E52]" />
              <span>Assistance Logistique</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Support 24/7 pour le dispatching national.
            </p>
          </div>
        )}

        {/* ── User Profile & Logout ────────────────────────────────────────── */}
        <div className="border-t border-border/60 p-3 flex items-center justify-between">
          <button
            onClick={handleGoProfile}
            className="flex items-center gap-2.5 overflow-hidden hover:opacity-80 transition-opacity text-left"
            title="Mon Profil"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B3D87] text-white font-black text-xs shrink-0 shadow-xs">
              {initials}
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="text-xs font-bold text-foreground truncate">
                  {profile?.full_name ?? 'ZIHAN User'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {role ? roleLabel[role] : ''}
                </p>
              </div>
            )}
          </button>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-[#EA4E52]"
              title="Déconnexion"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden lg:flex text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Agrandir' : 'Réduire'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};
