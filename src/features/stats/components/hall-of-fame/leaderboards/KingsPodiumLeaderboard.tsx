'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Medal, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrophyLeader } from '../../../utils/milestones';

export interface KingsPodiumLeaderboardProps {
  trophyLeaders: TrophyLeader[];
  onOpenPlayerCareer?: (playerId: string) => void;
  onSelectPlayerForFilter?: (playerId: string) => void;
}

export function KingsPodiumLeaderboard({
  trophyLeaders,
  onOpenPlayerCareer,
  onSelectPlayerForFilter,
}: KingsPodiumLeaderboardProps) {
  if (trophyLeaders.length === 0) {
    return (
      <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground border border-dashed rounded-2xl">
        Žádní držitelé odznaků k zobrazení.
      </div>
    );
  }

  const top1 = trophyLeaders[0] || null;
  const top2 = trophyLeaders[1] || null;
  const top3 = trophyLeaders[2] || null;
  const remainingLeaders = trophyLeaders.slice(3);

  const handlePlayerClick = (playerId: string) => {
    if (onOpenPlayerCareer) {
      onOpenPlayerCareer(playerId);
    } else if (onSelectPlayerForFilter) {
      onSelectPlayerForFilter(playerId);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. OLYMPIJSKÉ PÓDIUM PRO TOP 3 */}
      {top1 && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-background to-card p-4 sm:p-6 shadow-xs">
          <div className="text-center space-y-1 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
              <Crown className="h-3.5 w-3.5" />
              Královské pódium HC Aces
            </div>
            <h3 className="font-headline font-black text-lg sm:text-xl text-foreground">
              Nejúspěšnější sběratelé klubových trofejí
            </h3>
          </div>

          {/* Uspořádání: 2. Místo (vlevo), 1. Místo (střed - nejvyšší), 3. Místo (vpravo) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-xl mx-auto pt-4">
            {/* 2. MÍSTO (STŘÍBRO) */}
            {top2 ? (
              <div
                onClick={() => handlePlayerClick(top2.id)}
                className="flex flex-col items-center cursor-pointer group text-center"
                title={`2. místo: ${top2.name} (${top2.totalBadges} odznaků)`}
              >
                <div className="relative mb-2">
                  <Avatar className="h-14 w-14 sm:h-18 sm:w-18 border-2 border-slate-300 dark:border-zinc-400 shadow-md ring-2 ring-slate-400/30 group-hover:scale-105 transition-transform">
                    <AvatarImage src={top2.photoURL || undefined} />
                    <AvatarFallback className="font-bold text-sm bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                      {top2.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-slate-300 dark:bg-zinc-300 text-slate-900 flex items-center justify-center text-xs font-black shadow-md border-2 border-background">
                    2
                  </span>
                </div>

                <p className="font-bold text-xs sm:text-sm text-foreground truncate max-w-full group-hover:text-primary transition-colors">
                  {top2.name}
                </p>
                <span className="text-[11px] font-black text-slate-500 dark:text-zinc-400">
                  {top2.totalBadges} odznaků
                </span>

                {/* Podstavec 2. místa */}
                <div className="w-full h-20 sm:h-24 mt-2.5 rounded-t-xl bg-gradient-to-t from-slate-400/20 to-slate-300/10 border-t-2 border-x border-slate-300/40 flex flex-col items-center justify-center p-1">
                  <Medal className="h-6 w-6 text-slate-400 fill-slate-300" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider mt-0.5">
                    Stříbro
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-20" />
            )}

            {/* 1. MÍSTO (ZLATO - NEJVYŠŠÍ) */}
            <div
              onClick={() => handlePlayerClick(top1.id)}
              className="flex flex-col items-center cursor-pointer group text-center z-10"
              title={`1. místo: ${top1.name} (${top1.totalBadges} odznaků)`}
            >
              <div className="relative mb-2">
                <Crown className="h-6 w-6 text-amber-500 fill-amber-500 mx-auto -mb-1 animate-bounce" />
                <Avatar className="h-18 w-18 sm:h-22 sm:w-22 border-3 border-amber-500 shadow-xl ring-4 ring-amber-500/25 group-hover:scale-105 transition-transform">
                  <AvatarImage src={top1.photoURL || undefined} />
                  <AvatarFallback className="font-black text-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {top1.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center text-xs font-black shadow-lg border-2 border-background">
                  1
                </span>
              </div>

              <p className="font-headline font-black text-sm sm:text-base text-foreground truncate max-w-full group-hover:text-amber-500 transition-colors">
                {top1.name}
              </p>
              <span className="text-xs sm:text-sm font-black text-amber-500">
                {top1.totalBadges} odznaků
              </span>

              {/* Podstavec 1. místa (nejvyšší) */}
              <div className="w-full h-28 sm:h-32 mt-2.5 rounded-t-xl bg-gradient-to-t from-amber-500/30 via-amber-500/15 to-amber-500/10 border-t-2 border-x border-amber-500/50 flex flex-col items-center justify-center p-1 shadow-inner">
                <Trophy className="h-8 w-8 text-amber-500 fill-amber-500" />
                <span className="text-xs sm:text-sm font-black text-amber-500 uppercase tracking-wider mt-0.5">
                  Šampion
                </span>
              </div>
            </div>

            {/* 3. MÍSTO (BRONZ) */}
            {top3 ? (
              <div
                onClick={() => handlePlayerClick(top3.id)}
                className="flex flex-col items-center cursor-pointer group text-center"
                title={`3. místo: ${top3.name} (${top3.totalBadges} odznaků)`}
              >
                <div className="relative mb-2">
                  <Avatar className="h-14 w-14 sm:h-18 sm:w-18 border-2 border-amber-700/60 shadow-md ring-2 ring-amber-700/20 group-hover:scale-105 transition-transform">
                    <AvatarImage src={top3.photoURL || undefined} />
                    <AvatarFallback className="font-bold text-sm bg-amber-800/20 text-amber-700 dark:text-amber-600">
                      {top3.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-background">
                    3
                  </span>
                </div>

                <p className="font-bold text-xs sm:text-sm text-foreground truncate max-w-full group-hover:text-primary transition-colors">
                  {top3.name}
                </p>
                <span className="text-[11px] font-black text-amber-700 dark:text-amber-600">
                  {top3.totalBadges} odznaků
                </span>

                {/* Podstavec 3. místa */}
                <div className="w-full h-16 sm:h-20 mt-2.5 rounded-t-xl bg-gradient-to-t from-amber-700/20 to-amber-700/10 border-t-2 border-x border-amber-700/40 flex flex-col items-center justify-center p-1">
                  <Medal className="h-5 w-5 text-amber-700 fill-amber-700" />
                  <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider mt-0.5">
                    Bronz
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-16" />
            )}
          </div>
        </div>
      )}

      {/* 2. KOMPAKTNÍ ŽEBŘÍČEK PRO DALŠÍ HRÁČE (OD 4. MÍSTA) */}
      {remainingLeaders.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs space-y-0">
          <div className="p-3.5 sm:p-4 border-b border-border/60 flex items-center justify-between">
            <h4 className="font-headline font-bold text-sm sm:text-base text-foreground">
              Další hráči na soupisce
            </h4>
            <span className="text-xs text-muted-foreground">
              {remainingLeaders.length} hráčů
            </span>
          </div>

          <div className="divide-y divide-border/40">
            {remainingLeaders.map((leader, index) => {
              const rank = index + 4;

              return (
                <div
                  key={leader.id}
                  onClick={() => handlePlayerClick(leader.id)}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer group select-none"
                  title={`Klikněte pro profil ${leader.name}`}
                >
                  {/* Pořadí + Avatar + Jméno */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 text-center font-black text-xs sm:text-sm text-muted-foreground tabular-nums shrink-0">
                      #{rank}
                    </span>

                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border shrink-0 group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                      <AvatarImage src={leader.photoURL || undefined} />
                      <AvatarFallback className="text-xs font-bold">
                        {leader.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {leader.name}
                        </span>
                        {leader.jerseyNumber && (
                          <span className="text-xs text-muted-foreground font-mono">
                            #{leader.jerseyNumber}
                          </span>
                        )}
                      </div>

                      {/* Medaile */}
                      <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap">
                        {leader.legendCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-bold text-[11px]" title="Legenda">
                            <Crown className="h-3 w-3 fill-current" />
                            {leader.legendCount}
                          </span>
                        )}
                        {leader.diamondCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-cyan-600 dark:text-cyan-400 font-bold text-[11px]" title="Diamant">
                            <Sparkles className="h-3 w-3 fill-current" />
                            {leader.diamondCount}
                          </span>
                        )}
                        {leader.goldCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold text-[11px]" title="Zlato">
                            <Medal className="h-3 w-3 text-amber-500 fill-amber-500" />
                            {leader.goldCount}
                          </span>
                        )}
                        {leader.silverCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-zinc-400 font-bold text-[11px]" title="Stříbro">
                            <Medal className="h-3 w-3 text-slate-400 fill-slate-300" />
                            {leader.silverCount}
                          </span>
                        )}
                        {leader.bronzeCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-800 dark:text-amber-600 font-bold text-[11px]" title="Bronz">
                            <Medal className="h-3 w-3 text-amber-700 fill-amber-700" />
                            {leader.bronzeCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Počet odznaků + Šipka */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-headline font-black text-sm sm:text-base text-foreground tabular-nums block">
                        {leader.totalBadges}
                      </span>
                      <span className="text-[10px] text-muted-foreground block -mt-0.5">
                        odznaků
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
