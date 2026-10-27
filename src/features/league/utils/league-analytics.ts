import {
  LeagueStanding,
  LeagueMatchItem,
  LeagueSkaterItem,
  LeagueGoalieItem,
  LeagueFairPlayItem,
  TeamAnalyticsSummary,
  TeamFormMatch,
  LeagueAwardsLeadersData,
  PlayerDetailedAnalytics,
  PlayerMatchLogItem,
  HeadToHeadComparison,
} from '../types';

export function normalizeClubName(name: string): string {
  if (!name) return '';
  const n = name.trim().toLowerCase();
  if (n === 'aces' || n === 'hc aces' || /aces/i.test(n)) return 'HC Aces';
  if (/oldies/i.test(n)) return 'HH Oldies';
  if (/machines/i.test(n)) return 'HH Machines';
  if (/divo/i.test(n)) return 'Divočáci';
  if (/predator/i.test(n)) return 'Predators';
  if (/guma|gumy/i.test(n)) return 'Sjetý gumy';
  if (/embed/i.test(n)) return 'Embedit';
  if (/all\s*in/i.test(n)) return 'ALL IN';
  if (/raci/i.test(n)) return 'Raci';
  return name.trim();
}

export function areClubNamesMatching(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const cA = normalizeClubName(nameA).toLowerCase();
  const cB = normalizeClubName(nameB).toLowerCase();
  return cA === cB || cA.includes(cB) || cB.includes(cA);
}

