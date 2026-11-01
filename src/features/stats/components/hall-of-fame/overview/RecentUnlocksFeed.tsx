'use client';

import React, { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flame,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  ChevronRight,
  Trophy,
  Swords,
  History,
  CheckCheck,
  User,
  Layers,
  ListFilter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type MilestoneWithHolders,
  type MilestoneHolder,
  TIER_CONFIG,
  formatUnitWithCount,
} from '../../../utils/milestones';
import { DEFAULT_SEASON_START_MS } from '../../../utils/season';
import { getMilestoneIcon } from '../iconHelper';

export interface RecentUnlocksFeedProps {
  milestones: MilestoneWithHolders[];
  newMilestoneIds?: Set<string>;
  newUnlockKeys?: Set<string>;
  currentUserId?: string | null;
  mode?: 'compact' | 'full';
  onOpenMilestoneDetail: (m: MilestoneWithHolders) => void;
  onOpenPlayerCareer?: (playerId: string) => void;
  onNavigateToUnlocksTab?: () => void;
  onClearNewHighlights?: () => void;
}

export interface UnlockItem {
  key: string;
  milestone: MilestoneWithHolders;
  holder: MilestoneHolder;
  isNew: boolean;
  dateStr?: string;
  timestampMs: number;
  context?: string;
  matchId?: string;
  matchOpponent?: string;
  matchRound?: number;
  matchScore?: string;
  isCurrentSeason: boolean;
  isLatestMatch: boolean;
}

/**
 * Fallback parser for Czech date string "D. M. YYYY" -> timestamp in ms
 */
function parseCzechDateStr(dateStr?: string): number {
  if (!dateStr) return 0;
  const parts = dateStr
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day, 12, 0, 0).getTime();
    }
  }
  return 0;
}

