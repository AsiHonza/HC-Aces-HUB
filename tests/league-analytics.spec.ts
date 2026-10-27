import { test, expect } from '@playwright/test';
import {
  normalizeClubName,
  areClubNamesMatching,
  calculateTeamAnalytics,
  calculateLeagueOverview,
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
});
