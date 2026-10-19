import type { Match, UserProfile } from '@/types';
import { toSafeDate } from '@/lib/dates';

/** 75 minutes after match start = match ends & players are in the locker room */
export const MVP_OPEN_DELAY_MS = 75 * 60 * 1000;

/** Voting stays open for 72 hours (3 days) after opening */
export const MVP_WINDOW_DURATION_MS = 72 * 60 * 60 * 1000;

export type MvpVotingStatus = 'not_started' | 'open' | 'closed';

export interface MvpCandidate {
  id: string;
  name: string;
  jerseyNumber?: number | null;
  photoURL?: string | null;
  playerType?: 'player' | 'goalie' | 'member';
}

export interface MvpStandingItem {
  candidateId: string;
  name: string;
  jerseyNumber?: number | null;
  photoURL?: string | null;
  votes: number;
  percentage: number;
}

export interface MvpResults {
  totalVotes: number;
  standings: MvpStandingItem[];
  winner: MvpStandingItem | null;
}

/**
 * Determines whether MVP voting for a match has not started, is currently open (75m to 25h15m after start), or is closed.
 */
export function getMvpVotingStatus(match: Match, nowMs: number = Date.now()): {
  status: MvpVotingStatus;
  opensAt: Date;
  closesAt: Date;
} {
  const startDate = toSafeDate(match.dateTime || match.date) ?? new Date();
  const startMs = startDate.getTime();
  const opensAtMs = startMs + MVP_OPEN_DELAY_MS;
  const closesAtMs = opensAtMs + MVP_WINDOW_DURATION_MS;

  let status: MvpVotingStatus = 'not_started';
  if (nowMs >= opensAtMs && nowMs <= closesAtMs) {
    status = 'open';
  } else if (nowMs > closesAtMs) {
    status = 'closed';
  }

  return {
    status,
    opensAt: new Date(opensAtMs),
    closesAt: new Date(closesAtMs),
  };
}

/**
 * Extracts eligible MVP candidates for a match:
 * 1. Players in `match.lineup`
 * 2. Fallback: Players with `going` status in `attendees`
 * 3. Fallback: Active skaters and goalies in `users`
 */
export function getMatchMvpCandidates(
  match: Match,
  users: UserProfile[] = [],
  attendees: Array<{ userId: string; status: string }> = []
): MvpCandidate[] {
  const usersMap = new Map<string, UserProfile>();
  users.forEach((u) => usersMap.set(u.id, u));

  const candidateMap = new Map<string, MvpCandidate>();

  // 1. Check match lineup
  if (match.lineup && typeof match.lineup === 'object') {
    Object.values(match.lineup).forEach((slotPlayer) => {
      if (slotPlayer && slotPlayer.id) {
        const profile = usersMap.get(slotPlayer.id);
        candidateMap.set(slotPlayer.id, {
          id: slotPlayer.id,
          name: profile?.name || slotPlayer.name,
          jerseyNumber: profile?.jerseyNumber ?? slotPlayer.jerseyNumber ?? null,
          photoURL: profile?.photoURL ?? null,
          playerType: profile?.playerType || 'player',
        });
      }
    });
  }

  // 2. If lineup is empty, check attendees with status 'going'
  if (candidateMap.size === 0 && attendees.length > 0) {
    attendees
      .filter((a) => a.status === 'going')
      .forEach((a) => {
        const profile = usersMap.get(a.userId);
        if (profile && (profile.playerType === 'player' || profile.playerType === 'goalie')) {
          candidateMap.set(profile.id, {
            id: profile.id,
            name: profile.name,
            jerseyNumber: profile.jerseyNumber ?? null,
            photoURL: profile.photoURL ?? null,
            playerType: profile.playerType,
          });
        }
      });
  }

  // 3. Fallback to all skaters and goalies on roster
  if (candidateMap.size === 0) {
    users
      .filter((u) => u.playerType === 'player' || u.playerType === 'goalie')
      .forEach((u) => {
        candidateMap.set(u.id, {
          id: u.id,
          name: u.name,
          jerseyNumber: u.jerseyNumber ?? null,
          photoURL: u.photoURL ?? null,
          playerType: u.playerType,
        });
      });
  }

  return Array.from(candidateMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
}

/**
 * Calculates MVP voting standings and determines the winner/leader for a match.
 */
export function calculateMvpResults(
  match: Match,
  usersMap?: Map<string, UserProfile>
): MvpResults {
  const votesMap = match.mvpVotes || {};
  const voteEntries = Object.values(votesMap).filter(Boolean);
  const totalVotes = voteEntries.length;

  if (totalVotes === 0) {
    return {
      totalVotes: 0,
      standings: [],
      winner: null,
    };
  }

  const counts = new Map<string, number>();
  voteEntries.forEach((candidateId) => {
    counts.set(candidateId, (counts.get(candidateId) || 0) + 1);
  });

  // Also check lineup names as fallback if usersMap doesn't have the profile
  const lineupNameMap = new Map<string, { name: string; jerseyNumber?: number }>();
  if (match.lineup) {
    Object.values(match.lineup).forEach((p) => {
      if (p?.id) {
        lineupNameMap.set(p.id, { name: p.name, jerseyNumber: p.jerseyNumber });
      }
    });
  }

  const standings: MvpStandingItem[] = Array.from(counts.entries())
    .map(([candidateId, votes]) => {
      const profile = usersMap?.get(candidateId);
      const lineupFallback = lineupNameMap.get(candidateId);
      return {
        candidateId,
        name: profile?.name || lineupFallback?.name || 'Hráč HC Aces',
        jerseyNumber: profile?.jerseyNumber ?? lineupFallback?.jerseyNumber ?? null,
        photoURL: profile?.photoURL ?? null,
        votes,
        percentage: Math.round((votes / totalVotes) * 100),
      };
    })
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, 'cs'));

  return {
    totalVotes,
    standings,
    winner: standings[0] || null,
  };
}

/**
 * Counts how many times a player has won MVP (Hráč zápasu) across all matches.
 */
export function countPlayerCareerMvpAwards(
  userId: string,
  allMatches: Match[] = []
): number {
  if (!userId) return 0;
  let count = 0;

  allMatches.forEach((m) => {
    if (m.mvpWinnerId === userId) {
      count += 1;
      return;
    }
    const { winner } = calculateMvpResults(m);
    if (winner && winner.candidateId === userId) {
      count += 1;
    }
  });

  return count;
}
