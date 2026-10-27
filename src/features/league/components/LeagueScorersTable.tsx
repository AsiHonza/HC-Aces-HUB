'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Trophy,
  Search,
  ChevronDown,
  Filter,
  Users,
  Flame,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeagueSkaterItem } from '../types';
import { areClubNamesMatching, normalizeClubName } from '../utils/league-analytics';
import { TeamBadge } from './TeamBadge';

interface LeagueScorersTableProps {
  skaters: LeagueSkaterItem[];
  onSelectTeam?: (teamName: string) => void;
}

type SkaterSort = 'rank' | 'points' | 'goals' | 'assists' | 'ppg' | 'gpg' | 'apg' | 'name' | 'club' | 'gamesPlayed';

export function LeagueScorersTable({ skaters, onSelectTeam }: LeagueScorersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SkaterSort>('points');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [displayLimit, setDisplayLimit] = useState<number>(25);

  const handleSort = (field: SkaterSort) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      if (field === 'rank' || field === 'name' || field === 'club') {
        setSortDir('asc');
      } else {
        setSortDir('desc');
      }
    }
  };

  const renderSortIcon = (field: SkaterSort) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-25 group-hover:opacity-70 transition-opacity ml-1 inline-block shrink-0" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-primary ml-1 inline-block shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary ml-1 inline-block shrink-0" />
    );
  };

  // Extract distinct clubs
  const clubs = useMemo(() => {
    const set = new Set<string>();
    for (const s of skaters) {
      if (s.club) set.add(normalizeClubName(s.club));
    }
    return Array.from(set).sort();
  }, [skaters]);

  // Filter and sort skaters
  const filteredSkaters = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;

    return skaters
      .filter((s) => {
        const matchesSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClub = selectedClub === 'all' || areClubNamesMatching(s.club, selectedClub);
        return matchesSearch && matchesClub;
      })
      .sort((a, b) => {
        const aPpg = a.gamesPlayed > 0 ? a.points / a.gamesPlayed : 0;
        const bPpg = b.gamesPlayed > 0 ? b.points / b.gamesPlayed : 0;
        const aGpg = a.gamesPlayed > 0 ? a.goals / a.gamesPlayed : 0;
        const bGpg = b.gamesPlayed > 0 ? b.goals / b.gamesPlayed : 0;
        const aApg = a.gamesPlayed > 0 ? a.assists / a.gamesPlayed : 0;
        const bApg = b.gamesPlayed > 0 ? b.assists / b.gamesPlayed : 0;

        let diff = 0;
        switch (sortBy) {
          case 'name':
            diff = a.name.localeCompare(b.name);
            break;
          case 'club':
            diff = a.club.localeCompare(b.club);
            break;
          case 'gamesPlayed':
            diff = a.gamesPlayed - b.gamesPlayed;
            break;
          case 'goals':
            diff = a.goals - b.goals || a.points - b.points;
            break;
          case 'assists':
            diff = a.assists - b.assists || a.points - b.points;
            break;
          case 'gpg':
            diff = aGpg - bGpg || a.goals - b.goals;
            break;
          case 'apg':
            diff = aApg - bApg || a.assists - b.assists;
            break;
          case 'ppg':
            diff = aPpg - bPpg || a.points - b.points;
            break;
          case 'rank':
            diff = a.rank - b.rank;
            break;
          case 'points':
          default:
            diff = a.points - b.points || a.goals - b.goals || b.gamesPlayed - a.gamesPlayed;
            break;
        }

        if (diff !== 0) {
          return diff * dir;
        }
        return a.rank - b.rank;
      });
  }, [skaters, searchTerm, selectedClub, sortBy, sortDir]);

  const visibleSkaters = useMemo(() => {
    if (displayLimit === 0) return filteredSkaters;
    return filteredSkaters.slice(0, displayLimit);
  }, [filteredSkaters, displayLimit]);

  return (
    <Card className="border-border/70 bg-card/95 w-full min-w-0 overflow-hidden shadow-sm">
      <CardHeader className="py-3.5 px-4 sm:px-6 flex flex-col gap-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-headline">
              <Trophy className="h-5 w-5 text-primary" />
              <span>Statistika všech hráčů ligy</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Kompletní statistiky všech {skaters.length} hráčů soutěže HobbyHokej Brno (kanadské body, góly, asistence a průměry na zápas).
            </p>
          </div>

          {/* Quick sort pill strip */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0 self-start sm:self-center border border-border/60">
            <Button
              type="button"
              size="sm"
              variant={sortBy === 'points' ? 'default' : 'ghost'}
              onClick={() => setSortBy('points')}
              className={cn(
                'h-7 px-2.5 text-xs font-semibold rounded-lg',
                sortBy === 'points' && 'bg-primary text-primary-foreground'
              )}
            >
              <Trophy className="h-3 w-3 mr-1" />
              Body
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sortBy === 'goals' ? 'default' : 'ghost'}
              onClick={() => setSortBy('goals')}
              className={cn(
                'h-7 px-2.5 text-xs font-semibold rounded-lg',
                sortBy === 'goals' && 'bg-primary text-primary-foreground'
              )}
            >
              <Flame className="h-3 w-3 mr-1" />
              Střelci
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sortBy === 'assists' ? 'default' : 'ghost'}
              onClick={() => setSortBy('assists')}
              className={cn(
                'h-7 px-2.5 text-xs font-semibold rounded-lg',
                sortBy === 'assists' && 'bg-primary text-primary-foreground'
              )}
            >
              Asistence
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sortBy === 'ppg' ? 'default' : 'ghost'}
              onClick={() => setSortBy('ppg')}
              className={cn(
                'h-7 px-2.5 text-xs font-semibold rounded-lg',
                sortBy === 'ppg' && 'bg-primary text-primary-foreground'
              )}
            >
              B / Z
            </Button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Hledat hráče podle jména..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30"
              />
            </div>

            <Select value={selectedClub} onValueChange={setSelectedClub}>
              <SelectTrigger className="h-8 text-xs sm:w-[190px] bg-muted/30">
                <SelectValue placeholder="Všechny týmy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny kluby ({skaters.length} hráčů)</SelectItem>
                <SelectItem value="HC Aces" className="font-bold text-primary">
                  ★ HC Aces (Pouze náš tým)
                </SelectItem>
                {clubs
                  .filter((c) => !areClubNamesMatching(c, 'HC Aces'))
                  .map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Display limit switcher */}
          <div className="flex items-center gap-1 text-xs self-start sm:self-center">
            <span className="text-muted-foreground mr-1 text-[11px]">Zobrazit:</span>
            <Button
              type="button"
              size="sm"
              variant={displayLimit === 25 ? 'secondary' : 'ghost'}
              onClick={() => setDisplayLimit(25)}
              className="h-6 px-2 text-[10px] font-semibold"
            >
              Top 25
            </Button>
            <Button
              type="button"
              size="sm"
              variant={displayLimit === 50 ? 'secondary' : 'ghost'}
              onClick={() => setDisplayLimit(50)}
              className="h-6 px-2 text-[10px] font-semibold"
            >
              Top 50
            </Button>
            <Button
              type="button"
              size="sm"
              variant={displayLimit === 0 ? 'secondary' : 'ghost'}
              onClick={() => setDisplayLimit(0)}
              className="h-6 px-2 text-[10px] font-semibold"
            >
              Všech {filteredSkaters.length}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <Table className="w-full text-xs sm:text-sm">
            <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground select-none">
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
                    Hráč
                    {renderSortIcon('name')}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('club')}
                  className="min-w-[120px] cursor-pointer hover:text-foreground transition-colors group"
                >
                  <span className="inline-flex items-center">
                    Klub
                    {renderSortIcon('club')}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('gamesPlayed')}
                  className="text-center font-bold cursor-pointer hover:text-foreground transition-colors group"
                >
                  <span className="inline-flex items-center justify-center">
                    Z
                    {renderSortIcon('gamesPlayed')}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('goals')}
                  className="text-center font-bold text-rose-500 cursor-pointer hover:opacity-80 transition-colors group"
                >
                  <span className="inline-flex items-center justify-center">
                    G
                    {renderSortIcon('goals')}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('assists')}
                  className="text-center font-bold text-blue-500 cursor-pointer hover:opacity-80 transition-colors group"
                >
                  <span className="inline-flex items-center justify-center">
                    A
                    {renderSortIcon('assists')}
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
                <TableHead
                  onClick={() => handleSort('gpg')}
                  className="text-center hidden sm:table-cell cursor-pointer hover:text-foreground transition-colors group"
                >
                  <span className="inline-flex items-center justify-center">
                    G / Z
                    {renderSortIcon('gpg')}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('apg')}
                  className="text-center hidden sm:table-cell cursor-pointer hover:text-foreground transition-colors group"
                >
                  <span className="inline-flex items-center justify-center">
                    A / Z
                    {renderSortIcon('apg')}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('ppg')}
                  className="text-center font-semibold cursor-pointer hover:text-foreground transition-colors group"
                >
                  <span className="inline-flex items-center justify-center">
                    B / Z
                    {renderSortIcon('ppg')}
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleSkaters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground italic text-xs">
                    Nenalezen žádný hráč odpovídající filtrům.
                  </TableCell>
                </TableRow>
              ) : (
                visibleSkaters.map((sk, index) => {
                  const isAces = areClubNamesMatching(sk.club, 'HC Aces');
                  const pPerGame = sk.gamesPlayed > 0 ? (sk.points / sk.gamesPlayed).toFixed(2) : '0.00';
                  const gPerGame = sk.gamesPlayed > 0 ? (sk.goals / sk.gamesPlayed).toFixed(2) : '0.00';
                  const aPerGame = sk.gamesPlayed > 0 ? (sk.assists / sk.gamesPlayed).toFixed(2) : '0.00';
                  const clubNorm = normalizeClubName(sk.club);

                  return (
                    <TableRow
                      key={`${sk.name}-${sk.club}-${index}`}
                      className={cn(
                        'transition-colors',
                        isAces ? 'bg-primary/10 hover:bg-primary/15 font-semibold text-foreground' : 'hover:bg-muted/40'
                      )}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground sticky left-0 z-10 bg-card/95 backdrop-blur-sm">
                        {index + 1}.
                      </TableCell>
                      <TableCell className="font-semibold text-foreground sticky left-12 z-10 bg-card/95 backdrop-blur-sm border-r border-border/40 sm:border-r-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{sk.name}</span>
                          {isAces && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/40 text-primary font-bold shrink-0">
                              ACES
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <TeamBadge name={clubNorm} size="xs" />
                          <button
                            type="button"
                            onClick={() => onSelectTeam?.(clubNorm)}
                            className="hover:underline hover:text-primary transition-colors text-left truncate"
                          >
                            {clubNorm}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {sk.gamesPlayed}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-bold text-rose-500">
                        {sk.goals}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-bold text-blue-500">
                        {sk.assists}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-black text-primary text-sm">
                        {sk.points}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                        {gPerGame}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                        {aPerGame}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-semibold text-foreground">
                        {pPerGame}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Load more / count footer */}
        {displayLimit > 0 && filteredSkaters.length > displayLimit && (
          <div className="p-3 border-t border-border/50 text-center bg-muted/20 flex flex-col sm:flex-row items-center justify-between px-4 gap-2">
            <span className="text-xs text-muted-foreground">
              Zobrazeno {visibleSkaters.length} z celkem {filteredSkaters.length} hráčů
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDisplayLimit((prev) => prev + 25)}
                className="h-7 text-xs font-semibold"
              >
                <span>Dalších 25 hráčů</span>
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDisplayLimit(0)}
                className="h-7 text-xs font-semibold text-primary"
              >
                Zobrazit všechny ({filteredSkaters.length})
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