export function calculateTeamAnalytics(
  standings: LeagueStanding[] = [],
  matches: LeagueMatchItem[] = [],
  skaters: LeagueSkaterItem[] = [],
  goalies: LeagueGoalieItem[] = [],
  fairPlay: LeagueFairPlayItem[] = []
): TeamAnalyticsSummary[] {
  return standings.map((s, index) => {
    const teamNorm = normalizeClubName(s.name);
    const playedTeamMatches = matches
      .filter((m) => m.isPlayed && (areClubNamesMatching(m.team1, teamNorm) || areClubNamesMatching(m.team2, teamNorm)))
      .sort((a, b) => a.round - b.round);

    // Form: last 5 matches
    const form: TeamFormMatch[] = playedTeamMatches.slice(-5).map((m) => {
      const isHome = areClubNamesMatching(m.team1, teamNorm);
      const teamScore = isHome ? (m.score1 ?? 0) : (m.score2 ?? 0);
      const oppScore = isHome ? (m.score2 ?? 0) : (m.score1 ?? 0);
      const opponent = isHome ? m.team2 : m.team1;

      let result: 'W' | 'D' | 'L' = 'D';
      if (teamScore > oppScore) result = 'W';
      else if (teamScore < oppScore) result = 'L';

      return {
        round: m.round,
        result,
        score: `${teamScore}:${oppScore}`,
        opponent: normalizeClubName(opponent),
        dateStr: m.dateStr,
        isHome,
      };
    });

    // Shots tracking from matches
    let totalShots = 0;
    let totalShotsAgainst = 0;
    let trackedShotsMatches = 0;
    let penaltiesFromMatches = 0;

    for (const m of playedTeamMatches) {
      const isHome = areClubNamesMatching(m.team1, teamNorm);
      const teamShots = isHome ? m.shots1 : m.shots2;
      const oppShots = isHome ? m.shots2 : m.shots1;
      const teamPen = isHome ? m.penalties1 : m.penalties2;

      if (teamShots != null && teamShots > 0) {
        totalShots += teamShots;
        trackedShotsMatches++;
      }
      if (oppShots != null && oppShots > 0) {
        totalShotsAgainst += oppShots;
      }
      if (teamPen != null && teamPen >= 0) {
        penaltiesFromMatches += teamPen;
      }
    }

    // 1. Official Fair Play penalty minutes (Table 1 on HobbyHokej) takes precedence
    const fpItem = fairPlay.find((f) => areClubNamesMatching(f.team, teamNorm));
    let totalPenalties = 0;
    if (fpItem && fpItem.penaltyMinutes !== undefined && fpItem.penaltyMinutes >= 0) {
      totalPenalties = fpItem.penaltyMinutes;
    } else if (s.penaltyMinutes !== undefined && s.penaltyMinutes > 0) {
      totalPenalties = s.penaltyMinutes;
    } else {
      totalPenalties = penaltiesFromMatches;
    }

    const gp = s.gp ?? s.gamesPlayed ?? (s.w ?? 0) + (s.d ?? 0) + (s.l ?? 0);
    const gf = s.gf ?? 0;
    const ga = s.ga ?? 0;

    // 2. Fallback to goalie stats for shots faced if not tracked in match reports
    const teamGoaliesList = goalies
      .filter((g) => areClubNamesMatching(g.club, teamNorm))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.savePercentage - a.savePercentage);

    const goalieSavesTotal = teamGoaliesList.reduce((acc, g) => acc + (g.saves || 0), 0);
    const goalieGATotal = teamGoaliesList.reduce((acc, g) => acc + (g.goalsAgainst || 0), 0);

    if (totalShotsAgainst === 0 && (goalieSavesTotal + goalieGATotal) > 0) {
      totalShotsAgainst = goalieSavesTotal + goalieGATotal;
    }

    const shootingPercentage = totalShots > 0 ? Number(((gf / totalShots) * 100).toFixed(1)) : 0;
    let savePercentage =
      totalShotsAgainst > 0
        ? Number((((totalShotsAgainst - ga) / totalShotsAgainst) * 100).toFixed(1))
        : 0;

    if (savePercentage === 0 && teamGoaliesList.length > 0 && teamGoaliesList[0].savePercentage > 0) {
      savePercentage = Number(teamGoaliesList[0].savePercentage.toFixed(1));
    }

    const penaltiesPerGame = gp > 0 ? Number((totalPenalties / gp).toFixed(1)) : 0;

    // Top scorer
    const teamSkaters = skaters
      .filter((sk) => areClubNamesMatching(sk.club, teamNorm))
      .sort((a, b) => b.points - a.points || b.goals - a.goals);

    const topScorer = teamSkaters.length > 0 ? {
      name: teamSkaters[0].name,
      goals: teamSkaters[0].goals,
      assists: teamSkaters[0].assists,
      points: teamSkaters[0].points,
    } : null;

    // Primary goalie
    const teamGoalies = goalies
      .filter((g) => areClubNamesMatching(g.club, teamNorm))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.savePercentage - a.savePercentage);

    const primaryGoalie = teamGoalies.length > 0 ? {
      name: teamGoalies[0].name,
      savePercentage: teamGoalies[0].savePercentage,
      gamesPlayed: teamGoalies[0].gamesPlayed,
      goalsAgainst: teamGoalies[0].goalsAgainst,
    } : null;

    return {
      id: s.id || teamNorm.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: teamNorm,
      rank: s.rank || index + 1,
      points: s.points,
      gp,
      w: s.w ?? s.wins ?? 0,
      d: s.d ?? s.draws ?? 0,
      l: s.l ?? s.losses ?? 0,
      gf,
      ga,
      diff: gf - ga,
      gfPerGame: gp > 0 ? Number((gf / gp).toFixed(1)) : 0,
      gaPerGame: gp > 0 ? Number((ga / gp).toFixed(1)) : 0,
      form,
      totalShots,
      totalShotsAgainst,
      shootingPercentage,
      savePercentage,
      totalPenalties,
      penaltiesPerGame,
      hasShotsTracked: trackedShotsMatches > 0,
      topScorer,
      primaryGoalie,
    };
  });
}

