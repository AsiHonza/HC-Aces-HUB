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
        'relative rounded-xl border bg-card/90 shadow-sm hover:border-primary/50 transition-colors overflow-hidden border-l-4',
        isWin
          ? 'border-l-emerald-500'
          : isDraw
          ? 'border-l-amber-500'
          : 'border-l-rose-500',
        className
      )}
    >
      <div className="relative w-full min-w-0">
        <AccordionTrigger
          className={cn(
            'w-full text-left hover:no-underline py-3 sm:py-3.5 px-3 sm:px-5 [&>svg]:ml-2 sm:[&>svg]:ml-3 [&>svg]:shrink-0 min-w-0 overflow-hidden',
            isAdmin && (onEditResult || onEditLineup || onDeleteMatch) && 'pr-11 sm:pr-14'
          )}
        >
          <div className="flex flex-col gap-2 w-full min-w-0">
            {/* Meta řádek: Kolo, datum a místo vlevo, MVP status a stav utkání vpravo */}
            <div className="flex items-center justify-between gap-2 w-full min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                {prefix && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-black bg-primary/10 border-primary/30 text-primary shrink-0"
                  >
                    {prefix}
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium shrink-0">
                  <Calendar className="h-3 w-3 text-muted-foreground/70" />
                  {dateFormatted}
                </span>
                {match.location && (
                  <span className="text-[11px] text-muted-foreground hidden lg:flex items-center gap-1 font-medium shrink-0">
                    <MapPin className="h-3 w-3 text-primary/70" />
                    {match.location}
                  </span>
                )}
              </div>

              {/* Pravá strana: MVP status + Výsledek */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {isVotingOpen ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold flex items-center gap-1 shrink-0"
                  >
                    <Clock className="h-2.5 w-2.5" />
                    <span className="hidden sm:inline">Hlasování o MVP</span>
                    <span className="sm:hidden">MVP</span>
                  </Badge>
                ) : mvpWinner ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-primary/15 border-primary/40 text-primary font-bold flex items-center gap-1 shrink-0"
                  >
                    <Trophy className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[130px]">MVP: {formatName(mvpWinner.name)}</span>
                  </Badge>
                ) : null}

                {/* Stav zápasu (Výhra / Prohra / Remíza) */}
                <Badge
                  className={cn(
                    'h-5 px-2 flex items-center justify-center font-black text-[10px] uppercase tracking-wider rounded-md border shrink-0',
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

            {/* Týmy pod sebou se skóre a třetinami (Livesport styl) */}
            <div className="flex items-center justify-between gap-3 sm:gap-6 w-full pt-1">
              {/* Týmy a jejich skóre pod sebou */}
              <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                {/* Tým 1 (Domácí) */}
                <div className="flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
                  <span
                    className={cn(
                      'text-sm sm:text-base font-bold truncate tracking-tight',
                      isAcesHome ? 'text-primary font-extrabold' : 'text-foreground'
                    )}
                    title={match.team1}
                  >
                    {match.team1}
                  </span>
                  <span
                    className={cn(
                      'text-sm sm:text-base font-black tabular-nums shrink-0 px-2 sm:px-2.5 py-0.5 rounded-md min-w-[28px] sm:min-w-[32px] text-center border',
                      Number(match.team1Score) > Number(match.team2Score)
                        ? 'bg-primary/10 border-primary/30 text-primary font-black shadow-xs'
                        : 'bg-muted/40 border-border/60 text-muted-foreground font-semibold'
                    )}
                  >
                    {match.team1Score}
                  </span>
                </div>

                {/* Tým 2 (Hosté) */}
                <div className="flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
                  <span
                    className={cn(
                      'text-sm sm:text-base font-bold truncate tracking-tight',
                      !isAcesHome ? 'text-primary font-extrabold' : 'text-foreground'
                    )}
                    title={match.team2}
                  >
                    {match.team2}
                  </span>
                  <span
                    className={cn(
                      'text-sm sm:text-base font-black tabular-nums shrink-0 px-2 sm:px-2.5 py-0.5 rounded-md min-w-[28px] sm:min-w-[32px] text-center border',
                      Number(match.team2Score) > Number(match.team1Score)
                        ? 'bg-primary/10 border-primary/30 text-primary font-black shadow-xs'
                        : 'bg-muted/40 border-border/60 text-muted-foreground font-semibold'
                    )}
                  >
                    {match.team2Score}
                  </span>
                </div>
              </div>

              {/* Třetiny vpravo */}
              {match.periodScores && (
                <div className="flex flex-col items-end sm:items-center justify-center pl-2.5 sm:pl-5 border-l border-border/60 shrink-0 text-right sm:text-center min-w-[70px] sm:min-w-[90px]">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 font-bold hidden sm:inline">
                    Třetiny
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold tabular-nums text-muted-foreground sm:text-foreground/90 mt-0.5">
                    {match.periodScores}
                  </span>
                </div>
              )}
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
