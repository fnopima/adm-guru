import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Format ISO date string (YYYY-MM-DD) to DD/MM/YYYY
 */
export const formatISOToDDMMYYYY = (isoDate?: string): string => {
  if (!isoDate) return '';
  const trimmed = String(isoDate).trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  return trimmed;
};

/**
 * Get Indonesian day name from YYYY-MM-DD
 */
export const getIndonesianDayName = (isoDate?: string): string => {
  if (!isoDate) return '';
  const trimmed = String(isoDate).trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return '';
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return dayNames[d.getDay()] || '';
};

/**
 * Step ISO date by number of days (e.g. -1 for previous day, +1 for next day)
 */
export const stepDateByDays = (dateStr: string, days: number): string => {
  let baseDate = dateStr;
  if (!baseDate) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    baseDate = `${y}-${m}-${d}`;
  }
  const parts = baseDate.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const dt = new Date(year, month, day);
  dt.setDate(dt.getDate() + days);

  const newYear = dt.getFullYear();
  const newMonth = String(dt.getMonth() + 1).padStart(2, '0');
  const newDay = String(dt.getDate()).padStart(2, '0');

  return `${newYear}-${newMonth}-${newDay}`;
};

export interface DateInputDDMMYYYYProps {
  value: string; // Expected YYYY-MM-DD
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  showDayName?: boolean;
  title?: string;
}

/**
 * Date selector input component that ALWAYS visually displays date in DD/MM/YYYY format
 * across all browsers, while keeping the native calendar dropdown picker fully functional.
 */
export const DateInputDDMMYYYY: React.FC<DateInputDDMMYYYYProps> = ({
  value,
  onChange,
  id,
  name,
  className = '',
  placeholder = 'DD/MM/YYYY',
  min,
  max,
  required = false,
  disabled = false,
  showDayName = false,
  title = 'Klik untuk memilih tanggal (Format: DD/MM/YYYY)',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayDate = value ? formatISOToDDMMYYYY(value) : '';
  const dayName = showDayName && value ? getIndonesianDayName(value) : '';
  const displayText = dayName ? `${dayName}, ${displayDate}` : displayDate;

  const handleClickContainer = () => {
    if (disabled) return;
    try {
      if (inputRef.current && 'showPicker' in HTMLInputElement.prototype) {
        inputRef.current.showPicker();
      } else {
        inputRef.current?.focus();
        inputRef.current?.click();
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div
      onClick={handleClickContainer}
      className={`relative inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-emerald-400 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-400/20 rounded-lg px-2.5 py-1.5 transition cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
      } ${className}`}
      title={title}
    >
      <Calendar className="w-4 h-4 text-emerald-600 shrink-0 pointer-events-none" />
      
      <span className={`text-xs font-bold truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>
        {displayText || placeholder}
      </span>

      {/* Hidden native date input that captures native OS / browser datepicker */}
      <input
        ref={inputRef}
        type="date"
        id={id}
        name={name}
        value={value || ''}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer -z-0"
        tabIndex={disabled ? -1 : 0}
        aria-label={title}
      />
    </div>
  );
};
