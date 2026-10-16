import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "fake-api-key-for-emulator",
  authDomain: "localhost",
  projectId: "studio-5302559568-aa7d4",
  storageBucket: "studio-5302559568-aa7d4.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:emulator",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Připojení k lokálním emulátorům
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(firestore, '127.0.0.1', 8080);

interface SeedPlayer {
  email: string;
  name: string;
  role: 'admin' | 'classic';
  playerType: 'player' | 'goalie' | 'member';
  jerseyNumber?: number;
  phoneNumber: string;
  dob: string;
  stats?: {
    g: number;
    a: number;
    gp: number;
  };
  goalieStats?: {
    gp: number;
    w: number;
    sa: number;
    sv: number;
    so: number;
  };
}

const SEED_USERS: SeedPlayer[] = [
  {
    email: 'janmlcak6@gmail.com',
    name: 'Jan Mlčák',
    role: 'admin',
    playerType: 'player',
    jerseyNumber: 10,
    phoneNumber: '+420 777 123 456',
    dob: '1994-05-15',
    stats: { g: 8, a: 11, gp: 14 }
  },
  {
    email: 'martin.novak@aces.cz',
    name: 'Martin Novák',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 17,
    phoneNumber: '+420 777 222 111',
    dob: '1996-03-12',
    stats: { g: 7, a: 9, gp: 14 }
  },
  {
    email: 'petr.dvorak@aces.cz',
    name: 'Petr Dvořák',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 88,
    phoneNumber: '+420 777 333 222',
    dob: '1995-11-20',
    stats: { g: 12, a: 15, gp: 14 }
  },
  {
    email: 'tomas.svoboda@aces.cz',
    name: 'Tomáš Svoboda',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 68,
    phoneNumber: '+420 777 444 333',
    dob: '1998-07-04',
    stats: { g: 14, a: 8, gp: 13 }
  },
  {
    email: 'lukas.cerny@aces.cz',
    name: 'Lukáš Černý',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 4,
    phoneNumber: '+420 777 555 444',
    dob: '1993-01-29',
    stats: { g: 3, a: 12, gp: 14 }
  },
  {
    email: 'jakub.prochazka@aces.cz',
    name: 'Jakub Procházka',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 24,
    phoneNumber: '+420 777 666 555',
    dob: '1997-09-18',
    stats: { g: 2, a: 7, gp: 12 }
  },
  {
    email: 'filip.kucera@aces.cz',
    name: 'Filip Kučera',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 11,
    phoneNumber: '+420 777 777 666',
    dob: '1999-04-05',
    stats: { g: 5, a: 4, gp: 14 }
  },
  {
    email: 'ondrej.vesely@aces.cz',
    name: 'Ondřej Veselý',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 21,
    phoneNumber: '+420 777 888 777',
    dob: '1995-08-14',
    stats: { g: 4, a: 6, gp: 13 }
  },
  {
    email: 'david.horak@aces.cz',
    name: 'David Horák',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 91,
    phoneNumber: '+420 777 999 888',
    dob: '2000-02-23',
    stats: { g: 6, a: 3, gp: 11 }
  },
  {
    email: 'michal.nemec@aces.cz',
    name: 'Michal Němec',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 7,
    phoneNumber: '+420 776 111 222',
    dob: '1992-12-10',
    stats: { g: 1, a: 8, gp: 14 }
  },
  {
    email: 'jan.pospisil@aces.cz',
    name: 'Jan Pospíšil',
    role: 'classic',
    playerType: 'player',
    jerseyNumber: 55,
    phoneNumber: '+420 776 222 333',
    dob: '1994-06-30',
    stats: { g: 2, a: 5, gp: 10 }
  },
  {
    email: 'pavel.sedlacek@aces.cz',
    name: 'Pavel Sedláček',
    role: 'classic',
    playerType: 'goalie',
    jerseyNumber: 1,
    phoneNumber: '+420 776 333 444',
    dob: '1995-04-18',
    goalieStats: { gp: 10, w: 8, sa: 285, sv: 262, so: 2 }
  },
  {
    email: 'jiri.benes@aces.cz',
    name: 'Jiří Beneš',
    role: 'classic',
    playerType: 'goalie',
    jerseyNumber: 33,
    phoneNumber: '+420 776 444 555',
    dob: '1999-12-03',
    goalieStats: { gp: 4, w: 3, sa: 110, sv: 99, so: 1 }
  },
  {
    email: 'karel.fiala@aces.cz',
    name: 'Karel Fiala',
    role: 'classic',
    playerType: 'member',
    phoneNumber: '+420 776 555 666',
    dob: '1980-02-14'
  }
];

