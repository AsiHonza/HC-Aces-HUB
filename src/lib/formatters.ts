import { PeriodScore, MatchResult } from '@/types';

/**
 * Format match result string (e.g. "5 : 2")
 */
export function formatScore(result?: MatchResult | null): string {
  if (!result || result.aces === undefined || result.opponent === undefined) {
    return '- : -';
  }
  return `${result.aces} : ${result.opponent}`;
}

/**
 * Format period scores summary (e.g. "(2:0, 1:1, 2:1)")
 */
export function formatPeriodScoresSummary(periods?: PeriodScore[]): string {
  if (!periods || periods.length === 0) return '';
  const parts = periods.map(p => `${p.aces}:${p.opponent}`);
  return `(${parts.join(', ')})`;
}

/**
 * Format goalie save percentage (e.g. "93.5 %")
 */
export function formatSavePercentage(percentage: number | null | undefined): string {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return '0.0 %';
  }
  return `${percentage.toFixed(1)} %`;
}

/**
 * Czech inflection helper for goals (gól, góly, gólů)
 */
export function formatGoalCount(count: number): string {
  if (count === 1) return '1 gól';
  if (count >= 2 && count <= 4) return `${count} góly`;
  return `${count} gólů`;
}

/**
 * Czech inflection helper for points (bod, body, bodů)
 */
export function formatPointCount(count: number): string {
  if (count === 1) return '1 bod';
  if (count >= 2 && count <= 4) return `${count} body`;
  return `${count} bodů`;
}

/**
 * Czech inflection helper for attendees count (hráč, hráči, hráčů)
 */
export function formatPlayerCount(count: number): string {
  if (count === 1) return '1 hráč';
  if (count >= 2 && count <= 4) return `${count} hráči`;
  return `${count} hráčů`;
}
