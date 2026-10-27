'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Swords,
  Flame,
  Shield,
  ArrowRight,
  TrendingUp,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TeamBadge } from '@/features/league';
import {
  calculateTeamAnalytics,
  areClubNamesMatching,
  normalizeClubName,
} from '@/features/league';
import type {
  LeagueStanding,
  LeagueMatchItem,
  LeagueSkaterItem,
  LeagueGoalieItem,
  LeagueFairPlayItem,
  Match,
} from '@/types';

export interface OpponentScoutingWidgetProps {
  opponentName: string;
  allMatches?: Match[];
  leagueStandings?: LeagueStanding[];
  leagueMatches?: LeagueMatchItem[];
  leagueSkaters?: LeagueSkaterItem[];
  leagueGoalies?: LeagueGoalieItem[];
  leagueFairPlay?: LeagueFairPlayItem[];
  className?: string;
  onOpenTeamDetail?: (teamName: string) => void;
}

export function OpponentScoutingWidget({
  opponentName,
  allMatches = [],
  leagueStandings = [],
  leagueMatches = [],
  leagueSkaters = [],
  leagueGoalies = [],
  leagueFairPlay = [],
  className,
  onOpenTeamDetail,
}: OpponentScoutingWidgetProps) {
  const normOpponent = normalizeClubName(opponentName);

  // Don't show scouting card for HC Aces itself or scrimmage / training
  const isAcesOrTraining =
    !normOpponent ||
    areClubNamesMatching(normOpponent, 'HC Aces') ||
    normOpponent.toLowerCase().includes('trénink');

  // Calculate team summaries
  const opponentSummary = useMemo(() => {
    if (isAcesOrTraining || !leagueStandings.length) return null;
    const summaries = calculateTeamAnalytics(
      leagueStandings,
      leagueMatches,
      leagueSkaters,
      leagueGoalies,
      leagueFairPlay
    );
    return summaries.find((s) => areClubNamesMatching(s.name, normOpponent)) || null;
  }, [isAcesOrTraining, normOpponent, leagueStandings, leagueMatches, leagueSkaters, leagueGoalies, leagueFairPlay]);

  // H2H matches in the current season between Aces and this opponent
  const h2hMatches = useMemo(() => {
    if (isAcesOrTraining) return [];
    return allMatches.filter(
      (m) =>
        m.isPlayed &&
        ((areClubNamesMatching(m.team1, 'HC Aces') && areClubNamesMatching(m.team2, normOpponent)) ||
          (areClubNamesMatching(m.team2, 'HC Aces') && areClubNamesMatching(m.team1, normOpponent)))
    );
  }, [isAcesOrTraining, allMatches, normOpponent]);

  if (isAcesOrTraining || (!opponentSummary && h2hMatches.length === 0)) {
    return null;
  }

  let acesWins = 0;
  let draws = 0;
  let oppWins = 0;
  for (const m of h2hMatches) {
    const isAcesTeam1 = areClubNamesMatching(m.team1, 'HC Aces');
    const acesScore = isAcesTeam1 ? (m.team1Score ?? 0) : (m.team2Score ?? 0);
    const oppScore = isAcesTeam1 ? (m.team2Score ?? 0) : (m.team1Score ?? 0);
    if (acesScore > oppScore) acesWins++;
    else if (oppScore > acesScore) oppWins++;
    else draws++;
  }

  // Key player threat from opponent against Aces (goals scored in past mutual matches)
  const threatsAgainstAces = useMemo(() => {
    let pts = 0;
    let goals = 0;
    for (const m of h2hMatches) {
      const isOppTeam1 = areClubNamesMatching(m.team1, normOpponent);
      const detailed = (m as any).detailedScorers || [];
      for (const g of detailed) {
        const isOppGoal = isOppTeam1 ? g.team === 'team1' : g.team === 'team2';
        if (isOppGoal) {
          goals++;
          pts++;
        }
      }
    }
    return { pts, goals };
  }, [h2hMatches, normOpponent]);

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/25 bg-gradient-to-br from-card via-card/95 to-primary/5 p-3.5 sm:p-4 shadow-sm space-y-3 transition-all',
        className
      )}
    >
      {/* Top Header Line */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Vizitka soupeře
          </span>
        </div>

        {opponentSummary ? (
          <Badge
            variant="outline"
            className="text-[11px] font-bold border-primary/30 text-primary bg-primary/10 px-2 py-0.5"
          >
            {opponentSummary.rank}. v tabulce • {opponentSummary.points} bodů
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
            HobbyHokej liga
          </Badge>
        )}
      </div>

      {/* Main Profile Row: Big Logo + Team Name + Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <TeamBadge name={normOpponent} size="lg" />
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-base sm:text-lg text-foreground tracking-tight truncate">
                {normOpponent}
              </h4>
              {opponentSummary && (
                <span className="text-xs text-muted-foreground font-semibold">
                  ({opponentSummary.w}V - {opponentSummary.d}R - {opponentSummary.l}P)
                </span>
              )}
            </div>

            {opponentSummary ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <span>
                  Skóre:{' '}
                  <strong className="text-foreground">
                    {opponentSummary.gf}:{opponentSummary.ga}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Útok: <strong className="text-foreground">{opponentSummary.gfPerGame} G/Z</strong>
                </span>
                <span>•</span>
                <span>
                  Obrana: <strong className="text-foreground">{opponentSummary.gaPerGame} OG/Z</strong>
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Příští ligový soupeř HC Aces
              </p>
            )}
          </div>
        </div>

        {/* Recent Form Pills */}
        {opponentSummary?.form && opponentSummary.form.length > 0 && (
          <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold mr-0.5">Forma:</span>
            {opponentSummary.form.slice(-3).map((f, i) => (
              <Badge
                key={i}
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 border tabular-nums',
                  f.result === 'W' && 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
                  f.result === 'D' && 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                  f.result === 'L' && 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                )}
                title={`${f.result === 'W' ? 'Výhra' : f.result === 'D' ? 'Remíza' : 'Prohra'} ${f.score} vs ${f.opponent} (${f.round}. kolo)`}
              >
                {f.result === 'W' ? 'V' : f.result === 'D' ? 'R' : 'P'} {f.score}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Key Scouting Highlights: Danger Man & Goalie */}
      {opponentSummary && (opponentSummary.topScorer || opponentSummary.primaryGoalie) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
          {/* Top Scorer / Danger Man */}
          {opponentSummary.topScorer && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-card/70 border border-border/60 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Flame className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Klíčový střelec soupeře
                  </span>
                  <span className="font-bold text-foreground truncate block">
                    {opponentSummary.topScorer.name}
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                className="font-bold text-[11px] text-amber-500 border-amber-500/30 bg-amber-500/10 shrink-0 tabular-nums"
              >
                {opponentSummary.topScorer.points} B ({opponentSummary.topScorer.goals}+{opponentSummary.topScorer.assists})
              </Badge>
            </div>
          )}

          {/* Primary Goalie */}
          {opponentSummary.primaryGoalie && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-card/70 border border-border/60 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Brankář soupeře
                  </span>
                  <span className="font-bold text-foreground truncate block">
                    {opponentSummary.primaryGoalie.name}
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                className="font-bold text-[11px] text-blue-500 border-blue-500/30 bg-blue-500/10 shrink-0 tabular-nums"
              >
                {opponentSummary.primaryGoalie.savePercentage.toFixed(1)} % ({opponentSummary.primaryGoalie.gamesPlayed} Z)
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Footer Info: H2H with Aces + Link to League Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Vzájemná bilance v sezóně:</span>
          {h2hMatches.length > 0 ? (
            <span className="font-bold text-foreground">
              <strong className="text-emerald-500">{acesWins}V</strong> -{' '}
              <strong className="text-amber-500">{draws}R</strong> -{' '}
              <strong className="text-rose-500">{oppWins}P</strong>{' '}
              <span className="text-[11px] font-normal text-muted-foreground">({h2hMatches.length} odehráno)</span>
            </span>
          ) : (
            <span className="font-semibold text-foreground italic">V této sezóně první vzájemný zápas</span>
          )}
        </div>

        <Link
          href={`/dashboard/league?tab=standings`}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline transition-all self-end sm:self-auto"
        >
          <span>Kompletní ligové centrum</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
