import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// eslint-disable-next-line react-refresh/only-export-components
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        // Bleu principal ZIHAN
        default:
          'bg-[#1B3D87] text-white hover:bg-[#15316E] dark:bg-blue-600',
        // Bleu doux secondaire
        secondary:
          'bg-[#EEF3F9] text-[#1B3D87] border border-[#DCE3EC] dark:bg-slate-800 dark:text-blue-400 dark:border-slate-700',
        // Rouge express / urgent
        accent:
          'bg-[#EA4E52] text-white dark:bg-[#EF4D52]',
        // Rouge clair
        destructive:
          'bg-[#FEECEC] text-[#EA4E52] border border-[#FCD4D4] dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
        // Succès / Livré
        success:
          'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
        // En transit / En cours
        warning:
          'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        // Discret
        outline:
          'border border-border text-[#162033] dark:text-slate-200',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.2 text-[10px]',
        lg: 'px-3.5 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  withDot?: boolean;
  pulseDot?: boolean;
}

function Badge({
  className,
  variant,
  size,
  withDot = false,
  pulseDot = false,
  children,
  ...props
}: BadgeProps) {
  const dotColor = {
    default: 'bg-white',
    secondary: 'bg-[#1B3D87] dark:bg-blue-400',
    accent: 'bg-white',
    destructive: 'bg-[#EA4E52]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    outline: 'bg-[#1B3D87]',
  }[variant || 'default'];

  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {withDot && (
        <span className="relative flex h-2 w-2">
          {pulseDot && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                dotColor
              )}
            />
          )}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', dotColor)} />
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

export { Badge };
