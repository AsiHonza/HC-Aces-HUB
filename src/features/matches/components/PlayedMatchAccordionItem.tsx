import React from 'react';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  MapPin,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Share2,
  Trophy,
  Clock,
} from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { GoalTimeline } from './GoalTimeline';
import { getMatchDetails, MatchLike } from '../utils/match-details';
import { calculateMvpResults, getMvpVotingStatus } from '../utils/mvpVoting';
import type { UserProfile } from '@/types';

export interface PlayedMatchData extends MatchLike {
  id: string;
  dateTime?: any;
  date?: string;
  location?: string;
  team1: string;
  team2: string;
  team1Score?: number;
  team2Score?: number;
  periodScores?: string;
  shotsTeam1?: number;
  shotsTeam2?: number;
  penaltiesTeam1?: number;
  penaltiesTeam2?: number;
  goalieName?: string;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
  goalieSavePercentage?: number;
  scorers?: { goal: string; assist: string | null }[];
  detailedScorers?: {
    minute: number;
    team: string;
    scorer: string;
    assist: string | null;
    isPenaltyShot?: boolean;
  }[];
  lineup?: any;
  gameRoster?: string[];
  mvpVotes?: Record<string, string>;
  mvpWinnerId?: string | null;
}

export interface PlayedMatchAccordionItemProps {
  match: PlayedMatchData;
  usersMap?: Map<string, any>;
  isAdmin?: boolean;
  onViewLineup?: (match: PlayedMatchData) => void;
  onShareMatch?: (match: PlayedMatchData) => void;
  onEditResult?: (match: PlayedMatchData) => void;
  onEditLineup?: (match: PlayedMatchData) => void;
  onDeleteMatch?: (match: PlayedMatchData) => void;
  className?: string;
}

