import * as cheerio from 'cheerio';

export interface ScrapedStanding {
  rank: number;
  name: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
  penaltyMinutes?: number;
}

export interface ScrapedFairPlayTeam {
  rank: number;
  team: string;
  gamesPlayed: number;
  penaltyMinutes: number;
}

export interface ScrapedMatch {
  round: number;
  dateStr: string; // e.g. "15. 9. 2026"
  dayOfWeek: string; // e.g. "úterý"
  timeStr: string; // e.g. "21:00"
  location: string; // e.g. "Moutnice"
  team1: string;
  team2: string;
  referee?: string;
  isPlayed: boolean;
  score1?: number;
  score2?: number;
}

export interface ScrapedSkater {
  rank: number;
  name: string; // e.g. "Mlčák Jan"
  club: string; // e.g. "ACES"
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
}

export interface ScrapedGoalie {
  rank: number;
  name: string; // e.g. "Lacko Miroslav"
  club: string; // e.g. "ACES"
  gamesPlayed: number;
  minutes: number;
  saves: number;
  goalsAgainst: number;
  savePercentage: number;
  shutouts: number;
}

export interface ScrapedGoalDetail {
  minute: number;
  team: 'team1' | 'team2';
  teamName: string;
  scorer: string;
  assist: string | null;
  isPenaltyShot?: boolean;
}

export interface ScrapedMatchReport {
  round: number;
  dayOfWeek: string;
  dateStr: string;
  timeStr: string;
  location: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  periods?: string;
  shots1?: number;
  shots2?: number;
  penalties1?: number;
  penalties2?: number;
  goals: ScrapedGoalDetail[];
  team1Lineup: { goalie?: string; skaters: string[] };
  team2Lineup: { goalie?: string; skaters: string[] };
}

export interface ScrapedLeagueData {
  fetchedAt: string;
  sourceUrl: string;
  detailsUrl?: string;
  standings: ScrapedStanding[];
  acesMatches: ScrapedMatch[];
  allMatches: ScrapedMatch[];
  acesSkaters: ScrapedSkater[];
  allSkaters: ScrapedSkater[];
  acesGoalies: ScrapedGoalie[];
  allGoalies: ScrapedGoalie[];
  fairPlay: ScrapedFairPlayTeam[];
  matchReports: ScrapedMatchReport[];
  acesMatchReports: ScrapedMatchReport[];
}

export async function fetchLeagueData(
  url = 'https://hobbyhokejbrno.cz/zapasy1.html',
  detailsUrl = 'https://hobbyhokejbrno.cz/page29.html'
): Promise<ScrapedLeagueData> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const mainRes = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!mainRes.ok) {
    throw new Error(`Chyba při stahování webu ligy: ${mainRes.status} ${mainRes.statusText}`);
  }
  const mainHtml = await mainRes.text();

  let matchReports: ScrapedMatchReport[] = [];
  try {
    const detailsRes = await fetch(detailsUrl, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (detailsRes.ok) {
      const detailsHtml = await detailsRes.text();
      matchReports = parseMatchReportsHtml(detailsHtml);
    }
  } catch (e) {
    console.warn('Nepodařilo se stáhnout detailní zápisy zápasů z page29.html:', e);
  }

  const data = parseLeagueHtml(mainHtml, url);
  const isAcesTeam = (t: string) => /aces/i.test(t);
  const acesReports = matchReports.filter(r => isAcesTeam(r.team1) || isAcesTeam(r.team2));

  return {
    ...data,
    detailsUrl,
    matchReports,
    acesMatchReports: acesReports,
  };
}

