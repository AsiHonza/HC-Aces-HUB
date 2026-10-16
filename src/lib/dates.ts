import { format, isValid } from 'date-fns';
import { cs } from 'date-fns/locale';

/**
 * Universal safe parser returning a valid JS Date (defaults to now if invalid)
 */
export function toJsDate(date: any): Date {
  if (!date) return new Date();
  if (date instanceof Date) {
    return isValid(date) ? date : new Date();
  }
  if (typeof date.toDate === 'function') {
    const d = date.toDate();
    return isValid(d) ? d : new Date();
  }
  if (typeof date === 'object' && typeof date.seconds === 'number') {
    const d = new Date(date.seconds * 1000);
    return isValid(d) ? d : new Date();
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return isValid(d) ? d : new Date();
  }
  return new Date();
}

/**
 * Universal safe parser returning Date or null if invalid
 */
export function toSafeDate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  if (typeof date.toDate === 'function') {
    const d = date.toDate();
    return isValid(d) ? d : null;
  }
  if (typeof date === 'object' && typeof date.seconds === 'number') {
    const d = new Date(date.seconds * 1000);
    return isValid(d) ? d : null;
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return isValid(d) ? d : null;
  }
  return null;
}

/**
 * Format match date nicely (e.g. "So 18. 10. 2026")
 */
export function formatMatchDate(date: any, pattern: string = 'EEE d. M. yyyy'): string {
  const d = toSafeDate(date);
  if (!d) return '';
  return format(d, pattern, { locale: cs });
}

/**
 * Format match time (e.g. "20:15")
 */
export function formatMatchTime(date: any): string {
  const d = toSafeDate(date);
  if (!d) return '';
  return format(d, 'HH:mm', { locale: cs });
}

/**
 * Calculate countdown components for upcoming matches
 */
export function getMatchCountdown(date: any): {
  days: number;
  hours: number;
  minutes: number;
  isPassed: boolean;
  totalMs: number;
} {
  const target = toSafeDate(date);
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, isPassed: true, totalMs: 0 };
  }

  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPassed: true, totalMs: diff };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  return { days, hours, minutes, isPassed: false, totalMs: diff };
}
