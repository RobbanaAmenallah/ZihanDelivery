import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rounded',
  ...props
}) => {
  const variantClasses = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  }[variant];

  return (
    <div
      className={cn(
        'animate-pulse bg-[#DCE3EC]/60 dark:bg-slate-800',
        variantClasses,
        className
      )}
      {...props}
    />
  );
};

export const StatCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-28" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl" />
    </div>
    <div className="pt-3 border-t border-border/50 flex gap-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="bg-[#EEF3F9] dark:bg-slate-800/80 p-4 border-b border-border flex justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
    </div>
    <div className="p-4 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-3.5 w-2/3" />
    <div className="space-y-2 pt-2">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-4/5" />
    </div>
  </div>
);
