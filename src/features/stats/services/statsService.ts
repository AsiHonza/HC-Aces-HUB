import { Firestore, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

    const goalsKey = `${prefix}Goals`;
    const assistsKey = `${prefix}Assists`;
    const gamesPlayedKey = `${prefix}GamesPlayed`;

    const goalieWinsKey = `${prefix}Wins`;
    const goalieSavesKey = `${prefix}Saves`;
    const goalieShotsAgainstKey = `${prefix}ShotsAgainst`;
    const goalieGamesPlayedKey = `${prefix}GamesPlayed`;
    const goalieSOKey = `${prefix}SO`;

    const updatePromises: Promise<any>[] = [];

    for (const p of skaterStats) {
      if (!p.id) continue;
      updatePromises.push(
        setDoc(
          doc(firestore, 'users', p.id, 'skaterStats', 'stats'),
          {
            userProfileId: p.id,
            [goalsKey]: Number(p.goals) || 0,
            [assistsKey]: Number(p.assists) || 0,
            [gamesPlayedKey]: Number(p.gamesPlayed) || 0,
          },
          { merge: true }
        )
      );
    }

    for (const g of goalieStats) {
      if (!g.id) continue;
      updatePromises.push(
        setDoc(
          doc(firestore, 'users', g.id, 'goalieStats', 'stats'),
          {
            userProfileId: g.id,
            [goalieGamesPlayedKey]: Number(g.gamesPlayed) || 0,
            [goalieWinsKey]: Number(g.wins) || 0,
            [goalieSavesKey]: Number(g.saves) || 0,
            [goalieShotsAgainstKey]: Number(g.shotsAgainst) || 0,
            [goalieSOKey]: Number(g.so) || 0,
          },
          { merge: true }
        )
      );
    }

    try {
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
   * Toggle playoff scoring mode in league settings. When disabled, resets playoff statistics.
   */
  async togglePlayoffScoringMode(
    firestore: Firestore,
    checked: boolean,
    allSkaterStats?: any[] | null,
    allGoalieStats?: any[] | null
  ): Promise<void> {
    try {
      const settingsRef = doc(firestore, 'settings', 'league');
      await updateDoc(settingsRef, { isScoringInPlayoffMode: checked });

      if (!checked) {
        const batch = writeBatch(firestore);
        if (allSkaterStats && allSkaterStats.length > 0) {
          allSkaterStats.forEach((stat) => {
            const statRef = doc(firestore, 'users', stat.userProfileId, 'skaterStats', stat.id);
            batch.update(statRef, {
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
              playoffGamesPlayed: 0,
              playoffWins: 0,
              playoffSaves: 0,
              playoffShotsAgainst: 0,
              playoffSO: 0,
            });
          });
        }
        await batch.commit();
      }
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

  /**
   * Simple season archive: transfers current season + playoff stats to historical baseline and resets.
   */
  async archiveSeasonDirect(
    firestore: Firestore,
    allSkaterStats?: any[] | null,
    allGoalieStats?: any[] | null
  ): Promise<void> {
    try {
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


      const settingsRef = doc(firestore, 'settings', 'league');
      batch.set(
        settingsRef,
        {
          isScoringInPlayoffMode: false,
          isPlayoffEnabled: false,
          playoffSeries: [],
        },
        { merge: true }
      );

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
