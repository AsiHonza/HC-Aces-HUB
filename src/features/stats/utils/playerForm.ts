import type { Match, UserProfile } from '@/types';
import { calculateMatchStarsResults } from '@/features/matches/utils/matchStars';
import { getMvpVotingStatus } from '@/features/matches/utils/mvpVoting';
import { hasMatchStatsRecorded } from '@/features/matches/utils/match-details';
import { areNamesMatching, isGoaliePlayer } from '@/lib/utils';
import { toJsDate, toSafeDate } from '@/lib/dates';
import { getSeasonStartMs, DEFAULT_SEASON_START_MS } from './season';

export type PlayerFormBadgeType =
  | 'reigning-mvp'
  | 'hattrick-hero'
  | 'hot-sniper'
  | 'playmaker'
  | 'point-streak'
  | 'goalie-wall'
  | 'shutout'
  | 'lockdown-shield'
  | 'unsung-hero'
  | 'ironman-streak';

export type PlayerFormBadgeIcon =
  | 'crown'
  | 'sparkles'
  | 'target'
  | 'share'
  | 'flame'
  | 'shield-check'
  | 'lock'
  | 'shield'
  | 'award'
  | 'activity';

export interface PlayerFormBadge {
  type: PlayerFormBadgeType;
  icon: PlayerFormBadgeIcon;
  emoji?: string;
  shortLabel: string;
  title: string;
  description: string;
  priority: number; // Lower = higher priority in compact views (max 2 badges shown inline)
  badgeClass: string;
}

export interface PlayerFormSummary {
  playerId: string;
  isReigningMvp: boolean;
  currentPointStreak: number;
  currentIronmanStreak: number;
  maxIronmanStreak: number;
  lockdownGamesCount: number;
  shutoutSkaterCount: number;
  shotSuppressorCount: number;
  clutchCloserCount: number;
  unsungHeroCount: number;
  gamesAppeared: number;
  winsAppeared: number;
  teamWinRatePct: number;
  badges: PlayerFormBadge[];
}

function didPlayerAppearInMatch(
  player: UserProfile,
  match: Match,
  matchAttendances?: Array<{ userId: string; status: string }>
): boolean {
  // 1. Check goalie
  if (match.goalieId === player.id) return true;
  if (match.goalieName && areNamesMatching(player.name, match.goalieName)) return true;

  // 2. Check lineup
  if (match.lineup && typeof match.lineup === 'object') {
    for (const slotVal of Object.values(match.lineup)) {
      if (slotVal && typeof slotVal === 'object') {
        const p = slotVal as any;
        if (p.id === player.id || (p.name && areNamesMatching(player.name, p.name))) {
          return true;
        }
      }
    }
  }

  // 3. Check gameRoster
  if (Array.isArray(match.gameRoster) && match.gameRoster.length > 0) {
    if (match.gameRoster.some((rawName) => areNamesMatching(player.name, rawName))) {
      return true;
    }
  }

  // 4. Check scorers/assists in that match
  if (Array.isArray(match.scorers)) {
    for (const s of match.scorers) {
      if (
        s.goal === player.id ||
        s.assist === player.id ||
        (s.goal && areNamesMatching(player.name, s.goal)) ||
        (s.assist && areNamesMatching(player.name, s.assist))
      ) {
        return true;
      }
    }
  }

  // 5. Fallback to attendance 'going' if neither gameRoster nor lineup was populated
  const hasExplicitRoster =
    (Array.isArray(match.gameRoster) && match.gameRoster.length > 0) ||
    (match.lineup && Object.values(match.lineup).some((v) => v !== null));

  if (!hasExplicitRoster && matchAttendances && matchAttendances.length > 0) {
    if (matchAttendances.some((a) => a.userId === player.id && a.status === 'going')) {
      return true;
    }
  }

  return false;
}

