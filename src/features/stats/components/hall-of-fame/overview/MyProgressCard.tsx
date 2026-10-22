'use client';

import React, { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  Medal, 
  Target, 
  ArrowRight, 
  Award,
  Flame,
  CheckCircle2,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type MilestoneWithHolders, 
  type UpcomingMilestone, 
  type TrophyLeader,
  TIER_CONFIG,
  formatUnitWithCount
} from '../../../utils/milestones';
import { getMilestoneIcon } from '../iconHelper';

export interface MyProgressCardProps {
  targetPlayer: {
    id: string;
    name: string;
    jerseyNumber?: number | null;
    photoURL?: string | null;
    role?: string;
  } | null;
  isCurrentUser: boolean;
  milestones: MilestoneWithHolders[];
  upcomingMilestones: UpcomingMilestone[];
  trophyLeaders?: TrophyLeader[];
  onNavigateToBadges: (playerId: string) => void;
  onOpenMilestoneDetail: (m: MilestoneWithHolders) => void;
}

export function MyProgressCard({
  targetPlayer,
  isCurrentUser,
  milestones,
  upcomingMilestones,
  trophyLeaders = [],
  onNavigateToBadges,
  onOpenMilestoneDetail,
}: MyProgressCardProps) {
  // Unlocked milestones by target player
  const unlockedMilestones = useMemo(() => {
    if (!targetPlayer) return [];
    return milestones.filter((m) => m.holders.some((h) => h.id === targetPlayer.id));
  }, [targetPlayer, milestones]);

  const totalCount = milestones.length;
  const unlockedCount = unlockedMilestones.length;
  const progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Medals breakdown
  const medalStats = useMemo(() => {
    return {
      legend: unlockedMilestones.filter((m) => m.definition.tier === 'legend').length,
      diamond: unlockedMilestones.filter((m) => m.definition.tier === 'diamond').length,
      gold: unlockedMilestones.filter((m) => m.definition.tier === 'gold').length,
      silver: unlockedMilestones.filter((m) => m.definition.tier === 'silver').length,
      bronze: unlockedMilestones.filter((m) => m.definition.tier === 'bronze').length,
    };
  }, [unlockedMilestones]);

  // Rank in team
  const teamRank = useMemo(() => {
    if (!targetPlayer || trophyLeaders.length === 0) return null;
    const idx = trophyLeaders.findIndex((l) => l.id === targetPlayer.id);
    return idx >= 0 ? idx + 1 : null;
  }, [targetPlayer, trophyLeaders]);

  // Find next immediate target
  const nextTarget = useMemo(() => {
    if (!targetPlayer) return null;
    // 1. Check radar upcoming milestones
    const playerUpcoming = upcomingMilestones
      .filter((u) => u.playerId === targetPlayer.id)
      .sort((a, b) => b.progressPct - a.progressPct);

    if (playerUpcoming.length > 0) {
      const top = playerUpcoming[0];
      const fullM = milestones.find((m) => m.definition.id === top.milestone.id);
      return {
        milestone: top.milestone,
        current: top.current,
        target: top.target,
        remaining: top.remaining,
        progressPct: top.progressPct,
        fullMilestone: fullM || null,
      };
    }

    // 2. Fallback: Search among candidate milestones with progress > 0
    let bestCandidate: {
      milestone: (typeof milestones)[0]['definition'];
      current: number;
      target: number;
      remaining: number;
      progressPct: number;
      fullMilestone: (typeof milestones)[0];
    } | null = null;

    for (const m of milestones) {
      const isUnlocked = m.holders.some((h) => h.id === targetPlayer.id);
      if (isUnlocked) continue;

      const cand = m.candidates?.find((c) => c.id === targetPlayer.id);
      if (cand && cand.current > 0) {
        if (!bestCandidate || cand.progressPct > bestCandidate.progressPct) {
          bestCandidate = {
            milestone: m.definition,
            current: cand.current,
            target: cand.target,
            remaining: cand.remaining,
            progressPct: cand.progressPct,
            fullMilestone: m,
          };
        }
      }
    }

    return bestCandidate;
  }, [targetPlayer, upcomingMilestones, milestones]);

  // If no target player (e.g. guest with no user profile)
  if (!targetPlayer) {
    const totalTeamUnlocked = milestones.reduce((sum, m) => sum + m.totalHolders, 0);
    const distinctHolders = new Set(milestones.flatMap((m) => m.holders.map((h) => h.id))).size;

    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-background to-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-headline font-black text-lg sm:text-xl text-foreground">
                Klubová síň slávy HC Aces
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {totalTeamUnlocked} pokořených odznaků napříč týmem • {distinctHolders} dekorovaných hráčů
              </p>
            </div>
          </div>
          <Button
            onClick={() => onNavigateToBadges('all')}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs rounded-xl shadow-xs"
          >
            Prozkoumat katalog odznaků
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-background to-card p-4 sm:p-6 shadow-sm space-y-4">
      {/* Horní řádek: Profil hráče, stav a celkový postup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Hráčské info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-13 w-13 sm:h-16 sm:w-16 border-2 border-amber-500/40 shadow-sm ring-2 ring-amber-500/20">
              <AvatarImage src={targetPlayer.photoURL || undefined} />
              <AvatarFallback className="font-headline font-black text-base bg-amber-500/20 text-amber-600 dark:text-amber-400">
                {targetPlayer.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {teamRank && teamRank <= 3 && (
              <span className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center text-xs font-black shadow-md border-2 border-background">
                {teamRank === 1 ? '🥇' : teamRank === 2 ? '🥈' : '🥉'}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline font-black text-lg sm:text-xl text-foreground truncate">
                {targetPlayer.name}
              </h2>
              {targetPlayer.jerseyNumber && (
                <Badge variant="outline" className="border-border/80 bg-background/80 text-xs font-bold font-mono">
                  #{targetPlayer.jerseyNumber}
                </Badge>
              )}
              {isCurrentUser && (
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Můj profil
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span>
                Odemčeno <strong className="text-foreground font-bold">{unlockedCount}</strong> z {totalCount} odznaků
              </span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{progressPct} %</span>
              {teamRank && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground/90">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    <strong>{teamRank}.</strong> v týmu
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tlačítko přechodu do katalogu s tímto hráčem */}
        <div className="shrink-0 self-start sm:self-center">
          <Button
            onClick={() => onNavigateToBadges(targetPlayer.id)}
            variant="outline"
            size="sm"
            className="rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-foreground font-bold text-xs gap-1.5 h-9"
          >
            <span>Všechny {isCurrentUser ? 'moje' : 'hráčovy'} odznaky</span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
          </Button>
        </div>
      </div>

      {/* Velký progress bar celkového postupu */}
      <div className="space-y-1.5 pt-1">
        <div className="h-2.5 w-full rounded-full bg-muted/80 overflow-hidden p-0.5 border border-border/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 transition-all duration-500 shadow-xs"
            style={{ width: `${Math.max(4, progressPct)}%` }}
          />
        </div>

        {/* Rozpis medailí a úrovní */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs font-semibold flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {medalStats.legend > 0 && (
              <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold" title="Legendární odznaky">
                <Crown className="h-3.5 w-3.5 fill-current" />
                <span>{medalStats.legend}</span>
                <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">Legenda</span>
              </span>
            )}
            {medalStats.diamond > 0 && (
              <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold" title="Diamantové odznaky">
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                <span>{medalStats.diamond}</span>
                <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">Diamant</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold" title="Zlaté odznaky">
              <Medal className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>{medalStats.gold}</span>
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">Zlato</span>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-700 dark:text-zinc-300 font-bold" title="Stříbrné odznaky">
              <Medal className="h-3.5 w-3.5 text-slate-300 fill-slate-300" />
              <span>{medalStats.silver}</span>
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">Stříbro</span>
            </span>
            <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-600 font-bold" title="Bronzové odznaky">
              <Medal className="h-3.5 w-3.5 text-amber-700 fill-amber-700" />
              <span>{medalStats.bronze}</span>
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">Bronz</span>
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground">
            Zbývá odemknout <strong className="text-foreground">{totalCount - unlockedCount}</strong> odznaků
          </span>
        </div>
      </div>

      {/* 🎯 DALŠÍ CÍL (NEXT IMMEDIATE TARGET) */}
      {nextTarget && (
        <div
          onClick={() => {
            if (nextTarget.fullMilestone) {
              onOpenMilestoneDetail(nextTarget.fullMilestone);
            } else {
              onNavigateToBadges(targetPlayer.id);
            }
          }}
          className="rounded-xl border border-amber-500/30 bg-background/80 hover:bg-background p-3 sm:p-3.5 transition-all hover:shadow-sm cursor-pointer group space-y-2 mt-2"
          title="Klikněte pro detail tohoto odznaku a radar adeptů"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                {getMilestoneIcon(nextTarget.milestone.iconName, nextTarget.milestone.tier, 'h-4 w-4')}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Nejbližší cíl
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0 font-bold', TIER_CONFIG[nextTarget.milestone.tier]?.badgeClass)}
                  >
                    {TIER_CONFIG[nextTarget.milestone.tier]?.label}
                  </Badge>
                </div>
                <h4 className="font-headline font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {nextTarget.milestone.title}
                </h4>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {nextTarget.current} / {nextTarget.target}
              </span>
              <span className="text-[10px] text-muted-foreground block -mt-0.5">
                {nextTarget.milestone.unit}
              </span>
            </div>
          </div>

          {/* Mini progress bar a zbývající hodnota */}
          <div className="space-y-1">
            <Progress value={nextTarget.progressPct} className="h-1.5 bg-muted rounded-full" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Chybí jen:{' '}
                <strong className="text-foreground font-bold">
                  {nextTarget.remaining} {formatUnitWithCount(nextTarget.remaining, nextTarget.milestone.unit, nextTarget.milestone.id)}
                </strong>
              </span>
              <span className="text-[11px] font-bold text-primary group-hover:underline inline-flex items-center gap-0.5">
                Detail cíle →
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
