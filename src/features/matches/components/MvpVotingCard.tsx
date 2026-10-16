'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, CheckCircle2, Clock, Lock, Trophy, Loader2, Star } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn, formatName } from '@/lib/utils';
import { formatMatchDate } from '@/lib/dates';
import {
  getMvpVotingStatus,
  getMatchMvpCandidates,
  calculateMvpResults,
} from '../utils/mvpVoting';
import { calculateMatchStarsResults } from '../utils/matchStars';
import { matchesService } from '../services/matchesService';
import type { Match, UserProfile } from '@/types';

export interface MvpVotingCardProps {
  match: Match;
  currentUserId?: string;
  users: UserProfile[];
  usersMap?: Map<string, UserProfile>;
  attendees?: Array<{ userId: string; status: string }>;
  onOpenStarsModal?: () => void;
}

export function MvpVotingCard({
  match,
  currentUserId,
  users,
  usersMap,
  attendees = [],
  onOpenStarsModal,
}: MvpVotingCardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [isChangingVote, setIsChangingVote] = useState(false);

  const votingState = useMemo(() => getMvpVotingStatus(match), [match]);
  const candidates = useMemo(
    () => getMatchMvpCandidates(match, users, attendees),
    [match, users, attendees]
  );
  const results = useMemo(
    () => calculateMvpResults(match, usersMap),
    [match, usersMap]
  );
  const starsResults = useMemo(
    () => calculateMatchStarsResults(match, usersMap),
    [match, usersMap]
  );

  const myVoteCandidateId = currentUserId ? match.mvpVotes?.[currentUserId] : undefined;
  const hasVoted = Boolean(myVoteCandidateId || match.starsVotes?.[currentUserId || '']);
  const isVotingOpen = votingState.status === 'open';
  const showBallot = isVotingOpen && (!hasVoted || isChangingVote);

  const handleVote = async (candidateId: string, candidateName: string) => {
    if (!firestore || !currentUserId) return;
    if (candidateId === currentUserId) {
      toast({
        variant: 'destructive',
        title: 'Nelze hlasovat pro sebe',
        description: 'Vyberte některého ze svých spoluhráčů ze sestavy.',
      });
      return;
    }

    setSubmittingId(candidateId);
    try {
      await matchesService.submitMvpVote(
        firestore,
        match.id,
        currentUserId,
        candidateId,
        match.mvpVotes || {}
      );
      setIsChangingVote(false);
      toast({
        title: 'Hlas zaznamenán',
        description: `Váš hlas pro hráče ${candidateName} byl uložen. Průběžné pořadí je nyní odemčeno.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při hlasování',
        description: error.message || 'Nepodařilo se uložit hlas.',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  // Don't render if voting hasn't started yet
  if (votingState.status === 'not_started') {
    return null;
  }

  // If voting is closed and nobody voted at all, don't clutter dashboard
  if (votingState.status === 'closed' && results.totalVotes === 0) {
    return null;
  }

  const matchDateLabel = formatMatchDate(match.dateTime || match.date, 'd. M. yyyy');
  const scoreText =
    match.team1Score !== undefined && match.team2Score !== undefined
      ? `${match.team1Score} : ${match.team2Score}`
      : null;

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/15 text-primary border border-primary/30">
                <Trophy className="h-4 w-4" />
              </div>
              <CardTitle className="text-base sm:text-lg font-headline font-bold">
                MVP zápasu
              </CardTitle>
              {isVotingOpen ? (
                <Badge className="bg-primary text-primary-foreground text-[11px]">
                  Hlasování otevřeno
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px]">
                  Uzavřeno • {results.totalVotes} {results.totalVotes === 1 ? 'hlas' : results.totalVotes < 5 ? 'hlasy' : 'hlasů'}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Utkání: <strong className="text-foreground">{match.team1} vs {match.team2}</strong>
              {scoreText && <strong className="ml-1 text-primary"> ({scoreText}) </strong>}
              <span className="text-muted-foreground">• {matchDateLabel}</span>
            </CardDescription>
          </div>

          {isVotingOpen && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground self-start sm:self-center">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>
                Končí{' '}
                {formatDistanceToNow(votingState.closesAt, {
                  addSuffix: true,
                  locale: cs,
                })}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {showBallot ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  Vyber nejlepšího hráče ze sestavy zápasu. Pro sebe hlasovat nelze. Průběžné výsledky se zobrazí po tvém hlasu.
                </span>
              </div>
              {hasVoted && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs shrink-0"
                  onClick={() => setIsChangingVote(false)}
                >
                  Zrušit změnu
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {candidates.map((cand) => {
                const isSelf = cand.id === currentUserId;
                const isSelected = cand.id === myVoteCandidateId;
                const isSubmitting = submittingId === cand.id;
                const initials = cand.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={cand.id}
                    className={cn(
                      'flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : isSelf
                        ? 'border-border/40 bg-muted/20 opacity-60'
                        : 'border-border/70 bg-card hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={cand.photoURL || undefined} alt={cand.name} />
                          <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        {cand.jerseyNumber && (
                          <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] font-black px-1 rounded-full">
                            #{cand.jerseyNumber}
                          </span>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold truncate">{formatName(cand.name)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {cand.playerType === 'goalie' ? 'Brankář' : 'Hráč v poli'}
                        </p>
                      </div>
                    </div>

                    {isSelf ? (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Tvůj profil
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        disabled={submittingId !== null}
                        onClick={() => handleVote(cand.id, cand.name)}
                        className={cn(
                          'h-7 px-2.5 text-xs font-semibold shrink-0',
                          !isSelected && 'border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground'
                        )}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isSelected ? (
                          'Zvoleno'
                        ) : (
                          'Zvolit MVP'
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Vítěz / Aktuální lídr */}
            {results.winner && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 border-2 border-primary shadow-md">
                      <AvatarImage src={results.winner.photoURL || undefined} alt={results.winner.name} />
                      <AvatarFallback className="font-bold">
                        {results.winner.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {results.winner.jerseyNumber && (
                      <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                        #{results.winner.jerseyNumber}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        {isVotingOpen ? 'Aktuální lídr hlasování' : 'Zvolený Hráč zápasu (MVP)'}
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-extrabold font-headline leading-tight">
                      {results.winner.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-primary/20">
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-black font-headline text-primary leading-tight">
                      {results.winner.votes}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({results.winner.percentage}%)
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      celkem {results.totalVotes} {results.totalVotes === 1 ? 'hlas' : results.totalVotes < 5 ? 'hlasy' : 'hlasů'}
                    </p>
                  </div>

                  {isVotingOpen && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsChangingVote(true)}
                    >
                      Změnit hlas
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Vyhlášené 3 hvězdy utkání */}
            {starsResults.firstStar && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {starsResults.firstStar && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-amber-500/50 bg-amber-500/10">
                    <div className="p-2 rounded-full bg-amber-500/20 text-amber-500 shrink-0">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-black tracking-wider text-amber-500">1. Hvězda</p>
                      <p className="text-base font-bold truncate text-foreground">{starsResults.firstStar.name}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{starsResults.firstStar.points} b.</p>
                    </div>
                  </div>
                )}
                {starsResults.secondStar && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-400/50 bg-zinc-400/10">
                    <div className="p-2 rounded-full bg-zinc-400/20 text-zinc-300 shrink-0">
                      <Star className="h-4 w-4 fill-zinc-400 text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">2. Hvězda</p>
                      <p className="text-sm sm:text-base font-bold truncate text-foreground">{starsResults.secondStar.name}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{starsResults.secondStar.points} b.</p>
                    </div>
                  </div>
                )}
                {starsResults.thirdStar && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-700/50 bg-amber-700/10">
                    <div className="p-2 rounded-full bg-amber-700/20 text-amber-600 shrink-0">
                      <Star className="h-4 w-4 fill-amber-700 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-amber-700">3. Hvězda</p>
                      <p className="text-sm sm:text-base font-bold truncate text-foreground">{starsResults.thirdStar.name}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{starsResults.thirdStar.points} b.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Žebříček všech hlasů */}
            <div className="space-y-2.5 pt-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Přehled hlasů kabiny
              </p>
              <div className="space-y-2.5">
                {results.standings.map((item, idx) => {
                  const isMyChoice = item.candidateId === myVoteCandidateId;
                  return (
                    <div key={item.candidateId} className="space-y-1.5 py-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-muted-foreground w-4">{idx + 1}.</span>
                          <span className="font-semibold">{item.name}</span>
                          {item.jerseyNumber && (
                            <span className="text-[10px] text-muted-foreground font-mono">#{item.jerseyNumber}</span>
                          )}
                          {isMyChoice && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 border-emerald-500/40 text-emerald-500 bg-emerald-500/10 font-normal"
                            >
                              <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                              Tvůj hlas
                            </Badge>
                          )}
                        </div>
                        <span className="font-bold">
                          {item.votes} <span className="text-muted-foreground font-normal">({item.percentage}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            idx === 0 ? 'bg-primary' : 'bg-muted-foreground/40'
                          )}
                          style={{ width: `${Math.max(item.percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
