'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { TrendingUp, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type UpcomingMilestone, 
  type MilestoneWithHolders,
  TIER_CONFIG,
  formatUnitWithCount
} from '../../../utils/milestones';
import { getMilestoneIcon } from '../iconHelper';

export interface NearMilestonesListProps {
  upcomingMilestones: UpcomingMilestone[];
  milestoneById: Map<string, MilestoneWithHolders>;
  selectedPlayerId?: string | null;
  onOpenMilestoneDetail: (m: MilestoneWithHolders) => void;
  onOpenPlayerCareer?: (playerId: string) => void;
}

export function NearMilestonesList({
  upcomingMilestones,
  milestoneById,
  selectedPlayerId,
  onOpenMilestoneDetail,
  onOpenPlayerCareer,
}: NearMilestonesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter if selected player
  const displayed = selectedPlayerId && selectedPlayerId !== 'all'
    ? upcomingMilestones.filter((u) => u.playerId === selectedPlayerId)
    : upcomingMilestones;

  if (displayed.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm sm:text-base text-foreground">
              Na dosah – Blížící se jubilea
            </h3>
            <p className="text-xs text-muted-foreground">
              Kdo má kousek k dalšímu odznaku a milníku v dresu HC Aces
            </p>
          </div>
        </div>
        <p className="py-6 text-center text-xs sm:text-sm text-muted-foreground">
          V této chvíli nemají hráči žádný bezprostředně blížící se milník v radaru. Sledujte po dalších odehraných zápasech!
        </p>
      </div>
    );
  }

  const visibleItems = isExpanded ? displayed : displayed.slice(0, 4);

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-background to-card p-4 sm:p-5 shadow-xs space-y-3">
      {/* Hlavička */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
              <span>Na dosah – Blížící se jubilea</span>
              <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                TOP {displayed.length}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Milníky, kterým chybí jen pár zápasů, gólů či asistencí
            </p>
          </div>
        </div>

        {displayed.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:bg-amber-500/10 h-7 px-2.5 self-start sm:self-center"
          >
            {isExpanded ? (
              <>
                Sbalit na TOP 4 <ChevronUp className="h-3.5 w-3.5 ml-1" />
              </>
            ) : (
              <>
                Zobrazit všech {displayed.length} <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Kompaktní seznam položek */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {visibleItems.map((item) => {
          const tierConf = TIER_CONFIG[item.milestone.tier];
          const fullM = milestoneById.get(item.milestone.id);

          return (
            <div
              key={`${item.playerId}-${item.milestone.id}`}
              onClick={() => {
                if (fullM) onOpenMilestoneDetail(fullM);
              }}
              className="rounded-xl border border-border/70 bg-card/80 hover:bg-card hover:border-amber-500/40 p-3 transition-all hover:shadow-xs cursor-pointer group flex flex-col justify-between gap-2"
              title="Klikněte pro detail odznaku a přehled adeptů"
            >
              {/* Horní řádek položky */}
              <div className="flex items-center justify-between gap-2.5">
                {/* Hráč info */}
                <div
                  className="flex items-center gap-2 min-w-0"
                  onClick={(e) => {
                    if (onOpenPlayerCareer) {
                      e.stopPropagation();
                      onOpenPlayerCareer(item.playerId);
                    }
                  }}
                  title={`Klikněte pro profil hráče ${item.playerName}`}
                >
                  <Avatar className="h-7 w-7 border border-border shrink-0 hover:ring-2 hover:ring-amber-500/50 transition-all">
                    <AvatarImage src={item.playerPhoto || undefined} />
                    <AvatarFallback className="text-[10px] font-bold">
                      {item.playerName.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {item.playerName}
                    </p>
                    {item.playerJersey && (
                      <span className="text-[10px] text-muted-foreground block -mt-0.5">
                        #{item.playerJersey}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tier Badge & Ikona */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-bold', tierConf.badgeClass)}>
                    {tierConf.label}
                  </Badge>
                  <div className="h-6 w-6 rounded-md bg-muted/70 flex items-center justify-center">
                    {getMilestoneIcon(item.milestone.iconName, item.milestone.tier, 'h-3.5 w-3.5')}
                  </div>
                </div>
              </div>

              {/* Název milníku a stav */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground truncate">
                    {item.milestone.title}
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                    {item.current} / {item.target}
                  </span>
                </div>

                <Progress value={item.progressPct} className="h-1.5 bg-muted rounded-full" />

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span>
                    Chybí:{' '}
                    <strong className="text-foreground font-semibold">
                      {item.remaining} {formatUnitWithCount(item.remaining, item.milestone.unit, item.milestone.id)}
                    </strong>
                  </span>
                  <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                    Detail <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
