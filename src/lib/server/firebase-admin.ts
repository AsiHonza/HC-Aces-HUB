import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

/**
 * Returns an initialized Firebase Admin Firestore instance.
 * Reuses existing Firebase Admin app if already initialized.
 * Handles local emulators and production credentials automatically.
 */
export function getAdminFirestore(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    const isEmulator =
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
      Boolean(process.env.FIRESTORE_EMULATOR_HOST);

    if (isEmulator && !process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    }

    admin.initializeApp({
      projectId: firebaseConfig.projectId || 'studio-5302559568-aa7d4',
    });
  }

  return admin.firestore();
}

export { admin };
