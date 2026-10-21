import type { Match, UserProfile, ResolvedPosition } from '@/types';
import { areNamesMatching } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';
import { resolvePlayerPosition } from '@/features/roster/utils/positions';

export interface ChemistryPartnerStat {
  partnerId: string;
  partnerName: string;
  partnerJersey?: number | null;
  partnerPhoto?: string | null;
  count: number;
  sharePct: number;
}

export interface WinRatePartnerStat {
  partnerId: string;
  partnerName: string;
  partnerJersey?: number | null;
  partnerPhoto?: string | null;
  gamesTogether: number;
  winsTogether: number;
  winRatePct: number;
}

export interface PlayerChemistrySummary {
  playerId: string;
  totalGoalsScored: number;
  totalAssistsGiven: number;
  /** Kdo hráči nejčastěji nahrává na gól */
  favoritePlaymaker: ChemistryPartnerStat | null;
  /** Komu hráč nejčastěji nahrává na gól */
  favoriteTarget: ChemistryPartnerStat | null;
  /** Spoluhráč s nejvyšším společným % výher (min. 3 společné zápasy ve stejné formaci) */
  bestTalismanPartner: WinRatePartnerStat | null;
  /** Celkový přehled spoluprací pro případné porovnání v lajně */
  duoGoalsByPartnerId: Record<string, number>;
}

export interface DuoGoalEvent {
  id: string;
  matchId: string;
  matchDateMs: number;
  matchDateStr: string;
  opponent: string;
  acesScore: number;
  oppScore: number;
  isWin: boolean;
  isTie: boolean;
  isPlayoff: boolean;
  playoffStage?: string | null;
  scorerId: string;
  scorerName: string;
  scorerJersey?: number | null;
  assisterId: string;
  assisterName: string;
  assisterJersey?: number | null;
  minute?: number | null;
  scoreAfterGoal?: string | null;
  acesGoalNumber: number;
  isGwg: boolean;
  isOpeningGoal: boolean;
  isGoAheadGoal: boolean;
  isTyingGoal: boolean;
  formationInMatch?: string | null;
}

export interface DuoSharedMatch {
  matchId: string;
  matchDateMs: number;
  matchDateStr: string;
  opponent: string;
  acesScore: number;
  oppScore: number;
  isWin: boolean;
  isTie: boolean;
  isPlayoff: boolean;
  duoGoalsInMatch: number;
  p1Goals: number;
  p1Assists: number;
  p2Goals: number;
  p2Assists: number;
  formationInMatch?: string | null;
}

export interface DynamicDuoRecord {
  duoKey: string;
  unitType: 'attack' | 'defense';
  formationLabel: string;
  isVerifiedLineupPair: boolean;
  sameUnitGames: number;
  player1Id: string;
  player1Name: string;
  player1Jersey?: number | null;
  player1Photo?: string | null;
  player1Position: ResolvedPosition;
  player1PosShort: string;
  player2Id: string;
  player2Name: string;
  player2Jersey?: number | null;
  player2Photo?: string | null;
  player2Position: ResolvedPosition;
  player2PosShort: string;
  totalCombinedGoals: number;
  p1GoalsFromP2: number;
  p2GoalsFromP1: number;
  gamesTogether: number;
  winsTogether: number;
  lossesTogether: number;
  tiesTogether: number;
  winRatePct: number;
  matchesWithDuoGoal: number;
  winsWhenScoringTogether: number;
  winRateWhenScoringPct: number;
  maxDuoGoalsInSingleMatch: number;
  gwgCount: number;
  openingGoalCount: number;
  favoriteOpponent: { name: string; goals: number } | null;
  combinedPointsInSharedGames: number;
  p1GoalsInShared: number;
  p1AssistsInShared: number;
  p2GoalsInShared: number;
  p2AssistsInShared: number;
  /** Defenzivní metriky pro obranné páry i útočné lajny */
  lockdownGamesTogether: number;
  shutoutsTogether: number;
  avgGoalsAgainstTogether: number;
  goalEvents: DuoGoalEvent[];
  sharedMatches: DuoSharedMatch[];
}

export interface TeamChemistryData {
  /** Nejlepší útočné dvojice (v rámci útočných trojic LK–C–PK) */
  topDuos: DynamicDuoRecord[];
  /** Nejlepší obranné páry (v rámci obranných dvojic LO–PO) */
  topDefensePairs: DynamicDuoRecord[];
  byPlayerId: Map<string, PlayerChemistrySummary>;
}

function resolveUser(
  rawIdentifier: string | null | undefined,
  users: UserProfile[],
  usersById: Map<string, UserProfile>
): UserProfile | null {
  if (!rawIdentifier || rawIdentifier === 'none') return null;
  const trimmed = rawIdentifier.trim();
  if (!trimmed) return null;
  const byId = usersById.get(trimmed);
  if (byId) return byId;
  return users.find((u) => areNamesMatching(u.name, trimmed)) || null;
}

interface ExtractedFormationUnit {
  unitId: 'attack-1' | 'attack-2' | 'attack-3' | 'defense-1' | 'defense-2';
  unitTitle: '1. útok' | '2. útok' | '3. útok' | '1. obrana' | '2. obrana';
  unitType: 'attack' | 'defense';
  players: UserProfile[];
}

