import type { Match, UserProfile } from '@/types';
import { countPlayerCareerStars } from '@/features/matches/utils/matchStars';
import { countPlayerCareerMvpAwards } from '@/features/matches/utils/mvpVoting';
import { formatName, isGoaliePlayer } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';

export type MilestoneTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';

export type MilestoneCategory = 
  | 'games' 
  | 'points' 
  | 'goals' 
  | 'assists' 
  | 'goalie_wins' 
  | 'goalie_so' 
  | 'stars' 
  | 'mvp' 
  | 'special';

export interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  category: MilestoneCategory;
  tier: MilestoneTier;
  target: number;
  unit: string;
  iconName: string;
  rarityScore?: number;
}

export interface PlayerMilestoneProgress {
  milestone: MilestoneDefinition;
  current: number;
  target: number;
  isUnlocked: boolean;
  progressPct: number;
  remaining: number;
}

export interface UpcomingMilestone {
  playerId: string;
  playerName: string;
  playerJersey?: number | null;
  playerPhoto?: string | null;
  playerType: 'player' | 'goalie' | 'member';
  milestone: MilestoneDefinition;
  current: number;
  target: number;
  remaining: number;
  progressPct: number;
}

export interface MilestoneHolder {
  id: string;
  name: string;
  jerseyNumber?: number | null;
  photoURL?: string | null;
  playerType?: 'player' | 'goalie' | 'member';
  value: number;
  matchContext?: string;
  achievementDate?: string;
}

export interface MilestoneCandidate {
  id: string;
  name: string;
  jerseyNumber?: number | null;
  playerJersey?: number | null;
  photoURL?: string | null;
  playerType?: 'player' | 'goalie' | 'member';
  current: number;
  target: number;
  remaining: number;
  progressPct: number;
  note?: string;
}

export interface MilestoneWithHolders {
  definition: MilestoneDefinition;
  holders: MilestoneHolder[];
  totalHolders: number;
  candidates?: MilestoneCandidate[];
}

export interface TrophyLeader {
  id: string;
  name: string;
  jerseyNumber?: number | null;
  photoURL?: string | null;
  playerType?: 'player' | 'goalie' | 'member';
  totalBadges: number;
  prestigeScore: number;
  legendCount: number;
  diamondCount: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  topBadges: MilestoneDefinition[];
}

export interface TeamMilestonesData {
  allMilestones: MilestoneWithHolders[];
  upcomingMilestones: UpcomingMilestone[];
  myUnlockedCount: number;
  totalMilestonesCount: number;
  trophyLeaders?: TrophyLeader[];
}

export interface MilestoneSeries {
  id: string;
  title: string;
  category: MilestoneCategory;
  description: string;
  unit: string;
  iconName: string;
  milestoneIds: string[];
}

export const MILESTONE_SERIES: MilestoneSeries[] = [
  {
    id: 'series-games',
    title: 'Odehrané zápasy',
    category: 'games',
    description: 'Věrnost dresu HC Aces – počet odehraných zápasů',
    unit: 'zápasů',
    iconName: 'Shield',
    milestoneIds: ['gp-25', 'gp-50', 'gp-100', 'gp-150', 'gp-200'],
  },
  {
    id: 'series-points',
    title: 'Kanadské body',
    category: 'points',
    description: 'Celková produktivita – součet gólů a asistencí za Aces',
    unit: 'bodů',
    iconName: 'Flame',
    milestoneIds: ['pts-25', 'pts-50', 'pts-100', 'pts-150', 'pts-200'],
  },
  {
    id: 'series-goals',
    title: 'Vstřelené góly',
    category: 'goals',
    description: 'Střelecká potence – počet vstřelených branek',
    unit: 'gólů',
    iconName: 'Target',
    milestoneIds: ['g-10', 'g-25', 'g-50', 'g-75', 'g-100'],
  },
  {
    id: 'series-assists',
    title: 'Přihrávky na gól',
    category: 'assists',
    description: 'Přehled a tvorba hry – asistence u branek',
    unit: 'asistencí',
    iconName: 'Disc',
    milestoneIds: ['a-10', 'a-25', 'a-50', 'a-75', 'a-100'],
  },
  {
    id: 'series-goalie-wins',
    title: 'Brankářské výhry',
    category: 'goalie_wins',
    description: 'Vychytaná vítězství v brance HC Aces',
    unit: 'výher',
    iconName: 'Award',
    milestoneIds: ['gw-5', 'gw-15', 'gw-30', 'gw-50', 'gw-75'],
  },
  {
    id: 'series-goalie-so',
    title: 'Čistá konta',
    category: 'goalie_so',
    description: 'Zápasy s nulou na kontě obdržených branek',
    unit: 'čistých kont',
    iconName: 'ShieldCheck',
    milestoneIds: ['gso-1', 'gso-3', 'gso-5', 'gso-10', 'gso-15'],
  },
  {
    id: 'series-stars',
    title: 'Hvězdy zápasů',
    category: 'stars',
    description: 'Ocenění od týmu – celkový počet bodů v anketě Hvězdy',
    unit: 'bodů',
    iconName: 'Star',
    milestoneIds: ['star-10', 'star-25', 'star-50', 'star-75', 'star-100'],
  },
  {
    id: 'series-mvp',
    title: 'Ocenění MVP',
    category: 'mvp',
    description: 'Titul Nejužitečnější hráč zápasu zvolený spoluhráči',
    unit: 'x MVP',
    iconName: 'Trophy',
    milestoneIds: ['mvp-1', 'mvp-5', 'mvp-10', 'mvp-15', 'mvp-25'],
  },
];

export const TIER_CONFIG: Record<MilestoneTier, {
  label: string;
  badgeClass: string;
  cardBorderClass: string;
  iconColor: string;
  glowClass: string;
}> = {
  bronze: {
    label: 'Bronz',
    badgeClass: 'bg-amber-800/15 text-amber-800 dark:text-amber-500 border-amber-700/30 font-bold',
    cardBorderClass: 'border-amber-700/30 hover:border-amber-600/50',
    iconColor: 'text-amber-800 dark:text-amber-500',
    glowClass: 'from-amber-700/10 via-amber-700/5 to-transparent',
  },
  silver: {
    label: 'Stříbro',
    badgeClass: 'bg-slate-200/80 dark:bg-zinc-500/15 text-slate-800 dark:text-zinc-200 border-slate-300 dark:border-zinc-400/30 font-bold',
    cardBorderClass: 'border-slate-300 dark:border-zinc-500/30 hover:border-slate-400 dark:hover:border-zinc-400/50',
    iconColor: 'text-slate-700 dark:text-zinc-300',
    glowClass: 'from-slate-200/40 via-slate-100/20 to-transparent dark:from-zinc-500/10 dark:via-zinc-500/5 dark:to-transparent',
  },
  gold: {
    label: 'Zlato',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/40 font-bold',
    cardBorderClass: 'border-amber-500/40 hover:border-amber-400/60 shadow-amber-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
    glowClass: 'from-amber-500/15 via-amber-500/5 to-transparent',
  },
  diamond: {
    label: 'Diamant',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-400/40 font-bold',
    cardBorderClass: 'border-cyan-500/40 hover:border-cyan-400/70 shadow-cyan-500/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    glowClass: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
  },
  legend: {
    label: 'Legenda Aces',
    badgeClass: 'bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-amber-500/15 text-purple-900 dark:text-purple-200 border-purple-400/40 dark:border-purple-400/50 font-black tracking-wide',
    cardBorderClass: 'border-purple-400/50 dark:border-purple-500/50 hover:border-purple-400/80 shadow-lg shadow-purple-500/10',
    iconColor: 'text-purple-700 dark:text-purple-400',
    glowClass: 'from-purple-500/20 via-fuchsia-500/10 to-amber-500/5 dark:from-purple-500/25 dark:via-fuchsia-500/10 dark:to-amber-500/5',
  },
};

