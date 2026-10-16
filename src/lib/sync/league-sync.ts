import { Firestore, doc, setDoc, getDoc, getDocs, collection, query, Timestamp, deleteDoc } from 'firebase/firestore';
import { ScrapedLeagueData, ScrapedMatch, ScrapedSkater, ScrapedGoalie } from './league-scraper';

export interface SyncResult {
  success: boolean;
  standingsCount: number;
  matchesCreated: number;
  matchesUpdated: number;
  skatersUpdated: number;
  goaliesUpdated: number;
  syncedAt: string;
  errors?: string[];
}

function normalizeNameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function areNamesMatching(nameA: string, nameB: string): boolean {
  const tokensA = normalizeNameTokens(nameA);
  const tokensB = normalizeNameTokens(nameB);

  if (tokensA.length !== tokensB.length) return false;
  return tokensA.every((t) => tokensB.includes(t));
}

function parseCzechDate(dateStr: string, timeStr = '18:00'): Date | null {
  const match = dateStr.match(/(\d+)\.\s*(\d+)\.\s*(\d{4})/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const year = parseInt(match[3], 10);

  const [hours, minutes] = (timeStr || '18:00').split(':').map((s) => parseInt(s, 10));
  return new Date(year, month, day, isNaN(hours) ? 18 : hours, isNaN(minutes) ? 0 : minutes, 0);
}

function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Timestamp || typeof (obj as any).toDate === 'function') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as any;
}