const FORMATION_UNIT_DEFS: Array<{
  unitId: ExtractedFormationUnit['unitId'];
  unitTitle: ExtractedFormationUnit['unitTitle'];
  unitType: ExtractedFormationUnit['unitType'];
  slotKeys: string[];
}> = [
  { unitId: 'attack-1', unitTitle: '1. útok', unitType: 'attack', slotKeys: ['LK1', 'C1', 'PK1'] },
  { unitId: 'attack-2', unitTitle: '2. útok', unitType: 'attack', slotKeys: ['LK2', 'C2', 'PK2'] },
  { unitId: 'attack-3', unitTitle: '3. útok', unitType: 'attack', slotKeys: ['LK3', 'C3', 'PK3'] },
  { unitId: 'defense-1', unitTitle: '1. obrana', unitType: 'defense', slotKeys: ['LO1', 'PO1'] },
  { unitId: 'defense-2', unitTitle: '2. obrana', unitType: 'defense', slotKeys: ['LO2', 'PO2'] },
];

/**
 * Extracts formation units (útočné trojice LK-C-PK a obranné páry LO-PO) from a match lineup.
 */
function extractMatchFormationUnits(
  match: Match,
  users: UserProfile[],
  usersById: Map<string, UserProfile>
): ExtractedFormationUnit[] {
  if (!match.lineup || typeof match.lineup !== 'object') return [];
  const lineupObj = match.lineup as Record<string, any>;
  const units: ExtractedFormationUnit[] = [];

  for (const def of FORMATION_UNIT_DEFS) {
    const unitPlayersMap = new Map<string, UserProfile>();
    for (const key of def.slotKeys) {
      const slotVal = lineupObj[key];
      if (slotVal && typeof slotVal === 'object') {
        const u =
          resolveUser(slotVal.id, users, usersById) ||
          resolveUser(slotVal.name, users, usersById);
        if (u) {
          unitPlayersMap.set(u.id, u);
        }
      }
    }
    const players = Array.from(unitPlayersMap.values());
    if (players.length >= 2) {
      units.push({
        unitId: def.unitId,
        unitTitle: def.unitTitle,
        unitType: def.unitType,
        players,
      });
    }
  }

  return units;
}

function getMatchAcesPlayers(
  match: Match,
  users: UserProfile[],
  usersById: Map<string, UserProfile>
): UserProfile[] {
  const foundMap = new Map<string, UserProfile>();

  if (match.lineup && typeof match.lineup === 'object') {
    for (const val of Object.values(match.lineup)) {
      if (val && typeof val === 'object' && (val as any).id) {
        const u = resolveUser((val as any).id, users, usersById) || resolveUser((val as any).name, users, usersById);
        if (u) foundMap.set(u.id, u);
      }
    }
  }

  if (Array.isArray(match.gameRoster)) {
    for (const rawName of match.gameRoster) {
      const u = resolveUser(rawName, users, usersById);
      if (u) foundMap.set(u.id, u);
    }
  }

  if (match.goalieId) {
    const g = resolveUser(match.goalieId, users, usersById);
    if (g) foundMap.set(g.id, g);
  } else if (match.goalieName) {
    const g = resolveUser(match.goalieName, users, usersById);
    if (g) foundMap.set(g.id, g);
  }

  if (Array.isArray(match.scorers)) {
    for (const s of match.scorers) {
      if (s?.goal) {
        const u = resolveUser(s.goal, users, usersById);
        if (u) foundMap.set(u.id, u);
      }
      if (s?.assist) {
        const u = resolveUser(s.assist, users, usersById);
        if (u) foundMap.set(u.id, u);
      }
    }
  }
  if (Array.isArray(match.detailedScorers)) {
    const isAcesTeam1 = /aces/i.test(match.team1 || '');
    for (const ds of match.detailedScorers) {
      const isAcesGoal =
        (isAcesTeam1 && ds.team === 'team1') ||
        (!isAcesTeam1 && ds.team === 'team2') ||
        /aces/i.test(ds.team || '');
      if (isAcesGoal) {
        if (ds?.scorer) {
          const u = resolveUser(ds.scorer, users, usersById);
          if (u) foundMap.set(u.id, u);
        }
        if (ds?.assist) {
          const u = resolveUser(ds.assist, users, usersById);
          if (u) foundMap.set(u.id, u);
        }
      }
    }
  }

  return Array.from(foundMap.values());
}

/**
 * Computes formation-aware on-ice chemistry:
 * - Pairs are logically formed ONLY within an attack trio (LK-C-PK) or a defense pair (LO-PO).
 * - Never mixes a Defenseman + Forward into a false duo unless explicitly placed in the same unit in a match lineup.
 * - Separates Attack Duos (topDuos) and Defense Pairs (topDefensePairs).
 */