/**
 * Standardized difficulty and rarity scores for every achievement / milestone in the system.
 * Higher score = rarer, harder to achieve, higher prestige in the player's career.
 */
export const MILESTONE_RARITY_SCORES: Record<string, number> = {
  // 1. TIER LEGENDA & EXTRÉMNÍ ZÁPASOVÉ VÝKONY (1000 - 1500 bodů)
  'feat-playoff-shutout': 1500, // Zavřená svatyně v play-off (absolutní vrchol brankáře)
  'mvp-25': 1450,               // 25x MVP
  'gso-15': 1400,               // 15 čistých kont
  'pts-200': 1350,              // 200 kanadských bodů
  'g-100': 1350,                // 100 gólů
  'gw-75': 1350,                // 75 výher brankáře
  'gp-200': 1300,               // 200 zápasů
  'a-100': 1300,                // 100 asistencí
  'star-100': 1200,             // 100 bodů v Hvězdách zápasů
  'feat-5pts': 1100,             // Pětibodový koncert v 1 utkání
  'feat-star-hattrick': 1000,   // 3x 1. Hvězda zápasu

  // 2. TIER DIAMANT & VÝJIMEČNÉ ZÁPASOVÉ HITY (550 - 850 bodů)
  'feat-hattrick': 850,         // Hattrick Hero (3+ góly v zápase)
  'feat-penalty-shot': 750,     // Gól z nařízeného trestného střílení (TS)
  'feat-4assists': 750,         // Geniální dirigent (4+ asistencí v 1 utkání)
  'feat-4pts': 720,             // Čtyřbodová show v 1 utkání
  'gso-10': 700,                // 10 čistých kont
  'mvp-15': 700,                // 15x MVP
  'pts-150': 650,               // 150 bodů
  'g-75': 650,                  // 75 gólů
  'gw-50': 650,                 // 50 výher
  'a-75': 620,                  // 75 asistencí
  'gp-150': 600,                // 150 zápasů
  'star-75': 550,               // 75 bodů v Hvězdách

  // 3. TIER ZLATO (280 - 450 bodů)
  'feat-match-shutout': 450,    // Neprůstřelná zeď (20+ zákroků & čisté konto brankáře)
  'feat-assist-hattrick': 420,  // Hattrick asistencí (3+ asistence)
  'feat-ppg': 400,              // Klub průměru 1.00 bod na zápas (min. 10 Z)
  'mvp-10': 400,                // 10x MVP
  'feat-gwg': 380,              // Rozhodující trefa (Game-Winning Goal)
  'gso-5': 380,                 // 5 čistých kont
  'pts-100': 350,               // 100 bodů
  'g-50': 350,                  // 50 gólů
  'gw-30': 350,                 // 30 výher
  'a-50': 330,                  // 50 asistencí
  'gp-100': 300,                // 100 zápasů
  'star-50': 280,               // 50 bodů v Hvězdách

  // 4. TIER STŘÍBRO (120 - 220 bodů)
  'feat-30saves': 220,          // Zákroková zeď (30+ zákroků)
  'feat-quick-goal': 200,       // Bleskový úder (gól do 3 minut)
  'feat-podium-stars': 190,     // 5x na pódiu Hvězd zápasu
  'mvp-5': 180,                 // 5x MVP
  'gso-3': 180,                 // 3 čistá konta
  'gw-15': 160,                 // 15 výher
  'pts-50': 150,                // 50 bodů
  'g-25': 150,                  // 25 gólů
  'a-25': 140,                  // 25 asistencí
  'gp-50': 120,                 // 50 zápasů
  'star-25': 120,               // 25 bodů v Hvězdách

  // 5. TIER BRONZ (35 - 80 bodů)
  'feat-2goals': 80,            // Střelecký double (2 góly v zápase)
  'mvp-1': 70,                  // 1x MVP
  'gso-1': 70,                  // 1 čisté konto
  'gw-5': 55,                   // 5 výher
  'pts-25': 50,                 // 25 bodů
  'g-10': 50,                   // 10 gólů
  'a-10': 45,                   // 10 asistencí
  'gp-25': 40,                  // 25 zápasů
  'star-10': 35,                // 10 bodů v Hvězdách
};

/**
 * Returns the difficulty / prestige score for a milestone (higher = rarer).
 */
export function getMilestoneRarityScore(milestone: MilestoneDefinition): number {
  if (milestone.rarityScore && milestone.rarityScore > 0) {
    return milestone.rarityScore;
  }
  if (MILESTONE_RARITY_SCORES[milestone.id]) {
    return MILESTONE_RARITY_SCORES[milestone.id];
  }
  switch (milestone.tier) {
    case 'legend': return 1000;
    case 'diamond': return 600;
    case 'gold': return 350;
    case 'silver': return 150;
    case 'bronze': return 50;
    default: return 10;
  }
}

/**
 * Czech grammatical declension for milestone values and units (1, 2-4, 5+)
 */
