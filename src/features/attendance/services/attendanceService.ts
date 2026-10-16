import { Firestore, doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface AttendanceSubmission {
  matchId: string;
  userId: string;
  status: 'going' | 'not-going';
  note?: string;
}

export const attendanceService = {
  /**
   * Save or update player attendance for a match
   */
  async submitAttendance(firestore: Firestore, submission: AttendanceSubmission): Promise<void> {
    const { matchId, userId, status, note } = submission;
    try {
      const attRef = doc(firestore, 'matches', matchId, 'attendees', userId);
      await setDoc(
        attRef,
        {
          userId,
          matchId,
          status,
          note: note ?? '',
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
