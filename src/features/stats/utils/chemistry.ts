import type { Match, UserProfile, ResolvedPosition } from '@/types';
import { areNamesMatching } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';
import {
  resolvePlayerPosition,
  isMatchLineupArchived,
} from '@/features/roster/utils/positions';

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
  /** Spoluhráč s nejvyšším společným % výher (min. 3 společné zápasy) */
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
  lockdownGamesTogether: number;
  shutoutsTogether: number;
  avgGoalsAgainstTogether: number;
  goalEvents: DuoGoalEvent[];
  sharedMatches: DuoSharedMatch[];
}

export interface TeamChemistryData {
  /** Gólové dvojice (Útočné dvojice ze stejné lajny LK–C–PK + gólové kombinace Ú + O) */
  topDuos: DynamicDuoRecord[];
  /** Obranné páry (Dvojice obránců ze stejného obranného páru LO–PO) */
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
    if (players.length >= 1) {
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

/**
 * Computes formation-aware on-ice chemistry starting strictly from the official lineup
 * retention cutoff (25. 10. 2026):
 * - U + U (two forwards): must play together in the SAME attack trio (LK1-C1-PK1, LK2-C2-PK2, LK3-C3-PK3).
 * - O + O (two defensemen): must play together in the SAME defense pair (LO1-PO1, LO2-PO2).
 * - U + O (forward + defenseman): can combine whenever they score/assist each other in a match,
 *   regardless of which forward line or defense pair they occupy.
 */
export function calculateTeamChemistry(
  matches: Match[] = [],
  users: UserProfile[] = []
): TeamChemistryData {
  const usersById = new Map<string, UserProfile>(users.map((u) => [u.id, u]));

  // 0. Resolve positions for all users
  const posByUserId = new Map<
    string,
    { resolvedPosition: ResolvedPosition; shortLabel: string }
  >();
  for (const u of users) {
    const info = resolvePlayerPosition(u, matches);
    posByUserId.set(u.id, {
      resolvedPosition: info.resolvedPosition,
      shortLabel: info.meta.shortLabel,
    });
  }

  // Filter matches strictly to those played on or after the lineup retention start date (25. 10. 2026)
  const archivedPlayedMatches = [...matches]
    .filter((m) => m && m.isPlayed && isMatchLineupArchived(m))
    .sort((a, b) => {
      const da = toJsDate(a.dateTime || a.date)?.getTime() || 0;
      const db = toJsDate(b.dateTime || b.date)?.getTime() || 0;
      return da - db;
    });

  // Track pair unit metadata across archived matches
  const pairMetaMap = new Map<
    string,
    {
      unitType: 'attack' | 'defense';
      formationLabel: string;
      sameUnitGames: number;
      isCrossUnitUO: boolean;
    }
  >();

  // Directed maps for individual player summaries
  const individualAssistedByMap = new Map<string, Map<string, number>>();
  const individualAssistedToMap = new Map<string, Map<string, number>>();
  const goalsCountByPlayer = new Map<string, number>();
  const assistsCountByPlayer = new Map<string, number>();

  // Valid duo goal counts: scorerId -> Map<assisterId, count>
  const unitAssistedByMap = new Map<string, Map<string, number>>();

  // Pair co-appearances: "id1:id2" -> stats
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

  for (const match of archivedPlayedMatches) {
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

    const matchUnits = extractMatchFormationUnits(match, users, usersById);
    const playerToUnit = new Map<string, ExtractedFormationUnit>();
    for (const unit of matchUnits) {
      for (const p of unit.players) {
        playerToUnit.set(p.id, unit);
      }
    }

    /**
     * Checks whether two players form a valid pair in THIS match:
     * - U + U: must be in the SAME attack unit (1. útok, 2. útok, 3. útok)
     * - O + O: must be in the SAME defense unit (1. obrana, 2. obrana)
     * - U + O: one is in an attack unit and the other is in a defense unit (allowed across lines!)
     */
    const evaluateMatchPair = (
      idA: string,
      idB: string
    ): {
      valid: boolean;
      unitType: 'attack' | 'defense';
      formationLabel: string;
      isSameUnit: boolean;
      isCrossUnitUO: boolean;
    } | null => {
      if (idA === idB) return null;
      const uA = playerToUnit.get(idA);
      const uB = playerToUnit.get(idB);
      if (!uA || !uB) return null;

      // Same unit (either same attack trio LK-C-PK or same defense pair LO-PO)
      if (uA.unitId === uB.unitId) {
        return {
          valid: true,
          unitType: uA.unitType,
          formationLabel: uA.unitTitle,
          isSameUnit: true,
          isCrossUnitUO: false,
        };
      }

      // Cross-unit U + O (one in attack, one in defense)
      if (uA.unitType !== uB.unitType) {
        const attTitle = uA.unitType === 'attack' ? uA.unitTitle : uB.unitTitle;
        const defTitle = uA.unitType === 'defense' ? uA.unitTitle : uB.unitTitle;
        return {
          valid: true,
          unitType: 'attack',
          formationLabel: `Spolupráce Ú + O (${attTitle} + ${defTitle})`,
          isSameUnit: false,
          isCrossUnitUO: true,
        };
      }

      // Different units of the SAME type (e.g. 1. útok + 2. útok, or 1. obrana + 2. obrana) -> NOT a duo
      return null;
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
      const sortedDetailed = [...detailedList].sort(
        (a, b) => Number(a?.minute || 0) - Number(b?.minute || 0)
      );
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

        const pairCheck = evaluateMatchPair(scorerUser.id, assistUser.id);
        if (pairCheck && pairCheck.valid) {
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
            formationInMatch: pairCheck.formationLabel,
          });
        }
      }
    }

