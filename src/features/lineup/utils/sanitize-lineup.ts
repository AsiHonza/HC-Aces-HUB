import { Lineup, Player } from '../types';

/**
 * Sanitizes a single player object for Firestore storage:
 * - Ensures no `undefined` properties exist (replaces with null or safe defaults).
 * - Preserves standard fields required by Lineup displays.
 */
export function sanitizePlayer(player: Player | null | undefined): Player | null {
  if (!player || !player.id) return null;

  const sanitized: Player = {
    id: String(player.id),
    name: String(player.name || ''),
    email: String(player.email || ''),
    photoURL: player.photoURL ? String(player.photoURL) : null,
    playerType: (player.playerType as 'player' | 'goalie' | 'member') || 'player',
    fieldPosition: (player.fieldPosition as 'defense' | 'wing' | 'center') || null,
    role: (player.role as 'admin' | 'classic') || 'classic',
  };

  if (player.jerseyNumber != null) {
    sanitized.jerseyNumber = Number(player.jerseyNumber);
  }

  return sanitized;
}

/**
 * Sanitizes the complete Lineup object before persisting to Firestore.
 * Eliminates all `undefined` values and ensures all slots exist with either clean Player or null.
 */
export function sanitizeLineup(lineup: Partial<Lineup> | null | undefined): Lineup {
  const keys: (keyof Lineup)[] = [
    'LK1', 'C1', 'PK1',
    'LO1', 'PO1',
    'LK2', 'C2', 'PK2',
    'LO2', 'PO2',
    'LK3', 'C3', 'PK3',
    'B1',
  ];

  const result: any = {};
  for (const key of keys) {
    const p = lineup ? lineup[key] : null;
    result[key] = sanitizePlayer(p);
  }

  return result as Lineup;
}
