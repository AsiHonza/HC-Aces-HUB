'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HeartHandshake,
  Flame,
  Trophy,
  Target,
  Sparkles,
  Calendar,
  Swords,
  Timer,
  TrendingUp,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Zap,
  Award,
} from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import type { DynamicDuoRecord } from '../utils/chemistry';

interface DynamicDuoDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDuo: DynamicDuoRecord | null;
  allDuos: DynamicDuoRecord[];
  onSelectDuo: (duo: DynamicDuoRecord) => void;
  onOpenPlayerCareer?: (playerId: string) => void;
}

function getInitials(name: string): string {
  if (!name) return 'AC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function getDuoArchetype(duo: DynamicDuoRecord): {
  label: string;
  description: string;
  badgeClass: string;
} {
  const total = Math.max(1, duo.totalCombinedGoals);
  const p1Share = duo.p1GoalsFromP2 / total;
  const p2Share = duo.p2GoalsFromP1 / total;

  if (duo.gwgCount >= 2) {
    return {
      label: 'Rozhodující spojka (Clutch Duo)',
      description: 'Specialisté na vítězné a zlomové branky utkání',
      badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/35',
    };
  }
  if (duo.p1GoalsFromP2 >= 1 && duo.p2GoalsFromP1 >= 1 && Math.abs(p1Share - p2Share) <= 0.35) {
    return {
      label: 'Oboustranná telepatie',
      description: 'Oba hráči si vzájemně nabíjejí i zakončují',
      badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/35',
    };
  }
  if (p1Share >= 0.75 && duo.totalCombinedGoals >= 2) {
    return {
      label: 'Dvorní nabíječ & Kanonýr',
      description: `${formatName(duo.player2Name)} přesně servíruje, ${formatName(duo.player1Name)} nekompromisně pálí`,
      badgeClass: 'bg-primary/15 text-primary border-primary/35',
    };
  }
  if (p2Share >= 0.75 && duo.totalCombinedGoals >= 2) {
    return {
      label: 'Dvorní nabíječ & Kanonýr',
      description: `${formatName(duo.player1Name)} přesně servíruje, ${formatName(duo.player2Name)} nekompromisně pálí`,
      badgeClass: 'bg-primary/15 text-primary border-primary/35',
    };
  }
  if (duo.winRateWhenScoringPct >= 75 && duo.matchesWithDuoGoal >= 2) {
    return {
      label: 'Vítězný talisman',
      description: 'Když spolu skórují, HC Aces téměř pokaždé berou vítězství',
      badgeClass: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/35',
    };
  }
  return {
    label: 'Útočné Dynamic Duo',
    description: 'Osvědčená gólová spolupráce v dresu HC Aces',
    badgeClass: 'bg-primary/15 text-primary border-primary/35',
  };
}

