'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeagueMatchItem } from '../types';
import { areClubNamesMatching, normalizeClubName } from '../utils/league-analytics';
import { TeamBadge } from './TeamBadge';

interface LeagueMatchesViewProps {
  matches: LeagueMatchItem[];
  onSelectTeam?: (teamName: string) => void;
}

export function LeagueMatchesView({ matches, onSelectTeam }: LeagueMatchesViewProps) {
  // Extract all distinct rounds
  const rounds = useMemo(() => {
    const set = new Set<number>();
    for (const m of matches) {
      if (m.round && m.round > 0) set.add(m.round);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [matches]);

  // Extract all distinct teams for filter
  const allTeams = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.team1) set.add(normalizeClubName(m.team1));
      if (m.team2) set.add(normalizeClubName(m.team2));
    }
    return Array.from(set).sort();
  }, [matches]);

  // Determine default round: latest round with played matches, or round 1
  const defaultRound = useMemo(() => {
    const played = matches.filter((m) => m.isPlayed && m.round > 0).sort((a, b) => b.round - a.round);
    if (played.length > 0) return played[0].round;
    return rounds[0] || 1;
  }, [matches, rounds]);

  const [selectedRound, setSelectedRound] = useState<number | 'all'>(defaultRound);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'played' | 'upcoming'>('all');
  const [expandedMatchKey, setExpandedMatchKey] = useState<string | null>(null);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Round filter
      if (selectedRound !== 'all' && m.round !== selectedRound) {
        return false;
      }

      // Team filter
      if (selectedTeamFilter !== 'all') {
        const matchesTeam =
          areClubNamesMatching(m.team1, selectedTeamFilter) ||
          areClubNamesMatching(m.team2, selectedTeamFilter);
        if (!matchesTeam) return false;
      }

      // Status filter
      if (statusFilter === 'played' && !m.isPlayed) return false;
      if (statusFilter === 'upcoming' && m.isPlayed) return false;

      return true;
    });
  }, [matches, selectedRound, selectedTeamFilter, statusFilter]);

  const toggleExpand = (key: string) => {
    setExpandedMatchKey((prev) => (prev === key ? null : key));
  };

  const handleTeamFilterChange = (teamName: string) => {
    setSelectedTeamFilter(teamName);
    if (teamName !== 'all') {
      setSelectedRound('all');
    }
  };

  return (
    <Card className="border-border/70 bg-card/95 w-full min-w-0 overflow-hidden shadow-sm">
      <CardHeader className="py-3.5 px-4 sm:px-6 flex flex-col gap-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-headline">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span>Zápasy & Výsledky kol</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Rozpis ligy, podrobné výsledky, třetinové stavy, poměr střel a zápisy střelců.
            </p>
          </div>

          {/* Quick Team and Status Filters */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <Select value={selectedTeamFilter} onValueChange={handleTeamFilterChange}>
              <SelectTrigger className="h-8 text-xs w-[150px] bg-muted/30">
                <SelectValue placeholder="Výběr týmu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny týmy</SelectItem>
                <SelectItem value="HC Aces" className="font-bold text-primary">
                  ★ HC Aces (Pouze náš tým)
                </SelectItem>
                {allTeams
                  .filter((t) => !areClubNamesMatching(t, 'HC Aces'))
                  .map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-muted/30">
                <SelectValue placeholder="Stav" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny zápasy</SelectItem>
                <SelectItem value="played">Pouze odehrané</SelectItem>
                <SelectItem value="upcoming">Pouze nadcházející</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Round selector scrollable strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <Button
            type="button"
            size="sm"
            variant={selectedRound === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedRound('all')}
            className={cn(
              'h-7 px-3 text-xs font-semibold shrink-0 rounded-lg',
              selectedRound === 'all' && 'bg-primary text-primary-foreground shadow-sm'
            )}
          >
            Všechna kola ({matches.length})
          </Button>

          {rounds.map((r) => {
            const isCurrent = r === selectedRound;
            const roundMatchesCount = matches.filter((m) => m.round === r && m.isPlayed).length;
            const isFullyPlayed =
              roundMatchesCount > 0 && matches.filter((m) => m.round === r && !m.isPlayed).length === 0;

            return (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={isCurrent ? 'default' : 'outline'}
                onClick={() => setSelectedRound(r)}
                className={cn(
                  'h-7 px-3 text-xs font-semibold shrink-0 rounded-lg',
                  isCurrent && 'bg-primary text-primary-foreground shadow-sm',
                  !isCurrent && isFullyPlayed && 'border-border/80 bg-muted/20 text-muted-foreground'
                )}
              >
                {r}. kolo
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {filteredMatches.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground italic text-xs">
            Pro zvolené filtry nebyly nalezeny žádné zápasy.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMatches.map((m, index) => {
              const matchKey = `${m.round}-${m.team1}-${m.team2}-${index}`;
              const isExpanded = expandedMatchKey === matchKey;
              const isAcesGame =
                areClubNamesMatching(m.team1, 'HC Aces') || areClubNamesMatching(m.team2, 'HC Aces');
              const t1Norm = normalizeClubName(m.team1);
              const t2Norm = normalizeClubName(m.team2);

              const hasPeriodScores = Boolean(m.periods);
              const periodsStr = Array.isArray(m.periods) ? m.periods.join(', ') : m.periods;
              const hasShots = m.shots1 != null && m.shots2 != null;
              const hasPenalties = m.penalties1 != null && m.penalties2 != null;
              const hasGoalsDetail = m.goals && m.goals.length > 0;
              const team1Skaters = m.lineup1 || m.team1Lineup?.skaters || [];
              const team2Skaters = m.lineup2 || m.team2Lineup?.skaters || [];
              const hasLineups = team1Skaters.length > 0 || team2Skaters.length > 0;
              const arenaName = m.arena || m.location;

              return (
                <div
                  key={matchKey}
                  className={cn(
                    'rounded-2xl border transition-all duration-200 overflow-hidden bg-card/80',
                    isAcesGame
                      ? 'border-primary/50 shadow-sm bg-gradient-to-br from-card via-card to-primary/5'
                      : 'border-border/60 hover:border-border'
                  )}
                >
                  {/* Match Card Top Info */}
                  <div className="flex items-center justify-between px-3.5 py-2 bg-muted/30 border-b border-border/40 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock className="h-3 w-3 shrink-0 text-primary" />
                      <span className="font-bold text-foreground">{m.round}. kolo</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">{m.dateStr || 'Datum neznámé'}</span>
                      {m.timeStr && <span>({m.timeStr})</span>}
                    </div>
                    {arenaName && (
                      <div className="flex items-center gap-1 shrink-0 truncate max-w-[140px]" title={arenaName}>
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{arenaName}</span>
                      </div>
                    )}
                  </div>

                  {/* Main Scoreboard */}
                  <div className="p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      {/* Team 1 (Home) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <TeamBadge name={t1Norm} size="md" />
                          <button
                            type="button"
                            onClick={() => onSelectTeam?.(t1Norm)}
                            className={cn(
                              'font-bold text-sm sm:text-base truncate block text-left hover:text-primary transition-colors',
                              areClubNamesMatching(t1Norm, 'HC Aces') ? 'text-primary font-black' : 'text-foreground'
                            )}
                            title={t1Norm}
                          >
                            {t1Norm}
                          </button>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium pl-7 sm:pl-8 block">Domácí</span>
                      </div>

                      {/* Score */}
                      <div className="shrink-0 text-center px-2">
                        {m.isPlayed ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground">
                              {m.score1} : {m.score2}
                            </span>
                            {hasPeriodScores && (
                              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                ({periodsStr})
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                            Neodehráno
                          </Badge>
                        )}
                      </div>

                      {/* Team 2 (Away) */}
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectTeam?.(t2Norm)}
                            className={cn(
                              'font-bold text-sm sm:text-base truncate block text-right hover:text-primary transition-colors',
                              areClubNamesMatching(t2Norm, 'HC Aces') ? 'text-primary font-black' : 'text-foreground'
                            )}
                            title={t2Norm}
                          >
                            {t2Norm}
                          </button>
                          <TeamBadge name={t2Norm} size="md" />
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium pr-7 sm:pr-8 block">Hosté</span>
                      </div>
                    </div>

                    {/* Secondary Metrics: Shots & Penalties */}
                    {m.isPlayed && (hasShots || hasPenalties) && (
                      <div className="flex items-center justify-around pt-2 border-t border-border/40 text-[11px]">
                        {hasShots && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Target className="h-3 w-3 text-amber-500" />
                            <span className="font-semibold text-foreground">Střely:</span>
                            <span className="font-mono tabular-nums text-foreground">
                              {m.shots1} : {m.shots2}
                            </span>
                          </div>
                        )}
                        {hasPenalties && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <AlertTriangle className="h-3 w-3 text-purple-500" />
                            <span className="font-semibold text-foreground">Vyloučení:</span>
                            <span className="font-mono tabular-nums text-foreground">
                              {m.penalties1} : {m.penalties2}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expandable Game Sheet Button */}
                    {(hasGoalsDetail || hasLineups) && (
                      <div className="pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(matchKey)}
                          className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                        >
                          <span>{isExpanded ? 'Skrýt detail utkání' : 'Zobrazit střelce a zápis'}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>
                    )}

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="pt-2.5 border-t border-border/40 space-y-2.5 text-xs animate-in fade-in-50 duration-200">
                        {hasGoalsDetail && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              Branky a asistence
                            </p>
                            <div className="space-y-1">
                              {m.goals?.map((g, gi) => {
                                const goalTime = g.minute ? `${g.minute}. min` : g.time;
                                const goalAssist = g.assist || (g.assists && g.assists.length > 0 ? g.assists.join(', ') : null);

                                return (
                                  <div
                                    key={gi}
                                    className="flex items-center justify-between p-1.5 rounded bg-muted/30 text-[11px]"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {goalTime && (
                                        <span className="font-mono font-bold text-muted-foreground w-12 shrink-0">
                                          {goalTime}
                                        </span>
                                      )}
                                      <span className="font-semibold text-foreground truncate">{g.scorer}</span>
                                      {goalAssist && (
                                        <span className="text-muted-foreground truncate">
                                          (as. {goalAssist})
                                        </span>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0 font-medium">
                                      {g.teamName || g.team}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Lineups */}
                        {hasLineups && (
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-1">
                            <div>
                              <p className="font-bold text-foreground mb-0.5">{t1Norm}</p>
                              <p className="line-clamp-3">{team1Skaters.join(', ') || 'Není k dispozici'}</p>
                            </div>
                            <div>
                              <p className="font-bold text-foreground mb-0.5">{t2Norm}</p>
                              <p className="line-clamp-3">{team2Skaters.join(', ') || 'Není k dispozici'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
