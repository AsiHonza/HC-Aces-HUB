'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Trophy, Calendar, ChevronRight, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type MilestoneWithHolders,
  type UpcomingMilestone,
  type MilestoneHolder,
  TIER_CONFIG,
  formatUnitWithCount,
} from '../utils/milestones';
import { DEFAULT_SEASON_START_MS } from '../utils/season';
import { getMilestoneIcon } from './hall-of-fame/iconHelper';

export interface TeamMilestonesSpotlightCardProps {
  milestones: MilestoneWithHolders[];
  upcomingMilestones: UpcomingMilestone[];
  newMilestoneIds?: Set<string>;
  newUnlockKeys?: Set<string>;
  onOpenPlayerCareer?: (playerId: string) => void;
  onOpenMilestoneDetail?: (milestoneId: string) => void;
  className?: string;
}

interface SpotlightUnlockItem {
  key: string;
  milestone: MilestoneWithHolders;
  holder: MilestoneHolder;
  isNew: boolean;
  dateStr?: string;
  timestampMs: number;
  context?: string;
  matchRound?: number;
  isLatestMatch: boolean;
}

function parseCzechDateStr(dateStr?: string): number {
  if (!dateStr) return 0;
  const parts = dateStr
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day, 12, 0, 0).getTime();
    }
  }
  return 0;
}

