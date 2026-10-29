'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Shield, Flame, Sparkles, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeagueAwardsLeadersData } from '../types';
import { areClubNamesMatching } from '../utils/league-analytics';
import { TeamBadge } from './TeamBadge';

interface LeagueAwardsLeadersProps {
  overview: LeagueAwardsLeadersData;
  onSelectTeam?: (teamName: string) => void;
}

export function LeagueAwardsLeaders({ overview, onSelectTeam }: LeagueAwardsLeadersProps) {
  const {
    artRossLeader,
    rocketRichardLeader,
    vezinaLeader,
    bestOffenseTeam,
    bestDefenseTeam,
    bestShootingTeam,
    mostDisciplinedTeam,
  } = overview;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Ligoví lídři & Ocenění
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Art Ross */}
        <Card className="p-3.5 bg-gradient-to-br from-card to-amber-500/5 border-amber-500/20 relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                Art Ross Trophy
              </span>
              <p className="text-xs text-muted-foreground">Kanadské bodování ligy</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Award className="h-4 w-4" />
            </div>
          </div>
          {artRossLeader ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <p className="font-black text-sm text-foreground truncate max-w-[150px]" title={artRossLeader.name}>
                  {artRossLeader.name}
                </p>
                <span className="text-lg font-black text-amber-500 tabular-nums">
                  {artRossLeader.points} <span className="text-xs font-normal text-muted-foreground">b</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamBadge name={artRossLeader.club} size="xs" />
                  <button
                    type="button"
                    onClick={() => onSelectTeam?.(artRossLeader.club)}
                    className="hover:underline hover:text-primary transition-colors text-left truncate"
                  >
                    {artRossLeader.club}
                    {areClubNamesMatching(artRossLeader.club, 'HC Aces') && (
                      <span className="ml-1 text-primary font-bold">(Aces)</span>
                    )}
                  </button>
                </div>
                <span className="shrink-0">{artRossLeader.goals}G + {artRossLeader.assists}A ({artRossLeader.gp}Z)</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground italic">Zatím bez dat</p>
          )}
        </Card>

        {/* Rocket Richard */}
        <Card className="p-3.5 bg-gradient-to-br from-card to-rose-500/5 border-rose-500/20 relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Maurice Richard
              </span>
              <p className="text-xs text-muted-foreground">Nejlepší střelec ligy</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <Target className="h-4 w-4" />
            </div>
          </div>
          {rocketRichardLeader ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <p className="font-black text-sm text-foreground truncate max-w-[150px]" title={rocketRichardLeader.name}>
                  {rocketRichardLeader.name}
                </p>
                <span className="text-lg font-black text-rose-500 tabular-nums">
                  {rocketRichardLeader.goals} <span className="text-xs font-normal text-muted-foreground">gólů</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamBadge name={rocketRichardLeader.club} size="xs" />
                  <button
                    type="button"
                    onClick={() => onSelectTeam?.(rocketRichardLeader.club)}
                    className="hover:underline hover:text-primary transition-colors text-left truncate"
                  >
                    {rocketRichardLeader.club}
                    {areClubNamesMatching(rocketRichardLeader.club, 'HC Aces') && (
                      <span className="ml-1 text-primary font-bold">(Aces)</span>
                    )}
                  </button>
                </div>
                <span className="shrink-0">v {rocketRichardLeader.gp} zápasech</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground italic">Zatím bez dat</p>
          )}
        </Card>

        {/* Vezina Trophy */}
        <Card className="p-3.5 bg-gradient-to-br from-card to-blue-500/5 border-blue-500/20 relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Vezina Trophy
              </span>
              <p className="text-xs text-muted-foreground">Nejlepší brankář dle %</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          {vezinaLeader ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <p className="font-black text-sm text-foreground truncate max-w-[150px]" title={vezinaLeader.name}>
                  {vezinaLeader.name}
                </p>
                <span className="text-lg font-black text-blue-500 tabular-nums">
                  {vezinaLeader.savePercentage.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">%</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamBadge name={vezinaLeader.club} size="xs" />
                  <button
                    type="button"
                    onClick={() => onSelectTeam?.(vezinaLeader.club)}
                    className="hover:underline hover:text-primary transition-colors text-left truncate"
                  >
                    {vezinaLeader.club}
                    {areClubNamesMatching(vezinaLeader.club, 'HC Aces') && (
                      <span className="ml-1 text-primary font-bold">(Aces)</span>
                    )}
                  </button>
                </div>
                <span className="shrink-0">{vezinaLeader.saves} zákroků / {vezinaLeader.ga} OG</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground italic">Zatím bez dat</p>
          )}
        </Card>

        {/* Best Shooting Team */}
        <Card className="p-3.5 bg-gradient-to-br from-card to-emerald-500/5 border-emerald-500/20 relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <Target className="h-3 w-3" />
                Střelecká efektivita
              </span>
              <p className="text-xs text-muted-foreground">Nejvyšší úspěšnost střelby</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          {bestShootingTeam ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamBadge name={bestShootingTeam.name} size="xs" />
                  <button
                    type="button"
                    onClick={() => onSelectTeam?.(bestShootingTeam.name)}
                    className="font-black text-sm text-foreground truncate max-w-[150px] hover:underline hover:text-primary text-left"
                  >
                    {bestShootingTeam.name}
                    {areClubNamesMatching(bestShootingTeam.name, 'HC Aces') && (
                      <span className="ml-1 text-primary font-bold">(Aces)</span>
                    )}
                  </button>
                </div>
                <span className="text-lg font-black text-emerald-500 tabular-nums">
                  {bestShootingTeam.percentage} <span className="text-xs font-normal text-muted-foreground">%</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                <span>{bestShootingTeam.goals} gólů ze {bestShootingTeam.shots} střel</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1 text-emerald-500 border-emerald-500/30">
                  TOP
                </Badge>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground italic">Zatím bez dat</p>
          )}
        </Card>
      </div>
    </div>
  );
}
