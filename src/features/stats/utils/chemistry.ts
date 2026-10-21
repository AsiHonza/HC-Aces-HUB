import type { Match, UserProfile } from '@/types';
import { areNamesMatching } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';

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
}

export interface DynamicDuoRecord {
  duoKey: string;
  player1Id: string;
  player1Name: string;
  player1Jersey?: number | null;
  player1Photo?: string | null;
  player2Id: string;
  player2Name: string;
  player2Jersey?: number | null;
  player2Photo?: string | null;
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
  goalEvents: DuoGoalEvent[];
  sharedMatches: DuoSharedMatch[];
}

export interface TeamChemistryData {
  topDuos: DynamicDuoRecord[];
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

  // Also include anyone who scored or assisted in the match protocol
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
 * Computes 100% automated on-ice chemistry ("Dynamic Duo", favorite playmaker,
 * favorite target, and co-appearance win rate) from existing match protocols.
 */
export function calculateTeamChemistry(
  matches: Match[] = [],
  users: UserProfile[] = []
): TeamChemistryData {
  const usersById = new Map<string, UserProfile>(users.map((u) => [u.id, u]));

  // Directed map: scorerId -> Map<assisterId, count>
  const assistedByMap = new Map<string, Map<string, number>>();
  // Directed map: assisterId -> Map<scorerId, count>
  const assistedToMap = new Map<string, Map<string, number>>();
  // Total goals & assists per player
  const goalsCountByPlayer = new Map<string, number>();
  const assistsCountByPlayer = new Map<string, number>();

  // Pair co-appearances: "idA:idB" -> { games, wins, losses, ties }
  const pairGamesMap = new Map<string, { games: number; wins: number; losses: number; ties: number }>();

  // Pair detailed events & shared matches
  const duoEventsMap = new Map<string, DuoGoalEvent[]>();
  const duoSharedMatchesMap = new Map<string, DuoSharedMatch[]>();

  // Sort played matches chronologically ascending for accurate timeline processing
  const playedMatches = [...matches]
    .filter((m) => m.isPlayed)
    .sort((a, b) => {
      const da = toJsDate(a.dateTime || a.date)?.getTime() || 0;
      const db = toJsDate(b.dateTime || b.date)?.getTime() || 0;
      return da - db;
    });

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

    // Check if detailedScorers has Aces goals
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

    // Track per-player goals/assists in this match for shared match stats
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
        if (!assistedByMap.has(scorerUser.id)) {
          assistedByMap.set(scorerUser.id, new Map());
        }
        const sMap = assistedByMap.get(scorerUser.id)!;
        sMap.set(assistUser.id, (sMap.get(assistUser.id) || 0) + 1);

        if (!assistedToMap.has(assistUser.id)) {
          assistedToMap.set(assistUser.id, new Map());
        }
        const aMap = assistedToMap.get(assistUser.id)!;
        aMap.set(scorerUser.id, (aMap.get(scorerUser.id) || 0) + 1);

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
        });
      }
    }

    // 2. Co-appearance tracking
    const rosterUsers = getMatchAcesPlayers(match, users, usersById);
    for (let i = 0; i < rosterUsers.length; i++) {
      for (let j = i + 1; j < rosterUsers.length; j++) {
        const uA = rosterUsers[i];
        const uB = rosterUsers[j];
        const [firstId, secondId] = uA.id < uB.id ? [uA.id, uB.id] : [uB.id, uA.id];
        const key = `${firstId}:${secondId}`;
        const cur = pairGamesMap.get(key) || { games: 0, wins: 0, losses: 0, ties: 0 };
        cur.games += 1;
        if (isWin) cur.wins += 1;
        else if (isTie) cur.ties += 1;
        else cur.losses += 1;
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
        });
      }
    }
  }

  // 3. Build undirected Dynamic Duo leaderboard
  const duoMap = new Map<string, DynamicDuoRecord>();

  for (const [scorerId, assisters] of assistedByMap.entries()) {
    for (const [assisterId, count] of assisters.entries()) {
      const [id1, id2] = scorerId < assisterId ? [scorerId, assisterId] : [assisterId, scorerId];
      const u1 = usersById.get(id1);
      const u2 = usersById.get(id2);
      if (!u1 || !u2) continue;

      const duoKey = `${id1}:${id2}`;
      let rec = duoMap.get(duoKey);
      if (!rec) {
        const pairGames = pairGamesMap.get(duoKey) || { games: 0, wins: 0, losses: 0, ties: 0 };
        const rawEvents = duoEventsMap.get(duoKey) || [];
        const rawSharedMatches = duoSharedMatchesMap.get(duoKey) || [];

        // Sort newest first for display
        const sortedEventsDesc = [...rawEvents].sort((a, b) => b.matchDateMs - a.matchDateMs);
        const sortedSharedDesc = [...rawSharedMatches].sort((a, b) => b.matchDateMs - a.matchDateMs);

        // Matches where this duo scored at least 1 combined goal
        const matchOutcomeByMatchId = new Map<string, { isWin: boolean; count: number; opponent: string }>();
        const opponentGoalsMap = new Map<string, number>();
        let gwgCount = 0;
        let openingGoalCount = 0;

        for (const ev of rawEvents) {
          if (ev.isGwg) gwgCount += 1;
          if (ev.isOpeningGoal) openingGoalCount += 1;
          opponentGoalsMap.set(ev.opponent, (opponentGoalsMap.get(ev.opponent) || 0) + 1);
          const prev = matchOutcomeByMatchId.get(ev.matchId) || { isWin: ev.isWin, count: 0, opponent: ev.opponent };
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

        let combinedPointsInSharedGames = 0;
        for (const sm of rawSharedMatches) {
          combinedPointsInSharedGames += sm.p1Goals + sm.p1Assists + sm.p2Goals + sm.p2Assists;
        }

        rec = {
          duoKey,
          player1Id: u1.id,
          player1Name: u1.name,
          player1Jersey: u1.jerseyNumber ?? null,
          player1Photo: u1.photoURL ?? null,
          player2Id: u2.id,
          player2Name: u2.name,
          player2Jersey: u2.jerseyNumber ?? null,
          player2Photo: u2.photoURL ?? null,
          totalCombinedGoals: 0,
          p1GoalsFromP2: 0,
          p2GoalsFromP1: 0,
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
          goalEvents: sortedEventsDesc,
          sharedMatches: sortedSharedDesc,
        };
        duoMap.set(duoKey, rec);
      }

      if (scorerId === id1) {
        rec.p1GoalsFromP2 += count;
      } else {
        rec.p2GoalsFromP1 += count;
      }
      rec.totalCombinedGoals = rec.p1GoalsFromP2 + rec.p2GoalsFromP1;
    }
  }

  const topDuos = Array.from(duoMap.values()).sort((a, b) => {
    if (b.totalCombinedGoals !== a.totalCombinedGoals) {
      return b.totalCombinedGoals - a.totalCombinedGoals;
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

    // Favorite playmaker (who assisted u the most)
    let favoritePlaymaker: ChemistryPartnerStat | null = null;
    const myAssisters = assistedByMap.get(u.id);
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

    // Favorite target (whom u assisted the most)
    let favoriteTarget: ChemistryPartnerStat | null = null;
    const myTargets = assistedToMap.get(u.id);
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

    // Best Talisman Partner (highest win-rate with min. 3 games together)
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

    // Duo goals map for quick lookup in LineupBuilder
    const duoGoalsByPartnerId: Record<string, number> = {};
    for (const other of users) {
      if (other.id === u.id) continue;
      const [id1, id2] = u.id < other.id ? [u.id, other.id] : [other.id, u.id];
      const d = duoMap.get(`${id1}:${id2}`);
      if (d && d.totalCombinedGoals > 0) {
        duoGoalsByPartnerId[other.id] = d.totalCombinedGoals;
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
    topDuos,
    byPlayerId,
  };
}
