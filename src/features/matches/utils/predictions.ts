import type { Match, UserProfile } from '@/types';
import { areNamesMatching } from '@/lib/utils';

export interface MatchPredictionData {
  acesScore: number;
  opponentScore: number;
  firstScorerId?: string | null;
  updatedAt?: any;
}

export interface EvaluatedMatchPrediction {
  userId: string;
  userName: string;
  userJersey?: number | null;
  userPhoto?: string | null;
  prediction: MatchPredictionData;
  firstScorerName?: string | null;
  totalPoints: number;
  scorePoints: number;
  scorerBonusPoints: number;
  isExactScore: boolean;
  isExactDiff: boolean;
  isCorrectWinner: boolean;
  isCorrectFirstScorer: boolean;
  badgeLabel: string;
}

export interface OracleLeaderboardEntry {
  userId: string;
  userName: string;
  userJersey?: number | null;
  userPhoto?: string | null;
  totalPoints: number;
  predictionsCount: number;
  exactScoreHits: number;
  firstScorerHits: number;
  winnerHits: number;
}

/**
 * Determines the first HC Aces goal scorer in a played match.
 */
export function getFirstAcesScorerInMatch(
  match: Match,
  users: UserProfile[] = []
): { userId: string | null; rawName: string | null } {
  const isAcesTeam1 = /aces/i.test(match.team1 || '');

  let firstRawScorer: string | null = null;

  if (Array.isArray(match.detailedScorers) && match.detailedScorers.length > 0) {
    const acesGoals = match.detailedScorers
      .filter((ds) => {
        return (
          (isAcesTeam1 && ds.team === 'team1') ||
          (!isAcesTeam1 && ds.team === 'team2') ||
          /aces/i.test(ds.team || '')
        );
      })
      .sort((a, b) => Number(a.minute || 0) - Number(b.minute || 0));

    if (acesGoals.length > 0 && acesGoals[0].scorer) {
      firstRawScorer = acesGoals[0].scorer;
    }
  }

  if (!firstRawScorer && Array.isArray(match.scorers) && match.scorers.length > 0) {
    if (match.scorers[0]?.goal) {
      firstRawScorer = match.scorers[0].goal;
    }
  }

  if (!firstRawScorer) {
    return { userId: null, rawName: null };
  }

  const matchedUser =
    users.find((u) => u.id === firstRawScorer) ||
    users.find((u) => areNamesMatching(u.name, firstRawScorer!));

  return {
    userId: matchedUser ? matchedUser.id : null,
    rawName: matchedUser ? matchedUser.name : firstRawScorer,
  };
}

/**
 * Evaluates a single player's prediction against a played match result.
 * Scoring:
 * - Exact score: +5 pts
 * - Correct winner + exact goal difference: +2 pts
 * - Correct winner (or draw): +1 pt
 * - Correct 1st Aces goal scorer: +3 bonus pts
 */
