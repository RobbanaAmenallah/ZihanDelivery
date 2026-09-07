import React from 'react';
import { ParcelStatus, PARCEL_STATUSES } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';

export interface StatusBadgeProps {
  status: ParcelStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  showDot = false,
  pulse = false,
  className,
}) => {
  const meta = PARCEL_STATUSES[status] || PARCEL_STATUSES.pending;
  const Icon = meta.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border shadow-xs transition-colors select-none',
        meta.badgeBg,
        meta.textColor,
        meta.borderColor,
        sizeClasses,
        className
      )}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                meta.dotColor
              )}
            />
          )}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', meta.dotColor)} />
        </span>
      )}

      {showIcon && <Icon className={iconSizes} />}

      <span>{meta.label}</span>
    </span>
  );
};
