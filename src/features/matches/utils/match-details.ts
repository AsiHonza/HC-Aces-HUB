import type { Match } from '@/types';

export interface MatchLike {
  round?: number | null;
  playoffStage?: string | null;
  playoffMatchNumber?: number | null;
  team1?: string;
  team2?: string;
  opponent?: string;
}

/**
 * Returns formatted prefix (e.g. "5. kolo" or "Semifinále - 2. zápas") and opponent name
 */
export function getMatchDetails(match: MatchLike): { prefix: string; opponent: string; fullTitle: string } {
  let prefix = '';
  if (match.round) {
    prefix = `${match.round}. kolo`;
  } else if (match.playoffStage) {
    const stage = match.playoffStage.charAt(0).toUpperCase() + match.playoffStage.slice(1);
    prefix = `${stage}${match.playoffMatchNumber ? ` - ${match.playoffMatchNumber}. zápas` : ''}`;
  }

  let opponent = match.opponent || '';
  if (!opponent && match.team1) {
    opponent = (match.team1 === 'Aces' || match.team1 === 'HC Aces') 
      ? (match.team2 || '') 
      : match.team1;
  }

  const fullTitle = prefix ? `[${prefix}] ${opponent}` : opponent;

  return { prefix, opponent, fullTitle };
}

/**
 * Checks if a goal belonged to HC Aces or opponent
 */
export function isAcesGoal(goal: { team?: string }): boolean {
  return goal.team === 'aces' || goal.team === 'home';
}

/**
 * Ověří, zda jsou u odehraného zápasu již skutečně zapsány hráčské statistiky (střelci a nahrávky z HobbyHokeje nebo ručního zápisu).
 *
 * Řeší situaci, kdy se na HobbyHokeji zpozdí zápis statistik utkání (page29.html):
 * Zápas už má zapsané celkové skóre (např. 5:9) a v kabině už byly odhlasovány 3 Hvězdy zápasu,
 * ale pole `detailedScorers` / `scorers` je zatím prázdné. Dokud nejsou střelci gólů zapsáni,
 * vrací `false`, aby nedocházelo k falešnému udělování odznaku „Dělník ledu (0+0)“ ani k přerušení
 * aktivních bodových šňůr („Hot Streaks“).
 */
export function hasMatchStatsRecorded(match: Match | null | undefined): boolean {
  if (!match || !match.isPlayed) return false;

  const isT1 = /aces/i.test(match.team1 || '');
  const isT2 = /aces/i.test(match.team2 || '');
  const acesScore = isT1 ? Number(match.team1Score ?? 0) : Number(match.team2Score ?? 0);
  const oppScore = isT1 ? Number(match.team2Score ?? 0) : Number(match.team1Score ?? 0);

  let detailedAcesGoals = 0;
  if (Array.isArray(match.detailedScorers)) {
    for (const ds of match.detailedScorers) {
      if (!ds || !ds.scorer) continue;
      const isAces =
        (isT1 && ds.team === 'team1') ||
        (isT2 && ds.team === 'team2') ||
        /aces/i.test(ds.team || '') ||
        /aces/i.test((ds as any).teamName || '');
      if (isAces) {
        detailedAcesGoals += 1;
      }
    }
  }

  const simpleAcesGoals = Array.isArray(match.scorers)
    ? match.scorers.filter((s) => Boolean(s && s.goal)).length
    : 0;

  const recordedAcesGoals = Math.max(detailedAcesGoals, simpleAcesGoals);

  const hasOfficialReport = Boolean(
    (Array.isArray(match.detailedScorers) && match.detailedScorers.length > 0) ||
    (Array.isArray(match.gameRoster) && match.gameRoster.length > 0) ||
    match.periodScores
  );

  if (acesScore > 0) {
    if (recordedAcesGoals === 0) return false;
    if (!hasOfficialReport && recordedAcesGoals < acesScore) return false;
    return true;
  }

  // Pokud Aces vstřelili 0 branek, vyžadujeme existenci oficiálního zápisu utkání nebo střel/zákroků,
  // aby se nekompletní zápas 0:0 nepovažoval za odehraný se statistikami.
  if (oppScore === 0 && !hasOfficialReport) return false;
  return (
    hasOfficialReport ||
    Number(match.shotsOpponent ?? 0) > 0 ||
    Number(match.goalieSaves ?? 0) > 0
  );
}
