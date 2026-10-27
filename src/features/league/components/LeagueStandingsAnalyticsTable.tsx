'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ListOrdered,
  BarChart3,
  Search,
  ChevronRight,
  Target,
  Shield,
  AlertTriangle,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamAnalyticsSummary } from '../types';
import { areClubNamesMatching } from '../utils/league-analytics';

interface LeagueStandingsAnalyticsTableProps {
  teams: TeamAnalyticsSummary[];
  onSelectTeam: (team: TeamAnalyticsSummary) => void;
}

type SortField = 'rank' | 'points' | 'shots' | 'shotPct' | 'savePct' | 'penalties' | 'gfPerGame' | 'gaPerGame';

export function LeagueStandingsAnalyticsTable({
  teams,
  onSelectTeam,
}: LeagueStandingsAnalyticsTableProps) {
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('rank');

  // Filter and sort teams
  const filteredTeams = useMemo(() => {
    return teams
      .filter((t) => {
        if (!searchFilter) return true;
        return t.name.toLowerCase().includes(searchFilter.toLowerCase());
      })
      .sort((a, b) => {
        if (sortBy === 'points' || sortBy === 'rank') {
          return a.rank - b.rank;
        }
        if (sortBy === 'shots') {
          return b.totalShots - a.totalShots || a.rank - b.rank;
        }
        if (sortBy === 'shotPct') {
          return b.shootingPercentage - a.shootingPercentage || b.gf - a.gf;
        }
        if (sortBy === 'savePct') {
          return b.savePercentage - a.savePercentage || a.gaPerGame - b.gaPerGame;
        }
        if (sortBy === 'penalties') {
          // Fair Play: lowest penalties first
          return a.totalPenalties - b.totalPenalties || a.penaltiesPerGame - b.penaltiesPerGame;
        }
        if (sortBy === 'gfPerGame') {
          return b.gfPerGame - a.gfPerGame || b.gf - a.gf;
        }
        if (sortBy === 'gaPerGame') {
          return a.gaPerGame - b.gaPerGame || a.ga - b.ga;
        }
        return a.rank - b.rank;
      });
  }, [teams, searchFilter, sortBy]);

  return (
    <Card className="border-border/70 bg-card/95 w-full min-w-0 overflow-hidden shadow-sm">
      <CardHeader className="py-3.5 px-4 sm:px-6 flex flex-col gap-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-headline">
              <ListOrdered className="h-5 w-5 text-primary" />
              <span>Tabulka soutěže & Analytika</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Kompletní statistiky 9 týmů ligy HobbyHokej Brno. Kliknutím na tým otevřete detailní profil a formu.
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0 self-start sm:self-center border border-border/60">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'basic' ? 'default' : 'ghost'}
              onClick={() => {
                setViewMode('basic');
                setSortBy('rank');
              }}
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
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filtrovat tým podle názvu..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30"
            />
          </div>

          {viewMode === 'advanced' && (
            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                Řadit:
              </span>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortField)}>
                <SelectTrigger className="h-8 text-xs w-[180px] bg-muted/30">
                  <SelectValue placeholder="Výběr řazení" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rank">Dle bodů (Pořadí)</SelectItem>
                  <SelectItem value="shotPct">Úspěšnost střelby %</SelectItem>
                  <SelectItem value="savePct">Úspěšnost zákroků %</SelectItem>
                  <SelectItem value="penalties">Fair Play (Nejméně TM)</SelectItem>
                  <SelectItem value="gfPerGame">Nejlepší útok (G/Z)</SelectItem>
                  <SelectItem value="gaPerGame">Nejpevnější obrana (OG/Z)</SelectItem>
                  <SelectItem value="shots">Celkem střel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
                  <TableHead className="text-center font-bold text-blue-500">Úsp. zákrok %</TableHead>
                  <TableHead className="text-center font-bold text-purple-500">TM (Fair Play)</TableHead>
                  <TableHead className="text-center font-bold text-purple-500">TM / Z</TableHead>
                  <TableHead className="w-8 text-right pr-3"></TableHead>
                </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={viewMode === 'basic' ? 10 : 11} className="py-8 text-center text-muted-foreground italic text-xs">
                    Žádný tým neodpovídá zadanému filtru.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team, idx) => {
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
                            {team.form.map((f, i) => (
                              <span
                                key={i}
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
                        {sortBy === 'rank' ? `${team.rank}.` : `${idx + 1}.`}
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
                        {team.totalShots > 0 ? team.totalShots : '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-bold text-amber-500">
                        {team.shootingPercentage > 0 ? `${team.shootingPercentage} %` : '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-bold text-blue-500">
                        {team.savePercentage > 0 ? `${team.savePercentage} %` : '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-black text-purple-500">
                        <Badge variant="outline" className="font-black text-xs px-2 py-0.5 border-purple-500/40 text-purple-400 bg-purple-500/10">
                          {team.totalPenalties} TM
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-bold text-purple-400">
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
