'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, Target, Trophy, Minus, Plus, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { cn, formatName, isGoaliePlayer } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';
import type { Match, UserProfile } from '@/types';
import {
  type MatchPredictionData,
  getMatchPredictionsResults,
} from '../utils/predictions';

export interface MatchPredictionWidgetProps {
  match: Match | any;
  opponentName: string;
  currentUserId?: string;
  attendees?: Array<{
    userId: string;
    status: 'going' | 'not-going' | 'unknown';
    prediction?: MatchPredictionData;
  }>;
  usersMap?: Map<string, UserProfile>;
  onSavePrediction?: (prediction: {
    acesScore: number;
    opponentScore: number;
    firstScorerId: string | null;
  }) => Promise<void>;
}

export function MatchPredictionWidget({
  match,
  opponentName,
  currentUserId,
  attendees = [],
  usersMap,
  onSavePrediction,
}: MatchPredictionWidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myAttendee = useMemo(
    () => attendees.find((a) => a.userId === currentUserId),
    [attendees, currentUserId]
  );
  const myPrediction = myAttendee?.prediction;

  const [acesScore, setAcesScore] = useState<number>(myPrediction?.acesScore ?? 5);
  const [opponentScore, setOpponentScore] = useState<number>(myPrediction?.opponentScore ?? 3);
  const [firstScorerId, setFirstScorerId] = useState<string>(
    myPrediction?.firstScorerId || 'none'
  );

  const matchStart = useMemo(() => toJsDate(match.dateTime), [match.dateTime]);
  const isLocked = Boolean(match.isPlayed || new Date().getTime() >= matchStart.getTime());

  const allUsersList = useMemo(
    () => (usersMap ? Array.from(usersMap.values()) : []),
    [usersMap]
  );

  // Skaters sorted: going skaters first, then others alphabetically
  const skaterOptions = useMemo(() => {
    const goingSet = new Set(
      attendees.filter((a) => a.status === 'going').map((a) => a.userId)
    );
    return allUsersList
      .filter((u) => !isGoaliePlayer(u) && u.playerType !== 'member')
      .sort((a, b) => {
        const aGoing = goingSet.has(a.id);
        const bGoing = goingSet.has(b.id);
        if (aGoing !== bGoing) return aGoing ? -1 : 1;
        return a.name.localeCompare(b.name, 'cs');
      });
  }, [allUsersList, attendees]);

  const allPredictions = useMemo(() => {
    return attendees.filter(
      (a) => a.prediction && typeof a.prediction.acesScore === 'number'
    );
  }, [attendees]);

  const evaluatedResults = useMemo(() => {
    if (!match.isPlayed) return [];
    return getMatchPredictionsResults(match as Match, attendees, allUsersList);
  }, [match, attendees, allUsersList]);

  const teamAverageTip = useMemo(() => {
    if (allPredictions.length === 0) return null;
    const sumAces = allPredictions.reduce(
      (acc, a) => acc + Number(a.prediction?.acesScore ?? 0),
      0
    );
    const sumOpp = allPredictions.reduce(
      (acc, a) => acc + Number(a.prediction?.opponentScore ?? 0),
      0
    );
    return {
      aces: Math.round(sumAces / allPredictions.length),
      opp: Math.round(sumOpp / allPredictions.length),
    };
  }, [allPredictions]);

  const handleOpenDialog = () => {
    setAcesScore(myPrediction?.acesScore ?? 5);
    setOpponentScore(myPrediction?.opponentScore ?? 3);
    setFirstScorerId(myPrediction?.firstScorerId || 'none');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!onSavePrediction) return;
    setIsSubmitting(true);
    try {
      await onSavePrediction({
        acesScore,
        opponentScore,
        firstScorerId: firstScorerId !== 'none' ? firstScorerId : null,
      });
      setIsDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const myScorerName = useMemo(() => {
    if (!myPrediction?.firstScorerId || !usersMap) return null;
    const u = usersMap.get(myPrediction.firstScorerId);
    return u ? formatName(u.name) : null;
  }, [myPrediction, usersMap]);

  return (
    <>
      <div className="w-full min-w-0 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                🎯 Tipovačka kabiny
              </span>
              {allPredictions.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 bg-background/60 border-border"
                >
                  {allPredictions.length}{' '}
                  {allPredictions.length === 1
                    ? 'tip'
                    : allPredictions.length <= 4
                    ? 'tipy'
                    : 'tipů'}
                </Badge>
              )}
              {teamAverageTip && allPredictions.length >= 2 && (
                <span className="text-[10px] text-muted-foreground">
                  • Průměr týmu:{' '}
                  <strong className="text-foreground">
                    {teamAverageTip.aces}:{teamAverageTip.opp}
                  </strong>
                </span>
              )}
            </div>

            {myPrediction ? (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Můj tip:{' '}
                <span className="font-bold text-primary">
                  Aces {myPrediction.acesScore}:{myPrediction.opponentScore}{' '}
                  {opponentName}
                </span>
                {myScorerName && (
                  <span className="ml-1.5 text-foreground/90">
                    • 1. gól: <strong>{myScorerName}</strong>
                  </span>
                )}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tipni si přesný výsledek (+5 b.) a střelce 1. gólu Aces (+3 b.)!
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          {!isLocked && onSavePrediction ? (
            <Button
              type="button"
              size="sm"
              variant={myPrediction ? 'outline' : 'default'}
              onClick={handleOpenDialog}
              className={cn(
                'h-8 text-xs font-semibold w-full sm:w-auto',
                myPrediction && 'border-primary/40 text-primary hover:bg-primary/10'
              )}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {myPrediction ? 'Upravit tip' : 'Tipnout zápas'}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleOpenDialog}
              className="h-8 text-xs font-semibold w-full sm:w-auto"
            >
              <Lock className="h-3 w-3 mr-1.5 text-muted-foreground" />
              Zobrazit tipy ({allPredictions.length})
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-1.5rem)] p-5">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <span>Předzápasová tipovačka</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Soutěž <strong>Věštec kabiny</strong> • Uzávěrka s úvodním buly utkání.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Pravidla bodování */}
            <div className="rounded-lg bg-muted/40 border border-border/60 p-2.5 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-1.5">
              <span>🎯 Přesné skóre: <strong className="text-foreground">+5 b.</strong></span>
              <span>📐 Rozdíl: <strong className="text-foreground">+2 b.</strong></span>
              <span>✅ Vítěz: <strong className="text-foreground">+1 b.</strong></span>
              <span>🏒 1. střelec: <strong className="text-primary">+3 b.</strong></span>
            </div>

            {!isLocked && onSavePrediction && (
              <>
                {/* Score steppers */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary truncate max-w-full">
                      HC Aces
                    </span>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setAcesScore((s) => Math.max(0, s - 1))}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-2xl font-black tabular-nums w-8 text-center">
                        {acesScore}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setAcesScore((s) => Math.min(25, s + 1))}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate max-w-full">
                      {opponentName}
                    </span>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setOpponentScore((s) => Math.max(0, s - 1))}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-2xl font-black tabular-nums w-8 text-center">
                        {opponentScore}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setOpponentScore((s) => Math.min(25, s + 1))}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* First scorer select */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Kdo vstřelí první gól HC Aces? (bonus +3 body)
                  </Label>
                  <Select value={firstScorerId} onValueChange={setFirstScorerId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Vyber střelce 1. gólu..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">Nevybráno (bez tipu na střelce)</SelectItem>
                      {skaterOptions.map((sk) => {
                        const isGoing = attendees.some(
                          (a) => a.userId === sk.id && a.status === 'going'
                        );
                        return (
                          <SelectItem key={sk.id} value={sk.id}>
                            {sk.jerseyNumber ? `#${sk.jerseyNumber} ` : ''}
                            {formatName(sk.name)}
                            {isGoing ? ' (Jde ✓)' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Existing predictions list */}
            {allPredictions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Tipy spoluhráčů ({allPredictions.length})
                </p>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {match.isPlayed
                    ? evaluatedResults.map((ev) => (
                        <div
                          key={ev.userId}
                          className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs"
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-semibold">{formatName(ev.userName)}</span>
                            <span className="text-muted-foreground ml-1.5">
                              ({ev.prediction.acesScore}:{ev.prediction.opponentScore}
                              {ev.firstScorerName ? ` • ${formatName(ev.firstScorerName)}` : ''})
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] shrink-0 font-bold',
                              ev.totalPoints >= 5
                                ? 'bg-amber-500/15 text-amber-500 border-amber-500/40'
                                : ev.totalPoints > 0
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
                                : 'text-muted-foreground'
                            )}
                          >
                            {ev.badgeLabel}
                          </Badge>
                        </div>
                      ))
                    : allPredictions.map((att) => {
                        const u = usersMap?.get(att.userId);
                        const sc =
                          att.prediction?.firstScorerId && usersMap
                            ? usersMap.get(att.prediction.firstScorerId)
                            : null;
                        return (
                          <div
                            key={att.userId}
                            className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs"
                          >
                            <span className="font-semibold truncate">
                              {u ? formatName(u.name) : 'Hráč'}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {att.prediction?.acesScore}:{att.prediction?.opponentScore}
                              </Badge>
                              {sc && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({formatName(sc.name)})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>
            )}
          </div>

          {!isLocked && onSavePrediction && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Zrušit
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládám tip...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Uložit tip ({acesScore}:{opponentScore})
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