export function parseMatchReportsHtml(html: string): ScrapedMatchReport[] {
  const $ = cheerio.load(html);
  const reports: ScrapedMatchReport[] = [];

  function parseGoals(goalsText: string, team1Name: string, team2Name: string): ScrapedGoalDetail[] {
    if (!goalsText || !goalsText.trim()) return [];
    const goals: ScrapedGoalDetail[] = [];
    const parts = goalsText.split(/\s+[-–—]\s+/);
    const part1 = parts[0] || '';
    const part2 = parts[1] || '';

    function extractGoals(str: string, teamIndex: 1 | 2, teamName: string) {
      if (!str.trim()) return;
      const regex = /(\d+)\s*[´'`]\s*([^,\(\d]+)(?:\(([^)]+)\))?/g;
      let match;
      while ((match = regex.exec(str)) !== null) {
        const minute = parseInt(match[1], 10);
        const scorer = match[2].trim();
        let assist = match[3] ? match[3].trim() : null;
        let isPenaltyShot = false;
        if (assist === 'TS') {
          assist = null;
          isPenaltyShot = true;
        }
        goals.push({
          minute,
          team: teamIndex === 1 ? 'team1' : 'team2',
          teamName,
          scorer,
          assist,
          isPenaltyShot
        });
      }
    }

    extractGoals(part1, 1, team1Name);
    extractGoals(part2, 2, team2Name);
    return goals.sort((a, b) => a.minute - b.minute);
  }

  function parseLineup(lineupText: string): { goalie?: string; skaters: string[] } {
    if (!lineupText || !lineupText.trim()) return { goalie: undefined, skaters: [] };
    const parts = lineupText.split(/\s*[-–—]\s*/);
    const goalie = parts[0] ? parts[0].trim() : undefined;
    const skaters = parts[1]
      ? parts[1].split(',').map(s => s.trim()).filter(Boolean)
      : [];
    return { goalie, skaters };
  }

  $('.blog-post').each((_, post) => {
    const roundText = $(post).find('.entry-date').text().trim();
    const roundMatch = roundText.match(/(\d+)\s*\.\s*kolo/i);
    const roundNum = roundMatch ? parseInt(roundMatch[1], 10) : 0;

    $(post).find('table').each((__, tbl) => {
      const rows = $(tbl).find('tr');
      let currentMatch: ScrapedMatchReport | null = null;

      rows.each((___, tr) => {
        const text = $(tr).text().replace(/\s+/g, ' ').trim();
        const cells = $(tr).find('td').map((_, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();

        const dateMatch = text.match(/(Pondělí|Úterý|Středa|Čtvrtek|Pátek|Sobota|Neděle)\s*(\d+\.\s*\d+\.\s*\d{4}),?\s*(\d{1,2}:\d{2})\s*(.*)/i);
        if (dateMatch) {
          if (currentMatch && currentMatch.team1 && currentMatch.team2) {
            reports.push(currentMatch);
          }
          currentMatch = {
            round: roundNum,
            dayOfWeek: dateMatch[1],
            dateStr: dateMatch[2].trim(),
            timeStr: dateMatch[3].trim(),
            location: dateMatch[4].trim(),
            team1: '',
            team2: '',
            score1: 0,
            score2: 0,
            periods: '',
            shots1: 0,
            shots2: 0,
            penalties1: 0,
            penalties2: 0,
            goals: [],
            team1Lineup: { skaters: [] },
            team2Lineup: { skaters: [] },
          };
          return;
        }

        if (!currentMatch) return;

        const teamRowMatch = cells.filter(c => c && c !== ':');
        if (teamRowMatch.length === 2 && !currentMatch.team1 && !text.includes(':') && !text.includes('Třetiny') && !text.includes('Střely') && !text.includes('Vyloučení') && !text.includes('Branky') && !text.includes('Sestava')) {
          currentMatch.team1 = teamRowMatch[0];
          currentMatch.team2 = teamRowMatch[1];
          return;
        }

        if (currentMatch.team1 && currentMatch.team2 && text.includes(':') && !currentMatch.periods && !text.includes('Třetiny') && !text.includes('Střely') && !text.includes('Vyloučení') && !text.includes('Branky') && !text.includes('Sestava') && !text.includes('Moutnice') && !text.includes('Úvoz')) {
          const scoreParts = text.match(/(\d+)\s*:\s*(\d+)/);
          if (scoreParts && currentMatch.score1 === 0 && currentMatch.score2 === 0) {
            currentMatch.score1 = parseInt(scoreParts[1], 10);
            currentMatch.score2 = parseInt(scoreParts[2], 10);
            return;
          }
        }

        if (text.includes('Třetiny:')) {
          currentMatch.periods = text.replace('Třetiny:', '').trim();
          return;
        }

        if (text.includes('Branky a nahrávky:')) {
          const goalsText = text.replace('Branky a nahrávky:', '').trim();
          currentMatch.goals = parseGoals(goalsText, currentMatch.team1, currentMatch.team2);
          return;
        }

        if (text.includes('Střely na bránu:')) {
          const sMatch = text.match(/(\d+)\s*:\s*(\d+)/);
          if (sMatch) {
            currentMatch.shots1 = parseInt(sMatch[1], 10);
            currentMatch.shots2 = parseInt(sMatch[2], 10);
          }
          return;
        }

        if (text.includes('Vyloučení:')) {
          const vMatch = text.match(/(\d+)\s*:\s*(\d+)/);
          if (vMatch) {
            currentMatch.penalties1 = parseInt(vMatch[1], 10);
            currentMatch.penalties2 = parseInt(vMatch[2], 10);
          }
          return;
        }

        if (text.includes('Sestava')) {
          const team1Pattern = new RegExp(currentMatch.team1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          const team2Pattern = new RegExp(currentMatch.team2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

          if (team1Pattern.test(text)) {
            const playersText = cells.length > 1 ? cells[cells.length - 1] : '';
            currentMatch.team1Lineup = parseLineup(playersText);
          } else if (team2Pattern.test(text)) {
            const playersText = cells.length > 1 ? cells[cells.length - 1] : '';
            currentMatch.team2Lineup = parseLineup(playersText);
          }
        }
      });

      const finalMatch = currentMatch as ScrapedMatchReport | null;
      if (finalMatch && finalMatch.team1 && finalMatch.team2) {
        reports.push(finalMatch);
      }
    });
  });

  return reports;
}

export function parseLeagueHtml(html: string, sourceUrl = 'https://hobbyhokejbrno.cz/zapasy1.html'): ScrapedLeagueData {
  const $ = cheerio.load(html);
  const tables = $('table');

  // Table 1: Standings
  const standings: ScrapedStanding[] = [];
  if (tables.length > 0) {
    $(tables[0])
      .find('tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('td, th')
          .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
          .get()
          .filter((t) => t.length > 0);

        // Typical row: ["1.", "Divočáci", "4", "4", "0", "0", "23", ":", "5", "8"]
        // or ["1.", "Divočáci", "4", "4", "0", "0", "23:5", "8"]
        if (cells.length >= 7 && /^\d+\.?$/.test(cells[0])) {
          const rank = parseInt(cells[0].replace('.', ''), 10);
          const name = cells[1];
          const gamesPlayed = parseInt(cells[2], 10) || 0;
          const wins = parseInt(cells[3], 10) || 0;
          const draws = parseInt(cells[4], 10) || 0;
          const losses = parseInt(cells[5], 10) || 0;

          let gf = 0;
          let ga = 0;
          let points = 0;

          if (cells[7] === ':' && cells.length >= 10) {
            gf = parseInt(cells[6], 10) || 0;
            ga = parseInt(cells[8], 10) || 0;
            points = parseInt(cells[9], 10) || 0;
          } else {
            const scoreIndex = cells.findIndex((c) => /^\d+\s*:\s*\d+$/.test(c));
            if (scoreIndex !== -1) {
              const [f, a] = cells[scoreIndex].split(':').map((s) => parseInt(s.trim(), 10));
              gf = f || 0;
              ga = a || 0;
              points = parseInt(cells[scoreIndex + 1], 10) || 0;
            }
          }

          if (name) {
            standings.push({
              rank,
              name,
              gamesPlayed,
              wins,
              draws,
              losses,
              gf,
              ga,
              points,
            });
          }
        }
      });
  }

  // Table 2: Fair Play (index 1)
  const fairPlay: ScrapedFairPlayTeam[] = [];
  if (tables.length > 1) {
    $(tables[1])
      .find('tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('td, th')
          .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
          .get()
          .filter(Boolean);
        // Typical row: ["1.", "Raci", "3", "2"]
        if (cells.length >= 4 && /^\d+\.?$/.test(cells[0])) {
          const rank = parseInt(cells[0].replace('.', ''), 10);
          const team = cells[1];
          const gamesPlayed = parseInt(cells[2], 10) || 0;
          const penaltyMinutes = parseInt(cells[3], 10) || 0;
          if (team) {
            fairPlay.push({ rank, team, gamesPlayed, penaltyMinutes });
          }
        }
      });

    // Enrich standings with official Fair Play penalty minutes
    for (const s of standings) {
      const sNorm = s.name.trim().toLowerCase();
      const fp = fairPlay.find(
        (f) =>
          f.team.trim().toLowerCase() === sNorm ||
          sNorm.includes(f.team.trim().toLowerCase()) ||
          f.team.trim().toLowerCase().includes(sNorm)
      );
      if (fp) {
        s.penaltyMinutes = fp.penaltyMinutes;
      }
    }
  }

  // Table 3: Matches (index 2)
  const allMatches: ScrapedMatch[] = [];
  if (tables.length > 2) {
    let currentRound = 1;

    $(tables[2])
      .find('tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('td, th')
          .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
          .get()
          .filter((t) => t.length > 0);

        if (cells.length < 3) return;

        // Header check
        if (cells.includes('Kolo') || cells.includes('Soupeř')) return;

        // Check if first cell is a round number like "1." or "2."
        let offset = 0;
        if (/^\d+\.$/.test(cells[0])) {
          currentRound = parseInt(cells[0].replace('.', ''), 10);
          offset = 1;
        }

        // Expected remainder: [date, day, location, time, team1, "vs.", team2, referee?, result?]
        // e.g. ["15. 9. 2026", "úterý", "Moutnice", "21:00", "Predators", "vs.", "Aces", "1. Partyka", "4:6"]
        const dateStr = cells[offset] || '';
        const dayOfWeek = cells[offset + 1] || '';
        const location = cells[offset + 2] || '';
        const timeStr = cells[offset + 3] || '';

        // Find "vs."
        const vsIndex = cells.indexOf('vs.');
        if (vsIndex !== -1 && vsIndex > offset + 3) {
          const team1 = cells[vsIndex - 1];
          const team2 = cells[vsIndex + 1];
          const remainder = cells.slice(vsIndex + 2);

          let referee = '';
          let resultStr = '';

          for (const item of remainder) {
            if (/^\d+\s*:\s*\d+$/.test(item)) {
              resultStr = item;
            } else if (/Partyka|Hruška|Kotas|Dostál|rozhodčí|\d+\./i.test(item)) {
              referee = item;
            }
          }

          let isPlayed = false;
          let score1: number | undefined;
          let score2: number | undefined;

          if (resultStr) {
            const [s1, s2] = resultStr.split(':').map((s) => parseInt(s.trim(), 10));
            if (!isNaN(s1) && !isNaN(s2)) {
              score1 = s1;
              score2 = s2;
              isPlayed = true;
            }
          }

          if (team1 && team2) {
            allMatches.push({
              round: currentRound,
              dateStr,
              dayOfWeek,
              timeStr,
              location,
              team1,
              team2,
              referee,
              isPlayed,
              score1,
              score2,
            });
          }
        }
      });
  }

  const isAcesTeam = (t: string) => /aces/i.test(t);
  const acesMatches = allMatches.filter((m) => isAcesTeam(m.team1) || isAcesTeam(m.team2));

  // Table 4: Skater Stats (index 3)
  const allSkaters: ScrapedSkater[] = [];
  if (tables.length > 3) {
    $(tables[3])
      .find('tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('td, th')
          .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
          .get()
          .filter((t) => t.length > 0);

        // ["1.", "Richter Tomáš", "HH OLDIES", "3", "8", "2", "10"]
        if (cells.length >= 7 && /^\d+\.?$/.test(cells[0])) {
          const rank = parseInt(cells[0].replace('.', ''), 10);
          const name = cells[1];
          const club = cells[2];
          const gamesPlayed = parseInt(cells[3], 10) || 0;
          const goals = parseInt(cells[4], 10) || 0;
          const assists = parseInt(cells[5], 10) || 0;
          const points = parseInt(cells[6], 10) || 0;

          if (name && club) {
            allSkaters.push({
              rank,
              name,
              club,
              gamesPlayed,
              goals,
              assists,
              points,
            });
          }
        }
      });
  }
  const acesSkaters = allSkaters.filter((s) => isAcesTeam(s.club));

  // Table 5: Goalie Stats (index 4)
  const allGoalies: ScrapedGoalie[] = [];
  if (tables.length > 4) {
    $(tables[4])
      .find('tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('td, th')
          .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
          .get()
          .filter((t) => t.length > 0);

        // ["1.", "Antoš Jakub", "DIVOČÁCI", "4", "160", "91", "5", "94,5", "0"]
        if (cells.length >= 8 && /^\d+\.?$/.test(cells[0])) {
          const rank = parseInt(cells[0].replace('.', ''), 10);
          const name = cells[1];
          const club = cells[2];
          const gamesPlayed = parseInt(cells[3], 10) || 0;
          const minutes = parseInt(cells[4], 10) || 0;
          const saves = parseInt(cells[5], 10) || 0;
          const goalsAgainst = parseInt(cells[6], 10) || 0;
          const savePercentage = parseFloat((cells[7] || '0').replace(',', '.')) || 0;
          const shutouts = parseInt(cells[8], 10) || 0;

          if (name && club) {
            allGoalies.push({
              rank,
              name,
              club,
              gamesPlayed,
              minutes,
              saves,
              goalsAgainst,
              savePercentage,
              shutouts,
            });
          }
        }
      });
  }
  const acesGoalies = allGoalies.filter((g) => isAcesTeam(g.club));

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    standings,
    acesMatches,
    allMatches,
    acesSkaters,
    allSkaters,
    acesGoalies,
    allGoalies,
    fairPlay,
    matchReports: [],
    acesMatchReports: [],
  };
}
