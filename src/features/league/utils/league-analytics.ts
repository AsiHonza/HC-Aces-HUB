import {
  LeagueStanding,
  LeagueMatchItem,
  LeagueSkaterItem,
  LeagueGoalieItem,
  LeagueFairPlayItem,
  TeamAnalyticsSummary,
  TeamFormMatch,
  LeagueAwardsLeadersData,
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