export function DynamicDuoDetailModal({
  open,
  onOpenChange,
  selectedDuo,
  allDuos,
  onSelectDuo,
  onOpenPlayerCareer,
}: DynamicDuoDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'goals' | 'matches'>('goals');

  useEffect(() => {
    if (open) {
      setActiveTab('goals');
    }
  }, [open, selectedDuo?.duoKey]);

  if (!selectedDuo) return null;

  const currentRank = Math.max(
    1,
    allDuos.findIndex((d) => d.duoKey === selectedDuo.duoKey) + 1
  );
  const archetype = getDuoArchetype(selectedDuo);
  const totalGoals = Math.max(1, selectedDuo.totalCombinedGoals);
  const dir1Pct = Math.round((selectedDuo.p1GoalsFromP2 / totalGoals) * 100);
  const dir2Pct = 100 - dir1Pct;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-primary/25 bg-background">
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-br from-primary/15 via-card to-background border-b border-border/60 p-4 sm:p-6 space-y-4">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center justify-between gap-2 flex-wrap pr-6">
              <div className="inline-flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-primary/20 text-primary border-primary/40 font-black text-xs px-2.5 py-0.5"
                >
                  #{currentRank} Dynamic Duo
                </Badge>
                <Badge variant="outline" className={cn('text-xs font-bold', archetype.badgeClass)}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {archetype.label}
                </Badge>
              </div>
            </div>
            <DialogTitle className="font-headline text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 flex-wrap">
              <span>Detail souhry na ledě</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              {archetype.description}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Switcher between Top Duos */}
          {allDuos.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {allDuos.slice(0, 8).map((d, idx) => {
                const isSelected = d.duoKey === selectedDuo.duoKey;
                return (
                  <button
                    key={d.duoKey}
                    type="button"
                    onClick={() => onSelectDuo(d)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 inline-flex items-center gap-1.5 border transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card/80 text-muted-foreground border-border/70 hover:text-foreground hover:border-primary/40'
                    )}
                  >
                    <span className="opacity-75 font-black tabular-nums">#{idx + 1}</span>
                    <span>
                      {formatName(d.player1Name)} & {formatName(d.player2Name)}
                    </span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-md text-[10px] font-black',
                        isSelected ? 'bg-black/20 text-white' : 'bg-primary/15 text-primary'
                      )}
                    >
                      {d.totalCombinedGoals} G
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Dual Player Hero Card */}
          <div className="rounded-2xl border border-border/80 bg-card/90 p-3.5 sm:p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
              {/* Player 1 */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/40 shadow-sm">
                    {selectedDuo.player1Photo && (
                      <AvatarImage src={selectedDuo.player1Photo} alt={selectedDuo.player1Name} />
                    )}
                    <AvatarFallback className="bg-primary/15 text-primary font-black text-sm">
                      {getInitials(selectedDuo.player1Name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedDuo.player1Jersey != null && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-background border border-border text-[10px] font-black tabular-nums">
                      #{selectedDuo.player1Jersey}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-headline font-black text-sm sm:text-base text-foreground truncate">
                    {selectedDuo.player1Name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                    <span>
                      Střelec: <strong className="text-foreground">{selectedDuo.p1GoalsFromP2}×</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Nahrávač: <strong className="text-foreground">{selectedDuo.p2GoalsFromP1}×</strong>
                    </span>
                  </div>
                  {onOpenPlayerCareer && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenPlayerCareer(selectedDuo.player1Id);
                      }}
                      className="text-[11px] font-bold text-primary hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <UserCheck className="h-3 w-3" />
                      Otevřít kartu hráče
                    </button>
                  )}
                </div>
              </div>

              {/* Center Synergy Badge */}
              <div className="flex flex-col items-center justify-center px-3 py-2 rounded-2xl bg-primary/10 border border-primary/30 shrink-0 mx-auto">
                <div className="flex items-center gap-1.5 text-primary font-black text-lg sm:text-xl tabular-nums">
                  <Flame className="h-5 w-5 fill-primary text-primary" />
                  <span>{selectedDuo.totalCombinedGoals} G</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  společné góly
                </span>
              </div>

              {/* Player 2 */}
              <div className="flex items-center sm:flex-row-reverse sm:text-right gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-amber-500/40 shadow-sm">
                    {selectedDuo.player2Photo && (
                      <AvatarImage src={selectedDuo.player2Photo} alt={selectedDuo.player2Name} />
                    )}
                    <AvatarFallback className="bg-amber-500/15 text-amber-500 font-black text-sm">
                      {getInitials(selectedDuo.player2Name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedDuo.player2Jersey != null && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-background border border-border text-[10px] font-black tabular-nums">
                      #{selectedDuo.player2Jersey}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-headline font-black text-sm sm:text-base text-foreground truncate">
                    {selectedDuo.player2Name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center sm:justify-end gap-2 mt-0.5 flex-wrap">
                    <span>
                      Střelec: <strong className="text-foreground">{selectedDuo.p2GoalsFromP1}×</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Nahrávač: <strong className="text-foreground">{selectedDuo.p1GoalsFromP2}×</strong>
                    </span>
                  </div>
                  {onOpenPlayerCareer && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenPlayerCareer(selectedDuo.player2Id);
                      }}
                      className="text-[11px] font-bold text-primary hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <UserCheck className="h-3 w-3" />
                      Otevřít kartu hráče
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Directional Split Bar (Kdo komu nabíjí) */}
            <div className="mt-4 pt-3.5 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1 text-foreground">
                  <span className="text-muted-foreground">Nahrává</span>{' '}
                  {formatName(selectedDuo.player2Name)} <ArrowRight className="h-3 w-3 text-primary inline" />{' '}
                  <span className="text-primary">pálí {formatName(selectedDuo.player1Name)}</span> (
                  {selectedDuo.p1GoalsFromP2} G • {dir1Pct} %)
                </span>
                <span className="flex items-center gap-1 text-foreground text-right">
                  ({selectedDuo.p2GoalsFromP1} G • {dir2Pct} %){' '}
                  <span className="text-amber-500">pálí {formatName(selectedDuo.player2Name)}</span>{' '}
                  <ArrowRight className="h-3 w-3 text-amber-500 inline rotate-180" />{' '}
                  <span className="text-muted-foreground">Nahrává</span>{' '}
                  {formatName(selectedDuo.player1Name)}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex p-0.5 gap-0.5">
                {selectedDuo.p1GoalsFromP2 > 0 && (
                  <div
                    className="h-full bg-primary rounded-l-full transition-all"
                    style={{ width: `${Math.max(12, dir1Pct)}%` }}
                  />
                )}
                {selectedDuo.p2GoalsFromP1 > 0 && (
                  <div
                    className="h-full bg-amber-500 rounded-r-full transition-all"
                    style={{ width: `${Math.max(12, dir2Pct)}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* 4 Key Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <Swords className="h-3.5 w-3.5 text-primary" />
                <span>Společné zápasy</span>
              </div>
              <div className="text-lg font-black text-foreground tabular-nums">
                {selectedDuo.gamesTogether}{' '}
                <span className="text-xs font-bold text-muted-foreground">utkání</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Bilance:{' '}
                <strong className="text-emerald-500">{selectedDuo.winsTogether}V</strong>
                {selectedDuo.tiesTogether > 0 ? ` – ${selectedDuo.tiesTogether}R` : ''} –{' '}
                <strong className="text-rose-400">{selectedDuo.lossesTogether}P</strong> (
                <strong className="text-foreground">{selectedDuo.winRatePct} %</strong>)
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span>Když spolu skórují</span>
              </div>
              <div className="text-lg font-black text-emerald-500 tabular-nums">
                {selectedDuo.winRateWhenScoringPct} %{' '}
                <span className="text-xs font-bold text-muted-foreground">výher</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {selectedDuo.winsWhenScoringTogether} výher z {selectedDuo.matchesWithDuoGoal}{' '}
                gólových zápasů
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>Klíčové momenty</span>
              </div>
              <div className="text-lg font-black text-foreground tabular-nums">
                {selectedDuo.gwgCount}×{' '}
                <span className="text-xs font-bold text-amber-500">vítězný GWG</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {selectedDuo.openingGoalCount}× 1. gól zápasu • Max{' '}
                <strong className="text-foreground">{selectedDuo.maxDuoGoalsInSingleMatch} G</strong>{' '}
                v utkání
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-purple-400" />
                <span>Oblíbená oběť</span>
              </div>
              <div className="text-sm sm:text-base font-black text-foreground truncate">
                {selectedDuo.favoriteOpponent ? selectedDuo.favoriteOpponent.name : '—'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {selectedDuo.favoriteOpponent
                  ? `${selectedDuo.favoriteOpponent.goals} společné góly`
                  : 'Žádný soupeř'}
                {' • '}
                <strong className="text-foreground">{selectedDuo.combinedPointsInSharedGames} KB</strong>{' '}
                spolu
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center justify-between border-b border-border/70 pb-2 gap-2 flex-wrap">
            <div className="inline-flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab('goals')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  activeTab === 'goals'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Flame className="h-3.5 w-3.5" />
                <span>Historie gólových situací ({selectedDuo.goalEvents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  activeTab === 'matches'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Společné zápasy ({selectedDuo.sharedMatches.length})</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Goal Situations History */}
          {activeTab === 'goals' && (
            <div className="space-y-2.5">
              {selectedDuo.goalEvents.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Zatím žádné zaznamenané gólové situace.
                </div>
              ) : (
                selectedDuo.goalEvents.map((ev, idx) => {
                  const goalOrdinal = selectedDuo.goalEvents.length - idx;
                  return (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-border/70 bg-card/70 hover:bg-card p-3 sm:p-3.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 text-primary font-black text-xs flex items-center justify-center shrink-0 tabular-nums">
                          #{goalOrdinal}
                        </div>
                        <div className="min-w-0 space-y-1">
                          {/* Scorer & Assister Line */}
                          <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm">
                            <span className="inline-flex items-center gap-1 font-black text-foreground">
                              <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                              {ev.scorerJersey != null && (
                                <span className="text-[11px] text-muted-foreground font-bold">
                                  #{ev.scorerJersey}
                                </span>
                              )}
                              <span>{formatName(ev.scorerName)}</span>
                            </span>
                            <span className="text-muted-foreground text-xs">po nahrávce</span>
                            <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                              <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
                              {ev.assisterJersey != null && (
                                <span className="text-[11px] opacity-80 font-bold">
                                  #{ev.assisterJersey}
                                </span>
                              )}
                              <span>{formatName(ev.assisterName)}</span>
                            </span>
                          </div>

                          {/* Match & Situational Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                            {ev.minute != null && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-muted text-foreground border-border font-bold inline-flex items-center gap-1"
                              >
                                <Timer className="h-2.5 w-2.5 text-primary" />
                                {ev.minute}. min
                              </Badge>
                            )}
                            {ev.scoreAfterGoal && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30 font-black"
                              >
                                Stav {ev.scoreAfterGoal}
                              </Badge>
                            )}
                            {!ev.scoreAfterGoal && ev.acesGoalNumber > 0 && (
                              <span className="text-[10px] font-semibold">
                                ({ev.acesGoalNumber}. gól Aces v utkání)
                              </span>
                            )}
                            {ev.isGwg && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-500 border-amber-500/35 font-bold inline-flex items-center gap-1"
                              >
                                <Trophy className="h-2.5 w-2.5" />
                                Vítězný gól (GWG)
                              </Badge>
                            )}
                            {ev.isOpeningGoal && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-sky-500/15 text-sky-400 border-sky-500/35 font-bold inline-flex items-center gap-1"
                              >
                                <Zap className="h-2.5 w-2.5" />
                                1. gól zápasu
                              </Badge>
                            )}
                            {ev.isGoAheadGoal && !ev.isOpeningGoal && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-400 border-emerald-500/35 font-bold"
                              >
                                Vedoucí gól
                              </Badge>
                            )}
                            {ev.isTyingGoal && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/15 text-purple-400 border-purple-500/35 font-bold"
                              >
                                Vyrovnávací gól
                              </Badge>
                            )}
                            {ev.isPlayoff && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold"
                              >
                                Play-off
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Match Context on the Right */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>vs. {ev.opponent}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0 h-4 font-black tabular-nums',
                              ev.isWin
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : ev.isTie
                                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            )}
                          >
                            {ev.isWin ? 'Výhra' : ev.isTie ? 'Remíza' : 'Prohra'} {ev.acesScore}:
                            {ev.oppScore}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {ev.matchDateStr}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Shared Matches History */}
          {activeTab === 'matches' && (
            <div className="space-y-2">
              {selectedDuo.sharedMatches.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Žádné společné zápasy v záznamech.
                </div>
              ) : (
                selectedDuo.sharedMatches.map((sm) => (
                  <div
                    key={sm.matchId}
                    className="rounded-xl border border-border/70 bg-card/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-black tabular-nums px-2 py-0.5 shrink-0',
                          sm.isWin
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : sm.isTie
                            ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        )}
                      >
                        {sm.isWin ? 'V' : sm.isTie ? 'R' : 'P'} {sm.acesScore}:{sm.oppScore}
                      </Badge>
                      <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                        vs. {sm.opponent}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        ({sm.matchDateStr})
                      </span>
                      {sm.duoGoalsInMatch > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-primary/15 text-primary border-primary/30 text-[10px] font-black inline-flex items-center gap-1"
                        >
                          <Flame className="h-3 w-3 fill-primary text-primary" />
                          {sm.duoGoalsInMatch}× společný gól
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-muted/70 border border-border/60">
                        {formatName(selectedDuo.player1Name)}:{' '}
                        <strong className="text-foreground">
                          {sm.p1Goals}+{sm.p1Assists}
                        </strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-muted/70 border border-border/60">
                        {formatName(selectedDuo.player2Name)}:{' '}
                        <strong className="text-foreground">
                          {sm.p2Goals}+{sm.p2Assists}
                        </strong>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
