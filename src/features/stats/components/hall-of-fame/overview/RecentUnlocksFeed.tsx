'use client';

import React, { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Sparkles, ChevronDown, ChevronUp, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type MilestoneWithHolders,
  type MilestoneHolder,
  TIER_CONFIG 
} from '../../../utils/milestones';
import { getMilestoneIcon } from '../iconHelper';

export interface RecentUnlocksFeedProps {
  milestones: MilestoneWithHolders[];
  newMilestoneIds?: Set<string>;
  onOpenMilestoneDetail: (m: MilestoneWithHolders) => void;
  onOpenPlayerCareer?: (playerId: string) => void;
}

interface UnlockItem {
  key: string;
  milestone: MilestoneWithHolders;
  holder: MilestoneHolder;
  isNew: boolean;
  dateStr?: string;
  context?: string;
}

export function RecentUnlocksFeed({
  milestones,
  newMilestoneIds,
  onOpenMilestoneDetail,
  onOpenPlayerCareer,
}: RecentUnlocksFeedProps) {
  const [showMore, setShowMore] = useState(false);

  // Extract unlock items
  const unlockItems = useMemo(() => {
    const list: UnlockItem[] = [];

    milestones.forEach((m) => {
      const isMilestoneNew = Boolean(newMilestoneIds?.has(m.definition.id));

      m.holders.forEach((h) => {
        list.push({
          key: `${m.definition.id}-${h.id}`,
          milestone: m,
          holder: h,
          isNew: isMilestoneNew,
          dateStr: h.achievementDate,
          context: h.matchContext,
        });
      });
    });

    // Sort:
    // 1. Items marked as new
    // 2. Items with dateStr (parsed date descending)
    // 3. Higher tier (legend > diamond > gold > silver > bronze)
    const tierPriority = { legend: 5, diamond: 4, gold: 3, silver: 2, bronze: 1 };

    list.sort((a, b) => {
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      if (a.dateStr && b.dateStr) {
        return b.dateStr.localeCompare(a.dateStr);
      }
      if (a.dateStr) return -1;
      if (b.dateStr) return 1;
      const tA = tierPriority[a.milestone.definition.tier] || 0;
      const tB = tierPriority[b.milestone.definition.tier] || 0;
      return tB - tA;
    });

    return list;
  }, [milestones, newMilestoneIds]);

  if (unlockItems.length === 0) {
    return null;
  }

  const visible = showMore ? unlockItems.slice(0, 15) : unlockItems.slice(0, 5);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-card p-4 sm:p-5 shadow-xs space-y-3">
      {/* Hlavička */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-inner">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
              <span>Nově odemčeno v týmu</span>
              {newMilestoneIds && newMilestoneIds.size > 0 && (
                <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1.5 py-0 h-4 border-none animate-pulse">
                  {newMilestoneIds.size} NOVÝCH
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Poslední pokořené milníky a trofeje spoluhráčů
            </p>
          </div>
        </div>

        {unlockItems.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMore(!showMore)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground h-7 px-2"
          >
            {showMore ? (
              <>
                Méně <ChevronUp className="h-3 w-3 ml-1" />
              </>
            ) : (
              <>
                Více ({unlockItems.length}) <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Seznam odemčení */}
      <div className="space-y-2">
        {visible.map((item) => {
          const tierConf = TIER_CONFIG[item.milestone.definition.tier];

          return (
            <div
              key={item.key}
              onClick={() => onOpenMilestoneDetail(item.milestone)}
              className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-border/60 bg-card/70 hover:bg-card hover:border-primary/40 transition-all cursor-pointer group"
              title="Klikněte pro detail odznaku"
            >
              {/* Vlevo: Avatar hráče + zpráva */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  onClick={(e) => {
                    if (onOpenPlayerCareer) {
                      e.stopPropagation();
                      onOpenPlayerCareer(item.holder.id);
                    }
                  }}
                  className="shrink-0 cursor-pointer"
                  title={`Otevřít profil ${item.holder.name}`}
                >
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border hover:ring-2 hover:ring-primary/50 transition-all">
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
                      className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      {item.holder.name}
                    </span>
                    <span className="text-xs text-muted-foreground">odemkl/a</span>
                    <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                      {item.milestone.definition.title}
                    </span>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 font-bold', tierConf.badgeClass)}>
                      {tierConf.label}
                    </Badge>
                    {item.isNew && (
                      <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1 py-0 h-4 border-none">
                        NOVÉ
                      </Badge>
                    )}
                  </div>

                  {(item.context || item.dateStr) && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                      {item.context && <span>{item.context}</span>}
                      {item.context && item.dateStr && <span>•</span>}
                      {item.dateStr && (
                        <span className="inline-flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {item.dateStr}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Vpravo: Ikona odznaku & šipka */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-8 rounded-lg bg-background/80 border border-border/80 flex items-center justify-center shadow-xs">
                  {getMilestoneIcon(item.milestone.definition.iconName, item.milestone.definition.tier, 'h-4 w-4')}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all hidden sm:block" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
