import * as admin from 'firebase-admin';
import { ScrapedLeagueData } from './league-scraper';

export interface AdminSyncResult {
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

  if (tokensA.length === tokensB.length && tokensA.every((t) => tokensB.includes(t))) {
    return true;
  }

  // Zpracování přezdívek a zkrácených jmen (např. "G. Tzimas" vs "Tzimas Jorgos", "Toncek" vs "Bednář Antonín")
  const hasToken = (tokens: string[], target: string) => tokens.includes(target);
  if (hasToken(tokensA, 'tzimas') && hasToken(tokensB, 'tzimas')) return true;
  if (
    (hasToken(tokensA, 'toncek') && (hasToken(tokensB, 'bednar') || hasToken(tokensB, 'antonin'))) ||
    (hasToken(tokensB, 'toncek') && (hasToken(tokensA, 'bednar') || hasToken(tokensA, 'antonin')))
  ) {
    return true;
  }

  return false;
}

function parseCzechDate(dateStr: string, timeStr = '18:00'): Date | null {
  const match = dateStr.match(/(\d+)\.\s*(\d+)\.\s*(\d{4})/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  const [hours, minutes] = (timeStr || '18:00').split(':').map((s) => parseInt(s, 10));
  const h = isNaN(hours) ? 18 : hours;
  const m = isNaN(minutes) ? 0 : minutes;

  const pad = (n: number) => String(n).padStart(2, '0');

  // Určení offsetu časové zóny Europe/Prague pro dané datum (v zimě CET UTC+1, v létě CEST UTC+2)
  const roughUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const timeZoneString = roughUtc.toLocaleString('en-US', {
    timeZone: 'Europe/Prague',
    timeZoneName: 'shortOffset',
  });
  const offsetMatch = timeZoneString.match(/GMT([+-]\d+)/);
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : 1;
  const sign = offsetHours >= 0 ? '+' : '-';
  const offsetFormatted = `${sign}${pad(Math.abs(offsetHours))}:00`;

  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(h)}:${pad(m)}:00${offsetFormatted}`);
}

function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof admin.firestore.Timestamp || typeof (obj as any).toDate === 'function') return obj;
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

export async function syncLeagueToAdminFirestore(
  adminDb: admin.firestore.Firestore,
  data: ScrapedLeagueData
): Promise<AdminSyncResult> {
  const errors: string[] = [];
  let matchesCreated = 0;
  let matchesUpdated = 0;
  let skatersUpdated = 0;
  let goaliesUpdated = 0;

  console.log('   [1/5] Ukládám tabulku a statistiky do settings/league přes Admin SDK...');
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

    const leagueSettingsPayload = sanitizeForFirestore({
      leagueStandings: formattedStandings,
      leagueSkaters: data.allSkaters || [],
      lastSyncAt: admin.firestore.Timestamp.now(),
      lastSyncSummary: {
        timestamp: new Date().toISOString(),
        standingsCount: formattedStandings.length,
        leagueSkatersCount: (data.allSkaters || []).length,
        acesMatchesCount: data.acesMatches.length,
        acesSkatersCount: data.acesSkaters.length,
        acesGoaliesCount: data.acesGoalies.length,
      },
    });
    await adminDb.doc('settings/league').set(leagueSettingsPayload, { merge: true });
    console.log('   [1/5] ✓ settings/league úspěšně uloženo (Admin SDK).');
  } catch (err: any) {
    console.error('   [1/5] ✗ Chyba při ukládání tabulky:', err.message);
    errors.push(`Chyba při ukládání tabulky: ${err.message}`);
  }

  // 2. Fetch existing users for name matching
  console.log('   [2/5] Načítám existující uživatele...');
  const existingUsers: any[] = [];
  try {
    const userSnap = await adminDb.collection('users').get();
    userSnap.forEach((d) => existingUsers.push({ id: d.id, ...d.data() }));
    console.log(`   [2/5] ✓ Načteno ${existingUsers.length} existujících uživatelů.`);
  } catch (err: any) {
    console.error('   [2/5] ✗ Chyba při načítání uživatelů:', err.message);
    errors.push(`Chyba při načítání uživatelů: ${err.message}`);
  }

  function findUserBySurname(surname: string) {
    if (!surname) return undefined;
    const cleanSurname = surname.replace(/\s*[A-Z]\.?$/g, '');
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
    const matchSnap = await adminDb.collection('matches').get();
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
      const matchTimestamp = matchDate ? admin.firestore.Timestamp.fromDate(matchDate) : admin.firestore.Timestamp.now();

      const team1Formatted = scrapedMatch.team1 === 'Aces' ? 'HC Aces' : scrapedMatch.team1;
      const team2Formatted = scrapedMatch.team2 === 'Aces' ? 'HC Aces' : scrapedMatch.team2;

      // Inteligentní vyhledání existujícího zápasu proti kolizím
      const scrapedOpponent = (scrapedMatch.team1 === 'Aces' || /aces/i.test(scrapedMatch.team1))
        ? scrapedMatch.team2
        : scrapedMatch.team1;
      const scrapedMatchTime = matchDate ? matchDate.getTime() : 0;

      const matchingCandidates = existingMatches.filter((m) => {
        if (m.round !== undefined && m.round !== null && Number(m.round) === Number(scrapedMatch.round)) {
          return true;
        }
        const mTime = m.dateTime?.toDate ? m.dateTime.toDate().getTime() : (typeof m.dateTime === 'string' ? new Date(m.dateTime).getTime() : 0);
        const mOpponent = /aces/i.test(m.team1 || '') ? (m.team2 || '') : (m.team1 || '');
        const isSameOpponent = areNamesMatching(mOpponent, scrapedOpponent) ||
          mOpponent.toLowerCase().includes(scrapedOpponent.toLowerCase()) ||
          scrapedOpponent.toLowerCase().includes(mOpponent.toLowerCase());
        const isNearDate = scrapedMatchTime > 0 && mTime > 0 && Math.abs(mTime - scrapedMatchTime) < 3 * 24 * 60 * 60 * 1000;
        return isSameOpponent && isNearDate;
      });

      // Přednost má zápas, který byl již dříve nebo ručně odehrán
      const primaryExisting = matchingCandidates.sort((a, b) => {
        if (a.isPlayed && !b.isPlayed) return -1;
        if (!a.isPlayed && b.isPlayed) return 1;
        const aScore = (a.team1Score !== undefined ? 1 : 0) + (a.mvpVotes ? 1 : 0);
        const bScore = (b.team1Score !== undefined ? 1 : 0) + (b.mvpVotes ? 1 : 0);
        return bScore - aScore;
      })[0];
      const existing = primaryExisting;

      // Smazat duplicitní neodehrané záznamy stejného zápasu
      const redundantDuplicates = matchingCandidates.filter((m) => m.id !== primaryExisting?.id);
      for (const dup of redundantDuplicates) {
        console.log(`     🧹 Odstraňuji duplicitní zápas (ID: ${dup.id}) pro kolo ${scrapedMatch.round}`);
        try {
          await adminDb.doc(`matches/${dup.id}`).delete();
        } catch (delErr: any) {
          console.warn(`       Varování při mazání duplikátu ${dup.id}:`, delErr.message);
        }
      }

      // Detailní zápis utkání
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
        await adminDb.doc(`matches/${existing.id}`).set(sanitizedPayload, { merge: true });
        matchesUpdated++;
      } else {
        const newMatchId = `match-round-${scrapedMatch.round}-regular`;
        await adminDb.doc(`matches/${newMatchId}`).set({ id: newMatchId, seasonId: '2025-2026', ...sanitizedPayload }, { merge: true });
        matchesCreated++;
      }
    } catch (err: any) {
      console.error(`     ✗ Chyba při synchronizaci zápasu (kolo ${scrapedMatch.round}):`, err.message);
      errors.push(`Chyba při synchronizaci zápasu (kolo ${scrapedMatch.round}): ${err.message}`);
    }
  }

  // 4. Sync Skater Stats výhradně z hobbyhokejbrno.cz
  console.log(`   [4/5] Synchronizuji ${data.acesSkaters.length} hráčů Aces výhradně z webu ligy (Admin SDK)...`);
  const syncedSkaterUserIds = new Set<string>();
  for (const skater of data.acesSkaters) {
    try {
      let matchedUser =
        existingUsers.find((u) => !String(u.id).startsWith('player-') && u.name && areNamesMatching(u.name, skater.name)) ||
        existingUsers.find((u) => u.name && areNamesMatching(u.name, skater.name));

      // Odstranit pripadne duplicitni auto-vytvorene ucty (napr. player-tzimas-jorgos vedle G. Tzimas)
      if (matchedUser && !String(matchedUser.id).startsWith('player-')) {
        const duplicateAutoUsers = existingUsers.filter(
          (u) => String(u.id).startsWith('player-') && u.id !== matchedUser.id && u.name && areNamesMatching(u.name, skater.name)
        );
        for (const dup of duplicateAutoUsers) {
          try {
            await adminDb.doc(`users/${dup.id}/skaterStats/stats`).delete();
            await adminDb.doc(`users/${dup.id}`).delete();
          } catch (e) {
            // ignore
          }
        }
      }

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

        await adminDb.doc(`users/${autoUid}`).set(newUserDoc, { merge: true });
        matchedUser = newUserDoc;
        existingUsers.push(newUserDoc);
      }

      syncedSkaterUserIds.add(matchedUser.id);

      const statRef = adminDb.doc(`users/${matchedUser.id}/skaterStats/stats`);
      const existingStatSnap = await statRef.get();
      const existingStat = existingStatSnap.data();

      const sGoals = Number(skater.goals) || 0;
      const sAssists = Number(skater.assists) || 0;
      const sGames = Number(skater.gamesPlayed) || 0;

      const updatePayload: Record<string, any> = {
        userProfileId: matchedUser.id,
        seasonGoals: sGoals,
        seasonAssists: sAssists,
        seasonGamesPlayed: sGames,
        lastSyncedAt: admin.firestore.Timestamp.now(),
      };

      // Oprava drivejsi chyby, kdy se letosni sezonni cisla zapsala i do historical* (vznikl dvojnasobek v Historii)
      if (
        existingStat &&
        existingStat.historicalGoals === existingStat.seasonGoals &&
        existingStat.historicalAssists === existingStat.seasonAssists &&
        existingStat.historicalGamesPlayed === existingStat.seasonGamesPlayed &&
        (existingStat.seasonGamesPlayed || 0) > 0 &&
        (existingStat.seasonGamesPlayed || 0) <= 6
      ) {
        updatePayload.historicalGoals = 0;
        updatePayload.historicalAssists = 0;
        updatePayload.historicalGamesPlayed = 0;
      }

      await statRef.set(updatePayload, { merge: true });
      skatersUpdated++;
    } catch (err: any) {
      errors.push(`Chyba při ukládání statistiky hráče ${skater.name}: ${err.message}`);
    }
  }

  // Vynulovat sezónní statistiky u hráčů na soupisce, kteří nejsou v oficiální tabulce střelců (0 bodů v lize)
  for (const u of existingUsers) {
    if (u.playerType === 'player' && !syncedSkaterUserIds.has(u.id)) {
      try {
        await adminDb.doc(`users/${u.id}/skaterStats/stats`).set(
          {
            userProfileId: u.id,
            seasonGoals: 0,
            seasonAssists: 0,
            seasonGamesPlayed: 0,
            lastSyncedAt: admin.firestore.Timestamp.now(),
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

        await adminDb.doc(`users/${autoUid}`).set(newGoalieDoc, { merge: true });
        matchedUser = newGoalieDoc;
        existingUsers.push(newGoalieDoc);
      }

      // Spočítáme výhry brankáře ze všech zápasů Aces (z oficiálních reportů i odehraných zápasů)
      let goalieWins = 0;
      const goalieTokens = normalizeNameTokens(goalie.name);
      const goalieSurname = goalieTokens.length > 0 ? goalieTokens[0] : '';

      // 1. Z reportů z webu
      for (const report of (data.acesMatchReports || [])) {
        const isTeam1Aces = /aces/i.test(report.team1);
        const acesScore = isTeam1Aces ? report.score1 : report.score2;
        const oppScore = isTeam1Aces ? report.score2 : report.score1;
        const reportGoalie = isTeam1Aces ? report.team1Lineup?.goalie : report.team2Lineup?.goalie;
        if (acesScore > oppScore && reportGoalie) {
          const normReportGoalie = normalizeNameTokens(reportGoalie);
          if (normReportGoalie.some(t => goalieTokens.includes(t)) || reportGoalie.toLowerCase().includes(goalieSurname)) {
            goalieWins++;
          }
        }
      }

      // 2. Z existujících zápasů v databázi (např. ručně zapsaných)
      for (const em of existingMatches) {
        if (!em.isPlayed) continue;
        const matchDate = em.date || (em.dateTime?.toDate ? em.dateTime.toDate().toISOString() : String(em.dateTime || ''));
        if (matchDate < '2026-09-16') continue;
        const isT1 = /aces/i.test(em.team1 || '');
        const isT2 = /aces/i.test(em.team2 || '');
        if (!isT1 && !isT2) continue;
        const acesScore = isT1 ? (em.team1Score || 0) : (em.team2Score || 0);
        const oppScore = isT1 ? (em.team2Score || 0) : (em.team1Score || 0);
        if (acesScore > oppScore) {
          const gName = (em.goalieName || em.lineup?.B1?.name || '').toLowerCase();
          const gId = em.goalieId || em.lineup?.B1?.id;
          if (gId === matchedUser.id || (goalieSurname && gName.includes(goalieSurname))) {
            const alreadyFromReport = (data.acesMatchReports || []).some(r => r.round === em.round);
            if (!alreadyFromReport) {
              goalieWins++;
            }
          }
        }
      }

      // Načteme stávající uloženou statistiku, abychom neztratili manuálně zadané výhry
      const existingStatDoc = await adminDb.doc(`users/${matchedUser.id}/goalieStats/stats`).get();
      const existingStat = existingStatDoc.data();

      // Výhry v základní části nemohou překročit počet odehraných zápasů v základní části
      const manualWins = existingStat?.seasonWins !== undefined && existingStat?.seasonWins <= goalie.gamesPlayed ? existingStat.seasonWins : goalieWins;
      const finalSeasonWins = Math.min(Math.max(manualWins, goalieWins), goalie.gamesPlayed);

      const shotsAgainst = goalie.saves + goalie.goalsAgainst;
      await adminDb.doc(`users/${matchedUser.id}/goalieStats/stats`).set(
        {
          userProfileId: matchedUser.id,
          seasonGamesPlayed: goalie.gamesPlayed,
          seasonSaves: goalie.saves,
          seasonShotsAgainst: shotsAgainst,
          seasonSO: goalie.shutouts,
          seasonWins: finalSeasonWins,
          lastSyncedAt: admin.firestore.Timestamp.now(),
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
