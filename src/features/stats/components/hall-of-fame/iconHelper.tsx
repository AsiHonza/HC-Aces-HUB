import React from 'react';
import {
  Trophy,
  Crown,
  Flame,
  Disc,
  Award,
  Shield,
  ShieldCheck,
  Star,
  Zap,
  Sparkles,
  Crosshair,
  HeartHandshake,
  Target,
  Timer,
  Medal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIER_CONFIG, type MilestoneTier } from '../../utils/milestones';

export function getMilestoneIcon(
  iconName: string,
  tier: MilestoneTier = 'bronze',
  className: string = 'h-5 w-5'
) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  const colorClass = config.iconColor;

  switch (iconName) {
    case 'Crown':
      return <Crown className={cn(className, colorClass)} />;
    case 'Flame':
      return <Flame className={cn(className, colorClass)} />;
    case 'Disc':
      return <Disc className={cn(className, colorClass)} />;
    case 'Award':
      return <Award className={cn(className, colorClass)} />;
    case 'Shield':
      return <Shield className={cn(className, colorClass)} />;
    case 'ShieldCheck':
      return <ShieldCheck className={cn(className, colorClass)} />;
    case 'Star':
      return <Star className={cn(className, colorClass, 'fill-current')} />;
    case 'Trophy':
      return <Trophy className={cn(className, colorClass)} />;
    case 'Zap':
      return <Zap className={cn(className, colorClass)} />;
    case 'Sparkles':
      return <Sparkles className={cn(className, colorClass)} />;
    case 'Crosshair':
      return <Crosshair className={cn(className, colorClass)} />;
    case 'HeartHandshake':
      return <HeartHandshake className={cn(className, colorClass)} />;
    case 'Target':
      return <Target className={cn(className, colorClass)} />;
    case 'Timer':
      return <Timer className={cn(className, colorClass)} />;
    case 'Medal':
      return <Medal className={cn(className, colorClass)} />;
    default:
      return <Award className={cn(className, colorClass)} />;
  }
}
