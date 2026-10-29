'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { areClubNamesMatching, normalizeClubName } from '../utils/league-analytics';

export interface TeamBadgeProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

interface TeamStyle {
  initials: string;
  bgGradient: string;
  textColor: string;
  borderColor: string;
  iconBg: string;
}

export const TEAM_LOGOS: Record<string, string> = {
  'HC Aces': '/teams/aces.png',
  'Divočáci': '/teams/divocaci.png',
  'Predators': '/teams/predators.png',
  'ALL IN': '/teams/all-in.jpg',
  'AllIn': '/teams/all-in.jpg',
  'HH Oldies': '/teams/hh-oldies.jpg',
  'HH Machines': '/teams/hh-machines.png',
  'Sjetý gumy': '/teams/sjety-gumy.png',
  'Sjeté gumy': '/teams/sjety-gumy.png',
  'Raci': '/teams/raci.jpg',
  'Embedit': '/teams/embedit.png',
};

export const TEAM_LOGO_BG: Record<string, string> = {
  'HC Aces': 'bg-black border-amber-500/40',
  'Divočáci': 'bg-black border-zinc-700',
  'Predators': 'bg-white border-zinc-200 dark:border-zinc-700',
  'ALL IN': 'bg-white border-zinc-200 dark:border-zinc-700',
  'AllIn': 'bg-white border-zinc-200 dark:border-zinc-700',
  'HH Oldies': 'bg-white border-zinc-200 dark:border-zinc-700',
  'HH Machines': 'bg-black border-zinc-700',
  'Sjetý gumy': 'bg-white border-zinc-200 dark:border-zinc-700',
  'Sjeté gumy': 'bg-white border-zinc-200 dark:border-zinc-700',
  'Raci': 'bg-white border-zinc-200 dark:border-zinc-700',
  'Embedit': 'bg-white border-zinc-200 dark:border-zinc-700',
};

const TEAM_STYLES: Record<string, TeamStyle> = {
  'HC Aces': {
    initials: 'ACE',
    bgGradient: 'from-amber-500 to-yellow-600',
    textColor: 'text-black',
    borderColor: 'border-amber-400',
    iconBg: 'bg-amber-500/20 text-amber-500',
  },
  'HH Oldies': {
    initials: 'HHO',
    bgGradient: 'from-slate-600 to-blue-700',
    textColor: 'text-white',
    borderColor: 'border-blue-400/60',
    iconBg: 'bg-blue-600/20 text-blue-400',
  },
  'HH Machines': {
    initials: 'HHM',
    bgGradient: 'from-cyan-600 to-blue-800',
    textColor: 'text-white',
    borderColor: 'border-cyan-400/60',
    iconBg: 'bg-cyan-600/20 text-cyan-400',
  },
  'Divočáci': {
    initials: 'DIV',
    bgGradient: 'from-emerald-700 to-green-900',
    textColor: 'text-white',
    borderColor: 'border-emerald-500/60',
    iconBg: 'bg-emerald-600/20 text-emerald-400',
  },
  'Predators': {
    initials: 'PRD',
    bgGradient: 'from-rose-600 to-red-900',
    textColor: 'text-white',
    borderColor: 'border-rose-500/60',
    iconBg: 'bg-rose-600/20 text-rose-400',
  },
  'Sjetý gumy': {
    initials: 'GUM',
    bgGradient: 'from-zinc-700 to-yellow-600',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-500/60',
    iconBg: 'bg-yellow-500/20 text-yellow-500',
  },
  'Embedit': {
    initials: 'EMB',
    bgGradient: 'from-violet-600 to-indigo-900',
    textColor: 'text-white',
    borderColor: 'border-violet-400/60',
    iconBg: 'bg-violet-600/20 text-violet-400',
  },
  'ALL IN': {
    initials: 'ALL',
    bgGradient: 'from-teal-600 to-emerald-800',
    textColor: 'text-emerald-100',
    borderColor: 'border-teal-400/60',
    iconBg: 'bg-teal-600/20 text-teal-400',
  },
  'Raci': {
    initials: 'RAC',
    bgGradient: 'from-orange-600 to-red-700',
    textColor: 'text-white',
    borderColor: 'border-orange-400/60',
    iconBg: 'bg-orange-600/20 text-orange-400',
  },
};

export function getTeamLogo(teamName: string): string | null {
  const norm = normalizeClubName(teamName);
  for (const [key, src] of Object.entries(TEAM_LOGOS)) {
    if (areClubNamesMatching(norm, key)) {
      return src;
    }
  }
  return null;
}

export function getTeamLogoBg(teamName: string): string {
  const norm = normalizeClubName(teamName);
  for (const [key, bg] of Object.entries(TEAM_LOGO_BG)) {
    if (areClubNamesMatching(norm, key)) {
      return bg;
    }
  }
  return 'bg-white dark:bg-zinc-900 border-border';
}

export function getTeamStyle(teamName: string): TeamStyle {
  const norm = normalizeClubName(teamName);
  for (const [key, style] of Object.entries(TEAM_STYLES)) {
    if (areClubNamesMatching(norm, key)) {
      return style;
    }
  }

  // Fallback for unknown teams
  const clean = (norm || 'T').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
  return {
    initials: clean || 'HC',
    bgGradient: 'from-muted to-muted-foreground/30',
    textColor: 'text-foreground',
    borderColor: 'border-border',
    iconBg: 'bg-muted text-muted-foreground',
  };
}

export function TeamBadge({
  name,
  size = 'sm',
  className,
  showName = false,
}: TeamBadgeProps) {
  const [imgError, setImgError] = useState(false);
  const norm = normalizeClubName(name);
  const style = getTeamStyle(norm);
  const logoSrc = getTeamLogo(norm);
  const logoBg = getTeamLogoBg(norm);

  // Significantly enlarged and optimized sizes for high legibility
  const sizeClasses = {
    xs: 'h-6 w-6 rounded-md text-[10px]',
    sm: 'h-8 w-8 rounded-lg text-xs',
    md: 'h-10 w-10 rounded-xl text-sm',
    lg: 'h-14 w-14 rounded-2xl text-base',
    xl: 'h-20 w-20 rounded-3xl text-xl',
  }[size];

  return (
    <div className={cn('inline-flex items-center gap-2 shrink-0 select-none', className)}>
      {logoSrc && !imgError ? (
        <div
          className={cn(
            'relative flex items-center justify-center shrink-0 overflow-hidden shadow-sm p-0.5 border',
            logoBg,
            sizeClasses
          )}
          title={norm}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={norm}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center justify-center font-black tracking-tighter shadow-sm bg-gradient-to-br border',
            style.bgGradient,
            style.textColor,
            style.borderColor,
            sizeClasses
          )}
          title={norm}
        >
          <span>{style.initials}</span>
        </div>
      )}
      {showName && <span className="font-semibold text-foreground truncate">{norm}</span>}
    </div>
  );
}
