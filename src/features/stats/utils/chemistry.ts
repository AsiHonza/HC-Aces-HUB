import type { Match, UserProfile } from '@/types';
import { areNamesMatching } from '@/lib/utils';

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
  winRatePct: number;
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

  // Pair co-appearances: "idA:idB" -> { games, wins }
  const pairGamesMap = new Map<string, { games: number; wins: number }>();

  const playedMatches = matches.filter((m) => m.isPlayed);

  for (const match of playedMatches) {
    const isAcesTeam1 = /aces/i.test(match.team1 || '');
    const acesScore = isAcesTeam1 ? Number(match.team1Score ?? 0) : Number(match.team2Score ?? 0);
    const oppScore = isAcesTeam1 ? Number(match.team2Score ?? 0) : Number(match.team1Score ?? 0);
    const isWin = acesScore > oppScore;

    // 1. Co-appearance tracking
    const rosterUsers = getMatchAcesPlayers(match, users, usersById);
    for (let i = 0; i < rosterUsers.length; i++) {
      for (let j = i + 1; j < rosterUsers.length; j++) {
        const uA = rosterUsers[i];
        const uB = rosterUsers[j];
        const [firstId, secondId] = uA.id < uB.id ? [uA.id, uB.id] : [uB.id, uA.id];
        const key = `${firstId}:${secondId}`;
        const cur = pairGamesMap.get(key) || { games: 0, wins: 0 };
        cur.games += 1;
        if (isWin) cur.wins += 1;
        pairGamesMap.set(key, cur);
      }
    }

    // 2. Goal + Assist pairs
    // Prefer match.scorers if populated, otherwise filter detailedScorers for Aces
    const goalEvents: Array<{ scorerRaw: string; assistRaw: string | null }> = [];

    if (Array.isArray(match.scorers) && match.scorers.length > 0) {
      for (const s of match.scorers) {
        if (s && s.goal) {
          goalEvents.push({ scorerRaw: s.goal, assistRaw: s.assist || null });
        }
      }
    } else if (Array.isArray(match.detailedScorers) && match.detailedScorers.length > 0) {
      for (const ds of match.detailedScorers) {
        const isAcesGoal =
          (isAcesTeam1 && ds.team === 'team1') ||
          (!isAcesTeam1 && ds.team === 'team2') ||
          /aces/i.test(ds.team || '');
        if (isAcesGoal && ds.scorer) {
          goalEvents.push({ scorerRaw: ds.scorer, assistRaw: ds.assist || null });
        }
      }
    }

    for (const ev of goalEvents) {
      const scorerUser = resolveUser(ev.scorerRaw, users, usersById);
      const assistUser = resolveUser(ev.assistRaw, users, usersById);

      if (scorerUser) {
        goalsCountByPlayer.set(scorerUser.id, (goalsCountByPlayer.get(scorerUser.id) || 0) + 1);
      }
      if (assistUser) {
        assistsCountByPlayer.set(assistUser.id, (assistsCountByPlayer.get(assistUser.id) || 0) + 1);
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
        const pairGames = pairGamesMap.get(duoKey) || { games: 0, wins: 0 };
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
          winRatePct: pairGames.games > 0 ? Math.round((pairGames.wins / pairGames.games) * 100) : 0,
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
