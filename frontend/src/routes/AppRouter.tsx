import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { LandingPage } from '@/pages/public/LandingPage';
import { PublicTrackingPage } from '@/pages/public/PublicTrackingPage';
import { LoginPage } from '@/pages/auth/LoginPage';

// Admin Pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UsersManagementPage } from '@/pages/admin/UsersManagementPage';
import { ParcelsManagementPage } from '@/pages/admin/ParcelsManagementPage';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';
import { ClientPricingManagementPage } from '@/pages/admin/ClientPricingManagementPage';
import { AdminInvoicesPage } from '@/pages/admin/AdminInvoicesPage';

// Client Pages
import { ClientDashboardPage } from '@/pages/client/ClientDashboardPage';
import { ClientShipmentsPage } from '@/pages/client/ClientShipmentsPage';
import { ClientCreateParcelPage } from '@/pages/client/ClientCreateParcelPage';

// Driver Pages
import { DriverDashboardPage } from '@/pages/driver/DriverDashboardPage';
import { DriverTourPage } from '@/pages/driver/DriverTourPage';
import { DriverHistoryPage } from '@/pages/driver/DriverHistoryPage';

// Shared
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROUTES } from './paths';

const router = createBrowserRouter([
  // ── Public pages ──────────────────────────────────────────────────────────
  { path: ROUTES.HOME, element: <LandingPage /> },
  { path: ROUTES.TRACKING, element: <PublicTrackingPage /> },
  { path: ROUTES.LOGIN, element: <LoginPage /> },

  // ── Shared Authenticated (All Roles: Admin, Client, Driver) ───────────────
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.PROFILE, element: <ProfilePage /> },
    ],
  },

  // ── Admin portal ──────────────────────────────────────────────────────────
  {
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.ADMIN, element: <AdminDashboard /> },
      { path: ROUTES.ADMIN_SHIPMENTS, element: <ParcelsManagementPage /> },
      { path: ROUTES.ADMIN_INVOICES, element: <AdminInvoicesPage /> },
      { path: ROUTES.ADMIN_PRICING, element: <ClientPricingManagementPage /> },
      { path: ROUTES.ADMIN_USERS, element: <UsersManagementPage /> },
      { path: ROUTES.ADMIN_ANALYTICS, element: <AdminAnalyticsPage /> },
      { path: ROUTES.DESIGN_SYSTEM, element: <AdminAnalyticsPage /> }, // legacy redirect
    ],
  },

  // ── Client portal ─────────────────────────────────────────────────────────
  {
    element: (
      <ProtectedRoute requiredRole="client">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.CLIENT, element: <ClientDashboardPage /> },
      { path: ROUTES.CLIENT_SHIPMENTS, element: <ClientShipmentsPage /> },
      { path: ROUTES.CLIENT_CREATE, element: <ClientCreateParcelPage /> },
      { path: ROUTES.CLIENT_INVOICES, element: <Navigate to={ROUTES.CLIENT} replace /> },
    ],
  },

  // ── Driver portal ─────────────────────────────────────────────────────────
  {
    element: (
      <ProtectedRoute requiredRole="driver">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.DRIVER, element: <DriverDashboardPage /> },
      { path: ROUTES.DRIVER_TOUR, element: <DriverTourPage /> },
      { path: ROUTES.DRIVER_HISTORY, element: <DriverHistoryPage /> },
    ],
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
