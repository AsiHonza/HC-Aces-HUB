'use client';

import React, { useMemo, useState } from 'react';
import { Swords, Flame, ShieldAlert, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateHeadToHead } from '../utils/headToHead';
import { TeamBadge } from '@/features/league';
import type { Match, UserProfile } from '@/types';

export interface HeadToHeadSectionProps {
  match: Match;
  allMatches?: Match[];
  archivedSeasons?: any[];
  usersMap?: Map<string, UserProfile>;
  leagueSkaters?: Array<{ name: string; club: string; goals: number; assists: number; points: number; gamesPlayed?: number }>;
  defaultExpanded?: boolean;
}

export function HeadToHeadSection({
  match,
  allMatches = [],
  archivedSeasons = [],
  usersMap,
  leagueSkaters = [],
  defaultExpanded = false,
}: HeadToHeadSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const h2h = useMemo(
    () => calculateHeadToHead(match, allMatches, archivedSeasons, usersMap, leagueSkaters),
    [match, allMatches, archivedSeasons, usersMap, leagueSkaters]
  );

  return (
    <div className="rounded-lg border border-border/70 bg-muted/25 transition-all overflow-hidden">
      {/* Zabalovací hlavička / Tlačítko */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-muted/40 transition-colors group cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
            <Swords className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Vzájemná bilance:</span>
            <TeamBadge name={h2h.opponentName} size="xs" />
            <span>{h2h.opponentName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Pill: Aktuální sezóna */}
            {h2h.currentSeason.totalPlayed > 0 ? (
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 border border-primary/25 text-xs font-semibold"
                title="Bilance v aktuální sezóně"
              >
                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-0.5">Sezóna:</span>
                <span className="text-emerald-500 font-bold">{h2h.currentSeason.wins}V</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-amber-500 font-bold">{h2h.currentSeason.draws}R</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-destructive font-bold">{h2h.currentSeason.losses}P</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                V sezóně poprvé
              </Badge>
            )}

            {/* Pill: Historicky */}
            {h2h.historical.totalPlayed > 0 && (
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background/80 border border-border/60 text-xs font-semibold"
                title="Celková historická bilance všech odehraných zápasů"
              >
                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-0.5">Historie:</span>
                <span className="text-emerald-500 font-bold">{h2h.historical.wins}V</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-amber-500 font-bold">{h2h.historical.draws}R</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-destructive font-bold">{h2h.historical.losses}P</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">
            {isExpanded ? 'Zabalit' : 'Zobrazit bilanci & skauting'}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180 text-foreground'
            )}
          />
        </div>
      </button>

      {/* Rozbalitelný obsah */}
      {isExpanded && (
        <div className="p-3 pt-2 space-y-2.5 border-t border-border/40 animate-in fade-in-50 duration-200">
          {/* 2 ŘÁDKY BILANCE: Aktuální sezóna + Historicky */}
          <div className="space-y-1.5">
            {/* Řádek 1: Bilance v aktuální sezóně */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md bg-card/90 dark:bg-muted/40 border border-border/70 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Bilance v aktuální sezóně:</span>
                {h2h.currentSeason.totalPlayed > 0 ? (
                  <div className="inline-flex items-center gap-1 font-bold">
                    <span className="text-emerald-500">{h2h.currentSeason.wins}V</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-amber-500">{h2h.currentSeason.draws}R</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-destructive">{h2h.currentSeason.losses}P</span>
                    <span className="text-[11px] text-muted-foreground font-normal ml-1">
                      ({h2h.currentSeason.totalPlayed} {h2h.currentSeason.totalPlayed === 1 ? 'zápas' : h2h.currentSeason.totalPlayed < 5 ? 'zápasy' : 'zápasů'})
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground font-medium italic text-[11px]">V této sezóně zatím neodehrán žádný zápas</span>
                )}
              </div>
              {h2h.currentSeason.totalPlayed > 0 && (
                <div className="text-[11px] text-muted-foreground">
                  Skóre v sezóně:{' '}
                  <span className="font-bold text-foreground font-mono">
                    {h2h.currentSeason.goalsFor}:{h2h.currentSeason.goalsAgainst}
                  </span>
                </div>
              )}
            </div>

            {/* Řádek 2: Bilance historicky */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md bg-card/90 dark:bg-muted/40 border border-border/70 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Bilance historicky:</span>
                {h2h.historical.totalPlayed > 0 ? (
                  <div className="inline-flex items-center gap-1 font-bold">
                    <span className="text-emerald-500">{h2h.historical.wins}V</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-amber-500">{h2h.historical.draws}R</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-destructive">{h2h.historical.losses}P</span>
                    <span className="text-[11px] text-muted-foreground font-normal ml-1">
                      (celkem {h2h.historical.totalPlayed} {h2h.historical.totalPlayed === 1 ? 'zápas' : h2h.historical.totalPlayed < 5 ? 'zápasy' : 'zápasů'})
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground font-medium italic text-[11px]">Žádné historické zápasy nebyly nalezeny</span>
                )}
              </div>
              {h2h.historical.totalPlayed > 0 && (
                <div className="text-[11px] text-muted-foreground">
                  Celkové skóre:{' '}
                  <span className="font-bold text-foreground font-mono">
                    {h2h.historical.goalsFor}:{h2h.historical.goalsAgainst}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Poslední vzájemné zápasy a lídr na soupeře */}
          {h2h.totalPlayed > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40">
              {/* Poslední vzájemné zápasy */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground mr-0.5">Minulé zápasy:</span>
                {h2h.recentMatches.map((rm) => (
                  <div
                    key={rm.id}
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border',
                      rm.isCurrentSeason
                        ? 'bg-background/90 border-primary/30'
                        : 'bg-background/60 border-border/50'
                    )}
                    title={`${rm.roundLabel}${rm.dateLabel ? ` (${rm.dateLabel})` : ''}${
                      rm.isCurrentSeason ? ' • Aktuální sezóna' : ' • Minulá sezóna'
                    }`}
                  >
                    <span
                      className={cn(
                        'font-extrabold text-[10px]',
                        rm.outcome === 'W'
                          ? 'text-emerald-500'
                          : rm.outcome === 'L'
                          ? 'text-destructive'
                          : 'text-amber-500'
                      )}
                    >
                      {rm.outcome === 'W' ? 'V' : rm.outcome === 'L' ? 'P' : 'R'}
                    </span>
                    <span className="font-bold">
                      {rm.acesScore}:{rm.opponentScore}
                    </span>
                    {rm.dateLabel && (
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        ({rm.dateLabel})
                      </span>
                    )}
                    {rm.isCurrentSeason && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Zápas z této sezóny" />
                    )}
                  </div>
                ))}
              </div>

              {/* Nejproduktivnější hráč proti tomuto soupeři */}
              {h2h.topPlayer && (
                <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-primary/10 border border-primary/25 text-primary self-start sm:self-auto">
                  <Flame className="h-3 w-3 shrink-0" />
                  <span className="text-muted-foreground">Lídr na soupeře:</span>
                  <span className="font-bold text-foreground">{h2h.topPlayer.name}</span>
                  <span className="font-semibold">
                    ({h2h.topPlayer.points}B: {h2h.topPlayer.goals}+{h2h.topPlayer.assists})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Klíčoví hráči soupeře (Top 3 vypsaní pod sebou pro maximální čitelnost) */}
          {h2h.keyOpponentPlayers.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Pozor na soupeře (Klíčoví hráči)</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {h2h.keyOpponentPlayers.map((sk) => (
                  <div
                    key={sk.name}
                    className="flex items-center justify-between px-3 py-1.5 rounded-md bg-card dark:bg-muted/40 border border-border/80 text-xs shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">{sk.rank}.</span>
                      <span className="font-semibold text-foreground truncate">{sk.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sk.gamesPlayed !== undefined && sk.gamesPlayed !== null && (
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/80 dark:bg-background/60 px-2 py-0.5 rounded border border-border/60">
                          {sk.gamesPlayed} Z
                        </span>
                      )}
                      <span className="font-bold text-primary font-mono whitespace-nowrap text-xs">
                        {sk.points} B{' '}
                        <span className="text-[10px] text-muted-foreground font-normal font-sans">
                          ({sk.goals}+{sk.assists})
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
