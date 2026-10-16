import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, View } from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import { StatAdjuster } from './StatAdjuster';
import type { EditableGoalieStatItem } from '../services/statsService';

export interface GoalieLeaderboardItem {
  id: string;
  name: string;
  gamesPlayed?: number;
  wins?: number;
  so?: number;
  saves?: number;
  shotsAgainst?: number;
  goalsAgainst?: number;
  savePercentage?: number;
}

export interface GoalieStatsTableProps {
  goalies: GoalieLeaderboardItem[];
  currentUserId?: string;
  onGoalieClick: (goalieId: string) => void;
  showAll?: boolean;
  onToggleShowAll?: () => void;
  isStatEditMode?: boolean;
  expandedStatId?: string | null;
  onToggleExpandStat?: (goalieId: string) => void;
  onUpdateEditableGoalieStat?: (
    updater: (prev: EditableGoalieStatItem[]) => EditableGoalieStatItem[]
  ) => void;
  className?: string;
}

export function GoalieStatsTable({
  goalies,
  currentUserId,
  onGoalieClick,
  showAll = false,
  onToggleShowAll,
  isStatEditMode = false,
  expandedStatId,
  onToggleExpandStat,
  onUpdateEditableGoalieStat,
  className,
}: GoalieStatsTableProps) {
  const displayedGoalies =
    showAll || isStatEditMode ? goalies : goalies.slice(0, 10);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-2">Jméno</TableHead>
              <TableHead className="text-center px-1" title="Zápasy">Z</TableHead>
              <TableHead className="text-center px-1" title="Výhry">V</TableHead>
              <TableHead className="text-center px-1" title="Zásahy">
                <span className="hidden sm:inline">Zásahy</span>
                <span className="sm:hidden">Zás.</span>
              </TableHead>
              <TableHead className="text-center px-1" title="Obdržené góly">OG</TableHead>
              <TableHead className="text-center px-1" title="Čistá konta (Shutouts)">SO</TableHead>
              <TableHead className="text-right px-2" title="Úspěšnost zásahů">
                <span className="hidden sm:inline">Úspěšnost</span>
                <span className="sm:hidden">%</span>
              </TableHead>
              {isStatEditMode && <TableHead className="w-8 px-1"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedGoalies.map((g) => (
              <React.Fragment key={g.id}>
                <TableRow
                  className={cn(
                    g.id === currentUserId && 'bg-primary/5',
                    expandedStatId === g.id && 'bg-muted/50'
                  )}
                >
                  <TableCell
                    className="font-medium whitespace-nowrap px-2 cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-1.5 group"
                    onClick={() => onGoalieClick(g.id)}
                    title="Zobrazit kariérní kartu brankáře"
                  >
                    <span>{formatName(g.name)}</span>
                    <View className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </TableCell>
                  <TableCell className="text-center px-1 tabular-nums font-semibold">
                    {String(g.gamesPlayed || 0)}
                  </TableCell>
                  <TableCell className="text-center px-1 tabular-nums text-emerald-500 font-semibold">
                    {String(g.wins || 0)}
                  </TableCell>
                  <TableCell className="text-center px-1 tabular-nums">
                    {String(g.saves || 0)}
                  </TableCell>
                  <TableCell className="text-center px-1 tabular-nums text-muted-foreground">
                    {String(g.goalsAgainst ?? Math.max(0, (g.shotsAgainst || 0) - (g.saves || 0)))}
                  </TableCell>
                  <TableCell className="text-center px-1 tabular-nums">
                    {String(g.so || 0)}
                  </TableCell>
                  <TableCell className="text-right font-bold px-2 tabular-nums">
                    {String((g.savePercentage || 0).toFixed(2))}%
                  </TableCell>
                  {isStatEditMode && onToggleExpandStat && (
                    <TableCell className="p-0 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onToggleExpandStat(g.id)}
                      >
                        <ChevronDown
                          className={cn(
                            'h-3 w-3 transition-transform',
                            expandedStatId === g.id && 'rotate-180'
                          )}
                        />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
                {isStatEditMode &&
                  expandedStatId === g.id &&
                  onUpdateEditableGoalieStat && (
                    <TableRow className="bg-muted/30 border-b-2 border-primary/20">
                      <TableCell colSpan={8} className="p-2 sm:p-4">
                        <div className="flex flex-wrap items-center justify-around gap-2 bg-background/50 rounded-lg p-2 border">
                          <div className="flex flex-col items-center gap-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                              Zápasy
                            </Label>
                            <StatAdjuster
                              value={String(g.gamesPlayed || 0)}
                              onChange={(val) =>
                                onUpdateEditableGoalieStat((cur) =>
                                  cur.map((it) =>
                                    it.id === g.id
                                      ? { ...it, gamesPlayed: val }
                                      : it
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                              Výhry
                            </Label>
                            <StatAdjuster
                              value={String(g.wins || 0)}
                              onChange={(val) =>
                                onUpdateEditableGoalieStat((cur) =>
                                  cur.map((it) =>
                                    it.id === g.id ? { ...it, wins: val } : it
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                              SO
                            </Label>
                            <StatAdjuster
                              value={String(g.so || 0)}
                              onChange={(val) =>
                                onUpdateEditableGoalieStat((cur) =>
                                  cur.map((it) =>
                                    it.id === g.id ? { ...it, so: val } : it
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                              Zásahy
                            </Label>
                            <StatAdjuster
                              value={String(g.saves || 0)}
                              onChange={(val) =>
                                onUpdateEditableGoalieStat((cur) =>
                                  cur.map((it) =>
                                    it.id === g.id ? { ...it, saves: val } : it
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                              Střely
                            </Label>
                            <StatAdjuster
                              value={String(g.shotsAgainst || 0)}
                              onChange={(val) =>
                                onUpdateEditableGoalieStat((cur) =>
                                  cur.map((it) =>
                                    it.id === g.id
                                      ? { ...it, shotsAgainst: val }
                                      : it
                                  )
                                )
                              }
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
              </React.Fragment>
            ))}
            {goalies.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isStatEditMode ? 8 : 7}
                  className="text-center py-6 text-muted-foreground italic"
                >
                  Žádné brankářské statistiky k zobrazení.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!isStatEditMode && goalies.length > 10 && onToggleShowAll && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleShowAll}
            className="w-full sm:w-auto font-bold text-xs"
          >
            {showAll ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" /> Zobrazit jen top 10
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" /> Zobrazit všechny
                brankáře ({goalies.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
