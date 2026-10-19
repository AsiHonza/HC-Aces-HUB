import { Firestore, doc, setDoc, getDocs, collection, Timestamp, deleteDoc } from 'firebase/firestore';
import goldenSnapshot from '@/data/historical-stats-snapshot.json';
import { getCanonicalPlayerName } from '@/lib/utils';
import type { UserProfile } from '@/types';

export interface SnapshotSkater {
  name: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  penaltyMinutes: number;
}

export interface SnapshotGoalie {
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  saves: number;
  shotsAgainst: number;
  goalsAgainst: number;
  savePercentage: number;
  shutouts: number;
}

export interface HistoricalStatsSnapshot {
  version: string;
  generatedAt: string;
  description: string;
  teamTotals: {
    regular: { gamesPlayed: number; wins: number; losses: number; draws: number };
    playoff: { gamesPlayed: number; wins: number; losses: number; draws: number };
    total: { gamesPlayed: number; wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number };
  };
  skaters: SnapshotSkater[];
  goalies: SnapshotGoalie[];
}

export interface ApplySnapshotResult {
  success: boolean;
  skatersUpdated: number;
  goaliesUpdated: number;
  skippedUnregisteredCount: number;
  newUsersCreated: number;
  errors?: string[];
  appliedAt: string;
}

