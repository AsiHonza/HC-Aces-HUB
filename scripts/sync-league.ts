import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import * as admin from 'firebase-admin';
import { fetchLeagueData } from '../src/lib/sync/league-scraper';
import { syncLeagueToFirestore, SyncResult } from '../src/lib/sync/league-sync';
import { syncLeagueToAdminFirestore } from '../src/lib/sync/league-admin-sync';
import { firebaseConfig } from '../src/firebase/config';

function cleanCredential(val?: string): string {
  if (!val) return '';
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***';
  return `${maskedName}@${domain}`;
}

function getServiceAccount(): any | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GCP_SA_KEY;
  if (!raw) return null;
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.trim().startsWith('{')) {
      return JSON.parse(decoded);
    }
  } catch (e: any) {
    console.warn('⚠️ Nepodařilo se naparsovat FIREBASE_SERVICE_ACCOUNT:', e.message);
  }
  return null;
}

function logSyncSummary(result: SyncResult) {
  if (result.success) {
    console.log('🎉 Synchronizace úspěšně dokončena:');
    console.log(`   - Tabulka ligy: ${result.standingsCount} týmů`);
    console.log(`   - Zápasy vytvořeny: ${result.matchesCreated}, aktualizovány: ${result.matchesUpdated}`);
    console.log(`   - Statistiky hráčů: ${result.skatersUpdated} hráčů`);
    console.log(`   - Statistiky brankářů: ${result.goaliesUpdated} brankářů`);
  } else {
    console.error('⚠️ Synchronizace proběhla s chybami:');
    result.errors?.forEach((e) => console.error('   ✗', e));
  }
}

async function main() {
  console.log('🏒 Spouštím synchronizaci statistik z webu ligy (hobbyhokejbrno.cz)...');

  // 1. Zjištění, zda máme URL nasazené aplikace a máme zavolat její zabezpečený endpoint
  const appUrl = cleanCredential(process.env.SYNC_APP_URL);
  if (appUrl) {
    console.log(`🌐 Nalezena URL nasazené aplikace (${appUrl}) – volám zabezpečený serverový endpoint...`);
    const secret = cleanCredential(process.env.SYNC_SECRET) || 'aces-sync-secret-2026';
    const apiUrl = `${appUrl.replace(/\/+$/, '')}/api/sync/league?token=${encodeURIComponent(secret)}`;
    const res = await fetch(apiUrl, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Volání ${apiUrl} selhalo: ${data.error || res.statusText}`);
    }
    console.log('🎉 Synchronizace přes serverový endpoint úspěšně dokončena!');
    process.exit(0);
  }

  // 2. Stažení dat z webu ligy
  const scrapedData = await fetchLeagueData();
  console.log(
    `✓ Staženo: ${scrapedData.standings.length} týmů v tabulce, ${scrapedData.acesMatches.length} zápasů Aces, ${scrapedData.acesSkaters.length} hráčů Aces, ${scrapedData.acesGoalies.length} brankářů Aces.`
  );

  // 3. Metoda A: Firebase Admin SDK se servisním účtem (nejspolehlivější řešení pro CI/CD)
  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    console.log('🛡️ Používám Firebase Admin SDK (FIREBASE_SERVICE_ACCOUNT) – plná oprávnění bez bezpečnostních pravidel.');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || firebaseConfig.projectId,
      });
    }
    const adminDb = admin.firestore();
    const result = await syncLeagueToAdminFirestore(adminDb, scrapedData);
    logSyncSummary(result);
    process.exit(result.success ? 0 : 1);
  }

  // 4. Metoda B: Firebase Client SDK s přihlášením administrátora
  const isCI = process.env.CI === 'true' || Boolean(process.env.GITHUB_ACTIONS);
  const useEmulators =
    !isCI &&
    (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
      process.env.USE_EMULATORS === 'true' ||
      (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== 'false'));

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  if (useEmulators) {
    console.log('🔌 Používám lokální Firebase emulátory (Firestore: 8080, Auth: 9099)');
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }

  const rawEmail = process.env.SYNC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'janmlcak6@gmail.com';
  const rawPassword = process.env.SYNC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'heslo123';
  const adminEmail = cleanCredential(rawEmail);
  const adminPassword = cleanCredential(rawPassword);

  if (adminEmail && adminPassword) {
    try {
      console.log(`🔐 Přihlašuji administrátora ${maskEmail(adminEmail)} (heslo délky ${adminPassword.length})...`);
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log(`🔑 Úspěšně přihlášen jako admin (${adminEmail})`);
    } catch (e: any) {
      if (!useEmulators) {
        console.error(`❌ Chyba přihlášení administrátora (${maskEmail(adminEmail)}): ${e.message}`);
        console.error('👉 TIP 1: Zkontrolujte, zda secret SYNC_ADMIN_PASSWORD v GitHub Actions přesně odpovídá heslu administrátorského účtu.');
        console.error('👉 TIP 2: Pokud je heslo správné, zkontrolujte, zda účet v Firebase Auth existuje a není zablokovaný.');
        console.error('👉 TIP 3: Pro nejspolehlivější běh bez závislosti na heslu přidejte do GitHub Secrets servisní účet (FIREBASE_SERVICE_ACCOUNT z Firebase Console > Project Settings > Service accounts).');
        throw new Error(`Přihlášení administrátora selhalo (${e.message}). Zastavuji synchronizaci, aby nedošlo k chybám oprávnění.`);
      } else {
        console.warn('Upozornění: přihlášení admina se nezdařilo, pokračuji bez autentizace:', e.message);
      }
    }
  } else if (!useEmulators) {
    throw new Error('Chybí přihlašovací údaje (SYNC_ADMIN_EMAIL nebo SYNC_ADMIN_PASSWORD). Nastavte je v GitHub Secrets.');
  }

  console.log('💾 Zapisuji data do Firestore...');
  const result = await syncLeagueToFirestore(firestore, scrapedData);
  logSyncSummary(result);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatální chyba při synchronizaci:', err.message || err);
  process.exit(1);
});
