'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListOrdered, BarChart3, Info, ChevronRight, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamAnalyticsSummary } from '../types';
import { areClubNamesMatching } from '../utils/league-analytics';

interface LeagueStandingsAnalyticsTableProps {
  teams: TeamAnalyticsSummary[];
  onSelectTeam: (team: TeamAnalyticsSummary) => void;
}

export function LeagueStandingsAnalyticsTable({
  teams,
  onSelectTeam,
}: LeagueStandingsAnalyticsTableProps) {
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');

  return (
    <Card className="border-border/70 bg-card/95 w-full min-w-0 overflow-hidden shadow-sm">
      <CardHeader className="py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50">
        <div className="space-y-0.5">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-headline">
            <ListOrdered className="h-5 w-5 text-primary" />
            <span>Tabulka soutěže & Analytika</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Kliknutím na kterýkoliv tým otevřete detailní profil, formu a vzájemnou bilanci s HC Aces.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0 self-start sm:self-center border border-border/60">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'basic' ? 'default' : 'ghost'}
            onClick={() => setViewMode('basic')}
            className={cn(
              'h-7 px-2.5 text-xs font-semibold rounded-lg',
              viewMode === 'basic' && 'bg-primary text-primary-foreground shadow-sm'
            )}
          >
            <ListOrdered className="h-3.5 w-3.5 mr-1" />
            Základní tabulka
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'advanced' ? 'default' : 'ghost'}
            onClick={() => setViewMode('advanced')}
            className={cn(
              'h-7 px-2.5 text-xs font-semibold rounded-lg',
              viewMode === 'advanced' && 'bg-primary text-primary-foreground shadow-sm'
            )}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Střely & Tresty
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <Table className="w-full text-xs sm:text-sm">
            <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              {viewMode === 'basic' ? (
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="min-w-[140px]">Tým</TableHead>
                  <TableHead className="text-center font-bold">Z</TableHead>
                  <TableHead className="text-center">V</TableHead>
                  <TableHead className="text-center">R</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center min-w-[70px]">Skóre</TableHead>
                  <TableHead className="text-center font-black text-primary">B</TableHead>
                  <TableHead className="text-center min-w-[110px] hidden md:table-cell">Forma (posledních 5)</TableHead>
                  <TableHead className="w-8 text-right pr-3"></TableHead>
                </TableRow>
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="min-w-[140px]">Tým</TableHead>
                  <TableHead className="text-center font-bold">Z</TableHead>
                  <TableHead className="text-center">G/Z</TableHead>
                  <TableHead className="text-center">OG/Z</TableHead>
                  <TableHead className="text-center">Střely</TableHead>
                  <TableHead className="text-center font-bold text-amber-500">Úsp. střel %</TableHead>
                  <TableHead className="text-center">Úsp. zákrok %</TableHead>
                  <TableHead className="text-center">TM</TableHead>
                  <TableHead className="text-center font-bold text-purple-500">TM/Z</TableHead>
                  <TableHead className="w-8 text-right pr-3"></TableHead>
                </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={viewMode === 'basic' ? 10 : 11} className="py-8 text-center text-muted-foreground italic text-xs">
                    Žádná data k zobrazení. Proveďte synchronizaci ligy.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => {
                  const isAces = areClubNamesMatching(team.name, 'HC Aces');

                  if (viewMode === 'basic') {
                    return (
                      <TableRow
                        key={team.id}
                        onClick={() => onSelectTeam(team)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isAces
                            ? 'bg-primary/10 hover:bg-primary/15 font-semibold text-foreground border-l-4 border-l-primary'
                            : 'hover:bg-muted/40'
                        )}
                      >
                        <TableCell className="text-center font-bold text-muted-foreground">
                          {team.rank}.
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{team.name}</span>
                            {isAces && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary font-bold">
                                ACES
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{team.gp}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{team.w}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{team.d}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{team.l}</TableCell>
                        <TableCell className="text-center tabular-nums whitespace-nowrap">
                          {team.gf}:{team.ga}
                          <span
                            className={cn(
                              'text-[10px] ml-1 font-normal',
                              team.diff > 0 ? 'text-emerald-500' : team.diff < 0 ? 'text-rose-500' : 'text-muted-foreground'
                            )}
                          >
                            ({team.diff > 0 ? `+${team.diff}` : team.diff})
                          </span>
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-black text-sm text-primary">
                          {team.points}
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {team.form.map((f, idx) => (
                              <span
                                key={idx}
                                title={`${f.round}. kolo: ${f.score} vs ${f.opponent}`}
                                className={cn(
                                  'h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white',
                                  f.result === 'W' && 'bg-emerald-500',
                                  f.result === 'D' && 'bg-amber-500',
                                  f.result === 'L' && 'bg-rose-500'
                                )}
                              >
                                {f.result}
                              </span>
                            ))}
                            {team.form.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/60 inline-block" />
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // Advanced metrics view
                  return (
                    <TableRow
                      key={team.id}
                      onClick={() => onSelectTeam(team)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isAces
                          ? 'bg-primary/10 hover:bg-primary/15 font-semibold text-foreground border-l-4 border-l-primary'
                          : 'hover:bg-muted/40'
                      )}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {team.rank}.
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{team.name}</span>
                          {isAces && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary font-bold">
                              ACES
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{team.gp}</TableCell>
                      <TableCell className="text-center tabular-nums text-foreground font-medium">{team.gfPerGame}</TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">{team.gaPerGame}</TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {team.hasShotsTracked ? team.totalShots : '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-bold text-amber-500">
                        {team.hasShotsTracked ? `${team.shootingPercentage} %` : '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {team.totalShotsAgainst > 0 ? `${team.savePercentage} %` : '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">{team.totalPenalties}</TableCell>
                      <TableCell className="text-center tabular-nums font-bold text-purple-500">
                        {team.penaltiesPerGame}
                      </TableCell>
                      <TableCell className="text-right pr-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60 inline-block" />
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
