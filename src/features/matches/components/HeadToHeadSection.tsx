'use client';

import React, { useMemo, useState } from 'react';
import { Swords, Flame, ShieldAlert, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateHeadToHead } from '../utils/headToHead';
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
            <span>Vzájemná bilance: {h2h.opponentName}</span>
          </div>

          {h2h.totalPlayed > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-background/80 border border-border/60 text-xs font-semibold">
              <span className="text-emerald-500">{h2h.wins}V</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-amber-500">{h2h.draws}R</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-destructive">{h2h.losses}P</span>
            </div>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
              První vzájemné utkání v této sezóně
            </Badge>
          )}
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
          {h2h.totalPlayed === 0 && (
            <p className="text-xs text-muted-foreground py-0.5">
              S týmem <strong className="text-foreground">{h2h.opponentName}</strong> jsme v probíhající sezóně zatím neodehráli žádný vzájemný zápas.
            </p>
          )}

          {h2h.totalPlayed > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background/80 border border-border/60">
                <span className="text-muted-foreground">Celkové skóre:</span>
                <span className="font-bold text-foreground">
                  {h2h.goalsFor}:{h2h.goalsAgainst}
                </span>
              </div>
            </div>
          )}

      {h2h.totalPlayed > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40">
          {/* Poslední vzájemné zápasy */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-0.5">Minulé zápasy:</span>
            {h2h.recentMatches.map((rm) => (
              <div
                key={rm.id}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-background/70 border border-border/50"
                title={`${rm.roundLabel}${rm.dateLabel ? ` (${rm.dateLabel})` : ''}`}
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

      {/* Klíčoví hráči soupeře (Top 3) */}
      {h2h.keyOpponentPlayers.length > 0 && (
        <div className="pt-2 border-t border-border/40 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Pozor na soupeře (Klíčoví hráči)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {h2h.keyOpponentPlayers.map((sk) => (
              <div
                key={sk.name}
                className="flex items-center justify-between px-2.5 py-1 rounded bg-background/80 border border-border/60 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground w-3.5">{sk.rank}.</span>
                  <span className="font-semibold truncate">{sk.name}</span>
                </div>
                <span className="font-bold text-primary shrink-0 ml-1.5 font-mono">
                  {sk.points} B <span className="text-[10px] text-muted-foreground font-normal font-sans">({sk.goals}+{sk.assists})</span>
                </span>
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
