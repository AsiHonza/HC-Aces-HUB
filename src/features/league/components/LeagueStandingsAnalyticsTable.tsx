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
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamAnalyticsSummary } from '../types';
import { areClubNamesMatching } from '../utils/league-analytics';
import { TeamBadge } from './TeamBadge';

interface LeagueStandingsAnalyticsTableProps {
  teams: TeamAnalyticsSummary[];
  onSelectTeam: (team: TeamAnalyticsSummary) => void;
}

type SortField =
  | 'rank'
  | 'name'
  | 'gp'
  | 'w'
  | 'd'
  | 'l'
  | 'diff'
  | 'points'
  | 'shots'
  | 'shotPct'
  | 'savePct'
  | 'penalties'
  | 'penaltiesPerGame'
  | 'gfPerGame'
  | 'gaPerGame';

export function LeagueStandingsAnalyticsTable({
  teams,
  onSelectTeam,
}: LeagueStandingsAnalyticsTableProps) {
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      // Natural defaults: asc for rank, name, penalties, ga; desc for points, goals, shots, %
      if (
        field === 'rank' ||
        field === 'name' ||
        field === 'penalties' ||
        field === 'penaltiesPerGame' ||
        field === 'gaPerGame' ||
        field === 'l'
      ) {
        setSortDir('asc');
      } else {
        setSortDir('desc');
      }
    }
  };

  // Filter and sort teams
  const filteredTeams = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;

    return [...teams]
      .filter((t) => {
        if (!searchFilter) return true;
        return t.name.toLowerCase().includes(searchFilter.toLowerCase());
      })
      .sort((a, b) => {
        let diff = 0;
        switch (sortBy) {
          case 'name':
            diff = a.name.localeCompare(b.name);
            break;
          case 'gp':
            diff = a.gp - b.gp;
            break;
          case 'w':
            diff = a.w - b.w;
            break;
          case 'd':
            diff = a.d - b.d;
            break;
          case 'l':
            diff = a.l - b.l;
            break;
          case 'diff':
            diff = a.diff - b.diff || a.gf - b.gf;
            break;
          case 'points':
            diff = a.points - b.points || a.diff - b.diff;
            break;
          case 'shots':
            diff = a.totalShots - b.totalShots;
            break;
          case 'shotPct':
            diff = a.shootingPercentage - b.shootingPercentage || a.gf - b.gf;
            break;
          case 'savePct':
            diff = a.savePercentage - b.savePercentage || b.gaPerGame - a.gaPerGame;
            break;
          case 'penalties':
            diff = a.totalPenalties - b.totalPenalties || a.penaltiesPerGame - b.penaltiesPerGame;
            break;
          case 'penaltiesPerGame':
            diff = a.penaltiesPerGame - b.penaltiesPerGame || a.totalPenalties - b.totalPenalties;
            break;
          case 'gfPerGame':
            diff = a.gfPerGame - b.gfPerGame || a.gf - b.gf;
            break;
          case 'gaPerGame':
            diff = a.gaPerGame - b.gaPerGame || a.ga - b.ga;
            break;
          case 'rank':
          default:
            diff = a.rank - b.rank;
            break;
        }

        if (diff !== 0) {
          return diff * dir;
        }
        return a.rank - b.rank;
      });
  }, [teams, searchFilter, sortBy, sortDir]);

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/20 text-amber-500 font-black text-xs border border-amber-500/40 shadow-sm" title="1. místo">
          1.
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300/20 text-slate-300 font-black text-xs border border-slate-300/40" title="2. místo">
          2.
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/20 text-amber-600 font-black text-xs border border-amber-700/40" title="3. místo">
          3.
        </span>
      );
    }
    return <span className="font-bold text-muted-foreground">{rank}.</span>;
  };

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-25 group-hover:opacity-70 transition-opacity ml-1 inline-block shrink-0" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-primary ml-1 inline-block shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary ml-1 inline-block shrink-0" />
    );
  };

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
            <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground select-none">
              {viewMode === 'basic' ? (
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    onClick={() => handleSort('rank')}
                    className="w-12 text-center cursor-pointer hover:text-foreground transition-colors group sticky left-0 z-20 bg-muted/95 backdrop-blur-sm"
                  >
                    <span className="inline-flex items-center justify-center">
                      #
                      {renderSortIcon('rank')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('name')}
                    className="min-w-[150px] cursor-pointer hover:text-foreground transition-colors group sticky left-12 z-20 bg-muted/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0"
                  >
                    <span className="inline-flex items-center">
                      Tým
                      {renderSortIcon('name')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('gp')}
                    className="text-center font-bold cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      Z
                      {renderSortIcon('gp')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('w')}
                    className="text-center cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      V
                      {renderSortIcon('w')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('d')}
                    className="text-center cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      R
                      {renderSortIcon('d')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('l')}
                    className="text-center cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      P
                      {renderSortIcon('l')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('diff')}
                    className="text-center min-w-[80px] cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      Skóre
                      {renderSortIcon('diff')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('points')}
                    className="text-center font-black text-primary cursor-pointer hover:opacity-80 transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      B
                      {renderSortIcon('points')}
                    </span>
                  </TableHead>
                  <TableHead className="text-center min-w-[110px] hidden md:table-cell">Forma (posledních 5)</TableHead>
                  <TableHead className="w-8 text-right pr-3"></TableHead>
                </TableRow>
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    onClick={() => handleSort('rank')}
                    className="w-12 text-center cursor-pointer hover:text-foreground transition-colors group sticky left-0 z-20 bg-muted/95 backdrop-blur-sm"
                  >
                    <span className="inline-flex items-center justify-center">
                      #
                      {renderSortIcon('rank')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('name')}
                    className="min-w-[150px] cursor-pointer hover:text-foreground transition-colors group sticky left-12 z-20 bg-muted/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0"
                  >
                    <span className="inline-flex items-center">
                      Tým
                      {renderSortIcon('name')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('gp')}
                    className="text-center font-bold cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      Z
                      {renderSortIcon('gp')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('gfPerGame')}
                    className="text-center cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      G/Z
                      {renderSortIcon('gfPerGame')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('gaPerGame')}
                    className="text-center cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      OG/Z
                      {renderSortIcon('gaPerGame')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('shots')}
                    className="text-center cursor-pointer hover:text-foreground transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      Střely
                      {renderSortIcon('shots')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('shotPct')}
                    className="text-center font-bold text-amber-500 cursor-pointer hover:opacity-80 transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      Úsp. střel %
                      {renderSortIcon('shotPct')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('savePct')}
                    className="text-center font-bold text-blue-500 cursor-pointer hover:opacity-80 transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      Úsp. zákrok %
                      {renderSortIcon('savePct')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('penalties')}
                    className="text-center font-bold text-purple-500 cursor-pointer hover:opacity-80 transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      TM (Fair Play)
                      {renderSortIcon('penalties')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('penaltiesPerGame')}
                    className="text-center font-bold text-purple-500 cursor-pointer hover:opacity-80 transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center">
                      TM / Z
                      {renderSortIcon('penaltiesPerGame')}
                    </span>
                  </TableHead>
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
                          'cursor-pointer transition-colors group',
                          isAces
                            ? 'bg-primary/10 hover:bg-primary/15 font-semibold text-foreground border-l-4 border-l-primary'
                            : 'hover:bg-muted/40'
                        )}
                      >
                        <TableCell className="text-center font-bold text-muted-foreground sticky left-0 z-10 bg-card/95 backdrop-blur-sm">
                          {renderRankBadge(team.rank)}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground sticky left-12 z-10 bg-card/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0">
                          <div className="flex items-center gap-2">
                            <TeamBadge name={team.name} size="sm" />
                            <span className="truncate">{team.name}</span>
                            {isAces && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary font-bold shrink-0">
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
                        'cursor-pointer transition-colors group',
                        isAces
                          ? 'bg-primary/10 hover:bg-primary/15 font-semibold text-foreground border-l-4 border-l-primary'
                          : 'hover:bg-muted/40'
                      )}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground sticky left-0 z-10 bg-card/95 backdrop-blur-sm">
                        {renderRankBadge(sortBy === 'rank' ? team.rank : idx + 1)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground sticky left-12 z-10 bg-card/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0">
                        <div className="flex items-center gap-2">
                          <TeamBadge name={team.name} size="sm" />
                          <span className="truncate">{team.name}</span>
                          {isAces && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary font-bold shrink-0">
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
                        {team.shootingPercentage > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span>{team.shootingPercentage} %</span>
                            <div className="w-12 h-1 bg-muted/60 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (team.shootingPercentage / 25) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-bold text-blue-500">
                        {team.savePercentage > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span>{team.savePercentage} %</span>
                            <div className="w-12 h-1 bg-muted/60 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(10, Math.min(100, ((team.savePercentage - 70) / 28) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
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
