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
  rank: number; // 1, 2, 3...
  isTied?: boolean;
  matchPoints: number;
  matchGoals: number;
  matchAssists: number;
  matchSaves: number;
  isShutout: boolean;
  tieBreakerReason?: string;
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
 * 
 * Pravidla výpočtu a řešení shod (Tie-Breaking Protocol):
 * 1. Celkový počet bodů (1. hvězda = 3 b, 2. hvězda = 2 b, 3. hvězda = 1 b)
 * 2. Vyšší počet 1. hvězd (kvalita hlasů: 1x 1. hvězda [3b] předčí 1x 2. + 1x 3. [3b])
 * 3. Vyšší počet 2. hvězd
 * 4. Vyšší počet 3. hvězd
 * 5. Zápasový výkon:
 *    - Čisté konto brankáře (shutout) v daném zápase
 *    - Kanadské body v daném zápase (góly + asistence ze zápisu utkání)
 *    - Počet vstřelených gólů v daném zápase
 *    - Počet zásahů brankáře v daném zápase
 * 6. Pokud jsou hlasy i zápasový výkon 100% shodné:
 *    - Hráči mají DĚLENÉ UMÍSTĚNÍ (oba získají nárok na 1. hvězdu se stejnou hodností a zářez do statistik!).
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

  // Extract match performance for candidates for tie-breaking
  const getPlayerMatchStats = (candidateId: string, user?: UserProfile) => {
    let goals = 0;
    let assists = 0;
    let saves = 0;
    let isShutout = false;

    const candidateName = (user?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const tokens = candidateName.split(/\s+/).filter(Boolean);
    const surname = tokens[tokens.length - 1] || '';

    const matchesCandidate = (val?: string | null) => {
      if (!val) return false;
      if (val === candidateId) return true;
      const n = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (candidateName && n === candidateName) return true;
      if (surname && surname.length >= 3 && n.includes(surname)) return true;
      return false;
    };

    if (Array.isArray(match.detailedScorers) && match.detailedScorers.length > 0) {
      match.detailedScorers.forEach((ds) => {
        if (!ds) return;
        if (matchesCandidate(ds.scorer)) goals++;
        if (matchesCandidate(ds.assist)) assists++;
      });
    } else if (Array.isArray(match.scorers) && match.scorers.length > 0) {
      match.scorers.forEach((s) => {
        if (!s) return;
        if (matchesCandidate(s.goal)) goals++;
        if (matchesCandidate(s.assist)) assists++;
      });
    }

    const isGoalie =
      match.goalieId === candidateId ||
      matchesCandidate(match.goalieName) ||
      match.lineup?.B1?.id === candidateId ||
      matchesCandidate(match.lineup?.B1?.name) ||
      user?.playerType === 'goalie';

    if (isGoalie) {
      const isT1 = /aces/i.test(match.team1 || '');
      const oppScore = isT1 ? (match.team2Score ?? 0) : (match.team1Score ?? 0);
      const acesScore = isT1 ? (match.team1Score ?? 0) : (match.team2Score ?? 0);
      if (oppScore === 0 && acesScore > 0) isShutout = true;
      saves = match.goalieSaves ?? (match.shotsOpponent != null ? Math.max(0, match.shotsOpponent - oppScore) : 0);
    }

    return { goals, assists, points: goals + assists, saves, isShutout };
  };

  const initialStandings: MatchStarsStandingItem[] = Array.from(pointsMap.entries()).map(([candidateId, counts]) => {
    const user = usersMap?.get(candidateId);
    const percentage =
      totalPoints > 0 ? Math.round((counts.points / totalPoints) * 100) : 0;
    const matchStats = getPlayerMatchStats(candidateId, user);

    return {
      candidateId,
      name: user ? formatName(user.name) : candidateId,
      jerseyNumber: user?.jerseyNumber ?? null,
      photoURL: user?.photoURL ?? null,
      playerType: (user?.playerType ?? 'player') as 'player' | 'goalie' | 'member',
      points: counts.points,
      star1Count: counts.star1Count,
      star2Count: counts.star2Count,
      star3Count: counts.star3Count,
      totalVotesCount: counts.totalVotesCount,
      percentage,
      rank: 1,
      matchPoints: matchStats.points,
      matchGoals: matchStats.goals,
      matchAssists: matchStats.assists,
      matchSaves: matchStats.saves,
      isShutout: matchStats.isShutout,
    };
  });

  // Sort with full tie-breaking rules
  const sortedStandings = initialStandings.sort((a, b) => {
    // 1. Voting points (3 pts for 1st, 2 pts for 2nd, 1 pt for 3rd)
    if (b.points !== a.points) return b.points - a.points;
    // 2. Star tier quality (most 1st stars > most 2nd stars > most 3rd stars)
    if (b.star1Count !== a.star1Count) return b.star1Count - a.star1Count;
    if (b.star2Count !== a.star2Count) return b.star2Count - a.star2Count;
    if (b.star3Count !== a.star3Count) return b.star3Count - a.star3Count;
    // 3. Match performance tie-breakers:
    // Goalie shutout advantage
    if (b.isShutout !== a.isShutout) return (b.isShutout ? 1 : 0) - (a.isShutout ? 1 : 0);
    // Canadian points in the match
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    // Goals scored in the match
    if (b.matchGoals !== a.matchGoals) return b.matchGoals - a.matchGoals;
    // Goalie saves in the match
    if (b.matchSaves !== a.matchSaves) return b.matchSaves - a.matchSaves;
    // Deterministic fallback by Czech alphabet
    return a.name.localeCompare(b.name, 'cs');
  });

  // Assign official ranks (1, 2, 3...) taking shared ties into account
  for (let i = 0; i < sortedStandings.length; i++) {
    const curr = sortedStandings[i];
    if (i === 0) {
      curr.rank = 1;
    } else {
      const prev = sortedStandings[i - 1];
      const isExactTie =
        curr.points === prev.points &&
        curr.star1Count === prev.star1Count &&
        curr.star2Count === prev.star2Count &&
        curr.star3Count === prev.star3Count &&
        curr.matchPoints === prev.matchPoints &&
        curr.matchGoals === prev.matchGoals &&
        curr.isShutout === prev.isShutout &&
        curr.matchSaves === prev.matchSaves;

      if (isExactTie) {
        curr.rank = prev.rank;
        curr.isTied = true;
        prev.isTied = true;
        curr.tieBreakerReason = 'Shoda hlasů i zápasových bodů (dělené pořadí)';
        prev.tieBreakerReason = 'Shoda hlasů i zápasových bodů (dělené pořadí)';
      } else {
        curr.rank = i + 1;
        if (curr.points === prev.points && curr.star1Count === prev.star1Count && curr.star2Count === prev.star2Count && curr.star3Count === prev.star3Count) {
          prev.tieBreakerReason = `Při rovnosti hlasů rozhodl výkon v zápase (${prev.matchGoals}+${prev.matchAssists})`;
        }
      }
    }
  }

  const firstStar = sortedStandings[0] || null;
  const secondStar = sortedStandings[1] || null;
  const thirdStar = sortedStandings[2] || null;

  return {
    totalVoters,
    totalPoints,
    standings: sortedStandings,
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
 * Recognizes tied / shared podium ranks fairly so both players who tied for 1st get credit for a 1st star.
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
    res.standings.slice(0, 3).forEach((item) => {
      if (item.candidateId === playerId) {
        if (item.rank === 1) firstStars += 1;
        else if (item.rank === 2) secondStars += 1;
        else if (item.rank === 3) thirdStars += 1;
      }
    });
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
