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
import { View, ChevronDown, ChevronUp, Shield, Crosshair, Zap, Users, Crown, Flame, Target, Activity, Info, Sparkles, Share2, Lock, ShieldCheck, Award } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, formatName } from '@/lib/utils';
import { StatAdjuster } from './StatAdjuster';
import type { EditableSkaterStatItem } from '../services/statsService';
import type { Player } from '@/types/player';
import type { Match } from '@/types/match';
import type { PlayerFormSummary } from '../utils/playerForm';
import { getPlayerFormIcon } from './PlayerFormBadgeItem';
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
  const [isLegendOpen, setIsLegendOpen] = useState(false);

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

      <TooltipProvider delayDuration={150}>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center rounded px-1 py-0 text-[9px] font-black uppercase border leading-tight shrink-0 cursor-help',
                                  posMeta.badgeClass
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {posMeta.tinyLabel}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <span className="font-bold">Post: </span>
                              <span>{posMeta.label}</span>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {topBadges.length > 0 && (
                          <span className="inline-flex items-center gap-1 shrink-0">
                            {topBadges.map((b) => (
                              <Tooltip key={b.type}>
                                <TooltipTrigger asChild>
                                  <span
                                    className="inline-flex items-center select-none cursor-help p-0.5 rounded hover:bg-muted/80 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {getPlayerFormIcon(b.type, 'h-3.5 w-3.5')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-xs space-y-0.5">
                                  <p className="font-bold text-foreground flex items-center gap-1.5">
                                    {getPlayerFormIcon(b.type, 'h-3.5 w-3.5')}
                                    <span>{b.title}</span>
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">{b.description}</p>
                                </TooltipContent>
                              </Tooltip>
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
    </TooltipProvider>

      {/* Legenda ikon formy a ocenění (rozbalovací) */}
      <div className="mt-3 pt-2.5 border-t border-border/60">
        <Collapsible open={isLegendOpen} onOpenChange={setIsLegendOpen} className="w-full">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer py-1"
              >
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Vysvětlivky ikon hráčů</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                    isLegendOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="pt-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Úřadující MVP:</span>
                  <span>1. hvězda posl. uzavřeného zápasu</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Sparkles className="h-3.5 w-3.5 text-purple-500 fill-purple-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Hattrick hrdina:</span>
                  <span>3+ góly v posl. zápase</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Target className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Střelecká forma:</span>
                  <span>2 góly v posl. zápase</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Share2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Dvorní nahrávač:</span>
                  <span>2+ asistence v posl. zápase</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Bodová série:</span>
                  <span>Bod v 3+ zápasech v řadě</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Zeď v bráně:</span>
                  <span>&gt;90 % zákroků nebo nula brankáře</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Lock className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Čisté konto:</span>
                  <span>Výhra s 0 inkasovanými góly</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Shield className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Pilíř obrany:</span>
                  <span>2+ zápasy s max. 2 góly soupeře</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Award className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Tichý hrdina:</span>
                  <span>TOP 3 hvězda zápasu bez bodu</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1.5 rounded-md border border-border/50">
                <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1">Železný muž:</span>
                  <span>Šňůra 5+ zápasů bez absence</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