export function TeamMilestonesSpotlightCard({
  milestones,
  upcomingMilestones,
  newMilestoneIds,
  newUnlockKeys,
  onOpenPlayerCareer,
  onOpenMilestoneDetail,
  className,
}: TeamMilestonesSpotlightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { recentUnlocks, latestMatchCount, newCount } = useMemo(() => {
    const raw: Omit<SpotlightUnlockItem, 'isLatestMatch'>[] = [];
    let maxTs = 0;

    milestones.forEach((m) => {
      m.holders.forEach((h) => {
        const ts = h.achievementTimestamp || parseCzechDateStr(h.achievementDate);
        if (ts > maxTs) maxTs = ts;
        const unlockKey = `${m.definition.id}:${h.id}`;
        const isNew = newUnlockKeys
          ? newUnlockKeys.has(unlockKey)
          : Boolean(newMilestoneIds?.has(m.definition.id));

        raw.push({
          key: `${m.definition.id}-${h.id}`,
          milestone: m,
          holder: h,
          isNew,
          dateStr: h.achievementDate,
          timestampMs: ts,
          context: h.matchContext,
          matchRound: h.matchRound,
        });
      });
    });

    const tierPriority: Record<string, number> = {
      legend: 5,
      diamond: 4,
      gold: 3,
      silver: 2,
      bronze: 1,
    };

    const list: SpotlightUnlockItem[] = raw.map((item) => ({
      ...item,
      isLatestMatch:
        maxTs > 0 && item.timestampMs > 0 && Math.abs(item.timestampMs - maxTs) < 24 * 60 * 60 * 1000,
    }));

    list.sort((a, b) => {
      if (a.timestampMs !== b.timestampMs) return b.timestampMs - a.timestampMs;
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      const tA = tierPriority[a.milestone.definition.tier] || 0;
      const tB = tierPriority[b.milestone.definition.tier] || 0;
      return tB - tA;
    });

    const seasonItems = list.filter((i) => i.timestampMs >= DEFAULT_SEASON_START_MS);
    const displayBase = seasonItems.length > 0 ? seasonItems : list;
    const latestMatchItemsCount = list.filter((i) => i.isLatestMatch).length;
    const unreadCount = list.filter((i) => i.isNew).length;

    return {
      recentUnlocks: displayBase,
      latestMatchCount: latestMatchItemsCount,
      newCount: unreadCount,
    };
  }, [milestones, newMilestoneIds, newUnlockKeys]);

  const topUpcoming = useMemo(() => {
    return upcomingMilestones.slice(0, 3);
  }, [upcomingMilestones]);

  if (recentUnlocks.length === 0 && topUpcoming.length === 0) {
    return null;
  }

  const displayedUnlocks = expanded ? recentUnlocks.slice(0, 8) : recentUnlocks.slice(0, 4);

  return (
    <Card className={cn('w-full min-w-0 overflow-hidden border-primary/20', className)}>
      <CardHeader className="py-3 px-3.5 sm:px-5 pb-2.5 border-b border-border/50 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="space-y-0.5 min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-wrap">
              <Flame className="text-primary h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Nově odemčené milníky</span>
              {newCount > 0 && (
                <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1.5 py-0 h-4 border-none animate-pulse">
                  {newCount} NOVÉ
                </Badge>
              )}
              {latestMatchCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold"
                >
                  +{latestMatchCount} v posledním zápase
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Přehled pokořených milníků v posledních utkáních a blížících se jubileí
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-7 px-2.5 text-xs font-bold border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
          >
            <Link href="/dashboard/hall-of-fame?tab=unlocks">
              Kronika milníků
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-3.5">
        {/* 1. Poslední odemčené odznaky */}
        {displayedUnlocks.length > 0 && (
          <div className="space-y-2">
            {displayedUnlocks.map((item) => {
              const tierConf = TIER_CONFIG[item.milestone.definition.tier] || TIER_CONFIG.bronze;

              return (
                <div
                  key={item.key}
                  onClick={() => {
                    if (onOpenMilestoneDetail) {
                      onOpenMilestoneDetail(item.milestone.definition.id);
                    } else if (onOpenPlayerCareer) {
                      onOpenPlayerCareer(item.holder.id);
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-xl border bg-card/70 hover:bg-card hover:border-primary/40 transition-all cursor-pointer group',
                    item.isNew
                      ? 'border-emerald-500/40 bg-emerald-500/[0.03]'
                      : item.isLatestMatch
                      ? 'border-amber-500/30 bg-amber-500/[0.02]'
                      : 'border-border/60'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      onClick={(e) => {
                        if (onOpenPlayerCareer) {
                          e.stopPropagation();
                          onOpenPlayerCareer(item.holder.id);
                        }
                      }}
                      className="shrink-0"
                    >
                      <Avatar className="h-8 w-8 border border-border hover:ring-2 hover:ring-primary/50 transition-all">
                        <AvatarImage src={item.holder.photoURL || undefined} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {item.holder.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          onClick={(e) => {
                            if (onOpenPlayerCareer) {
                              e.stopPropagation();
                              onOpenPlayerCareer(item.holder.id);
                            }
                          }}
                          className="font-bold text-xs text-foreground hover:text-primary transition-colors"
                        >
                          {item.holder.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">odemkl/a</span>
                        <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                          {item.milestone.definition.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] px-1.5 py-0 font-bold', tierConf.badgeClass)}
                        >
                          {tierConf.label}
                        </Badge>
                        {item.isNew && (
                          <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1 py-0 h-4 border-none">
                            NOVÉ
                          </Badge>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {item.matchRound != null && (
                          <span className="font-bold text-primary/90">{item.matchRound}. kolo •</span>
                        )}
                        {item.context && <span className="truncate">{item.context}</span>}
                        {item.dateStr && (
                          <span className="inline-flex items-center gap-0.5 font-medium text-foreground/75 shrink-0">
                            • <Calendar className="h-2.5 w-2.5 ml-0.5" />
                            {item.dateStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'h-8 w-8 rounded-lg bg-background/80 border flex items-center justify-center shrink-0',
                      tierConf.cardBorderClass
                    )}
                  >
                    {getMilestoneIcon(item.milestone.definition.iconName, item.milestone.definition.tier, 'h-4 w-4')}
                  </div>
                </div>
              );
            })}

            {recentUnlocks.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full h-7 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {expanded ? (
                  <>
                    Zobrazit méně <ChevronUp className="h-3.5 w-3.5 ml-1" />
                  </>
                ) : (
                  <>
                    Zobrazit další z této sezóny ({recentUnlocks.length - 4}){' '}
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* 2. Na dosah v příštím zápase */}
        {topUpcoming.length > 0 && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Na dosah v příštím zápase
              </p>
              <Link
                href="/dashboard/hall-of-fame"
                className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                Všechna jubilea →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {topUpcoming.map((u) => {
                const tierConf = TIER_CONFIG[u.milestone.tier] || TIER_CONFIG.bronze;
                return (
                  <div
                    key={`${u.playerId}-${u.milestone.id}`}
                    onClick={() => {
                      if (onOpenPlayerCareer) {
                        onOpenPlayerCareer(u.playerId);
                      }
                    }}
                    className="p-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-amber-500/40 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-foreground truncate">{u.playerName}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-[8px] px-1 py-0 font-bold shrink-0', tierConf.badgeClass)}
                      >
                        {tierConf.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-semibold text-foreground/90 truncate">{u.milestone.title}</p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-amber-500 font-bold">
                        Chybí: {u.remaining} {formatUnitWithCount(u.remaining, u.milestone.unit, u.milestone.id)}
                      </span>
                      <span className="text-muted-foreground tabular-nums font-semibold">
                        {u.current}/{u.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