export function formatUnitWithCount(count: number, unitOrCategory: string, milestoneId?: string): string {
  const c = Math.abs(Math.round(count));

  // Specialized by milestone ID
  if (milestoneId) {
    if (milestoneId === 'feat-ppg') {
      return c === 1 ? 'bod/zápas' : (c >= 2 && c <= 4 ? 'body/zápas' : 'bodů/zápas');
    }
    if (milestoneId.startsWith('mvp-')) {
      return 'x MVP';
    }
    if (milestoneId === 'feat-star-hattrick') {
      return c === 1 ? '1. hvězda' : (c >= 2 && c <= 4 ? '1. hvězdy' : '1. hvězd');
    }
    if (milestoneId === 'feat-podium-stars') {
      return c === 1 ? 'hvězdné pódium' : (c >= 2 && c <= 4 ? 'hvězdná pódia' : 'hvězdných pódií');
    }
    if (milestoneId === 'feat-gwg') {
      return c === 1 ? 'vítězný gól' : (c >= 2 && c <= 4 ? 'vítězné góly' : 'vítězných gólů');
    }
    if (milestoneId === 'feat-penalty-shot') {
      return c === 1 ? 'gól z TS' : (c >= 2 && c <= 4 ? 'góly z TS' : 'gólů z TS');
    }
    if (milestoneId === 'feat-quick-goal') {
      return c === 1 ? 'rychlý gól' : (c >= 2 && c <= 4 ? 'rychlé góly' : 'rychlých gólů');
    }
  }

  const uNorm = (unitOrCategory || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 1. Asistence
  if (uNorm.includes('asisten') || uNorm === 'assists') {
    if (c === 1) return 'asistence';
    if (c >= 2 && c <= 4) return 'asistence';
    return 'asistencí';
  }

  // 2. Výhry
  if (uNorm.includes('vyh') || uNorm === 'goalie_wins') {
    if (c === 1) return 'výhra';
    if (c >= 2 && c <= 4) return 'výhry';
    return 'výher';
  }

  // 3. Body
  if (uNorm.includes('bod') || uNorm === 'points' || uNorm === 'stars') {
    if (c === 1) return 'bod';
    if (c >= 2 && c <= 4) return 'body';
    return 'bodů';
  }

  // 4. Góly
  if (uNorm.includes('gol') || uNorm === 'goals') {
    if (c === 1) return 'gól';
    if (c >= 2 && c <= 4) return 'góly';
    return 'gólů';
  }

  // 5. Zápasy
  if (uNorm.includes('zapas') || uNorm === 'games') {
    if (c === 1) return 'zápas';
    if (c >= 2 && c <= 4) return 'zápasy';
    return 'zápasů';
  }

  // 6. Čistá konta (Shutouts)
  if (uNorm.includes('cist') || uNorm.includes('kont') || uNorm.includes('so') || uNorm === 'goalie_so') {
    if (c === 1) return 'čisté konto';
    if (c >= 2 && c <= 4) return 'čistá konta';
    return 'čistých kont';
  }

  // 7. Hattrick
  if (uNorm.includes('hattrick')) {
    if (c === 1) return 'hattrick';
    if (c >= 2 && c <= 4) return 'hattricky';
    return 'hattricků';
  }

  // 8. MVP
  if (uNorm.includes('mvp')) {
    return 'x MVP';
  }

  return unitOrCategory;
}

const RAW_MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // 1. ZÁPASY (25, 50, 100, 150, 200)
  {
    id: 'gp-25',
    title: 'Stálice sestavy',
    description: 'Odehráno 25 zápasů v dresu HC Aces',
    category: 'games',
    tier: 'bronze',
    target: 25,
    unit: 'zápasů',
    iconName: 'Shield',
  },
  {
    id: 'gp-50',
    title: 'Klub padesátníků',
    description: 'Odehráno 50 zápasů v dresu HC Aces',
    category: 'games',
    tier: 'silver',
    target: 50,
    unit: 'zápasů',
    iconName: 'Shield',
  },
  {
    id: 'gp-100',
    title: 'Klub stovkařů',
    description: 'Jubilejních 100 odehraných zápasů za Aces',
    category: 'games',
    tier: 'gold',
    target: 100,
    unit: 'zápasů',
    iconName: 'Shield',
  },
  {
    id: 'gp-150',
    title: 'Železný pilíř',
    description: '150 odehraných bitev za HC Aces',
    category: 'games',
    tier: 'diamond',
    target: 150,
    unit: 'zápasů',
    iconName: 'Shield',
  },
  {
    id: 'gp-200',
    title: 'Nesmrtelná ikona',
    description: 'Neuvěřitelných 200 zápasů. Absolutní klubová legenda.',
    category: 'games',
    tier: 'legend',
    target: 200,
    unit: 'zápasů',
    iconName: 'Crown',
  },

  // 2. KANADSKÉ BODY (25, 50, 100, 150, 200)
  {
    id: 'pts-25',
    title: 'Sběratel bodů',
    description: 'Dosažení 25 kanadských bodů v HC Aces',
    category: 'points',
    tier: 'bronze',
    target: 25,
    unit: 'bodů',
    iconName: 'Flame',
  },
  {
    id: 'pts-50',
    title: 'Padesátibodový borec',
    description: 'Dosažení 50 kanadských bodů',
    category: 'points',
    tier: 'silver',
    target: 50,
    unit: 'bodů',
    iconName: 'Flame',
  },
  {
    id: 'pts-100',
    title: 'Klub stovkářů v bodech',
    description: 'Prestižní meta 100 kanadských bodů',
    category: 'points',
    tier: 'gold',
    target: 100,
    unit: 'bodů',
    iconName: 'Flame',
  },
  {
    id: 'pts-150',
    title: 'Elitní lídr produktivity',
    description: '150 zaznamenaných kanadských bodů',
    category: 'points',
    tier: 'diamond',
    target: 150,
    unit: 'bodů',
    iconName: 'Flame',
  },
  {
    id: 'pts-200',
    title: 'Bodová legenda Aces',
    description: 'Historický milník 200 kanadských bodů',
    category: 'points',
    tier: 'legend',
    target: 200,
    unit: 'bodů',
    iconName: 'Crown',
  },
  {
    id: 'feat-ppg',
    title: 'Elitní PPG klub (Bod na zápas)',
    description: 'Kariérní průměr alespoň 1.00 bodu na zápas (při min. 10 odehraných utkáních)',
    category: 'points',
    tier: 'gold',
    target: 1,
    unit: 'bod/zápas',
    iconName: 'TrendingUp',
  },
  {
    id: 'feat-5pts',
    title: 'Pětibodový koncert',
    description: 'Zisk 5 a více kanadských bodů v jediném utkání',
    category: 'points',
    tier: 'legend',
    target: 1,
    unit: 'zápas',
    iconName: 'Flame',
  },

  // 3. GÓLY (10, 25, 50, 75, 100)
  {
    id: 'g-10',
    title: 'Dvouciferný střelec',
    description: '10 vstřelených gólů v dresu Aces',
    category: 'goals',
    tier: 'bronze',
    target: 10,
    unit: 'gólů',
    iconName: 'Disc',
  },
  {
    id: 'g-25',
    title: 'Kanonýr Aces',
    description: '25 vstřelených gólů za HC Aces',
    category: 'goals',
    tier: 'silver',
    target: 25,
    unit: 'gólů',
    iconName: 'Disc',
  },
  {
    id: 'g-50',
    title: 'Elitní snajpr',
    description: 'Půl sta vstřelených branek (50 gólů)',
    category: 'goals',
    tier: 'gold',
    target: 50,
    unit: 'gólů',
    iconName: 'Disc',
  },
  {
    id: 'g-75',
    title: 'Klub kanonýrů',
    description: '75 vstřelených gólů v dresu Aces',
    category: 'goals',
    tier: 'diamond',
    target: 75,
    unit: 'gólů',
    iconName: 'Disc',
  },
  {
    id: 'g-100',
    title: 'Stovkový střelec Aces',
    description: 'Stovka gólů! Neomylná střelecká extratřída.',
    category: 'goals',
    tier: 'legend',
    target: 100,
    unit: 'gólů',
    iconName: 'Crown',
  },
  {
    id: 'feat-2goals',
    title: 'Střelecký double',
    description: 'Vstřelení 2 gólů v jediném zápase',
    category: 'goals',
    tier: 'bronze',
    target: 1,
    unit: 'zápas',
    iconName: 'Disc',
  },
  {
    id: 'feat-gwg',
    title: 'Rozhodující trefa (GWG)',
    description: 'Vstřelení vítězného gólu (Game-Winning Goal), který rozhodl utkání',
    category: 'goals',
    tier: 'gold',
    target: 1,
    unit: 'vítězný gól',
    iconName: 'Target',
  },

  // 4. ASISTENCE (10, 25, 50, 75, 100)
  {
    id: 'a-10',
    title: 'Tvůrce hry',
    description: '10 přesných gólových nahrávek',
    category: 'assists',
    tier: 'bronze',
    target: 10,
    unit: 'asistencí',
    iconName: 'Award',
  },
  {
    id: 'a-25',
    title: 'Dvorní nahrávač',
    description: '25 gólových asistencí pro spoluhráče',
    category: 'assists',
    tier: 'silver',
    target: 25,
    unit: 'asistencí',
    iconName: 'Award',
  },
  {
    id: 'a-50',
    title: 'Maestro přihrávek',
    description: '50 asistencí v dresu Aces',
    category: 'assists',
    tier: 'gold',
    target: 50,
    unit: 'asistencí',
    iconName: 'Award',
  },
  {
    id: 'a-75',
    title: 'Herní dirigent',
    description: '75 gólových přihrávek. Vidí hřiště lépe než kdokoli jiný.',
    category: 'assists',
    tier: 'diamond',
    target: 75,
    unit: 'asistencí',
    iconName: 'Award',
  },
  {
    id: 'a-100',
    title: 'Stovkový génius přihrávek',
    description: '100 asistencí v dresu Aces',
    category: 'assists',
    tier: 'legend',
    target: 100,
    unit: 'asistencí',
    iconName: 'Crown',
  },
  {
    id: 'feat-assist-hattrick',
    title: 'Maestro nahrávač (Hattrick asistencí)',
    description: '3 a více gólových asistencí v jediném zápase',
    category: 'assists',
    tier: 'gold',
    target: 1,
    unit: 'hattrick',
    iconName: 'Award',
  },
  {
    id: 'feat-4assists',
    title: 'Geniální dirigent (4+ asistencí)',
    description: '4 a více gólových asistencí v jediném utkání',
    category: 'assists',
    tier: 'diamond',
    target: 1,
    unit: 'zápas',
    iconName: 'Sparkles',
  },

  // 5. BRANKÁŘSKÉ VÝHRY (5, 15, 30, 50, 75)
  {
    id: 'gw-5',
    title: 'Vítězný strážce',
    description: '5 vychytaných výher pro HC Aces',
    category: 'goalie_wins',
    tier: 'bronze',
    target: 5,
    unit: 'výher',
    iconName: 'Shield',
  },
  {
    id: 'gw-15',
    title: 'Opora v brance',
    description: '15 vítězných duelů v brankovišti',
    category: 'goalie_wins',
    tier: 'silver',
    target: 15,
    unit: 'výher',
    iconName: 'Shield',
  },
  {
    id: 'gw-30',
    title: 'Klub vítězů',
    description: '30 vychytaných výher v dresu Aces',
    category: 'goalie_wins',
    tier: 'gold',
    target: 30,
    unit: 'výher',
    iconName: 'Shield',
  },
  {
    id: 'gw-50',
    title: 'Pán brankoviště',
    description: '50 vítězných zápasů za Aces',
    category: 'goalie_wins',
    tier: 'diamond',
    target: 50,
    unit: 'výher',
    iconName: 'Shield',
  },
  {
    id: 'gw-75',
    title: 'Nesmrtelná zeď',
    description: '75 výher. Nejúspěšnější brankář historie Aces.',
    category: 'goalie_wins',
    tier: 'legend',
    target: 75,
    unit: 'výher',
    iconName: 'Crown',
  },
  {
    id: 'feat-30saves',
    title: 'Zákroková zeď (30+ zásahů)',
    description: 'Minimálně 30 úspěšných zákroků v jediném zápase',
    category: 'goalie_wins',
    tier: 'silver',
    target: 1,
    unit: 'zápas',
    iconName: 'Shield',
  },

  // 6. ČISTÁ KONTA (1, 3, 5, 10, 15)
  {
    id: 'gso-1',
    title: 'Neprůstřelný (Shutout)',
    description: 'První vychytané čisté konto za Aces',
    category: 'goalie_so',
    tier: 'bronze',
    target: 1,
    unit: 'čisté konto',
    iconName: 'ShieldCheck',
  },
  {
    id: 'gso-3',
    title: 'Zavřená vrata',
    description: '3 vychytaná čistá konta',
    category: 'goalie_so',
    tier: 'silver',
    target: 3,
    unit: 'čistá konta',
    iconName: 'ShieldCheck',
  },
  {
    id: 'gso-5',
    title: 'Brankářská skála',
    description: '5 čistých kont v dresu Aces',
    category: 'goalie_so',
    tier: 'gold',
    target: 5,
    unit: 'čistých kont',
    iconName: 'ShieldCheck',
  },
  {
    id: 'gso-10',
    title: 'Nedobytná tvrz',
    description: '10 zápasů s nulou na kontě',
    category: 'goalie_so',
    tier: 'diamond',
    target: 10,
    unit: 'čistých kont',
    iconName: 'ShieldCheck',
  },
  {
    id: 'gso-15',
    title: 'Žulová zeď Aces',
    description: '15 čistých kont. Absolutní rekord mezi tyčemi.',
    category: 'goalie_so',
    tier: 'legend',
    target: 15,
    unit: 'čistých kont',
    iconName: 'Crown',
  },
  {
    id: 'feat-match-shutout',
    title: 'Neprůstřelná zeď (20+ zákroků & nula)',
    description: 'Vychytané čisté konto v zápase s minimálně 20 úspěšnými zákroky při výhře Aces',
    category: 'goalie_so',
    tier: 'gold',
    target: 1,
    unit: 'nula s 20+ zákroky',
    iconName: 'ShieldCheck',
  },
  {
    id: 'feat-playoff-shutout',
    title: 'Zavřená svatyně v play-off',
    description: 'Vychytané čisté konto v klíčových vyřazovacích bojích play-off',
    category: 'goalie_so',
    tier: 'legend',
    target: 1,
    unit: 'SO v play-off',
    iconName: 'Crown',
  },

  // 7. HVĚZDY ZÁPASŮ (10, 25, 50, 75, 100)
  {
    id: 'star-10',
    title: 'Záře na ledě',
    description: 'Zisk 10 bodů v anketě Hvězdy zápasů',
    category: 'stars',
    tier: 'bronze',
    target: 10,
    unit: 'bodů',
    iconName: 'Star',
  },
  {
    id: 'star-25',
    title: 'Stálice v hledáčku',
    description: '25 bodů v anketě Hvězdy zápasů',
    category: 'stars',
    tier: 'silver',
    target: 25,
    unit: 'bodů',
    iconName: 'Star',
  },
  {
    id: 'star-50',
    title: 'Hvězdný tahoun',
    description: '50 bodů v anketě Hvězdy zápasů',
    category: 'stars',
    tier: 'gold',
    target: 50,
    unit: 'bodů',
    iconName: 'Star',
  },
  {
    id: 'star-75',
    title: 'Superstar týmu',
    description: '75 bodů v Hvězdách zápasů',
    category: 'stars',
    tier: 'diamond',
    target: 75,
    unit: 'bodů',
    iconName: 'Star',
  },
  {
    id: 'star-100',
    title: 'Hvězdná legenda',
    description: '100 bodů v anketě Hvězdy zápasů od spoluhráčů',
    category: 'stars',
    tier: 'legend',
    target: 100,
    unit: 'bodů',
    iconName: 'Crown',
  },
  {
    id: 'feat-podium-stars',
    title: 'Pódium hvězd (5x v TOP 3)',
    description: '5x se umístil mezi třemi hvězdami zápasu',
    category: 'stars',
    tier: 'silver',
    target: 5,
    unit: 'x na pódiu',
    iconName: 'Star',
  },
  {
    id: 'feat-star-hattrick',
    title: 'Hvězdný hattrick (3x 1. Hvězda)',
    description: '3x vyhlášen první hvězdou zápasu spoluhráči',
    category: 'stars',
    tier: 'gold',
    target: 3,
    unit: 'x 1. hvězda',
    iconName: 'Star',
  },

  // 8. MVP OCENĚNÍ (1, 5, 10, 15, 25)
  {
    id: 'mvp-1',
    title: 'Hrdina večera',
    description: '1x zvolen Hráčem zápasu (MVP) spoluhráči',
    category: 'mvp',
    tier: 'bronze',
    target: 1,
    unit: 'x MVP',
    iconName: 'Trophy',
  },
  {
    id: 'mvp-5',
    title: 'Srdcař týmu',
    description: '5x zvolen Hráčem zápasu (MVP)',
    category: 'mvp',
    tier: 'silver',
    target: 5,
    unit: 'x MVP',
    iconName: 'Trophy',
  },
  {
    id: 'mvp-10',
    title: 'Klíčový lídr',
    description: '10x zvolen Hráčem zápasu (MVP)',
    category: 'mvp',
    tier: 'gold',
    target: 10,
    unit: 'x MVP',
    iconName: 'Trophy',
  },
  {
    id: 'mvp-15',
    title: 'MVP dekády',
    description: '15x zvolen Hráčem zápasu (MVP)',
    category: 'mvp',
    tier: 'diamond',
    target: 15,
    unit: 'x MVP',
    iconName: 'Trophy',
  },
  {
    id: 'mvp-25',
    title: 'Hokejová ikona kabiny',
    description: '25x zvolen Hráčem zápasu (MVP). Nejoblíbenější bojovník.',
    category: 'mvp',
    tier: 'legend',
    target: 25,
    unit: 'x MVP',
    iconName: 'Crown',
  },

  // 9. SPECIÁLNÍ ZÁPASOVÉ KOUSKY
  {
    id: 'feat-penalty-shot',
    title: 'Chladnokrevný exekutor',
    description: 'Vstřelení branky z nařízeného trestného střílení / nájezdu (TS)',
    category: 'special',
    tier: 'diamond',
    target: 1,
    unit: 'gól z TS',
    iconName: 'Crosshair',
  },
  {
    id: 'feat-quick-goal',
    title: 'Bleskový úder (Gól do 3 minut)',
    description: 'Vstřelení branky v úvodních třech minutách zápasu',
    category: 'special',
    tier: 'silver',
    target: 1,
    unit: 'rychlý gól',
    iconName: 'Timer',
  },
  {
    id: 'feat-hattrick',
    title: 'Hattrick Hero',
    description: 'Alespoň jeden hattrick (3+ góly v 1 zápase)',
    category: 'special',
    tier: 'diamond',
    target: 1,
    unit: 'hattrick',
    iconName: 'Zap',
  },
  {
    id: 'feat-4pts',
    title: 'Čtyřbodová show',
    description: 'Zisk 4 a více kanadských bodů v jediném utkání',
    category: 'special',
    tier: 'diamond',
    target: 1,
    unit: 'zápas',
    iconName: 'Sparkles',
  },
];

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = RAW_MILESTONE_DEFINITIONS.map((def) => ({
  ...def,
  rarityScore: getMilestoneRarityScore(def),
}));


