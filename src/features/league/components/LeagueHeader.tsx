'use client';

import React from 'react';
import {
  Trophy,
  Activity,
  RefreshCw,
  Calendar,
  Flame,
  Shield,
  History,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { LeagueAwardsLeadersData } from '../types';

interface LeagueHeaderProps {
  overview: LeagueAwardsLeadersData;
  lastSyncAt?: any;
  isAdmin?: boolean;
  isSyncing?: boolean;
  onSync?: () => void;
  selectedSeasonId?: string;
  onSelectSeasonId?: (seasonId: string) => void;
  archivedSeasons?: Array<{ id: string; name: string; year: string }> | null;
  onOpenArchiveDialog?: () => void;
  currentSeasonName?: string;
}

export function LeagueHeader({
  overview,
  lastSyncAt,
  isAdmin,
  isSyncing = false,
  onSync,
  selectedSeasonId = 'current',
  onSelectSeasonId,
  archivedSeasons,
  onOpenArchiveDialog,
  currentSeasonName,
}: LeagueHeaderProps) {
  const syncDate = lastSyncAt?.toDate ? lastSyncAt.toDate() : (lastSyncAt ? new Date(lastSyncAt) : null);
  const syncFormatted = syncDate
    ? syncDate.toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Neznámý';

  const isCurrent = selectedSeasonId === 'current';
  const isUpcoming = selectedSeasonId === 'upcoming';
  const archived = archivedSeasons?.find((s) => s.id === selectedSeasonId);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/75 bg-gradient-to-br from-card via-card to-primary/[0.06] p-4 sm:p-5 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.35)] space-y-4">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-60 rounded-full bg-primary/10 blur-3xl" />

      {/* Top Banner */}
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                'font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg',
                isCurrent && 'border-primary/40 bg-primary/10 text-primary',
                isUpcoming && 'border-blue-500/40 bg-blue-500/10 text-blue-500',
                archived && 'border-amber-500/40 bg-amber-500/10 text-amber-500'
              )}
            >
              {isCurrent && (currentSeasonName || 'HobbyHokej • 2025/2026')}
              {isUpcoming && 'Nadcházející sezóna • 2026/2027'}
              {archived && `Archivovaná sezóna • ${archived.name} (${archived.year})`}
            </Badge>

            {isCurrent && (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                <span className="text-xs text-muted-foreground">Aktualizace: {syncFormatted}</span>
              </>
            )}
            {archived && (
              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                Archivováno
              </Badge>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black font-headline tracking-tight text-foreground flex items-center gap-2.5 pt-0.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
              <Trophy className="h-5 w-5" />
            </div>
            Ligové centrum
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Kompletní statistický servis soutěže HobbyHokej – výsledky všech kol, účinnost střelby, tresty, kanadské bodování i profily soupeřů HC Aces.
          </p>
        </div>

        {/* Season Selector Dropdown & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
          {onSelectSeasonId && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:inline" />
              <Select value={selectedSeasonId} onValueChange={onSelectSeasonId}>
                <SelectTrigger className="h-8 w-[190px] sm:w-[210px] text-xs font-semibold rounded-xl bg-background/80 border-border/70 shadow-sm">
                  <SelectValue placeholder="Výběr sezóny" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="current" className="font-bold">
                    ★ Nynější sezóna (2025/2026)
                  </SelectItem>
                  <SelectItem value="upcoming">
                    📅 Nadcházející sezóna (2026/2027)
                  </SelectItem>
                  {archivedSeasons && archivedSeasons.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Archivované ročníky
                      </div>
                      {archivedSeasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          🏆 {s.name} ({s.year})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sync Button (current season only) */}
          {isAdmin && onSync && isCurrent && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSync}
              disabled={isSyncing}
              className="h-8 rounded-xl text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
              title="Aktualizovat data z webu hobbyhokejbrno.cz"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Synchronizuji...' : 'Aktualizovat ligu'}
            </Button>
          )}

          {/* Archive Season Button (Admin & current season only) */}
          {isAdmin && onOpenArchiveDialog && isCurrent && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenArchiveDialog}
              className="h-8 rounded-xl text-xs font-semibold border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
              title="Ukončit aktuální sezónu a uložit její kompletní data do archivu"
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              Ukončit & Archivovat
            </Button>
          )}
        </div>
      </div>

      {/* Sleek Inline KPI Strip directly inside Hero Area */}
      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1 text-xs">
        <div className="flex items-center gap-2.5 rounded-xl bg-background/60 border border-border/60 px-3 py-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium truncate">Odehráno zápasů</p>
            <p className="text-sm sm:text-base font-black text-foreground leading-tight tabular-nums">{overview.totalMatchesPlayed}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-background/60 border border-border/60 px-3 py-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <Flame className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium truncate">Vstřeleno gólů</p>
            <p className="text-sm sm:text-base font-black text-foreground leading-tight tabular-nums">{overview.totalGoalsScored}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-background/60 border border-border/60 px-3 py-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium truncate">Průměr gólů / zápas</p>
            <p className="text-sm sm:text-base font-black text-foreground leading-tight tabular-nums">{overview.averageGoalsPerGame}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-background/60 border border-border/60 px-3 py-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium truncate">Týmů v soutěži</p>
            <p className="text-sm sm:text-base font-black text-foreground leading-tight tabular-nums">9</p>
          </div>
        </div>
      </div>
    </div>
  );
}
