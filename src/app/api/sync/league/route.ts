import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { fetchLeagueData } from '@/lib/sync/league-scraper';
import { syncLeagueToAdminFirestore } from '@/lib/sync/league-admin-sync';
import { firebaseConfig } from '@/firebase/config';

function getAdminFirestore(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    const isEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' || Boolean(process.env.FIRESTORE_EMULATOR_HOST);
    if (isEmulator && !process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    }
    admin.initializeApp({
      projectId: firebaseConfig.projectId || 'studio-5302559568-aa7d4',
    });
  }
  return admin.firestore();
}

async function performSync() {
  const adminDb = getAdminFirestore();
  const scrapedData = await fetchLeagueData();
  const result = await syncLeagueToAdminFirestore(adminDb, scrapedData);
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const action = url.searchParams.get('action');
    const secret = process.env.SYNC_SECRET || 'aces-sync-secret-2026';

    // Rychlé stažení parsovaných dat z webu ligy
    if (action === 'scrape') {
      const scrapedData = await fetchLeagueData();
      return NextResponse.json({ success: true, data: scrapedData });
    }

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
