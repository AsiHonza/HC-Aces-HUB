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
