import { test, expect } from '@playwright/test';
import {
  normalizeClubName,
  areClubNamesMatching,
  arePlayerNamesMatching,
  calculateTeamAnalytics,
  calculateLeagueOverview,
  calculatePlayerDetailedAnalytics,
  calculateHeadToHeadComparison,
} from '../src/features/league/utils/league-analytics';
import { detectFinalsStatus } from '../src/features/stats/utils/season';
import type {
  LeagueStanding,
  LeagueMatchItem,
  LeagueSkaterItem,
  LeagueGoalieItem,
  Match,
  PlayoffSeries,
} from '../src/types';

test.describe('Ligové centrum - Analytika a metriky', () => {
  test('normalizeClubName a areClubNamesMatching správně rozpoznávají názvy klubů', () => {
    expect(normalizeClubName('HC Aces')).toBe('HC Aces');
    expect(normalizeClubName('aces')).toBe('HC Aces');
    expect(normalizeClubName('HH OLDIES')).toBe('HH Oldies');
    expect(normalizeClubName('Divočáci Brno')).toBe('Divočáci');
    expect(normalizeClubName('Sjetý gumy')).toBe('Sjetý gumy');

    expect(areClubNamesMatching('HC Aces', 'Aces')).toBe(true);
    expect(areClubNamesMatching('aces', 'HC ACES')).toBe(true);
    expect(areClubNamesMatching('HC Aces', 'Predators')).toBe(false);
  });

  test('calculateTeamAnalytics správně počítá formu, střeleckou úspěšnost a tresty', () => {
    const mockStandings: LeagueStanding[] = [
      {
        id: 'aces',
        name: 'HC Aces',
        points: 8,
        gf: 20,
        ga: 10,
        gp: 4,
        w: 4,
        d: 0,
        l: 0,
        rank: 1,
      },
    ];

    const mockMatches: LeagueMatchItem[] = [
      {
        round: 1,
        dateStr: '10.10.2025',
        dayOfWeek: 'Pá',
        timeStr: '20:00',
        location: 'Lužánky',
        team1: 'HC Aces',
        team2: 'Predators',
        isPlayed: true,
        score1: 5,
        score2: 2,
        shots1: 30,
        shots2: 15,
        penalties1: 2,
        penalties2: 4,
      },
      {
        round: 2,
        dateStr: '17.10.2025',
        dayOfWeek: 'Pá',
        timeStr: '20:00',
        location: 'Lužánky',
        team1: 'HH Oldies',
        team2: 'HC Aces',
        isPlayed: true,
        score1: 1,
        score2: 4,
        shots1: 20,
        shots2: 25,
        penalties1: 1,
        penalties2: 3,
      },
    ];

    const mockSkaters: LeagueSkaterItem[] = [
      {
        rank: 1,
        name: 'Denis Krejčí',
        club: 'HC Aces',
        gamesPlayed: 2,
        goals: 4,
        assists: 2,
        points: 6,
      },
    ];

    const mockGoalies: LeagueGoalieItem[] = [
      {
        rank: 1,
        name: 'Petr Brankář',
        club: 'HC Aces',
        gamesPlayed: 2,
        minutes: 90,
        saves: 32,
        goalsAgainst: 3,
        savePercentage: 91.4,
        shutouts: 0,
      },
    ];

    const analytics = calculateTeamAnalytics(mockStandings, mockMatches, mockSkaters, mockGoalies);

    expect(analytics).toHaveLength(1);
    const aces = analytics[0];

    expect(aces.name).toBe('HC Aces');
    expect(aces.gp).toBe(4);
    expect(aces.points).toBe(8);
    expect(aces.diff).toBe(10);
    expect(aces.gfPerGame).toBe(5);
    expect(aces.gaPerGame).toBe(2.5);

    // Střely: 30 + 25 = 55 střel, 20 gólů v tabulce -> (20 / 55) * 100 = 36.4%
    expect(aces.totalShots).toBe(55);
    expect(aces.hasShotsTracked).toBe(true);
    expect(aces.shootingPercentage).toBe(36.4);

    // Tresty: 2 + 3 = 5 trestů, gp = 4 -> 5 / 4 = 1.3 TM / Z
    expect(aces.totalPenalties).toBe(5);
    expect(aces.penaltiesPerGame).toBe(1.3);

    // Forma
    expect(aces.form).toHaveLength(2);
    expect(aces.form[0].result).toBe('W');
    expect(aces.form[0].score).toBe('5:2');
    expect(aces.form[1].result).toBe('W');
    expect(aces.form[1].score).toBe('4:1');

    // Lídři týmu
    expect(aces.topScorer?.name).toBe('Denis Krejčí');
    expect(aces.topScorer?.points).toBe(6);
    expect(aces.primaryGoalie?.name).toBe('Petr Brankář');
  });

  test('calculateTeamAnalytics preferuje oficiální tabulku Fair Play pro trestné minuty', () => {
    const mockStandings: LeagueStanding[] = [
      { id: 'divo', name: 'Divočáci', points: 10, gf: 27, ga: 8, gp: 5, w: 5, d: 0, l: 0, rank: 1 },
      { id: 'aces', name: 'HC Aces', points: 8, gf: 19, ga: 12, gp: 5, w: 4, d: 0, l: 1, rank: 2 },
    ];
    const mockFairPlay = [
      { rank: 8, team: 'Divočáci', gamesPlayed: 5, penaltyMinutes: 8 },
      { rank: 6, team: 'Aces', gamesPlayed: 5, penaltyMinutes: 6 },
    ];

    const analytics = calculateTeamAnalytics(mockStandings, [], [], [], mockFairPlay);
    expect(analytics[0].totalPenalties).toBe(8);
    expect(analytics[0].penaltiesPerGame).toBe(1.6);
    expect(analytics[1].totalPenalties).toBe(6);
    expect(analytics[1].penaltiesPerGame).toBe(1.2);
  });

  test('calculateLeagueOverview správně určuje ligové lídry a trofeje', () => {
    const mockStandings: LeagueStanding[] = [
      { id: '1', name: 'HC Aces', points: 6, gf: 15, ga: 5, gp: 3, w: 3, d: 0, l: 0, rank: 1 },
      { id: '2', name: 'Predators', points: 2, gf: 6, ga: 12, gp: 3, w: 1, d: 0, l: 2, rank: 2 },
    ];

    const mockMatches: LeagueMatchItem[] = [
      {
        round: 1,
        dateStr: '10.10.2025',
        dayOfWeek: 'Pá',
        timeStr: '20:00',
        location: 'Lužánky',
        team1: 'HC Aces',
        team2: 'Predators',
        isPlayed: true,
        score1: 5,
        score2: 2,
        shots1: 25,
        shots2: 18,
        penalties1: 1,
        penalties2: 3,
      },
    ];

    const mockSkaters: LeagueSkaterItem[] = [
      { rank: 1, name: 'Hráč A', club: 'HC Aces', gamesPlayed: 3, goals: 7, assists: 3, points: 10 },
      { rank: 2, name: 'Hráč B', club: 'Predators', gamesPlayed: 3, goals: 4, assists: 5, points: 9 },
    ];

    const mockGoalies: LeagueGoalieItem[] = [
      { rank: 1, name: 'Brankář A', club: 'HC Aces', gamesPlayed: 3, minutes: 135, saves: 45, goalsAgainst: 5, savePercentage: 90.0, shutouts: 1 },
    ];

    const teamSummaries = calculateTeamAnalytics(mockStandings, mockMatches, mockSkaters, mockGoalies);
    const overview = calculateLeagueOverview(teamSummaries, mockMatches, mockSkaters, mockGoalies);

    expect(overview.totalMatchesPlayed).toBe(1);
    expect(overview.totalGoalsScored).toBe(7);
    expect(overview.averageGoalsPerGame).toBe(7);

    // Ocenění
    expect(overview.bestOffenseTeam?.name).toBe('HC Aces');
    expect(overview.bestDefenseTeam?.name).toBe('HC Aces');
    expect(overview.artRossLeader?.name).toBe('Hráč A');
    expect(overview.artRossLeader?.points).toBe(10);
    expect(overview.rocketRichardLeader?.name).toBe('Hráč A');
    expect(overview.rocketRichardLeader?.goals).toBe(7);
    expect(overview.vezinaLeader?.name).toBe('Brankář A');
    expect(overview.vezinaLeader?.savePercentage).toBe(90.0);
  });

  test('detectFinalsStatus správně detekuje konec série na 3 vítězné zápasy a vítěze', () => {
    // 1. Stav série 2:1 -> ještě není dohráno
    const ongoingMatches: Partial<Match>[] = [
      { id: 'm1', isPlayed: true, type: 'playoff', playoffStage: 'finále', team1: 'HC Aces', team2: 'Predators', team1Score: 4, team2Score: 2 },
      { id: 'm2', isPlayed: true, type: 'playoff', playoffStage: 'finále', team1: 'Predators', team2: 'HC Aces', team1Score: 3, team2Score: 1 },
      { id: 'm3', isPlayed: true, type: 'playoff', playoffStage: 'finále', team1: 'HC Aces', team2: 'Predators', team1Score: 5, team2Score: 2 },
    ];

    const ongoingStatus = detectFinalsStatus({ matches: ongoingMatches as Match[] });
    expect(ongoingStatus.isFinished).toBe(false);

    // 2. HC Aces vyhrávají 4. zápas -> stav 3:1 -> finále ukončeno!
    const finishedMatches: Partial<Match>[] = [
      ...ongoingMatches,
      { id: 'm4', isPlayed: true, type: 'playoff', playoffStage: 'finále', team1: 'Predators', team2: 'HC Aces', team1Score: 2, team2Score: 4 },
    ];

    const finishedStatus = detectFinalsStatus({ matches: finishedMatches as Match[] });
    expect(finishedStatus.isFinished).toBe(true);
    expect(finishedStatus.winnerTeam).toBe('HC Aces');
    expect(finishedStatus.loserTeam).toBe('Predators');
    expect(finishedStatus.seriesScore).toBe('3 : 1');
    expect(finishedStatus.isAcesWinner).toBe(true);
    expect(finishedStatus.isAcesInvolved).toBe(true);

    // 3. Detekce z konfigurace playoffSeries v nastavení
    const mockSeries: PlayoffSeries[] = [
      {
        round: 'Finále',
        opponent: 'HH Machines',
        wins: 3,
        losses: 2,
        isFinished: true,
      },
    ];

    const seriesStatus = detectFinalsStatus({ playoffSeries: mockSeries });
    expect(seriesStatus.isFinished).toBe(true);
    expect(seriesStatus.winnerTeam).toBe('HC Aces');
    expect(seriesStatus.loserTeam).toBe('HH Machines');
    expect(seriesStatus.seriesScore).toBe('3 : 2');

    // 4. Detekce celoligového finále ze scraped leagueMatches (např. Embedit vs Divočáci 3:0)
    const mockLeagueMatches: Partial<LeagueMatchItem>[] = [
      { round: 15, isPlayed: true, team1: 'Embedit', team2: 'Divočáci', score1: 4, score2: 1 },
      { round: 16, isPlayed: true, team1: 'Divočáci', team2: 'Embedit', score1: 2, score2: 3 },
      { round: 17, isPlayed: true, team1: 'Embedit', team2: 'Divočáci', score1: 5, score2: 0 },
    ];

    const leagueStatus = detectFinalsStatus({ leagueMatches: mockLeagueMatches as LeagueMatchItem[] });
    expect(leagueStatus.isFinished).toBe(true);
    expect(leagueStatus.winnerTeam).toBe('Embedit');
    expect(leagueStatus.loserTeam).toBe('Divočáci');
    expect(leagueStatus.seriesScore).toBe('3 : 0');
  });

  test('arePlayerNamesMatching spolehlivě páruje jména a příjmení hráčů', () => {
    // 1. Prohozené pořadí jména a příjmení
    expect(arePlayerNamesMatching('Jan Mlčák', 'Mlčák Jan')).toBe(true);
    expect(arePlayerNamesMatching('Denis Krejčí', 'Krejčí Denis')).toBe(true);

    // 2. Diakritika a velká/malá písmena
    expect(arePlayerNamesMatching('MIROSLAV LACKO', 'lacko miroslav')).toBe(true);
    expect(arePlayerNamesMatching('bednar antonin', 'Bednář Antonín')).toBe(true);

    // 3. Shoda pouze na příjmení (pokud je v zápise jen příjmení)
    expect(arePlayerNamesMatching('Krejčí', 'Krejčí Denis')).toBe(true);
    expect(arePlayerNamesMatching('Mlčák Jan', 'Mlčák')).toBe(true);

    // 4. Shoda s iniciálou
    expect(arePlayerNamesMatching('D. Krejčí', 'Denis Krejčí')).toBe(true);
    expect(arePlayerNamesMatching('J. Mlčák', 'Mlčák Jan')).toBe(true);

    // 5. Různí hráči nesmí projít
    expect(arePlayerNamesMatching('Jan Mlčák', 'Denis Krejčí')).toBe(false);
    expect(arePlayerNamesMatching('Petr Novák', 'Karel Novák')).toBe(false);
  });

  test('calculatePlayerDetailedAnalytics správně počítá podíl na gólech, bilanci proti Aces a zápasovou historii', () => {
    const skater: LeagueSkaterItem = {
      rank: 1,
      name: 'Krejčí Denis',
      club: 'Predators',
      gamesPlayed: 3,
      goals: 5,
      assists: 3,
      points: 8,
    };

    const allSkaters: LeagueSkaterItem[] = [
      skater,
      { rank: 2, name: 'Hráč B', club: 'Predators', gamesPlayed: 3, goals: 3, assists: 2, points: 5 },
      { rank: 3, name: 'Hráč C', club: 'HC Aces', gamesPlayed: 3, goals: 4, assists: 0, points: 4 },
    ];

    const standings: LeagueStanding[] = [
      { id: 't1', rank: 1, name: 'Predators', gamesPlayed: 3, wins: 2, draws: 0, losses: 1, gf: 10, ga: 5, points: 4 },
      { id: 't2', rank: 2, name: 'HC Aces', gamesPlayed: 3, wins: 1, draws: 0, losses: 2, gf: 5, ga: 10, points: 2 },
    ];

    const matches: LeagueMatchItem[] = [
      // Kolo 1: Predators vs HC Aces (Predators vyhráli 4:2, Krejčí dal 2 góly + 1 asistenci)
      {
        round: 1,
        dateStr: '10. 10. 2025',
        dayOfWeek: 'pátek',
        timeStr: '20:00',
        location: 'Haly Vodova',
        team1: 'Predators',
        team2: 'HC Aces',
        isPlayed: true,
        score1: 4,
        score2: 2,
        goals: [
          { minute: 12, team: 'team1', teamName: 'Predators', scorer: 'Krejčí Denis', assist: 'Hráč B' },
          { minute: 25, team: 'team1', teamName: 'Predators', scorer: 'Hráč B', assist: 'Krejčí' },
          { minute: 38, team: 'team1', teamName: 'Predators', scorer: 'Krejčí', assist: null },
        ],
      },
      // Kolo 2: Predators vs Divočáci (Predators vyhráli 6:3, Krejčí dal 3 góly + 2 asistence)
      {
        round: 2,
        dateStr: '17. 10. 2025',
        dayOfWeek: 'pátek',
        timeStr: '20:00',
        location: 'Haly Vodova',
        team1: 'Predators',
        team2: 'Divočáci',
        isPlayed: true,
        score1: 6,
        score2: 3,
        goals: [
          { minute: 5, team: 'team1', teamName: 'Predators', scorer: 'Krejčí Denis', assist: null },
        ],
      },
    ];

    const analytics = calculatePlayerDetailedAnalytics(skater, matches, standings, allSkaters);

    expect(analytics.rankInLeague).toBe(1);
    expect(analytics.rankInClub).toBe(1);
    expect(analytics.clubSkatersCount).toBe(2);
    expect(analytics.teamGf).toBe(10);
    // Krejčí dal 5 z 10 gólů týmu -> 50.0%
    expect(analytics.goalShare).toBe(50.0);
    // Krejčí měl 8 z 10 bodů týmu -> 80.0%
    expect(analytics.pointShare).toBe(80.0);
    expect(analytics.ppg).toBe(2.67);

    // Bilance proti HC Aces
    expect(analytics.isAcesPlayer).toBe(false);
    expect(analytics.acesRecord.gamesPlayedAgainstAces).toBe(1);
    expect(analytics.acesRecord.goalsAgainstAces).toBe(2);
    expect(analytics.acesRecord.assistsAgainstAces).toBe(1);
    expect(analytics.acesRecord.pointsAgainstAces).toBe(3);

    // Zápasový log
    expect(analytics.matchLogs.length).toBe(2);
    expect(analytics.matchLogs[0].opponent).toBe('HC Aces');
    expect(analytics.matchLogs[0].pointsInMatch).toBe(3);
    expect(analytics.matchLogs[0].goalsScored.length).toBe(2);
    expect(analytics.matchLogs[0].assistsGiven.length).toBe(1);
  });

  test('calculateHeadToHeadComparison správně porovnává dva týmy', () => {
    const teamA = calculateTeamAnalytics(
      [{ id: 't1', rank: 1, name: 'HC Aces', gamesPlayed: 2, wins: 1, draws: 0, losses: 1, gf: 6, ga: 5, points: 2 }],
      [],
      [],
      []
    )[0];

    const teamB = calculateTeamAnalytics(
      [{ id: 't2', rank: 2, name: 'HH Oldies', gamesPlayed: 2, wins: 1, draws: 0, losses: 1, gf: 5, ga: 6, points: 2 }],
      [],
      [],
      []
    )[0];

    const h2hMatches: LeagueMatchItem[] = [
      {
        round: 1,
        dateStr: '1. 10. 2025',
        dayOfWeek: 'středa',
        timeStr: '20:00',
        location: 'Moutnice',
        team1: 'HC Aces',
        team2: 'HH Oldies',
        isPlayed: true,
        score1: 4,
        score2: 2,
        shots1: 30,
        shots2: 20,
        penalties1: 4,
        penalties2: 8,
      },
      {
        round: 8,
        dateStr: '20. 11. 2025',
        dayOfWeek: 'středa',
        timeStr: '20:00',
        location: 'Moutnice',
        team1: 'HH Oldies',
        team2: 'HC Aces',
        isPlayed: true,
        score1: 3,
        score2: 2,
        shots1: 25,
        shots2: 25,
        penalties1: 2,
        penalties2: 6,
      },
    ];

    const h2h = calculateHeadToHeadComparison(teamA, teamB, h2hMatches);

    expect(h2h.matches.length).toBe(2);
    expect(h2h.winsA).toBe(1);
    expect(h2h.winsB).toBe(1);
    expect(h2h.draws).toBe(0);
    expect(h2h.goalsA).toBe(6);
    expect(h2h.goalsB).toBe(5);
    expect(h2h.shotsA).toBe(55); // 30 + 25
    expect(h2h.shotsB).toBe(45); // 20 + 25
    expect(h2h.penaltiesA).toBe(10); // 4 + 6
    expect(h2h.penaltiesB).toBe(10); // 8 + 2
  });

  test('Opponent Scouting Widget spolehlivě extrahuje vizitku soupeře, klíčové hráče a formu', () => {
    const standings: LeagueStanding[] = [
      { id: '1', rank: 1, name: 'HC Aces', gamesPlayed: 5, wins: 4, draws: 0, losses: 1, gf: 25, ga: 10, points: 8 },
      { id: '2', rank: 2, name: 'Predators', gamesPlayed: 5, wins: 3, draws: 1, losses: 1, gf: 18, ga: 12, points: 7 },
    ];

    const matches: LeagueMatchItem[] = [
      {
        round: 1,
        dateStr: '1. 10. 2025',
        dayOfWeek: 'středa',
        timeStr: '20:00',
        location: 'Moutnice',
        team1: 'HC Aces',
        team2: 'Predators',
        isPlayed: true,
        score1: 4,
        score2: 2,
        shots1: 30,
        shots2: 20,
      },
      {
        round: 2,
        dateStr: '8. 10. 2025',
        dayOfWeek: 'středa',
        timeStr: '20:00',
        location: 'Moutnice',
        team1: 'Predators',
        team2: 'HH Oldies',
        isPlayed: true,
        score1: 5,
        score2: 1,
        shots1: 28,
        shots2: 14,
      },
    ];

    const skaters: LeagueSkaterItem[] = [
      { rank: 1, name: 'Karel Lovec', club: 'Predators', goals: 6, assists: 3, points: 9, gamesPlayed: 5 },
      { rank: 2, name: 'Jan Rychlý', club: 'Predators', goals: 2, assists: 4, points: 6, gamesPlayed: 5 },
    ];

    const goalies: LeagueGoalieItem[] = [
      { rank: 1, name: 'Petr Zedník', club: 'Predators', gamesPlayed: 5, goalsAgainst: 12, saves: 108, savePercentage: 90.0, minutes: 225, shutouts: 0 },
    ];

    const summaries = calculateTeamAnalytics(standings, matches, skaters, goalies);
    const predSummary = summaries.find((s) => areClubNamesMatching(s.name, 'Predators'));

    expect(predSummary).toBeDefined();
    expect(predSummary?.rank).toBe(2);
    expect(predSummary?.points).toBe(7);
    expect(predSummary?.w).toBe(3);
    expect(predSummary?.d).toBe(1);
    expect(predSummary?.l).toBe(1);
    expect(predSummary?.topScorer?.name).toBe('Karel Lovec');
    expect(predSummary?.topScorer?.points).toBe(9);
    expect(predSummary?.primaryGoalie?.name).toBe('Petr Zedník');
    expect(predSummary?.primaryGoalie?.savePercentage).toBe(90.0);
    expect(predSummary?.form.length).toBeGreaterThanOrEqual(2);
  });
});
