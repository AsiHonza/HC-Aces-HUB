'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Shield, Flame, Sparkles, Award } from 'lucide-react';
import type { LeagueAwardsLeadersData } from '../types';
import { areClubNamesMatching } from '../utils/league-analytics';
import { TeamBadge } from './TeamBadge';

interface LeagueAwardsLeadersProps {
  overview: LeagueAwardsLeadersData;
  onSelectTeam?: (teamName: string) => void;
}

export function LeagueAwardsLeaders({
  overview,
  onSelectTeam,
}: LeagueAwardsLeadersProps) {
  const {
    artRossLeader,
    rocketRichardLeader,
    vezinaLeader,
    bestShootingTeam,
  } = overview;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-0.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Ligoví lídři & Ocenění
        </h3>
      </div>

      {/* 2x2 Grid on Mobile, 4 Columns on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Art Ross */}
        <Card className="p-3 sm:p-3.5 bg-gradient-to-br from-card to-amber-500/[0.06] border-amber-500/25 relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1 truncate">
                <Trophy className="h-3 w-3 shrink-0" />
                Art Ross Trophy
              </span>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Kanadské bodování
              </p>
            </div>
            <div className="hidden sm:flex h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 items-center justify-center text-amber-500 shrink-0">
              <Award className="h-3.5 w-3.5" />
            </div>
          </div>
          {artRossLeader ? (
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-1">
                <p
                  className="font-black text-xs sm:text-sm text-foreground truncate"
                  title={artRossLeader.name}
                >
                  {artRossLeader.name}
                </p>
                <span className="text-sm sm:text-lg font-black text-amber-500 tabular-nums shrink-0">
                  {artRossLeader.points}{' '}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    b
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground mt-1 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TeamBadge name={artRossLeader.club} size="xs" />
                  <button
                    type="button"
                    onClick={() => onSelectTeam?.(artRossLeader.club)}
                    className="hover:underline hover:text-primary transition-colors text-left truncate"
                  >
                    {artRossLeader.club}
                    {areClubNamesMatching(artRossLeader.club, 'HC Aces') && (
                      <span className="ml-1 text-primary font-bold">
                        (Aces)
                      </span>
                    )}
                  </button>
                </div>
                <span className="shrink-0 tabular-nums">
                  {artRossLeader.goals}G+{artRossLeader.assists}A
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2.5 text-xs text-muted-foreground italic">
              Zatím bez dat
            </p>
          )}
        </Card>

        {/* Rocket Richard */}
        <Card className="p-3 sm:p-3.5 bg-gradient-to-br from-card to-rose-500/[0.06] border-rose-500/25 relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1 truncate">
                <Flame className="h-3 w-3 shrink-0" />
                Maurice Richard
              </span>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Nejlepší střelec
              </p>
            </div>
            <div className="hidden sm:flex h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 items-center justify-center text-rose-500 shrink-0">
              <Target className="h-3.5 w-3.5" />
            </div>
          </div>
          {rocketRichardLeader ? (
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-1">
                <p
                  className="font-black text-xs sm:text-sm text-foreground truncate"
                  title={rocketRichardLeader.name}
                >
                  {rocketRichardLeader.name}
                </p>
                <span className="text-sm sm:text-lg font-black text-rose-500 tabular-nums shrink-0">
                  {rocketRichardLeader.goals}{' '}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    G
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground mt-1 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TeamBadge name={rocketRichardLeader.club} size="xs" />
                  <button
                    type="button"
                    onClick={() => onSelectTeam?.(rocketRichardLeader.club)}
                    className="hover:underline hover:text-primary transition-colors text-left truncate"
                  >
                    {rocketRichardLeader.club}
                    {areClubNamesMatching(
                      rocketRichardLeader.club,
                      'HC Aces'
                    ) && (
                      <span className="ml-1 text-primary font-bold">
                        (Aces)
                      </span>
                    )}
                  </button>
                </div>
                <span className="shrink-0 tabular-nums">
                  {rocketRichardLeader.gp} záp.
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2.5 text-xs text-muted-foreground italic">
              Zatím bez dat
            </p>
          )}
        </Card>

        {/* Vezina Trophy */}
        <Card className="p-3 sm:p-3.5 bg-gradient-to-br from-card to-blue-500/[0.06] border-blue-500/25 relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-blue-500 flex items-center gap-1 truncate">
                <Shield className="h-3 w-3 shrink-0" />
                Vezina Trophy
              </span>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Nejlepší brankář
              </p>
            </div>
            <div className="hidden sm:flex h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 items-center justify-center text-blue-500 shrink-0">
              <Shield className="h-3.5 w-3.5" />
            </div>
          </div>
          {vezinaLeader ? (
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-1">
                <p
                  className="font-black text-xs sm:text-sm text-foreground truncate"
                  title={vezinaLeader.name}
                >
                  {vezinaLeader.name}
                </p>
                <span className="text-sm sm:text-lg font-black text-blue-500 tabular-nums shrink-0">
                  {vezinaLeader.savePercentage.toFixed(1)}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    %
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground mt-1 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TeamBadge name={vezinaLeader.club} size="xs" />
                  <button
                    type="button"
                    onClick={() => onSelectTeam?.(vezinaLeader.club)}
                    className="hover:underline hover:text-primary transition-colors text-left truncate"
                  >
                    {vezinaLeader.club}
                    {areClubNamesMatching(vezinaLeader.club, 'HC Aces') && (
                      <span className="ml-1 text-primary font-bold">
                        (Aces)
                      </span>
                    )}
                  </button>
                </div>
                <span className="shrink-0 tabular-nums">
                  {vezinaLeader.saves} zák.
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2.5 text-xs text-muted-foreground italic">
              Zatím bez dat
            </p>
          )}
        </Card>

        {/* Best Shooting Team */}
        <Card className="p-3 sm:p-3.5 bg-gradient-to-br from-card to-emerald-500/[0.06] border-emerald-500/25 relative overflow-hidden">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1 truncate">
                <Target className="h-3 w-3 shrink-0" />
                Efektivita střelby
              </span>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Nejvyšší úspěšnost
              </p>
            </div>
            <div className="hidden sm:flex h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-500 shrink-0">
              <Flame className="h-3.5 w-3.5" />
            </div>
          </div>
          {bestShootingTeam ? (
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TeamBadge name={bestShootingTeam.name} size="xs" />
                  <button
                    type="button"
                    onClick={() => onSelectTeam?.(bestShootingTeam.name)}
                    className="font-black text-xs sm:text-sm text-foreground truncate hover:underline hover:text-primary text-left"
                  >
                    {bestShootingTeam.name}
                    {areClubNamesMatching(
                      bestShootingTeam.name,
                      'HC Aces'
                    ) && (
                      <span className="ml-1 text-primary font-bold">
                        (Aces)
                      </span>
                    )}
                  </button>
                </div>
                <span className="text-sm sm:text-lg font-black text-emerald-500 tabular-nums shrink-0">
                  {bestShootingTeam.percentage}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    %
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground mt-1 gap-1">
                <span className="truncate">
                  {bestShootingTeam.goals}G / {bestShootingTeam.shots} střel
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1 text-emerald-500 border-emerald-500/30 shrink-0"
                >
                  TOP
                </Badge>
              </div>
            </div>
          ) : (
            <p className="mt-2.5 text-xs text-muted-foreground italic">
              Zatím bez dat
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
