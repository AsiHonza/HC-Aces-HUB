import type { Match, UserProfile } from '@/types';
import { toSafeDate, formatMatchDate } from '@/lib/dates';
import { formatName } from '@/lib/utils';
import { DEFAULT_SEASON_START_MS } from '@/features/stats/utils/season';

export interface HeadToHeadMatchRecord {
  id: string;
  dateLabel: string;
  roundLabel: string;
  acesScore: number;
  opponentScore: number;
  outcome: 'W' | 'D' | 'L';
  isCurrentSeason: boolean;
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

export interface HeadToHeadBalance {
  totalPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface HeadToHeadSummary {
  opponentName: string;
  // Bilance v aktuální sezóně (od září 2026)
  currentSeason: HeadToHeadBalance;
  // Bilance historicky (všechny odehrané zápasy proti soupeři)
  historical: HeadToHeadBalance;

  // Zpětná kompatibilita (odpovídá celkové historické bilanci)
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
 * Počítá komplexní vzájemnou bilanci HC Aces proti danému soupeři
 * rozdělenou na aktuální sezónu a celkovou historii.
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

  // Začátek aktuální sezóny (září 2026)
  const seasonCutoffMs = DEFAULT_SEASON_START_MS;

  let histWins = 0;
  let histDraws = 0;
  let histLosses = 0;
  let histGf = 0;
  let histGa = 0;

  let seasonWins = 0;
  let seasonDraws = 0;
  let seasonLosses = 0;
  let seasonGf = 0;
  let seasonGa = 0;

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

    let sortTimestamp = 0;
    let dateLabel = m.date || '';
    if (m.dateTime) {
      const d = toSafeDate(m.dateTime);
      sortTimestamp = d ? d.getTime() : 0;
      dateLabel = formatMatchDate(m.dateTime, 'd. M. yyyy');
    } else if (typeof m.date === 'string') {
      const d = toSafeDate(m.date);
      dateLabel = m.date;
      sortTimestamp = d ? d.getTime() : 1;
    }

    const isCurrentSeason = sortTimestamp >= seasonCutoffMs;

    // Vždy započítat do celkové historické bilance
    histGf += acesScore;
    histGa += opponentScore;

    let outcome: 'W' | 'D' | 'L' = 'D';
    if (acesScore > opponentScore) {
      histWins += 1;
      outcome = 'W';
    } else if (acesScore < opponentScore) {
      histLosses += 1;
      outcome = 'L';
    } else {
      histDraws += 1;
      outcome = 'D';
    }

    // Pokud je zápas z probíhající sezóny, započítat i do aktuální sezóny
    if (isCurrentSeason) {
      seasonGf += acesScore;
      seasonGa += opponentScore;
      if (outcome === 'W') seasonWins += 1;
      else if (outcome === 'L') seasonLosses += 1;
      else seasonDraws += 1;
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
      isCurrentSeason,
    });

    // Agregace střelců / nahrávačů
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

  // 1. Zpracovat zápasy z kolekce `matches`
  allMatches.forEach((m) => processMatchCandidate(m));

  // 2. Zpracovat zápasy z archivovaných sezón (pokud existují)
  if (Array.isArray(archivedSeasons)) {
    archivedSeasons.forEach((season) => {
      if (Array.isArray(season.matches)) {
        season.matches.forEach((m: any) => processMatchCandidate(m, season.name || season.year));
      }
    });
  }

  records.sort((a, b) => b.sortTimestamp - a.sortTimestamp);

  // Lídr na soupeře
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

  // Klíčoví hráči soupeře (Top 3) z oficiálních ligových statistik
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

  const currentSeasonTotal = seasonWins + seasonDraws + seasonLosses;
  const historicalTotal = histWins + histDraws + histLosses;

  return {
    opponentName,
    currentSeason: {
      totalPlayed: currentSeasonTotal,
      wins: seasonWins,
      draws: seasonDraws,
      losses: seasonLosses,
      goalsFor: seasonGf,
      goalsAgainst: seasonGa,
    },
    historical: {
      totalPlayed: historicalTotal,
      wins: histWins,
      draws: histDraws,
      losses: histLosses,
      goalsFor: histGf,
      goalsAgainst: histGa,
    },
    totalPlayed: historicalTotal,
    wins: histWins,
    draws: histDraws,
    losses: histLosses,
    goalsFor: histGf,
    goalsAgainst: histGa,
    recentMatches: records.slice(0, 4).map(({ sortTimestamp, ...rest }) => rest),
    topPlayer,
    keyOpponentPlayers,
  };
}
