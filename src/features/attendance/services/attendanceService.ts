import { Firestore, doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface AttendanceSubmission {
  matchId: string;
  userId: string;
  status: 'going' | 'not-going';
  note?: string;
  isGoalie?: boolean;
}

export interface PredictionSubmission {
  matchId: string;
  userId: string;
  acesScore: number;
  opponentScore: number;
  firstScorerId?: string | null;
}

export const attendanceService = {
  /**
   * Save or update player attendance for a match
   */
  async submitAttendance(firestore: Firestore, submission: AttendanceSubmission): Promise<void> {
    const { matchId, userId, status, note, isGoalie } = submission;
    try {
      const attRef = doc(firestore, 'matches', matchId, 'attendees', userId);
      const dataToSave: Record<string, any> = {
        userId,
        matchId,
        status,
        note: note ?? '',
        updatedAt: new Date(),
      };
      if (typeof isGoalie === 'boolean') {
        dataToSave.isGoalie = isGoalie;
      }
      await setDoc(attRef, dataToSave, { merge: true });
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `matches/${matchId}/attendees/${userId}`,
          operation: 'write',
        })
      );
      throw err;
    }
  },

  /**
   * Save or update player pre-match score and 1st goal scorer prediction ("Věštec kabiny")
   */
  async submitPrediction(firestore: Firestore, submission: PredictionSubmission): Promise<void> {
    const { matchId, userId, acesScore, opponentScore, firstScorerId } = submission;
    try {
      const attRef = doc(firestore, 'matches', matchId, 'attendees', userId);
      await setDoc(
        attRef,
        {
          userId,
          matchId,
          prediction: {
            acesScore: Math.max(0, Math.min(30, Number(acesScore) || 0)),
            opponentScore: Math.max(0, Math.min(30, Number(opponentScore) || 0)),
            firstScorerId: firstScorerId && firstScorerId !== 'none' ? firstScorerId : null,
            updatedAt: new Date(),
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `matches/${matchId}/attendees/${userId}`,
          operation: 'write',
        })
      );
      throw err;
    }
  },
};
