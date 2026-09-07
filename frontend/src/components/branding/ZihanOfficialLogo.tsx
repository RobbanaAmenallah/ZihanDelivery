import React from 'react';
import { cn } from '@/lib/utils';

export interface ZihanLogoProps {
  variant?: 'full' | 'horizontal' | 'symbol' | 'compact' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showTagline?: boolean;
}

/**
 * Official ZIHAN Super Delivery Express Vector Logo.
 * Conforme aux spécifications : Bouclier central, lettre Z rouge, ailes bleues,
 * typographie ZIHAN en rouge (#EA4E52) et slogan en bleu (#1B3D87).
 */
export const ZihanOfficialLogo: React.FC<ZihanLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className,
  showTagline = true,
}) => {
  const isMonochrome = variant === 'monochrome';
  const blueColor = isMonochrome ? '#FFFFFF' : '#1B3D87';
  const redColor = isMonochrome ? '#FFFFFF' : '#EA4E52';

  const sizeConfigs = {
    sm: {
      symbolWidth: 32,
      symbolHeight: 32,
      titleSize: 'text-base font-black',
      taglineSize: 'text-[8px] font-bold tracking-widest',
      containerGap: 'gap-2',
    },
    md: {
      symbolWidth: 42,
      symbolHeight: 42,
      titleSize: 'text-xl font-black',
      taglineSize: 'text-[10px] font-bold tracking-wider',
      containerGap: 'gap-3',
    },
    lg: {
      symbolWidth: 56,
      symbolHeight: 56,
      titleSize: 'text-2xl font-black',
      taglineSize: 'text-xs font-bold tracking-wider',
      containerGap: 'gap-3.5',
    },
    xl: {
      symbolWidth: 72,
      symbolHeight: 72,
      titleSize: 'text-3xl font-black',
      taglineSize: 'text-sm font-bold tracking-wider',
      containerGap: 'gap-4',
    },
    '2xl': {
      symbolWidth: 96,
      symbolHeight: 96,
      titleSize: 'text-4xl font-black',
      taglineSize: 'text-base font-bold tracking-wider',
      containerGap: 'gap-5',
    },
  };

  const config = sizeConfigs[size];

  // SVG Symbol: Shield + Wings + 'Z'
  const renderSymbol = () => (
    <svg
      width={config.symbolWidth}
      height={config.symbolHeight}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200 hover:scale-105"
    >
      {/* Left Wing (Bleu ZIHAN) */}
      <path
        d="M20 38C20 38 12 44 8 54C6 59 7 62 10 63C14 64 22 58 26 50C28 46 29 42 29 39L20 38Z"
        fill={blueColor}
      />
      <path
        d="M26 30C26 30 14 36 10 46C8 51 9 55 12 55C16 55 26 48 31 39C33 35 34 31 34 29L26 30Z"
        fill={blueColor}
        fillOpacity="0.85"
      />
      <path
        d="M32 22C32 22 18 28 14 38C12 43 14 46 17 46C21 46 32 38 37 28L32 22Z"
        fill={blueColor}
        fillOpacity="0.7"
      />

      {/* Right Wing (Bleu ZIHAN) */}
      <path
        d="M80 38C80 38 88 44 92 54C94 59 93 62 90 63C86 64 78 58 74 50C72 46 71 42 71 39L80 38Z"
        fill={blueColor}
      />
      <path
        d="M74 30C74 30 86 36 90 46C92 51 91 55 88 55C84 55 74 48 69 39C67 35 66 31 66 29L74 30Z"
        fill={blueColor}
        fillOpacity="0.85"
      />
      <path
        d="M68 22C68 22 82 28 86 38C88 43 86 46 83 46C79 46 68 38 63 28L68 22Z"
        fill={blueColor}
        fillOpacity="0.7"
      />

      {/* Central Shield Outline & Base (Bleu ZIHAN) */}
      <path
        d="M50 8L74 20V52C74 68 64 82 50 92C36 82 26 68 26 52V20L50 8Z"
        fill={blueColor}
      />

      {/* Inner Shield Layer */}
      <path
        d="M50 14L70 24V50C70 63 61 75 50 84C39 75 30 63 30 50V24L50 14Z"
        fill={isMonochrome ? '#1B3D87' : '#FFFFFF'}
      />

      {/* Emblematic Stylized 'Z' (Rouge ZIHAN #EA4E52) */}
      <path
        d="M38 32H62L60 40L47 56H63L61 64H37L39 56L52 40H38V32Z"
        fill={redColor}
      />

      {/* Express Speed Dots / Star Accent */}
      <circle cx="50" cy="22" r="2.5" fill={redColor} />
    </svg>
  );

  // Symbol only variant
  if (variant === 'symbol') {
    return (
      <div className={cn('inline-flex items-center justify-center', className)}>
        {renderSymbol()}
      </div>
    );
  }

  // Full / Horizontal / Compact Logo
  return (
    <div
      className={cn(
        'inline-flex items-center select-none',
        config.containerGap,
        variant === 'full' ? 'flex-col text-center' : 'flex-row text-left',
        className
      )}
    >
      {renderSymbol()}

      <div className="flex flex-col leading-tight">
        {/* Brand Name : ZIHAN en ROUGE */}
        <div className="flex items-center gap-1">
          <span
            className={cn(config.titleSize, 'tracking-wider font-extrabold')}
            style={{ color: redColor }}
          >
            ZIHAN
          </span>
          {variant === 'compact' && (
            <span
              className="text-[9px] font-bold px-1 py-0.5 rounded text-white uppercase ml-1"
              style={{ backgroundColor: redColor }}
            >
              Express
            </span>
          )}
        </div>

        {/* Slogan : SUPER DELIVERY EXPRESS en BLEU */}
        {showTagline && variant !== 'compact' && (
          <span
            className={cn(config.taglineSize, 'uppercase font-black')}
            style={{ color: blueColor }}
          >
            Super Delivery Express
          </span>
        )}
      </div>
    </div>
  );
};