export function RecentUnlocksFeed({
  milestones,
  newMilestoneIds,
  newUnlockKeys,
  currentUserId,
  mode = 'compact',
  onOpenMilestoneDetail,
  onOpenPlayerCareer,
  onNavigateToUnlocksTab,
  onClearNewHighlights,
}: RecentUnlocksFeedProps) {
  const [showMoreCompact, setShowMoreCompact] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'season' | 'latest_match' | 'all'>('season');
  const [layoutMode, setLayoutMode] = useState<'by_match' | 'list'>('by_match');
  const [playerScope, setPlayerScope] = useState<'all' | 'me'>('all');

  // Extract and enrich all unlock items
  const {
    unlockItems,
    currentSeasonItems,
    latestMatchItems,
    latestMatchMeta,
    newCount,
  } = useMemo(() => {
    const rawList: Omit<UnlockItem, 'isLatestMatch'>[] = [];
    let maxMatchTs = 0;
    let latestMeta: {
      dateStr?: string;
      opponent?: string;
      round?: number;
      score?: string;
      timestampMs: number;
    } | null = null;

    milestones.forEach((m) => {
      m.holders.forEach((h) => {
        const unlockKey = `${m.definition.id}:${h.id}`;
        const isHolderNew = newUnlockKeys
          ? newUnlockKeys.has(unlockKey)
          : Boolean(newMilestoneIds?.has(m.definition.id));

        const ts = h.achievementTimestamp || parseCzechDateStr(h.achievementDate);
        const isCurrentSeason = ts >= DEFAULT_SEASON_START_MS;

        if (ts > maxMatchTs) {
          maxMatchTs = ts;
          latestMeta = {
            dateStr: h.achievementDate,
            opponent: h.matchOpponent,
            round: h.matchRound,
            score: h.matchScore,
            timestampMs: ts,
          };
        }

        rawList.push({
          key: `${m.definition.id}-${h.id}`,
          milestone: m,
          holder: h,
          isNew: isHolderNew,
          dateStr: h.achievementDate,
          timestampMs: ts,
          context: h.matchContext,
          matchId: h.matchId,
          matchOpponent: h.matchOpponent,
          matchRound: h.matchRound,
          matchScore: h.matchScore,
          isCurrentSeason,
        });
      });
    });

    const tierPriority: Record<string, number> = {
      legend: 5,
      diamond: 4,
      gold: 3,
      silver: 2,
      bronze: 1,
    };

    const fullList: UnlockItem[] = rawList.map((item) => ({
      ...item,
      isLatestMatch:
        maxMatchTs > 0 &&
        item.timestampMs > 0 &&
        Math.abs(item.timestampMs - maxMatchTs) < 24 * 60 * 60 * 1000,
    }));

    // Sort:
    // 1. Chronological timestamp DESC (actual match date from newest to oldest!)
    // 2. Newly unlocked in session
    // 3. Tier priority DESC
    // 4. Rarity score DESC
    fullList.sort((a, b) => {
      if (a.timestampMs !== b.timestampMs) {
        return b.timestampMs - a.timestampMs;
      }
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      const tA = tierPriority[a.milestone.definition.tier] || 0;
      const tB = tierPriority[b.milestone.definition.tier] || 0;
      if (tB !== tA) return tB - tA;
      return (b.milestone.definition.rarityScore || 0) - (a.milestone.definition.rarityScore || 0);
    });

    const seasonList = fullList.filter((i) => i.isCurrentSeason);
    const latestList = fullList.filter((i) => i.isLatestMatch);
    const unreadTotal = fullList.filter((i) => i.isNew).length;

    return {
      unlockItems: fullList,
      currentSeasonItems: seasonList,
      latestMatchItems: latestList,
      latestMatchMeta: latestMeta as {
        dateStr?: string;
        opponent?: string;
        round?: number;
        score?: string;
        timestampMs: number;
      } | null,
      newCount: unreadTotal,
    };
  }, [milestones, newMilestoneIds, newUnlockKeys]);

  // Effective filtered items for 'full' mode
  const filteredFullItems = useMemo(() => {
    let base = unlockItems;
    if (periodFilter === 'season') {
      base = currentSeasonItems.length > 0 ? currentSeasonItems : unlockItems;
    } else if (periodFilter === 'latest_match') {
      base = latestMatchItems;
    }

    if (playerScope === 'me' && currentUserId) {
      base = base.filter((i) => i.holder.id === currentUserId);
    }

    return base;
  }, [unlockItems, currentSeasonItems, latestMatchItems, periodFilter, playerScope, currentUserId]);

  // Group items by match for 'by_match' chronicle view
  const matchGroups = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        groupKey: string;
        dateStr?: string;
        timestampMs: number;
        opponent?: string;
        round?: number;
        score?: string;
        isLatestMatch: boolean;
        items: UnlockItem[];
      }
    >();

    filteredFullItems.forEach((item) => {
      const groupKey = item.matchId
        ? `match-${item.matchId}`
        : item.dateStr
        ? `date-${item.dateStr}`
        : 'historical-pre-app';

      let grp = groupsMap.get(groupKey);
      if (!grp) {
        grp = {
          groupKey,
          dateStr: item.dateStr,
          timestampMs: item.timestampMs,
          opponent: item.matchOpponent,
          round: item.matchRound,
          score: item.matchScore,
          isLatestMatch: item.isLatestMatch,
          items: [],
        };
        groupsMap.set(groupKey, grp);
      }
      grp.items.push(item);
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.timestampMs - a.timestampMs);
  }, [filteredFullItems]);

  if (unlockItems.length === 0) {
    return null;
  }

  const renderUnlockRow = (item: UnlockItem, hideMatchDateInSubtext = false) => {
    const tierConf = TIER_CONFIG[item.milestone.definition.tier] || TIER_CONFIG.bronze;

    return (
      <div
        key={item.key}
        onClick={() => onOpenMilestoneDetail(item.milestone)}
        className={cn(
          'flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border bg-card/80 hover:bg-card hover:border-primary/40 transition-all cursor-pointer group',
          item.isNew
            ? 'border-emerald-500/50 bg-emerald-500/[0.04] shadow-xs'
            : item.isLatestMatch
            ? 'border-amber-500/30 bg-amber-500/[0.02]'
            : 'border-border/60'
        )}
        title="Klikněte pro detail odznaku"
      >
        {/* Vlevo: Avatar hráče + zpráva */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            onClick={(e) => {
              if (onOpenPlayerCareer) {
                e.stopPropagation();
                onOpenPlayerCareer(item.holder.id);
              }
            }}
            className="shrink-0 cursor-pointer relative"
            title={`Otevřít kariérní kartu ${item.holder.name}`}
          >
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border hover:ring-2 hover:ring-primary/50 transition-all">
              <AvatarImage src={item.holder.photoURL || undefined} />
              <AvatarFallback className="text-[10px] font-bold">
                {item.holder.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            {item.holder.jerseyNumber != null && (
              <span className="absolute -bottom-1 -right-1 bg-muted text-foreground font-black text-[9px] px-1 rounded-full border border-border">
                #{item.holder.jerseyNumber}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                onClick={(e) => {
                  if (onOpenPlayerCareer) {
                    e.stopPropagation();
                    onOpenPlayerCareer(item.holder.id);
                  }
                }}
                className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {item.holder.name}
              </span>
              <span className="text-xs text-muted-foreground">odemkl/a</span>
              <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                {item.milestone.definition.title}
              </span>
              <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 font-bold', tierConf.badgeClass)}>
                {tierConf.label}
              </Badge>
              {item.isNew && (
                <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1.5 py-0 h-4 border-none animate-pulse">
                  NOVÉ
                </Badge>
              )}
              {!item.isNew && item.isLatestMatch && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-[9px] px-1.5 py-0 h-4"
                >
                  POSLEDNÍ ZÁPAS
                </Badge>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
              {item.context ? (
                <span className="truncate">{item.context}</span>
              ) : (
                <span>
                  Celkem v kariéře: {item.holder.value}{' '}
                  {formatUnitWithCount(
                    item.holder.value,
                    item.milestone.definition.unit,
                    item.milestone.definition.id
                  )}
                </span>
              )}
              {!hideMatchDateInSubtext && item.dateStr && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/80 shrink-0">
                    <Calendar className="h-3 w-3 text-primary/80" />
                    {item.dateStr}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Vpravo: Ikona odznaku & šipka */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              'h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-background/90 border flex items-center justify-center shadow-xs',
              tierConf.cardBorderClass
            )}
          >
            {getMilestoneIcon(item.milestone.definition.iconName, item.milestone.definition.tier, 'h-4 w-4')}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all hidden sm:block" />
        </div>
      </div>
    );
  };

  // ============================================================================
  // COMPACT MODE (Used inside Hall of Fame 'Overview' tab)
  // ============================================================================
  if (mode === 'compact') {
    const compactSource = currentSeasonItems.length > 0 ? currentSeasonItems : unlockItems;
    const visible = showMoreCompact ? compactSource.slice(0, 12) : compactSource.slice(0, 6);

    return (
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-card p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Hlavička */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm sm:text-base text-foreground flex items-center gap-2 flex-wrap">
                <span>Nově odemčeno v týmu</span>
                {newCount > 0 && (
                  <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1.5 py-0 h-4 border-none animate-pulse">
                    {newCount} NOVÝCH
                  </Badge>
                )}
                {latestMatchItems.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold"
                  >
                    +{latestMatchItems.length} v posledním zápase
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                Nejnovější pokořené milníky, jubilea a zápasové klenoty spoluhráčů v sezóně
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onNavigateToUnlocksTab && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToUnlocksTab}
                className="h-7 text-xs font-bold border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
              >
                Zápasová kronika ({currentSeasonItems.length})
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
            {compactSource.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreCompact(!showMoreCompact)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground h-7 px-2"
              >
                {showMoreCompact ? (
                  <>
                    Méně <ChevronUp className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Více ({compactSource.length}) <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Seznam odemčení */}
        <div className="space-y-2">{visible.map((item) => renderUnlockRow(item, false))}</div>
      </div>
    );
  }

  // ============================================================================
  // FULL MODE (Dedicated "Nově odemčeno / Kronika" Tab in Hall of Fame)
  // ============================================================================
  return (
    <div className="space-y-5">
      {/* 1. Přehledový KPI pás odemčených milníků */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setPeriodFilter('latest_match')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3',
            periodFilter === 'latest_match'
              ? 'border-amber-500/60 bg-amber-500/10 shadow-xs'
              : 'border-border/70 bg-card/60 hover:border-amber-500/40'
          )}
        >
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Swords className="h-3 w-3" />
              Poslední odehraný zápas
            </p>
            <p className="text-xl sm:text-2xl font-headline font-black text-foreground tabular-nums">
              {latestMatchItems.length}{' '}
              <span className="text-xs font-semibold text-muted-foreground">
                {latestMatchItems.length === 1
                  ? 'odemčený milník'
                  : latestMatchItems.length >= 2 && latestMatchItems.length <= 4
                  ? 'odemčené milníky'
                  : 'odemčených milníků'}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {latestMatchMeta?.opponent
                ? `${latestMatchMeta.round ? `${latestMatchMeta.round}. kolo • ` : ''}vs. ${latestMatchMeta.opponent}${
                    latestMatchMeta.score ? ` (${latestMatchMeta.score})` : ''
                  } • ${latestMatchMeta.dateStr || ''}`
                : 'Nejnovější uzavřené utkání'}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        <div
          onClick={() => setPeriodFilter('season')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3',
            periodFilter === 'season'
              ? 'border-primary/60 bg-primary/10 shadow-xs'
              : 'border-border/70 bg-card/60 hover:border-primary/40'
          )}
        >
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Aktuální sezóna 2026/27
            </p>
            <p className="text-xl sm:text-2xl font-headline font-black text-foreground tabular-nums">
              {currentSeasonItems.length}{' '}
              <span className="text-xs font-semibold text-muted-foreground">získaných odznaků</span>
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              Všechny milníky a klenoty pokořené v probíhajícím ročníku
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div
          onClick={() => setPeriodFilter('all')}
          className={cn(
            'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3',
            periodFilter === 'all'
              ? 'border-cyan-500/60 bg-cyan-500/10 shadow-xs'
              : 'border-border/70 bg-card/60 hover:border-cyan-500/40'
          )}
        >
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              <History className="h-3 w-3" />
              Celá historie HC Aces
            </p>
            <p className="text-xl sm:text-2xl font-headline font-black text-foreground tabular-nums">
              {unlockItems.length}{' '}
              <span className="text-xs font-semibold text-muted-foreground">celkem v klubu</span>
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              Kompletní sbírka včetně historických sezón
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <History className="h-5 w-5 text-cyan-500" />
          </div>
        </div>
      </div>

      {/* 2. Ovládací lišta filtrů a zobrazení */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-muted-foreground px-1.5 flex items-center gap-1">
            <ListFilter className="h-3.5 w-3.5" />
            Období:
          </span>
          <button
            type="button"
            onClick={() => setPeriodFilter('latest_match')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
              periodFilter === 'latest_match'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'bg-background/70 text-muted-foreground hover:text-foreground border border-border/60'
            )}
          >
            Poslední zápas ({latestMatchItems.length})
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('season')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
              periodFilter === 'season'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-background/70 text-muted-foreground hover:text-foreground border border-border/60'
            )}
          >
            Aktuální sezóna ({currentSeasonItems.length})
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
              periodFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-background/70 text-muted-foreground hover:text-foreground border border-border/60'
            )}
          >
            Celá historie ({unlockItems.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {currentUserId && (
            <div className="inline-flex items-center rounded-lg bg-background/80 p-0.5 border border-border/70">
              <button
                type="button"
                onClick={() => setPlayerScope('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-bold transition-all',
                  playerScope === 'all'
                    ? 'bg-muted text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Celý tým
              </button>
              <button
                type="button"
                onClick={() => setPlayerScope('me')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1',
                  playerScope === 'me'
                    ? 'bg-primary/15 text-primary shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <User className="h-3 w-3" />
                Jen moje
              </button>
            </div>
          )}

          <div className="inline-flex items-center rounded-lg bg-background/80 p-0.5 border border-border/70">
            <button
              type="button"
              onClick={() => setLayoutMode('by_match')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1',
                layoutMode === 'by_match'
                  ? 'bg-muted text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="h-3 w-3" />
              Podle zápasů
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-bold transition-all',
                layoutMode === 'list'
                  ? 'bg-muted text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Chronologicky
            </button>
          </div>

          {newCount > 0 && onClearNewHighlights && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearNewHighlights}
              className="h-7 text-xs font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Označit vše jako přečtené
            </Button>
          )}
        </div>
      </div>

      {/* 3. Výpis výsledků: Zápasová kronika vs Chronologický seznam */}
      {filteredFullItems.length === 0 ? (
        <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground space-y-2 border border-dashed rounded-2xl">
          <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="font-semibold text-foreground">Žádné odemčené milníky pro zvolený filtr</p>
          <p>Zkuste přepnout období na „Aktuální sezóna“ nebo „Celá historie“.</p>
        </div>
      ) : layoutMode === 'by_match' ? (
        <div className="space-y-4">
          {matchGroups.map((group) => {
            const isPreAppHistory = group.groupKey === 'historical-pre-app';

            return (
              <div
                key={group.groupKey}
                className={cn(
                  'rounded-2xl border p-3.5 sm:p-4 space-y-3 transition-all',
                  group.isLatestMatch
                    ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/[0.06] via-background to-card shadow-xs'
                    : 'border-border/70 bg-card/40'
                )}
              >
                {/* Hlavička zápasu */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {group.isLatestMatch && (
                      <Badge className="bg-amber-500 text-zinc-950 font-black text-[10px] px-2 py-0.5 border-none">
                        POSLEDNÍ ODEHRANÝ ZÁPAS
                      </Badge>
                    )}
                    {group.round != null && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/30"
                      >
                        {group.round}. KOLO
                      </Badge>
                    )}
                    <h4 className="font-headline font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                      {isPreAppHistory ? (
                        <span>Historické milníky (předchozí sezóny & archiv)</span>
                      ) : group.opponent ? (
                        <span>
                          HC Aces vs. {group.opponent}
                          {group.score ? (
                            <span className="ml-1.5 text-primary font-black">({group.score})</span>
                          ) : null}
                        </span>
                      ) : (
                        <span>Utkání ze dne {group.dateStr}</span>
                      )}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {group.dateStr && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        <Calendar className="h-3.5 w-3.5 text-primary/80" />
                        {group.dateStr}
                      </span>
                    )}
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {group.items.length}{' '}
                      {group.items.length === 1
                        ? 'odznak'
                        : group.items.length >= 2 && group.items.length <= 4
                        ? 'odznaky'
                        : 'odznaků'}
                    </Badge>
                  </div>
                </div>

                {/* Odznaky odemčené v tomto zápase */}
                <div className="grid grid-cols-1 gap-2">
                  {group.items.map((item) => renderUnlockRow(item, true))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">{filteredFullItems.map((item) => renderUnlockRow(item, false))}</div>
      )}
    </div>
  );
}
