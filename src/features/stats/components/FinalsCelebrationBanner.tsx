'use client';

import React from 'react';
import { Trophy, History, Sparkles, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FinalsSeriesStatus } from '../utils/season';

export interface FinalsCelebrationBannerProps {
  status: FinalsSeriesStatus;
  seasonName?: string;
  seasonYear?: string;
  isAdmin?: boolean;
  onArchiveClick?: () => void;
  className?: string;
}

export function FinalsCelebrationBanner({
  status,
  seasonName = 'Sezóna 2025/2026',
  seasonYear = '2025/2026',
  isAdmin = false,
  onArchiveClick,
  className,
}: FinalsCelebrationBannerProps) {
  if (!status.isFinished) return null;

  const isAces = status.isAcesWinner;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-lg transition-all duration-300',
        isAces
          ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-primary/10 border-amber-500/40 shadow-amber-500/5'
          : 'bg-gradient-to-r from-card via-card/90 to-amber-500/5 border-amber-500/30 shadow-sm',
        className
      )}
    >
      {/* Background Glow Accents */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Icon & Titles */}
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              'p-2.5 sm:p-3 rounded-2xl shrink-0 border shadow-inner',
              isAces
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-amber-500/20'
                : 'bg-muted/60 border-border text-amber-500'
            )}
          >
            <Trophy className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] sm:text-xs font-black uppercase tracking-wider',
                  isAces
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'border-border bg-muted/60 text-muted-foreground'
                )}
              >
                <Sparkles className="h-3 w-3 mr-1 inline" />
                {isAces ? 'MISTR SOUTĚŽE • FINÁLE ROZHODNUTO' : 'FINÁLE ROZHODNUTO (3:X)'}
              </Badge>

              <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
              <span className="text-xs font-semibold text-muted-foreground">
                Série na 3 vítězné zápasy: {status.seriesScore}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black font-headline tracking-tight text-foreground">
              {isAces ? (
                <span>
                  🏆 HC Aces vítězí ve finále{' '}
                  <span className="text-amber-500">{status.seriesScore}</span> na zápasy a uzavírá
                  vítěznou sezónu!
                </span>
              ) : (
                <span>
                  🏆 Finálová série je dohrána: Mistrem sezóny je{' '}
                  <span className="text-amber-500 font-bold">{status.winnerTeam}</span> ({status.seriesScore} na zápasy).
                </span>
              )}
            </h3>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Základní část i play-off jsou odehrány. Všechny statistiky jsou zkompletovány.
              {isAdmin
                ? ' Jako administrátor můžete ročník jednoduše zarchivovat a připravit aplikaci na novou sezónu.'
                : ' Sezóna bude v nejbližší době administrátorem zarchivována do historie.'}
            </p>
          </div>
        </div>

        {/* Right Side: Admin 1-Click Action */}
        {isAdmin && onArchiveClick && (
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center pt-2 md:pt-0">
            <Button
              onClick={onArchiveClick}
              className="font-bold text-xs sm:text-sm shadow-md bg-amber-500 hover:bg-amber-600 text-black border-amber-600"
            >
              <History className="h-4 w-4 mr-2" />
              Zarchivovat {seasonYear} jedním kliknutím
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
