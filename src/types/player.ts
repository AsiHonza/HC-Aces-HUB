export type PlayerType = 'player' | 'goalie' | 'member';
export type UserRole = 'admin' | 'classic';

export interface Player {
  id: string;
  name: string;
  jerseyNumber?: number;
  playerType?: PlayerType;
  role?: UserRole;
  photoURL?: string | null;
  isGuest?: boolean;
  email?: string;
  phoneNumber?: string;
  dob?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  jerseyNumber?: number;
  role?: UserRole;
  playerType: PlayerType;
  dob?: string;
  photoURL?: string | null;
  isGuest?: boolean;
  preferredTheme?: 'aces' | 'dark' | 'light';
}

export interface SkaterStats {
  id: string;
  userProfileId: string;
  seasonGoals: number;
  seasonAssists: number;
  seasonGamesPlayed: number;
  playoffGoals?: number;
  playoffAssists?: number;
  playoffGamesPlayed?: number;
  historicalGoals?: number;
  historicalAssists?: number;
  historicalGamesPlayed?: number;
  historicalPenaltyMinutes?: number;
}

export interface GoalieStats {
  id: string;
  userProfileId: string;
  seasonGamesPlayed: number;
  seasonWins: number;
  seasonShotsAgainst: number;
  seasonSaves: number;
  seasonSO: number;
  playoffGamesPlayed?: number;
  playoffWins?: number;
  playoffShotsAgainst?: number;
  playoffSaves?: number;
  playoffSO?: number;
  historicalGamesPlayed?: number;
  historicalWins?: number;
  historicalShotsAgainst?: number;
  historicalSaves?: number;
  historicalSO?: number;
  historicalLosses?: number;
  historicalDraws?: number;
  historicalGoalsAgainst?: number;
  historicalSavePercentage?: number;
}
