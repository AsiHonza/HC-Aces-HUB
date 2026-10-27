'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeagueGoalieItem } from '../types';
import { areClubNamesMatching, normalizeClubName } from '../utils/league-analytics';

interface LeagueGoaliesTableProps {
  goalies: LeagueGoalieItem[];
  onSelectTeam?: (teamName: string) => void;
}

export function LeagueGoaliesTable({ goalies, onSelectTeam }: LeagueGoaliesTableProps) {
  const [sortBy, setSortBy] = useState<'svPct' | 'gaa' | 'gp'>('svPct');

  const getGaa = (g: LeagueGoalieItem) =>
    g.gaa ?? (g.gamesPlayed > 0 ? g.goalsAgainst / g.gamesPlayed : 0);

  const sortedGoalies = useMemo(() => {
    return [...goalies].sort((a, b) => {
      if (sortBy === 'svPct') {
        return b.savePercentage - a.savePercentage || b.gamesPlayed - a.gamesPlayed;
      }
      if (sortBy === 'gaa') {
        return getGaa(a) - getGaa(b) || b.savePercentage - a.savePercentage;
      }
      return b.gamesPlayed - a.gamesPlayed || b.savePercentage - a.savePercentage;
    });
  }, [goalies, sortBy]);

  return (
    <Card className="border-border/70 bg-card/95 w-full min-w-0 overflow-hidden shadow-sm">
      <CardHeader className="py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50">
        <div className="space-y-0.5">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-headline">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Statistiky brankářů ligy</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Přehled úspěšnosti, obdržených branek a čistých kont všech {goalies.length} brankářů soutěže.
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0 border border-border/60">
          <Button
            type="button"
            size="sm"
            variant={sortBy === 'svPct' ? 'default' : 'ghost'}
            onClick={() => setSortBy('svPct')}
            className={cn(
              'h-7 px-2.5 text-xs font-semibold rounded-lg',
              sortBy === 'svPct' && 'bg-blue-600 text-white hover:bg-blue-600/90'
            )}
          >
            Úspěšnost %
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sortBy === 'gaa' ? 'default' : 'ghost'}
            onClick={() => setSortBy('gaa')}
            className={cn(
              'h-7 px-2.5 text-xs font-semibold rounded-lg',
              sortBy === 'gaa' && 'bg-blue-600 text-white hover:bg-blue-600/90'
            )}
          >
            Průměr OG
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sortBy === 'gp' ? 'default' : 'ghost'}
            onClick={() => setSortBy('gp')}
            className={cn(
              'h-7 px-2.5 text-xs font-semibold rounded-lg',
              sortBy === 'gp' && 'bg-blue-600 text-white hover:bg-blue-600/90'
            )}
          >
            Zápasy
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <Table className="w-full text-xs sm:text-sm">
            <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="min-w-[150px]">Brankář</TableHead>
                <TableHead className="min-w-[120px]">Klub</TableHead>
                <TableHead className="text-center font-bold">Z</TableHead>
                <TableHead className="text-center hidden sm:table-cell">MIN</TableHead>
                <TableHead className="text-center">ZÁK</TableHead>
                <TableHead className="text-center">OG</TableHead>
                <TableHead className="text-center font-black text-blue-500">Úspěšnost %</TableHead>
                <TableHead className="text-center">Průměr</TableHead>
                <TableHead className="text-center hidden sm:table-cell">SO</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedGoalies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground italic text-xs">
                    Žádné statistiky brankářů. Proveďte synchronizaci ligy.
                  </TableCell>
                </TableRow>
              ) : (
                sortedGoalies.map((g, index) => {
                  const isAces = areClubNamesMatching(g.club, 'HC Aces');
                  const clubNorm = normalizeClubName(g.club);

                  return (
                    <TableRow
                      key={`${g.name}-${g.club}-${index}`}
                      className={cn(
                        'transition-colors',
                        isAces
                          ? 'bg-primary/10 hover:bg-primary/15 font-semibold text-foreground border-l-4 border-l-primary'
                          : 'hover:bg-muted/40'
                      )}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {index + 1}.
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{g.name}</span>
                          {isAces && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/40 text-primary font-bold">
                              ACES
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => onSelectTeam?.(clubNorm)}
                          className="hover:underline hover:text-primary transition-colors text-left"
                        >
                          {clubNorm}
                        </button>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {g.gamesPlayed}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                        {g.minutes}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {g.saves}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {g.goalsAgainst}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-black text-blue-500 text-sm">
                        {g.savePercentage.toFixed(1)} %
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {getGaa(g).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                        {g.shutouts > 0 ? (
                          <Badge variant="secondary" className="font-bold text-[10px] h-4 px-1">
                            {g.shutouts}
                          </Badge>
                        ) : (
                          '0'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
