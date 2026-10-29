'use client';

import React from 'react';
import { Crown, HeartHandshake, Shield, Trophy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrophyLeader, MilestoneWithHolders, UpcomingMilestone } from '../../../utils/milestones';
import type { TeamChemistryData } from '../../../utils/chemistry';

export interface TeamRecordsGridProps {
  trophyLeaders?: TrophyLeader[];
  teamChemistry?: TeamChemistryData;
  milestones: MilestoneWithHolders[];
  upcomingMilestones?: UpcomingMilestone[];
  onNavigateToLeaderboards: () => void;
  onNavigateToBadges: (playerId: string) => void;
}

export function TeamRecordsGrid({
  trophyLeaders = [],
  teamChemistry,
  milestones,
  upcomingMilestones = [],
  onNavigateToLeaderboards,
  onNavigateToBadges,
}: TeamRecordsGridProps) {
  const topLeader = trophyLeaders[0] || null;
  const topDuo = teamChemistry?.topDuos?.[0] || null;

  // Total unlocked across team
  const totalUnlockedAcrossTeam = milestones.reduce((sum, m) => sum + m.totalHolders, 0);

  // Highest ironman / games holder across all games milestones, candidates, or upcoming milestones
  const ironmanLeader = React.useMemo(() => {
    // 1. Check all unlocked games milestone holders
    const allGamesHolders = milestones
      .filter((m) => m.definition.category === 'games')
      .flatMap((m) => m.holders);

    if (allGamesHolders.length > 0) {
      const top = [...allGamesHolders].sort((a, b) => b.value - a.value)[0];
      return { name: top.name, value: top.value };
    }

    // 2. Check candidates of games milestones (e.g. gp-25 closest players)
    const gamesMilestones = milestones.filter((m) => m.definition.category === 'games');
    const allCandidates = gamesMilestones.flatMap((m) => m.candidates || []);
    if (allCandidates.length > 0) {
      const top = [...allCandidates].sort((a, b) => (b.current ?? 0) - (a.current ?? 0))[0];
      if (top && (top.current ?? 0) > 0) {
        return { name: top.name, value: top.current };
      }
    }

    // 3. Fallback: Check upcoming games milestones for highest current games count
    if (upcomingMilestones && upcomingMilestones.length > 0) {
      const upcomingGames = upcomingMilestones
        .filter((u) => u.milestone.category === 'games')
        .sort((a, b) => b.current - a.current);

      if (upcomingGames.length > 0 && upcomingGames[0].current > 0) {
        return { name: upcomingGames[0].playerName, value: upcomingGames[0].current };
      }
    }

    return null;
  }, [milestones, upcomingMilestones]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
          <span>Klubová maxima & rekordy</span>
        </h3>
        <button
          onClick={onNavigateToLeaderboards}
          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
        >
          Celé žebříčky <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Král odznaků */}
        <div
          onClick={onNavigateToLeaderboards}
          className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-card p-3 sm:p-3.5 flex flex-col justify-between gap-2 cursor-pointer hover:shadow-xs hover:border-amber-500/50 transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Král odznaků
            </span>
            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <div>
            <p className="font-headline font-bold text-sm sm:text-base text-foreground truncate group-hover:text-amber-500 transition-colors">
              {topLeader ? topLeader.name : '—'}
            </p>
            <p className="text-xs text-muted-foreground font-semibold">
              {topLeader ? `${topLeader.totalBadges} trofejí` : 'Zatím nikdo'}
            </p>
          </div>
        </div>

        {/* 2. Nejsilnější duo */}
        <div
          onClick={onNavigateToLeaderboards}
          className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-card p-3 sm:p-3.5 flex flex-col justify-between gap-2 cursor-pointer hover:shadow-xs hover:border-primary/50 transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">
              Top chemie
            </span>
            <HeartHandshake className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div>
            <p className="font-headline font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
              {topDuo ? `${topDuo.player1Name.split(' ')[0]} + ${topDuo.player2Name.split(' ')[0]}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground font-semibold">
              {topDuo ? `${topDuo.totalCombinedGoals} spol. gólů (${topDuo.winRateWhenScoringPct || topDuo.winRatePct} %)` : 'Zatím nikdo'}
            </p>
          </div>
        </div>

        {/* 3. Vytrvalec */}
        <div
          onClick={() => onNavigateToBadges('all')}
          className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-card p-3 sm:p-3.5 flex flex-col justify-between gap-2 cursor-pointer hover:shadow-xs hover:border-emerald-500/50 transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Nejvíc zápasů
            </span>
            <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <div>
            <p className="font-headline font-bold text-sm sm:text-base text-foreground truncate group-hover:text-emerald-500 transition-colors">
              {ironmanLeader ? ironmanLeader.name : '—'}
            </p>
            <p className="text-xs text-muted-foreground font-semibold">
              {ironmanLeader ? `${ironmanLeader.value} odehr. zápasů` : '—'}
            </p>
          </div>
        </div>

        {/* 4. Celkem odemčeno */}
        <div
          onClick={() => onNavigateToBadges('all')}
          className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/30 via-background to-card p-3 sm:p-3.5 flex flex-col justify-between gap-2 cursor-pointer hover:shadow-xs hover:border-border transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Klubová sbírka
            </span>
            <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <div>
            <p className="font-headline font-black text-sm sm:text-base text-foreground tabular-nums group-hover:text-primary transition-colors">
              {totalUnlockedAcrossTeam}
            </p>
            <p className="text-xs text-muted-foreground font-semibold">
              odemčených odznaků
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