function getPlayerMatchGoalsAndAssists(player: UserProfile, match: Match): { goals: number; assists: number } {
  let simpleGoals = 0;
  let simpleAssists = 0;
  let detailedGoals = 0;
  let detailedAssists = 0;
  const isAcesTeam1 = /aces/i.test(match.team1 || '');
  const isAcesTeam2 = /aces/i.test(match.team2 || '');

  if (Array.isArray(match.scorers) && match.scorers.length > 0) {
    for (const s of match.scorers) {
      if (!s) continue;
      if (s.goal === player.id || (s.goal && areNamesMatching(player.name, s.goal))) {
        simpleGoals++;
      }
      if (s.assist === player.id || (s.assist && areNamesMatching(player.name, s.assist))) {
        simpleAssists++;
      }
    }
  }

  if (Array.isArray(match.detailedScorers) && match.detailedScorers.length > 0) {
    for (const ds of match.detailedScorers) {
      if (!ds) continue;
      const isAcesGoal =
        (isAcesTeam1 && ds.team === 'team1') ||
        (isAcesTeam2 && ds.team === 'team2') ||
        /aces/i.test(ds.team || '') ||
        /aces/i.test((ds as any).teamName || '');
      if (!isAcesGoal) continue;
      if (ds.scorer === player.id || (ds.scorer && areNamesMatching(player.name, ds.scorer))) {
        detailedGoals++;
      }
      if (ds.assist === player.id || (ds.assist && areNamesMatching(player.name, ds.assist))) {
        detailedAssists++;
      }
    }
  }

  return {
    goals: Math.max(simpleGoals, detailedGoals),
    assists: Math.max(simpleAssists, detailedAssists),
  };
}

/**
 * Začátek aktuální sezóny HC Aces (2026/2027) – 1. 9. 2026.
 * Zajišťuje zahrnutí všech ligových zápasů od 1. kola (15. 9. 2026) a vyloučení starých zápasů z minulé sezóny / historie.
 */
export const CURRENT_SEASON_START_MS = DEFAULT_SEASON_START_MS;

export function getMatchTimestamp(match: Match): number {
  if (match.dateTime) {
    const d = toSafeDate(match.dateTime);
    if (d) return d.getTime();
  }
  if (match.date && typeof match.date === 'string') {
    const parts = match.date.match(/(\d+)\.\s*(\d+)\.\s*(\d{4})/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10);
      const year = parseInt(parts[3], 10);
      return new Date(year, month - 1, day).getTime();
    }
  }
  return toJsDate(match.dateTime).getTime();
}

export function isCurrentSeasonMatch(match: Match | null | undefined): boolean {
  if (!match) return false;
  // Vyloučit zápasy explicitně archivovaných předchozích sezón (např. 2024-2025, 2025-2026, prior-history)
  if (match.seasonId && match.seasonId !== 'current' && match.seasonId !== '2026-2027') {
    return false;
  }
  const mTime = getMatchTimestamp(match);
  return mTime >= CURRENT_SEASON_START_MS;
}

/**
 * Computes live form badges ("Hot Streaks"), reigning MVP crown, ironman streaks,
 * and defensive metrics for all players across played matches in the CURRENT season.
 */
