import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { type UserRole } from '@/types';
import { ROUTES } from '@/routes/paths';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If specified, only users with this role can access the route */
  requiredRole?: UserRole;
}

/**
 * ProtectedRoute — wraps a page and redirects to /login if the user is not
 * authenticated. If requiredRole is given, redirects to the user's proper portal.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, role, isLoading, isProfileLoading } = useAuth();
  const location = useLocation();

  // Still checking session / profile
  if (isLoading || isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          {/* ZIHAN branded loader */}
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-[#1B3D87]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#1B3D87] animate-spin" />
          </div>
          <p className="text-xs font-bold text-muted-foreground">
            Vérification de votre session ZIHAN…
          </p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login, preserving intended destination
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Wrong role → redirect to the correct portal for this user (NEVER send back to login!)
  if (requiredRole && role !== requiredRole) {
    const redirect =
      role === 'driver'
        ? ROUTES.DRIVER
        : role === 'client'
        ? ROUTES.CLIENT
        : ROUTES.ADMIN;

    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
};
