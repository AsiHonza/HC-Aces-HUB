import {
  Firestore,
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface RecordResultData {
  team1Score: number;
  team2Score: number;
  goalieId?: string | null;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
  scorers: { goal: string; assist: string | null }[];
}

export interface MatchFormData {
  opponent: string;
  location: string;
  dateTime: Date;
  type: 'regular' | 'playoff' | 'friendly';
  round?: number | null;
  playoffStage?: 'čtvrtfinále' | 'semifinále' | 'finále' | null;
  playoffMatchNumber?: number | null;
}

export const matchesService = {
  /**
   * Save match score, goalie statistics, and scorers
   */
  async recordResult(firestore: Firestore, matchId: string, data: RecordResultData): Promise<void> {
    try {
      const matchRef = doc(firestore, 'matches', matchId);
      await updateDoc(matchRef, {
        isPlayed: true,
        team1Score: data.team1Score,
        team2Score: data.team2Score,
        scorers: data.scorers,
        goalieId: data.goalieId || null,
        goalieSaves: data.goalieSaves ?? 0,
        goalieShotsAgainst: data.goalieShotsAgainst ?? 0,
      });

      // Dispatch Web Push notification to team members to vote for 3 stars
      if (typeof window !== 'undefined') {
        fetch('/api/notifications/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            all: true,
            title: 'Zápas odehrán! Hlasuj o 3 hvězdách ⭐',
            body: `Výsledek utkání byl zapsán. Zvolte 3 nejlepší hráče dnešního zápasu v kabině!`,
            url: `/dashboard?matchId=${matchId}&reason=mvp`,
            tag: `aces-mvp-${matchId}`,
            id: `aces-mvp-${matchId}`,
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `matches/${matchId}`,
          operation: 'update',
        })
      );
      throw err;
    }
  },

  /**
   * Create a new scheduled match and send notifications to all team members
   */
  async createMatch(
    firestore: Firestore,
    data: MatchFormData,
    seasonId: string = 'current'
  ): Promise<string> {
    try {
      const mData: any = {
        team1: 'Aces',
        team2: data.opponent,
        location: data.location,
        dateTime: Timestamp.fromDate(data.dateTime),
        isPlayed: false,
        type: data.type,
        seasonId,
      };

      if (data.type === 'regular') {
        mData.round = data.round ?? null;
      } else if (data.type === 'playoff') {
        mData.playoffStage = data.playoffStage ?? null;
        mData.playoffMatchNumber = data.playoffMatchNumber ?? null;
      }

      const matchDoc = await addDoc(collection(firestore, 'matches'), mData);

      // Notify users about newly scheduled match
      try {
        const usersSnap = await getDocs(collection(firestore, 'users'));
        const batch = writeBatch(firestore);
        usersSnap.forEach((uDoc) => {
          const notifRef = doc(collection(firestore, 'users', uDoc.id, 'notifications'));
          batch.set(notifRef, {
            title: 'Nový zápas naplánován!',
            message: `Příští zápas: Aces vs ${data.opponent} (${format(data.dateTime, 'd. M. HH:mm')}). Přihlaš se!`,
            type: 'match_new',
            createdAt: Timestamp.now(),
            read: false,
            matchId: matchDoc.id,
          });
        });
        await batch.commit();

        // Dispatch Web Push notification to all subscribed team devices
        if (typeof window !== 'undefined') {
          fetch('/api/notifications/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              all: true,
              title: 'Nový zápas naplánován! 🏒',
              body: `Aces vs ${data.opponent} (${format(data.dateTime, 'd. M. HH:mm')}). Přihlas se do sestavy!`,
              url: `/dashboard/calendar`,
              tag: `match-new-${matchDoc.id}`,
              id: `match-new-${matchDoc.id}`,
            }),
          }).catch(() => {});
        }
      } catch (notifErr) {
        console.warn('Could not dispatch notifications to users:', notifErr);
      }

      return matchDoc.id;
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: 'matches',
          operation: 'create',
        })
      );
      throw err;
    }
  },

  /**
   * Update an existing match
   */
  async updateMatch(firestore: Firestore, matchId: string, data: MatchFormData): Promise<void> {
    try {
      const upd: any = {
        team2: data.opponent,
        location: data.location,
        dateTime: Timestamp.fromDate(data.dateTime),
        type: data.type,
      };

      if (data.type === 'regular') {
        upd.round = data.round ?? null;
      } else if (data.type === 'playoff') {
        upd.playoffStage = data.playoffStage ?? null;
        upd.playoffMatchNumber = data.playoffMatchNumber ?? null;
      }

      await updateDoc(doc(firestore, 'matches', matchId), upd);
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `matches/${matchId}`,
          operation: 'update',
        })
      );
      throw err;
    }
  },

  /**
   * Delete a match
   */
  async deleteMatch(firestore: Firestore, matchId: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'matches', matchId));
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `matches/${matchId}`,
          operation: 'delete',
        })
      );
      throw err;
    }
  },

  /**
   * Submit a vote for Player of the Match (MVP).
   * Prevents voting for oneself.
   */
  async submitMvpVote(
    firestore: Firestore,
    matchId: string,
    voterUserId: string,
    candidateUserId: string,
    currentVotes: Record<string, string> = {}
  ): Promise<void> {
    if (voterUserId === candidateUserId) {
      throw new Error('Nemůžete hlasovat sami pro sebe.');
    }

    try {
      const updatedVotes = {
        ...currentVotes,
        [voterUserId]: candidateUserId,
      };
      await updateDoc(doc(firestore, 'matches', matchId), {
        mvpVotes: updatedVotes,
      });
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `matches/${matchId}`,
          operation: 'update',
        })
      );
      throw err;
    }
  },

  /**
   * Submit 3-Stars vote for a match (1st star = 3pts, 2nd star = 2pts, 3rd star = 1pt).
   * Validates:
   * - Cannot vote for oneself in any star
   * - Must choose 3 distinct players
   */
  async submitMatchStarsVote(
    firestore: Firestore,
    matchId: string,
    voterUserId: string,
    vote: { star1: string; star2: string; star3: string },
    currentStarsVotes: Record<string, any> = {},
    currentMvpVotes: Record<string, string> = {}
  ): Promise<void> {
    if (
      voterUserId === vote.star1 ||
      voterUserId === vote.star2 ||
      voterUserId === vote.star3
    ) {
      throw new Error('Nemůžete udělit hvězdu sami sobě.');
    }

    if (
      vote.star1 === vote.star2 ||
      vote.star1 === vote.star3 ||
      vote.star2 === vote.star3
    ) {
      throw new Error('Každá ze 3 hvězd musí patřit jinému spoluhráči.');
    }

    try {
      const updatedStarsVotes = {
        ...currentStarsVotes,
        [voterUserId]: {
          star1: vote.star1,
          star2: vote.star2,
          star3: vote.star3,
        },
      };

      const updatedMvpVotes = {
        ...currentMvpVotes,
        [voterUserId]: vote.star1,
      };

      await updateDoc(doc(firestore, 'matches', matchId), {
        starsVotes: updatedStarsVotes,
        mvpVotes: updatedMvpVotes,
      });
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `matches/${matchId}`,
          operation: 'update',
        })
      );
      throw err;
    }
  },

  /**
   * Zapsat / uzavřít staré zápasy před začátkem aktuální sezóny (16. 9. 2026) a přesunout je do archivu
   */
  async archiveOldUnrecordedMatches(
    firestore: Firestore,
    matches: { id: string; team1Score?: number; team2Score?: number }[],
    targetSeasonId = 'season-2024-2025'
  ): Promise<number> {
    const batch = writeBatch(firestore);
    for (const m of matches) {
      const matchRef = doc(firestore, 'matches', m.id);
      batch.update(matchRef, {
        isPlayed: true,
        seasonId: targetSeasonId,
        team1Score: m.team1Score ?? 0,
        team2Score: m.team2Score ?? 0,
      });
    }
    await batch.commit();
    return matches.length;
  },

  /**
   * Trvale smazat staré testovací zápasy před 16. 9. 2026
   */
  async deleteOldTestMatches(
    firestore: Firestore,
    matchIds: string[]
  ): Promise<number> {
    const batch = writeBatch(firestore);
    for (const id of matchIds) {
      batch.delete(doc(firestore, 'matches', id));
    }
    await batch.commit();
    return matchIds.length;
  },
};
