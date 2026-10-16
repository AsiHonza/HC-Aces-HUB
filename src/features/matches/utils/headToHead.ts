import type { Match, UserProfile } from '@/types';
import { toSafeDate, formatMatchDate } from '@/lib/dates';
import { formatName } from '@/lib/utils';

export interface HeadToHeadMatchRecord {
  id: string;
  dateLabel: string;
  roundLabel: string;
  acesScore: number;
  opponentScore: number;
  outcome: 'W' | 'D' | 'L';
}

export interface HeadToHeadTopPlayer {
  idOrName: string;
  name: string;
  goals: number;
  assists: number;
  points: number;
}

export interface OpponentTopScorer {
  rank?: number;
  name: string;
  club?: string;
  gamesPlayed?: number;
  goals: number;
  assists: number;
  points: number;
}

export interface HeadToHeadSummary {
  opponentName: string;
  totalPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  recentMatches: HeadToHeadMatchRecord[];
  topPlayer: HeadToHeadTopPlayer | null;
  keyOpponentPlayers: OpponentTopScorer[];
}

function normalizeTeamKey(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^hc\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAcesTeam(name?: string): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('aces');
}

export function getMatchOpponentName(match: Pick<Match, 'team1' | 'team2' | 'opponent'>): string {
  if (match.opponent) return match.opponent;
  if (isAcesTeam(match.team1)) return match.team2;
  if (isAcesTeam(match.team2)) return match.team1;
  return match.team2 || match.team1;
}

/**
 * Computes comprehensive Head-to-Head statistics for HC Aces against the opponent of `targetMatch`
 * across both current season matches and archived seasons.
 */
