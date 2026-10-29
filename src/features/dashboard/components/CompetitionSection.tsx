import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListOrdered, CalendarDays, RefreshCw, Pencil, History, Shield, ArrowRight, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeagueStandingsTable } from '@/features/stats';
import type { LeagueStanding, PlayoffSeries } from '@/types';

interface CompetitionSectionProps {
  selectedSeasonId: string;
  onSelectSeasonId: (id: string) => void;
  currentSeasonName?: string;
  archivedSeasons?: Array<{ id: string; name: string; year: string }> | null;
  isAdmin: boolean;
  isSyncingLeague: boolean;
  onSyncLeague: () => void;
  onOpenPlayoffDialog: () => void;
  onOpenArchiveSeasonDialog: () => void;
  activeSeasonData: {
    standings: LeagueStanding[];
    playoffSeries: PlayoffSeries[];
    name: string;
  };
}

export const CompetitionSection = React.memo(function CompetitionSection({
  selectedSeasonId,
  onSelectSeasonId,
  currentSeasonName,
  archivedSeasons,
  isAdmin,
  isSyncingLeague,
  onSyncLeague,
  onOpenPlayoffDialog,
  onOpenArchiveSeasonDialog,
  activeSeasonData,
}: CompetitionSectionProps) {
  return (
    <Card className="h-fit border-border/70 bg-card/95 w-full min-w-0 overflow-hidden">
      <CardHeader className="py-3 px-3.5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg whitespace-nowrap">
            <ListOrdered className="text-primary" />
            Soutěž
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select value={selectedSeasonId} onValueChange={onSelectSeasonId}>
                <SelectTrigger className="h-7 w-[150px] text-xs">
                  <SelectValue placeholder="Vyberte sezónu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    {currentSeasonName || 'Aktuální sezóna'}
                  </SelectItem>
                  {archivedSeasons?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && selectedSeasonId === 'current' && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2 gap-1.5 border-dashed hover:border-primary/50"
                    title="Správa soutěže a synchronizace"
                  >
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold">Správa</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={onSyncLeague}
                    disabled={isSyncingLeague}
                    className="cursor-pointer text-xs"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5 mr-2', isSyncingLeague && 'animate-spin')} />
                    {isSyncingLeague ? 'Stahuji ligu...' : 'Synchronizovat ligu'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenPlayoffDialog} className="cursor-pointer text-xs">
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Upravit Play-off sérii
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onOpenArchiveSeasonDialog}
                    className="cursor-pointer text-xs text-destructive focus:text-destructive"
                  >
                    <History className="h-3.5 w-3.5 mr-2" />
                    Ukončit & Archivovat ročník
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 pb-4">
        <Tabs defaultValue="standings">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="standings" className="text-xs">Tabulka</TabsTrigger>
            <TabsTrigger value="playoff" className="text-xs">Play-off série</TabsTrigger>
          </TabsList>
          <TabsContent value="standings">
            <LeagueStandingsTable standings={activeSeasonData.standings} />
          </TabsContent>
          <TabsContent value="playoff">
            <div className="grid gap-3 sm:grid-cols-2">
              {(activeSeasonData.playoffSeries || []).map((series, idx) => (
                <Card key={idx} className="bg-muted/30">
                  <CardHeader className="pb-2 p-3">
                    <p className="text-[10px] font-bold text-primary uppercase">{series.round}</p>
                    <CardTitle className="text-sm text-left">{series.opponent}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">Stav série</p>
                      <p className="text-lg font-bold text-primary tabular-nums">
                        {series.wins} : {series.losses}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!activeSeasonData.playoffSeries || activeSeasonData.playoffSeries.length === 0) && (
                <div className="col-span-full py-8 text-center text-muted-foreground italic text-xs">
                  Play-off série zatím nebyly definovány.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {selectedSeasonId === 'current' && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">Statistiky ligy, střely a výsledky všech kol</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0"
            >
              <Link href="/dashboard/league" className="flex items-center gap-1">
                Ligové centrum
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
