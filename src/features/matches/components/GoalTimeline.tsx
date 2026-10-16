import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Goal, Disc } from 'lucide-react';
import { cn, formatName } from '@/lib/utils';

export interface GoalItem {
  id?: string;
  minute?: number | null;
  period?: number | string | null;
  scorer?: string | null;
  scorerName?: string | null;
  assist?: string | null;
  assist1Name?: string | null;
  assist2Name?: string | null;
  team?: 'aces' | 'opponent' | string | null;
  teamName?: string | null;
  emptyNet?: boolean;
  isPenaltyShot?: boolean;
}

export interface FallbackScorer {
  goal: string;
  assist?: string | null;
}

export interface GoalTimelineProps {
  goals?: GoalItem[] | null;
  fallbackScorers?: FallbackScorer[] | null;
  usersMap?: Map<string, any>;
  opponentName?: string;
  team1?: string;
  team2?: string;
  title?: string;
  className?: string;
}

export function GoalTimeline({
  goals,
  fallbackScorers,
  usersMap,
  opponentName = 'Soupeř',
  team1,
  team2,
  title = 'Časová osa gólů',
  className,
}: GoalTimelineProps) {
  const hasDetailedGoals = Boolean(goals && goals.length > 0);
  const hasFallbackScorers = Boolean(fallbackScorers && fallbackScorers.length > 0);

  const isTeam1Aces = Boolean(team1 && /aces/i.test(team1));
  const isTeam2Aces = Boolean(team2 && /aces/i.test(team2));

  return (
    <div className={cn("space-y-2 py-1", className)}>
      <div className="flex items-center justify-between border-b pb-1.5 border-border/60">
        <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Goal className="h-4 w-4" /> {title}
        </h4>
        {hasDetailedGoals && (
          <span className="text-[10px] text-muted-foreground font-semibold">
            {goals!.length} {goals!.length === 1 ? 'gól' : goals!.length < 5 ? 'góly' : 'gólů'}
          </span>
        )}
      </div>

      {hasDetailedGoals ? (
        <div className="grid gap-2">
          {goals!.map((g, idx) => {
            const rawTeam = (g.team || '').toLowerCase().trim();
            const rawTeamName = (g.teamName || '').toLowerCase().trim();

            let isAces = false;
            let teamLabel = '';

            if (rawTeamName.includes('aces') || rawTeam.includes('aces')) {
              isAces = true;
              teamLabel = 'HC Aces';
            } else if (rawTeam === 'team1') {
              isAces = isTeam1Aces;
              teamLabel = isTeam1Aces ? 'HC Aces' : (team1 && !/aces/i.test(team1) ? team1 : opponentName);
            } else if (rawTeam === 'team2') {
              isAces = isTeam2Aces;
              teamLabel = isTeam2Aces ? 'HC Aces' : (team2 && !/aces/i.test(team2) ? team2 : opponentName);
            } else if (rawTeam === 'opponent') {
              isAces = false;
              teamLabel = opponentName;
            } else if (g.teamName && !/team[12]/i.test(g.teamName)) {
              isAces = /aces/i.test(g.teamName);
              teamLabel = isAces ? 'HC Aces' : g.teamName;
            } else if (g.team && !/team[12]/i.test(g.team)) {
              isAces = /aces/i.test(g.team);
              teamLabel = isAces ? 'HC Aces' : g.team;
            } else {
              isAces = false;
              teamLabel = opponentName;
            }

            const scorerName = g.scorer || g.scorerName || 'Neznámý střelec';
            const assistName = g.assist || (g.assist1Name ? `${g.assist1Name}${g.assist2Name ? `, ${g.assist2Name}` : ''}` : null);

            return (
              <div
                key={g.id || idx}
                className={cn(
                  "flex items-center justify-between p-2.5 sm:p-3 rounded-lg border text-xs sm:text-sm transition-all",
                  isAces
                    ? "border-l-4 border-l-amber-500 bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/35 shadow-sm"
                    : "border-l-4 border-l-muted-foreground/30 bg-muted/20 border-border/60 opacity-80 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "font-black text-xs px-2 py-0.5 rounded tabular-nums shrink-0",
                      isAces
                        ? "bg-amber-500 text-black font-black shadow-sm"
                        : "bg-muted text-muted-foreground font-semibold border border-border"
                    )}
                  >
                    {g.minute != null ? `${g.minute}'` : '–'}
                  </span>

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] sm:text-[10px] font-black uppercase shrink-0 px-2 py-0.5",
                      isAces
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40"
                        : "bg-muted/70 text-muted-foreground border-border/70"
                    )}
                  >
                    {teamLabel}
                  </Badge>

                  <span
                    className={cn(
                      "truncate",
                      isAces
                        ? "font-extrabold text-foreground text-sm"
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    {scorerName}
                    {g.emptyNet && (
                      <span className="ml-1 text-[10px] text-muted-foreground italic font-normal">
                        (do prázdné)
                      </span>
                    )}
                  </span>

                  {assistName && (
                    <span className="text-muted-foreground text-xs truncate font-normal hidden sm:inline">
                      (asistence: {assistName})
                    </span>
                  )}

                  {g.isPenaltyShot && (
                    <Badge variant="outline" className="text-[8px] border-amber-500/50 text-amber-400 font-bold shrink-0">
                      TS
                    </Badge>
                  )}
                </div>

                <Disc
                  className={cn(
                    "h-4 w-4 shrink-0 ml-2 transition-transform",
                    isAces
                      ? "text-amber-500 fill-amber-500/30"
                      : "text-muted-foreground/25"
                  )}
                />
              </div>
            );
          })}
        </div>
      ) : hasFallbackScorers ? (
        <ul className="space-y-2">
          {fallbackScorers!.map((s, i) => {
            const resolveName = (id?: string | null) => {
              if (!id) return '';
              if (!usersMap) return id;
              const val = usersMap.get(id);
              if (!val) return id;
              return typeof val === 'string' ? val : (val.name || id);
            };
            return (
              <li
                key={i}
                className="flex items-center justify-between text-xs sm:text-sm p-2.5 rounded-lg border-l-4 border-l-amber-500 bg-amber-500/10 border-amber-500/35 border shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase shrink-0 px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40"
                  >
                    HC Aces
                  </Badge>
                  <span className="font-extrabold text-foreground truncate">
                    {formatName(resolveName(s.goal) || 'Neznámý hráč')}
                  </span>
                  {s.assist && (
                    <span className="text-muted-foreground text-xs truncate">
                      (asistence: {formatName(resolveName(s.assist) || '—')})
                    </span>
                  )}
                </div>
                <Disc className="h-4 w-4 text-amber-500 fill-amber-500/30 shrink-0 ml-2" />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs italic py-2">
          Žádné branky nebyly k tomuto utkání zaznamenány.
        </p>
      )}
    </div>
  );
}
