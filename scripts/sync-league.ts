import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { fetchLeagueData } from '../src/lib/sync/league-scraper';
import { syncLeagueToFirestore } from '../src/lib/sync/league-sync';
import { firebaseConfig } from '../src/firebase/config';

async function main() {
  console.log('🏒 Spouštím synchronizaci statistik z webu ligy (hobbyhokejbrno.cz)...');
  
  // 1. Fetch data from website
  const scrapedData = await fetchLeagueData();
  console.log(`✓ Staženo: ${scrapedData.standings.length} týmů v tabulce, ${scrapedData.acesMatches.length} zápasů Aces, ${scrapedData.acesSkaters.length} hráčů Aces, ${scrapedData.acesGoalies.length} brankářů Aces.`);

  // 2. Initialize Firebase
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

  // Sign in as admin to satisfy security rules (isAdmin())
  const rawEmail = process.env.SYNC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'janmlcak6@gmail.com';
  const rawPassword = process.env.SYNC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'heslo123';
  const adminEmail = rawEmail.trim();
  const adminPassword = rawPassword.trim();

  if (adminEmail && adminPassword) {
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log(`🔑 Úspěšně přihlášen jako admin (${adminEmail})`);
    } catch (e: any) {
      if (!useEmulators) {
        console.error(`❌ Chyba přihlášení administrátora (${adminEmail}): ${e.message}`);
        console.error('👉 TIP: Pro běh v GitHub Actions je potřeba v repositáři (Settings > Secrets and variables > Actions) nastavit secret SYNC_ADMIN_PASSWORD odpovídající heslu administrátorského účtu.');
      } else {
        console.warn('Upozornění: přihlášení admina se nezdařilo, pokračuji bez autentizace:', e.message);
      }
    }
  }

  // 3. Sync to Firestore
  console.log('💾 Zapisuji data do Firestore...');
  const result = await syncLeagueToFirestore(firestore, scrapedData);

  if (result.success) {
    console.log('🎉 Synchronizace úspěšně dokončena:');
    console.log(`   - Tabulka ligy: ${result.standingsCount} týmů`);
    console.log(`   - Zápasy vytvořeny: ${result.matchesCreated}, aktualizovány: ${result.matchesUpdated}`);
    console.log(`   - Statistiky hráčů: ${result.skatersUpdated} hráčů`);
    console.log(`   - Statistiky brankářů: ${result.goaliesUpdated} brankářů`);
  } else {
    console.error('⚠️ Synchronizace proběhla s chybami:');
    result.errors?.forEach(e => console.error('   ✗', e));
  }

  process.exit(result.success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatální chyba při synchronizaci:', err);
  process.exit(1);
});
