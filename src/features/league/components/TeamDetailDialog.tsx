'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trophy, Target, Shield, AlertTriangle, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TeamAnalyticsSummary,
  LeagueMatchItem,
  LeagueSkaterItem,
  LeagueGoalieItem,
} from '../types';
import { areClubNamesMatching } from '../utils/league-analytics';
import { TeamBadge } from './TeamBadge';

interface TeamDetailDialogProps {
  team: TeamAnalyticsSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMatches?: LeagueMatchItem[];
  allSkaters?: LeagueSkaterItem[];
  allGoalies?: LeagueGoalieItem[];
}

export function TeamDetailDialog({
  team,
  open,
  onOpenChange,
  allMatches = [],
  allSkaters = [],
  allGoalies = [],
}: TeamDetailDialogProps) {
  if (!team) return null;

  const isAces = areClubNamesMatching(team.name, 'HC Aces');

  // Find head-to-head matches vs HC Aces
  const h2hMatches = !isAces
    ? allMatches.filter(
        (m) =>
          m.isPlayed &&
          ((areClubNamesMatching(m.team1, team.name) && areClubNamesMatching(m.team2, 'HC Aces')) ||
            (areClubNamesMatching(m.team2, team.name) && areClubNamesMatching(m.team1, 'HC Aces')))
      )
    : [];

  let acesWins = 0;
  let draws = 0;
  let teamWins = 0;
  for (const m of h2hMatches) {
    const isTeam1 = areClubNamesMatching(m.team1, team.name);
    const teamScore = isTeam1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const acesScore = isTeam1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
    if (acesScore > teamScore) acesWins++;
    else if (teamScore > acesScore) teamWins++;
    else draws++;
  }

  // Team players
  const teamSkaters = allSkaters
    .filter((sk) => areClubNamesMatching(sk.club, team.name))
    .sort((a, b) => b.points - a.points || b.goals - a.goals)
    .slice(0, 8);

  const teamGoalies = allGoalies
    .filter((g) => areClubNamesMatching(g.club, team.name))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.savePercentage - a.savePercentage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={isAces ? 'default' : 'outline'}
              className={cn(
                'font-bold text-xs',
                isAces && 'bg-primary text-primary-foreground shadow-sm'
              )}
            >
              {team.rank}. místo • {team.points} bodů
            </Badge>
            {isAces && (
              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                Náš tým
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black font-headline tracking-tight flex items-center gap-2.5">
            <TeamBadge name={team.name} size="md" />
            <span>{team.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Kompletní bilance a statistický profil týmu v sezóně 2025/2026
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Card className="p-3 bg-card/60 border-border/70 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Bilance (V-R-P)</p>
              <p className="text-base sm:text-lg font-bold text-foreground">
                {team.w} - {team.d} - {team.l}
              </p>
              <p className="text-[10px] text-muted-foreground">z {team.gp} zápasů</p>
            </Card>

            <Card className="p-3 bg-card/60 border-border/70 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Skóre (Rozdíl)</p>
              <p className="text-base sm:text-lg font-bold text-foreground">
                {team.gf}:{team.ga}
              </p>
              <p
                className={cn(
                  'text-[10px] font-bold',
                  team.diff > 0 ? 'text-emerald-500' : team.diff < 0 ? 'text-rose-500' : 'text-muted-foreground'
                )}
              >
                {team.diff > 0 ? `+${team.diff}` : team.diff}
              </p>
            </Card>

            <Card className="p-3 bg-card/60 border-border/70 text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-3 w-3 text-amber-500" />
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Úspěšnost střel</p>
              </div>
              <p className="text-base sm:text-lg font-bold text-amber-500">
                {team.hasShotsTracked ? `${team.shootingPercentage} %` : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {team.hasShotsTracked ? `${team.totalShots} střel` : 'nestatistikováno'}
              </p>
            </Card>

            <Card className="p-3 bg-card/60 border-border/70 text-center">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3 text-purple-500" />
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vyloučení / Z</p>
              </div>
              <p className="text-base sm:text-lg font-bold text-foreground">
                {team.penaltiesPerGame}
              </p>
              <p className="text-[10px] text-muted-foreground">celkem {team.totalPenalties} TM</p>
            </Card>
          </div>

          {/* Form matches */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Poslední odehraná utkání (Forma)</span>
            </h4>
            {team.form.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Zatím neodehráli žádný zápas.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {team.form.map((f, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col items-center justify-center text-center gap-1"
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5',
                        f.result === 'W' && 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
                        f.result === 'D' && 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                        f.result === 'L' && 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                      )}
                    >
                      {f.result === 'W' ? 'Výhra' : f.result === 'D' ? 'Remíza' : 'Prohra'}
                    </Badge>
                    <span className="text-sm font-black text-foreground">{f.score}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-full" title={f.opponent}>
                      {f.isHome ? 'vs ' : '@ '}
                      {f.opponent}
                    </span>
                    <span className="text-[9px] text-muted-foreground/80">{f.round}. kolo</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Head to Head with HC Aces */}
          {!isAces && (
            <div className="space-y-2.5 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5" />
                  <span>Vzájemná bilance s HC Aces</span>
                </h4>
                <span className="text-xs font-bold text-foreground">
                  {acesWins}V - {draws}R - {teamWins}P (z pohledu Aces)
                </span>
              </div>
              {h2hMatches.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">V této sezóně spolu týmy ještě nehrály.</p>
              ) : (
                <div className="space-y-1.5">
                  {h2hMatches.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-card/60 p-2 rounded-lg border border-border/50"
                    >
                      <span className="text-muted-foreground font-medium">{m.round}. kolo ({m.dateStr || 'termín'})</span>
                      <div className="font-bold text-foreground">
                        {m.team1} <span className="text-primary">{m.score1}:{m.score2}</span> {m.team2}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Players & Goalies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skaters */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                <span>Nejproduktivnější hráči týmu</span>
              </h4>
              {teamSkaters.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Žádné záznamy o hráčích.</p>
              ) : (
                <div className="space-y-1 text-xs">
                  {teamSkaters.map((sk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="font-semibold text-foreground truncate">{sk.name}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums shrink-0">
                        <span className="text-muted-foreground text-[11px]">{sk.goals}G + {sk.assists}A</span>
                        <Badge variant="outline" className="font-bold text-[11px] h-5 px-1.5">
                          {sk.points} B
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goalies */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                <span>Brankáři týmu</span>
              </h4>
              {teamGoalies.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Žádní evidovaní brankáři.</p>
              ) : (
                <div className="space-y-1 text-xs">
                  {teamGoalies.map((g, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="font-semibold text-foreground truncate">{g.name}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums shrink-0">
                        <span className="text-muted-foreground text-[11px]">{g.gamesPlayed} Z • {g.goalsAgainst} OG</span>
                        <Badge variant="secondary" className="font-bold text-[11px] h-5 px-1.5 text-blue-500 bg-blue-500/10">
                          {g.savePercentage.toFixed(1)} %
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
