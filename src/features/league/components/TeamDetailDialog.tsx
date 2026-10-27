'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trophy,
  Target,
  Shield,
  AlertTriangle,
  Swords,
  Flame,
  UserCheck,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TeamAnalyticsSummary,
  LeagueMatchItem,
  LeagueSkaterItem,
  LeagueGoalieItem,
  LeagueStanding,
} from '../types';
import {
  areClubNamesMatching,
  calculateHeadToHeadComparison,
  normalizeClubName,
} from '../utils/league-analytics';
import { TeamBadge } from './TeamBadge';
import { LeaguePlayerDetailDialog } from './LeaguePlayerDetailDialog';

interface TeamDetailDialogProps {
  team: TeamAnalyticsSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMatches?: LeagueMatchItem[];
  allSkaters?: LeagueSkaterItem[];
  allGoalies?: LeagueGoalieItem[];
  allTeams?: TeamAnalyticsSummary[];
  allStandings?: LeagueStanding[];
}

export function TeamDetailDialog({
  team,
  open,
  onOpenChange,
  allMatches = [],
  allSkaters = [],
  allGoalies = [],
  allTeams = [],
  allStandings = [],
}: TeamDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'scouting'>('overview');
  const [selectedOpponentName, setSelectedOpponentName] = useState<string>('');
  const [selectedSkater, setSelectedSkater] = useState<LeagueSkaterItem | null>(null);
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState<boolean>(false);

  // Find HC Aces team summary
  const acesTeam = useMemo(
    () => allTeams.find((t) => areClubNamesMatching(t.name, 'HC Aces')) || null,
    [allTeams]
  );

  const isAces = team ? areClubNamesMatching(team.name, 'HC Aces') : false;

  // For HC Aces, allow picking an opponent to compare with
  const opponentOptions = useMemo(
    () => allTeams.filter((t) => !areClubNamesMatching(t.name, 'HC Aces')),
    [allTeams]
  );

  // Determine which team to compare against
  const comparisonOpponent = useMemo(() => {
    if (!team) return null;
    if (!isAces) return team;
    if (selectedOpponentName) {
      return allTeams.find((t) => areClubNamesMatching(t.name, selectedOpponentName)) || opponentOptions[0] || null;
    }
    return opponentOptions[0] || null;
  }, [team, isAces, selectedOpponentName, allTeams, opponentOptions]);

  // Head to Head stats
  const h2h = useMemo(() => {
    if (!acesTeam || !comparisonOpponent) return null;
    return calculateHeadToHeadComparison(acesTeam, comparisonOpponent, allMatches);
  }, [acesTeam, comparisonOpponent, allMatches]);

  if (!team) return null;

  // Team players
  const teamSkaters = allSkaters
    .filter((sk) => areClubNamesMatching(sk.club, team.name))
    .sort((a, b) => b.points - a.points || b.goals - a.goals)
    .slice(0, 8);

  const teamGoalies = allGoalies
    .filter((g) => areClubNamesMatching(g.club, team.name))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.savePercentage - a.savePercentage);

  // Opponent key threat against Aces (player with most points against Aces)
  const opponentThreats = !isAces
    ? allSkaters
        .filter((sk) => areClubNamesMatching(sk.club, team.name))
        .map((sk) => {
          let ptsAgainstAces = 0;
          let goalsAgainstAces = 0;
          for (const m of allMatches) {
            if (
              m.isPlayed &&
              ((areClubNamesMatching(m.team1, team.name) && areClubNamesMatching(m.team2, 'HC Aces')) ||
                (areClubNamesMatching(m.team2, team.name) && areClubNamesMatching(m.team1, 'HC Aces')))
            ) {
              const isTeam1 = areClubNamesMatching(m.team1, team.name);
              for (const g of m.goals || []) {
                const goalByThisTeam = isTeam1 ? g.team === 'team1' : g.team === 'team2';
                if (!goalByThisTeam) continue;
                if (g.scorer && g.scorer.toLowerCase().includes(sk.name.split(' ')[0].toLowerCase())) {
                  goalsAgainstAces++;
                  ptsAgainstAces++;
                } else if (g.assist && g.assist.toLowerCase().includes(sk.name.split(' ')[0].toLowerCase())) {
                  ptsAgainstAces++;
                }
              }
            }
          }
          return { skater: sk, ptsAgainstAces, goalsAgainstAces };
        })
        .filter((t) => t.ptsAgainstAces > 0)
        .sort((a, b) => b.ptsAgainstAces - a.ptsAgainstAces)
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isAces ? 'default' : 'outline'}
                className={cn(
                  'font-bold text-xs',
                  isAces && 'bg-primary text-primary-foreground shadow-sm'
                )}
              >
                {team.rank}. místo • {team.points} bodů
              </Badge>
              {isAces ? (
                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                  Náš tým
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Soupeř
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black font-headline tracking-tight flex items-center gap-2.5">
              <TeamBadge name={team.name} size="md" />
              <span>{team.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kompletní analytický profil, forma a vzájemný scouting v sezóně 2025/2026
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4 pt-1">
            <TabsList className="grid grid-cols-2 w-full h-10 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger
                value="overview"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Profil týmu
              </TabsTrigger>
              <TabsTrigger
                value="scouting"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <Swords className="h-3.5 w-3.5" />
                <span>Tale of the Tape ({isAces ? 'vs Soupeř' : 'vs Aces'})</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TEAM OVERVIEW */}
            <TabsContent value="overview" className="space-y-5 focus-visible:outline-none">
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Card className="p-3 bg-card/60 border-border/70 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Bilance (V-R-P)</p>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {team.w} - {team.d} - {team.l}
                  </p>
                  <p className="text-[10px] text-muted-foreground">z {team.gp} zápasů</p>
                </Card>

                <Card className="p-3 bg-card/60 border-border/70 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Skóre (Rozdíl)</p>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {team.gf}:{team.ga}
                  </p>
                  <p
                    className={cn(
                      'text-[10px] font-bold',
                      team.diff > 0 ? 'text-emerald-500' : team.diff < 0 ? 'text-rose-500' : 'text-muted-foreground'
                    )}
                  >
                    {team.diff > 0 ? `+${team.diff}` : team.diff}
                  </p>
                </Card>

                <Card className="p-3 bg-card/60 border-border/70 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Target className="h-3 w-3 text-amber-500" />
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Úspěšnost střel</p>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-amber-500">
                    {team.hasShotsTracked ? `${team.shootingPercentage} %` : '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {team.hasShotsTracked ? `${team.totalShots} střel` : 'nestatistikováno'}
                  </p>
                </Card>

                <Card className="p-3 bg-card/60 border-border/70 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-purple-500" />
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vyloučení / Z</p>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {team.penaltiesPerGame}
                  </p>
                  <p className="text-[10px] text-muted-foreground">celkem {team.totalPenalties} TM</p>
                </Card>
              </div>

              {/* Form matches */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Poslední odehraná utkání (Forma)</span>
                </h4>
                {team.form.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Zatím neodehráli žádný zápas.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {team.form.map((f, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col items-center justify-center text-center gap-1"
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5',
                            f.result === 'W' && 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
                            f.result === 'D' && 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                            f.result === 'L' && 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                          )}
                        >
                          {f.result === 'W' ? 'Výhra' : f.result === 'D' ? 'Remíza' : 'Prohra'}
                        </Badge>
                        <span className="text-sm font-black text-foreground">{f.score}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-full" title={f.opponent}>
                          {f.isHome ? 'vs ' : '@ '}
                          {f.opponent}
                        </span>
                        <span className="text-[9px] text-muted-foreground/80">{f.round}. kolo</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Players & Goalies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Skaters */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-primary" />
                    <span>Nejproduktivnější hráči týmu</span>
                    <span className="text-[10px] text-muted-foreground font-normal">(klikněte pro kartu hráče)</span>
                  </h4>
                  {teamSkaters.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Žádné záznamy o hráčích.</p>
                  ) : (
                    <div className="space-y-1 text-xs">
                      {teamSkaters.map((sk, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedSkater(sk);
                            setIsPlayerDialogOpen(true);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/40 hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] font-bold text-muted-foreground w-4">{idx + 1}.</span>
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {sk.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums shrink-0">
                            <span className="text-muted-foreground text-[11px]">{sk.goals}G + {sk.assists}A</span>
                            <Badge variant="outline" className="font-bold text-[11px] h-5 px-1.5 group-hover:border-primary/50">
                              {sk.points} B
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Goalies */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                    <span>Brankáři týmu</span>
                  </h4>
                  {teamGoalies.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Žádní evidovaní brankáři.</p>
                  ) : (
                    <div className="space-y-1 text-xs">
                      {teamGoalies.map((g, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/40 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] font-bold text-muted-foreground w-4">{idx + 1}.</span>
                            <span className="font-semibold text-foreground truncate">{g.name}</span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums shrink-0">
                            <span className="text-muted-foreground text-[11px]">{g.gamesPlayed} Z • {g.goalsAgainst} OG</span>
                            <Badge variant="secondary" className="font-bold text-[11px] h-5 px-1.5 text-blue-500 bg-blue-500/10">
                              {g.savePercentage.toFixed(1)} %
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: TALE OF THE TAPE & SCOUTING */}
            <TabsContent value="scouting" className="space-y-5 focus-visible:outline-none">
              {/* If viewing HC Aces, allow picking an opponent */}
              {isAces && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/60">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Vyberte soupeře pro porovnání:</p>
                    <p className="text-[11px] text-muted-foreground">Srovnání statistik HC Aces vs vybraný tým</p>
                  </div>
                  <Select
                    value={comparisonOpponent?.name || ''}
                    onValueChange={(val) => setSelectedOpponentName(val)}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs font-semibold">
                      <SelectValue placeholder="Vyberte soupeře" />
                    </SelectTrigger>
                    <SelectContent>
                      {opponentOptions.map((opt) => (
                        <SelectItem key={opt.name} value={opt.name} className="text-xs font-medium">
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {acesTeam && comparisonOpponent && (
                <>
                  {/* Tale of the Tape Header */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-4">
                    <div className="flex items-center justify-between px-2">
                      {/* HC Aces Side */}
                      <div className="flex items-center gap-2.5">
                        <TeamBadge name="HC Aces" size="md" />
                        <div>
                          <p className="text-xs sm:text-sm font-black text-foreground">HC Aces</p>
                          <p className="text-[11px] text-primary font-bold">{acesTeam.rank}. v lize • {acesTeam.points} B</p>
                        </div>
                      </div>

                      <div className="text-center px-2">
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-card">
                          Tale of the Tape
                        </Badge>
                      </div>

                      {/* Opponent Side */}
                      <div className="flex items-center gap-2.5 flex-row-reverse text-right">
                        <TeamBadge name={comparisonOpponent.name} size="md" />
                        <div>
                          <p className="text-xs sm:text-sm font-black text-foreground">{comparisonOpponent.name}</p>
                          <p className="text-[11px] text-muted-foreground font-bold">{comparisonOpponent.rank}. v lize • {comparisonOpponent.points} B</p>
                        </div>
                      </div>
                    </div>

                    {/* Comparison Bars */}
                    <div className="space-y-3 pt-2 border-t border-border/50 text-xs">
                      {/* GF per game */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1 font-bold">
                          <span className={cn(acesTeam.gfPerGame >= comparisonOpponent.gfPerGame ? 'text-primary' : 'text-muted-foreground')}>
                            {acesTeam.gfPerGame} G/Z
                          </span>
                          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Útok (Góly na zápas)</span>
                          <span className={cn(comparisonOpponent.gfPerGame >= acesTeam.gfPerGame ? 'text-foreground' : 'text-muted-foreground')}>
                            {comparisonOpponent.gfPerGame} G/Z
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 h-2">
                          <div className="flex justify-end bg-muted/40 rounded-l overflow-hidden">
                            <div
                              className="bg-primary rounded-l transition-all"
                              style={{ width: `${Math.min(100, (acesTeam.gfPerGame / 10) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-start bg-muted/40 rounded-r overflow-hidden">
                            <div
                              className="bg-foreground/60 rounded-r transition-all"
                              style={{ width: `${Math.min(100, (comparisonOpponent.gfPerGame / 10) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* GA per game (lower is better!) */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1 font-bold">
                          <span className={cn(acesTeam.gaPerGame <= comparisonOpponent.gaPerGame ? 'text-primary' : 'text-muted-foreground')}>
                            {acesTeam.gaPerGame} OG/Z
                          </span>
                          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Obrana (Inkasované góly)</span>
                          <span className={cn(comparisonOpponent.gaPerGame <= acesTeam.gaPerGame ? 'text-foreground' : 'text-muted-foreground')}>
                            {comparisonOpponent.gaPerGame} OG/Z
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 h-2">
                          <div className="flex justify-end bg-muted/40 rounded-l overflow-hidden">
                            <div
                              className="bg-primary rounded-l transition-all"
                              style={{ width: `${Math.min(100, (acesTeam.gaPerGame / 10) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-start bg-muted/40 rounded-r overflow-hidden">
                            <div
                              className="bg-foreground/60 rounded-r transition-all"
                              style={{ width: `${Math.min(100, (comparisonOpponent.gaPerGame / 10) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Shooting % */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1 font-bold">
                          <span className={cn(acesTeam.shootingPercentage >= comparisonOpponent.shootingPercentage ? 'text-amber-500' : 'text-muted-foreground')}>
                            {acesTeam.hasShotsTracked ? `${acesTeam.shootingPercentage} %` : '—'}
                          </span>
                          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Úspěšnost střelby</span>
                          <span className={cn(comparisonOpponent.shootingPercentage >= acesTeam.shootingPercentage ? 'text-amber-500' : 'text-muted-foreground')}>
                            {comparisonOpponent.hasShotsTracked ? `${comparisonOpponent.shootingPercentage} %` : '—'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 h-2">
                          <div className="flex justify-end bg-muted/40 rounded-l overflow-hidden">
                            <div
                              className="bg-amber-500 rounded-l transition-all"
                              style={{ width: `${Math.min(100, acesTeam.shootingPercentage * 2.5)}%` }}
                            />
                          </div>
                          <div className="flex justify-start bg-muted/40 rounded-r overflow-hidden">
                            <div
                              className="bg-amber-500/60 rounded-r transition-all"
                              style={{ width: `${Math.min(100, comparisonOpponent.shootingPercentage * 2.5)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save % */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1 font-bold">
                          <span className={cn(acesTeam.savePercentage >= comparisonOpponent.savePercentage ? 'text-blue-500' : 'text-muted-foreground')}>
                            {acesTeam.hasShotsTracked ? `${acesTeam.savePercentage} %` : '—'}
                          </span>
                          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Úspěšnost brankářů</span>
                          <span className={cn(comparisonOpponent.savePercentage >= acesTeam.savePercentage ? 'text-blue-500' : 'text-muted-foreground')}>
                            {comparisonOpponent.hasShotsTracked ? `${comparisonOpponent.savePercentage} %` : '—'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 h-2">
                          <div className="flex justify-end bg-muted/40 rounded-l overflow-hidden">
                            <div
                              className="bg-blue-500 rounded-l transition-all"
                              style={{ width: `${Math.max(0, (acesTeam.savePercentage - 70) * 3.33)}%` }}
                            />
                          </div>
                          <div className="flex justify-start bg-muted/40 rounded-r overflow-hidden">
                            <div
                              className="bg-blue-500/60 rounded-r transition-all"
                              style={{ width: `${Math.max(0, (comparisonOpponent.savePercentage - 70) * 3.33)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Penalties per game (lower is better!) */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1 font-bold">
                          <span className={cn(acesTeam.penaltiesPerGame <= comparisonOpponent.penaltiesPerGame ? 'text-emerald-500' : 'text-muted-foreground')}>
                            {acesTeam.penaltiesPerGame} TM/Z
                          </span>
                          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Disciplína (Tresty)</span>
                          <span className={cn(comparisonOpponent.penaltiesPerGame <= acesTeam.penaltiesPerGame ? 'text-emerald-500' : 'text-muted-foreground')}>
                            {comparisonOpponent.penaltiesPerGame} TM/Z
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 h-2">
                          <div className="flex justify-end bg-muted/40 rounded-l overflow-hidden">
                            <div
                              className="bg-purple-500 rounded-l transition-all"
                              style={{ width: `${Math.min(100, (acesTeam.penaltiesPerGame / 12) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-start bg-muted/40 rounded-r overflow-hidden">
                            <div
                              className="bg-purple-500/60 rounded-r transition-all"
                              style={{ width: `${Math.min(100, (comparisonOpponent.penaltiesPerGame / 12) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Head to Head Matches in Season */}
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Swords className="h-3.5 w-3.5" />
                        <span>Vzájemné zápasy v sezóně</span>
                      </h4>
                      {h2h && (
                        <span className="text-xs font-bold text-foreground">
                          {h2h.winsA}V - {h2h.draws}R - {h2h.winsB}P (z pohledu Aces)
                        </span>
                      )}
                    </div>
                    {h2h?.matches.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">V této sezóně spolu týmy ještě nehrály.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {h2h?.matches.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-card/70 p-2.5 rounded-lg border border-border/50"
                          >
                            <span className="text-muted-foreground font-medium">
                              {m.round}. kolo ({m.dateStr || 'termín'})
                            </span>
                            <div className="font-bold text-foreground">
                              {m.team1} <span className="text-primary">{m.score1}:{m.score2}</span> {m.team2}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scouting threats against Aces */}
                  {!isAces && opponentThreats.length > 0 && (
                    <div className="space-y-2 p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/25">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Klíčoví střelci soupeře proti Aces</span>
                      </h4>
                      <div className="space-y-1">
                        {opponentThreats.map((t, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedSkater(t.skater);
                              setIsPlayerDialogOpen(true);
                            }}
                            className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          >
                            <span className="text-xs font-semibold text-foreground">{t.skater.name}</span>
                            <Badge variant="destructive" className="text-[11px] font-bold bg-rose-500/15 text-rose-500 border-rose-500/30">
                              {t.ptsAgainstAces} B ({t.goalsAgainstAces} G) proti Aces
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Embedded Player Detail Dialog for deep dives */}
      <LeaguePlayerDetailDialog
        skater={selectedSkater}
        open={isPlayerDialogOpen}
        onOpenChange={setIsPlayerDialogOpen}
        allMatches={allMatches}
        allStandings={allStandings}
        allSkaters={allSkaters}
      />
    </>
  );
}