export function calculateLeagueOverview(
  teamSummaries: TeamAnalyticsSummary[] = [],
  matches: LeagueMatchItem[] = [],
  skaters: LeagueSkaterItem[] = [],
  goalies: LeagueGoalieItem[] = []
): LeagueAwardsLeadersData {
  const playedMatches = matches.filter((m) => m.isPlayed && m.score1 !== undefined && m.score2 !== undefined);
  const totalMatchesPlayed = playedMatches.length;
  const totalGoalsScored = playedMatches.reduce((acc, m) => acc + (m.score1 || 0) + (m.score2 || 0), 0);
  const averageGoalsPerGame =
    totalMatchesPlayed > 0 ? Number((totalGoalsScored / totalMatchesPlayed).toFixed(1)) : 0;

  // Best offense (min 1 GP)
  const sortedOffense = [...teamSummaries].filter((t) => t.gp > 0).sort((a, b) => b.gfPerGame - a.gfPerGame);
  const bestOffenseTeam = sortedOffense.length > 0 ? {
    name: sortedOffense[0].name,
    gfPerGame: sortedOffense[0].gfPerGame,
    totalGf: sortedOffense[0].gf,
  } : null;

  // Best defense (lowest GA per game, min 1 GP)
  const sortedDefense = [...teamSummaries].filter((t) => t.gp > 0).sort((a, b) => a.gaPerGame - b.gaPerGame);
  const bestDefenseTeam = sortedDefense.length > 0 ? {
    name: sortedDefense[0].name,
    gaPerGame: sortedDefense[0].gaPerGame,
    totalGa: sortedDefense[0].ga,
  } : null;

  // Best shooting team (with tracked shots)
  const sortedShooters = [...teamSummaries]
    .filter((t) => t.hasShotsTracked && t.totalShots >= 20)
    .sort((a, b) => b.shootingPercentage - a.shootingPercentage);
  const bestShootingTeam = sortedShooters.length > 0 ? {
    name: sortedShooters[0].name,
    percentage: sortedShooters[0].shootingPercentage,
    goals: sortedShooters[0].gf,
    shots: sortedShooters[0].totalShots,
  } : null;

  // Most disciplined team (lowest penalties per game)
  const sortedDiscipline = [...teamSummaries]
    .filter((t) => t.gp > 0)
    .sort((a, b) => a.penaltiesPerGame - b.penaltiesPerGame);
  const mostDisciplinedTeam = sortedDiscipline.length > 0 ? {
    name: sortedDiscipline[0].name,
    penaltiesPerGame: sortedDiscipline[0].penaltiesPerGame,
    totalPenalties: sortedDiscipline[0].totalPenalties,
  } : null;

  // Art Ross (Top points in league)
  const sortedSkaters = [...skaters].sort((a, b) => b.points - a.points || b.goals - a.goals);
  const artRossLeader = sortedSkaters.length > 0 ? {
    name: sortedSkaters[0].name,
    club: normalizeClubName(sortedSkaters[0].club),
    points: sortedSkaters[0].points,
    goals: sortedSkaters[0].goals,
    assists: sortedSkaters[0].assists,
    gp: sortedSkaters[0].gamesPlayed,
  } : null;

  // Rocket Richard (Top goals in league)
  const sortedGoalScorers = [...skaters].sort((a, b) => b.goals - a.goals || b.points - a.points);
  const rocketRichardLeader = sortedGoalScorers.length > 0 ? {
    name: sortedGoalScorers[0].name,
    club: normalizeClubName(sortedGoalScorers[0].club),
    goals: sortedGoalScorers[0].goals,
    gp: sortedGoalScorers[0].gamesPlayed,
  } : null;

  // Vezina (Top goalie by save % with at least 2 games played)
  const qualifiedGoalies = goalies.filter((g) => g.gamesPlayed >= 2);
  const sortedGoalies = (qualifiedGoalies.length > 0 ? qualifiedGoalies : goalies)
    .sort((a, b) => b.savePercentage - a.savePercentage || b.gamesPlayed - a.gamesPlayed);
  const vezinaLeader = sortedGoalies.length > 0 ? {
    name: sortedGoalies[0].name,
    club: normalizeClubName(sortedGoalies[0].club),
    savePercentage: sortedGoalies[0].savePercentage,
    saves: sortedGoalies[0].saves,
    ga: sortedGoalies[0].goalsAgainst,
  } : null;

  return {
    totalMatchesPlayed,
    totalGoalsScored,
    averageGoalsPerGame,
    bestOffenseTeam,
    bestDefenseTeam,
    bestShootingTeam,
    mostDisciplinedTeam,
    artRossLeader,
    rocketRichardLeader,
    vezinaLeader,
  };
}

