export interface LeagueStandingsRow {
  rank: number;
  team: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  score: string;
  points: number;
}

export interface LeagueStanding {
  id: string;
  name: string;
  points: number;
  gf: number;
  ga: number;
  gp?: number;
  w?: number;
  d?: number;
  l?: number;
  rank?: number;
  gamesPlayed?: number;
  wins?: number;
  draws?: number;
  losses?: number;
}

export interface PlayerScoringRow {
  id: string;
  name: string;
  jerseyNumber?: number;
  goals: number;
  assists: number;
  points: number;
  gamesPlayed: number;
  photoURL?: string | null;
}

export interface GoalieStatsRow {
  id: string;
  name: string;
  jerseyNumber?: number;
  saves: number;
  shotsAgainst: number;
  savePercentage: number;
  gamesPlayed: number;
  shutouts: number;
  wins: number;
  photoURL?: string | null;
}

export interface PlayoffSeriesItem {
  round: 'Čtvrtfinále' | 'Semifinále' | 'Finále' | 'Vítěz' | string;
  opponent: string;
  wins: number;
  losses: number;
}

export interface PlayoffSeries {
  id?: string;
  stage?: string;
  stageName?: string;
  round?: 'Čtvrtfinále' | 'Semifinále' | 'Finále' | 'Vítěz' | string;
  opponent: string;
  wins?: number;
  losses?: number;
  acesWins?: number;
  opponentWins?: number;
  isFinished?: boolean;
  winner?: 'aces' | 'opponent';
}

export interface LeagueSettings {
  seasonStartDate?: string;
  /** @deprecated No longer used, playoff status is per-match */
  isPlayoffEnabled?: boolean;
  /** @deprecated No longer used, scoring is computed directly */
  isScoringInPlayoffMode?: boolean;
  playoffSeries?: PlayoffSeriesItem[];
}

export interface LeagueSkaterItem {
  rank: number;
  name: string;
  club: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
}

export interface LeagueGoalieItem {
  rank: number;
  name: string;
  club: string;
  gamesPlayed: number;
  minutes: number;
  saves: number;
  goalsAgainst: number;
  savePercentage: number;
  shutouts: number;
  gaa?: number;
}

export interface LeagueGoalDetail {
  minute: number;
  time?: string;
  team: 'team1' | 'team2';
  teamName: string;
  scorer: string;
  assist: string | null;
  assists?: string[];
  isPenaltyShot?: boolean;
}

export interface LeagueMatchItem {
  round: number;
  dateStr: string;
  dayOfWeek: string;
  timeStr: string;
  location: string;
  arena?: string;
  team1: string;
  team2: string;
  referee?: string;
  isPlayed: boolean;
  score1?: number;
  score2?: number;
  periods?: string | string[];
  shots1?: number | null;
  shots2?: number | null;
  penalties1?: number | null;
  penalties2?: number | null;
  goals?: LeagueGoalDetail[];
  lineup1?: string[];
  lineup2?: string[];
  team1Lineup?: { goalie?: string; skaters: string[] };
  team2Lineup?: { goalie?: string; skaters: string[] };
}

export interface AppSettings {
  currentSeasonId?: string;
  currentSeasonName?: string;
  seasonStartDate?: string;
  /** @deprecated No longer used */
  isPlayoffEnabled?: boolean;
  /** @deprecated No longer used */
  isScoringInPlayoffMode?: boolean;
  playoffSeries?: PlayoffSeries[];
  leagueStandings?: LeagueStanding[];
  leagueSkaters?: LeagueSkaterItem[];
  leagueGoalies?: LeagueGoalieItem[];
  leagueMatches?: LeagueMatchItem[];
  leagueLastSyncAt?: any;
}
