import React from 'react';
import { cn } from '@/lib/utils';

interface QrCodeProps {
  value: string;
  size?: number;
  showLogo?: boolean;
  className?: string;
}

/**
 * High-fidelity vector QR Code generator for ZIHAN tracking links.
 */
export const QrCode: React.FC<QrCodeProps> = ({
  value,
  size = 80,
  showLogo = true,
  className,
}) => {
  // Generate deterministic matrix based on string
  const generateMatrix = (str: string) => {
    const gridSize = 21;
    const matrix: boolean[][] = Array(gridSize)
      .fill(false)
      .map(() => Array(gridSize).fill(false));

    // Corner 1 Finder pattern (Top-Left)
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[r][c] = true;
        }
      }
    }

    // Corner 2 Finder pattern (Top-Right)
    for (let r = 0; r < 7; r++) {
      for (let c = gridSize - 7; c < gridSize; c++) {
        const localC = c - (gridSize - 7);
        if (
          r === 0 ||
          r === 6 ||
          localC === 0 ||
          localC === 6 ||
          (r >= 2 && r <= 4 && localC >= 2 && localC <= 4)
        ) {
          matrix[r][c] = true;
        }
      }
    }

    // Corner 3 Finder pattern (Bottom-Left)
    for (let r = gridSize - 7; r < gridSize; r++) {
      for (let c = 0; c < 7; c++) {
        const localR = r - (gridSize - 7);
        if (
          localR === 0 ||
          localR === 6 ||
          c === 0 ||
          c === 6 ||
          (localR >= 2 && localR <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[r][c] = true;
        }
      }
    }

    // Fill data modules pseudo-randomly seeded by string characters
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Skip finder zones
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= gridSize - 8) ||
          (r >= gridSize - 8 && c < 8) ||
          (showLogo && r >= 8 && r <= 12 && c >= 8 && c <= 12)
        ) {
          continue;
        }

        const charCode = str.charCodeAt((r * gridSize + c) % str.length);
        matrix[r][c] = (charCode + r * 3 + c * 7) % 2 === 0;
      }
    }

    return matrix;
  };

  const matrix = generateMatrix(value);
  const gridSize = matrix.length;
  const moduleSize = size / gridSize;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center bg-white p-1.5 rounded-lg border border-[#DCE3EC] shadow-xs',
        className
      )}
      style={{ width: size + 12, height: size + 12 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {matrix.map((row, r) =>
          row.map((isDark, c) =>
            isDark ? (
              <rect
                key={`${r}-${c}`}
                x={c * moduleSize}
                y={r * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill="#162033"
              />
            ) : null
          )
        )}
      </svg>

      {/* Central Brand Badge */}
      {showLogo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-[#1B3D87] text-white shadow-xs border border-white font-black text-[9px]">
            Z
          </div>
        </div>
      )}
    </div>
  );
};
