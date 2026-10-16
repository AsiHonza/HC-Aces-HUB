import type { Match, UserProfile, MatchStarsVote } from '@/types';
import { toSafeDate } from '@/lib/dates';
import { formatName } from '@/lib/utils';
import { MVP_OPEN_DELAY_MS, MVP_WINDOW_DURATION_MS, MvpCandidate } from './mvpVoting';

export interface MatchStarsStandingItem {
  candidateId: string;
  name: string;
  jerseyNumber?: number | null;
  photoURL?: string | null;
  playerType?: 'player' | 'goalie' | 'member';
  points: number; // star1 = 3pts, star2 = 2pts, star3 = 1pt
  star1Count: number;
  star2Count: number;
  star3Count: number;
  totalVotesCount: number;
  percentage: number;
}

export interface MatchStarsResults {
  totalVoters: number;
  totalPoints: number;
  standings: MatchStarsStandingItem[];
  firstStar: MatchStarsStandingItem | null;
  secondStar: MatchStarsStandingItem | null;
  thirdStar: MatchStarsStandingItem | null;
}

/**
 * Calculates 3-Stars results for a match based on `match.starsVotes` (and fallbacks to `match.mvpVotes`).
 * 1st star = 3 points
 * 2nd star = 2 points
 * 3rd star = 1 point
 */
export function calculateMatchStarsResults(
  match: Match,
  usersMap?: Map<string, UserProfile>
): MatchStarsResults {
  const pointsMap = new Map<
    string,
    {
      points: number;
      star1Count: number;
      star2Count: number;
      star3Count: number;
      totalVotesCount: number;
    }
  >();

  const getRecord = (id: string) => {
    let rec = pointsMap.get(id);
    if (!rec) {
      rec = { points: 0, star1Count: 0, star2Count: 0, star3Count: 0, totalVotesCount: 0 };
      pointsMap.set(id, rec);
    }
    return rec;
  };

  let totalVoters = 0;

  // 1. Process 3-stars votes (new format)
  if (match.starsVotes && typeof match.starsVotes === 'object') {
    const entries = Object.entries(match.starsVotes);
    totalVoters = entries.length;

    entries.forEach(([, vote]) => {
      if (!vote || typeof vote !== 'object') return;
      if (vote.star1) {
        const r1 = getRecord(vote.star1);
        r1.points += 3;
        r1.star1Count += 1;
        r1.totalVotesCount += 1;
      }
      if (vote.star2) {
        const r2 = getRecord(vote.star2);
        r2.points += 2;
        r2.star2Count += 1;
        r2.totalVotesCount += 1;
      }
      if (vote.star3) {
        const r3 = getRecord(vote.star3);
        r3.points += 1;
        r3.star3Count += 1;
        r3.totalVotesCount += 1;
      }
    });
  } else if (match.mvpVotes && typeof match.mvpVotes === 'object') {
    // Fallback: Legacy mvpVotes (each vote counts as 3 points / 1st star)
    const entries = Object.entries(match.mvpVotes);
    totalVoters = entries.length;
    entries.forEach(([, candidateId]) => {
      if (candidateId) {
        const r = getRecord(candidateId);
        r.points += 3;
        r.star1Count += 1;
        r.totalVotesCount += 1;
      }
    });
  }

  let totalPoints = 0;
  pointsMap.forEach((v) => {
    totalPoints += v.points;
  });

  const standings: MatchStarsStandingItem[] = Array.from(pointsMap.entries())
    .map(([candidateId, counts]) => {
      const user = usersMap?.get(candidateId);
      const percentage =
        totalPoints > 0 ? Math.round((counts.points / totalPoints) * 100) : 0;

      return {
        candidateId,
        name: user ? formatName(user.name) : candidateId,
        jerseyNumber: user?.jerseyNumber ?? null,
        photoURL: user?.photoURL ?? null,
        playerType: user?.playerType ?? 'player',
        points: counts.points,
        star1Count: counts.star1Count,
        star2Count: counts.star2Count,
        star3Count: counts.star3Count,
        totalVotesCount: counts.totalVotesCount,
        percentage,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.star1Count !== a.star1Count) return b.star1Count - a.star1Count;
      if (b.star2Count !== a.star2Count) return b.star2Count - a.star2Count;
      return b.star3Count - a.star3Count;
    });

  const firstStar = standings[0] || null;
  const secondStar = standings[1] || null;
  const thirdStar = standings[2] || null;

  return {
    totalVoters,
    totalPoints,
    standings,
    firstStar,
    secondStar,
    thirdStar,
  };
}

export interface PlayerCareerStarsStats {
  firstStars: number;
  secondStars: number;
  thirdStars: number;
  star1Count: number;
  star2Count: number;
  star3Count: number;
  totalPoints: number;
  totalStars: number;
}

/**
 * Counts the total number of 1st, 2nd, and 3rd stars for a player across all matches in a season/career.
 */
export function countPlayerCareerStars(
  playerId: string,
  allMatches: Match[] = []
): PlayerCareerStarsStats {
  let firstStars = 0;
  let secondStars = 0;
  let thirdStars = 0;

  allMatches.forEach((m) => {
    if (!m) return;
    const res = calculateMatchStarsResults(m);
    if (res.firstStar?.candidateId === playerId) firstStars += 1;
    if (res.secondStar?.candidateId === playerId) secondStars += 1;
    if (res.thirdStar?.candidateId === playerId) thirdStars += 1;
  });

  const totalPoints = firstStars * 3 + secondStars * 2 + thirdStars * 1;
  const totalStars = firstStars + secondStars + thirdStars;

  return {
    firstStars,
    secondStars,
    thirdStars,
    star1Count: firstStars,
    star2Count: secondStars,
    star3Count: thirdStars,
    totalPoints,
    totalStars,
  };
}
