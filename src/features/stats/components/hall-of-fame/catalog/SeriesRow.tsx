'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown, ChevronUp, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type MilestoneSeries, 
  type MilestoneWithHolders,
  type MilestoneTier,
  TIER_CONFIG,
  formatUnitWithCount
} from '../../../utils/milestones';
import { getMilestoneIcon } from '../iconHelper';

export interface SeriesRowProps {
  series: MilestoneSeries;
  milestones: MilestoneWithHolders[];
  targetPlayerId?: string | null;
  currentUserId?: string | null;
  newMilestoneIds?: Set<string>;
  onOpenMilestoneDetail: (m: MilestoneWithHolders) => void;
  onOpenPlayerCareer?: (playerId: string) => void;
}

const TIER_ORDER: MilestoneTier[] = ['bronze', 'silver', 'gold', 'diamond', 'legend'];
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

export function SeriesRow({
  series,
  milestones,
  targetPlayerId,
  currentUserId,
  newMilestoneIds,
  onOpenMilestoneDetail,
  onOpenPlayerCareer,
}: SeriesRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTierId, setActiveTierId] = useState<string | null>(null);

  // Effective player ID for checking status
  const effectiveId = targetPlayerId === 'me'
    ? currentUserId
    : (targetPlayerId === 'all' ? null : targetPlayerId);

  // Milestone list sorted by target ascending
  const seriesMilestones = series.milestoneIds
    .map((id) => milestones.find((m) => m.definition.id === id))
    .filter((m): m is MilestoneWithHolders => Boolean(m));

  if (seriesMilestones.length === 0) return null;

  // Highest unlocked tier index by target player (0 to 4)
  let highestUnlockedIdx = -1;
  let playerValue = 0;

  if (effectiveId) {
    seriesMilestones.forEach((m, idx) => {
      const rec = m.holders.find((h) => h.id === effectiveId);
      if (rec) {
        highestUnlockedIdx = idx;
        playerValue = rec.value;
      }
    });

    if (highestUnlockedIdx === -1) {
      // Check candidate for value
      const cand = seriesMilestones[0].candidates?.find((c) => c.id === effectiveId);
      if (cand) playerValue = cand.current;
    }
  }

  // Active milestone for expanded view
  const activeMilestone = activeTierId
    ? seriesMilestones.find((m) => m.definition.id === activeTierId) || seriesMilestones[0]
    : highestUnlockedIdx >= 0
    ? seriesMilestones[Math.min(highestUnlockedIdx + 1, seriesMilestones.length - 1)]
    : seriesMilestones[0];

  const activeTierConf = TIER_CONFIG[activeMilestone.definition.tier];
  const totalSeriesHolders = new Set(seriesMilestones.flatMap((m) => m.holders.map((h) => h.id))).size;
  const hasNew = seriesMilestones.some((m) => newMilestoneIds?.has(m.definition.id));

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden transition-all shadow-xs hover:border-border">
      {/* 1. KOMPAKTNÍ ŘÁDEK SÉRIE */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
      >
        {/* Vlevo: Ikona série + Název + Popisek */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-background border border-border/80 flex items-center justify-center shrink-0 shadow-inner">
            {getMilestoneIcon(series.iconName, 'gold', 'h-5 w-5')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-headline font-bold text-sm sm:text-base text-foreground leading-snug">
                {series.title}
              </h4>
              {hasNew && (
                <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1.5 py-0 h-4 border-none animate-pulse">
                  NOVÉ
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-md">
              {series.description}
            </p>
          </div>
        </div>

        {/* Vpravo: 5 Teček stupňů (I-V) + Stav hráče + Šipka */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
          {/* 5 stupňů - Tier dots */}
          <div className="flex items-center gap-1.5 bg-muted/50 p-1 px-2 rounded-xl border border-border/60">
            {seriesMilestones.map((m, idx) => {
              const tier = m.definition.tier;
              const isUnlocked = effectiveId ? idx <= highestUnlockedIdx : m.totalHolders > 0;
              const isNextTarget = effectiveId && idx === highestUnlockedIdx + 1;
              const tierConf = TIER_CONFIG[tier];

              return (
                <div
                  key={m.definition.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTierId(m.definition.id);
                    setIsExpanded(true);
                  }}
                  title={`${m.definition.title} (${tierConf.label}): ${m.definition.target} ${m.definition.unit}`}
                  className={cn(
                    'h-6 min-w-6 px-1 rounded-lg flex items-center justify-center text-[10px] font-black transition-all cursor-pointer',
                    isUnlocked
                      ? cn('text-white shadow-xs', {
                          'bg-amber-800 dark:bg-amber-700': tier === 'bronze',
                          'bg-slate-400 dark:bg-zinc-400': tier === 'silver',
                          'bg-amber-500 text-amber-950': tier === 'gold',
                          'bg-cyan-500 text-cyan-950': tier === 'diamond',
                          'bg-purple-600 text-white': tier === 'legend',
                        })
                      : isNextTarget
                      ? 'border-2 border-primary bg-primary/20 text-primary animate-pulse'
                      : 'bg-background/80 text-muted-foreground/60 border border-border/60'
                  )}
                >
                  {isUnlocked ? (
                    <Check className="h-3 w-3 stroke-[3]" />
                  ) : (
                    ROMAN_NUMERALS[idx]
                  )}
                </div>
              );
            })}
          </div>

          {/* Stav pro vybraného hráče nebo počet držitelů */}
          <div className="text-right min-w-[70px]">
            {effectiveId ? (
              <div>
                <span className="text-xs font-bold text-foreground">
                  {highestUnlockedIdx >= 0 ? `${ROMAN_NUMERALS[highestUnlockedIdx]} / V` : '0 / V'}
                </span>
                <span className="text-[10px] text-muted-foreground block -mt-0.5">
                  {playerValue} {seriesMilestones[0].definition.unit}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-foreground tabular-nums flex items-center justify-end gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {totalSeriesHolders}
                </span>
                <span className="text-[10px] text-muted-foreground block -mt-0.5">
                  držitelů
                </span>
              </div>
            )}
          </div>

          {/* Chevron expand */}
          <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* 2. ROZBALENÝ DETAIL VŠECH 5 STUPŇŮ */}
      {isExpanded && (
        <div className="p-3.5 sm:p-5 bg-muted/20 border-t border-border/60 space-y-4 animate-in fade-in duration-200">
          {/* 5-stupňový interaktivní grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-bold text-foreground/80">Stupně série</span>
              <span className="text-[11px]">Klepnutím vyberete stupeň</span>
            </div>

            <div className="grid grid-cols-5 gap-1 sm:gap-2 p-1.5 rounded-xl bg-background/80 border border-border/60">
              {seriesMilestones.map((m, idx) => {
                const tConf = TIER_CONFIG[m.definition.tier];
                const isSelected = activeMilestone.definition.id === m.definition.id;
                const isUnlocked = effectiveId ? idx <= highestUnlockedIdx : false;

                return (
                  <button
                    key={m.definition.id}
                    type="button"
                    onClick={() => setActiveTierId(m.definition.id)}
                    className={cn(
                      'relative flex flex-col items-center justify-between py-2 px-1 rounded-lg transition-all touch-manipulation border text-center select-none min-h-[72px] sm:min-h-[78px]',
                      isSelected
                        ? 'bg-card shadow-sm ring-2 ring-primary border-primary z-10'
                        : 'bg-muted/40 hover:bg-muted/80 border-transparent',
                      isUnlocked && !isSelected && 'border-emerald-500/40 bg-emerald-500/5'
                    )}
                  >
                    {isUnlocked && (
                      <span className="absolute -top-1.5 -right-1.5 z-20 h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                        ✓
                      </span>
                    )}

                    <div className="my-0.5">
                      {getMilestoneIcon(m.definition.iconName, m.definition.tier, 'h-4 w-4 sm:h-5 sm:w-5')}
                    </div>

                    <span className="text-xs sm:text-sm font-black tabular-nums text-foreground">
                      {m.definition.target}
                    </span>

                    <span className={cn('text-[9px] font-bold uppercase tracking-tight', tConf.iconColor)}>
                      {tConf.label}
                    </span>

                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <Users className="h-2.5 w-2.5" />
                      {m.totalHolders}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aktivní vybraný stupeň - Detail s proklikem na MilestoneDetailModal */}
          <div
            onClick={() => onOpenMilestoneDetail(activeMilestone)}
            className="p-3.5 sm:p-4 rounded-xl bg-background/90 border border-border/80 hover:border-primary/50 transition-all cursor-pointer group space-y-2.5 shadow-xs"
            title="Klikněte pro zobrazení všech držitelů a žebříčku adeptů"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                    {activeMilestone.definition.title}
                  </h5>
                  <Badge variant="outline" className={cn('text-[10px] px-2 py-0 font-bold', activeTierConf.badgeClass)}>
                    {activeTierConf.label}
                  </Badge>
                  <span className="text-xs text-primary font-bold inline-flex items-center gap-0.5 group-hover:underline">
                    Všichni držitelé & adepti <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeMilestone.definition.description}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Cíl</span>
                <span className="text-sm sm:text-base font-black text-foreground block">
                  {activeMilestone.definition.target} {activeMilestone.definition.unit}
                </span>
              </div>
            </div>

            {/* Držitelé vybraného stupně */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Držitelé ({activeMilestone.totalHolders}):
              </span>

              {activeMilestone.totalHolders > 0 ? (
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                  {activeMilestone.holders.slice(0, 5).map((holder) => (
                    <div
                      key={holder.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenPlayerCareer) onOpenPlayerCareer(holder.id);
                      }}
                      title={`${holder.name} (${holder.value} ${activeMilestone.definition.unit})`}
                      className="cursor-pointer transition-transform hover:scale-110 hover:z-10"
                    >
                      <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border">
                        <AvatarImage src={holder.photoURL || undefined} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {holder.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ))}
                  {activeMilestone.totalHolders > 5 && (
                    <div className="h-7 w-7 rounded-full bg-muted border-2 border-background text-[10px] font-bold flex items-center justify-center text-muted-foreground">
                      +{activeMilestone.totalHolders - 5}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/70 italic">
                  Zatím nikdo nesplnil
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
