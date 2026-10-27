'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Target,
  Swords,
  Flame,
  Award,
  Calendar,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  LeagueSkaterItem,
  LeagueMatchItem,
  LeagueStanding,
} from '../types';
import {
  calculatePlayerDetailedAnalytics,
  areClubNamesMatching,
} from '../utils/league-analytics';
import { TeamBadge } from './TeamBadge';

interface LeaguePlayerDetailDialogProps {
  skater: LeagueSkaterItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMatches?: LeagueMatchItem[];
  allStandings?: LeagueStanding[];
  allSkaters?: LeagueSkaterItem[];
  onSelectTeam?: (teamName: string) => void;
}

export function LeaguePlayerDetailDialog({
  skater,
  open,
  onOpenChange,
  allMatches = [],
  allStandings = [],
  allSkaters = [],
  onSelectTeam,
}: LeaguePlayerDetailDialogProps) {
  const analytics = useMemo(() => {
    if (!skater) return null;
    return calculatePlayerDetailedAnalytics(skater, allMatches, allStandings, allSkaters);
  }, [skater, allMatches, allStandings, allSkaters]);

  if (!skater || !analytics) return null;

  const isAces = analytics.isAcesPlayer;
  const hasAcesPoints = analytics.acesRecord.pointsAgainstAces > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={isAces ? 'default' : 'outline'}
              className={cn(
                'font-bold text-xs',
                isAces && 'bg-primary text-primary-foreground shadow-sm'
              )}
            >
              {analytics.rankInLeague}. v lize • {skater.points} B
            </Badge>
            <Badge variant="secondary" className="text-xs font-semibold">
              {analytics.rankInClub}. v týmu ({analytics.clubSkatersCount} hráčů)
            </Badge>
            {isAces && (
              <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider bg-primary/20 text-primary border border-primary/30">
                Aces hráč
              </Badge>
            )}
            {!isAces && hasAcesPoints && (
              <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Hrozba pro Aces
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <TeamBadge name={skater.club} size="md" />
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black font-headline tracking-tight text-foreground">
                  {skater.name}
                </DialogTitle>
                <DialogDescription
                  className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => {
                    if (onSelectTeam) {
                      onOpenChange(false);
                      onSelectTeam(skater.club);
                    }
                  }}
                >
                  <span className="font-semibold text-primary">{skater.club}</span>
                  <span>•</span>
                  <span>Ligová karta hráče</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Card className="p-3 bg-card/60 border-border/70 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Zápasy (Z)</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{skater.gamesPlayed}</p>
              <p className="text-[10px] text-muted-foreground">odehraných kol</p>
            </Card>

            <Card className="p-3 bg-card/60 border-border/70 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Góly + Asistence</p>
              <p className="text-xl sm:text-2xl font-black text-primary">
                {skater.goals} + {skater.assists}
              </p>
              <p className="text-[10px] text-muted-foreground">{skater.points} kanadských bodů</p>
            </Card>

            <Card className="p-3 bg-card/60 border-border/70 text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-3 w-3 text-amber-500" />
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Průměr / Zápas</p>
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-500">{analytics.ppg}</p>
              <p className="text-[10px] text-muted-foreground">{analytics.gpg} G • {analytics.apg} A</p>
            </Card>

            <Card className="p-3 bg-card/60 border-border/70 text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-3 w-3 text-indigo-500" />
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vliv na tým</p>
              </div>
              <p className="text-xl sm:text-2xl font-black text-indigo-500">{analytics.pointShare} %</p>
              <p className="text-[10px] text-muted-foreground">podíl na gólech týmu</p>
            </Card>
          </div>

          {/* Team Influence & Goal Share Bars */}
          <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Analytický vliv na produktivitu týmu ({skater.club})</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground font-medium">Podíl na všech vstřelených gólech týmu ({analytics.teamGf} gólů celkem)</span>
                  <span className="font-bold text-foreground tabular-nums">{analytics.goalShare} % ({skater.goals} G)</span>
                </div>
                <Progress value={Math.min(100, analytics.goalShare)} className="h-2 bg-muted/60" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground font-medium">Celkový bodový podíl (Góly + Asistence)</span>
                  <span className="font-bold text-indigo-500 tabular-nums">{analytics.pointShare} % ({skater.points} B)</span>
                </div>
                <Progress value={Math.min(100, analytics.pointShare)} className="h-2 bg-muted/60" />
              </div>
            </div>
          </div>

          {/* Head to Head against HC Aces (Only for opponents) */}
          {!isAces && (
            <div
              className={cn(
                'p-3.5 rounded-xl border space-y-2',
                hasAcesPoints
                  ? 'bg-rose-500/5 border-rose-500/25'
                  : 'bg-primary/5 border-primary/20'
              )}
            >
              <div className="flex items-center justify-between">
                <h4
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider flex items-center gap-1.5',
                    hasAcesPoints ? 'text-rose-500' : 'text-primary'
                  )}
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span>Bilance proti HC Aces v sezóně</span>
                </h4>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-bold',
                    hasAcesPoints
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  )}
                >
                  {analytics.acesRecord.pointsAgainstAces} B v {analytics.acesRecord.gamesPlayedAgainstAces} Z
                </Badge>
              </div>

              {analytics.acesRecord.gamesPlayedAgainstAces === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Proti HC Aces v této sezóně ještě nenastoupil.
                </p>
              ) : (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">
                    Zápasy proti Aces: <strong className="text-foreground">{analytics.acesRecord.gamesPlayedAgainstAces}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Góly: <strong className="text-foreground">{analytics.acesRecord.goalsAgainstAces}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-muted-foreground">
                      Asistence: <strong className="text-foreground">{analytics.acesRecord.assistsAgainstAces}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Match Log */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Zápasová historie a body v sezóně</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {analytics.matchLogs.length} odehraných kol
              </span>
            </h4>

            {analytics.matchLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Zatím nebyly zaznamenány zápasy pro tento tým.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {analytics.matchLogs.map((m, idx) => {
                  const hasPoints = m.pointsInMatch > 0;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors',
                        hasPoints
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-card/40 border-border/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0 h-5 shrink-0',
                            m.result === 'W' && 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
                            m.result === 'D' && 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                            m.result === 'L' && 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                          )}
                        >
                          {m.result === 'W' ? 'V' : m.result === 'D' ? 'R' : 'P'}
                        </Badge>
                        <span className="font-semibold text-muted-foreground text-[11px] shrink-0">
                          {m.round}. kolo
                        </span>
                        <div className="flex items-center gap-1.5 truncate">
                          <TeamBadge name={m.opponent} size="sm" />
                          <span className="font-medium text-foreground truncate">
                            vs {m.opponent}
                          </span>
                        </div>
                        <span className="text-muted-foreground font-bold tabular-nums shrink-0">
                          ({m.teamScore}:{m.oppScore})
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        {hasPoints ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {m.goalsScored.length > 0 && (
                              <span className="font-semibold text-emerald-500">
                                ⚽ {m.goalsScored.length}G
                              </span>
                            )}
                            {m.assistsGiven.length > 0 && (
                              <span className="font-semibold text-blue-500">
                                🎯 {m.assistsGiven.length}A
                              </span>
                            )}
                            <Badge variant="default" className="font-bold text-[10px] h-5 px-1.5 bg-primary text-primary-foreground">
                              +{m.pointsInMatch} B
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">0 bodů</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
