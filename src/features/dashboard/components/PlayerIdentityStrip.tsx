import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolvePlayerPosition } from '@/features/roster/utils/positions';
import { PlayerFormBadgeItem } from '@/features/stats';
import type { Match, UserProfile } from '@/types';

export type StatsPeriod = 'regular' | 'playoff' | 'season' | 'history';

interface PlayerIdentityStripProps {
  userProfile: UserProfile | null | undefined;
  userId: string;
  allMatches: Match[];
  currentUserBadges: any[];
  myStatsView: StatsPeriod;
  onMyStatsViewChange: (v: StatsPeriod) => void;
  goalieStats?: {
    gamesPlayed: number;
    wins: number;
    so: number;
    shotsAgainst: number;
    saves: number;
  } | null;
  skaterStats?: {
    gamesPlayed: number;
    goals: number;
    assists: number;
  } | null;
  currentUserStars: {
    star1Count: number;
    star2Count: number;
    star3Count: number;
    totalPoints: number;
    totalStars: number;
  };
  onOpenCareerModal: (playerId: string) => void;
}

export const PlayerIdentityStrip = React.memo(function PlayerIdentityStrip({
  userProfile,
  userId,
  allMatches,
  currentUserBadges,
  myStatsView,
  onMyStatsViewChange,
  goalieStats,
  skaterStats,
  currentUserStars,
  onOpenCareerModal,
}: PlayerIdentityStripProps) {
  const isGoalie = userProfile?.playerType === 'goalie';

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm overflow-hidden w-full min-w-0">
      <div className="p-3.5 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full min-w-0">
        {/* Vizuální identita hráče */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/80 shadow-sm">
              <AvatarImage src={userProfile?.photoURL || `https://picsum.photos/seed/${userProfile?.email}/200/200`} />
              <AvatarFallback className="font-bold text-sm sm:text-base">
                {userProfile?.name ? userProfile.name[0] : 'U'}
              </AvatarFallback>
            </Avatar>
            {userProfile?.jerseyNumber && (
              <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] sm:text-[11px] font-black px-1.5 py-0.2 rounded-full shadow">
                #{userProfile.jerseyNumber}
              </span>
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-headline font-bold truncate text-foreground">
                {userProfile?.name || 'Hráč Aces'}
              </h1>
              {userProfile && (() => {
                const posInfo = resolvePlayerPosition(userProfile as any, allMatches || []);
                return (
                  <Badge variant="outline" className={cn('text-[10px] uppercase font-bold', posInfo.meta.badgeClass)}>
                    {posInfo.meta.label}
                  </Badge>
                );
              })()}
              {currentUserBadges.map((b) => (
                <PlayerFormBadgeItem key={b.type} badge={b} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {userProfile?.role === 'admin' ? 'Administrátor týmu' : 'Aktivní soupiska HC Aces'}
            </p>
          </div>
        </div>

        {/* Sjednocený pravý blok: Přepínač období & Rychlé statistiky & Kariérní karta */}
        <div className="flex flex-wrap items-center gap-3 lg:gap-4 shrink-0">
          <Tabs value={myStatsView} onValueChange={(v) => onMyStatsViewChange(v as StatsPeriod)} className="w-auto shrink-0">
            <TabsList className="h-8 p-0.5 bg-muted/60">
              <TabsTrigger value="regular" className="text-[10px] sm:text-xs h-7 px-2.5">ZČ</TabsTrigger>
              <TabsTrigger value="playoff" className="text-[10px] sm:text-xs h-7 px-2.5">Play-off</TabsTrigger>
              <TabsTrigger value="season" className="text-[10px] sm:text-xs h-7 px-2.5">Sezona</TabsTrigger>
              <TabsTrigger value="history" className="text-[10px] sm:text-xs h-7 px-2.5">Historie</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Metriky hráče / brankáře */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 scrollbar-none">
            {isGoalie ? (
              <>
                <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[42px] shadow-2xs">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Zápasy</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {goalieStats?.gamesPlayed ?? 0}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[42px] shadow-2xs">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Výhry</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {goalieStats?.wins ?? 0}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[42px] shadow-2xs">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">SO</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {goalieStats?.so ?? 0}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-primary/15 border border-primary/50 text-center shrink-0 shadow-2xs">
                  <span className="text-[9px] uppercase font-black text-primary block">Úspěšnost</span>
                  <span className="text-xs sm:text-sm font-black tabular-nums text-primary">
                    {(() => {
                      const sa = Number(goalieStats?.shotsAgainst) || 0;
                      const s = Number(goalieStats?.saves) || 0;
                      return sa > 0 ? ((s / sa) * 100).toFixed(2) : '0.00';
                    })()}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[38px] shadow-2xs">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Z</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {skaterStats?.gamesPlayed ?? 0}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[38px] shadow-2xs">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">G</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {skaterStats?.goals ?? 0}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[38px] shadow-2xs">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">A</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {skaterStats?.assists ?? 0}
                  </span>
                </div>
                <div className="px-3 py-1 rounded-md bg-primary/15 border border-primary/50 text-center shrink-0 min-w-[42px] shadow-2xs">
                  <span className="text-[9px] uppercase font-black text-primary block">Body</span>
                  <span className="text-xs sm:text-sm font-black tabular-nums text-primary">
                    {(skaterStats?.goals ?? 0) + (skaterStats?.assists ?? 0)}
                  </span>
                </div>
              </>
            )}

            {/* Hvězdy zápasu shrnutí */}
            <div
              className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-center shrink-0 cursor-default shadow-2xs"
              title={`${currentUserStars.star1Count}x 1. hvězda (3b), ${currentUserStars.star2Count}x 2. hvězda (2b), ${currentUserStars.star3Count}x 3. hvězda (1b)`}
            >
              <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-0.5">
                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                Hvězdy
              </span>
              <span className="text-xs sm:text-sm font-black tabular-nums text-amber-600 dark:text-amber-400">
                {currentUserStars.totalPoints} <span className="text-[10px] font-medium text-muted-foreground">b</span>
              </span>
            </div>
          </div>

          {/* Tlačítko kariérní karty */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 hover:text-primary shrink-0"
              onClick={() => onOpenCareerModal(userId)}
            >
              <Trophy className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Kariérní karta
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});