export function normalizePlayerNameTokens(name: string): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function arePlayerNamesMatching(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const tokensA = normalizePlayerNameTokens(nameA);
  const tokensB = normalizePlayerNameTokens(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Exact match or set of tokens matches in any order
  if (tokensA.length === tokensB.length && tokensA.every((t) => tokensB.includes(t))) {
    return true;
  }

  // One is just a single token (e.g. "Krejčí" vs "Krejčí Denis")
  if (tokensA.length === 1 && tokensB.includes(tokensA[0])) return true;
  if (tokensB.length === 1 && tokensA.includes(tokensB[0])) return true;

  // Check matching tokens with initial (e.g. "D. Krejčí" vs "Denis Krejčí")
  for (const tA of tokensA) {
    for (const tB of tokensB) {
      if (tA === tB && tA.length > 2) {
        const otherA = tokensA.filter((t) => t !== tA);
        const otherB = tokensB.filter((t) => t !== tB);
        if (otherA.length === 0 || otherB.length === 0) return true;
        const initA = otherA[0][0];
        const initB = otherB[0][0];
        if (initA === initB) return true;
      }
    }
  }

  return false;
}

export function calculatePlayerDetailedAnalytics(
  skater: LeagueSkaterItem,
  matches: LeagueMatchItem[] = [],
  standings: LeagueStanding[] = [],
  allSkaters: LeagueSkaterItem[] = []
): PlayerDetailedAnalytics {
  const isAcesPlayer = areClubNamesMatching(skater.club, 'HC Aces');

  // Skaters in the same club
  const clubSkaters = allSkaters
    .filter((s) => areClubNamesMatching(s.club, skater.club))
    .sort((a, b) => b.points - a.points || b.goals - a.goals);
  const rankInClub = clubSkaters.findIndex((s) => arePlayerNamesMatching(s.name, skater.name)) + 1 || 1;

  // Rank in league
  const sortedLeagueSkaters = [...allSkaters].sort((a, b) => b.points - a.points || b.goals - a.goals);
  const rankInLeague = sortedLeagueSkaters.findIndex((s) => arePlayerNamesMatching(s.name, skater.name)) + 1 || skater.rank || 1;

  // Team total goals
  const teamStanding = standings.find((s) => areClubNamesMatching(s.name, skater.club));
  const teamGf = teamStanding?.gf ?? 0;
  const goalShare = teamGf > 0 ? Number(((skater.goals / teamGf) * 100).toFixed(1)) : 0;
  const pointShare = teamGf > 0 ? Number(((skater.points / teamGf) * 100).toFixed(1)) : 0;

  const ppg = skater.gamesPlayed > 0 ? Number((skater.points / skater.gamesPlayed).toFixed(2)) : 0;
  const gpg = skater.gamesPlayed > 0 ? Number((skater.goals / skater.gamesPlayed).toFixed(2)) : 0;
  const apg = skater.gamesPlayed > 0 ? Number((skater.assists / skater.gamesPlayed).toFixed(2)) : 0;

  // Matches played by this club
  const clubMatches = matches
    .filter((m) => m.isPlayed && (areClubNamesMatching(m.team1, skater.club) || areClubNamesMatching(m.team2, skater.club)))
    .sort((a, b) => a.round - b.round);

  let gamesAgainstAces = 0;
  let goalsAgainstAces = 0;
  let assistsAgainstAces = 0;

  const matchLogs: PlayerMatchLogItem[] = [];

  for (const m of clubMatches) {
    const isTeam1 = areClubNamesMatching(m.team1, skater.club);
    const oppName = isTeam1 ? m.team2 : m.team1;
    const teamScore = isTeam1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const oppScore = isTeam1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
    const result: 'W' | 'D' | 'L' = teamScore > oppScore ? 'W' : teamScore === oppScore ? 'D' : 'L';

    const isAgainstAces = !isAcesPlayer && areClubNamesMatching(oppName, 'HC Aces');
    if (isAgainstAces) {
      gamesAgainstAces++;
    }

    const goalsScored: { minute: number; assist: string | null }[] = [];
    const assistsGiven: { minute: number; scorer: string }[] = [];

    if (m.goals && Array.isArray(m.goals)) {
      for (const g of m.goals) {
        const goalByThisTeam = isTeam1 ? g.team === 'team1' : g.team === 'team2';
        if (!goalByThisTeam) continue;

        if (g.scorer && arePlayerNamesMatching(g.scorer, skater.name)) {
          goalsScored.push({ minute: g.minute, assist: g.assist || null });
          if (isAgainstAces) goalsAgainstAces++;
        }

        const assistTokens = [g.assist, ...(g.assists || [])].filter(Boolean) as string[];
        for (const ast of assistTokens) {
          if (arePlayerNamesMatching(ast, skater.name)) {
            assistsGiven.push({ minute: g.minute, scorer: g.scorer });
            if (isAgainstAces) assistsAgainstAces++;
            break;
          }
        }
      }
    }

    const pointsInMatch = goalsScored.length + assistsGiven.length;

    matchLogs.push({
      round: m.round,
      dateStr: m.dateStr,
      opponent: normalizeClubName(oppName),
      teamScore,
      oppScore,
      result,
      goalsScored,
      assistsGiven,
      pointsInMatch,
    });
  }

  return {
    skater,
    rankInLeague,
    rankInClub,
    clubSkatersCount: clubSkaters.length,
    teamGf,
    goalShare,
    pointShare,
    ppg,
    gpg,
    apg,
    isAcesPlayer,
    acesRecord: {
      gamesPlayedAgainstAces: gamesAgainstAces,
      goalsAgainstAces,
      assistsAgainstAces,
      pointsAgainstAces: goalsAgainstAces + assistsAgainstAces,
    },
    matchLogs,
  };
}

export function calculateHeadToHeadComparison(
  teamA: TeamAnalyticsSummary,
  teamB: TeamAnalyticsSummary,
  allMatches: LeagueMatchItem[]
): HeadToHeadComparison {
  const h2hMatches = allMatches.filter(
    (m) =>
      m.isPlayed &&
      ((areClubNamesMatching(m.team1, teamA.name) && areClubNamesMatching(m.team2, teamB.name)) ||
        (areClubNamesMatching(m.team2, teamA.name) && areClubNamesMatching(m.team1, teamB.name)))
  );

  let winsA = 0;
  let draws = 0;
  let winsB = 0;
  let goalsA = 0;
  let goalsB = 0;
  let shotsA = 0;
  let shotsB = 0;
  let penaltiesA = 0;
  let penaltiesB = 0;

  for (const m of h2hMatches) {
    const isAFirst = areClubNamesMatching(m.team1, teamA.name);
    const scoreA = isAFirst ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const scoreB = isAFirst ? (m.score2 ?? 0) : (m.score1 ?? 0);
    goalsA += scoreA;
    goalsB += scoreB;

    if (scoreA > scoreB) winsA++;
    else if (scoreB > scoreA) winsB++;
    else draws++;

    const shA = isAFirst ? (m.shots1 ?? 0) : (m.shots2 ?? 0);
    const shB = isAFirst ? (m.shots2 ?? 0) : (m.shots1 ?? 0);
    shotsA += shA;
    shotsB += shB;

    const penA = isAFirst ? (m.penalties1 ?? 0) : (m.penalties2 ?? 0);
    const penB = isAFirst ? (m.penalties2 ?? 0) : (m.penalties1 ?? 0);
    penaltiesA += penA;
    penaltiesB += penB;
  }

  const shootingPercentA = shotsA > 0 ? Number(((goalsA / shotsA) * 100).toFixed(1)) : 0;
  const shootingPercentB = shotsB > 0 ? Number(((goalsB / shotsB) * 100).toFixed(1)) : 0;

  const savePercentA = shotsB > 0 ? Number((((shotsB - goalsB) / shotsB) * 100).toFixed(1)) : 0;
  const savePercentB = shotsA > 0 ? Number((((shotsA - goalsA) / shotsA) * 100).toFixed(1)) : 0;

  return {
    teamA,
    teamB,
    matches: h2hMatches,
    winsA,
    draws,
    winsB,
    goalsA,
    goalsB,
    shotsA,
    shotsB,
    shootingPercentA,
    shootingPercentB,
    savePercentA,
    savePercentB,
    penaltiesA,
    penaltiesB,
  };
}

