import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { fetchLeagueData, ScrapedLeagueData } from '@/lib/sync/league-scraper';
import { syncLeagueToAdminFirestore } from '@/lib/sync/league-admin-sync';
import { firebaseConfig } from '@/firebase/config';

// In-memory cache for live scraped league data with 15-minute TTL to protect upstream league servers
interface ScrapeCache {
  data: ScrapedLeagueData;
  cachedAt: number;
}
let memoryScrapeCache: ScrapeCache | null = null;
const SCRAPE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minut

async function getCachedOrFreshScrapedData(force = false): Promise<{ data: ScrapedLeagueData; fromCache: boolean }> {
  const now = Date.now();
  if (!force && memoryScrapeCache && now - memoryScrapeCache.cachedAt < SCRAPE_CACHE_TTL_MS) {
    return { data: memoryScrapeCache.data, fromCache: true };
  }

  const scrapedData = await fetchLeagueData();
  memoryScrapeCache = {
    data: scrapedData,
    cachedAt: now,
  };

  return { data: scrapedData, fromCache: false };
}

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

async function performSync(force = true) {
  const adminDb = getAdminFirestore();
  const { data: scrapedData } = await getCachedOrFreshScrapedData(force);
  const result = await syncLeagueToAdminFirestore(adminDb, scrapedData);
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const action = url.searchParams.get('action');
    const force = url.searchParams.get('force') === 'true';
    const secret = process.env.SYNC_SECRET || 'aces-sync-secret-2026';

    // Rychlé stažení parsovaných dat z webu ligy (s in-memory cache)
    if (action === 'scrape') {
      const { data, fromCache } = await getCachedOrFreshScrapedData(force);
      return NextResponse.json({ success: true, data, fromCache });
    }

    // Ověření tokenu pro externí automatické crony (pokud je nastaven v env)
    if (process.env.SYNC_SECRET && token !== secret) {
      return NextResponse.json({ error: 'Neoprávněný přístup (neplatný token)' }, { status: 401 });
    }

    const result = await performSync(force);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Chyba v API /api/sync/league (GET):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await performSync(true);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Chyba v API /api/sync/league (POST):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
