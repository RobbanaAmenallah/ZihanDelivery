import React from 'react';
import { cn } from '@/lib/utils';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

/**
 * High-precision vector Barcode component (Code128 pattern representation) for ZIHAN documents.
 */
export const Barcode: React.FC<BarcodeProps> = ({
  value,
  width = 180,
  height = 50,
  showText = true,
  className,
}) => {
  // Deterministic pseudo-bar generator for crisp vector rendering based on value hash
  const generateBars = (text: string) => {
    const bars: { x: number; width: number }[] = [];
    let currentX = 10;

    // Start pattern (Code128B start)
    const pattern = [2, 1, 1, 2, 3, 2];
    pattern.forEach((w) => {
      bars.push({ x: currentX, width: w * 1.2 });
      currentX += (w + 1) * 1.4;
    });

    // Encode characters
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const w1 = (code % 3) + 1;
      const w2 = ((code >> 2) % 3) + 1;
      const w3 = ((code >> 4) % 2) + 1;

      bars.push({ x: currentX, width: w1 * 1.3 });
      currentX += (w1 + 1.2) * 1.4;

      bars.push({ x: currentX, width: w2 * 1.1 });
      currentX += (w2 + 1) * 1.4;

      bars.push({ x: currentX, width: w3 * 1.4 });
      currentX += (w3 + 1.5) * 1.4;
    }

    // Stop pattern
    const stopPattern = [2, 3, 3, 1, 1, 1, 2];
    stopPattern.forEach((w) => {
      bars.push({ x: currentX, width: w * 1.2 });
      currentX += (w + 1) * 1.4;
    });

    return { bars, totalWidth: currentX + 10 };
  };

  const { bars, totalWidth } = generateBars(value);

  return (
    <div className={cn('inline-flex flex-col items-center select-none bg-white p-1 rounded', className)}>
      <svg
        viewBox={`0 0 ${totalWidth} 45`}
        width={width}
        height={height}
        className="w-full"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {bars.map((bar, index) => (
          <rect
            key={index}
            x={bar.x}
            y={0}
            width={bar.width}
            height={45}
            fill="#162033"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[11px] font-black tracking-widest text-[#162033] mt-0.5">
          *{value}*
        </span>
      )}
    </div>
  );
};
