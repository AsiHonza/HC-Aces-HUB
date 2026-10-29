import type { AppSettings, Match, PlayoffSeries, LeagueMatchItem } from '@/types';
import { normalizeClubName, areClubNamesMatching } from '@/features/league/utils/league-analytics';
import { toSafeDate } from '@/lib/dates';

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

export interface FinalsSeriesStatus {
  isFinished: boolean;
  winnerTeam?: string;
  loserTeam?: string;
  winnerWins: number;
  loserWins: number;
  seriesScore: string; // e.g. "3 : 1"
  isAcesInvolved: boolean;
  isAcesWinner: boolean;
  source: 'aces_matches' | 'playoff_series' | 'league_matches' | 'none';
  finalGamesCount: number;
  message?: string;
}

/**
 * Detects if the season playoff finals (played on 3 winning games / best-of-5) is finished.
 * Checks:
 * 1. Matches in Aces HUB (`matches` collection) with playoffStage === 'finále'
 * 2. Playoff series configuration (`leagueSettings.playoffSeries`)
 * 3. Scraped league matches (`leagueSettings.leagueMatches`)
 */
export function detectFinalsStatus(params: {
  matches?: Match[] | null;
  playoffSeries?: PlayoffSeries[] | null;
  leagueMatches?: LeagueMatchItem[] | null;
  seasonStartDate?: string | number | Date | null;
  currentSeasonId?: string | null;
  isPlayoffEnabled?: boolean | null;
}): FinalsSeriesStatus {
  const { matches = [], playoffSeries = [], leagueMatches = [] } = params;
  const seasonStartMs = getSeasonStartMs(
    params.seasonStartDate ? { seasonStartDate: String(params.seasonStartDate) } : undefined
  );

  // 1. Check Aces matches (from 'matches' collection) - ONLY for current season
  if (matches && matches.length > 0 && params.isPlayoffEnabled !== false) {
    const finalMatches = matches.filter((m) => {
      if (!m.isPlayed) return false;
      if (m.type !== 'playoff' && m.matchType !== 'playoff') return false;
      if (!m.playoffStage || !/fin[aá]l/i.test(m.playoffStage)) return false;
      if (m.team1Score === undefined || m.team2Score === undefined) return false;
      // Filter by season
      if (params.currentSeasonId && m.seasonId && m.seasonId !== params.currentSeasonId) return false;
      if (m.dateTime) {
        const mTime = toSafeDate(m.dateTime)?.getTime() ?? 0;
        if (mTime > 0 && mTime < seasonStartMs) return false;
      }
      return true;
    });

    if (finalMatches.length > 0) {
      // Group by specific opponent pair - a final series is always against ONE opponent!
      const oppSeriesMap = new Map<string, { oppName: string; acesWins: number; oppWins: number; games: number }>();

      finalMatches.forEach((m) => {
        const t1 = normalizeClubName(m.team1 || 'HC Aces');
        const t2 = normalizeClubName(m.opponent || m.team2 || 'Soupeř');
        const oppName = areClubNamesMatching(t1, 'Aces') ? t2 : t1;

        if (!oppSeriesMap.has(oppName)) {
          oppSeriesMap.set(oppName, { oppName, acesWins: 0, oppWins: 0, games: 0 });
        }
        const s = oppSeriesMap.get(oppName)!;
        s.games++;

        const acesScore = areClubNamesMatching(t1, 'Aces') ? m.team1Score! : m.team2Score!;
        const oppScore = areClubNamesMatching(t1, 'Aces') ? m.team2Score! : m.team1Score!;

        if (acesScore > oppScore) {
          s.acesWins++;
        } else if (oppScore > acesScore) {
          s.oppWins++;
        }
      });

      for (const s of oppSeriesMap.values()) {
        // In a best-of-5 series, winner has 3 wins, loser has at most 2 wins (3:0, 3:1, 3:2).
        // If both have 3+ wins (e.g. 3:3 or 6:3), data is mixed/corrupted across multiple years -> reject!
        if ((s.acesWins >= 3 || s.oppWins >= 3) && !(s.acesWins >= 3 && s.oppWins >= 3)) {
          const isAcesWinner = s.acesWins >= 3;
          const winnerWins = 3;
          const loserWins = isAcesWinner ? s.oppWins : s.acesWins;
          if (loserWins <= 2) {
            return {
              isFinished: true,
              winnerTeam: isAcesWinner ? 'HC Aces' : s.oppName,
              loserTeam: isAcesWinner ? s.oppName : 'HC Aces',
              winnerWins,
              loserWins,
              seriesScore: `${winnerWins} : ${loserWins}`,
              isAcesInvolved: true,
              isAcesWinner,
              source: 'aces_matches',
              finalGamesCount: s.games,
              message: isAcesWinner
                ? `HC Aces vyhrál finálovou sérii ${winnerWins}:${loserWins} na zápasy!`
                : `${s.oppName} vyhrál finálovou sérii ${winnerWins}:${loserWins} na zápasy!`,
            };
          }
        }
      }
    }
  }

  // 2. Check Playoff Series in settings
  if (playoffSeries && playoffSeries.length > 0) {
    const finalSeries = playoffSeries.find(
      (s) =>
        (s.round && /fin[aá]l/i.test(s.round)) ||
        (s.stage && /fin[aá]l/i.test(s.stage)) ||
        (s.stageName && /fin[aá]l/i.test(s.stageName))
    );

    if (finalSeries) {
      const acesWins = Number(finalSeries.acesWins ?? finalSeries.wins ?? 0);
      const oppWins = Number(finalSeries.opponentWins ?? finalSeries.losses ?? 0);
      const oppName = normalizeClubName(finalSeries.opponent || 'Soupeř');

      // Best-of-5 series: either team has 3 wins or explicitly marked finished, but NOT 3:3
      if ((acesWins >= 3 || oppWins >= 3 || finalSeries.isFinished) && !(acesWins >= 3 && oppWins >= 3)) {
        const isAcesWinner = acesWins >= 3 || finalSeries.winner === 'aces';
        const winnerWins = Math.max(acesWins, oppWins) || 3;
        const loserWins = Math.min(acesWins, oppWins);
        if (loserWins <= 2) {
          return {
            isFinished: true,
            winnerTeam: isAcesWinner ? 'HC Aces' : oppName,
            loserTeam: isAcesWinner ? oppName : 'HC Aces',
            winnerWins: winnerWins > 0 ? winnerWins : 3,
            loserWins,
            seriesScore: `${winnerWins > 0 ? winnerWins : 3} : ${loserWins}`,
            isAcesInvolved: true,
            isAcesWinner,
            source: 'playoff_series',
            finalGamesCount: acesWins + oppWins,
            message: isAcesWinner
              ? `HC Aces vyhrál finálovou sérii ${winnerWins > 0 ? winnerWins : 3}:${loserWins} na zápasy!`
              : `${oppName} vyhrál finálovou sérii ${winnerWins > 0 ? winnerWins : 3}:${loserWins} na zápasy!`,
          };
        }
      }
    }
  }

  // 3. Check Scraped League Matches
  if (leagueMatches && leagueMatches.length > 0 && params.isPlayoffEnabled !== false) {
    // Find played playoff/final matches (round >= 15 or notes matching final)
    const playoffMatches = leagueMatches.filter(
      (m) =>
        m.isPlayed &&
        m.score1 !== undefined &&
        m.score2 !== undefined &&
        (m.round >= 15 ||
          (m.referee && /fin[aá]l/i.test(m.referee)) ||
          (m.dayOfWeek && /fin[aá]l/i.test(m.dayOfWeek)) ||
          (m.arena && /fin[aá]l/i.test(m.arena)))
    );

    if (playoffMatches.length > 0) {
      // Group by pairs
      const pairStats = new Map<string, { teamA: string; teamB: string; winsA: number; winsB: number; count: number }>();
      playoffMatches.forEach((m) => {
        const t1 = normalizeClubName(m.team1);
        const t2 = normalizeClubName(m.team2);
        const pairKey = [t1, t2].sort().join(' vs ');
        if (!pairStats.has(pairKey)) {
          pairStats.set(pairKey, { teamA: t1, teamB: t2, winsA: 0, winsB: 0, count: 0 });
        }
        const stat = pairStats.get(pairKey)!;
        stat.count++;
        if (m.score1! > m.score2!) {
          if (stat.teamA === t1) stat.winsA++;
          else stat.winsB++;
        } else if (m.score2! > m.score1!) {
          if (stat.teamB === t2) stat.winsB++;
          else stat.winsA++;
        }
      });

      for (const stat of pairStats.values()) {
        if ((stat.winsA >= 3 || stat.winsB >= 3) && !(stat.winsA >= 3 && stat.winsB >= 3)) {
          const winnerTeam = stat.winsA >= 3 ? stat.teamA : stat.teamB;
          const loserTeam = stat.winsA >= 3 ? stat.teamB : stat.teamA;
          const winnerWins = Math.max(stat.winsA, stat.winsB);
          const loserWins = Math.min(stat.winsA, stat.winsB);
          if (loserWins <= 2) {
            const isAcesInvolved = areClubNamesMatching(stat.teamA, 'Aces') || areClubNamesMatching(stat.teamB, 'Aces');
            const isAcesWinner = areClubNamesMatching(winnerTeam, 'Aces');
            return {
              isFinished: true,
              winnerTeam,
              loserTeam,
              winnerWins,
              loserWins,
              seriesScore: `${winnerWins} : ${loserWins}`,
              isAcesInvolved,
              isAcesWinner,
              source: 'league_matches',
              finalGamesCount: stat.count,
              message: `${winnerTeam} vyhrál finálovou sérii ${winnerWins}:${loserWins} na zápasy!`,
            };
          }
        }
      }
    }
  }

  return {
    isFinished: false,
    winnerWins: 0,
    loserWins: 0,
    seriesScore: '0 : 0',
    isAcesInvolved: false,
    isAcesWinner: false,
    source: 'none',
    finalGamesCount: 0,
  };
}

