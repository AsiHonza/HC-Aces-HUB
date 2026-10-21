import React from 'react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 inline-flex items-center gap-1 cursor-help select-none shadow-2xs hover:scale-105 transition-all',
              badge.badgeClass,
              className
            )}
          >
            {getPlayerFormIcon(badge.type, 'h-3 w-3')}
            {showLabel && <span>{badge.shortLabel}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="text-xs max-w-xs space-y-1 p-2.5 shadow-lg border border-border/80 bg-popover/95 backdrop-blur-md z-50 text-left"
        >
          <p className="font-bold text-foreground flex items-center gap-1.5">
            {getPlayerFormIcon(badge.type, 'h-3.5 w-3.5')}
            <span>{badge.title}</span>
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">{badge.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
