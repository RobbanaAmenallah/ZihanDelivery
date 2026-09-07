import React from 'react';
import { Outlet } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export const AuthLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-6 flex items-center gap-2 font-bold text-xl text-primary">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Truck className="h-6 w-6" />
        </div>
        <span>{APP_NAME}</span>
      </div>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <Outlet />
      </div>
    </div>
  );
};
