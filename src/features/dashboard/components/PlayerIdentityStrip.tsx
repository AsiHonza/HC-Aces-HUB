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
    <Card className="relative border-border/75 bg-gradient-to-r from-card via-card to-primary/[0.06] shadow-[0_8px_30px_-10px_rgba(0,0,0,0.35)] overflow-hidden w-full min-w-0">
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-56 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative p-3.5 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full min-w-0">
        {/* Vizuální identita hráče */}
        <div className="flex items-center justify-between sm:justify-start gap-3.5 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/60 shadow-md ring-4 ring-primary/10">
                <AvatarImage src={userProfile?.photoURL || `https://picsum.photos/seed/${userProfile?.email}/200/200`} />
                <AvatarFallback className="font-bold text-sm sm:text-base bg-primary/15 text-primary">
                  {userProfile?.name ? userProfile.name[0] : 'U'}
                </AvatarFallback>
              </Avatar>
              {userProfile?.jerseyNumber && (
                <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-full shadow ring-2 ring-card">
                  #{userProfile.jerseyNumber}
                </span>
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-headline font-black tracking-tight truncate text-foreground">
                  {userProfile?.name || 'Hráč Aces'}
                </h1>
                {userProfile && (() => {
                  const posInfo = resolvePlayerPosition(userProfile as any, allMatches || []);
                  return (
                    <Badge variant="outline" className={cn('text-[10px] uppercase font-bold rounded-full px-2 py-0 h-5', posInfo.meta.badgeClass)}>
                      {posInfo.meta.label}
                    </Badge>
                  );
                })()}
                {currentUserBadges.map((b) => (
                  <PlayerFormBadgeItem key={b.type} badge={b} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {userProfile?.role === 'admin' ? 'Administrátor týmu • HC Aces' : 'Aktivní soupiska HC Aces'}
              </p>
            </div>
          </div>

          {/* Mobile quick Career Card button */}
          <Button
            variant="outline"
            size="sm"
            className="sm:hidden h-8 px-2.5 text-[11px] font-bold rounded-xl border-primary/35 bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
            onClick={() => onOpenCareerModal(userId)}
          >
            <Trophy className="h-3.5 w-3.5 mr-1 text-primary" />
            Karta
          </Button>
        </div>

        {/* Sjednocený pravý blok: Přepínač období & Rychlé statistiky & Kariérní karta */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start xl:justify-end gap-2.5 lg:gap-3.5 shrink-0">
          <Tabs value={myStatsView} onValueChange={(v) => onMyStatsViewChange(v as StatsPeriod)} className="w-full sm:w-auto shrink-0">
            <TabsList className="h-8 p-0.5 bg-muted/60 rounded-xl w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
              <TabsTrigger value="regular" className="text-[10px] sm:text-xs h-7 px-2.5 rounded-lg font-bold">ZČ</TabsTrigger>
              <TabsTrigger value="playoff" className="text-[10px] sm:text-xs h-7 px-2.5 rounded-lg font-bold">Play-off</TabsTrigger>
              <TabsTrigger value="season" className="text-[10px] sm:text-xs h-7 px-2.5 rounded-lg font-bold">Sezona</TabsTrigger>
              <TabsTrigger value="history" className="text-[10px] sm:text-xs h-7 px-2.5 rounded-lg font-bold">Historie</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Unified Horizontal KPI Strip */}
          <div className="flex flex-1 sm:flex-initial items-center divide-x divide-border/60 rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm overflow-hidden">
            {isGoalie ? (
              <>
                <div className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-center shrink-0">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Zápasy</span>
                  <span className="text-xs sm:text-sm font-black tabular-nums text-foreground">
                    {goalieStats?.gamesPlayed ?? 0}
                  </span>
                </div>
                <div className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-center shrink-0">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Výhry</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {goalieStats?.wins ?? 0}
                  </span>
                </div>
                <div className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-center shrink-0">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">SO</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {goalieStats?.so ?? 0}
                  </span>
                </div>
                <div className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-center bg-primary/10 shrink-0">
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
                <div className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-center shrink-0 min-w-[38px]">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Z</span>
                  <span className="text-xs sm:text-sm font-black tabular-nums text-foreground">
                    {skaterStats?.gamesPlayed ?? 0}
                  </span>
                </div>
                <div className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-center shrink-0 min-w-[38px]">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">G</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {skaterStats?.goals ?? 0}
                  </span>
                </div>
                <div className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-center shrink-0 min-w-[38px]">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">A</span>
                  <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                    {skaterStats?.assists ?? 0}
                  </span>
                </div>
                <div className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 text-center bg-primary/10 shrink-0 min-w-[44px]">
                  <span className="text-[9px] uppercase font-black text-primary block">Body</span>
                  <span className="text-xs sm:text-sm font-black tabular-nums text-primary">
                    {(skaterStats?.goals ?? 0) + (skaterStats?.assists ?? 0)}
                  </span>
                </div>
              </>
            )}

            {/* Hvězdy zápasu shrnutí */}
            <div
              className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 bg-amber-500/10 text-center shrink-0 cursor-default"
              title={`${currentUserStars.star1Count}x 1. hvězda (3b), ${currentUserStars.star2Count}x 2. hvězda (2b), ${currentUserStars.star3Count}x 3. hvězda (1b)`}
            >
              <span className="text-[9px] uppercase font-bold text-amber-500 flex items-center justify-center gap-0.5">
                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                Hvězdy
              </span>
              <span className="text-xs sm:text-sm font-black tabular-nums text-amber-500">
                {currentUserStars.totalPoints} <span className="text-[10px] font-medium text-muted-foreground">b</span>
              </span>
            </div>
          </div>

          {/* Tlačítko kariérní karty (Desktop / Tablet) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 text-xs font-bold rounded-xl border-primary/35 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary shrink-0 shadow-sm"
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
