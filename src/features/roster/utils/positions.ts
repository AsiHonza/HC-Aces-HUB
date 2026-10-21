import type { FieldPosition, Match, ResolvedPosition, UserProfile } from '@/types';
import { areNamesMatching, isGoaliePlayer } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';

/**
 * Datum zahájení oficiální archivace sestav (25. 10. 2026).
 * Od tohoto zápasu dále jsou pozice v zápase evidovány přesně dle sestavy v match.lineup.
 * Zápasy před tímto datem neměly archivaci sestav, proto se pro postové úspěchy nezapočítávají.
 */
export const LINEUP_ARCHIVE_START_DATE_STR = '2026-10-25';
export const LINEUP_ARCHIVE_START_MS = new Date('2026-10-25T00:00:00').getTime();

/**
 * Zkontroluje, zda zápas proběhl v období s ostrou archivací sestav (od 25. 10. 2026).
 */
export function isMatchLineupArchived(match: Match | null | undefined): boolean {
  if (!match) return false;
  const matchDate = toJsDate(match.dateTime || match.date);
  if (!matchDate) return false;
  return matchDate.getTime() >= LINEUP_ARCHIVE_START_MS;
}

export interface PositionMetadata {
  key: ResolvedPosition;
  label: string;
  shortLabel: string;
  tinyLabel: string;
  badgeClass: string;
  textClass: string;
}

