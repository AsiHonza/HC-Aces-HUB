import {
  Firestore,
  doc,
  collection,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  FirebaseStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { UserProfile, PlayerType, FieldPosition } from '@/types';
import { extractPositionsFromLineup } from '../utils/positions';

export interface UpdateUserData {
  name: string;
  phoneNumber?: string | null;
  jerseyNumber?: number | null;
  dob?: string | null;
  playerType: PlayerType;
  fieldPosition?: FieldPosition | null;
  positionLocked?: boolean;
}

export interface CreateUserData {
  name: string;
  playerType: PlayerType;
  fieldPosition?: FieldPosition | null;
  jerseyNumber?: number | null;
  email?: string;
  password?: string;
}

export const rosterService = {
  /**
   * Update an existing user profile in Firestore
   */
  async updateProfile(
    firestore: Firestore,
    userId: string,
    data: UpdateUserData
  ): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', userId);
      const payload: Record<string, any> = {
        name: data.name,
        phoneNumber: data.phoneNumber ?? null,
        jerseyNumber: data.jerseyNumber ?? null,
        dob: data.dob ?? null,
        playerType: data.playerType,
      };
      if (data.fieldPosition !== undefined) {
        payload.fieldPosition = data.fieldPosition;
      }
      if (data.positionLocked !== undefined) {
        payload.positionLocked = data.positionLocked;
      }
      await updateDoc(userRef, payload);
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `users/${userId}`,
          operation: 'update',
        })
      );
      throw err;
    }
  },

  /**
   * Automatically updates skaters' fieldPosition (defense / wing / center)
   * when an admin saves a match lineup, unless the player's position is explicitly locked.
   */
  async syncPositionsFromLineup(
    firestore: Firestore,
    lineup: Record<string, any> | null | undefined,
    allUsers: UserProfile[] = []
  ): Promise<number> {
    const extracted = extractPositionsFromLineup(lineup);
    if (extracted.length === 0) return 0;

    const usersMap = new Map(allUsers.map((u) => [u.id, u]));
    const batch = writeBatch(firestore);
    let updatedCount = 0;

    for (const item of extracted) {
      const existing = usersMap.get(item.userId);
      if (!existing) continue;
      if (existing.playerType === 'goalie' || existing.playerType === 'member') continue;
      if (existing.positionLocked) continue;
      if (existing.fieldPosition === item.fieldPosition) continue;

      batch.update(doc(firestore, 'users', item.userId), {
        fieldPosition: item.fieldPosition,
      });
      updatedCount++;
    }

    if (updatedCount > 0) {
      try {
        await batch.commit();
      } catch (err) {
        console.warn('Nepodařilo se automaticky synchronizovat posty ze sestavy:', err);
      }
    }

    return updatedCount;
  },

  /**
   * Upload user avatar to Firebase Storage and update Firestore user document
   */
  async uploadAvatar(
    storage: FirebaseStorage,
    firestore: Firestore,
    userId: string,
    file: File
  ): Promise<string> {
    try {
      const fileRef = storageRef(storage, `avatars/${userId}/${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      const userDocRef = doc(firestore, 'users', userId);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      return downloadURL;
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `users/${userId}`,
          operation: 'update',
        })
      );
      throw err;
    }
  },

  /**
   * Update self profile (name, phone, jersey, dob) and update Auth displayName
   */
  async updateProfileWithAuth(
    auth: Auth,
    firestore: Firestore,
    userId: string,
    data: {
      name: string;
      phoneNumber?: string | null;
      jerseyNumber?: number | null;
      dob?: string | null;
      fieldPosition?: FieldPosition | null;
      positionLocked?: boolean;
    }
  ): Promise<void> {
    try {
      const userDocRef = doc(firestore, 'users', userId);
      const payload: Record<string, any> = {
        name: data.name,
        phoneNumber: data.phoneNumber || null,
        jerseyNumber: data.jerseyNumber ? Number(data.jerseyNumber) : null,
        dob: data.dob || null,
      };
      if (data.fieldPosition !== undefined) {
        payload.fieldPosition = data.fieldPosition;
      }
      if (data.positionLocked !== undefined) {
        payload.positionLocked = data.positionLocked;
      }
      await updateDoc(userDocRef, payload);

      if (auth.currentUser && auth.currentUser.uid === userId) {
        await updateProfile(auth.currentUser, { displayName: data.name });
      }
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `users/${userId}`,
          operation: 'update',
        })
      );
      throw err;
    }
  },

  /**
   * Delete a user profile and all associated subcollections (skaterStats, goalieStats)
   */
  async deleteUser(firestore: Firestore, userId: string): Promise<void> {
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'users', userId, 'skaterStats', 'stats'));
      batch.delete(doc(firestore, 'users', userId, 'goalieStats', 'stats'));
      batch.delete(doc(firestore, 'users', userId));
      await batch.commit();
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `users/${userId}`,
          operation: 'delete',
        })
      );
      throw err;
    }
  },

  /**
   * Create a new Auth user, user profile document, and initial stats documents
   */
  async createPlayerAccount(
    auth: Auth,
    firestore: Firestore,
    data: CreateUserData
  ): Promise<{ uid: string; email: string }> {
    const rawEmail = data.email
      ? data.email.trim().toLowerCase()
      : `${data.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/\s+/g, '.')}.${Math.random().toString(36).substring(2, 7)}@aces.test`;

    const password = data.password || 'Aces123456!';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, rawEmail, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: data.name });

      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        name: data.name,
        email: rawEmail,
        role: 'classic',
        playerType: data.playerType,
        jerseyNumber: data.jerseyNumber ?? null,
      });

      if (data.playerType === 'player') {
        await setDoc(doc(firestore, `users/${user.uid}/skaterStats`, 'stats'), {
          userProfileId: user.uid,
          seasonGoals: 0,
          seasonAssists: 0,
          seasonGamesPlayed: 0,
          playoffGoals: 0,
          playoffAssists: 0,
          playoffGamesPlayed: 0,
          historicalGoals: 0,
          historicalAssists: 0,
          historicalGamesPlayed: 0,
        });
      } else if (data.playerType === 'goalie') {
        await setDoc(doc(firestore, `users/${user.uid}/goalieStats`, 'stats'), {
          userProfileId: user.uid,
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
          historicalGamesPlayed: 0,
          historicalWins: 0,
          historicalSaves: 0,
          historicalShotsAgainst: 0,
          historicalSO: 0,
        });
      }

      return { uid: user.uid, email: rawEmail };
    } catch (err: any) {
      if (err.code !== 'auth/email-already-in-use') {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: 'users',
            operation: 'create',
          })
        );
      }
      throw err;
    }
  },

  /**
   * Send a password reset email via Firebase Auth
   */
  async resetPassword(auth: Auth, email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Diagnostic purge: Finds and deletes any orphaned Firestore documents by email
   */
  async purgeByEmail(firestore: Firestore, email: string): Promise<number> {
    try {
      const q = query(
        collection(firestore, 'users'),
        where('email', '==', email.trim().toLowerCase())
      );
      const snapshot = await getDocs(q);

      const batch = writeBatch(firestore);
      let count = 0;

      snapshot.docs.forEach((uDoc) => {
        batch.delete(doc(firestore, 'users', uDoc.id, 'skaterStats', 'stats'));
        batch.delete(doc(firestore, 'users', uDoc.id, 'goalieStats', 'stats'));
        batch.delete(doc(firestore, 'users', uDoc.id));
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }

      return count;
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: 'users',
          operation: 'delete',
        })
      );
      throw err;
    }
  },
};
