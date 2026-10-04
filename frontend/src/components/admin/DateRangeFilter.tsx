import React, { useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

export type QuickFilter = 'today' | '7d' | '30d' | 'all' | 'custom';

export interface DateRange {
  from: string; // ISO date YYYY-MM-DD
  to: string;   // ISO date YYYY-MM-DD
}

interface DateRangeFilterProps {
  /** Active quick filter pill */
  activeFilter: QuickFilter;
  /** Custom date range (only used when activeFilter === 'custom') */
  dateRange: DateRange;
  onChange: (filter: QuickFilter, range: DateRange) => void;
  className?: string;
}

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d',    label: '7 Jours' },
  { key: '30d',   label: '30 Jours' },
  { key: 'all',   label: 'Tout' },
];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  activeFilter,
  dateRange,
  onChange,
  className = '',
}) => {
  const [showCustom, setShowCustom] = useState(activeFilter === 'custom');

  const handleQuickClick = (key: QuickFilter) => {
    if (key === 'custom') return; // handled separately
    setShowCustom(false);
    onChange(key, dateRange);
  };

  const handleCustomClick = () => {
    const newRange = dateRange.from
      ? dateRange
      : { from: todayISO(), to: todayISO() };
    setShowCustom(true);
    onChange('custom', newRange);
  };

  const handleRangeChange = (field: keyof DateRange, value: string) => {
    const updated = { ...dateRange, [field]: value };
    onChange('custom', updated);
  };

  const handleClearCustom = () => {
    setShowCustom(false);
    onChange('7d', { from: '', to: '' });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Quick pill buttons */}
      <div className="flex items-center bg-muted/60 p-1 rounded-lg text-xs font-semibold">
        {QUICK_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleQuickClick(key)}
            className={`px-3 py-1 rounded-md transition-all ${
              activeFilter === key && !showCustom
                ? 'bg-background shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}

        {/* Custom range button */}
        <button
          onClick={handleCustomClick}
          className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${
            activeFilter === 'custom' || showCustom
              ? 'bg-[#1B3D87] text-white font-bold shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Période
        </button>
      </div>

      {/* Date pickers (visible only when custom is active) */}
      {showCustom && (
        <div className="flex items-center gap-1.5 bg-card border border-[#1B3D87]/40 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground">Du</span>
          <input
            type="date"
            value={dateRange.from}
            max={dateRange.to || todayISO()}
            onChange={(e) => handleRangeChange('from', e.target.value)}
            className="text-xs font-semibold text-foreground bg-transparent border-none outline-none cursor-pointer"
          />
          <span className="text-[11px] font-bold text-muted-foreground">au</span>
          <input
            type="date"
            value={dateRange.to}
            min={dateRange.from}
            max={todayISO()}
            onChange={(e) => handleRangeChange('to', e.target.value)}
            className="text-xs font-semibold text-foreground bg-transparent border-none outline-none cursor-pointer"
          />
          <button
            onClick={handleClearCustom}
            className="ml-1 text-muted-foreground hover:text-red-500 transition-colors"
            title="Effacer le filtre personnalisé"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Active range label */}
      {(activeFilter === 'custom' || showCustom) && dateRange.from && dateRange.to && (
        <span className="text-[11px] text-[#1B3D87] font-bold bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-md">
          {new Date(dateRange.from).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          {' → '}
          {new Date(dateRange.to).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )}
    </div>
  );
};

/**
 * Helper: apply a DateRange / QuickFilter to a list of parcels.
 * Returns only parcels whose `created_at` falls within the selected range.
 */
export function applyDateFilter<T extends { created_at: string }>(
  items: T[],
  filter: QuickFilter,
  range: DateRange,
): T[] {
  if (filter === 'all') return items;

  if (filter === 'custom') {
    if (!range.from && !range.to) return items;
    const from = range.from ? new Date(range.from).setHours(0, 0, 0, 0) : -Infinity;
    const to   = range.to   ? new Date(range.to).setHours(23, 59, 59, 999) : Infinity;
    return items.filter((item) => {
      const t = new Date(item.created_at).getTime();
      return t >= from && t <= to;
    });
  }

  const now = Date.now();
  let msRange = 7 * 86400000;
  if (filter === 'today') msRange = 86400000;
  if (filter === '30d')   msRange = 30 * 86400000;

  return items.filter((item) => now - new Date(item.created_at).getTime() <= msRange);
}
