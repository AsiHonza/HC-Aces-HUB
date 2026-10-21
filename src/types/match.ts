import { Lineup } from './lineup';

export interface ScorerItem {
  goal: string;
  assist: string | null;
}

export interface DetailedScorerItem {
  minute: number;
  team: string;
  scorer: string;
  assist: string | null;
  isPenaltyShot?: boolean;
}

export interface PeriodScore {
  aces: number;
  opponent: number;
}

export interface MatchResult {
  aces: number;
  opponent: number;
}

export interface MatchStarsVote {
  star1: string; // 1st star candidate ID (3 points)
  star2: string; // 2nd star candidate ID (2 points)
  star3: string; // 3rd star candidate ID (1 point)
  votedAt?: any;
}

export interface MatchPrediction {
  acesScore: number;
  opponentScore: number;
  firstScorerId?: string | null;
  updatedAt?: any;
}

export interface Match {
  id: string;
  seasonId?: string;
  dateTime: any; // Firestore Timestamp, string or Date
  date?: any;
  location: string;
  place?: string;
  team1: string;
  team2: string;
  opponent?: string;
  isPlayed: boolean;
  type: 'regular' | 'playoff' | 'friendly';
  matchType?: 'regular' | 'playoff' | 'friendly';
  round?: number | null;
  playoffStage?: 'čtvrtfinále' | 'semifinále' | 'finále' | string | null;
  playoffMatchNumber?: number | null;
  team1Score?: number;
  team2Score?: number;
  scorers?: ScorerItem[];
  detailedScorers?: DetailedScorerItem[];
  lineup?: Lineup;
  goalieId?: string | null;
  goalieName?: string;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
  goalieSavePercentage?: number;
  periodScores?: string;
  shotsTeam1?: number;
  shotsTeam2?: number;
  shotsAces?: number;
  shotsOpponent?: number;
  penaltiesTeam1?: number;
  penaltiesTeam2?: number;
  penaltiesAces?: number;
  penaltiesOpponent?: number;
  gameRoster?: string[];
  opponentRoster?: string[];
  homeAway?: 'home' | 'away';
  result?: MatchResult | null;
  notes?: string;
  gameSheetUrl?: string;
  mvpVotes?: Record<string, string>;
  mvpWinnerId?: string | null;
  starsVotes?: Record<string, MatchStarsVote>;
  starsResults?: {
    star1Id: string | null;
    star2Id: string | null;
    star3Id: string | null;
  };
}
