import React, { useState, useMemo } from 'react';
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
import { View, ChevronDown, ChevronUp, Shield, Crosshair, Zap, Users } from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import { StatAdjuster } from './StatAdjuster';
import type { EditableSkaterStatItem } from '../services/statsService';
import type { Player } from '@/types/player';
import type { Match } from '@/types/match';
import type { PlayerFormSummary } from '../utils/playerForm';
import { resolvePlayerPosition, POSITION_METADATA } from '@/features/roster/utils/positions';

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
  allUsers?: Player[];
  allMatches?: Match[];
  playerFormMap?: Map<string, PlayerFormSummary>;
  className?: string;
}

type PositionFilterType = 'all' | 'forwards' | 'defense' | 'center' | 'wing';

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
  allUsers = [],
  allMatches = [],
  playerFormMap,
  className,
}: PlayerScoringTableProps) {
  const [posFilter, setPosFilter] = useState<PositionFilterType>('all');

  const positionByPlayerId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolvePlayerPosition>>();
    for (const u of allUsers) {
      map.set(u.id, resolvePlayerPosition(u, allMatches));
    }
    return map;
  }, [allUsers, allMatches]);

  const filteredScorers = useMemo(() => {
    if (posFilter === 'all' || isStatEditMode || allUsers.length === 0) {
      return scorers;
    }
    const filtered = scorers.filter((s) => {
      const pos = positionByPlayerId.get(s.id)?.resolvedPosition || 'player';
      if (posFilter === 'defense') return pos === 'defense';
      if (posFilter === 'forwards') return pos === 'center' || pos === 'wing' || pos === 'player';
      if (posFilter === 'center') return pos === 'center';
      if (posFilter === 'wing') return pos === 'wing';
      return true;
    });
    return filtered.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [scorers, posFilter, isStatEditMode, allUsers.length, positionByPlayerId]);

  const displayedScorers =
    showAll || isStatEditMode ? filteredScorers : filteredScorers.slice(0, 10);

  return (
    <div className={cn('space-y-3 w-full min-w-0 max-w-full', className)}>
      {!isStatEditMode && allUsers.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: 'all' as const, label: 'Všichni', icon: Users },
            { id: 'forwards' as const, label: 'Útočníci', icon: Zap },
            { id: 'defense' as const, label: 'Obránci', icon: Shield },
            { id: 'center' as const, label: 'Centři', icon: Crosshair },
            { id: 'wing' as const, label: 'Křídla', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = posFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPosFilter(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 border',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/70'
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-md border overflow-x-auto w-full min-w-0 max-w-full">
        <Table className="w-full min-w-[280px]">
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
              const posInfo = positionByPlayerId.get(p.id);
              const posMeta =
                posInfo && posInfo.resolvedPosition !== 'player' && posInfo.resolvedPosition !== 'member' && posInfo.resolvedPosition !== 'goalie'
                  ? posInfo.meta
                  : null;
              const topBadges = playerFormMap?.get(p.id)?.badges.slice(0, 2) || [];

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
                      className="font-medium whitespace-nowrap px-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => onPlayerClick(p.id)}
                      title="Zobrazit kariérní kartu hráče"
                    >
                      <div className="inline-flex items-center gap-1.5 group min-w-0">
                        <span className="truncate">{formatName(p.name)}</span>
                        {posMeta && (
                          <span
                            className={cn(
                              'inline-flex items-center justify-center rounded px-1 py-0 text-[9px] font-black uppercase border leading-tight shrink-0',
                              posMeta.badgeClass
                            )}
                            title={`Post: ${posMeta.label}`}
                          >
                            {posMeta.tinyLabel}
                          </span>
                        )}
                        {topBadges.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 shrink-0">
                            {topBadges.map((b) => (
                              <span
                                key={b.type}
                                className="text-xs leading-none select-none"
                                title={`${b.title}: ${b.description}`}
                              >
                                {b.emoji}
                              </span>
                            ))}
                          </span>
                        )}
                        <View className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                      </div>
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
            {filteredScorers.length === 0 && (
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

      {!isStatEditMode && filteredScorers.length > 10 && onToggleShowAll && (
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
                ({filteredScorers.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
