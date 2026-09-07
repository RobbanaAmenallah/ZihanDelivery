import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, Box } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Truck className="h-5 w-5" />
          </div>
          <span>{APP_NAME}</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link
            to="/"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Box className="h-4 w-4" />
            <span>Accueil</span>
          </Link>
          <div className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Système Prêt</span>
          </div>
        </nav>
      </div>
    </header>
  );
};
