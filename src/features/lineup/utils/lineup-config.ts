import { Lineup, FormationRowConfig } from '../types';

export const initialLineup: Lineup = {
  LK1: null, C1: null, PK1: null,
  LO1: null, PO1: null,
  LK2: null, C2: null, PK2: null,
  LO2: null, PO2: null,
  LK3: null, C3: null, PK3: null,
  B1: null,
};

export const positionNames: Record<keyof Lineup, { full: string; short: string; line: string }> = {
  LK1: { full: "Levé křídlo (1. lajna)", short: "LW", line: "1. Útok" },
  C1:  { full: "Centr (1. lajna)", short: "C", line: "1. Útok" },
  PK1: { full: "Pravé křídlo (1. lajna)", short: "RW", line: "1. Útok" },
  LO1: { full: "Levý obránce (1. obrana)", short: "LD", line: "1. Obrana" },
  PO1: { full: "Pravý obránce (1. obrana)", short: "RD", line: "1. Obrana" },
  LK2: { full: "Levé křídlo (2. lajna)", short: "LW", line: "2. Útok" },
  C2:  { full: "Centr (2. lajna)", short: "C", line: "2. Útok" },
  PK2: { full: "Pravé křídlo (2. lajna)", short: "RW", line: "2. Útok" },
  LO2: { full: "Levý obránce (2. obrana)", short: "LD", line: "2. Obrana" },
  PO2: { full: "Pravý obránce (2. obrana)", short: "RD", line: "2. Obrana" },
  LK3: { full: "Levé křídlo (3. lajna)", short: "LW", line: "3. Útok" },
  C3:  { full: "Centr (3. lajna)", short: "C", line: "3. Útok" },
  PK3: { full: "Pravé křídlo (3. lajna)", short: "RW", line: "3. Útok" },
  B1:  { full: "Brankář", short: "G", line: "Brankář" },
};

export const FORMATION_CONFIGS: FormationRowConfig[] = [
  {
    id: 'attack-1',
    title: '1. Útok',
    lineType: 'attack',
    slots: [
      { key: 'LK1', roleName: 'Levé křídlo', roleShort: 'LW' },
      { key: 'C1', roleName: 'Centr', roleShort: 'C' },
      { key: 'PK1', roleName: 'Pravé křídlo', roleShort: 'RW' },
    ],
  },
  {
    id: 'defense-1',
    title: '1. Obrana',
    lineType: 'defense',
    slots: [
      { key: 'LO1', roleName: 'Levý obránce', roleShort: 'LD' },
      { key: 'PO1', roleName: 'Pravý obránce', roleShort: 'RD' },
    ],
  },
  {
    id: 'attack-2',
    title: '2. Útok',
    lineType: 'attack',
    slots: [
      { key: 'LK2', roleName: 'Levé křídlo', roleShort: 'LW' },
      { key: 'C2', roleName: 'Centr', roleShort: 'C' },
      { key: 'PK2', roleName: 'Pravé křídlo', roleShort: 'RW' },
    ],
  },
  {
    id: 'defense-2',
    title: '2. Obrana',
    lineType: 'defense',
    slots: [
      { key: 'LO2', roleName: 'Levý obránce', roleShort: 'LD' },
      { key: 'PO2', roleName: 'Pravý obránce', roleShort: 'RD' },
    ],
  },
  {
    id: 'attack-3',
    title: '3. Útok',
    lineType: 'attack',
    slots: [
      { key: 'LK3', roleName: 'Levé křídlo', roleShort: 'LW' },
      { key: 'C3', roleName: 'Centr', roleShort: 'C' },
      { key: 'PK3', roleName: 'Pravé křídlo', roleShort: 'RW' },
    ],
  },
  {
    id: 'goalie',
    title: 'Brankář',
    lineType: 'goalie',
    slots: [
      { key: 'B1', roleName: 'Brankář', roleShort: 'G' },
    ],
  },
];

export function getPlayersInLineup(lineup: Lineup): string[] {
  return Object.values(lineup).filter(p => p !== null).map(p => p!.id);
}

export function formatLineupClipboardText(lineup: Lineup): string {
  const hasThirdLine = !!(lineup.LK3 || lineup.C3 || lineup.PK3);
  const lines: string[] = ['HC ACES BRNO – SESTAVA NA ZÁPAS', '──────────────────────────────'];

  const formatSlot = (key: keyof Lineup) => {
    const p = lineup[key];
    const pos = positionNames[key].short;
    if (!p) return `[${pos}: volno]`;
    return `#${p.jerseyNumber ?? '–'} ${p.name} (${pos})`;
  };

  lines.push(`1. Útok: ${formatSlot('LK1')} – ${formatSlot('C1')} – ${formatSlot('PK1')}`);
  lines.push(`1. Obrana: ${formatSlot('LO1')} – ${formatSlot('PO1')}`);
  lines.push(`2. Útok: ${formatSlot('LK2')} – ${formatSlot('C2')} – ${formatSlot('PK2')}`);
  lines.push(`2. Obrana: ${formatSlot('LO2')} – ${formatSlot('PO2')}`);

  if (hasThirdLine) {
    lines.push(`3. Útok: ${formatSlot('LK3')} – ${formatSlot('C3')} – ${formatSlot('PK3')}`);
  }

  lines.push(`Brankář: ${formatSlot('B1')}`);
  lines.push('──────────────────────────────');

  return lines.join('\n');
}
