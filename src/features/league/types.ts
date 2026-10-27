import type {
  LeagueStanding,
  LeagueSkaterItem,
  LeagueGoalieItem,
  LeagueMatchItem,
  LeagueGoalDetail,
} from '@/types';

export type {
  LeagueStanding,
  LeagueSkaterItem,
  LeagueGoalieItem,
  LeagueMatchItem,
  LeagueGoalDetail,
};

export interface TeamFormMatch {
  round: number;
  result: 'W' | 'D' | 'L';
  score: string;
  opponent: string;
  dateStr?: string;
  isHome: boolean;
}

export interface TeamAnalyticsSummary {
  id: string;
  name: string;
  rank: number;
  points: number;
  gp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  diff: number;
  gfPerGame: number;
  gaPerGame: number;
  form: TeamFormMatch[];
  totalShots: number;
  totalShotsAgainst: number;
  shootingPercentage: number;
  savePercentage: number;
  totalPenalties: number;
  penaltiesPerGame: number;
  hasShotsTracked: boolean;
  topScorer: {
    name: string;
    goals: number;
    assists: number;
    points: number;
  } | null;
  primaryGoalie: {
    name: string;
    savePercentage: number;
    gamesPlayed: number;
    goalsAgainst: number;
  } | null;
}

export interface LeagueAwardsLeadersData {
  totalMatchesPlayed: number;
  totalGoalsScored: number;
  averageGoalsPerGame: number;
  bestOffenseTeam: { name: string; gfPerGame: number; totalGf: number } | null;
  bestDefenseTeam: { name: string; gaPerGame: number; totalGa: number } | null;
  bestShootingTeam: { name: string; percentage: number; goals: number; shots: number } | null;
  mostDisciplinedTeam: { name: string; penaltiesPerGame: number; totalPenalties: number } | null;
  artRossLeader: { name: string; club: string; points: number; goals: number; assists: number; gp: number } | null;
  rocketRichardLeader: { name: string; club: string; goals: number; gp: number } | null;
  vezinaLeader: { name: string; club: string; savePercentage: number; saves: number; ga: number } | null;
}

export type LeagueOverviewData = LeagueAwardsLeadersData;
