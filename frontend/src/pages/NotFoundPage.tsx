import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">404 - Page non trouvée</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        La ressource demandée n'existe pas ou a été déplacée.
      </p>
      <Button asChild variant="outline" className="gap-2">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
      </Button>
    </div>
  );
};
