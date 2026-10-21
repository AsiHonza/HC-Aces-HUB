import React, { useState } from 'react';
import {
  Crown,
  Flame,
  Sparkles,
  Target,
  Share2,
  ShieldCheck,
  Lock,
  Shield,
  Activity,
  Award,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PlayerFormBadge, PlayerFormBadgeType } from '../utils/playerForm';

export function getPlayerFormIcon(type: PlayerFormBadgeType, className?: string) {
  const iconClass = cn('shrink-0', className);
  switch (type) {
    case 'reigning-mvp':
      return <Crown className={cn('h-3.5 w-3.5 text-amber-500 fill-amber-500', iconClass)} />;
    case 'hattrick-hero':
      return <Sparkles className={cn('h-3.5 w-3.5 text-purple-500 fill-purple-500', iconClass)} />;
    case 'hot-sniper':
      return <Target className={cn('h-3.5 w-3.5 text-rose-500', iconClass)} />;
    case 'playmaker':
      return <Share2 className={cn('h-3.5 w-3.5 text-indigo-500', iconClass)} />;
    case 'point-streak':
      return <Flame className={cn('h-3.5 w-3.5 text-orange-500 fill-orange-500', iconClass)} />;
    case 'goalie-wall':
      return <ShieldCheck className={cn('h-3.5 w-3.5 text-cyan-500', iconClass)} />;
    case 'shutout':
      return <Lock className={cn('h-3.5 w-3.5 text-teal-500', iconClass)} />;
    case 'lockdown-shield':
      return <Shield className={cn('h-3.5 w-3.5 text-sky-500', iconClass)} />;
    case 'unsung-hero':
      return <Award className={cn('h-3.5 w-3.5 text-amber-600', iconClass)} />;
    case 'ironman-streak':
      return <Activity className={cn('h-3.5 w-3.5 text-emerald-500', iconClass)} />;
    default:
      return null;
  }
}

export function PlayerFormBadgeItem({
  badge,
  showLabel = true,
  className,
}: {
  badge: PlayerFormBadge;
  showLabel?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const hasLabel = showLabel && Boolean(badge.shortLabel);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className={cn(
            "inline-flex items-center focus:outline-none rounded-full",
            !showLabel && "p-0.5 hover:bg-muted/80"
          )}
        >
          {hasLabel ? (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 inline-flex items-center gap-1 cursor-pointer select-none shadow-2xs hover:scale-105 active:scale-95 transition-all',
                badge.badgeClass,
                className
              )}
            >
              {getPlayerFormIcon(badge.type, 'h-3 w-3')}
              <span>{badge.shortLabel}</span>
            </Badge>
          ) : showLabel ? (
            <Badge
              variant="outline"
              className={cn(
                'h-6 w-6 p-0 inline-flex items-center justify-center rounded-full cursor-pointer select-none shadow-2xs hover:scale-105 active:scale-95 transition-all',
                badge.badgeClass,
                className
              )}
            >
              {getPlayerFormIcon(badge.type, 'h-3.5 w-3.5')}
            </Badge>
          ) : (
            <span
              className={cn(
                'inline-flex items-center justify-center p-0.5 rounded cursor-pointer select-none transition-colors',
                className
              )}
            >
              {getPlayerFormIcon(badge.type, 'h-3.5 w-3.5')}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="w-auto max-w-[280px] p-2.5 text-xs shadow-xl border border-border/80 bg-popover/95 backdrop-blur-md z-50 text-left pointer-events-auto"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="font-bold text-foreground flex items-center gap-1.5">
          {getPlayerFormIcon(badge.type, 'h-3.5 w-3.5')}
          <span>{badge.title}</span>
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug mt-1">{badge.description}</p>
      </PopoverContent>
    </Popover>
  );
}