function normalizeTokens(str: string): string[] {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function arePlayerNamesMatching(nameA: string, nameB: string): boolean {
  const canA = getCanonicalPlayerName(nameA);
  const canB = getCanonicalPlayerName(nameB);
  const tokensA = normalizeTokens(canA);
  const tokensB = normalizeTokens(canB);

  if (tokensA.length === tokensB.length && tokensA.every((t) => tokensB.includes(t))) {
    return true;
  }

  const has = (tokens: string[], term: string) => tokens.includes(term);

  // Přezdívky a zvláštní shody
  if (has(tokensA, 'tzimas') && has(tokensB, 'tzimas')) return true;
  if (
    (has(tokensA, 'toncek') || (has(tokensA, 'bednar') && has(tokensA, 'antonin'))) &&
    (has(tokensB, 'toncek') || (has(tokensB, 'bednar') && has(tokensB, 'antonin')))
  ) {
    return true;
  }
  if (
    (has(tokensA, 'toncek') && (has(tokensB, 'bednar') || has(tokensB, 'antonin'))) ||
    (has(tokensB, 'toncek') && (has(tokensA, 'bednar') || has(tokensA, 'antonin')))
  ) {
    return true;
  }
  if (has(tokensA, 'bara') && has(tokensB, 'bara')) return true;
  if (has(tokensA, 'lacko') && has(tokensB, 'lacko')) return true;
  if (has(tokensA, 'dufek') && has(tokensB, 'dufek')) return true;

  // Shoda příjmení a počátečního písmena křestního jména
  if (tokensA.length >= 2 && tokensB.length >= 2) {
    const surnameA = tokensA[tokensA.length - 1];
    const surnameB = tokensB[tokensB.length - 1];
    if (surnameA === surnameB && tokensA[0][0] === tokensB[0][0]) {
      return true;
    }
  }

  return false;
}

export const historicalStatsBackupService = {
  /**
   * Získá statický oficiální snapshot z repozitáře (k 14. 4. 2026)
   */
  getGoldenSnapshot(): HistoricalStatsSnapshot {
    return goldenSnapshot as HistoricalStatsSnapshot;
  },

  /**
   * Aplikuje snapshot historických statistik do Firestore.
   * Aplikuje POUZE pro registrované hráče v aplikaci (žádné fiktivní účty nevytváří).
   * Uloží také kopii snapshotu do settings/historicalStatsSnapshot.
   */
  async applySnapshot(
    firestore: Firestore,
    existingUsersList?: UserProfile[] | null,
    customSnapshot?: HistoricalStatsSnapshot
  ): Promise<ApplySnapshotResult> {
    const snapshot = customSnapshot || (goldenSnapshot as HistoricalStatsSnapshot);
    const errors: string[] = [];
    let skatersUpdated = 0;
    let goaliesUpdated = 0;
    let skippedUnregisteredCount = 0;

    // 1. Načíst existující uživatele, pokud nejsou předáni
    let users: any[] = [];
    if (existingUsersList && existingUsersList.length > 0) {
      users = [...existingUsersList];
    } else {
      const snap = await getDocs(collection(firestore, 'users'));
      snap.forEach((d) => users.push({ id: d.id, ...d.data() }));
    }

    // Filtrovat výhradně skutečné registrované uživatele v aplikaci (ignorovat staré auto-generované 'player-' a 'goalie-' účty)
    const registeredUsers = users.filter(
      (u) => !String(u.id).startsWith('player-') && !String(u.id).startsWith('goalie-')
    );

    // Vyčistit případné staré auto-vytvořené účty, aby neznečišťovaly aplikaci
    const dummyUsers = users.filter(
      (u) => String(u.id).startsWith('player-') || String(u.id).startsWith('goalie-')
    );
    for (const dup of dummyUsers) {
      try {
        await deleteDoc(doc(firestore, 'users', dup.id));
      } catch (e) {
        // ignore
      }
    }

    function findMatchingUser(name: string): any {
      return registeredUsers.find((u) => u.name && arePlayerNamesMatching(u.name, name));
    }

    // 2. Aplikovat statistiky hráčů v poli (pouze pro registrované uživatele)
    for (const skater of snapshot.skaters) {
      try {
        const user = findMatchingUser(skater.name);

        if (!user) {
          // Hráč není v aplikaci registrován - bezpečně přeskočíme bez vytváření fiktivních profilů
          skippedUnregisteredCount++;
          continue;
        }

        // Pokud má uživatel v profilu starou přezdívku "Toncek", aktualizujeme jeho jméno na kanonické "Antonín Bednář"
        const userNormName = (user.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (userNormName === 'toncek' || userNormName.includes('toncek')) {
          try {
            await setDoc(doc(firestore, 'users', user.id), { name: 'Antonín Bednář' }, { merge: true });
            user.name = 'Antonín Bednář';
          } catch (e) {
            // ignore
          }
        }

        // Zápis do skaterStats/stats
        const skaterStatRef = doc(firestore, 'users', user.id, 'skaterStats', 'stats');
        await setDoc(
          skaterStatRef,
          {
            userProfileId: user.id,
            historicalGamesPlayed: skater.gamesPlayed,
            historicalGoals: skater.goals,
            historicalAssists: skater.assists,
            historicalPenaltyMinutes: skater.penaltyMinutes,
            historicalSnapshotVersion: snapshot.version,
            historicalSnapshotAt: snapshot.generatedAt,
            lastHistoricalRestoreAt: Timestamp.now(),
          },
          { merge: true }
        );

        skatersUpdated++;
      } catch (err: any) {
        errors.push(`Chyba při zápisu hráče ${skater.name}: ${err.message}`);
      }
    }

    // 3. Aplikovat statistiky brankářů (pouze pro registrované brankáře)
    for (const goalie of snapshot.goalies) {
      try {
        const user = findMatchingUser(goalie.name);

        if (!user) {
          skippedUnregisteredCount++;
          continue;
        }

        // Zajistit, že brankář má v profilu nastaveno playerType: 'goalie'
        if (user.playerType !== 'goalie') {
          try {
            await setDoc(doc(firestore, 'users', user.id), { playerType: 'goalie' }, { merge: true });
            user.playerType = 'goalie';
          } catch (e) {
            // ignore
          }
        }

        // Zápis do goalieStats/stats
        const goalieStatRef = doc(firestore, 'users', user.id, 'goalieStats', 'stats');
        await setDoc(
          goalieStatRef,
          {
            userProfileId: user.id,
            historicalGamesPlayed: goalie.gamesPlayed,
            historicalWins: goalie.wins,
            historicalLosses: goalie.losses,
            historicalDraws: goalie.draws,
            historicalSaves: goalie.saves,
            historicalShotsAgainst: goalie.shotsAgainst,
            historicalGoalsAgainst: goalie.goalsAgainst,
            historicalSavePercentage: goalie.savePercentage,
            historicalSO: goalie.shutouts,
            historicalSnapshotVersion: snapshot.version,
            historicalSnapshotAt: snapshot.generatedAt,
            lastHistoricalRestoreAt: Timestamp.now(),
          },
          { merge: true }
        );

        goaliesUpdated++;
      } catch (err: any) {
        errors.push(`Chyba při zápisu brankáře ${goalie.name}: ${err.message}`);
      }
    }

    // 4. Uložit záznam o snapshotu a týmových součtech do Firestore
    try {
      const backupDocRef = doc(firestore, 'settings', 'historicalStatsSnapshot');
      await setDoc(
        backupDocRef,
        {
          version: snapshot.version,
          generatedAt: snapshot.generatedAt,
          description: snapshot.description,
          teamTotals: snapshot.teamTotals,
          skatersCount: snapshot.skaters.length,
          goaliesCount: snapshot.goalies.length,
          appliedAt: Timestamp.now(),
          appliedSummary: {
            skatersUpdated,
            goaliesUpdated,
            skippedUnregisteredCount,
            newUsersCreated: 0,
          },
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn('Varování při ukládání settings/historicalStatsSnapshot:', err.message);
    }

    return {
      success: errors.length === 0,
      skatersUpdated,
      goaliesUpdated,
      skippedUnregisteredCount,
      newUsersCreated: 0,
      appliedAt: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  /**
   * Vytvoří kompletní záložní JSON snapshot z aktuálního stavu databáze
   */
  async exportCurrentStatsBackup(
    users: UserProfile[],
    skaterStats: any[],
    goalieStats: any[]
  ): Promise<string> {
    const backupData = {
      backupDate: new Date().toISOString(),
      environment: 'HC Aces HUB',
      usersCount: users.length,
      skaterStatsCount: skaterStats.length,
      goalieStatsCount: goalieStats.length,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        playerType: u.playerType,
        jerseyNumber: u.jerseyNumber,
      })),
      skaterStats,
      goalieStats,
    };

    return JSON.stringify(backupData, null, 2);
  },
};
