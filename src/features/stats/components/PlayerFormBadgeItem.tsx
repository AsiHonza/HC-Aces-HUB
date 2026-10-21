import React from 'react';
import { Crown, Flame, Target, ShieldCheck, Shield, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlayerFormBadge, PlayerFormBadgeType } from '../utils/playerForm';

export function getPlayerFormIcon(type: PlayerFormBadgeType, className?: string) {
  const iconClass = cn('shrink-0', className);
  switch (type) {
    case 'reigning-mvp':
      return <Crown className={cn('h-3 w-3 text-amber-500 fill-amber-500', iconClass)} />;
    case 'point-streak':
      return <Flame className={cn('h-3 w-3 text-orange-500 fill-orange-500', iconClass)} />;
    case 'hot-sniper':
      return <Target className={cn('h-3 w-3 text-rose-500', iconClass)} />;
    case 'goalie-wall':
      return <ShieldCheck className={cn('h-3 w-3 text-cyan-500', iconClass)} />;
    case 'lockdown-shield':
      return <Shield className={cn('h-3 w-3 text-sky-500', iconClass)} />;
    case 'ironman-streak':
      return <Activity className={cn('h-3 w-3 text-emerald-500', iconClass)} />;
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
    <Badge
      variant="outline"
      className={cn('text-[10px] font-bold px-1.5 py-0 inline-flex items-center gap-1', badge.badgeClass, className)}
      title={`${badge.title}: ${badge.description}`}
    >
      {getPlayerFormIcon(badge.type)}
      {showLabel && <span>{badge.shortLabel}</span>}
    </Badge>
  );
}