    // 2. Co-appearance tracking for players in the match lineup
    const lineupPlayerIds = Array.from(playerToUnit.keys());
    for (let i = 0; i < lineupPlayerIds.length; i++) {
      for (let j = i + 1; j < lineupPlayerIds.length; j++) {
        const pA = lineupPlayerIds[i];
        const pB = lineupPlayerIds[j];
        const pairCheck = evaluateMatchPair(pA, pB);
        if (!pairCheck || !pairCheck.valid) continue;

        const [firstId, secondId] = pA < pB ? [pA, pB] : [pB, pA];
        const key = `${firstId}:${secondId}`;

        const prevMeta = pairMetaMap.get(key);
        pairMetaMap.set(key, {
          unitType: pairCheck.unitType,
          formationLabel: pairCheck.formationLabel,
          sameUnitGames: (prevMeta?.sameUnitGames || 0) + (pairCheck.isSameUnit ? 1 : 0),
          isCrossUnitUO: pairCheck.isCrossUnitUO,
        });

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
          formationInMatch: pairCheck.formationLabel,
        });
      }
    }
  }

  // Helper to construct a full DynamicDuoRecord
  const buildDuoRecord = (id1: string, id2: string): DynamicDuoRecord | null => {
    const u1 = usersById.get(id1);
    const u2 = usersById.get(id2);
    if (!u1 || !u2) return null;

    const duoKey = `${id1}:${id2}`;
    const meta = pairMetaMap.get(duoKey);
    if (!meta) return null;

    const p1Pos = posByUserId.get(id1)!;
    const p2Pos = posByUserId.get(id2)!;

    const p1GoalsFromP2 = unitAssistedByMap.get(id1)?.get(id2) || 0;
    const p2GoalsFromP1 = unitAssistedByMap.get(id2)?.get(id1) || 0;
    const totalCombinedGoals = p1GoalsFromP2 + p2GoalsFromP1;

    // Cross-unit U+O pairs ONLY form a duo if they actually combined for at least 1 goal!
    if (meta.isCrossUnitUO && totalCombinedGoals === 0) {
      return null;
    }

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
      unitType: meta.unitType,
      formationLabel: meta.formationLabel,
      isVerifiedLineupPair: true,
      sameUnitGames: meta.sameUnitGames,
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

  const attackDuosList: DynamicDuoRecord[] = [];
  const defensePairsList: DynamicDuoRecord[] = [];
  const duoMap = new Map<string, DynamicDuoRecord>();

  for (const key of pairMetaMap.keys()) {
    const [id1, id2] = key.split(':');
    const rec = buildDuoRecord(id1, id2);
    if (!rec) continue;
    duoMap.set(key, rec);

    if (rec.unitType === 'attack') {
      if (rec.totalCombinedGoals > 0 || rec.sameUnitGames > 0) {
        attackDuosList.push(rec);
      }
    } else if (rec.unitType === 'defense') {
      if (rec.sameUnitGames > 0 || rec.totalCombinedGoals > 0) {
        defensePairsList.push(rec);
      }
    }
  }

  attackDuosList.sort((a, b) => {
    if (b.totalCombinedGoals !== a.totalCombinedGoals) {
      return b.totalCombinedGoals - a.totalCombinedGoals;
    }
    if (b.combinedPointsInSharedGames !== a.combinedPointsInSharedGames) {
      return b.combinedPointsInSharedGames - a.combinedPointsInSharedGames;
    }
    if (b.winRatePct !== a.winRatePct) {
      return b.winRatePct - a.winRatePct;
    }
    return b.gamesTogether - a.gamesTogether;
  });

  defensePairsList.sort((a, b) => {
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

  // Build per-player chemistry summary (from archived matches)
  const byPlayerId = new Map<string, PlayerChemistrySummary>();

  for (const u of users) {
    const totalGoals = goalsCountByPlayer.get(u.id) || 0;
    const totalAssists = assistsCountByPlayer.get(u.id) || 0;

    let favoritePlaymaker: ChemistryPartnerStat | null = null;
    const myAssisters = individualAssistedByMap.get(u.id);
    if (myAssisters && myAssisters.size > 0) {
      const sorted = Array.from(myAssisters.entries()).sort((a, b) => b[1] - a[1]);
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

    let favoriteTarget: ChemistryPartnerStat | null = null;
    const myTargets = individualAssistedToMap.get(u.id);
    if (myTargets && myTargets.size > 0) {
      const sorted = Array.from(myTargets.entries()).sort((a, b) => b[1] - a[1]);
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

    let bestTalismanPartner: WinRatePartnerStat | null = null;
    const candidateTalismans: WinRatePartnerStat[] = [];

    for (const other of users) {
      if (other.id === u.id) continue;
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

    const duoGoalsByPartnerId: Record<string, number> = {};
    for (const other of users) {
      if (other.id === u.id) continue;
      const [id1, id2] = u.id < other.id ? [u.id, other.id] : [other.id, u.id];
      const d = duoMap.get(`${id1}:${id2}`);
      if (d) {
        if (d.totalCombinedGoals > 0) {
          duoGoalsByPartnerId[other.id] = d.totalCombinedGoals;
        } else if (d.unitType === 'defense' && d.lockdownGamesTogether > 0) {
          duoGoalsByPartnerId[other.id] = d.lockdownGamesTogether;
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
