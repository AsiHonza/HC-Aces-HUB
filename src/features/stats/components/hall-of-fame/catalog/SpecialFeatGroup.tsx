'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown, ChevronUp, Crown, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type MilestoneWithHolders, 
  TIER_CONFIG,
  formatUnitWithCount
} from '../../../utils/milestones';
import { getMilestoneIcon } from '../iconHelper';

export interface SpecialFeatGroupProps {
  group: {
    id: string;
    title: string;
    description: string;
    iconName: string;
    ids: string[];
  };
  milestones: MilestoneWithHolders[];
  targetPlayerId?: string | null;
  currentUserId?: string | null;
  newMilestoneIds?: Set<string>;
  onOpenMilestoneDetail: (m: MilestoneWithHolders) => void;
  onOpenPlayerCareer?: (playerId: string) => void;
}

export function SpecialFeatGroup({
  group,
  milestones,
  targetPlayerId,
  currentUserId,
  newMilestoneIds,
  onOpenMilestoneDetail,
  onOpenPlayerCareer,
}: SpecialFeatGroupProps) {
  const [isOpen, setIsOpen] = useState(true);

  const effectiveId = targetPlayerId === 'me'
    ? currentUserId
    : (targetPlayerId === 'all' ? null : targetPlayerId);

  // Filter group milestones
  const groupMilestones = milestones.filter((m) => group.ids.includes(m.definition.id));
  if (groupMilestones.length === 0) return null;

  // Unlocked count by target player if selected
  const unlockedCount = effectiveId
    ? groupMilestones.filter((m) => m.holders.some((h) => h.id === effectiveId)).length
    : groupMilestones.reduce((sum, m) => sum + (m.totalHolders > 0 ? 1 : 0), 0);

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs space-y-0">
      {/* Hlavička skupiny */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 flex items-center justify-center shrink-0 shadow-inner">
            {getMilestoneIcon(group.iconName, 'diamond', 'h-4.5 w-4.5')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-headline font-bold text-sm sm:text-base text-foreground">
                {group.title}
              </h4>
              <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0 border">
                {effectiveId ? `${unlockedCount} / ${groupMilestones.length} odemčeno` : `${groupMilestones.length} odznaků`}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {group.description}
            </p>
          </div>
        </div>

        <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Tělo skupiny */}
      {isOpen && (
        <div className="p-3 sm:p-4 pt-0 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupMilestones.map((item) => {
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
                  'rounded-xl border p-3.5 transition-all flex flex-col justify-between gap-3 relative overflow-hidden bg-gradient-to-br cursor-pointer hover:shadow-sm group',
                  tierConf.cardBorderClass,
                  tierConf.glowClass,
                  isUnlocked && 'ring-1 ring-emerald-500/40 bg-emerald-500/5'
                )}
                title="Klikněte pro detail odznaku a žebříček adeptů"
              >
                {/* Horní řádek */}
                <div>
                  <div className="flex items-start justify-between gap-2.5 mb-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner mt-0.5',
                          isLegend
                            ? 'bg-gradient-to-br from-purple-500/25 to-pink-500/20 border-purple-400/50'
                            : isDiamond
                            ? 'bg-cyan-500/15 border-cyan-400/40'
                            : 'bg-muted/80 border-border/80'
                        )}
                      >
                        {getMilestoneIcon(definition.iconName, definition.tier, 'h-5 w-5')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-headline font-bold text-xs sm:text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                          {definition.title}
                        </h5>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {definition.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-bold', tierConf.badgeClass)}>
                        {tierConf.label}
                      </Badge>
                      {isNew && (
                        <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1 py-0 h-4 border-none animate-pulse">
                          NOVÉ
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dolní lišta: Držitelé a stav */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span className="text-[11px] font-semibold">
                      {totalHolders} {totalHolders === 1 ? 'držitel' : totalHolders <= 4 ? 'držitelé' : 'držitelů'}
                    </span>
                  </div>

                  {/* Avatary držitelů (max 4) */}
                  {totalHolders > 0 ? (
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {holders.slice(0, 4).map((h) => (
                        <div
                          key={h.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenPlayerCareer) onOpenPlayerCareer(h.id);
                          }}
                          title={`${h.name} (${h.value} ${definition.unit})`}
                          className="cursor-pointer transition-transform hover:scale-110 hover:z-10"
                        >
                          <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-border">
                            <AvatarImage src={h.photoURL || undefined} />
                            <AvatarFallback className="text-[9px] font-bold">
                              {h.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      ))}
                      {totalHolders > 4 && (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background text-[9px] font-bold flex items-center justify-center text-muted-foreground">
                          +{totalHolders - 4}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60 italic">Zatím nikdo</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
