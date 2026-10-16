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
  isPlayoffEnabled: boolean;
  isScoringInPlayoffMode: boolean;
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

export interface AppSettings {
  currentSeasonId?: string;
  currentSeasonName?: string;
  isPlayoffEnabled: boolean;
  isScoringInPlayoffMode: boolean;
  playoffSeries?: PlayoffSeries[];
  leagueStandings?: LeagueStanding[];
  leagueSkaters?: LeagueSkaterItem[];
}
