'use client';

import React from 'react';
import { Trophy, Activity, RefreshCw, Calendar, Flame, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LeagueAwardsLeadersData } from '../types';

interface LeagueHeaderProps {
  overview: LeagueAwardsLeadersData;
  lastSyncAt?: any;
  isAdmin?: boolean;
  isSyncing?: boolean;
  onSync?: () => void;
}

export function LeagueHeader({
  overview,
  lastSyncAt,
  isAdmin,
  isSyncing = false,
  onSync,
}: LeagueHeaderProps) {
  const syncDate = lastSyncAt?.toDate ? lastSyncAt.toDate() : (lastSyncAt ? new Date(lastSyncAt) : null);
  const syncFormatted = syncDate
    ? syncDate.toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Neznámý';

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-card via-card/90 to-primary/5 border border-border/70 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-[10px] sm:text-xs uppercase tracking-wider">
              HobbyHokej Brno • 2025/2026
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
            <span className="text-xs text-muted-foreground">Aktualizace: {syncFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="h-7 w-7 text-primary shrink-0" />
            Ligové centrum
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Kompletní statistický servis soutěže HobbyHokej – výsledky všech kol, účinnost střelby, tresty, kanadské bodování i profily soupeřů HC Aces.
          </p>
        </div>

        {isAdmin && onSync && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onSync}
              disabled={isSyncing}
              className="h-8 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
              title="Aktualizovat data z webu hobbyhokejbrno.cz"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Synchronizuji...' : 'Aktualizovat ligu'}
            </Button>
          </div>
        )}
      </div>

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Card className="p-3 bg-card/70 border-border/60 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium truncate">Odehráno zápasů</p>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">{overview.totalMatchesPlayed}</p>
          </div>
        </Card>

        <Card className="p-3 bg-card/70 border-border/60 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <Flame className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium truncate">Vstřeleno gólů</p>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">{overview.totalGoalsScored}</p>
          </div>
        </Card>

        <Card className="p-3 bg-card/70 border-border/60 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium truncate">Průměr gólů / zápas</p>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">{overview.averageGoalsPerGame}</p>
          </div>
        </Card>

        <Card className="p-3 bg-card/70 border-border/60 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium truncate">Týmů v soutěži</p>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">9</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
