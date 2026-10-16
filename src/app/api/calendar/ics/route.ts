import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { generateCalendarIcs } from '@/features/matches/utils/calendarIcs';
import type { Match } from '@/types';

let calendarFirestoreConnected = false;

function getCalendarFirestore() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);
  const useEmulators =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
    process.env.USE_EMULATORS === 'true';

  if (useEmulators && !calendarFirestoreConnected) {
    try {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
      calendarFirestoreConnected = true;
    } catch (e) {
      // Emulator already connected
    }
  }

  return firestore;
}

export async function GET() {
  try {
    const firestore = getCalendarFirestore();
    const snapshot = await getDocs(collection(firestore, 'matches'));
    const matches: Match[] = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as Match),
      id: docSnap.id,
    }));

    const icsContent = generateCalendarIcs(matches);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="hc-aces-rozpis-zapasu.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[API /api/calendar/ics] Error generating calendar feed:', err);
    return NextResponse.json(
      { error: err.message || 'Nepodařilo se vygenerovat kalendářní feed.' },
      { status: 500 }
    );
  }
}
