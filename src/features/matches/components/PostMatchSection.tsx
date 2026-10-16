'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Trophy,
  Star,
  Clock,
  Lock,
  MapPin,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Award,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn, formatName } from '@/lib/utils';
import { formatMatchDate } from '@/lib/dates';
import { getMvpVotingStatus, getMatchMvpCandidates } from '../utils/mvpVoting';
import { calculateMatchStarsResults } from '../utils/matchStars';
import { getMatchOpponentName } from '../utils/headToHead';
import type { Match, UserProfile } from '@/types';

export interface PostMatchSectionProps {
  match: Match;
  currentUserId?: string;
  users: UserProfile[];
  usersMap?: Map<string, UserProfile>;
  attendees?: Array<{ userId: string; status: string }>;
  attendancesByMatch?: Map<string, Array<{ userId: string; status: string }>>;
  isAdmin?: boolean;
  onRecordResult?: (match: Match) => void;
  onOpenStarsModal?: (match?: Match) => void;
  additionalAwaitingMatches?: Match[];
}

interface StarCountsStackProps {
  star1Count: number;
  star2Count: number;
  star3Count: number;
}

function StarCountsStack({ star1Count, star2Count, star3Count }: StarCountsStackProps) {
  return (
    <div className="mt-3 w-full space-y-1.5 text-left">
      {/* Zlatá */}
      <div
        className={cn(
          'flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs transition-colors',
          star1Count > 0
            ? 'bg-amber-500/15 border-amber-500/35 text-amber-500 shadow-sm'
            : 'bg-muted/15 border-border/25 text-muted-foreground/50'
        )}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
          <Star
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              star1Count > 0 ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/35'
            )}
          />
          <span>Zlatá hvězda</span>
        </span>
        <span
          className={cn(
            'font-black tabular-nums text-xs',
            star1Count > 0 ? 'text-foreground' : 'text-muted-foreground/50'
          )}
        >
          {star1Count}x
        </span>
      </div>

      {/* Stříbrná */}
      <div
        className={cn(
          'flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs transition-colors',
          star2Count > 0
            ? 'bg-zinc-400/15 border-zinc-400/35 text-zinc-300 shadow-sm'
            : 'bg-muted/15 border-border/25 text-muted-foreground/50'
        )}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
          <Star
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              star2Count > 0 ? 'fill-zinc-400 text-zinc-400' : 'text-muted-foreground/35'
            )}
          />
          <span>Stříbrná hvězda</span>
        </span>
        <span
          className={cn(
            'font-black tabular-nums text-xs',
            star2Count > 0 ? 'text-foreground' : 'text-muted-foreground/50'
          )}
        >
          {star2Count}x
        </span>
      </div>

      {/* Bronzová */}
      <div
        className={cn(
          'flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs transition-colors',
          star3Count > 0
            ? 'bg-amber-800/20 border-amber-800/40 text-amber-600 dark:text-amber-500 shadow-sm'
            : 'bg-muted/15 border-border/25 text-muted-foreground/50'
        )}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
          <Star
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              star3Count > 0 ? 'fill-amber-700 text-amber-700' : 'text-muted-foreground/35'
            )}
          />
          <span>Bronzová hvězda</span>
        </span>
        <span
          className={cn(
            'font-black tabular-nums text-xs',
            star3Count > 0 ? 'text-foreground' : 'text-muted-foreground/50'
          )}
        >
          {star3Count}x
        </span>
      </div>
    </div>
  );
}

