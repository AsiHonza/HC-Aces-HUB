import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDocs, collection, Timestamp } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import * as admin from 'firebase-admin';
import { firebaseConfig } from '../src/firebase/config';
import snapshotData from '../src/data/historical-stats-snapshot.json';

function cleanCredential(val?: string): string {
  if (!val) return '';
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function normalizeTokens(str: string): string[] {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function arePlayerNamesMatching(nameA: string, nameB: string): boolean {
  const tokensA = normalizeTokens(nameA);
  const tokensB = normalizeTokens(nameB);

  if (tokensA.length === tokensB.length && tokensA.every((t) => tokensB.includes(t))) {
    return true;
  }

  const has = (tokens: string[], term: string) => tokens.includes(term);

  if (has(tokensA, 'tzimas') && has(tokensB, 'tzimas')) return true;
  if (
    (has(tokensA, 'toncek') && (has(tokensB, 'bednar') || has(tokensB, 'antonin'))) ||
    (has(tokensB, 'toncek') && (has(tokensA, 'bednar') || has(tokensA, 'antonin')))
  ) {
    return true;
  }
  if (has(tokensA, 'bara') && has(tokensB, 'bara')) return true;
  if (has(tokensA, 'dufek') && has(tokensB, 'dufek')) return true;

  if (tokensA.length >= 2 && tokensB.length >= 2) {
    const surnameA = tokensA[tokensA.length - 1];
    const surnameB = tokensB[tokensB.length - 1];
    if (surnameA === surnameB && tokensA[0][0] === tokensB[0][0]) {
      return true;
    }
  }

  return false;
}

function getServiceAccount(): any | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GCP_SA_KEY;
  if (!raw) return null;
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.trim().startsWith('{')) return JSON.parse(decoded);
  } catch (e: any) {
    console.warn('⚠️ Nepodařilo se naparsovat FIREBASE_SERVICE_ACCOUNT:', e.message);
  }
  return null;
}