export function PlayedMatchAccordionItem({
  match,
  usersMap,
  isAdmin = false,
  onViewLineup,
  onShareMatch,
  onEditResult,
  onEditLineup,
  onDeleteMatch,
  className,
}: PlayedMatchAccordionItemProps) {
  const { prefix, opponent } = getMatchDetails(match);
  const isAcesHome = /aces/i.test(match.team1);
  const acesScore = isAcesHome ? match.team1Score : match.team2Score;
  const oppScore = isAcesHome ? match.team2Score : match.team1Score;
  const isWin = (acesScore || 0) > (oppScore || 0);
  const isDraw = (acesScore || 0) === (oppScore || 0);

  const dateFormatted = match.dateTime
    ? format(toJsDate(match.dateTime), 'EEEE d. M. yyyy', { locale: cs })
    : (match.date || '');

  const hasStats =
    match.shotsTeam1 != null ||
    match.penaltiesTeam1 != null ||
    Boolean(match.goalieName);

  const mvpResults = calculateMvpResults(match as any, usersMap);
  const mvpWinner = mvpResults.winner;
  const votingStatus = getMvpVotingStatus(match as any);
  const isVotingOpen = votingStatus.status === 'open';

  return (
    <AccordionItem
      value={match.id}
      key={match.id}
      className={cn(
        'relative rounded-xl border bg-card/90 shadow-sm hover:border-primary/50 transition-colors overflow-hidden',
        className
      )}
    >
      <div className="flex items-center w-full relative">
        <AccordionTrigger className="flex-1 text-left hover:no-underline py-3.5 sm:py-4 px-3 sm:px-6 [&>svg]:ml-3 [&>svg]:shrink-0">
          <div className="flex items-center justify-between w-full text-left gap-3 sm:gap-4">
            {/* Meta & Teams */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {prefix && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-black bg-primary/10 border-primary/30 text-primary"
                  >
                    {prefix}
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Calendar className="h-3 w-3" />
                  {dateFormatted}
                </span>
                {match.location && (
                  <span className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1 font-medium">
                    <MapPin className="h-3 w-3 text-primary/70" />
                    {match.location}
                  </span>
                )}
                {isVotingOpen ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold flex items-center gap-1"
                  >
                    <Clock className="h-2.5 w-2.5" />
                    Hlasování o MVP probíhá
                  </Badge>
                ) : mvpWinner ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-primary/15 border-primary/40 text-primary font-bold flex items-center gap-1"
                  >
                    <Trophy className="h-2.5 w-2.5" />
                    MVP: {formatName(mvpWinner.name)}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    'text-base sm:text-lg font-bold truncate',
                    isAcesHome && 'text-primary'
                  )}
                >
                  {match.team1}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">
                  vs
                </span>
                <span
                  className={cn(
                    'text-base sm:text-lg font-bold truncate',
                    !isAcesHome && 'text-primary'
                  )}
                >
                  {match.team2}
                </span>
              </div>
            </div>

            {/* Score & Badge */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <div className="text-right min-w-[3.5rem] sm:min-w-[4.5rem]">
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-foreground">
                    {match.team1Score} : {match.team2Score}
                  </span>
                </div>
                {match.periodScores && (
                  <p className="text-[10px] text-muted-foreground font-semibold tabular-nums">
                    ({match.periodScores})
                  </p>
                )}
              </div>

              <Badge
                className={cn(
                  'w-16 sm:w-20 h-7 sm:h-8 flex items-center justify-center font-black text-xs uppercase tracking-wider rounded-lg border shrink-0',
                  isWin
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : isDraw
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                )}
              >
                {isWin ? 'Výhra' : isDraw ? 'Remíza' : 'Prohra'}
              </Badge>
            </div>
          </div>
        </AccordionTrigger>

        {/* Optional Admin Menu (used on History page) */}
        {isAdmin && (onEditResult || onEditLineup || onDeleteMatch) && (
          <div className="absolute right-2 top-4 sm:top-1/2 sm:-translate-y-1/2 z-10">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEditResult && (
                  <DropdownMenuItem onClick={() => onEditResult(match)}>
                    <Pencil className="mr-2 h-4 w-4" /> Upravit výsledek
                  </DropdownMenuItem>
                )}
                {onEditLineup && (
                  <DropdownMenuItem onClick={() => onEditLineup(match)}>
                    <Users className="mr-2 h-4 w-4" /> Upravit sestavu
                  </DropdownMenuItem>
                )}
                {onDeleteMatch && (
                  <DropdownMenuItem
                    onClick={() => onDeleteMatch(match)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Smazat zápas
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <AccordionContent className="bg-muted/20 px-3 sm:px-6 py-4 sm:py-5 border-t space-y-4">
        {/* Match Stats Strip */}
        {hasStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="rounded-lg border bg-card/60 p-2.5 text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Střely na bránu
              </span>
              <span className="text-base font-black tabular-nums text-foreground">
                {match.shotsTeam1 ?? '-'} : {match.shotsTeam2 ?? '-'}
              </span>
            </div>
            <div className="rounded-lg border bg-card/60 p-2.5 text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Vyloučení
              </span>
              <span className="text-base font-black tabular-nums text-foreground">
                {match.penaltiesTeam1 ?? 0} : {match.penaltiesTeam2 ?? 0}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-lg border bg-card/60 p-2.5 text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Brankář Aces
              </span>
              <span className="text-xs font-black text-cyan-400 block truncate">
                {match.goalieName || 'Nezaznamenán'}
              </span>
              {match.goalieShotsAgainst ? (
                <span className="text-[9px] text-muted-foreground font-semibold">
                  {match.goalieSaves}/{match.goalieShotsAgainst} (
                  {match.goalieSavePercentage ||
                    (
                      ((match.goalieSaves || 0) / match.goalieShotsAgainst) *
                      100
                    ).toFixed(1)}{' '}
                  %)
                </span>
              ) : null}
            </div>
          </div>
        )}

        {/* Goal Timeline or legacy scorers */}
        <GoalTimeline
          goals={match.detailedScorers}
          fallbackScorers={match.scorers}
          usersMap={usersMap}
          opponentName={opponent}
          team1={match.team1}
          team2={match.team2}
          title="Časová osa gólů"
        />

        {/* Roster & Actions Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t">
          <div className="text-xs text-muted-foreground flex-1">
            {match.gameRoster && match.gameRoster.length > 0 && (
              <p className="line-clamp-2">
                <span className="font-bold text-foreground">Sestava Aces: </span>
                {match.goalieName ? `${match.goalieName} (B) – ` : ''}
                {match.gameRoster.join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {(match.lineup || (match.gameRoster && match.gameRoster.length > 0)) && onViewLineup && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => onViewLineup(match)}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Sestava
              </Button>
            )}
            {onShareMatch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShareMatch(match)}
                className="text-xs"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" /> Sdílet
              </Button>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
