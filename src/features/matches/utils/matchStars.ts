import type { Match, UserProfile, MatchStarsVote } from '@/types';
import { toSafeDate } from '@/lib/dates';
import { areNamesMatching, formatName } from '@/lib/utils';
import { MVP_OPEN_DELAY_MS, MVP_WINDOW_DURATION_MS, MvpCandidate } from './mvpVoting';
import { hasMatchStatsRecorded } from './match-details';

export interface MatchStarsStandingItem {
  candidateId: string;
  name: string;
  jerseyNumber?: number | null;
  photoURL?: string | null;
  playerType?: 'player' | 'goalie' | 'member';
  points: number; // star1 = 3pts (or 6pts coach), star2 = 2pts (or 4pts coach), star3 = 1pt (or 2pts coach)
  star1Count: number;
  star2Count: number;
  star3Count: number;
  coachStar1Count?: number;
  coachStar2Count?: number;
  coachStar3Count?: number;
  hasCoachVote?: boolean;
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
  hasCoachVote?: boolean;
  coachVoterName?: string;
  standings: MatchStarsStandingItem[];
  firstStar: MatchStarsStandingItem | null;
  secondStar: MatchStarsStandingItem | null;
  thirdStar: MatchStarsStandingItem | null;
}

/**
 * Checks if a user is coach Jiří Janíček (by name, coach role, or profile).
 */
export function isCoachJanicek(
  userIdOrName?: string | null,
  user?: UserProfile | null,
  usersMap?: Map<string, UserProfile>
): boolean {
  if (user) {
    if (areNamesMatching(user.name, 'Jiří Janíček')) return true;
    if ((user as any).role === 'coach' || (user as any).isCoach) return true;
    if (user.email && /janicek/i.test(user.email)) return true;
  }
  if (userIdOrName) {
    if (areNamesMatching(userIdOrName, 'Jiří Janíček')) return true;
    const profile = usersMap?.get(userIdOrName);
    if (profile) {
      if (areNamesMatching(profile.name, 'Jiří Janíček')) return true;
      if ((profile as any).role === 'coach' || (profile as any).isCoach) return true;
      if (profile.email && /janicek/i.test(profile.email)) return true;
    }
  }
  return false;
}

/**
 * Determines whether a given player participated in the match roster (lineup, gameRoster, or scorers).
 */
export function isPlayerInMatchRoster(
  userIdOrName: string,
  match: Match,
  usersMap?: Map<string, UserProfile>
): boolean {
  if (!userIdOrName || !match) return false;
  const profile = usersMap?.get(userIdOrName);
  const playerName = profile?.name || userIdOrName;

  // 1. Lineup slots
  if (match.lineup && typeof match.lineup === 'object') {
    const inLineup = Object.values(match.lineup).some((p: any) => {
      if (!p) return false;
      if (p.id && (p.id === userIdOrName || (profile && p.id === profile.id))) return true;
      if (p.name && areNamesMatching(p.name, playerName)) return true;
      return false;
    });
    if (inLineup) return true;
  }

  // 2. gameRoster if present
  if (Array.isArray(match.gameRoster) && match.gameRoster.length > 0) {
    const inRoster = match.gameRoster.some((r) => {
      if (typeof r === 'string') return areNamesMatching(r, playerName);
      if ((r as any)?.name) return areNamesMatching((r as any).name, playerName);
      if ((r as any)?.id) return (r as any).id === userIdOrName;
      return false;
    });
    if (inRoster) return true;
  }

  // 3. Match scorers or assists
  if (Array.isArray(match.scorers)) {
    const played = match.scorers.some(
      (s) =>
        (s.goal && (s.goal === userIdOrName || areNamesMatching(s.goal, playerName))) ||
        (s.assist && (s.assist === userIdOrName || areNamesMatching(s.assist, playerName)))
    );
    if (played) return true;
  }
  if (Array.isArray(match.detailedScorers)) {
    const played = match.detailedScorers.some(
      (ds) =>
        (ds.scorer && (ds.scorer === userIdOrName || areNamesMatching(ds.scorer, playerName))) ||
        (ds.assist && (ds.assist === userIdOrName || areNamesMatching(ds.assist, playerName)))
    );
    if (played) return true;
  }

  return false;
}