async function restoreViaAdmin(adminDb: admin.firestore.Firestore) {
  console.log('🛡️ Obnovuji historické statistiky přes Firebase Admin SDK...');
  const usersSnap = await adminDb.collection('users').get();
  const existingUsers: any[] = [];
  usersSnap.forEach((d) => existingUsers.push({ id: d.id, ...d.data() }));
  console.log(`✓ Načteno ${existingUsers.length} existujících uživatelů.`);

  let skatersUpdated = 0;
  let goaliesUpdated = 0;
  let skippedUnregisteredCount = 0;

  function findUser(name: string) {
    return existingUsers.find((u) => !String(u.id).startsWith('player-') && !String(u.id).startsWith('goalie-') && u.name && arePlayerNamesMatching(u.name, name));
  }

  // 1. Skaters
  console.log(`📋 Zapisuji ${snapshotData.skaters.length} hráčů do pole...`);
  for (const skater of snapshotData.skaters) {
    let user = findUser(skater.name);
    if (!user) {
      skippedUnregisteredCount++;
      continue;
    }

    const normName = (user.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (normName === 'toncek' || normName.includes('toncek')) {
      await adminDb.doc(`users/${user.id}`).set({ name: 'Antonín Bednář' }, { merge: true });
      user.name = 'Antonín Bednář';
    }

    await adminDb.doc(`users/${user.id}/skaterStats/stats`).set(
      {
        userProfileId: user.id,
        historicalGamesPlayed: skater.gamesPlayed,
        historicalGoals: skater.goals,
        historicalAssists: skater.assists,
        historicalPenaltyMinutes: skater.penaltyMinutes,
        historicalSnapshotVersion: snapshotData.version,
        historicalSnapshotAt: snapshotData.generatedAt,
        lastHistoricalRestoreAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );
    skatersUpdated++;
  }

  // 2. Goalies
  console.log(`🧤 Zapisuji ${snapshotData.goalies.length} brankářů...`);
  for (const goalie of snapshotData.goalies) {
    let user = findUser(goalie.name);
    if (!user) {
      skippedUnregisteredCount++;
      continue;
    }

    if (user.playerType !== 'goalie') {
      await adminDb.doc(`users/${user.id}`).set({ playerType: 'goalie' }, { merge: true });
      user.playerType = 'goalie';
    }

    await adminDb.doc(`users/${user.id}/goalieStats/stats`).set(
      {
        userProfileId: user.id,
        historicalGamesPlayed: goalie.gamesPlayed,
        historicalWins: goalie.wins,
        historicalLosses: goalie.losses,
        historicalDraws: goalie.draws,
        historicalSaves: goalie.saves,
        historicalShotsAgainst: goalie.shotsAgainst,
        historicalGoalsAgainst: goalie.goalsAgainst,
        historicalSavePercentage: goalie.savePercentage,
        historicalSO: goalie.shutouts,
        historicalSnapshotVersion: snapshotData.version,
        historicalSnapshotAt: snapshotData.generatedAt,
        lastHistoricalRestoreAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );
    goaliesUpdated++;
  }

  // 3. Settings snapshot document
  await adminDb.doc('settings/historicalStatsSnapshot').set(
    {
      version: snapshotData.version,
      generatedAt: snapshotData.generatedAt,
      description: snapshotData.description,
      teamTotals: snapshotData.teamTotals,
      skatersCount: snapshotData.skaters.length,
      goaliesCount: snapshotData.goalies.length,
      appliedAt: admin.firestore.Timestamp.now(),
      appliedSummary: { skatersUpdated, goaliesUpdated, skippedUnregisteredCount, newUsersCreated: 0 },
    },
    { merge: true }
  );

  console.log('🎉 Hotovo! Oficiální snapshot byl úspěšně nahrán do databáze:');
  console.log(`   - Aktualizováno hráčů: ${skatersUpdated}`);
  console.log(`   - Aktualizováno brankářů: ${goaliesUpdated}`);
  console.log(`   - Přeskočeno neregistrovaných: ${skippedUnregisteredCount}`);
}

async function restoreViaClient() {
  console.log('🌐 Obnovuji historické statistiky přes Firebase Client SDK...');
  const isCI = process.env.CI === 'true' || Boolean(process.env.GITHUB_ACTIONS);
  const useEmulators =
    !isCI &&
    (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
      process.env.USE_EMULATORS === 'true');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  if (useEmulators) {
    console.log('🔌 Připojeno k lokálním emulátorům');
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }

  const adminEmail = cleanCredential(process.env.SYNC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'janmlcak6@gmail.com');
  const adminPassword = cleanCredential(process.env.SYNC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'heslo123');

  if (adminEmail && adminPassword) {
    try {
      console.log(`🔐 Přihlašuji administrátora ${adminEmail}...`);
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log('🔑 Přihlášení úspěšné.');
    } catch (e: any) {
      console.warn('⚠️ Přihlášení selhalo:', e.message);
    }
  }

  const snap = await getDocs(collection(firestore, 'users'));
  const existingUsers: any[] = [];
  snap.forEach((d) => existingUsers.push({ id: d.id, ...d.data() }));
  console.log(`✓ Načteno ${existingUsers.length} uživatelů.`);

  function findUser(name: string) {
    return existingUsers.find((u) => !String(u.id).startsWith('player-') && !String(u.id).startsWith('goalie-') && u.name && arePlayerNamesMatching(u.name, name));
  }

  let skatersUpdated = 0;
  let goaliesUpdated = 0;
  let skippedUnregisteredCount = 0;

  for (const skater of snapshotData.skaters) {
    let user = findUser(skater.name);
    if (!user) {
      skippedUnregisteredCount++;
      continue;
    }

    const normName = (user.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (normName === 'toncek' || normName.includes('toncek')) {
      await setDoc(doc(firestore, 'users', user.id), { name: 'Antonín Bednář' }, { merge: true });
      user.name = 'Antonín Bednář';
    }

    await setDoc(
      doc(firestore, 'users', user.id, 'skaterStats', 'stats'),
      {
        userProfileId: user.id,
        historicalGamesPlayed: skater.gamesPlayed,
        historicalGoals: skater.goals,
        historicalAssists: skater.assists,
        historicalPenaltyMinutes: skater.penaltyMinutes,
        historicalSnapshotVersion: snapshotData.version,
        historicalSnapshotAt: snapshotData.generatedAt,
        lastHistoricalRestoreAt: Timestamp.now(),
      },
      { merge: true }
    );
    skatersUpdated++;
  }

  for (const goalie of snapshotData.goalies) {
    let user = findUser(goalie.name);
    if (!user) {
      skippedUnregisteredCount++;
      continue;
    }

    if (user.playerType !== 'goalie') {
      await setDoc(doc(firestore, 'users', user.id), { playerType: 'goalie' }, { merge: true });
      user.playerType = 'goalie';
    }

    await setDoc(
      doc(firestore, 'users', user.id, 'goalieStats', 'stats'),
      {
        userProfileId: user.id,
        historicalGamesPlayed: goalie.gamesPlayed,
        historicalWins: goalie.wins,
        historicalLosses: goalie.losses,
        historicalDraws: goalie.draws,
        historicalSaves: goalie.saves,
        historicalShotsAgainst: goalie.shotsAgainst,
        historicalGoalsAgainst: goalie.goalsAgainst,
        historicalSavePercentage: goalie.savePercentage,
        historicalSO: goalie.shutouts,
        historicalSnapshotVersion: snapshotData.version,
        historicalSnapshotAt: snapshotData.generatedAt,
        lastHistoricalRestoreAt: Timestamp.now(),
      },
      { merge: true }
    );
    goaliesUpdated++;
  }

  await setDoc(
    doc(firestore, 'settings', 'historicalStatsSnapshot'),
    {
      version: snapshotData.version,
      generatedAt: snapshotData.generatedAt,
      description: snapshotData.description,
      teamTotals: snapshotData.teamTotals,
      skatersCount: snapshotData.skaters.length,
      goaliesCount: snapshotData.goalies.length,
      appliedAt: Timestamp.now(),
      appliedSummary: { skatersUpdated, goaliesUpdated, skippedUnregisteredCount, newUsersCreated: 0 },
    },
    { merge: true }
  );

  console.log('🎉 Hotovo! Oficiální snapshot byl úspěšně nahrán do databáze:');
  console.log(`   - Aktualizováno hráčů: ${skatersUpdated}`);
  console.log(`   - Aktualizováno brankářů: ${goaliesUpdated}`);
  console.log(`   - Přeskočeno neregistrovaných: ${skippedUnregisteredCount}`);
}

async function main() {
  console.log('🏒 Zahajuji obnovu historických statistik ze snapshotu (stav k 14. 4. 2026)...');
  const serviceAccount = getServiceAccount();

  if (serviceAccount) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || firebaseConfig.projectId,
      });
    }
    await restoreViaAdmin(admin.firestore());
  } else {
    await restoreViaClient();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Chyba při obnově:', e);
    process.exit(1);
  });