export interface PlayerSingleGameFeats {
  hattricks: number;
  twoGoalGames: number;
  assistHattricks: number;
  fourAssistGames: number;
  fourPointGames: number;
  fivePointGames: number;
  gameWinningGoals: number;
  penaltyShotGoals: number;
  quickGoals: number;
  matchShutouts: number;
  playoffShutouts: number;
  thirtySaveGames: number;
  featMatches?: Record<string, { context: string; dateStr: string }>;
}

/**
 * Checks single-game and situational feats for a player from all played matches
 */
export function countPlayerSingleGameFeats(
  playerId: string,
  playerName: string,
  allMatches: Match[] = []
): PlayerSingleGameFeats {
  let hattricks = 0;
  let twoGoalGames = 0;
  let assistHattricks = 0;
  let fourAssistGames = 0;
  let fourPointGames = 0;
  let fivePointGames = 0;
  let gameWinningGoals = 0;
  let penaltyShotGoals = 0;
  let quickGoals = 0;
  let matchShutouts = 0;
  let playoffShutouts = 0;
  let thirtySaveGames = 0;

  const featMatches: Record<string, { context: string; dateStr: string; count: number }> = {};

  const normalizedName = (playerName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const tokens = normalizedName.split(/\s+/).filter(Boolean);
  const surname = tokens[tokens.length - 1] || normalizedName;

  const matchesPlayer = (val: string | null | undefined): boolean => {
    if (!val) return false;
    if (val === playerId) return true;
    const norm = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (norm === normalizedName) return true;
    if (surname && surname.length >= 3 && norm.includes(surname)) return true;
    return false;
  };

  // Sort matches chronologically
  const sortedMatches = [...allMatches].filter((m) => m && m.isPlayed).sort((a, b) => {
    const da = toJsDate(a.dateTime)?.getTime() || 0;
    const db = toJsDate(b.dateTime)?.getTime() || 0;
    return da - db;
  });

  sortedMatches.forEach((m) => {
    const isT1 = /aces/i.test(m.team1 || '');
    const isT2 = /aces/i.test(m.team2 || '');
    const acesScore = isT1 ? (m.team1Score ?? 0) : (m.team2Score ?? 0);
    const oppScore = isT1 ? (m.team2Score ?? 0) : (m.team1Score ?? 0);
    const isAcesWin = acesScore > oppScore;
    const isPlayoff = m.type === 'playoff' || m.matchType === 'playoff';

    const opponent = (isT1 ? m.team2 : m.team1) || 'soupeř';
    const matchDate = toJsDate(m.dateTime);
    const dateStr = matchDate
      ? matchDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
      : '';

    const recordFeat = (id: string, label: string) => {
      if (!featMatches[id]) {
        featMatches[id] = {
          context: `proti ${opponent} (${dateStr}) - ${label}`,
          dateStr,
          count: 1,
        };
      } else {
        const prevCount = featMatches[id].count + 1;
        featMatches[id] = {
          context: `naposledy proti ${opponent} (${dateStr}) - ${label}`,
          dateStr,
          count: prevCount,
        };
      }
    };

    // Did player participate in the match?
    let playerPlayedInMatch = false;
    if (Array.isArray(m.gameRoster) && m.gameRoster.includes(playerId)) {
      playerPlayedInMatch = true;
    } else if (m.goalieId === playerId || matchesPlayer(m.goalieName)) {
      playerPlayedInMatch = true;
    } else if (m.lineup) {
      if (m.lineup.B1 && (m.lineup.B1.id === playerId || matchesPlayer(m.lineup.B1.name))) {
        playerPlayedInMatch = true;
      }
      for (const key of Object.keys(m.lineup)) {
        const slot = (m.lineup as any)[key];
        if (slot && (slot.id === playerId || matchesPlayer(slot.name))) {
          playerPlayedInMatch = true;
          break;
        }
      }
    }

    // Goalie check for this match
    const isGoalieThisMatch = 
      m.goalieId === playerId || 
      m.lineup?.B1?.id === playerId || 
      matchesPlayer(m.goalieName) || 
      matchesPlayer(m.lineup?.B1?.name);

    if (isGoalieThisMatch) {
      playerPlayedInMatch = true;
      const saves = m.goalieSaves ?? (m.shotsOpponent != null ? Math.max(0, m.shotsOpponent - oppScore) : 0);
      if (isAcesWin && oppScore === 0) {
        if (saves >= 20) {
          matchShutouts += 1;
          recordFeat('feat-match-shutout', `čisté konto (${saves} zákroků)`);
        }
        if (isPlayoff) {
          playoffShutouts += 1;
          recordFeat('feat-playoff-shutout', `čisté konto v play-off (${saves} zákroků)`);
        }
      }
      if (saves >= 30) {
        thirtySaveGames += 1;
        recordFeat('feat-30saves', `${saves} úspěšných zákroků`);
      }
    }

    let matchGoals = 0;
    let matchAssists = 0;
    let penaltyShotGoalsInMatch = 0;
    let quickGoalsInMatch = 0;
    let gwgScored = false;

    // Check detailed scorers
    if (Array.isArray(m.detailedScorers) && m.detailedScorers.length > 0) {
      const sortedScorers = [...m.detailedScorers].sort((a, b) => (a.minute || 0) - (b.minute || 0));
      let acesGoalIndex = 0;

      sortedScorers.forEach((ds) => {
        if (!ds) return;
        const isAcesGoal = (isT1 && ds.team === 'team1') || (isT2 && ds.team === 'team2') || /aces/i.test(ds.team || '');
        if (isAcesGoal) {
          acesGoalIndex++;
          if (isAcesWin && acesGoalIndex === oppScore + 1) {
            if (matchesPlayer(ds.scorer)) {
              gwgScored = true;
            }
          }
        }

        if (matchesPlayer(ds.scorer)) {
          matchGoals += 1;
          playerPlayedInMatch = true;
          if (ds.isPenaltyShot) {
            penaltyShotGoals += 1;
            penaltyShotGoalsInMatch += 1;
          }
          if (ds.minute != null && ds.minute <= 3) {
            quickGoals += 1;
            quickGoalsInMatch += 1;
          }
        }

        if (ds.assist && matchesPlayer(ds.assist)) {
          matchAssists += 1;
          playerPlayedInMatch = true;
        }
      });
    } else if (Array.isArray(m.scorers) && m.scorers.length > 0) {
      let acesGoalIndex = 0;
      m.scorers.forEach((s) => {
        if (!s) return;
        acesGoalIndex++;
        if (isAcesWin && acesGoalIndex === oppScore + 1) {
          if (matchesPlayer(s.goal)) {
            gwgScored = true;
          }
        }

        if (matchesPlayer(s.goal)) {
          matchGoals += 1;
          playerPlayedInMatch = true;
          if ((s as any).isPenaltyShot || (s as any).penaltyShot) {
            penaltyShotGoals += 1;
            penaltyShotGoalsInMatch += 1;
          }
        }
        if (s.assist && matchesPlayer(s.assist)) {
          matchAssists += 1;
          playerPlayedInMatch = true;
        }
      });
    }

    if (gwgScored) {
      gameWinningGoals += 1;
      recordFeat('feat-gwg', 'vítězný gól utkání (GWG)');
    }
    if (penaltyShotGoalsInMatch > 0) {
      recordFeat('feat-penalty-shot', 'proměněné trestné střílení (TS)');
    }
    if (quickGoalsInMatch > 0) {
      recordFeat('feat-quick-goal', 'bleskový gól do 3 minut');
    }

    // Single-game feats aggregations
    if (matchGoals >= 3) {
      hattricks += 1;
      recordFeat('feat-hattrick', `${matchGoals} góly v zápase (hattrick)`);
    }
    if (matchGoals >= 2) {
      twoGoalGames += 1;
      recordFeat('feat-2goals', '2 góly v zápase');
    }
    if (matchAssists >= 4) {
      fourAssistGames += 1;
      recordFeat('feat-4assists', `${matchAssists} asistencí v utkání`);
    }
    if (matchAssists >= 3) {
      assistHattricks += 1;
      recordFeat('feat-assist-hattrick', `${matchAssists} asistence v utkání`);
    }
    if (matchGoals + matchAssists >= 5) {
      fivePointGames += 1;
      recordFeat('feat-5pts', `${matchGoals + matchAssists} bodů (${matchGoals}+${matchAssists}) v utkání`);
    }
    if (matchGoals + matchAssists >= 4) {
      fourPointGames += 1;
      recordFeat('feat-4pts', `${matchGoals + matchAssists} bodů (${matchGoals}+${matchAssists}) v utkání`);
    }
  });

  const cleanedFeatMatches: Record<string, { context: string; dateStr: string }> = {};
  Object.keys(featMatches).forEach((k) => {
    cleanedFeatMatches[k] = {
      context: featMatches[k].context,
      dateStr: featMatches[k].dateStr,
    };
  });

  return {
    hattricks,
    twoGoalGames,
    assistHattricks,
    fourAssistGames,
    fourPointGames,
    fivePointGames,
    gameWinningGoals,
    penaltyShotGoals,
    quickGoals,
    matchShutouts,
    playoffShutouts,
    thirtySaveGames,
    featMatches: cleanedFeatMatches,
  };
}

/**
 * Calculates raw milestone values for a given player based on career data
 */
export function getPlayerRawStatsForMilestones(
  playerId: string,
  playerName: string,
  teamScoring: any[],
  goalieLeaderboard: any[],
  allMatches: Match[] = []
): Record<MilestoneCategory, number> {
  const skater = teamScoring.find((p) => p.id === playerId);
  const goalie = goalieLeaderboard.find((g) => g.id === playerId);

  const histSkater = skater?.history || { gamesPlayed: 0, goals: 0, assists: 0 };
  const histGoalie = goalie?.history || { gamesPlayed: 0, wins: 0, so: 0 };

  const games = (Number(histSkater.gamesPlayed) || 0) + (Number(histGoalie.gamesPlayed) || 0);
  const goals = Number(histSkater.goals) || 0;
  const assists = Number(histSkater.assists) || 0;
  const points = goals + assists;

  const goalieWins = Number(histGoalie.wins) || 0;
  const goalieSo = Number(histGoalie.so) || 0;

  const stars = countPlayerCareerStars(playerId, allMatches);
  const mvp = countPlayerCareerMvpAwards(playerId, allMatches);

  const feats = countPlayerSingleGameFeats(playerId, playerName, allMatches);

  return {
    games,
    points,
    goals,
    assists,
    goalie_wins: goalieWins,
    goalie_so: goalieSo,
    stars: stars.totalPoints,
    mvp,
    special: feats.hattricks + feats.fourPointGames + feats.fivePointGames + feats.quickGoals + feats.penaltyShotGoals,
  };
}

/**
 * Calculates all milestones and progress for a single player
 */
export function calculatePlayerMilestones(
  playerId: string,
  playerName: string,
  teamScoring: any[],
  goalieLeaderboard: any[],
  allMatches: Match[] = []
): PlayerMilestoneProgress[] {
  const rawStats = getPlayerRawStatsForMilestones(playerId, playerName, teamScoring, goalieLeaderboard, allMatches);
  const feats = countPlayerSingleGameFeats(playerId, playerName, allMatches);
  const starsStats = countPlayerCareerStars(playerId, allMatches);
  const goalie = goalieLeaderboard.find((g) => g.id === playerId);

  return MILESTONE_DEFINITIONS.map((def) => {
    let current = 0;
    let isUnlocked = false;
    let progressPct = 0;
    let remaining = 0;

    switch (def.id) {
      // Speciální gólové & bodové
      case 'feat-ppg': {
        const skaterGames = rawStats.games;
        const ppg = skaterGames >= 10 ? Math.round((rawStats.points / skaterGames) * 100) / 100 : 0;
        current = ppg;
        isUnlocked = skaterGames >= 10 && ppg >= 1.0;
        progressPct = Math.min(100, Math.round((ppg / 1.0) * 100));
        remaining = isUnlocked ? 0 : Math.max(0, Math.round((1.0 - ppg) * 100) / 100);
        break;
      }
      case 'feat-5pts':
        current = feats.fivePointGames;
        break;
      case 'feat-4pts':
        current = feats.fourPointGames;
        break;
      case 'feat-2goals':
        current = feats.twoGoalGames;
        break;
      case 'feat-hattrick':
        current = feats.hattricks;
        break;
      case 'feat-gwg':
        current = feats.gameWinningGoals;
        break;
      case 'feat-assist-hattrick':
        current = feats.assistHattricks;
        break;
      case 'feat-4assists':
        current = feats.fourAssistGames;
        break;
      case 'feat-quick-goal':
        current = feats.quickGoals;
        break;

      // Brankářské
      case 'feat-30saves':
        current = feats.thirtySaveGames;
        break;
      case 'feat-match-shutout':
        current = feats.matchShutouts;
        break;
      case 'feat-playoff-shutout':
        current = feats.playoffShutouts;
        break;

      // Hvězdy
      case 'feat-podium-stars':
        current = starsStats.totalStars;
        break;
      case 'feat-star-hattrick':
        current = starsStats.firstStars;
        break;

      // Speciální
      case 'feat-penalty-shot':
        current = feats.penaltyShotGoals;
        break;

      // Standardní kategorie
      default:
        current = rawStats[def.category] || 0;
        break;
    }

    if (def.id !== 'feat-ppg') {
      isUnlocked = current >= def.target;
      progressPct = Math.min(100, Math.round((current / def.target) * 100));
      remaining = Math.max(0, def.target - current);
    }

    return {
      milestone: {
        ...def,
        rarityScore: def.rarityScore ?? getMilestoneRarityScore(def),
      },
      current,
      target: def.target,
      isUnlocked,
      progressPct,
      remaining,
    };
  });
}

/**
 * Computes team-wide milestones overview:
 * - Milestone definitions with lists of holders
 * - Upcoming milestones (players who are close to a milestone)
 */
export function calculateTeamMilestonesOverview(
  allUsers: UserProfile[] = [],
  teamScoring: any[] = [],
  goalieLeaderboard: any[] = [],
  allMatches: Match[] = [],
  currentUserId?: string | null
): TeamMilestonesData {
  const holdersMap = new Map<string, MilestoneHolder[]>();
  const candidatesMap = new Map<string, MilestoneCandidate[]>();
  MILESTONE_DEFINITIONS.forEach((d) => {
    holdersMap.set(d.id, []);
    candidatesMap.set(d.id, []);
  });

  const upcomingList: UpcomingMilestone[] = [];
  const trophyLeadersList: TrophyLeader[] = [];
  let myUnlockedCount = 0;

  allUsers.forEach((user) => {
    const progressList = calculatePlayerMilestones(user.id, user.name, teamScoring, goalieLeaderboard, allMatches);
    const feats = countPlayerSingleGameFeats(user.id, user.name, allMatches);
    const resolvedPlayerType = isGoaliePlayer(user) ? 'goalie' : user.playerType;

    const userLeadersRecord: TrophyLeader = {
      id: user.id,
      name: formatName(user.name),
      jerseyNumber: user.jerseyNumber,
      photoURL: user.photoURL,
      playerType: resolvedPlayerType,
      totalBadges: 0,
      prestigeScore: 0,
      legendCount: 0,
      diamondCount: 0,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      topBadges: [],
    };
    const userUnlockedDefs: MilestoneDefinition[] = [];

    progressList.forEach((prog) => {
      if (prog.isUnlocked) {
        userUnlockedDefs.push(prog.milestone);
        userLeadersRecord.totalBadges += 1;
        userLeadersRecord.prestigeScore += (prog.milestone.rarityScore ?? getMilestoneRarityScore(prog.milestone));
        switch (prog.milestone.tier) {
          case 'legend': userLeadersRecord.legendCount += 1; break;
          case 'diamond': userLeadersRecord.diamondCount += 1; break;
          case 'gold': userLeadersRecord.goldCount += 1; break;
          case 'silver': userLeadersRecord.silverCount += 1; break;
          case 'bronze': userLeadersRecord.bronzeCount += 1; break;
        }

        const featInfo = feats.featMatches?.[prog.milestone.id];
        holdersMap.get(prog.milestone.id)?.push({
          id: user.id,
          name: formatName(user.name),
          jerseyNumber: user.jerseyNumber,
          photoURL: user.photoURL,
          playerType: resolvedPlayerType,
          value: prog.current,
          matchContext: featInfo?.context,
          achievementDate: featInfo?.dateStr,
        });

        if (currentUserId && user.id === currentUserId) {
          myUnlockedCount += 1;
        }
      } else {
        // Collect candidate
        if (prog.current > 0) {
          candidatesMap.get(prog.milestone.id)?.push({
            id: user.id,
            name: formatName(user.name),
            jerseyNumber: user.jerseyNumber,
            photoURL: user.photoURL,
            playerType: resolvedPlayerType,
            current: prog.current,
            target: prog.target,
            remaining: prog.remaining,
            progressPct: prog.progressPct,
          });
        } else if (prog.milestone.id === 'feat-hattrick' && feats.twoGoalGames > 0) {
          candidatesMap.get(prog.milestone.id)?.push({
            id: user.id,
            name: formatName(user.name),
            jerseyNumber: user.jerseyNumber,
            photoURL: user.photoURL,
            playerType: resolvedPlayerType,
            current: 2,
            target: 3,
            remaining: 1,
            progressPct: 67,
            note: `${feats.twoGoalGames}x dva góly v zápase`,
          });
        }

        // Upcoming criteria for Radar
        const isClose =
          (prog.milestone.category === 'games' && prog.remaining <= 3 && prog.current > 0) ||
          (prog.milestone.category === 'points' && prog.milestone.target >= 25 && prog.remaining <= 3 && prog.current > 0) ||
          (prog.milestone.category === 'goals' && prog.milestone.target >= 10 && prog.remaining <= 2 && prog.current > 0) ||
          (prog.milestone.category === 'assists' && prog.milestone.target >= 10 && prog.remaining <= 2 && prog.current > 0) ||
          (prog.milestone.category === 'goalie_wins' && prog.milestone.target >= 5 && prog.remaining <= 2 && prog.current > 0) ||
          (prog.milestone.category === 'goalie_so' && prog.milestone.target > 1 && prog.remaining <= 1 && prog.current > 0) ||
          (prog.milestone.category === 'stars' && prog.remaining <= 3 && prog.current > 0) ||
          (prog.milestone.category === 'mvp' && prog.milestone.target > 1 && prog.remaining <= 1 && prog.current > 0) ||
          (prog.milestone.id === 'feat-star-hattrick' && prog.remaining === 1 && prog.current > 0) ||
          (prog.milestone.id === 'feat-podium-stars' && prog.remaining === 1 && prog.current > 0);

        if (isClose) {
          upcomingList.push({
            playerId: user.id,
            playerName: formatName(user.name),
            playerJersey: user.jerseyNumber,
            playerPhoto: user.photoURL,
            playerType: resolvedPlayerType,
            milestone: prog.milestone,
            current: prog.current,
            target: prog.target,
            remaining: prog.remaining,
            progressPct: prog.progressPct,
          });
        }
      }
    });

    if (userLeadersRecord.totalBadges > 0) {
      userUnlockedDefs.sort((a, b) => {
        const sa = a.rarityScore ?? getMilestoneRarityScore(a);
        const sb = b.rarityScore ?? getMilestoneRarityScore(b);
        return sb - sa;
      });
      userLeadersRecord.topBadges = userUnlockedDefs.slice(0, 4);
      trophyLeadersList.push(userLeadersRecord);
    }
  });

  // Sort trophy leaders by prestigeScore DESC, then totalBadges DESC, then legendCount DESC, then diamondCount DESC
  trophyLeadersList.sort((a, b) => {
    if (b.prestigeScore !== a.prestigeScore) return b.prestigeScore - a.prestigeScore;
    if (b.totalBadges !== a.totalBadges) return b.totalBadges - a.totalBadges;
    if (b.legendCount !== a.legendCount) return b.legendCount - a.legendCount;
    return b.diamondCount - a.diamondCount;
  });

  // Sort upcoming by remaining ASC, then progressPct DESC
  upcomingList.sort((a, b) => a.remaining - b.remaining || b.progressPct - a.progressPct);

  // Build full milestones with holders and closest candidates
  const allMilestones: MilestoneWithHolders[] = MILESTONE_DEFINITIONS.map((def) => {
    const holders = holdersMap.get(def.id) || [];
    // Sort holders by value DESC
    holders.sort((a, b) => b.value - a.value);

    const candidates = candidatesMap.get(def.id) || [];
    // Sort candidates: lowest remaining first (closest to unlocking), then highest progressPct / current
    candidates.sort((a, b) => a.remaining - b.remaining || b.progressPct - a.progressPct || b.current - a.current);

    return {
      definition: def,
      holders,
      totalHolders: holders.length,
      candidates: candidates.slice(0, 5),
    };
  });

  return {
    allMilestones,
    upcomingMilestones: upcomingList.slice(0, 8), // top 8 upcoming hype milestones
    myUnlockedCount,
    totalMilestonesCount: MILESTONE_DEFINITIONS.length,
    trophyLeaders: trophyLeadersList,
  };
}

/**
 * Calculates total count of all holders across all milestone badges
 */
export function getTotalHoldersCount(milestones: MilestoneWithHolders[]): number {
  return milestones.reduce((sum, m) => sum + m.totalHolders, 0);
}

/**
 * Helper to build teamScoring and goalieLeaderboard datasets from raw collections
 */
export function buildTeamScoringAndGoalieLeaderboard(
  allUsers: any[] = [],
  allSkaterStats: any[] = [],
  allGoalieStats: any[] = [],
  allMatches: Match[] = []
): { teamScoring: any[]; goalieLeaderboard: any[] } {
  // 1. Skater scoring
  const skaterStatsMap = new Map<string, any>();
  allSkaterStats.forEach((stat) => {
    if (stat.userProfileId) skaterStatsMap.set(stat.userProfileId, stat);
  });

  const teamScoring = allUsers
    .filter((u) => (u.playerType === 'player' || !u.playerType) && !isGoaliePlayer(u))
    .map((u) => {
      const stats = skaterStatsMap.get(u.id);
      const reg = {
        goals: stats?.seasonGoals ?? 0,
        assists: stats?.seasonAssists ?? 0,
        gamesPlayed: stats?.seasonGamesPlayed ?? 0,
      };
      const po = {
        goals: stats?.playoffGoals ?? 0,
        assists: stats?.playoffAssists ?? 0,
        gamesPlayed: stats?.playoffGamesPlayed ?? 0,
      };

      return {
        id: u.id,
        name: formatName(u.name),
        regular: reg,
        playoff: po,
        season: {
          goals: reg.goals + po.goals,
          assists: reg.assists + po.assists,
          gamesPlayed: reg.gamesPlayed + po.gamesPlayed,
        },
        history: {
          goals: (stats?.historicalGoals ?? 0) + reg.goals + po.goals,
          assists: (stats?.historicalAssists ?? 0) + reg.assists + po.assists,
          gamesPlayed: (stats?.historicalGamesPlayed ?? 0) + reg.gamesPlayed + po.gamesPlayed,
        },
        rawHistory: {
          goals: stats?.historicalGoals ?? 0,
          assists: stats?.historicalAssists ?? 0,
          gamesPlayed: stats?.historicalGamesPlayed ?? 0,
        },
      };
    });

  // 2. Goalie leaderboard
  const goalieStatsMap = new Map<string, any>();
  allGoalieStats.forEach((stat) => {
    if (stat.userProfileId) goalieStatsMap.set(stat.userProfileId, stat);
  });
  const seasonStartMs = new Date('2026-09-16T00:00:00').getTime();

  const goalieLeaderboard = allUsers
    .filter((u) => u.playerType === 'goalie' || isGoaliePlayer(u))
    .map((u) => {
      const stats = goalieStatsMap.get(u.id);
      let matchWins = 0;
      let matchGames = 0;
      let matchSO = 0;

      if (allMatches) {
        const uTokens = (u.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/);
        const uSurname = uTokens[uTokens.length - 1] || '';

        for (const m of allMatches) {
          if (!m.isPlayed) continue;
          const mTime = toJsDate(m.dateTime).getTime();
          if (mTime < seasonStartMs) continue;
          if (m.type && m.type !== 'regular') continue;

          const isT1 = /aces/i.test(m.team1 || '');
          const isT2 = /aces/i.test(m.team2 || '');
          if (!isT1 && !isT2) continue;

          const gName = (m.goalieName || m.lineup?.B1?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const gId = m.goalieId || m.lineup?.B1?.id;
          if (gId === u.id || (uSurname && gName.includes(uSurname))) {
            matchGames++;
            const acesScore = isT1 ? (m.team1Score ?? 0) : (m.team2Score ?? 0);
            const oppScore = isT1 ? (m.team2Score ?? 0) : (m.team1Score ?? 0);
            if (acesScore > oppScore) matchWins++;
            if (oppScore === 0) matchSO++;
          }
        }
      }

      const officialGames = stats?.seasonGamesPlayed ?? 0;
      const regGames = officialGames > 0 ? officialGames : matchGames;
      let regWins = Math.max(stats?.seasonWins ?? 0, matchWins);
      if (regGames > 0 && regWins > regGames) {
        regWins = Math.min(matchWins > 0 ? matchWins : regWins, regGames);
      }
      const regSO = Math.max(stats?.seasonSO ?? 0, matchSO);

      const shotsAgainst = stats?.seasonShotsAgainst ?? 0;
      const saves = stats?.seasonSaves ?? 0;
      const goalsAgainst = Math.max(0, shotsAgainst - saves);

      const reg = {
        gamesPlayed: regGames,
        wins: regWins,
        shotsAgainst,
        saves,
        goalsAgainst,
        so: regSO,
      };

      const poShotsAgainst = stats?.playoffShotsAgainst ?? 0;
      const poSaves = stats?.playoffSaves ?? 0;
      const poGoalsAgainst = Math.max(0, poShotsAgainst - poSaves);
      const po = {
        gamesPlayed: stats?.playoffGamesPlayed ?? 0,
        wins: stats?.playoffWins ?? 0,
        shotsAgainst: poShotsAgainst,
        saves: poSaves,
        goalsAgainst: poGoalsAgainst,
        so: stats?.playoffSO ?? 0,
      };

      const seasonSaves = reg.saves + po.saves;
      const seasonShots = reg.shotsAgainst + po.shotsAgainst;
      const seasonGA = reg.goalsAgainst + po.goalsAgainst;

      const histSaves = (stats?.historicalSaves ?? 0) + seasonSaves;
      const histShots = (stats?.historicalShotsAgainst ?? 0) + seasonShots;
      const histGA = Math.max(0, histShots - histSaves);

      return {
        id: u.id,
        name: formatName(u.name),
        regular: reg,
        playoff: po,
        season: {
          gamesPlayed: reg.gamesPlayed + po.gamesPlayed,
          wins: reg.wins + po.wins,
          shotsAgainst: seasonShots,
          saves: seasonSaves,
          goalsAgainst: seasonGA,
          so: reg.so + po.so,
        },
        history: {
          gamesPlayed: (stats?.historicalGamesPlayed ?? 0) + reg.gamesPlayed + po.gamesPlayed,
          wins: (stats?.historicalWins ?? 0) + reg.wins + po.wins,
          shotsAgainst: histShots,
          saves: histSaves,
          goalsAgainst: histGA,
          so: (stats?.historicalSO ?? 0) + reg.so + po.so,
        },
        rawHistory: {
          gamesPlayed: stats?.historicalGamesPlayed ?? 0,
          wins: stats?.historicalWins ?? 0,
          shotsAgainst: stats?.historicalShotsAgainst ?? 0,
          saves: stats?.historicalSaves ?? 0,
          goalsAgainst: Math.max(0, (stats?.historicalShotsAgainst ?? 0) - (stats?.historicalSaves ?? 0)),
          so: stats?.historicalSO ?? 0,
        },
      };
    });

  return { teamScoring, goalieLeaderboard };
}
