import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Vrátí kanonické celé jméno hráče (např. převod přezdívky 'Toncek' na 'Antonín Bednář').
 */
export function getCanonicalPlayerName(name?: string | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  const normalized = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized === 'toncek' || normalized.includes('toncek')) {
    return 'Antonín Bednář';
  }
  return trimmed;
}

export function formatName(name?: string | null): string {
  if (!name) return '';
  const canonical = getCanonicalPlayerName(name);
  const parts = canonical.trim().split(/\s+/);
  if (parts.length < 2) return canonical;
  return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
}

/**
 * Checks if a player or attendee is a goalie in HC Aces.
 * Explicitly identifies Pavel Bara and Miroslav Lacko as goalies
 * even if their user profile playerType is not yet set.
 */
export function isGoaliePlayer(player?: { name?: string | null; playerType?: string | null } | null): boolean {
  if (!player) return false;
  if (player.playerType === 'goalie') return true;
  const n = (player.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!n) return false;
  // Match Pavel Bara
  if (n.includes('bara') && (n.includes('pavel') || n === 'bara')) return true;
  // Match Miroslav Lacko / Míra Lacko
  if (n.includes('lacko') && (n.includes('miroslav') || n.includes('mira') || n === 'lacko')) return true;
  return false;
}

/**
 * Matches two Czech player names flexibly (case-insensitive, diacritics-insensitive, by surname).
 */
export function areNamesMatching(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const a = clean(getCanonicalPlayerName(nameA));
  const b = clean(getCanonicalPlayerName(nameB));
  if (a === b) return true;
  const partsA = a.split(/\s+/).filter(Boolean);
  const partsB = b.split(/\s+/).filter(Boolean);
  return partsA.some((p) => p.length >= 3 && partsB.includes(p));
}