export function PostMatchSection({
  match,
  currentUserId,
  users,
  usersMap,
  attendees = [],
  attendancesByMatch,
  isAdmin = false,
  onRecordResult,
  onOpenStarsModal,
  additionalAwaitingMatches = [],
}: PostMatchSectionProps) {
  const [showFullStandings, setShowFullStandings] = useState(false);

  // Zápasy čekající na zpracování / odehrané zápasy pro stránkování
  const allMatches = useMemo(() => {
    const list = [match, ...(additionalAwaitingMatches || [])];
    const seen = new Set<string>();
    return list.filter((m) => {
      if (!m || !m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [match, additionalAwaitingMatches]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const activeIndex = currentIndex < allMatches.length ? currentIndex : 0;
  const currentMatch = allMatches[activeIndex] || match;

  const currentAttendees = useMemo(() => {
    return attendancesByMatch?.get(currentMatch.id) || attendees;
  }, [attendancesByMatch, currentMatch.id, attendees]);

  const votingState = useMemo(() => getMvpVotingStatus(currentMatch), [currentMatch]);
  const candidates = useMemo(
    () => getMatchMvpCandidates(currentMatch, users, currentAttendees),
    [currentMatch, users, currentAttendees]
  );
  const starsResults = useMemo(
    () => calculateMatchStarsResults(currentMatch, usersMap),
    [currentMatch, usersMap]
  );

  const opponentName = getMatchOpponentName(currentMatch);
  const matchDateLabel = formatMatchDate(currentMatch.dateTime || currentMatch.date, 'EEEE d. M. yyyy, HH:mm');
  const isVotingOpen = votingState.status === 'open';
  const isAwaitingScore = !currentMatch.isPlayed;

  // Determine if current user participated in this match
  const isParticipant = useMemo(() => {
    if (!currentUserId) return false;
    return (
      candidates.some((c) => c.id === currentUserId) ||
      currentAttendees.some((a) => a.userId === currentUserId && a.status === 'going')
    );
  }, [currentUserId, candidates, currentAttendees]);

  // Determine if current user has already voted
  const userStarsVote = currentUserId ? currentMatch.starsVotes?.[currentUserId] : undefined;
  const hasVoted = Boolean(userStarsVote || (currentUserId && currentMatch.mvpVotes?.[currentUserId]));

  // Scorers list summary if match has scorers
  const scorersSummary = useMemo(() => {
    if (!currentMatch.scorers || currentMatch.scorers.length === 0) return null;
    return currentMatch.scorers
      .map((s) => {
        const goalUser = usersMap?.get(s.goal);
        const assistUser = s.assist ? usersMap?.get(s.assist) : null;
        const goalName = goalUser ? formatName(goalUser.name) : 'Hráč';
        const assistName = assistUser ? formatName(assistUser.name) : null;
        return assistName ? `${goalName} (${assistName})` : goalName;
      })
      .join(', ');
  }, [currentMatch.scorers, usersMap]);

  // Match outcome
  const matchOutcome = useMemo(() => {
    if (currentMatch.team1Score === undefined || currentMatch.team2Score === undefined) return null;
    const isTeam1Aces = currentMatch.team1.toLowerCase().includes('aces');
    const acesScore = isTeam1Aces ? currentMatch.team1Score : currentMatch.team2Score;
    const oppScore = isTeam1Aces ? currentMatch.team2Score : currentMatch.team1Score;
    if (acesScore > oppScore) return { label: 'Výhra', variant: 'win' as const };
    if (acesScore < oppScore) return { label: 'Prohra', variant: 'loss' as const };
    return { label: 'Remíza', variant: 'draw' as const };
  }, [currentMatch]);

  const hasAnyVotes = starsResults.totalPoints > 0;

  return (
    <div className="space-y-4">
      <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden">
        {/* HORNÍ ČÁST: STAV A DETAILY ODEHRANÉHO ZÁPASU */}
        <div className="p-5 sm:p-6 border-b border-border/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {isAwaitingScore ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2.5 py-1"
                  >
                    <Clock className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                    Odehráno • Čeká na oficiální zápis
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                    Konečný výsledek
                  </Badge>
                )}

                {currentMatch.round && (
                  <span className="text-xs text-muted-foreground font-semibold">
                    {currentMatch.round}. kolo
                  </span>
                )}
              </div>

              {/* Rychlý přepínač zápasů (pills pagination) */}
              {allMatches.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-muted-foreground font-semibold mr-1">
                    Čekající zápasy ({allMatches.length}):
                  </span>
                  {allMatches.map((m, idx) => {
                    const opp = getMatchOpponentName(m);
                    const isSelected = idx === activeIndex;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={cn(
                          'h-6 text-[11px] px-2.5 rounded-full font-medium border transition-colors flex items-center gap-1 cursor-pointer',
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-sm'
                            : 'bg-background/80 border-border/70 text-muted-foreground hover:text-foreground hover:border-amber-500/40'
                        )}
                      >
                        <span>{idx + 1}. vs {opp}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-xl sm:text-2xl font-black font-headline tracking-tight">
                  HC Aces vs {opponentName}
                </h3>
                {currentMatch.team1Score !== undefined && currentMatch.team2Score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
                      {currentMatch.team1Score} : {currentMatch.team2Score}
                    </span>
                    {matchOutcome && (
                      <Badge
                        className={cn(
                          'text-xs font-bold px-2 py-0.5',
                          matchOutcome.variant === 'win'
                            ? 'bg-emerald-500 text-white'
                            : matchOutcome.variant === 'loss'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-amber-500 text-black'
                        )}
                      >
                        {matchOutcome.label}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="capitalize">{matchDateLabel}</span>
                {currentMatch.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    {currentMatch.location}
                  </span>
                )}
                {currentMatch.periodScores && (
                  <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">
                    Třetiny: {currentMatch.periodScores}
                  </span>
                )}
              </div>

              {isAwaitingScore && (
                <p className="text-xs text-muted-foreground pt-1 max-w-2xl leading-relaxed">
                  Utkání je dohráno. Oficiální skóre, střelci branek a kanadské bodování se propíší
                  automaticky po synchronizaci oficiálního zápisu z ligy.
                </p>
              )}

              {scorersSummary && (
                <p className="text-xs text-muted-foreground pt-1">
                  <strong className="text-foreground">Góly HC Aces:</strong> {scorersSummary}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
              {/* Stránkování (šipky a čítač) */}
              {allMatches.length > 1 && (
                <div className="flex items-center gap-1 bg-background/80 border border-border/70 rounded-lg p-1 text-xs shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={activeIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    title="Předchozí zápas"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-1.5 font-bold tabular-nums text-foreground text-xs whitespace-nowrap">
                    {activeIndex + 1} / {allMatches.length}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={activeIndex === allMatches.length - 1}
                    onClick={() => setCurrentIndex((prev) => Math.min(allMatches.length - 1, prev + 1))}
                    title="Další zápas"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {isAdmin && onRecordResult && isAwaitingScore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRecordResult(currentMatch)}
                  className="text-xs font-semibold shrink-0 border-amber-500/50 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                >
                  <CheckSquare className="mr-1.5 h-4 w-4 text-primary" />
                  Zapsat výsledek ručně
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* DOLNÍ ČÁST: HVĚZDY ZÁPASU (MVP) */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <Star className="h-4 w-4 fill-amber-500" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-headline font-bold">
                  MVP zápasu
                </CardTitle>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  • 3 Hvězdy utkání
                </span>
              </div>
              <CardDescription className="text-xs">
                Vyhlášení tří nejlepších hráčů utkání (1. hvězda = 3 b., 2. hvězda = 2 b., 3. hvězda = 1 b.)
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {isVotingOpen ? (
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  Hlasování otevřeno • zbývá{' '}
                  {formatDistanceToNow(votingState.closesAt, { locale: cs })}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Hlasování uzavřeno
                </Badge>
              )}
            </div>
          </div>

          {/* VÝZVA K HLASOVÁNÍ / POTVRZENÍ HLASU */}
          {isVotingOpen && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
              {isParticipant ? (
                !hasVoted ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500 shrink-0" />
                        Nastoupil jsi k tomuto utkání!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ohodnoť výkon svých spoluhráčů ze sestavy a uděl 1., 2. a 3. hvězdu zápasu.
                      </p>
                    </div>
                    {onOpenStarsModal && (
                      <Button
                        onClick={() => onOpenStarsModal(currentMatch)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shrink-0 shadow"
                      >
                        <Star className="mr-2 h-4 w-4 fill-current" />
                        Hlasovat o 3 hvězdách utkání
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-500 shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-foreground">
                          Váš hlas byl úspěšně zaznamenán
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Díky za účast v kabinovém hlasování. Průběžné pořadí hvězd vidíte níže.
                        </p>
                      </div>
                    </div>
                    {onOpenStarsModal && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenStarsModal(currentMatch)}
                        className="text-xs font-semibold shrink-0"
                      >
                        Změnit volbu
                      </Button>
                    )}
                  </div>
                )
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    Průběžné výsledky hlasování. Hlasovat o hvězdách mohou pouze hráči, kteří k zápasu
                    nastoupili.
                  </span>
                </p>
              )}
            </div>
          )}

          {/* PÓDIUM 3 HVĚZD UTKÁNÍ */}
          {hasAnyVotes ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* 1. Hvězda (Zlato) */}
                {starsResults.firstStar && (
                  <div className="relative rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/20 via-amber-500/10 to-card/90 p-5 sm:p-6 shadow-md shadow-amber-500/10 flex flex-col items-center justify-between text-center min-h-[280px]">
                    <Badge className="bg-amber-500 text-black font-black uppercase tracking-wider text-xs px-3 py-1 shadow">
                      <Star className="h-3.5 w-3.5 fill-black mr-1" /> 1. Hvězda
                    </Badge>

                    <div className="flex flex-col items-center my-3">
                      <div className="relative mb-2">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-amber-500 shadow-md">
                          <AvatarImage
                            src={starsResults.firstStar.photoURL || undefined}
                            alt={starsResults.firstStar.name}
                          />
                          <AvatarFallback className="font-bold text-base">
                            {starsResults.firstStar.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {starsResults.firstStar.jerseyNumber && (
                          <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[11px] font-black px-1.5 py-0.5 rounded-full shadow">
                            #{starsResults.firstStar.jerseyNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-lg sm:text-xl font-black font-headline tracking-tight text-foreground leading-snug">
                        {starsResults.firstStar.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {starsResults.firstStar.playerType === 'goalie' ? 'Brankář' : 'Útočník / Obránce'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-amber-500/20 w-full">
                      <p className="text-xl sm:text-2xl font-black text-amber-500 tabular-nums">
                        {starsResults.firstStar.points}{' '}
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                          {starsResults.firstStar.points === 1
                            ? 'bod'
                            : starsResults.firstStar.points < 5
                            ? 'body'
                            : 'bodů'}
                        </span>
                      </p>
                      <StarCountsStack
                        star1Count={starsResults.firstStar.star1Count}
                        star2Count={starsResults.firstStar.star2Count}
                        star3Count={starsResults.firstStar.star3Count}
                      />
                    </div>
                  </div>
                )}

                {/* 2. Hvězda (Stříbro) */}
                {starsResults.secondStar && (
                  <div className="relative rounded-2xl border-2 border-zinc-400/50 bg-gradient-to-b from-zinc-400/15 via-zinc-400/5 to-card/90 p-4 sm:p-5 shadow-sm flex flex-col items-center justify-between text-center min-h-[280px]">
                    <Badge
                      variant="outline"
                      className="border-zinc-400 text-zinc-300 font-extrabold uppercase tracking-wider text-xs px-3 py-1 bg-zinc-400/10"
                    >
                      <Star className="h-3.5 w-3.5 fill-zinc-400 mr-1" /> 2. Hvězda
                    </Badge>

                    <div className="flex flex-col items-center my-3">
                      <div className="relative mb-2">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-zinc-400 shadow-sm">
                          <AvatarImage
                            src={starsResults.secondStar.photoURL || undefined}
                            alt={starsResults.secondStar.name}
                          />
                          <AvatarFallback className="font-bold text-sm">
                            {starsResults.secondStar.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {starsResults.secondStar.jerseyNumber && (
                          <span className="absolute -bottom-1 -right-1 bg-zinc-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                            #{starsResults.secondStar.jerseyNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-base sm:text-lg font-extrabold font-headline text-foreground leading-snug">
                        {starsResults.secondStar.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {starsResults.secondStar.playerType === 'goalie' ? 'Brankář' : 'Útočník / Obránce'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-400/20 w-full">
                      <p className="text-lg sm:text-xl font-black text-zinc-300 tabular-nums">
                        {starsResults.secondStar.points}{' '}
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                          {starsResults.secondStar.points === 1
                            ? 'bod'
                            : starsResults.secondStar.points < 5
                            ? 'body'
                            : 'bodů'}
                        </span>
                      </p>
                      <StarCountsStack
                        star1Count={starsResults.secondStar.star1Count}
                        star2Count={starsResults.secondStar.star2Count}
                        star3Count={starsResults.secondStar.star3Count}
                      />
                    </div>
                  </div>
                )}

                {/* 3. Hvězda (Bronz) */}
                {starsResults.thirdStar && (
                  <div className="relative rounded-2xl border-2 border-amber-700/50 bg-gradient-to-b from-amber-700/15 via-amber-700/5 to-card/90 p-4 sm:p-5 shadow-sm flex flex-col items-center justify-between text-center min-h-[280px]">
                    <Badge
                      variant="outline"
                      className="border-amber-700 text-amber-600 font-extrabold uppercase tracking-wider text-xs px-3 py-1 bg-amber-700/10"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-700 mr-1" /> 3. Hvězda
                    </Badge>

                    <div className="flex flex-col items-center my-3">
                      <div className="relative mb-2">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-amber-700 shadow-sm">
                          <AvatarImage
                            src={starsResults.thirdStar.photoURL || undefined}
                            alt={starsResults.thirdStar.name}
                          />
                          <AvatarFallback className="font-bold text-sm">
                            {starsResults.thirdStar.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {starsResults.thirdStar.jerseyNumber && (
                          <span className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                            #{starsResults.thirdStar.jerseyNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-base sm:text-lg font-extrabold font-headline text-foreground leading-snug">
                        {starsResults.thirdStar.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {starsResults.thirdStar.playerType === 'goalie' ? 'Brankář' : 'Útočník / Obránce'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-amber-700/20 w-full">
                      <p className="text-lg sm:text-xl font-black text-amber-600 tabular-nums">
                        {starsResults.thirdStar.points}{' '}
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                          {starsResults.thirdStar.points === 1
                            ? 'bod'
                            : starsResults.thirdStar.points < 5
                            ? 'body'
                            : 'bodů'}
                        </span>
                      </p>
                      <StarCountsStack
                        star1Count={starsResults.thirdStar.star1Count}
                        star2Count={starsResults.thirdStar.star2Count}
                        star3Count={starsResults.thirdStar.star3Count}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* DETAILNÍ ROZPAD VŠECH HLASŮ (COLLAPSIBLE) */}
              {starsResults.standings.length > 0 && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullStandings((prev) => !prev)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground w-full flex items-center justify-center gap-1.5 border border-dashed border-border/80"
                  >
                    <span>
                      {showFullStandings
                        ? 'Skrýt detailní přehled všech hlasů'
                        : `Zobrazit detailní přehled všech hlasů (${starsResults.totalVoters} hlasujících kabiny)`}
                    </span>
                    {showFullStandings ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {showFullStandings && (
                    <div className="mt-3 space-y-2 rounded-xl border border-border/70 p-3 bg-muted/10">
                      {starsResults.standings.map((item, idx) => {
                        const isMyStar1 = userStarsVote?.star1 === item.candidateId;
                        const isMyStar2 = userStarsVote?.star2 === item.candidateId;
                        const isMyStar3 = userStarsVote?.star3 === item.candidateId;
                        const isMyVote = isMyStar1 || isMyStar2 || isMyStar3;

                        return (
                          <div
                            key={item.candidateId}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50 bg-card/60"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-bold text-muted-foreground text-xs w-5 text-right">
                                {idx + 1}.
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground truncate">
                                    {item.name}
                                  </span>
                                  {item.jerseyNumber && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      #{item.jerseyNumber}
                                    </span>
                                  )}
                                  {isMyVote && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 px-1.5 border-emerald-500/50 text-emerald-500 bg-emerald-500/10 font-normal"
                                    >
                                      Tvůj výběr{' '}
                                      {isMyStar1 ? '(1.)' : isMyStar2 ? '(2.)' : '(3.)'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                                  <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                                    <Star className="h-3 w-3 fill-amber-500 shrink-0" />
                                    {item.star1Count}x zlatá
                                  </span>
                                  <span className="text-muted-foreground/40">•</span>
                                  <span className="inline-flex items-center gap-1 text-zinc-400 font-semibold">
                                    <Star className="h-3 w-3 fill-zinc-400 shrink-0" />
                                    {item.star2Count}x stříbrná
                                  </span>
                                  <span className="text-muted-foreground/40">•</span>
                                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-500 font-semibold">
                                    <Star className="h-3 w-3 fill-amber-700 shrink-0" />
                                    {item.star3Count}x bronzová
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-base font-black text-primary tabular-nums">
                                {item.points} b.
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Star className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  Zatím nebyly uděleny žádné hvězdy
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isVotingOpen
                    ? 'Hlasování o 3 hvězdách právě probíhá. Buďte první ze sestavy, kdo ocení výkon spoluhráčů!'
                    : 'K tomuto utkání nebyly v hlasování uděleny žádné hlasy.'}
                </p>
              </div>
              {isVotingOpen && isParticipant && onOpenStarsModal && (
                <Button
                  size="sm"
                  onClick={() => onOpenStarsModal(currentMatch)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
                >
                  <Star className="mr-1.5 h-3.5 w-3.5 fill-current" />
                  Udělit 3 hvězdy
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
