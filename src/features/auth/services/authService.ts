import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { Firestore, doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  jerseyNumber?: number | null;
  playerType: 'player' | 'goalie' | 'member';
}

export const authService = {
  /**
   * Sign in user with email and password
   */
  async login(auth: Auth, email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  },

  /**
   * Register a new user with Auth, create profile in /users and initialize statistics
   */
  async register(
    auth: Auth,
    firestore: Firestore,
    data: RegisterUserData
  ): Promise<void> {
    const { name, email, password, phoneNumber, jerseyNumber, playerType } = data;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    try {
      await updateProfile(user, { displayName: name });

      // Create /users/{uid} document
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        name,
        email,
        phoneNumber: phoneNumber || null,
        jerseyNumber: jerseyNumber || null,
        role: email === 'janmlcak6@gmail.com' ? 'admin' : 'classic',
        playerType,
        photoURL: null,
      });

      // Initialize stats subcollection based on player type
      if (playerType === 'player') {
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
      } else if (playerType === 'goalie') {
        await setDoc(doc(firestore, `users/${user.uid}/goalieStats`, 'stats'), {
          userProfileId: user.uid,
          seasonGamesPlayed: 0,
          seasonWins: 0,
          seasonSaves: 0,
          seasonShotsAgainst: 0,
          playoffGamesPlayed: 0,
          playoffWins: 0,
          playoffSaves: 0,
          playoffShotsAgainst: 0,
          historicalGamesPlayed: 0,
          historicalWins: 0,
          historicalSaves: 0,
          historicalShotsAgainst: 0,
        });
      }
    } catch (err: any) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'write',
        })
      );
      throw err;
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(auth: Auth, email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Sign out current user
   */
  async logout(auth: Auth): Promise<void> {
    await signOut(auth);
  },
};