export async function syncLeagueToFirestore(
  firestore: Firestore,
  data: ScrapedLeagueData
): Promise<SyncResult> {
  const errors: string[] = [];
  let matchesCreated = 0;
  let matchesUpdated = 0;
  let skatersUpdated = 0;
  let goaliesUpdated = 0;

  console.log('   [1/5] Ukládám tabulku a statistiky do settings/league...');
  // 1. Sync Standings to settings/league
  try {
    const formattedStandings = data.standings.map((s) => ({
      id: s.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: s.name === 'Aces' ? 'HC Aces' : s.name,
      points: s.points,
      gf: s.gf,
      ga: s.ga,
      gp: s.gamesPlayed,
      w: s.wins,
      d: s.draws,
      l: s.losses,
    }));

    const leagueSettingsRef = doc(firestore, 'settings', 'league');
    console.log('   [1/5] Volám setDoc(settings/league)...');
    const leagueSettingsPayload = sanitizeForFirestore({
      leagueStandings: formattedStandings,
      leagueSkaters: data.allSkaters || [],
      lastSyncAt: Timestamp.now(),
      lastSyncSummary: {
        timestamp: new Date().toISOString(),
        standingsCount: formattedStandings.length,
        leagueSkatersCount: (data.allSkaters || []).length,
        acesMatchesCount: data.acesMatches.length,
        acesSkatersCount: data.acesSkaters.length,
        acesGoaliesCount: data.acesGoalies.length,
      },
    });
    await setDoc(leagueSettingsRef, leagueSettingsPayload, { merge: true });
    console.log('   [1/5] ✓ settings/league úspěšně uloženo.');
  } catch (err: any) {
    console.error('   [1/5] ✗ Chyba při ukládání tabulky:', err.message);
    errors.push(`Chyba při ukládání tabulky: ${err.message}`);
  }

  // 2. Fetch existing users for name matching
  console.log('   [2/5] Načítám existující uživatele...');
  const existingUsers: any[] = [];
  try {
    const userSnap = await getDocs(collection(firestore, 'users'));
    userSnap.forEach((d) => existingUsers.push({ id: d.id, ...d.data() }));
    console.log(`   [2/5] ✓ Načteno ${existingUsers.length} existujících uživatelů.`);
  } catch (err: any) {
    console.error('   [2/5] ✗ Chyba při načítání uživatelů:', err.message);
    errors.push(`Chyba při načítání uživatelů: ${err.message}`);
  }

  function findUserBySurname(surname: string) {
    if (!surname) return undefined;
    const cleanSurname = surname.replace(/\s*[A-Z]\.?$/g, ''); // strip " I." or " A."
    const norm = cleanSurname.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return existingUsers.find((u) => {
      if (!u.name) return false;
      const tokens = u.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/);
      return tokens.some((t: string) => t === norm || t.startsWith(norm));
    });
  }

  // 3. Fetch existing matches
  console.log('   [3/5] Načítám existující zápasy...');
  const existingMatches: any[] = [];
  try {
    const matchSnap = await getDocs(collection(firestore, 'matches'));
    matchSnap.forEach((d) => existingMatches.push({ id: d.id, ...d.data() }));
    console.log(`   [3/5] ✓ Načteno ${existingMatches.length} existujících zápasů.`);
  } catch (err: any) {
    console.error('   [3/5] ✗ Chyba při čtení zápasů:', err.message);
    errors.push(`Chyba při čtení zápasů: ${err.message}`);
  }

  // Sync Aces matches
  console.log(`   [3/5] Synchronizuji ${data.acesMatches.length} zápasů Aces...`);
  for (let i = 0; i < data.acesMatches.length; i++) {
    const scrapedMatch = data.acesMatches[i];
    try {
      console.log(`     -> [Zápas ${i + 1}/${data.acesMatches.length}] Kolo ${scrapedMatch.round}: ${scrapedMatch.team1} vs ${scrapedMatch.team2}`);
      const matchDate = parseCzechDate(scrapedMatch.dateStr, scrapedMatch.timeStr);
      const matchTimestamp = matchDate ? Timestamp.fromDate(matchDate) : Timestamp.now();

      const team1Formatted = scrapedMatch.team1 === 'Aces' ? 'HC Aces' : scrapedMatch.team1;
      const team2Formatted = scrapedMatch.team2 === 'Aces' ? 'HC Aces' : scrapedMatch.team2;

      // Inteligentní vyhledání existujícího zápasu:
      // 1. Shoda podle čísla kola (s tolerancí na string/number)
      // 2. Shoda podle soupeře a přibližného data (+- 3 dny)
      const scrapedOpponent = (scrapedMatch.team1 === 'Aces' || /aces/i.test(scrapedMatch.team1))
        ? scrapedMatch.team2
        : scrapedMatch.team1;
      const scrapedMatchTime = matchDate ? matchDate.getTime() : 0;

      const matchingCandidates = existingMatches.filter((m) => {
        // Shoda čísla kola
        if (m.round !== undefined && m.round !== null && Number(m.round) === Number(scrapedMatch.round)) {
          return true;
        }
        // Shoda soupeře a data
        const mTime = m.dateTime?.toDate ? m.dateTime.toDate().getTime() : (typeof m.dateTime === 'string' ? new Date(m.dateTime).getTime() : 0);
        const mOpponent = /aces/i.test(m.team1 || '') ? (m.team2 || '') : (m.team1 || '');
        const isSameOpponent = areNamesMatching(mOpponent, scrapedOpponent) ||
          mOpponent.toLowerCase().includes(scrapedOpponent.toLowerCase()) ||
          scrapedOpponent.toLowerCase().includes(mOpponent.toLowerCase());
        const isNearDate = scrapedMatchTime > 0 && mTime > 0 && Math.abs(mTime - scrapedMatchTime) < 3 * 24 * 60 * 60 * 1000;
        return isSameOpponent && isNearDate;
      });

      // Z kandidátů vybereme primární záznam:
      // Přednost má zápas, který byl již ručně odehrán (isPlayed === true), případně má skóre či hlasování
      const primaryExisting = matchingCandidates.sort((a, b) => {
        if (a.isPlayed && !b.isPlayed) return -1;
        if (!a.isPlayed && b.isPlayed) return 1;
        const aScore = (a.team1Score !== undefined ? 1 : 0) + (a.mvpVotes ? 1 : 0);
        const bScore = (b.team1Score !== undefined ? 1 : 0) + (b.mvpVotes ? 1 : 0);
        return bScore - aScore;
      })[0];
      const existing = primaryExisting;

      // BEZPEČNOSTNÍ OPATŘENÍ: Pokud existují jakékoliv další duplicitní záznamy pro tento zápas
      // (např. starý neuzavřený plánovaný zápas z předchozí verze, zatímco výsledek už je zapsán jinde),
      // odstraníme tyto duplikáty, aby v databázi nevznikaly kolize ani nevisel zápas v "čeká na oficiální zápis".
      const redundantDuplicates = matchingCandidates.filter((m) => m.id !== primaryExisting?.id);
      for (const dup of redundantDuplicates) {
        console.log(`     🧹 Odstraňuji duplicitní zápas (ID: ${dup.id}) pro kolo ${scrapedMatch.round}`);
        try {
          await deleteDoc(doc(firestore, 'matches', dup.id));
        } catch (delErr: any) {
          console.warn(`       Varování při mazání duplikátu ${dup.id}:`, delErr.message);
        }
      }

      // Find detailed match report from page29.html if available
      const report = (data.acesMatchReports || []).find((r) => r.round === scrapedMatch.round);

      const basePayload: Record<string, any> = {
        location: scrapedMatch.location || (existing?.location) || 'Aces Aréna',
        dateTime: matchTimestamp,
        team1: team1Formatted,
        team2: team2Formatted,
        isPlayed: scrapedMatch.isPlayed || Boolean(existing?.isPlayed),
        round: scrapedMatch.round,
        type: 'regular',
      };

      if (scrapedMatch.isPlayed && scrapedMatch.score1 !== undefined && scrapedMatch.score2 !== undefined) {
        basePayload.team1Score = scrapedMatch.score1;
        basePayload.team2Score = scrapedMatch.score2;
      } else if (existing?.team1Score !== undefined && existing?.team2Score !== undefined) {
        basePayload.team1Score = existing.team1Score;
        basePayload.team2Score = existing.team2Score;
      }

      if (report) {
        const isTeam1Aces = /aces/i.test(report.team1);
        const acesLineup = isTeam1Aces ? report.team1Lineup : report.team2Lineup;
        const opponentLineup = isTeam1Aces ? report.team2Lineup : report.team1Lineup;

        const shotsAces = isTeam1Aces ? (report.shots1 || 0) : (report.shots2 || 0);
        const shotsOpponent = isTeam1Aces ? (report.shots2 || 0) : (report.shots1 || 0);
        const penaltiesAces = isTeam1Aces ? (report.penalties1 || 0) : (report.penalties2 || 0);
        const penaltiesOpponent = isTeam1Aces ? (report.penalties2 || 0) : (report.penalties1 || 0);

        const acesGoalieName = acesLineup?.goalie;
        const goalsAgainstAces = isTeam1Aces ? (report.score2 || 0) : (report.score1 || 0);
        const savesAces = Math.max(0, shotsOpponent - goalsAgainstAces);
        const savePct = shotsOpponent > 0 ? Number(((savesAces / shotsOpponent) * 100).toFixed(2)) : 0;

        basePayload.periodScores = report.periods || '';
        basePayload.shotsTeam1 = report.shots1;
        basePayload.shotsTeam2 = report.shots2;
        basePayload.shotsAces = shotsAces;
        basePayload.shotsOpponent = shotsOpponent;
        basePayload.penaltiesTeam1 = report.penalties1;
        basePayload.penaltiesTeam2 = report.penalties2;
        basePayload.penaltiesAces = penaltiesAces;
        basePayload.penaltiesOpponent = penaltiesOpponent;

        basePayload.goalieName = acesGoalieName;
        basePayload.goalieSaves = savesAces;
        basePayload.goalieShotsAgainst = shotsOpponent;
        basePayload.goalieSavePercentage = savePct;

        basePayload.gameRoster = acesLineup?.skaters || [];
        basePayload.opponentRoster = opponentLineup?.skaters || [];
        basePayload.detailedScorers = report.goals || [];

        // Build scorers array for Aces
        const acesScorersList: { goal: string; assist: string | null }[] = [];
        for (const g of report.goals) {
          if (/aces/i.test(g.teamName)) {
            const goalUser = findUserBySurname(g.scorer);
            const assistUser = g.assist ? findUserBySurname(g.assist) : null;
            acesScorersList.push({
              goal: goalUser?.id || g.scorer,
              assist: assistUser ? assistUser.id : (g.assist || null),
            });
          }
        }
        if (acesScorersList.length > 0) {
          basePayload.scorers = acesScorersList;
        }

        // Build default synthesized lineup if none exists
        if (!existing?.lineup) {
          const goalieUser = acesGoalieName ? findUserBySurname(acesGoalieName) : undefined;
          const goaliePlayer = goalieUser ? {
            id: goalieUser.id,
            name: goalieUser.name,
            email: goalieUser.email || '',
            jerseyNumber: goalieUser.jerseyNumber ?? null,
            photoURL: goalieUser.photoURL ?? null,
          } : (acesGoalieName ? { id: `goalie-${acesGoalieName}`, name: acesGoalieName, email: '', jerseyNumber: null, photoURL: null } : null);

          const skaterNames = acesLineup?.skaters || [];
          const skaterPlayers = skaterNames.map((skaterName, idx) => {
            const u = findUserBySurname(skaterName);
            if (u) {
              return {
                id: u.id,
                name: u.name,
                email: u.email || '',
                jerseyNumber: u.jerseyNumber ?? null,
                photoURL: u.photoURL ?? null,
              };
            }
            return {
              id: `skater-${idx}-${skaterName}`,
              name: skaterName,
              email: '',
              jerseyNumber: null,
              photoURL: null,
            };
          });

          basePayload.lineup = {
            B1: goaliePlayer,
            LK1: skaterPlayers[0] || null,
            C1: skaterPlayers[1] || null,
            PK1: skaterPlayers[2] || null,
            LO1: skaterPlayers[3] || null,
            PO1: skaterPlayers[4] || null,
            LK2: skaterPlayers[5] || null,
            C2: skaterPlayers[6] || null,
            PK2: skaterPlayers[7] || null,
            LO2: skaterPlayers[8] || null,
            PO2: skaterPlayers[9] || null,
            LK3: skaterPlayers[10] || null,
            C3: skaterPlayers[11] || null,
            PK3: skaterPlayers[12] || null,
          };
        }
      }

      const sanitizedPayload = sanitizeForFirestore(basePayload);

      if (existing) {
        await setDoc(doc(firestore, 'matches', existing.id), sanitizedPayload, { merge: true });
        matchesUpdated++;
      } else {
        const newMatchId = `match-round-${scrapedMatch.round}-regular`;
        await setDoc(doc(firestore, 'matches', newMatchId), { id: newMatchId, seasonId: '2025-2026', ...sanitizedPayload }, { merge: true });
        matchesCreated++;
      }
    } catch (err: any) {
      console.error(`     ✗ Chyba při synchronizaci zápasu (kolo ${scrapedMatch.round}):`, err.message);
      errors.push(`Chyba při synchronizaci zápasu (kolo ${scrapedMatch.round}): ${err.message}`);
    }
  }

  // 4. Sync Skater Stats
  console.log(`   [4/5] Synchronizuji ${data.acesSkaters.length} hráčů Aces výhradně z webu ligy...`);
  const syncedSkaterUserIds = new Set<string>();
  for (const skater of data.acesSkaters) {
    try {
      let matchedUser = existingUsers.find((u) => u.name && areNamesMatching(u.name, skater.name));

      // If user doesn't exist, create a player profile
      if (!matchedUser) {
        const parts = skater.name.trim().split(/\s+/);
        const displayName = parts.length >= 2 ? `${parts.slice(1).join(' ')} ${parts[0]}` : skater.name;
        const normalizedSlug = normalizeNameTokens(skater.name).join('-');
        const autoUid = `player-${normalizedSlug}`;

        const newUserDoc = {
          id: autoUid,
          name: displayName,
          email: `${normalizedSlug}@aces.cz`,
          role: 'classic',
          playerType: 'player',
          photoURL: `https://picsum.photos/seed/${autoUid}/200/200`,
        };

        await setDoc(doc(firestore, 'users', autoUid), newUserDoc, { merge: true });
        matchedUser = newUserDoc;
        existingUsers.push(newUserDoc);
      }

      syncedSkaterUserIds.add(matchedUser.id);

      // Aktualizace statistik výhradně podle oficiálního ligového webu hobbyhokejbrno.cz
      await setDoc(
        doc(firestore, 'users', matchedUser.id, 'skaterStats', 'stats'),
        {
          userProfileId: matchedUser.id,
          seasonGoals: Number(skater.goals) || 0,
          seasonAssists: Number(skater.assists) || 0,
          seasonGamesPlayed: Number(skater.gamesPlayed) || 0,
          historicalGoals: Number(skater.goals) || 0,
          historicalAssists: Number(skater.assists) || 0,
          historicalGamesPlayed: Number(skater.gamesPlayed) || 0,
          lastSyncedAt: Timestamp.now(),
        },
        { merge: true }
      );
      skatersUpdated++;
    } catch (err: any) {
      errors.push(`Chyba při ukládání statistiky hráče ${skater.name}: ${err.message}`);
    }
  }

  // Bezpečnostní reset: hráči z kádru, kteří nejsou v oficiální ligové tabulce střelců (0 bodů), mají v aktuální sezóně 0
  for (const u of existingUsers) {
    if (u.playerType === 'player' && !syncedSkaterUserIds.has(u.id)) {
      try {
        await setDoc(
          doc(firestore, 'users', u.id, 'skaterStats', 'stats'),
          {
            userProfileId: u.id,
            seasonGoals: 0,
            seasonAssists: 0,
            seasonGamesPlayed: 0,
            lastSyncedAt: Timestamp.now(),
          },
          { merge: true }
        );
      } catch (e) {
        // ignore
      }
    }
  }

  // 5. Sync Goalie Stats
  for (const goalie of data.acesGoalies) {
    try {
      let matchedUser = existingUsers.find((u) => u.name && areNamesMatching(u.name, goalie.name));

      if (!matchedUser) {
        const parts = goalie.name.trim().split(/\s+/);
        const displayName = parts.length >= 2 ? `${parts.slice(1).join(' ')} ${parts[0]}` : goalie.name;
        const normalizedSlug = normalizeNameTokens(goalie.name).join('-');
        const autoUid = `goalie-${normalizedSlug}`;

        const newGoalieDoc = {
          id: autoUid,
          name: displayName,
          email: `${normalizedSlug}@aces.cz`,
          role: 'classic',
          playerType: 'goalie',
          photoURL: `https://picsum.photos/seed/${autoUid}/200/200`,
        };

        await setDoc(doc(firestore, 'users', autoUid), newGoalieDoc, { merge: true });
        matchedUser = newGoalieDoc;
        existingUsers.push(newGoalieDoc);
      }

      const shotsAgainst = goalie.saves + goalie.goalsAgainst;
      await setDoc(
        doc(firestore, 'users', matchedUser.id, 'goalieStats', 'stats'),
        {
          userProfileId: matchedUser.id,
          seasonGamesPlayed: goalie.gamesPlayed,
          seasonSaves: goalie.saves,
          seasonShotsAgainst: shotsAgainst,
          seasonSO: goalie.shutouts,
          seasonWins: 0,
          historicalGamesPlayed: goalie.gamesPlayed,
          historicalSaves: goalie.saves,
          historicalShotsAgainst: shotsAgainst,
          historicalSO: goalie.shutouts,
          historicalWins: 0,
          lastSyncedAt: Timestamp.now(),
        },
        { merge: true }
      );
      goaliesUpdated++;
    } catch (err: any) {
      errors.push(`Chyba při ukládání statistiky brankáře ${goalie.name}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    standingsCount: data.standings.length,
    matchesCreated,
    matchesUpdated,
    skatersUpdated,
    goaliesUpdated,
    syncedAt: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined,
  };
}
