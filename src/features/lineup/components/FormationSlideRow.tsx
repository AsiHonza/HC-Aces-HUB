import React from 'react';
import { Lineup, FormationRowConfig, PlayerStats } from '../types';
import { FormationPlayerCard } from './FormationPlayerCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FormationSlideRowProps {
  config: FormationRowConfig;
  lineup: Lineup;
  statsMap: Map<string, PlayerStats>;
}

/**
 * Clean Formation Line Row (1. Útok, 2. Útok, Obrany, Brankář)
 */
export function FormationSlideRow({
  config,
  lineup,
  statsMap,
}: FormationSlideRowProps) {
  const assignedCount = config.slots.filter(s => lineup[s.key] !== null).length;
  const totalCount = config.slots.length;
  const isAttack = config.lineType === 'attack';
  const isDefense = config.lineType === 'defense';
  const isGoalie = config.lineType === 'goalie';

  return (
    <div className="w-full min-w-0 rounded-xl bg-card/60 border border-border/70 p-2 sm:px-3 sm:py-2 space-y-1.5 shadow-xs">
      {/* Row Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-bold text-[11px] sm:text-xs uppercase px-2 py-0.5",
              isAttack && config.id === 'attack-1'
                ? "bg-primary/10 text-primary border-primary/30"
                : isGoalie
                ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                : "bg-muted/40 text-foreground border-border/80"
            )}
          >
            {config.title}
          </Badge>
          <span className="text-[11px] text-muted-foreground font-mono">
            ({assignedCount}/{totalCount})
          </span>
        </div>
      </div>

      {/* Slots Grid */}
      <div
        className={cn(
          "w-full min-w-0 gap-2",
          isAttack && "grid grid-cols-1 sm:grid-cols-3",
          isDefense && "grid grid-cols-1 sm:grid-cols-2 sm:max-w-2xl sm:mx-auto",
          isGoalie && "flex justify-center max-w-md mx-auto"
        )}
      >
        {config.slots.map(slot => (
          <FormationPlayerCard
            key={slot.key}
            player={lineup[slot.key]}
            positionKey={slot.key}
            roleName={slot.roleName}
            roleShort={slot.roleShort}
            lineType={config.lineType}
            stats={lineup[slot.key] ? statsMap.get(lineup[slot.key]!.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
