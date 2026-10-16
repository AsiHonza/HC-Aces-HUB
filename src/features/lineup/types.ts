export interface Player {
  id: string;
  name: string;
  email: string;
  jerseyNumber?: number;
  photoURL?: string | null;
  playerType?: 'player' | 'goalie' | 'member';
  role?: 'admin' | 'classic';
  isGuest?: boolean;
}

export interface Lineup {
  LK1: Player | null; C1: Player | null; PK1: Player | null;
  LO1: Player | null; PO1: Player | null;
  LK2: Player | null; C2: Player | null; PK2: Player | null;
  LO2: Player | null; PO2: Player | null;
  LK3: Player | null; C3: Player | null; PK3: Player | null;
  B1: Player | null;
}

export type LineupPositionKey = keyof Lineup;

export interface PlayerStats {
  goals: number;
  assists: number;
}

export interface FormationSlot {
  key: LineupPositionKey;
  roleName: string;
  roleShort: string;
}

export interface FormationRowConfig {
  id: string;
  title: string;
  lineType: 'attack' | 'defense' | 'goalie';
  slots: FormationSlot[];
}
