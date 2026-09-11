import React from 'react';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/logo1.jpg';

export interface ZihanLogoProps {
  variant?: 'full' | 'horizontal' | 'symbol' | 'compact' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showTagline?: boolean;
}

/**
 * Official ZIHAN Super Delivery Express Logo Component.
 * Uses the official logo1.jpg asset with responsive scaling and support for all variants.
 */
export const ZihanOfficialLogo: React.FC<ZihanLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-8 max-w-[130px]',
    md: 'h-11 max-w-[170px]',
    lg: 'h-14 max-w-[220px]',
    xl: 'h-20 max-w-[280px]',
    '2xl': 'h-28 max-w-[360px]',
  };

  const symbolSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
    '2xl': 'h-28 w-28',
  };

  if (variant === 'symbol') {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-lg bg-white overflow-hidden p-1 shadow-xs shrink-0',
          symbolSizeClasses[size],
          className
        )}
      >
        <img
          src={logoImg}
          alt="ZIHAN Logo"
          className="h-full w-full object-contain object-top"
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center select-none shrink-0 transition-transform duration-200 hover:scale-[1.02]',
        className
      )}
    >
      <img
        src={logoImg}
        alt="ZIHAN Super Delivery Express"
        className={cn(
          'w-auto object-contain rounded-md',
          sizeClasses[size],
          variant === 'monochrome' && 'brightness-0 invert'
        )}
        loading="eager"
      />
    </div>
  );
};

export default ZihanOfficialLogo;