export const POSITION_METADATA: Record<ResolvedPosition, PositionMetadata> = {
  goalie: {
    key: 'goalie',
    label: 'Brankář',
    shortLabel: 'BRA',
    tinyLabel: 'G',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  defense: {
    key: 'defense',
    label: 'Obránce',
    shortLabel: 'OBR',
    tinyLabel: 'O',
    badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/35',
    textClass: 'text-sky-600 dark:text-sky-400',
  },
  center: {
    key: 'center',
    label: 'Centr',
    shortLabel: 'CEN',
    tinyLabel: 'C',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/35',
    textClass: 'text-purple-600 dark:text-purple-400',
  },
  wing: {
    key: 'wing',
    label: 'Křídlo',
    shortLabel: 'KŘÍ',
    tinyLabel: 'K',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/35',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  player: {
    key: 'player',
    label: 'Hráč v poli',
    shortLabel: 'HRÁ',
    tinyLabel: 'H',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    textClass: 'text-muted-foreground',
  },
  member: {
    key: 'member',
    label: 'Člen týmu',
    shortLabel: 'ČLEN',
    tinyLabel: 'Č',
    badgeClass: 'bg-muted/60 text-muted-foreground border-border/60',
    textClass: 'text-muted-foreground',
  },
};

export interface PlayerPositionBreakdown {
  resolvedPosition: ResolvedPosition;
  meta: PositionMetadata;
  defenseCount: number;
  wingCount: number;
  centerCount: number;
  totalLineupAppearances: number;
  isAutoDetected: boolean;
  secondaryPosition?: FieldPosition | null;
}

/**
 * Maps a lineup slot key (e.g. LO1, PO2, LK1, C2, PK3) to a normalized FieldPosition.
 */
export function mapLineupSlotToFieldPosition(slotKey: string): FieldPosition | null {
  const key = slotKey.toUpperCase();
  if (key.startsWith('LO') || key.startsWith('PO')) {
    return 'defense';
  }
  if (key.startsWith('LK') || key.startsWith('PK')) {
    return 'wing';
  }
  if (key.startsWith('C')) {
    return 'center';
  }
  return null;
}

/**
 * Extracts all field positions assigned in a Lineup object.
 * Used when saving a lineup to automatically update player positions in Firestore.
 */
export function extractPositionsFromLineup(
  lineup: Record<string, any> | null | undefined
): Array<{ userId: string; playerName: string; fieldPosition: FieldPosition }> {
  if (!lineup) return [];
  const results: Array<{ userId: string; playerName: string; fieldPosition: FieldPosition }> = [];

  for (const [slotKey, slotPlayer] of Object.entries(lineup)) {
    if (!slotPlayer || typeof slotPlayer !== 'object') continue;
    const fieldPos = mapLineupSlotToFieldPosition(slotKey);
    if (!fieldPos) continue;
    if (slotPlayer.id && !String(slotPlayer.id).startsWith('skater-')) {
      results.push({
        userId: String(slotPlayer.id),
        playerName: String(slotPlayer.name || ''),
        fieldPosition: fieldPos,
      });
    }
  }

  return results;
}

/**
 * Hybrid position resolver:
 * 1. Goalie / Member check
 * 2. Scans all matches with `lineup` to count appearances on Defense (LO/PO), Wing (LK/PK), and Center (C)
 * 3. Uses explicit `user.fieldPosition` if present, or falls back to the most frequent lineup position
 */
export function resolvePlayerPosition(
  player: {
    id?: string;
    name?: string;
    playerType?: 'player' | 'goalie' | 'member';
    fieldPosition?: FieldPosition | null;
  } | null | undefined,
  matches: Match[] = []
): PlayerPositionBreakdown {
  if (!player) {
    return {
      resolvedPosition: 'player',
      meta: POSITION_METADATA.player,
      defenseCount: 0,
      wingCount: 0,
      centerCount: 0,
      totalLineupAppearances: 0,
      isAutoDetected: false,
    };
  }

  if (player.playerType === 'goalie' || isGoaliePlayer(player)) {
    return {
      resolvedPosition: 'goalie',
      meta: POSITION_METADATA.goalie,
      defenseCount: 0,
      wingCount: 0,
      centerCount: 0,
      totalLineupAppearances: 0,
      isAutoDetected: false,
    };
  }

  if (player.playerType === 'member') {
    return {
      resolvedPosition: 'member',
      meta: POSITION_METADATA.member,
      defenseCount: 0,
      wingCount: 0,
      centerCount: 0,
      totalLineupAppearances: 0,
      isAutoDetected: false,
    };
  }

  let defenseCount = 0;
  let wingCount = 0;
  let centerCount = 0;

  for (const m of matches) {
    if (!isMatchLineupArchived(m)) continue;
    if (!m.lineup || typeof m.lineup !== 'object') continue;
    for (const [slotKey, slotPlayer] of Object.entries(m.lineup)) {
      if (!slotPlayer || typeof slotPlayer !== 'object') continue;
      const pObj = slotPlayer as any;
      const isMatch =
        (player.id && pObj.id === player.id) ||
        (player.name && pObj.name && areNamesMatching(player.name, pObj.name));

      if (!isMatch) continue;
      const fieldPos = mapLineupSlotToFieldPosition(slotKey);
      if (fieldPos === 'defense') defenseCount++;
      else if (fieldPos === 'wing') wingCount++;
      else if (fieldPos === 'center') centerCount++;
    }
  }

  const totalLineupAppearances = defenseCount + wingCount + centerCount;

  // Rank positions by appearances
  const counts: Array<{ pos: FieldPosition; count: number }> = [
    { pos: 'defense' as FieldPosition, count: defenseCount },
    { pos: 'center' as FieldPosition, count: centerCount },
    { pos: 'wing' as FieldPosition, count: wingCount },
  ].sort((a, b) => b.count - a.count);

  let resolvedPosition: ResolvedPosition = 'player';
  let isAutoDetected = false;

  if (player.fieldPosition && ['defense', 'wing', 'center'].includes(player.fieldPosition)) {
    resolvedPosition = player.fieldPosition;
    isAutoDetected = false;
  } else if (counts[0].count > 0) {
    resolvedPosition = counts[0].pos;
    isAutoDetected = true;
  }

  const secondaryCandidate = counts.find((c) => c.pos !== resolvedPosition && c.count > 0);

  return {
    resolvedPosition,
    meta: POSITION_METADATA[resolvedPosition],
    defenseCount,
    wingCount,
    centerCount,
    totalLineupAppearances,
    isAutoDetected,
    secondaryPosition: secondaryCandidate ? secondaryCandidate.pos : null,
  };
}

/**
 * Checks whether a player played as a Defenseman (LO/PO) in a specific match.
 * Strictly requires the match to be from 25. 10. 2026 onwards with a verified lineup entry in LO/PO.
 */
export function didPlayerPlayDefenseInMatch(
  player: { id: string; name: string; fieldPosition?: FieldPosition | null; playerType?: any },
  match: Match,
  _fallbackPrimaryPos?: ResolvedPosition
): boolean {
  if (!isMatchLineupArchived(match)) return false;
  if (!match.lineup || typeof match.lineup !== 'object') return false;

  for (const [slotKey, slotPlayer] of Object.entries(match.lineup)) {
    if (!slotPlayer || typeof slotPlayer !== 'object') continue;
    const pObj = slotPlayer as any;
    if (pObj.id === player.id || (pObj.name && areNamesMatching(player.name, pObj.name))) {
      return mapLineupSlotToFieldPosition(slotKey) === 'defense';
    }
  }
  return false;
}

/**
 * Checks whether a player played as a Center (C) in a specific match.
 * Strictly requires the match to be from 25. 10. 2026 onwards with a verified lineup entry in C.
 */
export function didPlayerPlayCenterInMatch(
  player: { id: string; name: string; fieldPosition?: FieldPosition | null; playerType?: any },
  match: Match,
  _fallbackPrimaryPos?: ResolvedPosition
): boolean {
  if (!isMatchLineupArchived(match)) return false;
  if (!match.lineup || typeof match.lineup !== 'object') return false;

  for (const [slotKey, slotPlayer] of Object.entries(match.lineup)) {
    if (!slotPlayer || typeof slotPlayer !== 'object') continue;
    const pObj = slotPlayer as any;
    if (pObj.id === player.id || (pObj.name && areNamesMatching(player.name, pObj.name))) {
      return mapLineupSlotToFieldPosition(slotKey) === 'center';
    }
  }
  return false;
}

/**
 * Checks whether a player played as a Wing (LK/PK) in a specific match.
 * Strictly requires the match to be from 25. 10. 2026 onwards with a verified lineup entry in LK/PK.
 */
export function didPlayerPlayWingInMatch(
  player: { id: string; name: string; fieldPosition?: FieldPosition | null; playerType?: any },
  match: Match,
  _fallbackPrimaryPos?: ResolvedPosition
): boolean {
  if (!isMatchLineupArchived(match)) return false;
  if (!match.lineup || typeof match.lineup !== 'object') return false;

  for (const [slotKey, slotPlayer] of Object.entries(match.lineup)) {
    if (!slotPlayer || typeof slotPlayer !== 'object') continue;
    const pObj = slotPlayer as any;
    if (pObj.id === player.id || (pObj.name && areNamesMatching(player.name, pObj.name))) {
      return mapLineupSlotToFieldPosition(slotKey) === 'wing';
    }
  }
  return false;
}
