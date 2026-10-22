'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type MilestoneWithHolders, 
  TIER_CONFIG 
} from '../../../utils/milestones';
import { getMilestoneIcon } from '../iconHelper';

export interface BadgeIconGridProps {
  milestones: MilestoneWithHolders[];
  targetPlayerId?: string | null;
  currentUserId?: string | null;
  newMilestoneIds?: Set<string>;
  onOpenMilestoneDetail: (m: MilestoneWithHolders) => void;
}

export function BadgeIconGrid({
  milestones,
  targetPlayerId,
  currentUserId,
  newMilestoneIds,
  onOpenMilestoneDetail,
}: BadgeIconGridProps) {
  const effectiveId = targetPlayerId === 'me'
    ? currentUserId
    : (targetPlayerId === 'all' ? null : targetPlayerId);

  if (milestones.length === 0) {
    return (
      <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground border border-dashed rounded-2xl">
        Žádné odznaky neodpovídají zadanému filtru.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 min-[460px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3">
      {milestones.map((item) => {
        const { definition, holders, totalHolders } = item;
        const tierConf = TIER_CONFIG[definition.tier];
        const isLegend = definition.tier === 'legend';
        const isDiamond = definition.tier === 'diamond';

        const playerHolderRecord = effectiveId
          ? holders.find((h) => h.id === effectiveId)
          : (currentUserId ? holders.find((h) => h.id === currentUserId) : null);
        const isUnlocked = Boolean(playerHolderRecord);
        const isNew = Boolean(newMilestoneIds?.has(definition.id));

        return (
          <div
            key={definition.id}
            onClick={() => onOpenMilestoneDetail(item)}
            className={cn(
              'rounded-xl border p-2.5 sm:p-3 flex flex-col items-center justify-between text-center relative overflow-hidden transition-all duration-150 cursor-pointer select-none group',
              tierConf.cardBorderClass,
              tierConf.glowClass,
              isUnlocked
                ? 'bg-card shadow-xs ring-1 ring-emerald-500/40 hover:scale-[1.02]'
                : effectiveId
                ? 'opacity-65 hover:opacity-100 bg-muted/20 border-border/50'
                : 'bg-card hover:bg-muted/40 hover:scale-[1.02]'
            )}
            title={`${definition.title}: ${definition.description} (${totalHolders} držitelů)`}
          >
            {/* Oznámení: NOVÉ nebo SPLNĚNO */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
              {isNew && (
                <Badge className="bg-emerald-500 text-white font-black text-[8px] px-1 py-0 h-3.5 border-none animate-pulse">
                  NOVÉ
                </Badge>
              )}
              {isUnlocked && (
                <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              )}
            </div>

            {/* Ikona odznaku ve stylizovaném kruhu */}
            <div
              className={cn(
                'h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner my-1 transition-transform group-hover:scale-105',
                isLegend
                  ? 'bg-gradient-to-br from-purple-500/25 to-pink-500/20 border-purple-400/50'
                  : isDiamond
                  ? 'bg-cyan-500/15 border-cyan-400/40'
                  : isUnlocked
                  ? 'bg-muted/90 border-border/90'
                  : 'bg-muted/40 border-border/50'
              )}
            >
              {getMilestoneIcon(definition.iconName, definition.tier, 'h-5 w-5 sm:h-6 sm:w-6')}
            </div>

            {/* Název & Tier */}
            <div className="w-full mt-1.5 min-w-0">
              <h5 className="font-headline font-bold text-xs text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {definition.title}
              </h5>
              <span className={cn('text-[9px] font-bold uppercase tracking-tight block mt-0.5', tierConf.iconColor)}>
                {tierConf.label} • {definition.target} {definition.unit}
              </span>
            </div>

            {/* Držitelé v dolním rohu */}
            <div className="w-full pt-1.5 mt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate text-left">{definition.category}</span>
              <span className="flex items-center gap-0.5 shrink-0 font-semibold">
                <Users className="h-2.5 w-2.5" />
                {totalHolders}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