export function calculateAllPlayersFormAndDefense(
  users: UserProfile[] = [],
  matches: Match[] = [],
  attendancesByMatch?: Map<string, Array<{ userId: string; status: string }>>
): Map<string, PlayerFormSummary> {
  const result = new Map<string, PlayerFormSummary>();
  const usersMap = new Map<string, UserProfile>(users.map((u) => [u.id, u]));

  // Sort played matches chronologically ascending (oldest -> newest)
  // Striktně pouze zápasy z aktuální sezóny (2026/2027, od 1. 9. 2026)
  const playedMatchesAsc = [...matches]
    .filter((m) => m.isPlayed && isCurrentSeasonMatch(m))
    .sort((a, b) => getMatchTimestamp(a) - getMatchTimestamp(b));

  // Identify Reigning 1st Star (strictly from the latest played match where voting is officially closed and has votes)
  const reigningMvpIds = new Set<string>();
  let reigningMatchOpponent = '';

  for (let i = playedMatchesAsc.length - 1; i >= 0; i--) {
    const m = playedMatchesAsc[i];
    const votingState = getMvpVotingStatus(m);
    // Never award Reigning MVP while voting is still active/open
    if (votingState.status !== 'closed') {
      continue;
    }
    const starsRes = calculateMatchStarsResults(m, usersMap);
    if (starsRes.totalVoters > 0 && starsRes.standings.length > 0) {
      const rank1Holders = starsRes.standings.filter((s) => s.rank === 1 && s.points > 0);
      if (rank1Holders.length > 0) {
        rank1Holders.forEach((h) => reigningMvpIds.add(h.candidateId));
        const isAcesT1 = /aces/i.test(m.team1 || '');
        reigningMatchOpponent = isAcesT1 ? m.team2 : m.team1;
        break;
      }
    }
  }

  // Precompute match stars results for all played matches (for Unsung Hero check)
  const starsByMatchId = new Map<string, ReturnType<typeof calculateMatchStarsResults>>();
  for (const m of playedMatchesAsc) {
    starsByMatchId.set(m.id, calculateMatchStarsResults(m, usersMap));
  }

  for (const user of users) {
    const isGoalie = isGoaliePlayer(user);
    let currentIronmanStreak = 0;
    let maxIronmanStreak = 0;
    let currentPointStreak = 0;
    let pointStreakGoals = 0;
    let pointStreakAssists = 0;
    let lockdownStreak = 0;

    let lockdownGamesCount = 0;
    let shutoutSkaterCount = 0;
    let shotSuppressorCount = 0;
    let clutchCloserCount = 0;
    let unsungHeroCount = 0;
    let gamesAppeared = 0;
    let winsAppeared = 0;

    const playerAppearancesAsc: Array<{
      match: Match;
      goals: number;
      assists: number;
      oppScore: number;
      isWin: boolean;
      statsRecorded: boolean;
    }> = [];

    for (const m of playedMatchesAsc) {
      const att = attendancesByMatch?.get(m.id);
      const appeared = didPlayerAppearInMatch(user, m, att);

      const statsRecorded = hasMatchStatsRecorded(m);
      const hasExplicitRoster =
        (Array.isArray(m.gameRoster) && m.gameRoster.length > 0) ||
        (m.lineup && Object.values(m.lineup).some((v) => v !== null));

      if (appeared) {
        currentIronmanStreak += 1;
        if (currentIronmanStreak > maxIronmanStreak) {
          maxIronmanStreak = currentIronmanStreak;
        }
      } else {
        // Pokud zápas ještě nemá oficiálně zapsané statistiky ani soupisku (např. Sjetý gumy, kde se statistiky teprve doplní),
        // nepřerušíme železného muže hráčům, u kterých zatím není známo, zda hráli.
        if (statsRecorded || hasExplicitRoster) {
          currentIronmanStreak = 0;
        }
      }

      if (!appeared) continue;

      gamesAppeared += 1;
      const isAcesTeam1 = /aces/i.test(m.team1 || '');
      const isAcesTeam2 = /aces/i.test(m.team2 || '');
      const acesScore = isAcesTeam1 ? Number(m.team1Score ?? 0) : Number(m.team2Score ?? 0);
      const oppScore = isAcesTeam1 ? Number(m.team2Score ?? 0) : Number(m.team1Score ?? 0);
      const isWin = acesScore > oppScore;

      if (isWin) winsAppeared += 1;

      const { goals, assists } = getPlayerMatchGoalsAndAssists(user, m);
      playerAppearancesAsc.push({ match: m, goals, assists, oppScore, isWin, statsRecorded });

      // Defensive checks for skaters
      if (!isGoalie) {
        if (statsRecorded && oppScore <= 2) {
          lockdownGamesCount += 1;
        }
        if (statsRecorded && oppScore === 0) {
          shutoutSkaterCount += 1;
        }

        const shotsOpp =
          m.shotsOpponent !== undefined
            ? Number(m.shotsOpponent)
            : isAcesTeam1
            ? Number(m.shotsTeam2 ?? 0)
            : Number(m.shotsTeam1 ?? 0);
        if (isWin && shotsOpp > 0 && shotsOpp <= 20) {
          shotSuppressorCount += 1;
        }

        // Clutch closer: 1-goal win and no opponent goals in last 10 mins (minute >= 50)
        if (statsRecorded && isWin && acesScore - oppScore === 1 && Array.isArray(m.detailedScorers) && m.detailedScorers.length > 0) {
          const oppScoredLate = m.detailedScorers.some((ds) => {
            const isAcesGoal =
              (isAcesTeam1 && ds.team === 'team1') ||
              (isAcesTeam2 && ds.team === 'team2') ||
              /aces/i.test(ds.team || '') ||
              /aces/i.test((ds as any).teamName || '');
            return !isAcesGoal && Number(ds.minute || 0) >= 50;
          });
          if (!oppScoredLate) {
            clutchCloserCount += 1;
          }
        }

        // Unsung hero: Top 3 star in match with 0G and 0A (only once match stats are recorded & voting closed)
        const starsRes = starsByMatchId.get(m.id);
        const votingState = getMvpVotingStatus(m);
        if (
          statsRecorded &&
          votingState.status === 'closed' &&
          starsRes &&
          starsRes.totalVoters > 0 &&
          goals === 0 &&
          assists === 0
        ) {
          const onPodium = starsRes.standings.some(
            (s) => s.candidateId === user.id && s.rank <= 3 && s.points > 0
          );
          if (onPodium) {
            unsungHeroCount += 1;
          }
        }
      }
    }

    // Calculate current streaks from most recent player appearances with recorded stats backwards
    for (let i = playerAppearancesAsc.length - 1; i >= 0; i--) {
      const app = playerAppearancesAsc[i];
      if (!app.statsRecorded) continue;
      if (app.goals + app.assists > 0) {
        currentPointStreak += 1;
        pointStreakGoals += app.goals;
        pointStreakAssists += app.assists;
      } else {
        break;
      }
    }

    for (let i = playerAppearancesAsc.length - 1; i >= 0; i--) {
      const app = playerAppearancesAsc[i];
      if (!app.statsRecorded) continue;
      if (app.oppScore <= 2) {
        lockdownStreak += 1;
      } else {
        break;
      }
    }

    // Série zápasů s hattrickem (3+ gólů po sobě)
    let hattrickStreak = 0;
    for (let i = playerAppearancesAsc.length - 1; i >= 0; i--) {
      const app = playerAppearancesAsc[i];
      if (!app.statsRecorded) continue;
      if (app.goals >= 3) {
        hattrickStreak += 1;
      } else {
        break;
      }
    }

    // Série zápasů se 2+ góly po sobě
    let multiGoalStreak = 0;
    for (let i = playerAppearancesAsc.length - 1; i >= 0; i--) {
      const app = playerAppearancesAsc[i];
      if (!app.statsRecorded) continue;
      if (app.goals >= 2) {
        multiGoalStreak += 1;
      } else {
        break;
      }
    }

    // Série zápasů se 2+ asistencemi po sobě
    let playmakerStreak = 0;
    for (let i = playerAppearancesAsc.length - 1; i >= 0; i--) {
      const app = playerAppearancesAsc[i];
      if (!app.statsRecorded) continue;
      if (app.assists >= 2) {
        playmakerStreak += 1;
      } else {
        break;
      }
    }

    const appearancesWithStats = playerAppearancesAsc.filter((a) => a.statsRecorded);
    let lastMatchGoals = 0;
    let lastMatchAssists = 0;
    let lastMatchIsWin = false;
    let lastMatchOppScore = 0;
    let lastMatchSavePct = 0;
    let lastMatchIsShutout = false;
    let latestMatch: Match | null = null;

    if (appearancesWithStats.length > 0) {
      const latestApp = appearancesWithStats[appearancesWithStats.length - 1];
      latestMatch = latestApp.match;
      lastMatchGoals = latestApp.goals;
      lastMatchAssists = latestApp.assists;
      lastMatchIsWin = latestApp.isWin;
      lastMatchOppScore = latestApp.oppScore;
      if (isGoalie) {
        const m = latestApp.match;
        const saves = Number(m.goalieSaves ?? 0);
        const sa = Number(m.goalieShotsAgainst ?? 0);
        const pct =
          m.goalieSavePercentage !== undefined
            ? Number(m.goalieSavePercentage)
            : sa > 0
            ? (saves / sa) * 100
            : 0;
        lastMatchSavePct = pct;
        lastMatchIsShutout = latestApp.oppScore === 0;
      }
    }

    const badges: PlayerFormBadge[] = [];
    const isReigningMvp = reigningMvpIds.has(user.id);

    // 1. Reigning MVP Crown (1. hvězda posl. uzavřeného zápasu)
    if (isReigningMvp) {
      badges.push({
        type: 'reigning-mvp',
        icon: 'crown',
        shortLabel: '',
        title: 'Úřadující 1. hvězda zápasu',
        description: reigningMatchOpponent
          ? `Zvolen kabinou 1. hvězdou posledního zápasu proti ${reigningMatchOpponent}`
          : 'Zvolen kabinou 1. hvězdou posledního odehraného zápasu',
        priority: 1,
        badgeClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40',
      });
    }

    // 2. Hattrick Hero (3+ gólů v posl. zápase)
    if (!isGoalie && lastMatchGoals >= 3) {
      badges.push({
        type: 'hattrick-hero',
        icon: 'sparkles',
        shortLabel: hattrickStreak > 1 ? `${hattrickStreak}Z` : '',
        title: hattrickStreak > 1
          ? `Hattricková série (${hattrickStreak} Z v řadě)`
          : `Hattrick hrdina (${lastMatchGoals} góly!)`,
        description: hattrickStreak > 1
          ? `V posledních ${hattrickStreak} odehraných utkáních v řadě nastřílel pokaždé hattrick!`
          : `V posledním odehraném utkání nastřílel hattrick (${lastMatchGoals} gólů)!`,
        priority: 2,
        badgeClass: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40',
      });
    }

    // 3. Hot Sniper (2 góly v posl. zápase)
    if (!isGoalie && lastMatchGoals === 2) {
      badges.push({
        type: 'hot-sniper',
        icon: 'target',
        shortLabel: multiGoalStreak > 1 ? `${multiGoalStreak}Z` : '',
        title: multiGoalStreak > 1
          ? `Střelecká série (${multiGoalStreak} Z v řadě)`
          : 'Střelecká forma (2 góly)',
        description: multiGoalStreak > 1
          ? `V posledních ${multiGoalStreak} odehraných zápasech vstřelil pokaždé 2+ góly!`
          : 'V posledním odehraném zápase skóroval hned dvakrát!',
        priority: 3,
        badgeClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40',
      });
    }

    // 4. Playmaker (2+ asistence v posl. zápase)
    if (!isGoalie && lastMatchAssists >= 2) {
      badges.push({
        type: 'playmaker',
        icon: 'share',
        shortLabel: playmakerStreak > 1 ? `${playmakerStreak}Z` : '',
        title: playmakerStreak > 1
          ? `Nahrávačská série (${playmakerStreak} Z v řadě)`
          : `Dvorní nahrávač (${lastMatchAssists} asistence)`,
        description: playmakerStreak > 1
          ? `V posledních ${playmakerStreak} zápasech v řadě zapsal pokaždé 2+ asistence!`
          : `V posledním odehraném zápase připravil pro spoluhráče ${lastMatchAssists} gólové nahrávky!`,
        priority: 3,
        badgeClass: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/40',
      });
    }

    // 5. Point Streak (Bod ve 2+ zápasech v řadě)
    if (!isGoalie && currentPointStreak >= 2) {
      badges.push({
        type: 'point-streak',
        icon: 'flame',
        shortLabel: `${currentPointStreak}Z`,
        title: `On Fire: Bodová šňůra (${currentPointStreak} Z)`,
        description: `Bodoval v posledních ${currentPointStreak} odehraných zápasech v řadě (${pointStreakGoals}G + ${pointStreakAssists}A)`,
        priority: 4,
        badgeClass: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40',
      });
    }

    // 6. Goalie Wall (>90 % zákroků nebo čisté konto v posl. zápase)
    if (isGoalie && (lastMatchSavePct >= 90 || lastMatchIsShutout)) {
      badges.push({
        type: 'goalie-wall',
        icon: 'shield-check',
        shortLabel: '',
        title: 'Neprůstřelná zeď v bráně',
        description: lastMatchIsShutout
          ? 'Vychytal čisté konto v posledním odehraném zápase!'
          : `V posledním utkání předvedl zákroky s úspěšností ${lastMatchSavePct.toFixed(1)} %`,
        priority: 2,
        badgeClass: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/40',
      });
    }

    // 7. Shutout (Čisté konto týmu pro hráče v poli)
    if (!isGoalie && appearancesWithStats.length > 0 && lastMatchIsWin && lastMatchOppScore === 0) {
      badges.push({
        type: 'shutout',
        icon: 'lock',
        shortLabel: 'NULA',
        title: 'Čisté konto / Nulák',
        description: 'Byl na ledě při vítězném utkání s čistým kontem (0 obdržených gólů)!',
        priority: 4,
        badgeClass: 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/40',
      });
    }

    // 8. Lockdown Shield (2+ po sobě jdoucí zápasy s max 2 obdrženými góly)
    if (!isGoalie && lockdownStreak >= 2) {
      badges.push({
        type: 'lockdown-shield',
        icon: 'shield',
        shortLabel: `${lockdownStreak}Z`,
        title: 'Defenzivní štít',
        description: `V posledních ${lockdownStreak} zápasech v sestavě udrželi Aces soupeře na max. 2 gólech`,
        priority: 5,
        badgeClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40',
      });
    }

    // 9. Unsung Hero (Top 3 hvězda zápasu bez gólů a asistencí)
    if (latestMatch) {
      const starsRes = starsByMatchId.get(latestMatch.id);
      const votingState = getMvpVotingStatus(latestMatch);
      if (
        votingState.status === 'closed' &&
        starsRes &&
        starsRes.totalVoters > 0 &&
        lastMatchGoals === 0 &&
        lastMatchAssists === 0
      ) {
        const onPodium = starsRes.standings.some(
          (s) => s.candidateId === user.id && s.rank <= 3 && s.points > 0
        );
        if (onPodium) {
          badges.push({
            type: 'unsung-hero',
            icon: 'award',
            shortLabel: 'HRDINA',
            title: 'Tichý hrdina (Černá práce)',
            description: 'Zvolen kabinou mezi 3 nejlepší hvězdy zápasu za obětavou hru, bloky a spolehlivou defenzívu!',
            priority: 6,
            badgeClass: 'bg-amber-600/20 text-amber-700 dark:text-amber-300 border-amber-600/40',
          });
        }
      }
    }

    // 10. Ironman Streak (5+ zápasů bez absence)
    if (currentIronmanStreak >= 5) {
      badges.push({
        type: 'ironman-streak',
        icon: 'activity',
        shortLabel: `${currentIronmanStreak}Z`,
        title: `Železný muž (${currentIronmanStreak} Z v řadě)`,
        description: `Nechyběl ani v jednom z posledních ${currentIronmanStreak} zápasů HC Aces`,
        priority: 7,
        badgeClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
      });
    }

    badges.sort((a, b) => a.priority - b.priority);

    const teamWinRatePct =
      gamesAppeared > 0 ? Math.round((winsAppeared / gamesAppeared) * 100) : 0;

    result.set(user.id, {
      playerId: user.id,
      isReigningMvp,
      currentPointStreak,
      currentIronmanStreak,
      maxIronmanStreak,
      lockdownGamesCount,
      shutoutSkaterCount,
      shotSuppressorCount,
      clutchCloserCount,
      unsungHeroCount,
      gamesAppeared,
      winsAppeared,
      teamWinRatePct,
      badges,
    });
  }

  return result;
}
