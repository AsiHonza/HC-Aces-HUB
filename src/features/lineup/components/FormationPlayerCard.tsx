import React from 'react';
import { Player, Lineup, PlayerStats } from '../types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatName } from '@/lib/utils';

interface FormationPlayerCardProps {
  player: Player | null;
  positionKey: keyof Lineup;
  roleName: string;
  roleShort: string;
  lineType: 'attack' | 'defense' | 'goalie';
  stats?: PlayerStats;
}

/**
 * Compact Hockey Formation Player Slot (HC Aces HUB Design System)
 */
export function FormationPlayerCard({
  player,
  positionKey,
  roleName,
  roleShort,
  lineType,
  stats,
}: FormationPlayerCardProps) {
  if (!player) {
    return (
      <div className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-card/30 p-2 sm:px-2.5 text-muted-foreground/70 select-none min-h-[50px]">
        <div className="h-8 w-8 rounded-md border border-dashed border-border/70 flex items-center justify-center shrink-0 text-muted-foreground/50 bg-muted/20">
          <span className="text-[10px] font-mono font-bold">{roleShort}</span>
        </div>
        <div className="flex flex-col min-w-0 leading-tight">
          <span className="text-xs font-semibold text-muted-foreground truncate">{roleName}</span>
          <span className="text-[10px] text-muted-foreground/50 italic">Volná pozice</span>
        </div>
      </div>
    );
  }

  const hasStats = stats && (stats.goals > 0 || stats.assists > 0);
  const isGoalie = lineType === 'goalie';

  return (
    <div
      className={cn(
        "w-full flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-card/90 p-2 sm:px-2.5 hover:border-primary/50 transition-all shadow-xs group min-h-[50px]",
        isGoalie && "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Jersey Number badge */}
        <div
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center shrink-0 border",
            isGoalie
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
              : "bg-primary/10 border-primary/30 text-primary"
          )}
        >
          <span className="text-xs font-black font-headline tabular-nums">
            {player.jerseyNumber != null ? `#${player.jerseyNumber}` : '–'}
          </span>
        </div>

        {/* Compact Avatar */}
        <Avatar className="h-8 w-8 border border-border shrink-0 group-hover:border-primary/60 transition-colors">
          <AvatarImage
            src={player.photoURL ?? `https://picsum.photos/seed/${player.email || player.name}/80/80`}
            alt={player.name}
            className="object-cover"
          />
          <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">
            {(player.name || '').split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>

        {/* Name and Position */}
        <div className="min-w-0 flex flex-col justify-center leading-tight">
          <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
            {formatName(player.name) || 'Neznámý'}
          </h4>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
            <span
              className={cn(
                "font-mono font-bold uppercase",
                isGoalie ? "text-amber-500" : "text-primary/90"
              )}
            >
              {roleShort}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="truncate">{roleName}</span>
          </div>
        </div>
      </div>

      {/* Match Stats Badges (G/A) */}
      {hasStats && (
        <div className="flex items-center gap-1 shrink-0">
          {stats.goals > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] font-black h-5 px-1 border-primary/40 text-primary bg-primary/10"
              title={`${stats.goals} ${stats.goals === 1 ? 'gól' : stats.goals < 5 ? 'góly' : 'gólů'}`}
            >
              {stats.goals}G
            </Badge>
          )}
          {stats.assists > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] font-bold h-5 px-1 border-border text-foreground bg-muted/40"
              title={`${stats.assists} ${stats.assists === 1 ? 'asistence' : stats.assists < 5 ? 'asistence' : 'asistencí'}`}
            >
              {stats.assists}A
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