export function evaluateMatchPrediction(
  userId: string,
  prediction: MatchPredictionData,
  match: Match,
  users: UserProfile[] = []
): EvaluatedMatchPrediction {
  const usersMap = new Map(users.map((u) => [u.id, u]));
  const user = usersMap.get(userId);
  const firstScorerUser = prediction.firstScorerId ? usersMap.get(prediction.firstScorerId) : null;

  const isAcesTeam1 = /aces/i.test(match.team1 || '');
  const actualAces = isAcesTeam1 ? Number(match.team1Score ?? 0) : Number(match.team2Score ?? 0);
  const actualOpp = isAcesTeam1 ? Number(match.team2Score ?? 0) : Number(match.team1Score ?? 0);

  const predAces = Number(prediction.acesScore ?? 0);
  const predOpp = Number(prediction.opponentScore ?? 0);

  let scorePoints = 0;
  let isExactScore = false;
  let isExactDiff = false;
  let isCorrectWinner = false;

  if (match.isPlayed) {
    const actualDiff = actualAces - actualOpp;
    const predDiff = predAces - predOpp;

    if (predAces === actualAces && predOpp === actualOpp) {
      scorePoints = 5;
      isExactScore = true;
      isExactDiff = true;
      isCorrectWinner = true;
    } else if (predDiff === actualDiff) {
      scorePoints = 2;
      isExactDiff = true;
      isCorrectWinner = true;
    } else if (Math.sign(predDiff) === Math.sign(actualDiff)) {
      scorePoints = 1;
      isCorrectWinner = true;
    }
  }

  let scorerBonusPoints = 0;
  let isCorrectFirstScorer = false;

  if (match.isPlayed && prediction.firstScorerId && prediction.firstScorerId !== 'none') {
    const actualFirst = getFirstAcesScorerInMatch(match, users);
    if (
      (actualFirst.userId && actualFirst.userId === prediction.firstScorerId) ||
      (actualFirst.rawName &&
        firstScorerUser &&
        areNamesMatching(firstScorerUser.name, actualFirst.rawName))
    ) {
      scorerBonusPoints = 3;
      isCorrectFirstScorer = true;
    }
  }

  const totalPoints = scorePoints + scorerBonusPoints;

  let badgeLabel = '0 b.';
  if (isExactScore && isCorrectFirstScorer) badgeLabel = 'Jackpot (+8 b.)';
  else if (isExactScore) badgeLabel = 'Přesné skóre (+5 b.)';
  else if (isCorrectFirstScorer && scorePoints > 0) badgeLabel = `Střelec + tip (+${totalPoints} b.)`;
  else if (isCorrectFirstScorer) badgeLabel = '1. střelec (+3 b.)';
  else if (isExactDiff) badgeLabel = 'Přesný rozdíl (+2 b.)';
  else if (isCorrectWinner) badgeLabel = 'Vítěz (+1 b.)';

  return {
    userId,
    userName: user?.name || 'Hráč',
    userJersey: user?.jerseyNumber ?? null,
    userPhoto: user?.photoURL ?? null,
    prediction,
    firstScorerName: firstScorerUser?.name || null,
    totalPoints,
    scorePoints,
    scorerBonusPoints,
    isExactScore,
    isExactDiff,
    isCorrectWinner,
    isCorrectFirstScorer,
    badgeLabel,
  };
}

/**
 * Evaluates all predictions submitted for a single match.
 */
export function getMatchPredictionsResults(
  match: Match,
  matchAttendees: Array<{ userId: string; status?: string; prediction?: MatchPredictionData }> = [],
  users: UserProfile[] = []
): EvaluatedMatchPrediction[] {
  const results: EvaluatedMatchPrediction[] = [];

  for (const att of matchAttendees) {
    if (!att.prediction || typeof att.prediction.acesScore !== 'number') continue;
    results.push(evaluateMatchPrediction(att.userId, att.prediction, match, users));
  }

  return results.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.isExactScore !== a.isExactScore) return b.isExactScore ? 1 : -1;
    return a.userName.localeCompare(b.userName, 'cs');
  });
}

/**
 * Computes the overall "Věštec kabiny" (Oracle) leaderboard across all matches.
 */
export function calculateOracleLeaderboard(
  matches: Match[] = [],
  attendancesByMatch?: Map<string, Array<{ userId: string; status?: string; prediction?: MatchPredictionData }>>,
  users: UserProfile[] = []
): OracleLeaderboardEntry[] {
  if (!attendancesByMatch) return [];
  const usersMap = new Map(users.map((u) => [u.id, u]));
  const statsMap = new Map<string, OracleLeaderboardEntry>();

  const getEntry = (uid: string): OracleLeaderboardEntry => {
    let entry = statsMap.get(uid);
    if (!entry) {
      const u = usersMap.get(uid);
      entry = {
        userId: uid,
        userName: u?.name || 'Hráč',
        userJersey: u?.jerseyNumber ?? null,
        userPhoto: u?.photoURL ?? null,
        totalPoints: 0,
        predictionsCount: 0,
        exactScoreHits: 0,
        firstScorerHits: 0,
        winnerHits: 0,
      };
      statsMap.set(uid, entry);
    }
    return entry;
  };

  for (const m of matches) {
    const atts = attendancesByMatch.get(m.id) || [];
    for (const att of atts) {
      if (!att.prediction || typeof att.prediction.acesScore !== 'number') continue;
      if (!usersMap.has(att.userId)) continue;

      const entry = getEntry(att.userId);
      entry.predictionsCount += 1;

      if (m.isPlayed) {
        const evalRes = evaluateMatchPrediction(att.userId, att.prediction, m, users);
        entry.totalPoints += evalRes.totalPoints;
        if (evalRes.isExactScore) entry.exactScoreHits += 1;
        if (evalRes.isCorrectFirstScorer) entry.firstScorerHits += 1;
        if (evalRes.isCorrectWinner) entry.winnerHits += 1;
      }
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScoreHits !== a.exactScoreHits) return b.exactScoreHits - a.exactScoreHits;
    return b.predictionsCount - a.predictionsCount;
  });
}
