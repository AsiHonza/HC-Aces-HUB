'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { HeartHandshake, Flame, Shield, Trophy, ChevronRight } from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import type { TeamChemistryData, DynamicDuoRecord } from '../../../utils/chemistry';

export interface DynamicDuoSectionProps {
  teamChemistry?: TeamChemistryData;
  onSelectDuo: (duo: DynamicDuoRecord) => void;
  onOpenPlayerCareer?: (playerId: string) => void;
}

export function DynamicDuoSection({
  teamChemistry,
  onSelectDuo,
  onOpenPlayerCareer,
}: DynamicDuoSectionProps) {
  const [duoUnitFilter, setDuoUnitFilter] = useState<'attack' | 'defense'>('attack');

  if (!teamChemistry) return null;

  const attackDuos = teamChemistry.topDuos || [];
  const defensePairs = teamChemistry.topDefensePairs || [];

  const currentList = duoUnitFilter === 'attack' ? attackDuos : defensePairs;

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-card p-4 sm:p-5 shadow-xs space-y-4">
      {/* Hlavička a přepínač Útok / Obrana */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-inner">
            <HeartHandshake className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-base sm:text-lg text-foreground">
              Dynamic Duo – Chemie na ledě
            </h3>
            <p className="text-xs text-muted-foreground">
              Nejlepší souhra mezi útočníky (asistence na gól) a obrannými dvojicemi
            </p>
          </div>
        </div>

        {/* Přepínač Útok / Obrana */}
        <div className="inline-flex items-center bg-muted/70 p-0.5 rounded-xl border border-border/60 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setDuoUnitFilter('attack')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all touch-manipulation',
              duoUnitFilter === 'attack'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Útočná souhra ({attackDuos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setDuoUnitFilter('defense')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all touch-manipulation',
              duoUnitFilter === 'defense'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Obranné páry ({defensePairs.length})</span>
          </button>
        </div>
      </div>

      {/* Seznam dvojic */}
      {currentList.length === 0 ? (
        <div className="py-10 text-center text-xs sm:text-sm text-muted-foreground">
          Zatím nejsou k dispozici dostatečná data pro tuto kategorii souher.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {currentList.map((duo) => {
            const isDef = duo.unitType === 'defense';
            const totalMutualGoals = duo.p1GoalsFromP2 + duo.p2GoalsFromP1;
            const isBothWays = duo.p1GoalsFromP2 > 0 && duo.p2GoalsFromP1 > 0;
            const dir1Pct = totalMutualGoals > 0 ? Math.round((duo.p1GoalsFromP2 / totalMutualGoals) * 100) : 50;
            const dir2Pct = totalMutualGoals > 0 ? 100 - dir1Pct : 50;

            const p1Pts = (duo.p1GoalsInShared || 0) + (duo.p1AssistsInShared || 0);
            const p2Pts = (duo.p2GoalsInShared || 0) + (duo.p2AssistsInShared || 0);
            const totalSharedPts = Math.max(1, p1Pts + p2Pts);
            const pts1Pct = Math.round((p1Pts / totalSharedPts) * 100);
            const pts2Pct = 100 - pts1Pct;
            const chemistryScore = isDef ? duo.winRatePct : (duo.winRateWhenScoringPct || duo.winRatePct);

            return (
              <div
                key={duo.duoKey}
                onClick={() => onSelectDuo(duo)}
                className="rounded-xl border border-border/70 bg-card/85 hover:bg-card hover:border-primary/40 p-3.5 flex flex-col justify-between gap-3 hover:shadow-xs transition-all cursor-pointer group"
                title="Klikněte pro kompletní historii souhry a gólů"
              >
                {/* Horní řádek: Dvojice avatarů a jmen + Chemie skóre */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center -space-x-2 shrink-0">
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-background ring-1 ring-border">
                        <AvatarImage src={duo.player1Photo || undefined} />
                        <AvatarFallback className="text-xs font-bold">
                          {duo.player1Name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-background ring-1 ring-border">
                        <AvatarImage src={duo.player2Photo || undefined} />
                        <AvatarFallback className="text-xs font-bold">
                          {duo.player2Name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="min-w-0">
                      <p className="font-headline font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {formatName(duo.player1Name)} & {formatName(duo.player2Name)}
                      </p>
                      <span className="text-[11px] text-muted-foreground block -mt-0.5">
                        {isDef ? 'Obranná dvojice' : 'Útočné duo'} • {duo.gamesTogether} zápasů
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/15 text-primary text-xs font-black">
                      <Flame className="h-3 w-3" />
                      {chemistryScore} %
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-semibold mt-0.5">
                      {isDef ? `${duo.combinedPointsInSharedGames} bodů` : `${duo.totalCombinedGoals} gólů`}
                    </span>
                  </div>
                </div>

                {/* Rozdělení bodů / gólů */}
                <div className="space-y-1 bg-muted/40 p-2 rounded-lg border border-border/40 text-xs">
                  {!isDef ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2 flex-wrap">
                        {isBothWays ? (
                          <>
                            <span>
                              {formatName(duo.player2Name)} ➔ <strong className="text-foreground">{formatName(duo.player1Name)}</strong> ({duo.p1GoalsFromP2} G)
                            </span>
                            <span>
                              {formatName(duo.player1Name)} ➔ <strong className="text-foreground">{formatName(duo.player2Name)}</strong> ({duo.p2GoalsFromP1} G)
                            </span>
                          </>
                        ) : duo.p1GoalsFromP2 > 0 ? (
                          <span>
                            Nahrává <strong className="text-foreground">{formatName(duo.player2Name)}</strong> ➔ pálí <strong className="text-primary">{formatName(duo.player1Name)}</strong> ({duo.p1GoalsFromP2}×)
                          </span>
                        ) : (
                          <span>
                            Nahrává <strong className="text-foreground">{formatName(duo.player1Name)}</strong> ➔ pálí <strong className="text-primary">{formatName(duo.player2Name)}</strong> ({duo.p2GoalsFromP1}×)
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden flex gap-0.5">
                        {duo.p1GoalsFromP2 > 0 && (
                          <div
                            className="h-full bg-primary rounded-l-full"
                            style={{ width: `${Math.max(15, dir1Pct)}%` }}
                          />
                        )}
                        {duo.p2GoalsFromP1 > 0 && (
                          <div
                            className="h-full bg-amber-500 rounded-r-full"
                            style={{ width: `${Math.max(15, dir2Pct)}%` }}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2 flex-wrap">
                        <span>
                          Body od modré: <strong className="text-foreground">{duo.combinedPointsInSharedGames} KB</strong>
                        </span>
                        <span>
                          Průměr obdržených: <strong className="text-sky-400">{duo.avgGoalsAgainstTogether} G/zápas</strong>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden flex gap-0.5">
                        <div
                          className="h-full bg-sky-500 rounded-l-full"
                          style={{ width: `${Math.max(15, pts1Pct)}%` }}
                        />
                        <div
                          className="h-full bg-amber-500 rounded-r-full"
                          style={{ width: `${Math.max(15, pts2Pct)}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Spodní řádek se statistikami */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Výhry spolu: <strong className="text-foreground">{duo.winRatePct} %</strong>
                    </span>
                    {duo.gwgCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-500 font-bold inline-flex items-center gap-0.5">
                          <Trophy className="h-3 w-3" />
                          {duo.gwgCount}× GWG
                        </span>
                      </>
                    )}
                    {isDef && duo.shutoutsTogether > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-500 font-bold">
                          {duo.shutoutsTogether}× nula
                        </span>
                      </>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-primary inline-flex items-center gap-0.5 group-hover:underline">
                    Detail souhry <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