export function calculateHeadToHead(
  targetMatch: Match,
  allMatches: Match[] = [],
  archivedSeasons: any[] = [],
  usersMap?: Map<string, UserProfile>,
  leagueSkaters: Array<{ name: string; club: string; goals: number; assists: number; points: number; gamesPlayed?: number }> = []
): HeadToHeadSummary {
  const opponentName = getMatchOpponentName(targetMatch);
  const targetOpponentKey = normalizeTeamKey(opponentName);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const records: Array<HeadToHeadMatchRecord & { sortTimestamp: number }> = [];
  const seenIds = new Set<string>();
  const playerStatsMap = new Map<string, { goals: number; assists: number }>();

  const addPlayerPoint = (key: string | null | undefined, type: 'goal' | 'assist') => {
    if (!key) return;
    const trimmed = key.trim();
    if (!trimmed) return;
    const current = playerStatsMap.get(trimmed) || { goals: 0, assists: 0 };
    if (type === 'goal') current.goals += 1;
    else current.assists += 1;
    playerStatsMap.set(trimmed, current);
  };

  const processMatchCandidate = (m: any, fallbackSeasonLabel?: string) => {
    if (!m || m.id === targetMatch.id) return;

    // Omezit výhradně na zápasy aktuální sezóny (pokud je definován seasonId)
    if (targetMatch.seasonId && m.seasonId && m.seasonId !== targetMatch.seasonId) {
      return;
    }

    const team1 = m.team1 || '';
    const team2 = m.team2 || '';
    const mOpponent = isAcesTeam(team1) ? team2 : isAcesTeam(team2) ? team1 : m.opponent || '';

    if (normalizeTeamKey(mOpponent) !== targetOpponentKey || !targetOpponentKey) {
      return;
    }

    const hasScores = m.team1Score !== undefined && m.team2Score !== undefined && m.team1Score !== null && m.team2Score !== null;
    if (!m.isPlayed && !hasScores) return;
    if (!hasScores) return;

    const dedupeKey = m.id || `${team1}-${team2}-${m.round}-${m.date || ''}`;
    if (seenIds.has(dedupeKey)) return;
    seenIds.add(dedupeKey);

    const acesIsTeam1 = isAcesTeam(team1) || !isAcesTeam(team2);
    const acesScore = Number(acesIsTeam1 ? m.team1Score : m.team2Score);
    const opponentScore = Number(acesIsTeam1 ? m.team2Score : m.team1Score);

    if (Number.isNaN(acesScore) || Number.isNaN(opponentScore)) return;

    goalsFor += acesScore;
    goalsAgainst += opponentScore;

    let outcome: 'W' | 'D' | 'L' = 'D';
    if (acesScore > opponentScore) {
      wins += 1;
      outcome = 'W';
    } else if (acesScore < opponentScore) {
      losses += 1;
      outcome = 'L';
    } else {
      draws += 1;
      outcome = 'D';
    }

    let sortTimestamp = 0;
    let dateLabel = m.date || '';
    if (m.dateTime) {
      const d = toSafeDate(m.dateTime);
      sortTimestamp = d ? d.getTime() : 0;
      dateLabel = formatMatchDate(m.dateTime, 'd. M. yyyy');
    } else if (typeof m.date === 'string') {
      dateLabel = m.date;
      sortTimestamp = 1;
    }

    const roundLabel = m.round
      ? `${m.round}. kolo`
      : fallbackSeasonLabel || (m.type === 'playoff' ? 'Play-off' : 'Utkání');

    records.push({
      id: dedupeKey,
      dateLabel,
      roundLabel,
      acesScore,
      opponentScore,
      outcome,
      sortTimestamp,
    });

    // Aggregate scorers from m.scorers or m.detailedScorers
    if (Array.isArray(m.scorers) && m.scorers.length > 0) {
      m.scorers.forEach((s: any) => {
        if (s.goal) addPlayerPoint(s.goal, 'goal');
        if (s.assist) addPlayerPoint(s.assist, 'assist');
      });
    } else if (Array.isArray(m.detailedScorers) && m.detailedScorers.length > 0) {
      m.detailedScorers.forEach((ds: any) => {
        if (isAcesTeam(ds.team)) {
          if (ds.scorer) addPlayerPoint(ds.scorer, 'goal');
          if (ds.assist) addPlayerPoint(ds.assist, 'assist');
        }
      });
    }
  };

  // 1. Process current season matches in `matches` collection
  allMatches.forEach((m) => processMatchCandidate(m));

  records.sort((a, b) => b.sortTimestamp - a.sortTimestamp);

  // Resolve top scorer against this opponent
  let topPlayer: HeadToHeadTopPlayer | null = null;
  playerStatsMap.forEach((stats, key) => {
    const points = stats.goals + stats.assists;
    if (
      !topPlayer ||
      points > topPlayer.points ||
      (points === topPlayer.points && stats.goals > topPlayer.goals)
    ) {
      const profile = usersMap?.get(key);
      const displayName = profile ? formatName(profile.name) : key;
      topPlayer = {
        idOrName: key,
        name: displayName,
        goals: stats.goals,
        assists: stats.assists,
        points,
      };
    }
  });

  // Extract top 3 opponent key players from league skaters
  const keyOpponentPlayers: OpponentTopScorer[] = (leagueSkaters || [])
    .filter((s) => {
      if (!s || !s.club) return false;
      const clubKey = normalizeTeamKey(s.club);
      return clubKey.includes(targetOpponentKey) || targetOpponentKey.includes(clubKey);
    })
    .sort((a, b) => b.points - a.points || b.goals - a.goals)
    .slice(0, 3)
    .map((s, idx) => ({
      rank: idx + 1,
      name: s.name,
      club: s.club,
      gamesPlayed: s.gamesPlayed,
      goals: s.goals,
      assists: s.assists,
      points: s.points,
    }));

  return {
    opponentName,
    totalPlayed: wins + draws + losses,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    recentMatches: records.slice(0, 4).map(({ sortTimestamp, ...rest }) => rest),
    topPlayer,
    keyOpponentPlayers,
  };
}
