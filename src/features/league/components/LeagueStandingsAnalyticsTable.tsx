'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  bestOffenseTeam?: { name: string; gfPerGame: number } | null;
  bestDefenseTeam?: { name: string; gaPerGame: number } | null;
  mostDisciplinedTeam?: { name: string; penaltiesPerGame: number } | null;
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
  bestOffenseTeam,
  bestDefenseTeam,
  mostDisciplinedTeam,
}: LeagueStandingsAnalyticsTableProps) {
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');
  const [sortBy, setSortBy] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isScrolledRight, setIsScrolledRight] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrolled = el.scrollLeft > 10;
      setIsScrolledRight(scrolled);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, []);

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

  // Sort teams
  const filteredTeams = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;

    return [...teams].sort((a, b) => {
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
  }, [teams, sortBy, sortDir]);

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

        {/* Subheader: Team records & Advanced sort selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {bestOffenseTeam && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 text-[11px]">
                <span className="text-muted-foreground font-semibold">Útok:</span>
                <TeamBadge name={bestOffenseTeam.name} size="xs" />
                <span className="font-bold text-foreground truncate max-w-[90px]">{bestOffenseTeam.name}</span>
                <span className="font-black text-primary tabular-nums">{bestOffenseTeam.gfPerGame} G/Z</span>
              </div>
            )}
            {bestDefenseTeam && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 text-[11px]">
                <span className="text-muted-foreground font-semibold">Obrana:</span>
                <TeamBadge name={bestDefenseTeam.name} size="xs" />
                <span className="font-bold text-foreground truncate max-w-[90px]">{bestDefenseTeam.name}</span>
                <span className="font-black text-blue-500 tabular-nums">{bestDefenseTeam.gaPerGame} OG/Z</span>
              </div>
            )}
            {mostDisciplinedTeam && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 text-[11px]">
                <span className="text-muted-foreground font-semibold">Fair Play:</span>
                <TeamBadge name={mostDisciplinedTeam.name} size="xs" />
                <span className="font-bold text-foreground truncate max-w-[90px]">{mostDisciplinedTeam.name}</span>
                <span className="font-black text-purple-500 tabular-nums">{mostDisciplinedTeam.penaltiesPerGame} TM/Z</span>
              </div>
            )}
          </div>

          {viewMode === 'advanced' && (
            <div className="flex items-center gap-1.5 self-start sm:self-center ml-auto">
              <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                Řadit:
              </span>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortField)}>
                <SelectTrigger className="h-7 text-xs w-[170px] bg-muted/30">
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
        <div className="relative w-full overflow-hidden">
          <Table
            containerRef={tableContainerRef}
            containerClassName="scroll-smooth"
            onScroll={(e) => {
              const scrolled = e.currentTarget.scrollLeft > 10;
              if (scrolled !== isScrolledRight) {
                setIsScrolledRight(scrolled);
              }
            }}
            className="w-full text-xs sm:text-sm"
          >
            <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground select-none">
              {viewMode === 'basic' ? (
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    onClick={() => handleSort('rank')}
                    className="w-10 sm:w-12 text-center cursor-pointer hover:text-foreground transition-colors group sticky left-0 z-20 bg-muted/95 backdrop-blur-sm"
                  >
                    <span className="inline-flex items-center justify-center">
                      #
                      {renderSortIcon('rank')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('name')}
                    className={cn(
                      'cursor-pointer hover:text-foreground transition-all duration-300 ease-in-out group sticky left-10 sm:left-12 z-20 bg-muted/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0',
                      isScrolledRight
                        ? 'w-14 min-w-[56px] max-w-[56px] px-1 text-center shadow-[3px_0_10px_-2px_rgba(0,0,0,0.3)]'
                        : 'min-w-[145px] sm:min-w-[160px] px-3 sm:px-4'
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center",
                      isScrolledRight ? "justify-center w-full gap-0 sm:justify-start sm:gap-1" : "gap-1"
                    )}>
                      <span
                        className={cn(
                          'transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap',
                          isScrolledRight ? 'max-w-0 opacity-0 p-0 m-0 sm:max-w-none sm:opacity-100' : 'max-w-[80px] opacity-100'
                        )}
                      >
                        Tým
                      </span>
                      <span className={cn(
                        'transition-all duration-300',
                        isScrolledRight && 'hidden sm:inline-flex'
                      )}>
                        {renderSortIcon('name')}
                      </span>
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
                    className="w-10 sm:w-12 text-center cursor-pointer hover:text-foreground transition-colors group sticky left-0 z-20 bg-muted/95 backdrop-blur-sm"
                  >
                    <span className="inline-flex items-center justify-center">
                      #
                      {renderSortIcon('rank')}
                    </span>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('name')}
                    className={cn(
                      'cursor-pointer hover:text-foreground transition-all duration-300 ease-in-out group sticky left-10 sm:left-12 z-20 bg-muted/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0',
                      isScrolledRight
                        ? 'w-14 min-w-[56px] max-w-[56px] px-1 text-center shadow-[3px_0_10px_-2px_rgba(0,0,0,0.3)]'
                        : 'min-w-[145px] sm:min-w-[160px] px-3 sm:px-4'
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center",
                      isScrolledRight ? "justify-center w-full gap-0 sm:justify-start sm:gap-1" : "gap-1"
                    )}>
                      <span
                        className={cn(
                          'transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap',
                          isScrolledRight ? 'max-w-0 opacity-0 p-0 m-0 sm:max-w-none sm:opacity-100' : 'max-w-[80px] opacity-100'
                        )}
                      >
                        Tým
                      </span>
                      <span className={cn(
                        'transition-all duration-300',
                        isScrolledRight && 'hidden sm:inline-flex'
                      )}>
                        {renderSortIcon('name')}
                      </span>
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
                        <TableCell className="w-10 sm:w-12 text-center font-bold text-muted-foreground sticky left-0 z-10 bg-card/95 backdrop-blur-sm">
                          {renderRankBadge(team.rank)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'font-semibold text-foreground sticky left-10 sm:left-12 z-10 bg-card/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0 transition-all duration-300 ease-in-out',
                            isScrolledRight
                              ? 'w-14 min-w-[56px] max-w-[56px] px-1 shadow-[3px_0_10px_-2px_rgba(0,0,0,0.3)]'
                              : 'min-w-[145px] sm:min-w-[160px] px-3 sm:px-4'
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center min-w-0 transition-all duration-300",
                              isScrolledRight ? "justify-center gap-0 sm:justify-start sm:gap-2" : "gap-2"
                            )}
                            title={team.name}
                          >
                            <TeamBadge name={team.name} size="sm" />
                            <span
                              className={cn(
                                'truncate transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden inline-block',
                                isScrolledRight
                                  ? 'max-w-0 opacity-0 p-0 m-0 pointer-events-none sm:max-w-[130px] sm:opacity-100 sm:pointer-events-auto'
                                  : 'max-w-[120px] sm:max-w-[130px] opacity-100'
                              )}
                            >
                              {team.name}
                            </span>
                            {isAces && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] h-4 px-1 border-primary/40 text-primary font-bold shrink-0 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden',
                                  isScrolledRight
                                    ? 'max-w-0 opacity-0 p-0 m-0 border-0 pointer-events-none sm:max-w-[50px] sm:opacity-100 sm:px-1 sm:border sm:pointer-events-auto'
                                    : 'max-w-[50px] opacity-100'
                                )}
                              >
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
                      <TableCell className="w-10 sm:w-12 text-center font-bold text-muted-foreground sticky left-0 z-10 bg-card/95 backdrop-blur-sm">
                        {renderRankBadge(sortBy === 'rank' ? team.rank : idx + 1)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'font-semibold text-foreground sticky left-10 sm:left-12 z-10 bg-card/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0 transition-all duration-300 ease-in-out',
                          isScrolledRight
                            ? 'w-14 min-w-[56px] max-w-[56px] px-1 shadow-[3px_0_10px_-2px_rgba(0,0,0,0.3)]'
                            : 'min-w-[145px] sm:min-w-[160px] px-3 sm:px-4'
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center min-w-0 transition-all duration-300",
                            isScrolledRight ? "justify-center gap-0 sm:justify-start sm:gap-2" : "gap-2"
                          )}
                          title={team.name}
                        >
                          <TeamBadge name={team.name} size="sm" />
                          <span
                            className={cn(
                              'truncate transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden inline-block',
                              isScrolledRight
                                ? 'max-w-0 opacity-0 p-0 m-0 pointer-events-none sm:max-w-[130px] sm:opacity-100 sm:pointer-events-auto'
                                : 'max-w-[120px] sm:max-w-[130px] opacity-100'
                            )}
                          >
                            {team.name}
                          </span>
                          {isAces && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] h-4 px-1 border-primary/40 text-primary font-bold shrink-0 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden',
                                isScrolledRight
                                  ? 'max-w-0 opacity-0 p-0 m-0 border-0 pointer-events-none sm:max-w-[50px] sm:opacity-100 sm:px-1 sm:border sm:pointer-events-auto'
                                  : 'max-w-[50px] opacity-100'
                              )}
                            >
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
        {/* Jemný pravý fade gradient jako vizuální indikátor pro posun na mobilu */}
        <div
          className={cn(
            'pointer-events-none absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-card via-card/60 to-transparent transition-opacity duration-300 sm:hidden z-10',
            isScrolledRight ? 'opacity-0' : 'opacity-100'
          )}
        />
      </div>
    </CardContent>
    </Card>
  );
}
