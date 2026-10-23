import { Firestore, doc, setDoc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { formatName } from '@/lib/utils';

export interface EditableSkaterStatItem {
  id: string;
  name?: string;
  goals: string;
  assists: string;
  gamesPlayed: string;
}

export interface EditableGoalieStatItem {
  id: string;
  name?: string;
  gamesPlayed: string;
  wins: string;
  saves: string;
  shotsAgainst: string;
  so: string;
}

export interface ArchiveSeasonOptions {
  firestore: Firestore;
  seasonName: string;
  year: string;
  teamCount: number;
  newSeasonStartDate?: string;
  leagueSettings: any;
  allSkaterStats?: any[] | null;
  allGoalieStats?: any[] | null;
  allMatches?: any[] | null;
  usersMap?: Map<string, any>;
}

export const statsService = {
  async saveManualStats(
    firestore: Firestore,
    scoringView: 'history' | 'regular' | 'playoff',
    skaterStats: EditableSkaterStatItem[],
    goalieStats: EditableGoalieStatItem[]
  ): Promise<void> {
    const prefix =
      scoringView === 'history'
        ? 'historical'
        : scoringView === 'regular'
        ? 'season'
        : scoringView === 'playoff'
        ? 'playoff'
        : null;

    if (!prefix) {
      throw new Error('Tuto sekci nelze přímo upravovat.');
    }

    try {
      const updatePromises: Promise<any>[] = [];

      for (const item of skaterStats) {
        if (!item.id) continue;
        const [userId, statId] = item.id.split(':');
        if (!userId || !statId) continue;

        const statRef = doc(firestore, 'users', userId, 'skaterStats', statId);
        const payload: Record<string, number> = {};
        if (item.goals !== '') payload[`${prefix}Goals`] = Number(item.goals) || 0;
        if (item.assists !== '') payload[`${prefix}Assists`] = Number(item.assists) || 0;
        if (item.gamesPlayed !== '') payload[`${prefix}GamesPlayed`] = Number(item.gamesPlayed) || 0;

        if (Object.keys(payload).length > 0) {
          updatePromises.push(updateDoc(statRef, payload));
        }
      }

      for (const item of goalieStats) {
        if (!item.id) continue;
        const [userId, statId] = item.id.split(':');
        if (!userId || !statId) continue;

        const statRef = doc(firestore, 'users', userId, 'goalieStats', statId);
        const payload: Record<string, number> = {};
        if (item.gamesPlayed !== '') payload[`${prefix}GamesPlayed`] = Number(item.gamesPlayed) || 0;
        if (item.wins !== '') payload[`${prefix}Wins`] = Number(item.wins) || 0;
        if (item.saves !== '') payload[`${prefix}Saves`] = Number(item.saves) || 0;
        if (item.shotsAgainst !== '') payload[`${prefix}ShotsAgainst`] = Number(item.shotsAgainst) || 0;
        if (item.so !== '') payload[`${prefix}SO`] = Number(item.so) || 0;

        if (Object.keys(payload).length > 0) {
          updatePromises.push(updateDoc(statRef, payload));
        }
      }

      await Promise.all(updatePromises);
    } catch (err: any) {
      const permissionError = new FirestorePermissionError({
        path: 'users/{userId}/stats',
        operation: 'write',
      });
      errorEmitter.emit('permission-error', permissionError);
      throw err;
    }
  },

  /**
   * Unified season archive: snapshots current season data to /seasons/{archivedSeasonId},
   * adds current season + playoff stats to historical totals, resets season counters,
   * and initializes the new season metadata in /settings/league.
   */
  async archiveSeason(options: ArchiveSeasonOptions): Promise<void> {
    const {
      firestore,
      seasonName,
      year,
      teamCount,
      newSeasonStartDate,
      leagueSettings,
      allSkaterStats,
      allGoalieStats,
      allMatches,
      usersMap = new Map(),
    } = options;

    try {
      const archivedSeasonId = leagueSettings?.currentSeasonId || `season-${Date.now()}`;

      // 1. Snapshot Skater Stats
      const skaterSnapshot = (allSkaterStats || [])
        .map((stat) => {
          const u = usersMap.get(stat.userProfileId);
          const regG = stat.seasonGoals || 0;
          const regA = stat.seasonAssists || 0;
          const poG = stat.playoffGoals || 0;
          const poA = stat.playoffAssists || 0;
          const regGP = stat.seasonGamesPlayed || 0;
          const poGP = stat.playoffGamesPlayed || 0;
          return {
            userProfileId: stat.userProfileId,
            name: u?.name ? formatName(u.name) : 'Hráč',
            regularGoals: regG,
            regularAssists: regA,
            playoffGoals: poG,
            playoffAssists: poA,
            totalPoints: regG + regA + poG + poA,
            regularGamesPlayed: regGP,
            playoffGamesPlayed: poGP,
          };
        })
        .filter((s) => s.regularGamesPlayed > 0 || s.totalPoints > 0)
        .sort((a, b) => b.totalPoints - a.totalPoints || b.regularGoals - a.regularGoals)
        .map((s, idx) => ({ ...s, rank: idx + 1 }));

      // 2. Snapshot Goalie Stats
      const goalieSnapshot = (allGoalieStats || [])
        .map((stat) => {
          const u = usersMap.get(stat.userProfileId);
          const gp = (stat.seasonGamesPlayed || 0) + (stat.playoffGamesPlayed || 0);
          const wins = (stat.seasonWins || 0) + (stat.playoffWins || 0);
          const saves = (stat.seasonSaves || 0) + (stat.playoffSaves || 0);
          const sa = (stat.seasonShotsAgainst || 0) + (stat.playoffShotsAgainst || 0);
          const so = (stat.seasonSO || 0) + (stat.playoffSO || 0);
          const pct = sa > 0 ? (saves / sa) * 100 : 0;
          return {
            userProfileId: stat.userProfileId,
            name: u?.name ? formatName(u.name) : 'Brankář',
            gamesPlayed: gp,
            wins,
            saves,
            shotsAgainst: sa,
            savePercentage: Math.round(pct * 10) / 10,
            shutouts: so,
          };
        })
        .filter((g) => g.gamesPlayed > 0)
        .sort((a, b) => (b.savePercentage || 0) - (a.savePercentage || 0) || b.wins - a.wins);

      // 3. Snapshot Matches
      const matchesSnapshot = (allMatches || [])
        .filter((m) => m.isPlayed && (!m.seasonId || m.seasonId === archivedSeasonId))
        .map((m) => ({
          id: m.id,
          round: m.round || 0,
          team1: m.team1,
          team2: m.team2,
          team1Score: m.team1Score,
          team2Score: m.team2Score,
          location: m.location,
          date: m.dateTime?.toDate ? format(m.dateTime.toDate(), 'd. M. yyyy') : '',
          scorers: m.scorers || [],
        }));

      // 4. Save Archive Snapshot Document
      await setDoc(doc(firestore, 'seasons', archivedSeasonId), {
        id: archivedSeasonId,
        name: leagueSettings?.currentSeasonName || 'Sezóna bez názvu',
        year,
        teamCount,
        archivedAt: Timestamp.now(),
        standings: leagueSettings?.leagueStandings || [],
        playoffSeries: leagueSettings?.playoffSeries || [],
        skaterStats: skaterSnapshot,
        goalieStats: goalieSnapshot,
        matches: matchesSnapshot,
      });

      // 5. Batch update user stats (add to historical, reset season)
      const batch = writeBatch(firestore);

      if (allSkaterStats && allSkaterStats.length > 0) {
        allSkaterStats.forEach((stat) => {
          const statRef = doc(firestore, 'users', stat.userProfileId, 'skaterStats', stat.id);
          batch.update(statRef, {
            historicalGoals: (stat.historicalGoals || 0) + (stat.seasonGoals || 0) + (stat.playoffGoals || 0),
            historicalAssists: (stat.historicalAssists || 0) + (stat.seasonAssists || 0) + (stat.playoffAssists || 0),
            historicalGamesPlayed: (stat.historicalGamesPlayed || 0) + (stat.seasonGamesPlayed || 0) + (stat.playoffGamesPlayed || 0),
            seasonGoals: 0,
            seasonAssists: 0,
            seasonGamesPlayed: 0,
            playoffGoals: 0,
            playoffAssists: 0,
            playoffGamesPlayed: 0,
          });
        });
      }

      if (allGoalieStats && allGoalieStats.length > 0) {
        allGoalieStats.forEach((stat) => {
          const statRef = doc(firestore, 'users', stat.userProfileId, 'goalieStats', stat.id);
          batch.update(statRef, {
            historicalGamesPlayed: (stat.historicalGamesPlayed || 0) + (stat.seasonGamesPlayed || 0) + (stat.playoffGamesPlayed || 0),
            historicalWins: (stat.historicalWins || 0) + (stat.seasonWins || 0) + (stat.playoffWins || 0),
            historicalSaves: (stat.historicalSaves || 0) + (stat.seasonSaves || 0) + (stat.playoffSaves || 0),
            historicalShotsAgainst: (stat.historicalShotsAgainst || 0) + (stat.seasonShotsAgainst || 0) + (stat.playoffShotsAgainst || 0),
            historicalSO: (stat.historicalSO || 0) + (stat.seasonSO || 0) + (stat.playoffSO || 0),
            seasonGamesPlayed: 0,
            seasonWins: 0,
            seasonSaves: 0,
            seasonShotsAgainst: 0,
            seasonSO: 0,
            playoffGamesPlayed: 0,
            playoffWins: 0,
            playoffSaves: 0,
            playoffShotsAgainst: 0,
            playoffSO: 0,
          });
        });
      }

      // 6. Update league settings with new season metadata
      const newSeasonId = year.includes('/') ? year.replace('/', '-') : `season-${Date.now()}`;
      const settingsRef = doc(firestore, 'settings', 'league');
      batch.update(settingsRef, {
        currentSeasonId: newSeasonId,
        currentSeasonName: seasonName,
        seasonStartDate: newSeasonStartDate || format(new Date(), 'yyyy-MM-dd'),
        playoffSeries: [],
        leagueStandings: [],
        leagueSkaters: [],
      });

      await batch.commit();
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: 'settings/league',
          operation: 'update',
        })
      );
      throw err;
    }
  },
};
