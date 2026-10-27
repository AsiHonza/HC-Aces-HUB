'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, CheckSquare, ShieldAlert } from 'lucide-react';
import { formatMatchDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { getMatchOpponentName } from '../utils/headToHead';
import { TeamBadge } from '@/features/league';
import type { Match } from '@/types';

export interface AwaitingResultCardProps {
  match: Match;
  isAdmin?: boolean;
  onRecordResult?: (match: Match) => void;
}

export function AwaitingResultCard({
  match,
  isAdmin = false,
  onRecordResult,
}: AwaitingResultCardProps) {
  const opponentName = getMatchOpponentName(match);
  const isAcesHome = !match.team1 || /aces/i.test(match.team1);
  const matchDateLabel = formatMatchDate(match.dateTime || match.date, 'EEEE d. M. yyyy, HH:mm');

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
              <Clock className="mr-1 h-3 w-3 shrink-0" />
              Odehráno • Čeká na oficiální zápis
            </Badge>
            {match.round && (
              <span className="text-xs text-muted-foreground font-semibold">
                {match.round}. kolo
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className={cn("text-base sm:text-lg font-bold font-headline truncate flex items-center gap-2", isAcesHome ? "text-primary font-black" : "text-foreground")}>
              <TeamBadge name={match.team1 || 'HC Aces'} size="sm" />
              <span className="truncate">{match.team1 || 'HC Aces'}</span>
            </div>
            <div className={cn("text-base sm:text-lg font-bold font-headline truncate flex items-center gap-2", !isAcesHome ? "text-primary font-black" : "text-foreground")}>
              <TeamBadge name={match.team2 || opponentName} size="sm" />
              <span className="truncate">{match.team2 || opponentName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{matchDateLabel}</span>
            {match.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                {match.location}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            Utkání je dohráno. Oficiální skóre, brankáři a kanadské bodování se propíší automaticky po synchronizaci zápisu z ligy.
          </p>
        </div>

        {isAdmin && onRecordResult && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRecordResult(match)}
            className="text-xs font-semibold shrink-0 border-amber-500/40 hover:bg-amber-500/10 self-start sm:self-center"
          >
            <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Zapsat výsledek ručně
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
