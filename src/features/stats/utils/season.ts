import type { AppSettings } from '@/types';

export const DEFAULT_SEASON_START_DATE = '2026-09-01';
export const DEFAULT_SEASON_START_MS = new Date('2026-09-01T00:00:00').getTime();

/**
 * Returns the season start timestamp in milliseconds based on league settings.
 * Defaults to 2026-09-01 if not configured.
 */
export function getSeasonStartMs(leagueSettings?: AppSettings | { seasonStartDate?: string } | null): number {
  if (leagueSettings?.seasonStartDate) {
    const parsed = new Date(leagueSettings.seasonStartDate).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_SEASON_START_MS;
}

/**
 * Returns the season start date string (YYYY-MM-DD) based on league settings.
 */
export function getSeasonStartDateString(leagueSettings?: AppSettings | { seasonStartDate?: string } | null): string {
  return leagueSettings?.seasonStartDate || DEFAULT_SEASON_START_DATE;
}