/**
 * Calculates 3-Stars results for a match based on `match.starsVotes` (and fallbacks to `match.mvpVotes`).
 * 
 * Pravidla výpočtu a řešení shod (Tie-Breaking Protocol):
 * 1. Celkový počet bodů (1. hvězda = 3 b, 2. hvězda = 2 b, 3. hvězda = 1 b)
 *    - Speciální trenérské pravidlo: Pokud hlasuje trenér Jiří Janíček a NENÍ na soupisce hráčů daného zápasu,
 *      jeho hlasy mají DVOJNÁSOBNOU VÁHU (1. hvězda = 6 b, 2. hvězda = 4 b, 3. hvězda = 2 b).
 *      Pokud je na soupisce jako hráč, mají jeho hlasy standardní váhu (3, 2, 1).
 * 2. Vyšší počet 1. hvězd (kvalita hlasů)
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
      coachStar1Count: number;
      coachStar2Count: number;
      coachStar3Count: number;
      hasCoachVote: boolean;
      totalVotesCount: number;
    }
  >();

  const getRecord = (id: string) => {
    let rec = pointsMap.get(id);
    if (!rec) {
      rec = {
        points: 0,
        star1Count: 0,
        star2Count: 0,
        star3Count: 0,
        coachStar1Count: 0,
        coachStar2Count: 0,
        coachStar3Count: 0,
        hasCoachVote: false,
        totalVotesCount: 0,
      };
      pointsMap.set(id, rec);
    }
    return rec;
  };

  let totalVoters = 0;
  let hasMatchCoachVote = false;
  let coachVoterName: string | undefined;

  // 1. Process 3-stars votes (new format)
  if (match.starsVotes && typeof match.starsVotes === 'object') {
    const entries = Object.entries(match.starsVotes);
    totalVoters = entries.length;

    entries.forEach(([voterId, vote]) => {
      if (!vote || typeof vote !== 'object') return;

      const voterProfile = usersMap?.get(voterId);
      const voterIsCoach = isCoachJanicek(voterId, voterProfile, usersMap);
      const voterInRoster = isPlayerInMatchRoster(voterId, match, usersMap);
      const isDoubledCoachVote = voterIsCoach && !voterInRoster;

      if (isDoubledCoachVote) {
        hasMatchCoachVote = true;
        coachVoterName = voterProfile?.name || 'Jiří Janíček (trenér)';
      }

      const w1 = isDoubledCoachVote ? 6 : 3;
      const w2 = isDoubledCoachVote ? 4 : 2;
      const w3 = isDoubledCoachVote ? 2 : 1;

      if (vote.star1) {
        const r1 = getRecord(vote.star1);
        r1.points += w1;
        r1.star1Count += 1;
        if (isDoubledCoachVote) {
          r1.coachStar1Count += 1;
          r1.hasCoachVote = true;
        }
        r1.totalVotesCount += 1;
      }
      if (vote.star2) {
        const r2 = getRecord(vote.star2);
        r2.points += w2;
        r2.star2Count += 1;
        if (isDoubledCoachVote) {
          r2.coachStar2Count += 1;
          r2.hasCoachVote = true;
        }
        r2.totalVotesCount += 1;
      }
      if (vote.star3) {
        const r3 = getRecord(vote.star3);
        r3.points += w3;
        r3.star3Count += 1;
        if (isDoubledCoachVote) {
          r3.coachStar3Count += 1;
          r3.hasCoachVote = true;
        }
        r3.totalVotesCount += 1;
      }
    });
  } else if (match.mvpVotes && typeof match.mvpVotes === 'object') {
    // Fallback: Legacy mvpVotes (each vote counts as 3 points / 1st star, or 6 points if coach out of roster)
    const entries = Object.entries(match.mvpVotes);
    totalVoters = entries.length;
    entries.forEach(([voterId, candidateId]) => {
      if (candidateId) {
        const voterProfile = usersMap?.get(voterId);
        const voterIsCoach = isCoachJanicek(voterId, voterProfile, usersMap);
        const voterInRoster = isPlayerInMatchRoster(voterId, match, usersMap);
        const isDoubledCoachVote = voterIsCoach && !voterInRoster;

        if (isDoubledCoachVote) {
          hasMatchCoachVote = true;
          coachVoterName = voterProfile?.name || 'Jiří Janíček (trenér)';
        }

        const r = getRecord(candidateId);
        r.points += isDoubledCoachVote ? 6 : 3;
        r.star1Count += 1;
        if (isDoubledCoachVote) {
          r.coachStar1Count += 1;
          r.hasCoachVote = true;
        }
        r.totalVotesCount += 1;
      }
    });
  }

  let totalPoints = 0;
  pointsMap.forEach((v) => {
    totalPoints += v.points;
  });

  const statsRecorded = hasMatchStatsRecorded(match);

  // Build fallback name map from match.lineup in case usersMap is not provided
  const lineupNameMap = new Map<string, { name: string; jerseyNumber?: number | null }>();
  if (match.lineup && typeof match.lineup === 'object') {
    Object.values(match.lineup).forEach((p: any) => {
      if (p?.id && p?.name) {
        lineupNameMap.set(String(p.id), { name: String(p.name), jerseyNumber: p.jerseyNumber ?? null });
      }
    });
  }

  // Extract match performance for candidates for tie-breaking
  const getPlayerMatchStats = (candidateId: string, user?: UserProfile) => {
    let saves = 0;
    let isShutout = false;

    const rawCandidateName = user?.name || lineupNameMap.get(candidateId)?.name || '';

    const matchesCandidate = (val?: string | null) => {
      if (!val) return false;
      if (val === candidateId) return true;
      if (rawCandidateName && areNamesMatching(rawCandidateName, val)) return true;
      return false;
    };

    const isT1 = /aces/i.test(match.team1 || '');
    const isT2 = /aces/i.test(match.team2 || '');

    let detailedGoals = 0;
    let detailedAssists = 0;
    if (Array.isArray(match.detailedScorers) && match.detailedScorers.length > 0) {
      match.detailedScorers.forEach((ds) => {
        if (!ds) return;
        const isAces =
          (isT1 && ds.team === 'team1') ||
          (isT2 && ds.team === 'team2') ||
          /aces/i.test(ds.team || '') ||
          /aces/i.test((ds as any).teamName || '');
        if (!isAces) return;
        if (matchesCandidate(ds.scorer)) detailedGoals++;
        if (ds.assist && matchesCandidate(ds.assist)) detailedAssists++;
      });
    }

    let simpleGoals = 0;
    let simpleAssists = 0;
    if (Array.isArray(match.scorers) && match.scorers.length > 0) {
      match.scorers.forEach((s) => {
        if (!s) return;
        if (matchesCandidate(s.goal)) simpleGoals++;
        if (s.assist && matchesCandidate(s.assist)) simpleAssists++;
      });
    }

    const goals = Math.max(detailedGoals, simpleGoals);
    const assists = Math.max(detailedAssists, simpleAssists);

    const isGoalie =
      match.goalieId === candidateId ||
      matchesCandidate(match.goalieName) ||
      match.lineup?.B1?.id === candidateId ||
      matchesCandidate(match.lineup?.B1?.name) ||
      user?.playerType === 'goalie';

    if (isGoalie) {
      const oppScore = isT1 ? (match.team2Score ?? 0) : (match.team1Score ?? 0);
      const acesScore = isT1 ? (match.team1Score ?? 0) : (match.team2Score ?? 0);
      if (oppScore === 0 && acesScore > 0) isShutout = true;
      saves = match.goalieSaves ?? (match.shotsOpponent != null ? Math.max(0, match.shotsOpponent - oppScore) : 0);
    }

    return { goals, assists, points: goals + assists, saves, isShutout };
  };

  const initialStandings: MatchStarsStandingItem[] = Array.from(pointsMap.entries()).map(([candidateId, counts]) => {
    const user = usersMap?.get(candidateId);
    const lineupFallback = lineupNameMap.get(candidateId);
    const percentage =
      totalPoints > 0 ? Math.round((counts.points / totalPoints) * 100) : 0;
    const matchStats = getPlayerMatchStats(candidateId, user);

    return {
      candidateId,
      name: user ? formatName(user.name) : lineupFallback ? formatName(lineupFallback.name) : candidateId,
      jerseyNumber: user?.jerseyNumber ?? lineupFallback?.jerseyNumber ?? null,
      photoURL: user?.photoURL ?? null,
      playerType: (user?.playerType ?? 'player') as 'player' | 'goalie' | 'member',
      points: counts.points,
      star1Count: counts.star1Count,
      star2Count: counts.star2Count,
      star3Count: counts.star3Count,
      coachStar1Count: counts.coachStar1Count,
      coachStar2Count: counts.coachStar2Count,
      coachStar3Count: counts.coachStar3Count,
      hasCoachVote: counts.hasCoachVote,
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
    // 3. Match performance tie-breakers (only when match stats are already recorded):
    if (statsRecorded) {
      // Goalie shutout advantage
      if (b.isShutout !== a.isShutout) return (b.isShutout ? 1 : 0) - (a.isShutout ? 1 : 0);
      // Canadian points in the match
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
      // Goals scored in the match
      if (b.matchGoals !== a.matchGoals) return b.matchGoals - a.matchGoals;
      // Goalie saves in the match
      if (b.matchSaves !== a.matchSaves) return b.matchSaves - a.matchSaves;
    }
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
      const isVoteTie =
        curr.points === prev.points &&
        curr.star1Count === prev.star1Count &&
        curr.star2Count === prev.star2Count &&
        curr.star3Count === prev.star3Count;
      const isStatsTie =
        !statsRecorded ||
        (curr.matchPoints === prev.matchPoints &&
          curr.matchGoals === prev.matchGoals &&
          curr.isShutout === prev.isShutout &&
          curr.matchSaves === prev.matchSaves);
      const isExactTie = isVoteTie && isStatsTie;

      if (isExactTie) {
        curr.rank = prev.rank;
        curr.isTied = true;
        prev.isTied = true;
        const reason = statsRecorded
          ? 'Shoda hlasů i zápasových bodů (dělené pořadí)'
          : 'Shoda hlasů (čeká se na zápis statistik utkání z HobbyHokeje)';
        curr.tieBreakerReason = reason;
        prev.tieBreakerReason = reason;
      } else {
        curr.rank = i + 1;
        if (isVoteTie && statsRecorded) {
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
    hasCoachVote: hasMatchCoachVote,
    coachVoterName,
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
