import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

interface SettlementBadgeProps {
  isSettled: boolean;
  settledAt?: string | null;
  size?: 'sm' | 'md';
}

export const SettlementBadge: React.FC<SettlementBadgeProps> = ({
  isSettled,
  settledAt,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const px = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

  if (isSettled) {
    return (
      <span
        title={settledAt ? `Réglé le ${new Date(settledAt).toLocaleDateString('fr-FR')}` : 'Réglé'}
        className={`inline-flex items-center gap-1 ${px} rounded-full font-bold ${textSize} bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800`}
      >
        <CheckCircle2 className={iconSize} />
        Réglé
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${px} rounded-full font-bold ${textSize} bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800`}
    >
      <Clock className={iconSize} />
      Non réglé
    </span>
  );
};
