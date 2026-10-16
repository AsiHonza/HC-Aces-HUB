import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { fetchLeagueData } from '@/lib/sync/league-scraper';
import { syncLeagueToFirestore } from '@/lib/sync/league-sync';
import { firebaseConfig } from '@/firebase/config';

let serverFirestoreInitialized = false;

function getServerFirestore() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);
  const auth = getAuth(app);

  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' || process.env.USE_EMULATORS === 'true';

  if (useEmulators && !serverFirestoreInitialized) {
    try {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      serverFirestoreInitialized = true;
    } catch (e) {
      // Ignorovat chybu pokud už je připojen
    }
  }

  return { firestore, auth, useEmulators };
}

async function performSync() {
  const { firestore, auth, useEmulators } = getServerFirestore();

  if (useEmulators) {
    try {
      await signInWithEmailAndPassword(auth, 'janmlcak6@gmail.com', 'heslo123');
    } catch (e) {
      // Pokud uživatel už je přihlášen
    }
  }

  const scrapedData = await fetchLeagueData();
  const result = await syncLeagueToFirestore(firestore, scrapedData);
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const secret = process.env.SYNC_SECRET || 'aces-sync-secret-2026';

    // Ověření tokenu pro externí automatické crony (pokud je nastaven v env)
    if (process.env.SYNC_SECRET && token !== secret) {
      return NextResponse.json({ error: 'Neoprávněný přístup (neplatný token)' }, { status: 401 });
    }

    const result = await performSync();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Chyba v API /api/sync/league (GET):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await performSync();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Chyba v API /api/sync/league (POST):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