async function seed() {
  console.log('🚀 Začíná nahrávání vývojových dat do Firebase emulátorů...');
  const userMap: Record<string, { uid: string; player: SeedPlayer }> = {};

  for (const p of SEED_USERS) {
    try {
      let uid = '';
      try {
        const uc = await createUserWithEmailAndPassword(auth, p.email, 'heslo123');
        uid = uc.user.uid;
        await updateProfile(uc.user, { displayName: p.name });
      } catch (e: any) {
        // Pokud uživatel již existuje v emulátoru, přihlásíme se pro získání skutečného UID a oprávnění
        try {
          const sc = await signInWithEmailAndPassword(auth, p.email, 'heslo123');
          uid = sc.user.uid;
        } catch (signErr: any) {
          uid = `dev-${p.email.replace(/[@.]/g, '-')}`;
        }
      }

      userMap[p.email] = { uid, player: p };

      // Vytvoření /users/{uid}
      await setDoc(doc(firestore, 'users', uid), {
        id: uid,
        name: p.name,
        email: p.email,
        role: p.role,
        playerType: p.playerType,
        jerseyNumber: p.jerseyNumber || null,
        phoneNumber: p.phoneNumber,
        dob: p.dob,
        photoURL: `https://picsum.photos/seed/${p.email}/200/200`
      });

      console.log(`  ✓ Uživatel vytvořen: ${p.name} (${p.email}) - heslo: heslo123`);
    } catch (err: any) {
      console.error(`  ✗ Chyba při vytváření uživatele ${p.email}:`, err.message);
    }
  }

  // Přihlášení pod administrátorem, aby prošly autorizované zápisy statistik a ligy (dle firestore.rules)
  console.log('🔑 Přihlašuji administrátora (janmlcak6@gmail.com)...');
  await signInWithEmailAndPassword(auth, 'janmlcak6@gmail.com', 'heslo123');

  console.log('📊 Ukládám statistiky hráčů a brankářů (jako admin)...');
  for (const p of SEED_USERS) {
    const u = userMap[p.email];
    if (!u) continue;

    // Statistiky hráčů
    if (p.playerType === 'player' && p.stats) {
      await setDoc(doc(firestore, 'users', u.uid, 'skaterStats', 'stats'), {
        userProfileId: u.uid,
        seasonGoals: p.stats.g,
        seasonAssists: p.stats.a,
        seasonGamesPlayed: p.stats.gp,
        playoffGoals: 0,
        playoffAssists: 0,
        playoffGamesPlayed: 0,
        historicalGoals: p.stats.g + 15,
        historicalAssists: p.stats.a + 22,
        historicalGamesPlayed: p.stats.gp + 35,
      });
    }

    // Statistiky brankářů
    if (p.playerType === 'goalie' && p.goalieStats) {
      await setDoc(doc(firestore, 'users', u.uid, 'goalieStats', 'stats'), {
        userProfileId: u.uid,
        seasonGamesPlayed: p.goalieStats.gp,
        seasonWins: p.goalieStats.w,
        seasonShotsAgainst: p.goalieStats.sa,
        seasonSaves: p.goalieStats.sv,
        seasonSO: p.goalieStats.so,
        playoffGamesPlayed: 0,
        playoffWins: 0,
        playoffShotsAgainst: 0,
        playoffSaves: 0,
        playoffSO: 0,
        historicalGamesPlayed: p.goalieStats.gp + 25,
        historicalWins: p.goalieStats.w + 18,
        historicalShotsAgainst: p.goalieStats.sa + 650,
        historicalSaves: p.goalieStats.sv + 590,
        historicalSO: p.goalieStats.so + 3,
      });
    }
  }

  // Ligová nastavení
  console.log('🏆 Ukládám ligovou tabulku a nastavení...');
  await setDoc(doc(firestore, 'settings', 'league'), {
    id: 'league',
    currentSeasonId: '2025-2026',
    currentSeasonName: 'Krajská liga 2025/2026',
    isPlayoffEnabled: false,
    isScoringInPlayoffMode: false,
    leagueStandings: [
      { id: 'aces', name: 'HC Aces', points: 18, gf: 42, ga: 21 },
      { id: 'medvedi', name: 'HC Medvědi', points: 15, gf: 38, ga: 24 },
      { id: 'predators', name: 'HC Predators', points: 12, gf: 35, ga: 29 },
      { id: 'vlci', name: 'HC Vlci', points: 11, gf: 30, ga: 31 },
      { id: 'blesk', name: 'HC Blesk', points: 9, gf: 28, ga: 33 },
      { id: 'sokol', name: 'TJ Sokol', points: 7, gf: 22, ga: 34 },
      { id: 'srsni', name: 'HC Sršni', points: 5, gf: 19, ga: 38 },
      { id: 'ledoborci', name: 'HC Ledoborci', points: 3, gf: 15, ga: 40 },
    ],
    playoffSeries: [
      { round: 'Čtvrtfinále', opponent: 'HC Ledoborci', wins: 0, losses: 0 },
      { round: 'Semifinále', opponent: 'TBD', wins: 0, losses: 0 },
      { round: 'Finále', opponent: 'TBD', wins: 0, losses: 0 },
    ],
    leagueSkaters: [
      { rank: 1, name: 'J. Medvědovský', club: 'HC Medvědi', gamesPlayed: 12, goals: 11, assists: 7, points: 18 },
      { rank: 2, name: 'K. Brhlík', club: 'HC Medvědi', gamesPlayed: 11, goals: 7, assists: 9, points: 16 },
      { rank: 3, name: 'M. Tlapa', club: 'HC Medvědi', gamesPlayed: 10, goals: 6, assists: 8, points: 14 },
      { rank: 4, name: 'P. Dravý', club: 'HC Predators', gamesPlayed: 12, goals: 9, assists: 6, points: 15 },
      { rank: 5, name: 'R. Kousavý', club: 'HC Predators', gamesPlayed: 11, goals: 7, assists: 7, points: 14 },
      { rank: 6, name: 'V. Rychlý', club: 'HC Vlci', gamesPlayed: 12, goals: 8, assists: 5, points: 13 },
    ]
  });

  // Uložení archivované sezóny (2024/2025) pro ověření přepínání ročníků
  console.log('📜 Ukládám archivovanou sezónu 2024/2025...');
  const archivedSeason2024 = {
    id: 'season-2024-2025',
    name: 'Beginners Liga 2024/2025',
    year: '2024/25',
    teamCount: 8,
    archivedAt: Timestamp.fromDate(new Date('2025-04-10')),
    standings: [
      { id: 'aces', name: 'HC Aces', points: 22, gf: 54, ga: 18, gp: 14, w: 11, d: 0, l: 3 },
      { id: 'sjety-gumy', name: 'Sjetý Gumy', points: 19, gf: 46, ga: 24, gp: 14, w: 9, d: 1, l: 4 },
      { id: 'all-in', name: 'ALL IN', points: 16, gf: 40, ga: 30, gp: 14, w: 8, d: 0, l: 6 },
      { id: 'predators', name: 'HC Predators', points: 14, gf: 38, ga: 35, gp: 14, w: 7, d: 0, l: 7 },
      { id: 'gentlemens', name: 'Gentlemen´s', points: 10, gf: 28, ga: 42, gp: 14, w: 5, d: 0, l: 9 },
      { id: 'divocaci', name: 'Divočáci', points: 8, gf: 22, ga: 48, gp: 14, w: 4, d: 0, l: 10 },
    ],
    playoffSeries: [
      { round: 'Čtvrtfinále', opponent: 'Gentlemen´s', wins: 2, losses: 0 },
      { round: 'Semifinále', opponent: 'ALL IN', wins: 2, losses: 1 },
      { round: 'Finále', opponent: 'Sjetý Gumy', wins: 2, losses: 0 },
    ],
    skaterStats: [
      { userProfileId: userMap['janmlcak6@gmail.com']?.uid, name: 'Jan Mlčák', regularGoals: 7, regularAssists: 10, totalPoints: 17, regularGamesPlayed: 14, rank: 1 },
      { userProfileId: userMap['petr.dvorak@aces.cz']?.uid, name: 'Petr Dvořák', regularGoals: 11, regularAssists: 13, totalPoints: 24, regularGamesPlayed: 14, rank: 2 },
      { userProfileId: userMap['tomas.svoboda@aces.cz']?.uid, name: 'Tomáš Svoboda', regularGoals: 13, regularAssists: 7, totalPoints: 20, regularGamesPlayed: 13, rank: 3 },
      { userProfileId: userMap['martin.novak@aces.cz']?.uid, name: 'Martin Novák', regularGoals: 6, regularAssists: 8, totalPoints: 14, regularGamesPlayed: 14, rank: 4 },
    ],
    goalieStats: [
      { userProfileId: userMap['pavel.sedlacek@aces.cz']?.uid, name: 'Pavel Sedláček', gamesPlayed: 10, wins: 8, saves: 262, shotsAgainst: 285, savePercentage: 91.9, shutouts: 2 },
    ],
    matches: [
      { id: 'm-prev-1', round: 1, team1: 'HC Aces', team2: 'Gentlemen´s', team1Score: 5, team2Score: 1, location: 'Moutnice', date: '10. 10. 2024' },
      { id: 'm-prev-2', round: 2, team1: 'HC Aces', team2: 'ALL IN', team1Score: 4, team2Score: 2, location: 'Úvoz', date: '17. 10. 2024' },
      {
        id: 'm-prev-medvedi',
        round: 3,
        team1: 'HC Aces',
        team2: 'HC Medvědi',
        team1Score: 5,
        team2Score: 3,
        location: 'Aces Aréna',
        date: '12. 1. 2025',
        scorers: [
          { goal: userMap['janmlcak6@gmail.com']?.uid, assist: userMap['petr.dvorak@aces.cz']?.uid },
          { goal: userMap['janmlcak6@gmail.com']?.uid, assist: userMap['tomas.svoboda@aces.cz']?.uid },
          { goal: userMap['petr.dvorak@aces.cz']?.uid, assist: userMap['janmlcak6@gmail.com']?.uid },
        ],
      },
      { id: 'm-prev-final', round: 4, team1: 'HC Aces', team2: 'Sjetý Gumy', team1Score: 7, team2Score: 3, location: 'Moutnice', date: '25. 3. 2025' },
    ]
  };
  await setDoc(doc(firestore, 'seasons', archivedSeason2024.id), archivedSeason2024);

  // Uložení odehraných a nadcházejících zápasů
  console.log('🏒 Ukládám zápasy a docházku...');
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Zápas odehraný (1. kolo)
  const match1Id = 'match-1-regular';
  await setDoc(doc(firestore, 'matches', match1Id), {
    id: match1Id,
    seasonId: '2025-2026',
    dateTime: Timestamp.fromMillis(now - 7 * dayMs),
    location: 'Zimní stadion Aces Aréna',
    team1: 'HC Aces',
    team2: 'HC Predators',
    isPlayed: true,
    isStatsExported: true,
    type: 'regular',
    round: 1,
    team1Score: 6,
    team2Score: 3,
    mvpVotes: {
      [userMap['petr.dvorak@aces.cz']?.uid || 'v1']: userMap['janmlcak6@gmail.com']?.uid || '',
      [userMap['tomas.svoboda@aces.cz']?.uid || 'v2']: userMap['janmlcak6@gmail.com']?.uid || '',
      [userMap['martin.novak@aces.cz']?.uid || 'v3']: userMap['janmlcak6@gmail.com']?.uid || '',
      [userMap['janmlcak6@gmail.com']?.uid || 'v4']: userMap['petr.dvorak@aces.cz']?.uid || '',
    },
    starsVotes: {
      [userMap['petr.dvorak@aces.cz']?.uid || 'v1']: {
        star1: userMap['janmlcak6@gmail.com']?.uid || '',
        star2: userMap['tomas.svoboda@aces.cz']?.uid || '',
        star3: userMap['martin.novak@aces.cz']?.uid || '',
        votedAt: new Date(now - 7 * dayMs + 80 * 60 * 1000).toISOString(),
      },
      [userMap['tomas.svoboda@aces.cz']?.uid || 'v2']: {
        star1: userMap['janmlcak6@gmail.com']?.uid || '',
        star2: userMap['petr.dvorak@aces.cz']?.uid || '',
        star3: userMap['pavel.sedlacek@aces.cz']?.uid || '',
        votedAt: new Date(now - 7 * dayMs + 90 * 60 * 1000).toISOString(),
      },
      [userMap['martin.novak@aces.cz']?.uid || 'v3']: {
        star1: userMap['janmlcak6@gmail.com']?.uid || '',
        star2: userMap['pavel.sedlacek@aces.cz']?.uid || '',
        star3: userMap['petr.dvorak@aces.cz']?.uid || '',
        votedAt: new Date(now - 7 * dayMs + 95 * 60 * 1000).toISOString(),
      },
      [userMap['janmlcak6@gmail.com']?.uid || 'v4']: {
        star1: userMap['petr.dvorak@aces.cz']?.uid || '',
        star2: userMap['tomas.svoboda@aces.cz']?.uid || '',
        star3: userMap['pavel.sedlacek@aces.cz']?.uid || '',
        votedAt: new Date(now - 7 * dayMs + 100 * 60 * 1000).toISOString(),
      },
    },
    scorers: [
      { goal: userMap['janmlcak6@gmail.com']?.uid, assist: userMap['petr.dvorak@aces.cz']?.uid },
      { goal: userMap['petr.dvorak@aces.cz']?.uid, assist: userMap['tomas.svoboda@aces.cz']?.uid },
      { goal: userMap['tomas.svoboda@aces.cz']?.uid, assist: userMap['martin.novak@aces.cz']?.uid },
      { goal: userMap['janmlcak6@gmail.com']?.uid, assist: userMap['lukas.cerny@aces.cz']?.uid },
      { goal: userMap['martin.novak@aces.cz']?.uid, assist: userMap['janmlcak6@gmail.com']?.uid },
      { goal: userMap['filip.kucera@aces.cz']?.uid, assist: null },
    ],
    goalieId: userMap['pavel.sedlacek@aces.cz']?.uid,
    goalieSaves: 29,
    goalieShotsAgainst: 32,
    lineup: {
      LK1: { id: userMap['martin.novak@aces.cz']?.uid, name: 'Martin Novák', jerseyNumber: 17 },
      C1: { id: userMap['petr.dvorak@aces.cz']?.uid, name: 'Petr Dvořák', jerseyNumber: 88 },
      PK1: { id: userMap['tomas.svoboda@aces.cz']?.uid, name: 'Tomáš Svoboda', jerseyNumber: 68 },
      LO1: { id: userMap['lukas.cerny@aces.cz']?.uid, name: 'Lukáš Černý', jerseyNumber: 4 },
      PO1: { id: userMap['jakub.prochazka@aces.cz']?.uid, name: 'Jakub Procházka', jerseyNumber: 24 },
      LK2: { id: userMap['filip.kucera@aces.cz']?.uid, name: 'Filip Kučera', jerseyNumber: 11 },
      C2: { id: userMap['janmlcak6@gmail.com']?.uid, name: 'Jan Mlčák', jerseyNumber: 10 },
      PK2: { id: userMap['ondrej.vesely@aces.cz']?.uid, name: 'Ondřej Veselý', jerseyNumber: 21 },
      LO2: { id: userMap['michal.nemec@aces.cz']?.uid, name: 'Michal Němec', jerseyNumber: 7 },
      PO2: { id: userMap['jan.pospisil@aces.cz']?.uid, name: 'Jan Pospíšil', jerseyNumber: 55 },
      LK3: { id: userMap['david.horak@aces.cz']?.uid, name: 'David Horák', jerseyNumber: 91 },
      C3: null,
      PK3: null,
      B1: { id: userMap['pavel.sedlacek@aces.cz']?.uid, name: 'Pavel Sedláček', jerseyNumber: 1 }
    }
  });

  // 2. Zápas odehraný (2. kolo)
  const match2Id = 'match-2-regular';
  await setDoc(doc(firestore, 'matches', match2Id), {
    id: match2Id,
    seasonId: '2025-2026',
    dateTime: Timestamp.fromMillis(now - 3 * dayMs),
    location: 'Zimní stadion Vlčí Doupě',
    team1: 'HC Aces',
    team2: 'HC Vlci',
    isPlayed: true,
    isStatsExported: true,
    type: 'regular',
    round: 2,
    team1Score: 4,
    team2Score: 2,
    mvpVotes: {
      [userMap['janmlcak6@gmail.com']?.uid || 'v1']: userMap['tomas.svoboda@aces.cz']?.uid || '',
      [userMap['petr.dvorak@aces.cz']?.uid || 'v2']: userMap['tomas.svoboda@aces.cz']?.uid || '',
      [userMap['martin.novak@aces.cz']?.uid || 'v3']: userMap['pavel.sedlacek@aces.cz']?.uid || '',
    },
    starsVotes: {
      [userMap['janmlcak6@gmail.com']?.uid || 'v1']: {
        star1: userMap['tomas.svoboda@aces.cz']?.uid || '',
        star2: userMap['pavel.sedlacek@aces.cz']?.uid || '',
        star3: userMap['petr.dvorak@aces.cz']?.uid || '',
        votedAt: new Date(now - 3 * dayMs + 80 * 60 * 1000).toISOString(),
      },
      [userMap['petr.dvorak@aces.cz']?.uid || 'v2']: {
        star1: userMap['tomas.svoboda@aces.cz']?.uid || '',
        star2: userMap['janmlcak6@gmail.com']?.uid || '',
        star3: userMap['pavel.sedlacek@aces.cz']?.uid || '',
        votedAt: new Date(now - 3 * dayMs + 85 * 60 * 1000).toISOString(),
      },
      [userMap['martin.novak@aces.cz']?.uid || 'v3']: {
        star1: userMap['pavel.sedlacek@aces.cz']?.uid || '',
        star2: userMap['tomas.svoboda@aces.cz']?.uid || '',
        star3: userMap['janmlcak6@gmail.com']?.uid || '',
        votedAt: new Date(now - 3 * dayMs + 90 * 60 * 1000).toISOString(),
      },
    },
    scorers: [
      { goal: userMap['tomas.svoboda@aces.cz']?.uid, assist: userMap['petr.dvorak@aces.cz']?.uid },
      { goal: userMap['petr.dvorak@aces.cz']?.uid, assist: null },
      { goal: userMap['janmlcak6@gmail.com']?.uid, assist: userMap['martin.novak@aces.cz']?.uid },
      { goal: userMap['tomas.svoboda@aces.cz']?.uid, assist: userMap['janmlcak6@gmail.com']?.uid },
    ],
    goalieId: userMap['pavel.sedlacek@aces.cz']?.uid,
    goalieSaves: 31,
    goalieShotsAgainst: 33,
  });

  // 2b. Zápas odehraný před 2 hodinami - čeká na oficiální zápis z webu ligy!
  const matchAwaitingId = 'match-awaiting-result';
  await setDoc(doc(firestore, 'matches', matchAwaitingId), {
    id: matchAwaitingId,
    seasonId: '2025-2026',
    dateTime: Timestamp.fromMillis(now - 2 * 3600 * 1000), // Před 2 hodinami (dohráno, >75 min)
    location: 'Zimní stadion Medvědí doupě',
    team1: 'HC Aces',
    team2: 'HC Vlci',
    isPlayed: false,
    type: 'regular',
    round: 3,
    starsVotes: {
      [userMap['janmlcak6@gmail.com']?.uid || 'v1']: {
        star1: userMap['tomas.svoboda@aces.cz']?.uid || '',
        star2: userMap['petr.dvorak@aces.cz']?.uid || '',
        star3: userMap['martin.novak@aces.cz']?.uid || '',
        votedAt: new Date(now - 2 * 3600 * 1000 + 80 * 60 * 1000).toISOString(),
      },
      [userMap['petr.dvorak@aces.cz']?.uid || 'v2']: {
        star1: userMap['janmlcak6@gmail.com']?.uid || '',
        star2: userMap['tomas.svoboda@aces.cz']?.uid || '',
        star3: userMap['pavel.sedlacek@aces.cz']?.uid || '',
        votedAt: new Date(now - 2 * 3600 * 1000 + 85 * 60 * 1000).toISOString(),
      },
    },
  });

  // 3. Nadcházející zápas (4. kolo - nejbližší v kalendáři)
  const match3Id = 'match-3-upcoming';
  await setDoc(doc(firestore, 'matches', match3Id), {
    id: match3Id,
    seasonId: '2025-2026',
    dateTime: Timestamp.fromMillis(now + 3 * dayMs + 19 * 3600 * 1000), // Za 3 dny v 19:00
    location: 'Aces Aréna, Hala 1',
    team1: 'HC Aces',
    team2: 'HC Medvědi',
    isPlayed: false,
    type: 'regular',
    round: 4,
  });

  // Docházka pro zápas 3
  const attendances = [
    { email: 'janmlcak6@gmail.com', status: 'going', note: 'Budu na zimáku v 18:15' },
    { email: 'martin.novak@aces.cz', status: 'going', note: '' },
    { email: 'petr.dvorak@aces.cz', status: 'going', note: '' },
    { email: 'tomas.svoboda@aces.cz', status: 'going', note: 'Beru náhradní pásku' },
    { email: 'lukas.cerny@aces.cz', status: 'not-going', note: 'Zranění kotníku z tréninku' },
    { email: 'jakub.prochazka@aces.cz', status: 'going', note: '' },
    { email: 'pavel.sedlacek@aces.cz', status: 'going', note: 'Nová lapačka připravena' },
    { email: 'jiri.benes@aces.cz', status: 'going', note: 'Kryju záda na střídačce' },
  ];

  for (const a of attendances) {
    const u = userMap[a.email];
    if (u) {
      await setDoc(doc(firestore, 'matches', match3Id, 'attendees', u.uid), {
        id: u.uid,
        userId: u.uid,
        matchId: match3Id,
        status: a.status,
        note: a.note,
      });
      await setDoc(doc(firestore, 'matches', matchAwaitingId, 'attendees', u.uid), {
        id: u.uid,
        userId: u.uid,
        matchId: matchAwaitingId,
        status: a.status,
        note: a.note,
      });
    }
  }

  // Notifikace pro admina a hráče
  const adminUid = userMap['janmlcak6@gmail.com']?.uid;
  if (adminUid) {
    await setDoc(doc(firestore, 'users', adminUid, 'notifications', 'notif-1'), {
      id: 'notif-1',
      title: 'Vypsán zápas: 3. kolo',
      message: 'Zápas proti HC Medvědi v Aces Aréně. Zapiš svou docházku!',
      type: 'match_new',
      createdAt: Timestamp.now(),
      read: false,
      matchId: match3Id,
    });
    await setDoc(doc(firestore, 'users', adminUid, 'notifications', 'notif-2'), {
      id: 'notif-2',
      title: 'Schválena sestava na zápas',
      message: 'Trenér potvrdil rozestavení hráčů pro nadcházející utkání.',
      type: 'lineup_added',
      createdAt: Timestamp.fromMillis(now - 3600 * 1000),
      read: false,
      matchId: match3Id,
    });
  }

  console.log('\n🎉 Hotovo! Vývojová data byla úspěšně nahrána.');
  console.log('👉 Hlavní přihlašovací účet (Admin):');
  console.log('   Email: janmlcak6@gmail.com');
  console.log('   Heslo: heslo123');
  console.log('👉 Hráčský účet:');
  console.log('   Email: petr.dvorak@aces.cz');
  console.log('   Heslo: heslo123');
  process.exit(0);
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
