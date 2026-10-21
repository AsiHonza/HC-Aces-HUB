import React from 'react';
import { Player, PlayerStats } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Goal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: Player;
  isDragging?: boolean;
  isGhost?: boolean;
  isSmall?: boolean;
  stats?: PlayerStats;
  positionBadge?: string;
  onRemove?: () => void;
}

export const PlayerCard = ({
  player,
  isDragging,
  isGhost,
  isSmall,
  stats,
  positionBadge,
  onRemove,
}: PlayerCardProps) => (
  <div
    className={cn(
      "group relative flex items-center gap-2 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-1.5 sm:p-2 text-foreground shadow-sm transition-all",
      isDragging && "scale-105 border-primary shadow-xl shadow-primary/20 ring-2 ring-primary bg-card",
      isGhost && "opacity-40",
      isSmall ? "w-36 sm:w-44 p-1" : "w-44 sm:w-52"
    )}
  >
    {/* Scorer / Assist Badges */}
    {stats && (stats.goals > 0 || stats.assists > 0) && (
      <div className="absolute -top-2.5 -right-1.5 flex items-center gap-1 z-20">
        {stats.goals > 0 && (
          <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md">
            <Goal className="h-3 w-3" /> {stats.goals}
          </span>
        )}
        {stats.assists > 0 && (
          <span className="flex items-center gap-1 bg-muted border border-border text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
            A {stats.assists}
          </span>
        )}
      </div>
    )}

    {/* Jersey Number Badge */}
    <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary font-black text-xs sm:text-sm">
      {player.jerseyNumber != null ? `#${player.jerseyNumber}` : '•'}
    </div>

    {/* Avatar */}
    <Avatar className={cn("h-7 w-7 sm:h-8 sm:w-8 border border-primary/40 shrink-0", isSmall && "h-6 w-6")}>
      <AvatarImage src={player.photoURL ?? `https://picsum.photos/seed/${player.email || player.name}/100/100`} alt={player.name} />
      <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">
        {(player.name || '').split(' ').map(n => n[0]).join('')}
      </AvatarFallback>
    </Avatar>

    {/* Info */}
    <div className="flex-1 min-w-0 pr-1 text-left">
      <p className={cn("font-bold text-xs sm:text-sm leading-tight truncate text-foreground", isSmall && "text-[11px]")}>
        {player.name || 'Neznámý'}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {positionBadge && (
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
            {positionBadge}
          </span>
        )}
        {player.playerType === 'goalie' ? (
          <Badge variant="outline" className="text-[8px] py-0 px-1 border-amber-500/40 text-amber-500 bg-amber-500/10 font-bold">
            BRA
          </Badge>
        ) : player.fieldPosition === 'defense' ? (
          <Badge variant="outline" className="text-[8px] py-0 px-1 border-blue-500/40 text-blue-500 bg-blue-500/10 font-bold">
            OBR
          </Badge>
        ) : player.fieldPosition === 'center' ? (
          <Badge variant="outline" className="text-[8px] py-0 px-1 border-purple-500/40 text-purple-500 bg-purple-500/10 font-bold">
            CEN
          </Badge>
        ) : player.fieldPosition === 'wing' ? (
          <Badge variant="outline" className="text-[8px] py-0 px-1 border-emerald-500/40 text-emerald-500 bg-emerald-500/10 font-bold">
            KŘÍ
          </Badge>
        ) : null}
      </div>
    </div>

    {/* Remove button (when assigned on rink) */}
    {onRemove && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-opacity text-muted-foreground"
        title="Odebrat z pozice"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);
