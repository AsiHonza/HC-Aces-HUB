import type { Match } from '@/types';
import { toSafeDate } from '@/lib/dates';
import { format } from 'date-fns';

/**
 * Formats a JS Date into RFC 5545 UTC timestamp: YYYYMMDDTHHMMSSZ
 */
export function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escapes special characters for iCalendar text fields
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates a single VEVENT block for a match.
 * - Match duration: 75 minutes
 * - Locker room gathering (Sraz v kabině): 45 minutes before faceoff (with VALARM)
 */
export function generateMatchVEvent(match: Match): string {
  const startDate = toSafeDate(match.dateTime || match.date) ?? new Date();
  // 75 minutes match duration
  const endDate = new Date(startDate.getTime() + 75 * 60 * 1000);
  // 45 minutes before start = locker room gathering time
  const gatheringDate = new Date(startDate.getTime() - 45 * 60 * 1000);
  const gatheringTimeStr = format(gatheringDate, 'HH:mm');
  const faceoffTimeStr = format(startDate, 'HH:mm');

  const roundLabel = match.round
    ? `${match.round}. kolo`
    : match.type === 'playoff'
    ? `Play-off ${match.playoffStage || ''}`.trim()
    : 'Přátelský zápas';

  const scoreSuffix =
    match.isPlayed && match.team1Score !== undefined && match.team2Score !== undefined
      ? ` [${match.team1Score}:${match.team2Score}]`
      : '';

  const summary = `HC Aces: ${match.team1} vs ${match.team2} (${roundLabel})${scoreSuffix}`;
  const location = match.location || match.place || 'Brno';

  const descriptionLines = [
    `Sraz v kabině: ${gatheringTimeStr} (45 min před úvodním buly)`,
    `Úvodní buly: ${faceoffTimeStr} (délka ledu 75 min)`,
    `Utkání: ${match.team1} vs ${match.team2} (${roundLabel})`,
    `Stadion: ${location}`,
  ];
  if (match.isPlayed && match.team1Score !== undefined && match.team2Score !== undefined) {
    descriptionLines.push(`Výsledek: ${match.team1Score}:${match.team2Score}`);
  }

  const uid = `match-${match.id}@hcaces.cz`;
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(startDate);
  const dtEnd = formatIcsDate(endDate);

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT45M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Sraz v kabině HC Aces (45 min do začátku zápasu)',
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * Generates a complete VCALENDAR (.ics) string for a list of matches
 */
export function generateCalendarIcs(matches: Match[]): string {
  const validMatches = matches.filter((m) => m && (m.dateTime || m.date));
  const events = validMatches.map((m) => generateMatchVEvent(m));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HC Aces Brno//HC Aces HUB//CS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:HC Aces - Rozpis zápasů',
    'X-WR-TIMEZONE:Europe/Prague',
    'X-WR-CALDESC:Oficiální rozpis zápasů HC Aces Brno (sraz v kabině 45 min předem, délka 75 min)',
    'REFRESH-INTERVAL;VALUE=DURATION:PT4H',
    'X-PUBLISHED-TTL:PT4H',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a browser download of an .ics file for a single match
 */
export function downloadMatchIcs(match: Match): void {
  if (typeof window === 'undefined') return;
  const content = generateCalendarIcs([match]);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `hc-aces-zapas-${match.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of an .ics file for all matches in the season
 */
export function downloadFullSeasonIcs(matches: Match[]): void {
  if (typeof window === 'undefined') return;
  const content = generateCalendarIcs(matches);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'hc-aces-rozpis-zapasu.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
