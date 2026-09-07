import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  description?: string;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  className?: string;
  badgeText?: string;
  badgeVariant?: 'primary' | 'accent' | 'success' | 'warning';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBgColor = 'bg-[#EEF3F9] dark:bg-slate-800',
  iconColor = 'text-[#1B3D87] dark:text-blue-400',
  description,
  trend,
  className,
  badgeText,
  badgeVariant = 'primary',
}) => {
  const badgeClasses = {
    primary: 'bg-[#EEF3F9] text-[#1B3D87] border-[#DCE3EC]',
    accent: 'bg-[#FEECEC] text-[#EA4E52] border-[#FCD4D4]',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
  }[badgeVariant];

  return (
    <Card hoverEffect className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-400">
              {title}
            </p>
            <h4 className="text-2xl font-black tracking-tight text-[#162033] dark:text-white">
              {value}
            </h4>
          </div>

          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl transition-transform hover:scale-105 shadow-xs',
              iconBgColor,
              iconColor
            )}
          >
            {icon}
          </div>
        </div>

        {(trend || description || badgeText) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/50 text-xs">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5',
                  trend.direction === 'up' &&
                    'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
                  trend.direction === 'down' &&
                    'text-[#EA4E52] bg-[#FEECEC] dark:bg-red-950/50 dark:text-red-400',
                  trend.direction === 'neutral' &&
                    'text-muted-foreground bg-muted'
                )}
              >
                {trend.direction === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                {trend.direction === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                {trend.direction === 'neutral' && <Minus className="h-3.5 w-3.5" />}
                <span>{trend.value}</span>
              </span>
            )}

            {trend?.label && (
              <span className="text-muted-foreground">{trend.label}</span>
            )}

            {description && !trend && (
              <span className="text-muted-foreground">{description}</span>
            )}

            {badgeText && (
              <span
                className={cn(
                  'ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                  badgeClasses
                )}
              >
                {badgeText}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