export function calculateTeamChemistry(
  matches: Match[] = [],
  users: UserProfile[] = []
): TeamChemistryData {
  const usersById = new Map<string, UserProfile>(users.map((u) => [u.id, u]));

  // 0. Resolve positions for all users
  const posByUserId = new Map<
    string,
    { resolvedPosition: ResolvedPosition; shortLabel: string; explicitFieldPos?: string | null }
  >();
  for (const u of users) {
    const info = resolvePlayerPosition(u, matches);
    posByUserId.set(u.id, {
      resolvedPosition: info.resolvedPosition,
      shortLabel: info.meta.shortLabel,
      explicitFieldPos: u.fieldPosition || null,
    });
  }

  // 1. Scan ALL matches (played and upcoming) that have a saved lineup to learn formation unit pairings
  // pairKey -> { sameUnitCount, diffUnitCount, lastUnitTitle, lastUnitType }
  const lineupPairStats = new Map<
    string,
    {
      sameUnitCount: number;
      diffUnitCount: number;
      lastUnitTitle: string;
      lastUnitType: 'attack' | 'defense';
    }
  >();

  const allMatchesSortedAsc = [...matches].sort((a, b) => {
    const da = toJsDate(a.dateTime || a.date)?.getTime() || 0;
    const db = toJsDate(b.dateTime || b.date)?.getTime() || 0;
    return da - db;
  });

  for (const m of allMatchesSortedAsc) {
    const units = extractMatchFormationUnits(m, users, usersById);
    if (units.length === 0) continue;

    // Map each player in this lineup to their unitId
    const playerToUnit = new Map<string, ExtractedFormationUnit>();
    for (const unit of units) {
      for (const p of unit.players) {
        playerToUnit.set(p.id, unit);
      }
    }

    const lineupPlayers = Array.from(playerToUnit.keys());
    for (let i = 0; i < lineupPlayers.length; i++) {
      for (let j = i + 1; j < lineupPlayers.length; j++) {
        const pA = lineupPlayers[i];
        const pB = lineupPlayers[j];
        const [id1, id2] = pA < pB ? [pA, pB] : [pB, pA];
        const key = `${id1}:${id2}`;
        const uA = playerToUnit.get(pA)!;
        const uB = playerToUnit.get(pB)!;

        const cur = lineupPairStats.get(key) || {
          sameUnitCount: 0,
          diffUnitCount: 0,
          lastUnitTitle: uA.unitTitle,
          lastUnitType: uA.unitType,
        };

        if (uA.unitId === uB.unitId) {
          cur.sameUnitCount += 1;
          cur.lastUnitTitle = uA.unitTitle;
          cur.lastUnitType = uA.unitType;
        } else {
          cur.diffUnitCount += 1;
        }
        lineupPairStats.set(key, cur);
      }
    }
  }

  /**
   * Determines whether two players can logically form a unit duo (either in an attack trio LK-C-PK or defense pair LO-PO).
   * Returns null if they belong to incompatible units (e.g. Defenseman + Forward, or always separated in different lines).
   */
  const classifyLogicalPair = (
    id1: string,
    id2: string
  ): {
    unitType: 'attack' | 'defense';
    formationLabel: string;
    isVerifiedLineupPair: boolean;
    sameUnitGames: number;
  } | null => {
    if (id1 === id2) return null;
    const p1Pos = posByUserId.get(id1);
    const p2Pos = posByUserId.get(id2);
    if (!p1Pos || !p2Pos) return null;

    // Goalies and non-playing members never form field duos
    if (
      p1Pos.resolvedPosition === 'goalie' ||
      p1Pos.resolvedPosition === 'member' ||
      p2Pos.resolvedPosition === 'goalie' ||
      p2Pos.resolvedPosition === 'member'
    ) {
      return null;
    }

    const [firstId, secondId] = id1 < id2 ? [id1, id2] : [id2, id1];
    const key = `${firstId}:${secondId}`;
    const lStat = lineupPairStats.get(key);

    // 1. If they have explicitly played in the SAME formation unit in a saved lineup:
    if (lStat && lStat.sameUnitCount > 0) {
      return {
        unitType: lStat.lastUnitType,
        formationLabel: lStat.lastUnitTitle,
        isVerifiedLineupPair: true,
        sameUnitGames: lStat.sameUnitCount,
      };
    }

    // 2. If they have appeared together in saved lineups, but ONLY in DIFFERENT units (never in the same line/pair):
    if (lStat && lStat.diffUnitCount > 0 && lStat.sameUnitCount === 0) {
      return null;
    }

    // 3. Position-based unit compatibility (when not yet separated by a saved lineup):
    const isP1Def = p1Pos.resolvedPosition === 'defense';
    const isP2Def = p2Pos.resolvedPosition === 'defense';

    // Defense + Forward cannot be in the same attack trio or defense pair!
    if (isP1Def !== isP2Def) {
      return null;
    }

    // Both are Defensemen -> Obranný pár (LO + PO)
    if (isP1Def && isP2Def) {
      return {
        unitType: 'defense',
        formationLabel: 'Obranný pár (LO + PO)',
        isVerifiedLineupPair: false,
        sameUnitGames: 0,
      };
    }

    // Both are Forwards -> check that they aren't two locked Centers (since a trio has only 1 C and 2 Wings)
    if (p1Pos.explicitFieldPos === 'center' && p2Pos.explicitFieldPos === 'center') {
      return null;
    }

    const hasCenter =
      p1Pos.resolvedPosition === 'center' || p2Pos.resolvedPosition === 'center';
    return {
      unitType: 'attack',
      formationLabel: hasCenter ? 'Útočná lajna (C + KŘÍ)' : 'Útočná lajna (KŘÍ + KŘÍ)',
      isVerifiedLineupPair: false,
      sameUnitGames: 0,
    };
  };

  // Directed maps for individual player summaries (all goals/assists)
  const individualAssistedByMap = new Map<string, Map<string, number>>();
  const individualAssistedToMap = new Map<string, Map<string, number>>();
  const goalsCountByPlayer = new Map<string, number>();
  const assistsCountByPlayer = new Map<string, number>();

  // Formation-filtered directed maps (only between compatible unit partners)
  const unitAssistedByMap = new Map<string, Map<string, number>>();

  // Pair co-appearances within compatible units:
  // "idA:idB" -> { games, wins, losses, ties, lockdownGames, shutouts, totalOppGoals }
  const pairGamesMap = new Map<
    string,
    {
      games: number;
      wins: number;
      losses: number;
      ties: number;
      lockdownGames: number;
      shutouts: number;
      totalOppGoals: number;
    }
  >();

  const duoEventsMap = new Map<string, DuoGoalEvent[]>();
  const duoSharedMatchesMap = new Map<string, DuoSharedMatch[]>();

  const playedMatches = allMatchesSortedAsc.filter((m) => m.isPlayed);

  for (const match of playedMatches) {
    const isAcesTeam1 = /aces/i.test(match.team1 || '');
    const acesScore = isAcesTeam1 ? Number(match.team1Score ?? 0) : Number(match.team2Score ?? 0);
    const oppScore = isAcesTeam1 ? Number(match.team2Score ?? 0) : Number(match.team1Score ?? 0);
    const isWin = acesScore > oppScore;
    const isTie = acesScore === oppScore;
    const opponent = (isAcesTeam1 ? match.team2 : match.team1) || match.opponent || 'Soupeř';
    const isPlayoff = match.type === 'playoff' || match.matchType === 'playoff';
    const matchDateObj = toJsDate(match.dateTime || match.date);
    const matchDateMs = matchDateObj ? matchDateObj.getTime() : 0;
    const matchDateStr = matchDateObj
      ? matchDateObj.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
      : '';

    // Check if this match has explicit formation units in match.lineup
    const matchUnits = extractMatchFormationUnits(match, users, usersById);
    const hasMatchLineupUnits = matchUnits.length > 0;

    // Map "id1:id2" -> unitTitle for this specific match if lineup is present
    const matchSameUnitPairs = new Map<string, string>();
    if (hasMatchLineupUnits) {
      for (const unit of matchUnits) {
        for (let i = 0; i < unit.players.length; i++) {
          for (let j = i + 1; j < unit.players.length; j++) {
            const pA = unit.players[i].id;
            const pB = unit.players[j].id;
            const [id1, id2] = pA < pB ? [pA, pB] : [pB, pA];
            matchSameUnitPairs.set(`${id1}:${id2}`, unit.unitTitle);
          }
        }
      }
    }

    // Helper: were two players in the same logical unit in THIS match?
    const arePlayersTogetherInThisMatch = (
      idA: string,
      idB: string
    ): { together: boolean; formationInMatch: string | null } => {
      const [id1, id2] = idA < idB ? [idA, idB] : [idB, idA];
      const key = `${id1}:${id2}`;
      if (hasMatchLineupUnits) {
        const unitTitle = matchSameUnitPairs.get(key);
        return { together: Boolean(unitTitle), formationInMatch: unitTitle || null };
      }
      const classification = classifyLogicalPair(id1, id2);
      if (!classification) return { together: false, formationInMatch: null };
      return { together: true, formationInMatch: classification.formationLabel };
    };

    // 1. Parse Goal + Assist events with situational context
    interface ParsedMatchGoal {
      scorerUser: UserProfile | null;
      assistUser: UserProfile | null;
      minute: number | null;
      scoreAfterGoal: string | null;
      acesGoalNumber: number;
      isGwg: boolean;
      isOpeningGoal: boolean;
      isGoAheadGoal: boolean;
      isTyingGoal: boolean;
    }

    const parsedGoals: ParsedMatchGoal[] = [];

    const detailedList = Array.isArray(match.detailedScorers) ? match.detailedScorers : [];
    const acesDetailedCount = detailedList.filter((ds) => {
      return (
        ds &&
        ((isAcesTeam1 && ds.team === 'team1') ||
          (!isAcesTeam1 && ds.team === 'team2') ||
          /aces/i.test(ds.team || ''))
      );
    }).length;

    if (acesDetailedCount > 0) {
      const sortedDetailed = [...detailedList].sort((a, b) => Number(a?.minute || 0) - Number(b?.minute || 0));
      let runningAces = 0;
      let runningOpp = 0;

      for (const ds of sortedDetailed) {
        if (!ds) continue;
        const isAcesGoal =
          (isAcesTeam1 && ds.team === 'team1') ||
          (!isAcesTeam1 && ds.team === 'team2') ||
          /aces/i.test(ds.team || '');

        if (!isAcesGoal) {
          runningOpp += 1;
          continue;
        }

        const prevAces = runningAces;
        const prevOpp = runningOpp;
        runningAces += 1;

        const scorerUser = resolveUser(ds.scorer, users, usersById);
        const assistUser = resolveUser(ds.assist, users, usersById);

        parsedGoals.push({
          scorerUser,
          assistUser,
          minute: ds.minute != null && Number(ds.minute) > 0 ? Number(ds.minute) : null,
          scoreAfterGoal: `${runningAces}:${runningOpp}`,
          acesGoalNumber: runningAces,
          isGwg: isWin && runningAces === oppScore + 1,
          isOpeningGoal: runningAces === 1 && runningOpp === 0,
          isGoAheadGoal: prevAces <= prevOpp && runningAces === runningOpp + 1,
          isTyingGoal: prevAces < prevOpp && runningAces === runningOpp,
        });
      }
    } else if (Array.isArray(match.scorers) && match.scorers.length > 0) {
      let runningAces = 0;
      for (const s of match.scorers) {
        if (!s || !s.goal) continue;
        runningAces += 1;
        const scorerUser = resolveUser(s.goal, users, usersById);
        const assistUser = resolveUser(s.assist, users, usersById);

        parsedGoals.push({
          scorerUser,
          assistUser,
          minute: null,
          scoreAfterGoal: null,
          acesGoalNumber: runningAces,
          isGwg: isWin && runningAces === oppScore + 1,
          isOpeningGoal: runningAces === 1,
          isGoAheadGoal: false,
          isTyingGoal: false,
        });
      }
    }

    const matchPlayerGoals = new Map<string, number>();
    const matchPlayerAssists = new Map<string, number>();
    const matchDuoGoalsCount = new Map<string, number>();

    let eventIdx = 0;
    for (const pg of parsedGoals) {
      eventIdx += 1;
      const { scorerUser, assistUser } = pg;

      if (scorerUser) {
        goalsCountByPlayer.set(scorerUser.id, (goalsCountByPlayer.get(scorerUser.id) || 0) + 1);
        matchPlayerGoals.set(scorerUser.id, (matchPlayerGoals.get(scorerUser.id) || 0) + 1);
      }
      if (assistUser) {
        assistsCountByPlayer.set(assistUser.id, (assistsCountByPlayer.get(assistUser.id) || 0) + 1);
        matchPlayerAssists.set(assistUser.id, (matchPlayerAssists.get(assistUser.id) || 0) + 1);
      }

      if (scorerUser && assistUser && scorerUser.id !== assistUser.id) {
        // Always record individual passing stats for personal career card
        if (!individualAssistedByMap.has(scorerUser.id)) {
          individualAssistedByMap.set(scorerUser.id, new Map());
        }
        const sMap = individualAssistedByMap.get(scorerUser.id)!;
        sMap.set(assistUser.id, (sMap.get(assistUser.id) || 0) + 1);

        if (!individualAssistedToMap.has(assistUser.id)) {
          individualAssistedToMap.set(assistUser.id, new Map());
        }
        const aMap = individualAssistedToMap.get(assistUser.id)!;
        aMap.set(scorerUser.id, (aMap.get(scorerUser.id) || 0) + 1);

        // Check if this pair forms a valid logical unit duo in this match
        const unitCheck = arePlayersTogetherInThisMatch(scorerUser.id, assistUser.id);
        const pairClass = classifyLogicalPair(scorerUser.id, assistUser.id);

        if (unitCheck.together && pairClass) {
          if (!unitAssistedByMap.has(scorerUser.id)) {
            unitAssistedByMap.set(scorerUser.id, new Map());
          }
          const uMap = unitAssistedByMap.get(scorerUser.id)!;
          uMap.set(assistUser.id, (uMap.get(assistUser.id) || 0) + 1);

          const [id1, id2] =
            scorerUser.id < assistUser.id
              ? [scorerUser.id, assistUser.id]
              : [assistUser.id, scorerUser.id];
          const duoKey = `${id1}:${id2}`;

          matchDuoGoalsCount.set(duoKey, (matchDuoGoalsCount.get(duoKey) || 0) + 1);

          if (!duoEventsMap.has(duoKey)) {
            duoEventsMap.set(duoKey, []);
          }
          duoEventsMap.get(duoKey)!.push({
            id: `${match.id}-${eventIdx}`,
            matchId: match.id,
            matchDateMs,
            matchDateStr,
            opponent,
            acesScore,
            oppScore,
            isWin,
            isTie,
            isPlayoff,
            playoffStage: match.playoffStage || null,
            scorerId: scorerUser.id,
            scorerName: scorerUser.name,
            scorerJersey: scorerUser.jerseyNumber ?? null,
            assisterId: assistUser.id,
            assisterName: assistUser.name,
            assisterJersey: assistUser.jerseyNumber ?? null,
            minute: pg.minute,
            scoreAfterGoal: pg.scoreAfterGoal,
            acesGoalNumber: pg.acesGoalNumber,
            isGwg: pg.isGwg,
            isOpeningGoal: pg.isOpeningGoal,
            isGoAheadGoal: pg.isGoAheadGoal,
            isTyingGoal: pg.isTyingGoal,
            formationInMatch: unitCheck.formationInMatch,
          });
        }
      }
    }

    // 2. Co-appearance tracking (only for pairs that were together in the same logical unit in this match)
    const rosterUsers = getMatchAcesPlayers(match, users, usersById);
    for (let i = 0; i < rosterUsers.length; i++) {
      for (let j = i + 1; j < rosterUsers.length; j++) {
        const uA = rosterUsers[i];
        const uB = rosterUsers[j];
        const unitCheck = arePlayersTogetherInThisMatch(uA.id, uB.id);
        if (!unitCheck.together) continue;

        const [firstId, secondId] = uA.id < uB.id ? [uA.id, uB.id] : [uB.id, uA.id];
        const key = `${firstId}:${secondId}`;
        const cur = pairGamesMap.get(key) || {
          games: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          lockdownGames: 0,
          shutouts: 0,
          totalOppGoals: 0,
        };
        cur.games += 1;
        if (isWin) cur.wins += 1;
        else if (isTie) cur.ties += 1;
        else cur.losses += 1;

        if (oppScore <= 2) cur.lockdownGames += 1;
        if (isWin && oppScore === 0) cur.shutouts += 1;
        cur.totalOppGoals += oppScore;

        pairGamesMap.set(key, cur);

        if (!duoSharedMatchesMap.has(key)) {
          duoSharedMatchesMap.set(key, []);
        }
        duoSharedMatchesMap.get(key)!.push({
          matchId: match.id,
          matchDateMs,
          matchDateStr,
          opponent,
          acesScore,
          oppScore,
          isWin,
          isTie,
          isPlayoff,
          duoGoalsInMatch: matchDuoGoalsCount.get(key) || 0,
          p1Goals: matchPlayerGoals.get(firstId) || 0,
          p1Assists: matchPlayerAssists.get(firstId) || 0,
          p2Goals: matchPlayerGoals.get(secondId) || 0,
          p2Assists: matchPlayerAssists.get(secondId) || 0,
          formationInMatch: unitCheck.formationInMatch,
        });
      }
    }
  }

  // Helper to construct a full DynamicDuoRecord for a valid pair (id1 < id2)
  const buildDuoRecord = (id1: string, id2: string): DynamicDuoRecord | null => {
    const u1 = usersById.get(id1);
    const u2 = usersById.get(id2);
    if (!u1 || !u2) return null;

    const classification = classifyLogicalPair(id1, id2);
    if (!classification) return null;

    const duoKey = `${id1}:${id2}`;
    const p1Pos = posByUserId.get(id1)!;
    const p2Pos = posByUserId.get(id2)!;

    const p1GoalsFromP2 = unitAssistedByMap.get(id1)?.get(id2) || 0;
    const p2GoalsFromP1 = unitAssistedByMap.get(id2)?.get(id1) || 0;
    const totalCombinedGoals = p1GoalsFromP2 + p2GoalsFromP1;

    const pairGames = pairGamesMap.get(duoKey) || {
      games: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      lockdownGames: 0,
      shutouts: 0,
      totalOppGoals: 0,
    };

    const rawEvents = duoEventsMap.get(duoKey) || [];
    const rawSharedMatches = duoSharedMatchesMap.get(duoKey) || [];

    const sortedEventsDesc = [...rawEvents].sort((a, b) => b.matchDateMs - a.matchDateMs);
    const sortedSharedDesc = [...rawSharedMatches].sort((a, b) => b.matchDateMs - a.matchDateMs);

    const matchOutcomeByMatchId = new Map<string, { isWin: boolean; count: number; opponent: string }>();
    const opponentGoalsMap = new Map<string, number>();
    let gwgCount = 0;
    let openingGoalCount = 0;

    for (const ev of rawEvents) {
      if (ev.isGwg) gwgCount += 1;
      if (ev.isOpeningGoal) openingGoalCount += 1;
      opponentGoalsMap.set(ev.opponent, (opponentGoalsMap.get(ev.opponent) || 0) + 1);
      const prev = matchOutcomeByMatchId.get(ev.matchId) || {
        isWin: ev.isWin,
        count: 0,
        opponent: ev.opponent,
      };
      prev.count += 1;
      matchOutcomeByMatchId.set(ev.matchId, prev);
    }

    const matchesWithDuoGoal = matchOutcomeByMatchId.size;
    let winsWhenScoringTogether = 0;
    let maxDuoGoalsInSingleMatch = 0;
    for (const mStat of matchOutcomeByMatchId.values()) {
      if (mStat.isWin) winsWhenScoringTogether += 1;
      if (mStat.count > maxDuoGoalsInSingleMatch) maxDuoGoalsInSingleMatch = mStat.count;
    }
    const winRateWhenScoringPct =
      matchesWithDuoGoal > 0 ? Math.round((winsWhenScoringTogether / matchesWithDuoGoal) * 100) : 0;

    let favoriteOpponent: { name: string; goals: number } | null = null;
    if (opponentGoalsMap.size > 0) {
      const sortedOpps = Array.from(opponentGoalsMap.entries()).sort((a, b) => b[1] - a[1]);
      favoriteOpponent = { name: sortedOpps[0][0], goals: sortedOpps[0][1] };
    }

    let p1GoalsInShared = 0;
    let p1AssistsInShared = 0;
    let p2GoalsInShared = 0;
    let p2AssistsInShared = 0;
    for (const sm of rawSharedMatches) {
      p1GoalsInShared += sm.p1Goals;
      p1AssistsInShared += sm.p1Assists;
      p2GoalsInShared += sm.p2Goals;
      p2AssistsInShared += sm.p2Assists;
    }
    const combinedPointsInSharedGames =
      p1GoalsInShared + p1AssistsInShared + p2GoalsInShared + p2AssistsInShared;

    const avgGoalsAgainstTogether =
      pairGames.games > 0 ? Number((pairGames.totalOppGoals / pairGames.games).toFixed(1)) : 0;

    return {
      duoKey,
      unitType: classification.unitType,
      formationLabel: classification.formationLabel,
      isVerifiedLineupPair: classification.isVerifiedLineupPair,
      sameUnitGames: classification.sameUnitGames,
      player1Id: u1.id,
      player1Name: u1.name,
      player1Jersey: u1.jerseyNumber ?? null,
      player1Photo: u1.photoURL ?? null,
      player1Position: p1Pos.resolvedPosition,
      player1PosShort: p1Pos.shortLabel,
      player2Id: u2.id,
      player2Name: u2.name,
      player2Jersey: u2.jerseyNumber ?? null,
      player2Photo: u2.photoURL ?? null,
      player2Position: p2Pos.resolvedPosition,
      player2PosShort: p2Pos.shortLabel,
      totalCombinedGoals,
      p1GoalsFromP2,
      p2GoalsFromP1,
      gamesTogether: pairGames.games,
      winsTogether: pairGames.wins,
      lossesTogether: pairGames.losses,
      tiesTogether: pairGames.ties,
      winRatePct: pairGames.games > 0 ? Math.round((pairGames.wins / pairGames.games) * 100) : 0,
      matchesWithDuoGoal,
      winsWhenScoringTogether,
      winRateWhenScoringPct,
      maxDuoGoalsInSingleMatch,
      gwgCount,
      openingGoalCount,
      favoriteOpponent,
      combinedPointsInSharedGames,
      p1GoalsInShared,
      p1AssistsInShared,
      p2GoalsInShared,
      p2AssistsInShared,
      lockdownGamesTogether: pairGames.lockdownGames,
      shutoutsTogether: pairGames.shutouts,
      avgGoalsAgainstTogether,
      goalEvents: sortedEventsDesc,
      sharedMatches: sortedSharedDesc,
    };
  };

  // 3. Collect all candidate pairs (from unit goals, co-appearances, or saved lineups)
  const candidateKeys = new Set<string>();
  for (const key of pairGamesMap.keys()) candidateKeys.add(key);
  for (const key of lineupPairStats.keys()) candidateKeys.add(key);
  for (const [sId, aMap] of unitAssistedByMap.entries()) {
    for (const aId of aMap.keys()) {
      const [id1, id2] = sId < aId ? [sId, aId] : [aId, sId];
      candidateKeys.add(`${id1}:${id2}`);
    }
  }

  const attackDuosList: DynamicDuoRecord[] = [];
  const defensePairsList: DynamicDuoRecord[] = [];
  const duoMap = new Map<string, DynamicDuoRecord>();

  for (const key of candidateKeys) {
    const [id1, id2] = key.split(':');
    const rec = buildDuoRecord(id1, id2);
    if (!rec) continue;
    duoMap.set(key, rec);

    if (rec.unitType === 'attack') {
      // Attack duo must either have combined goals OR be an active lineup trio pair with shared games
      if (rec.totalCombinedGoals > 0 || (rec.isVerifiedLineupPair && rec.gamesTogether > 0)) {
        attackDuosList.push(rec);
      }
    } else if (rec.unitType === 'defense') {
      // Defense pair must have played together or be an active lineup defense pair
      if (rec.gamesTogether >= 2 || rec.isVerifiedLineupPair || rec.totalCombinedGoals > 0) {
        defensePairsList.push(rec);
      }
    }
  }

  // Sort Attack Duos:
  // 1. Verified lineup pairs with goals first, then totalCombinedGoals DESC, then combinedPoints DESC, then winRatePct DESC
  attackDuosList.sort((a, b) => {
    if (b.totalCombinedGoals !== a.totalCombinedGoals) {
      return b.totalCombinedGoals - a.totalCombinedGoals;
    }
    if (a.isVerifiedLineupPair !== b.isVerifiedLineupPair) {
      return a.isVerifiedLineupPair ? -1 : 1;
    }
    if (b.combinedPointsInSharedGames !== a.combinedPointsInSharedGames) {
      return b.combinedPointsInSharedGames - a.combinedPointsInSharedGames;
    }
    if (b.winRatePct !== a.winRatePct) {
      return b.winRatePct - a.winRatePct;
    }
    return b.gamesTogether - a.gamesTogether;
  });

  // Sort Defense Pairs:
  // 1. Verified lineup pairs first, then lockdownGamesTogether DESC, then totalCombinedGoals DESC, then combinedPointsInSharedGames DESC, then winRatePct DESC
  defensePairsList.sort((a, b) => {
    if (a.isVerifiedLineupPair !== b.isVerifiedLineupPair) {
      return a.isVerifiedLineupPair ? -1 : 1;
    }
    if (b.sameUnitGames !== a.sameUnitGames) {
      return b.sameUnitGames - a.sameUnitGames;
    }
    if (b.totalCombinedGoals !== a.totalCombinedGoals) {
      return b.totalCombinedGoals - a.totalCombinedGoals;
    }
    if (b.lockdownGamesTogether !== a.lockdownGamesTogether) {
      return b.lockdownGamesTogether - a.lockdownGamesTogether;
    }
    if (b.combinedPointsInSharedGames !== a.combinedPointsInSharedGames) {
      return b.combinedPointsInSharedGames - a.combinedPointsInSharedGames;
    }
    if (b.winRatePct !== a.winRatePct) {
      return b.winRatePct - a.winRatePct;
    }
    return b.gamesTogether - a.gamesTogether;
  });

  // 4. Build per-player chemistry summary
  const byPlayerId = new Map<string, PlayerChemistrySummary>();

  for (const u of users) {
    const totalGoals = goalsCountByPlayer.get(u.id) || 0;
    const totalAssists = assistsCountByPlayer.get(u.id) || 0;

    // Favorite playmaker (prefer compatible unit partner if available, otherwise overall)
    let favoritePlaymaker: ChemistryPartnerStat | null = null;
    const myAssisters = individualAssistedByMap.get(u.id);
    if (myAssisters && myAssisters.size > 0) {
      const sorted = Array.from(myAssisters.entries()).sort((a, b) => {
        const aCompat = classifyLogicalPair(u.id, a[0]) ? 1 : 0;
        const bCompat = classifyLogicalPair(u.id, b[0]) ? 1 : 0;
        if (b[1] !== a[1]) return b[1] - a[1];
        return bCompat - aCompat;
      });
      const [bestPartnerId, count] = sorted[0];
      const partner = usersById.get(bestPartnerId);
      if (partner && count > 0) {
        favoritePlaymaker = {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerJersey: partner.jerseyNumber ?? null,
          partnerPhoto: partner.photoURL ?? null,
          count,
          sharePct: totalGoals > 0 ? Math.min(100, Math.round((count / totalGoals) * 100)) : 100,
        };
      }
    }

    // Favorite target
    let favoriteTarget: ChemistryPartnerStat | null = null;
    const myTargets = individualAssistedToMap.get(u.id);
    if (myTargets && myTargets.size > 0) {
      const sorted = Array.from(myTargets.entries()).sort((a, b) => {
        const aCompat = classifyLogicalPair(u.id, a[0]) ? 1 : 0;
        const bCompat = classifyLogicalPair(u.id, b[0]) ? 1 : 0;
        if (b[1] !== a[1]) return b[1] - a[1];
        return bCompat - aCompat;
      });
      const [bestTargetId, count] = sorted[0];
      const partner = usersById.get(bestTargetId);
      if (partner && count > 0) {
        favoriteTarget = {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerJersey: partner.jerseyNumber ?? null,
          partnerPhoto: partner.photoURL ?? null,
          count,
          sharePct: totalAssists > 0 ? Math.min(100, Math.round((count / totalAssists) * 100)) : 100,
        };
      }
    }

    // Best Talisman Partner (within compatible unit pairs, min 3 games together)
    let bestTalismanPartner: WinRatePartnerStat | null = null;
    const candidateTalismans: WinRatePartnerStat[] = [];

    for (const other of users) {
      if (other.id === u.id) continue;
      if (!classifyLogicalPair(u.id, other.id)) continue;
      const [id1, id2] = u.id < other.id ? [u.id, other.id] : [other.id, u.id];
      const pairStat = pairGamesMap.get(`${id1}:${id2}`);
      if (pairStat && pairStat.games >= 3) {
        candidateTalismans.push({
          partnerId: other.id,
          partnerName: other.name,
          partnerJersey: other.jerseyNumber ?? null,
          partnerPhoto: other.photoURL ?? null,
          gamesTogether: pairStat.games,
          winsTogether: pairStat.wins,
          winRatePct: Math.round((pairStat.wins / pairStat.games) * 100),
        });
      }
    }

    if (candidateTalismans.length > 0) {
      candidateTalismans.sort((a, b) => {
        if (b.winRatePct !== a.winRatePct) return b.winRatePct - a.winRatePct;
        return b.winsTogether - a.winsTogether;
      });
      bestTalismanPartner = candidateTalismans[0];
    }

    // Duo goals / synergy map for LineupBuilder
    const duoGoalsByPartnerId: Record<string, number> = {};
    for (const other of users) {
      if (other.id === u.id) continue;
      const [id1, id2] = u.id < other.id ? [u.id, other.id] : [other.id, u.id];
      const d = duoMap.get(`${id1}:${id2}`);
      if (d) {
        if (d.unitType === 'attack' && d.totalCombinedGoals > 0) {
          duoGoalsByPartnerId[other.id] = d.totalCombinedGoals;
        } else if (d.unitType === 'defense' && (d.totalCombinedGoals > 0 || d.lockdownGamesTogether > 0)) {
          // For defense pairs in LineupBuilder, expose combined goals or lockdown synergy
          duoGoalsByPartnerId[other.id] = d.totalCombinedGoals > 0 ? d.totalCombinedGoals : d.lockdownGamesTogether;
        }
      }
    }

    byPlayerId.set(u.id, {
      playerId: u.id,
      totalGoalsScored: totalGoals,
      totalAssistsGiven: totalAssists,
      favoritePlaymaker,
      favoriteTarget,
      bestTalismanPartner,
      duoGoalsByPartnerId,
    });
  }

  return {
    topDuos: attackDuosList,
    topDefensePairs: defensePairsList,
    byPlayerId,
  };
}
