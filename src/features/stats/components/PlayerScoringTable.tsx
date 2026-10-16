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
import { View, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import { StatAdjuster } from './StatAdjuster';
import type { EditableSkaterStatItem } from '../services/statsService';

export interface ScorerItem {
  id: string;
  name: string;
  jerseyNumber?: number;
  rank?: number;
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  points?: number;
}

export interface PlayerScoringTableProps {
  scorers: ScorerItem[];
  currentUserId?: string;
  onPlayerClick: (playerId: string) => void;
  showAll?: boolean;
  onToggleShowAll?: () => void;
  isStatEditMode?: boolean;
  expandedStatId?: string | null;
  onToggleExpandStat?: (playerId: string) => void;
  onUpdateEditableSkaterStat?: (
    updater: (prev: EditableSkaterStatItem[]) => EditableSkaterStatItem[]
  ) => void;
  className?: string;
}

export function PlayerScoringTable({
  scorers,
  currentUserId,
  onPlayerClick,
  showAll = false,
  onToggleShowAll,
  isStatEditMode = false,
  expandedStatId,
  onToggleExpandStat,
  onUpdateEditableSkaterStat,
  className,
}: PlayerScoringTableProps) {
  const displayedScorers =
    showAll || isStatEditMode ? scorers : scorers.slice(0, 10);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6 px-1 text-center">#</TableHead>
              <TableHead className="px-2">Hráč</TableHead>
              <TableHead className="text-center px-1">Z</TableHead>
              <TableHead className="text-center px-1">G</TableHead>
              <TableHead className="text-center px-1">A</TableHead>
              <TableHead className="text-right px-2">B</TableHead>
              {isStatEditMode && <TableHead className="w-8 px-1"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedScorers.map((p) => {
              const isMe = p.id === currentUserId;
              return (
                <React.Fragment key={p.id}>
                  <TableRow
                    className={cn(
                      isMe && 'bg-primary/5',
                      expandedStatId === p.id && 'bg-muted/50'
                    )}
                  >
                    <TableCell className="px-1 text-center tabular-nums">
                      {String(p.rank || 0)}
                    </TableCell>
                    <TableCell
                      className="font-medium whitespace-nowrap px-2 cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-1.5 group"
                      onClick={() => onPlayerClick(p.id)}
                      title="Zobrazit kariérní kartu hráče"
                    >
                      <span>{formatName(p.name)}</span>
                      <View className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </TableCell>
                    <TableCell className="text-center px-1 tabular-nums">
                      {String(p.gamesPlayed || 0)}
                    </TableCell>
                    <TableCell className="text-center px-1 tabular-nums">
                      {String(p.goals || 0)}
                    </TableCell>
                    <TableCell className="text-center px-1 tabular-nums">
                      {String(p.assists || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold px-2 tabular-nums">
                      {String(p.points || 0)}
                    </TableCell>
                    {isStatEditMode && onToggleExpandStat && (
                      <TableCell className="p-0 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onToggleExpandStat(p.id)}
                        >
                          <ChevronDown
                            className={cn(
                              'h-3 w-3 transition-transform',
                              expandedStatId === p.id && 'rotate-180'
                            )}
                          />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {isStatEditMode &&
                    expandedStatId === p.id &&
                    onUpdateEditableSkaterStat && (
                      <TableRow className="bg-muted/30 border-b-2 border-primary/20">
                        <TableCell colSpan={7} className="p-2 sm:p-4">
                          <div className="flex flex-wrap items-center justify-around gap-2 bg-background/50 rounded-lg p-2 border">
                            <div className="flex flex-col items-center gap-1">
                              <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                                Zápasy
                              </Label>
                              <StatAdjuster
                                value={String(p.gamesPlayed || 0)}
                                onChange={(val) =>
                                  onUpdateEditableSkaterStat((cur) =>
                                    cur.map((it) =>
                                      it.id === p.id
                                        ? { ...it, gamesPlayed: val }
                                        : it
                                    )
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                                Góly
                              </Label>
                              <StatAdjuster
                                value={String(p.goals || 0)}
                                onChange={(val) =>
                                  onUpdateEditableSkaterStat((cur) =>
                                    cur.map((it) =>
                                      it.id === p.id ? { ...it, goals: val } : it
                                    )
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                                Asistence
                              </Label>
                              <StatAdjuster
                                value={String(p.assists || 0)}
                                onChange={(val) =>
                                  onUpdateEditableSkaterStat((cur) =>
                                    cur.map((it) =>
                                      it.id === p.id
                                        ? { ...it, assists: val }
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
              );
            })}
            {scorers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isStatEditMode ? 7 : 6}
                  className="text-center py-6 text-muted-foreground italic"
                >
                  V této části zatím nebyly zaznamenány žádné body.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!isStatEditMode && scorers.length > 10 && onToggleShowAll && (
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
                <ChevronDown className="mr-2 h-4 w-4" /> Zobrazit všechny hráče
                ({scorers.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
