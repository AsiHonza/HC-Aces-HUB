'use client';

import React, { useState, useMemo } from 'react';
import type { UserProfile } from '@/types';
import { 
  MilestoneWithHolders, 
  UpcomingMilestone, 
  TIER_CONFIG, 
  MilestoneTier, 
  MilestoneCategory,
  formatUnitWithCount,
  MILESTONE_SERIES,
  MilestoneSeries,
  TrophyLeader
} from '../utils/milestones';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { MilestoneDetailModal } from './MilestoneDetailModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Disc, 
  Award, 
  Shield, 
  ShieldCheck, 
  Star, 
  Zap, 
  Sparkles, 
  Users, 
  TrendingUp, 
  Filter, 
  User, 
  X, 
  Crosshair, 
  Target, 
  Timer, 
  Layers, 
  LayoutGrid,
  HeartHandshake,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HallOfFameTabProps {
  milestones: MilestoneWithHolders[];
  upcomingMilestones: UpcomingMilestone[];
  allUsers?: UserProfile[];
  currentUserId?: string | null;
  onOpenPlayerCareer?: (playerId: string) => void;
  trophyLeaders?: TrophyLeader[];
  newMilestoneIds?: Set<string>;
  initialPlayerId?: string;
}

type ViewMode = 'series' | 'compact';

const SPECIAL_FEAT_GROUPS = [
  {
    id: 'offense',
    title: 'Útočné klenoty & Ofenzivní galapředstavení',
    description: 'Hattricky, vícedílné gólové koncerty a nahrávačská genialita',
    iconName: 'Target',
    ids: [
      'feat-hattrick',
      'feat-2goals',
      'feat-4pts',
      'feat-5pts',
      'feat-assist-hattrick',
      'feat-4assists',
      'feat-quick-goal',
      'feat-ppg',
    ],
  },
  {
    id: 'goalies',
    title: 'Brankářská kouzla & Neprůstřelné zdi',
    description: 'Čistá konta v zápasech, play-off a 30+ zákrokové bitvy',
    iconName: 'ShieldCheck',
    ids: [
      'feat-match-shutout',
      'feat-playoff-shutout',
      'feat-30saves',
    ],
  },
  {
    id: 'stars',
    title: 'Hvězdné výkony & Pódia',
    description: 'Pravidelná dominance v anketě o hvězdy zápasu',
    iconName: 'Star',
    ids: [
      'feat-star-hattrick',
      'feat-podium-stars',
    ],
  },
  {
    id: 'clutch',
    title: 'Klíčové okamžiky & Samostatné nájezdy',
    description: 'Rozhodující trefy (GWG) a chladnokrevně proměněná trestná střílení (TS)',
    iconName: 'Crosshair',
    ids: [
      'feat-gwg',
      'feat-penalty-shot',
    ],
  },
];

export function HallOfFameTab({
  milestones,
  upcomingMilestones,
  allUsers = [],
  currentUserId,
  onOpenPlayerCareer,
  trophyLeaders = [],
  newMilestoneIds,
  initialPlayerId,
}: HallOfFameTabProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId || 'all');
  const [playerFilterMode, setPlayerFilterMode] = useState<'only_unlocked' | 'all_badges'>('only_unlocked');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('series');
  const [seriesActiveTier, setSeriesActiveTier] = useState<Record<string, string>>({});
  const [selectedMilestoneDetail, setSelectedMilestoneDetail] = useState<MilestoneWithHolders | null>(null);

  // Fast index by milestone ID
  const milestoneById = useMemo(() => {
    const map = new Map<string, MilestoneWithHolders>();
    milestones.forEach((m) => map.set(m.definition.id, m));
    return map;
  }, [milestones]);

  // Set of all progressive milestone IDs
  const progressiveIds = useMemo(() => {
    const set = new Set<string>();
    MILESTONE_SERIES.forEach((s) => s.milestoneIds.forEach((id) => set.add(id)));
    return set;
  }, []);

  // Sorted list of players for dropdown
  const availablePlayers = useMemo(() => {
    if (allUsers && allUsers.length > 0) {
      return [...allUsers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'cs'));
    }
    const map = new Map<string, { id: string; name: string; jerseyNumber?: number | null; photoURL?: string | null }>();
    milestones.forEach((m) => {
      m.holders.forEach((h) => {
        if (!map.has(h.id)) {
          map.set(h.id, { id: h.id, name: h.name, jerseyNumber: h.jerseyNumber, photoURL: h.photoURL });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }, [allUsers, milestones]);

  const effectivePlayerId = selectedPlayerId === 'me' 
    ? currentUserId 
    : (selectedPlayerId === 'all' ? null : selectedPlayerId);

  const selectedPlayerProfile = useMemo(() => {
    if (!effectivePlayerId) return null;
    return availablePlayers.find((p) => p.id === effectivePlayerId) || null;
  }, [effectivePlayerId, availablePlayers]);

  const playerUnlockedCount = useMemo(() => {
    if (!effectivePlayerId) return 0;
    return milestones.filter((m) => m.holders.some((h) => h.id === effectivePlayerId)).length;
  }, [effectivePlayerId, milestones]);

  // Filtered upcoming milestones for Radar
  const displayedUpcoming = useMemo(() => {
    if (!effectivePlayerId) return upcomingMilestones;
    return upcomingMilestones.filter((u) => u.playerId === effectivePlayerId);
  }, [upcomingMilestones, effectivePlayerId]);

  // Category filter matcher for a category
  const matchesCategory = (category: MilestoneCategory, milestoneId: string) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'games') return category === 'games';
    if (selectedCategory === 'points') {
      return category === 'points' || ['feat-4pts', 'feat-5pts', 'feat-ppg'].includes(milestoneId);
    }
    if (selectedCategory === 'scoring') {
      return (
        category === 'goals' ||
        category === 'assists' ||
        ['feat-hattrick', 'feat-2goals', 'feat-assist-hattrick', 'feat-4assists', 'feat-quick-goal', 'feat-gwg'].includes(milestoneId)
      );
    }
    if (selectedCategory === 'goalies') {
      return category === 'goalie_wins' || category === 'goalie_so';
    }
    if (selectedCategory === 'stars') {
      return category === 'stars' || category === 'mvp' || ['feat-star-hattrick', 'feat-podium-stars'].includes(milestoneId);
    }
    if (selectedCategory === 'special') {
      return category === 'special' || milestoneId.startsWith('feat-');
    }
    return true;
  };

  // Filtered series for 'series' view
  const filteredSeries = useMemo(() => {
    return MILESTONE_SERIES.filter((s) => {
      // Must have at least one loaded milestone in milestoneById
      const hasAny = s.milestoneIds.some((id) => milestoneById.has(id));
      if (!hasAny) return false;

      // 1. Category check
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'special') return false;
        if (!matchesCategory(s.category, s.milestoneIds[0])) return false;
      }

      // 2. Player check in 'only_unlocked' mode
      if (effectivePlayerId && playerFilterMode === 'only_unlocked') {
        const hasUnlockedInSeries = s.milestoneIds.some((id) => {
          const m = milestoneById.get(id);
          return m && m.holders.some((h) => h.id === effectivePlayerId);
        });
        if (!hasUnlockedInSeries) return false;
      }

      return true;
    });
  }, [selectedCategory, effectivePlayerId, playerFilterMode, milestoneById]);

  // Filtered special feats for 'series' view
  const filteredSpecialFeats = useMemo(() => {
    return milestones.filter((m) => {
      if (progressiveIds.has(m.definition.id)) return false;

      // 1. Category
      if (!matchesCategory(m.definition.category, m.definition.id)) return false;

      // 2. Tier
      if (tierFilter !== 'all' && m.definition.tier !== tierFilter) return false;

      // 3. Player filter
      if (effectivePlayerId && playerFilterMode === 'only_unlocked') {
        const isHolder = m.holders.some((h) => h.id === effectivePlayerId);
        if (!isHolder) return false;
      }

      return true;
    });
  }, [milestones, progressiveIds, selectedCategory, tierFilter, effectivePlayerId, playerFilterMode]);

  // Filtered flat milestones for 'compact' and 'cards' view
  const filteredFlatMilestones = useMemo(() => {
    return milestones.filter((m) => {
      // 1. Player filter
      if (effectivePlayerId && playerFilterMode === 'only_unlocked') {
        const isHolder = m.holders.some((h) => h.id === effectivePlayerId);
        if (!isHolder) return false;
      }

      // 2. Category filter
      if (!matchesCategory(m.definition.category, m.definition.id)) return false;

      // 3. Tier filter
      if (tierFilter !== 'all' && m.definition.tier !== tierFilter) return false;

      return true;
    });
  }, [milestones, effectivePlayerId, playerFilterMode, selectedCategory, tierFilter]);

  const getMilestoneIcon = (iconName: string, tier: MilestoneTier, className: string = 'h-5 w-5') => {
    const config = TIER_CONFIG[tier];
    switch (iconName) {
      case 'Crown':
        return <Crown className={cn(className, config.iconColor)} />;
      case 'Flame':
        return <Flame className={cn(className, config.iconColor)} />;
      case 'Disc':
        return <Disc className={cn(className, config.iconColor)} />;
      case 'Award':
        return <Award className={cn(className, config.iconColor)} />;
      case 'Shield':
        return <Shield className={cn(className, config.iconColor)} />;
      case 'ShieldCheck':
        return <ShieldCheck className={cn(className, config.iconColor)} />;
      case 'Star':
        return <Star className={cn(className, config.iconColor, 'fill-current')} />;
      case 'Trophy':
        return <Trophy className={cn(className, config.iconColor)} />;
      case 'Zap':
        return <Zap className={cn(className, config.iconColor)} />;
      case 'Sparkles':
        return <Sparkles className={cn(className, config.iconColor)} />;
      case 'Crosshair':
        return <Crosshair className={cn(className, config.iconColor)} />;
      case 'HeartHandshake':
        return <HeartHandshake className={cn(className, config.iconColor)} />;
      case 'Target':
        return <Target className={cn(className, config.iconColor)} />;
      case 'Timer':
        return <Timer className={cn(className, config.iconColor)} />;
      default:
        return <Award className={cn(className, config.iconColor)} />;
    }
  };

  // Helper to resolve the active milestone for a series
  const getActiveMilestoneForSeries = (series: MilestoneSeries): MilestoneWithHolders | null => {
    const seriesMilestones = series.milestoneIds
      .map((id) => milestoneById.get(id))
      .filter((m): m is MilestoneWithHolders => Boolean(m));

    if (seriesMilestones.length === 0) return null;

    // If explicit tier filter is set and series has it, follow tier filter
    if (tierFilter !== 'all') {
      const matchTier = seriesMilestones.find((m) => m.definition.tier === tierFilter);
      if (matchTier) return matchTier;
    }

    // If user clicked a tier on this series card
    const explicitChosenId = seriesActiveTier[series.id];
    if (explicitChosenId) {
      const found = seriesMilestones.find((m) => m.definition.id === explicitChosenId);
      if (found) return found;
    }

    // If a player is selected, default to their highest unlocked tier or next target
    if (effectivePlayerId) {
      const unlocked = seriesMilestones.filter((m) => m.holders.some((h) => h.id === effectivePlayerId));
      if (unlocked.length > 0) {
        return unlocked[unlocked.length - 1];
      }
    }

    return seriesMilestones[0] || null;
  };

  // Render a full detailed card (used in special feats and expanded list)
  const renderDetailedCard = (item: MilestoneWithHolders) => {
    const { definition, holders, totalHolders } = item;
    const tierConf = TIER_CONFIG[definition.tier];
    const isLegend = definition.tier === 'legend';
    const isDiamond = definition.tier === 'diamond';

    const playerHolderRecord = effectivePlayerId 
      ? holders.find((h) => h.id === effectivePlayerId) 
      : (currentUserId ? holders.find((h) => h.id === currentUserId) : null);
    const isUnlockedByTarget = Boolean(playerHolderRecord);
    const isNew = newMilestoneIds?.has(definition.id);

    return (
      <div
        key={definition.id}
        onClick={() => setSelectedMilestoneDetail(item)}
        className={cn(
          'rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br cursor-pointer hover:shadow-md group',
          tierConf.cardBorderClass,
          tierConf.glowClass,
          isLegend && 'ring-1 ring-purple-500/30',
          isDiamond && 'ring-1 ring-cyan-500/20'
        )}
        title="Kliknutím otevřete detail odznaku, držitele a radar adeptů"
      >
        {/* Horní lišta: Ikona, titul, Tier badge */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border shadow-inner mt-0.5',
                  isLegend
                    ? 'bg-gradient-to-br from-purple-500/25 to-pink-500/20 border-purple-400/50'
                    : isDiamond
                    ? 'bg-cyan-500/15 border-cyan-400/40'
                    : 'bg-muted/80 border-border/80'
                )}
              >
                {getMilestoneIcon(definition.iconName, definition.tier, 'h-5 w-5')}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-headline font-bold text-sm sm:text-base text-foreground leading-snug flex items-center gap-1.5 flex-wrap group-hover:text-primary transition-colors">
                  <span>{definition.title}</span>
                  {isLegend && <Crown className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0 inline" />}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {definition.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-start">
              {isNew && (
                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] px-1.5 py-0.5 animate-pulse border-none shadow-sm">
                  NOVÉ!
                </Badge>
              )}
              <Badge variant="outline" className={cn('text-xs px-2 py-0.5 font-bold', tierConf.badgeClass)}>
                {tierConf.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Dolní část: Držitelé odznaku + Hráčský status */}
        <div className="pt-3 mt-3 border-t border-border/60 space-y-2.5">
          {/* Držitelé */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Držitelé ({totalHolders})
            </span>

            {totalHolders > 0 ? (
              <div className="flex items-center -space-x-1.5 overflow-hidden">
                {holders.slice(0, 5).map((holder) => (
                  <div
                    key={holder.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenPlayerCareer) onOpenPlayerCareer(holder.id);
                    }}
                    title={`${holder.name} (${holder.value} ${formatUnitWithCount(holder.value, definition.unit, definition.id)}) - Klikněte pro kariéru`}
                    className="cursor-pointer transition-transform hover:scale-110 hover:z-10"
                  >
                    <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border shadow-xs">
                      <AvatarImage src={holder.photoURL || undefined} />
                      <AvatarFallback className="text-[10px] font-bold">
                        {holder.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                {totalHolders > 5 && (
                  <div className="h-7 w-7 rounded-full bg-muted border-2 border-background text-[10px] font-bold flex items-center justify-center text-muted-foreground">
                    +{totalHolders - 5}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/70 italic">
                Zatím nikdo
              </span>
            )}
          </div>

          {/* Seznam jmen držitelů (pokud jich je 1-3) */}
          {totalHolders > 0 && totalHolders <= 3 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {holders.map((h) => (
                <span
                  key={h.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenPlayerCareer) onOpenPlayerCareer(h.id);
                  }}
                  className={cn(
                    "cursor-pointer text-xs px-2 py-0.5 rounded-md font-medium transition-colors",
                    effectivePlayerId === h.id
                      ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                      : "bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground"
                  )}
                >
                  {h.name} <strong className="text-primary font-bold">({h.value})</strong>
                </span>
              ))}
            </div>
          )}

          {/* Status vybraného / přihlášeného hráče */}
          {(effectivePlayerId || currentUserId) && (
            <div className="pt-1">
              {isUnlockedByTarget ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {effectivePlayerId && effectivePlayerId !== currentUserId
                    ? `Hráč splnil (${playerHolderRecord?.value} ${formatUnitWithCount(playerHolderRecord?.value || 0, definition.unit, definition.id)})`
                    : `Odemčeno (${playerHolderRecord?.value} ${formatUnitWithCount(playerHolderRecord?.value || 0, definition.unit, definition.id)})`}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground flex items-center justify-between bg-muted/30 px-2.5 py-1 rounded-lg">
                  <span>Status hráče:</span>
                  <span className="font-semibold text-muted-foreground">Zatím neodemčeno</span>
                </div>
              )}
            </div>
          )}

          {/* Rychlá nápověda pro otevření detailu */}
          <div className="pt-1.5 flex items-center justify-between text-xs text-muted-foreground group-hover:text-primary transition-colors border-t border-border/40">
            <span className="font-semibold text-primary/80 flex items-center gap-1">
              Detail odznaku & adepti <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              Cíl: {definition.target} {definition.unit}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pt-1 pb-6 px-1 sm:px-4">
      {/* 1. RADAR BLÍŽÍCÍCH SE MILNÍKŮ */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-3.5 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base sm:text-lg text-foreground flex items-center gap-2 flex-wrap">
                Blížící se jubilea {selectedPlayerProfile ? `hráče ${selectedPlayerProfile.name}` : 'týmu'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Kdo má kousek k dalšímu odznaku a milníku v dresu HC Aces
              </p>
            </div>
          </div>
          {(() => {
            const count = displayedUpcoming.length;
            const distinctPlayers = new Set(displayedUpcoming.map((u) => u.playerId)).size;
            const milestoneLabel = count === 1 
              ? '1 milník na dosah' 
              : count >= 2 && count <= 4 
              ? `${count} milníky na dosah` 
              : `${count} milníků na dosah`;

            return (
              <span className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 self-start sm:self-center">
                {milestoneLabel}
                {!selectedPlayerProfile && distinctPlayers > 1 && (
                  <span className="opacity-80"> ({distinctPlayers} {distinctPlayers <= 4 ? 'hráči' : 'hráčů'})</span>
                )}
              </span>
            );
          })()}
        </div>

        {displayedUpcoming.length === 0 ? (
          <div className="py-6 text-center text-xs sm:text-sm text-muted-foreground">
            {selectedPlayerProfile 
              ? `Hráč ${selectedPlayerProfile.name} nemá v této chvíli žádný bezprostředně blížící se milník.`
              : 'Všichni hráči mají k nejbližším milníkům ještě kousek cesty. Sledujte průběžně po odehraných zápasech!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {displayedUpcoming.map((item) => {
              const tierConf = TIER_CONFIG[item.milestone.tier];
              return (
                <div
                  key={`${item.playerId}-${item.milestone.id}`}
                  onClick={() => onOpenPlayerCareer && onOpenPlayerCareer(item.playerId)}
                  className="group cursor-pointer rounded-xl border border-border/80 bg-background/90 hover:bg-muted/40 p-3.5 sm:p-4 transition-all hover:shadow-md hover:border-amber-500/40 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-9 w-9 border border-border shrink-0">
                        <AvatarImage src={item.playerPhoto || undefined} />
                        <AvatarFallback className="text-xs font-bold">
                          {item.playerName.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {item.playerName}
                        </p>
                        {item.playerJersey && (
                          <p className="text-xs text-muted-foreground">#{item.playerJersey}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        const m = milestoneById.get(item.milestone.id);
                        if (m) setSelectedMilestoneDetail(m);
                      }}
                      className={cn('text-xs px-2 py-0.5 shrink-0 font-bold cursor-pointer hover:opacity-85', tierConf.badgeClass)}
                      title="Zobrazit detail odznaku"
                    >
                      {tierConf.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-start justify-between gap-2 text-xs sm:text-sm">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          const m = milestoneById.get(item.milestone.id);
                          if (m) setSelectedMilestoneDetail(m);
                        }}
                        className="font-bold text-foreground hover:text-amber-500 hover:underline transition-colors leading-snug break-words flex-1 min-w-0"
                        title="Zobrazit detail odznaku a radar adeptů"
                      >
                        {item.milestone.title}
                      </span>
                      <span className="text-amber-500 font-black tabular-nums shrink-0 mt-0.5">
                        {item.current}/{item.target}
                      </span>
                    </div>

                    <Progress value={item.progressPct} className="h-2 bg-muted rounded-full" />

                    <p className="text-xs text-muted-foreground flex items-center justify-between pt-0.5">
                      <span>Chybí jen:</span>
                      <strong className="text-foreground font-bold text-xs sm:text-sm">
                        {item.remaining} {formatUnitWithCount(item.remaining, item.milestone.unit, item.milestone.id)}
                      </strong>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. KRÁLOVÉ SÍNĚ SLÁVY */}
      {trophyLeaders && trophyLeaders.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-background to-card p-3.5 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-500/40 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                <Crown className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-base sm:text-lg text-foreground flex items-center gap-2 flex-wrap">
                  Králové Síně slávy
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Hráči s nejbohatší sbírkou klubových trofejí a nejvzácnějších odznaků
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground self-start sm:self-center">
              Klepnutím na hráče vyfiltrujete jeho odznaky
            </span>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-none snap-x -mx-1 px-1 sm:mx-0 sm:px-0">
            {trophyLeaders.slice(0, 5).map((leader, idx) => {
              const isSelected = selectedPlayerId === leader.id || (selectedPlayerId === 'me' && currentUserId === leader.id);
              const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              const rankColor = idx === 0 
                ? 'border-amber-500/50 bg-amber-500/10 shadow-amber-500/10' 
                : idx === 1 
                ? 'border-slate-300 dark:border-zinc-500/40 bg-slate-500/5' 
                : idx === 2 
                ? 'border-amber-700/40 bg-amber-700/5' 
                : 'border-border/70 bg-card';

              return (
                <div
                  key={leader.id}
                  onClick={() => setSelectedPlayerId(leader.id === selectedPlayerId ? 'all' : leader.id)}
                  className={cn(
                    'group cursor-pointer rounded-xl border p-3 sm:p-3.5 transition-all flex flex-col justify-between gap-2.5 hover:shadow-md relative overflow-hidden select-none min-w-[210px] sm:min-w-0 snap-start shrink-0 sm:shrink',
                    rankColor,
                    isSelected && 'ring-2 ring-primary border-primary bg-primary/5'
                  )}
                  title={`Klikněte pro zobrazení odznaků hráče ${leader.name}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-black shrink-0 w-5 text-center">
                        {rankMedal}
                      </span>
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border shrink-0">
                        <AvatarImage src={leader.photoURL || undefined} />
                        <AvatarFallback className="text-xs font-bold">
                          {leader.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {leader.name}
                        </p>
                        {leader.jerseyNumber && (
                          <p className="text-xs text-muted-foreground">#{leader.jerseyNumber}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-sm sm:text-base text-foreground tabular-nums">
                        {leader.totalBadges}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground block -mt-0.5">
                        {formatUnitWithCount(leader.totalBadges, 'odznaků')}
                      </span>
                    </div>
                  </div>

                  {/* Rozpis medailí */}
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/40 text-xs font-semibold">
                    <div className="flex items-center gap-2 flex-wrap">
                      {leader.legendCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-bold" title="Legendární odznaky">
                          👑 {leader.legendCount}
                        </span>
                      )}
                      {leader.diamondCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-cyan-600 dark:text-cyan-400 font-bold" title="Diamantové odznaky">
                          💎 {leader.diamondCount}
                        </span>
                      )}
                      {leader.goldCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold" title="Zlaté odznaky">
                          🥇 {leader.goldCount}
                        </span>
                      )}
                      {leader.silverCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-slate-700 dark:text-zinc-300 font-bold" title="Stříbrné odznaky">
                          🥈 {leader.silverCount}
                        </span>
                      )}
                      {leader.bronzeCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-800 dark:text-amber-600 font-bold" title="Bronzové odznaky">
                          🥉 {leader.bronzeCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. FILTR PODLE HRÁČE A OVLÁDACÍ PRVKY */}
      <div className="space-y-4 pb-2 border-b">
        {/* Hráčský filtr bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedPlayerId('all')}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all touch-manipulation',
                selectedPlayerId === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Users className="h-4 w-4" />
              <span>Celý tým</span>
            </button>

            {currentUserId && (
              <button
                onClick={() => setSelectedPlayerId(selectedPlayerId === 'me' ? 'all' : 'me')}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all touch-manipulation',
                  selectedPlayerId === 'me'
                    ? 'bg-amber-500 text-amber-950 shadow-sm'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                )}
              >
                <Star className="h-4 w-4 fill-current" />
                <span>Moje odznaky</span>
              </button>
            )}
          </div>

          {/* Select výběru konkrétního hráče */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-72">
              <Select
                value={selectedPlayerId}
                onValueChange={(val) => setSelectedPlayerId(val)}
              >
                <SelectTrigger className="h-10 text-xs sm:text-sm bg-background rounded-xl">
                  <div className="flex items-center gap-2 truncate">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Filtrovat dle hráče..." />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all" className="text-xs sm:text-sm font-semibold">
                    👥 Všichni hráči týmu
                  </SelectItem>
                  {currentUserId && (
                    <SelectItem value="me" className="text-xs sm:text-sm font-semibold text-amber-500">
                      ⭐ Moje odznaky (přihlášený)
                    </SelectItem>
                  )}
                  <div className="px-2 py-1 text-xs uppercase font-bold text-muted-foreground border-t my-1">
                    Hráči na soupisce
                  </div>
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id} className="text-xs sm:text-sm">
                      {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {effectivePlayerId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPlayerId('all')}
                className="h-10 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                title="Zrušit filtr hráče"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Informační lišta o aktivním filtru hráče */}
        {selectedPlayerProfile && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs sm:text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 border border-primary/30 shrink-0">
                <AvatarImage src={selectedPlayerProfile.photoURL || undefined} />
                <AvatarFallback className="text-xs font-bold">
                  {selectedPlayerProfile.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-sm truncate">
                  {selectedPlayerProfile.name} {selectedPlayerProfile.jerseyNumber ? `#${selectedPlayerProfile.jerseyNumber}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Získáno <strong className="text-primary font-bold">{playerUnlockedCount}</strong> z {milestones.length} klubových odznaků ({Math.round((playerUnlockedCount / milestones.length) * 100)} %)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="flex items-center gap-1 bg-background/80 rounded-xl p-1 border">
                <button
                  onClick={() => setPlayerFilterMode('only_unlocked')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all touch-manipulation',
                    playerFilterMode === 'only_unlocked' 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Jen získané ({playerUnlockedCount})
                </button>
                <button
                  onClick={() => setPlayerFilterMode('all_badges')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all touch-manipulation',
                    playerFilterMode === 'all_badges' 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Všechny odznaky
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlayerId('all')}
                className="h-8 px-2.5 text-xs font-semibold"
              >
                Zrušit filtr
              </Button>
            </div>
          </div>
        )}

        {/* Kategorie & Tier filtry & Přepínač zobrazení */}
        <div className="flex flex-col gap-3 pt-1">
          {/* Horní řada: Kategorie */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-none">
              {[
                { id: 'all', label: 'Všechny odznaky' },
                { id: 'games', label: 'Zápasy' },
                { id: 'points', label: 'Body' },
                { id: 'scoring', label: 'Góly & Asistence' },
                { id: 'goalies', label: 'Brankáři' },
                { id: 'stars', label: 'Hvězdy & MVP' },
                { id: 'special', label: 'Speciální klenoty' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all touch-manipulation',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dolní řada: Tier filtr + Segmentovaný přepínač zobrazení */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
            {/* Tier filtr */}
            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto max-w-full pb-0.5 scrollbar-none">
              <Filter className="h-3.5 w-3.5 text-muted-foreground mr-0.5 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground mr-0.5 shrink-0">Úroveň:</span>
              {[
                { id: 'all', label: 'Vše' },
                { id: 'bronze', label: 'Bronz', color: 'text-amber-700 dark:text-amber-500' },
                { id: 'silver', label: 'Stříbro', color: 'text-zinc-300' },
                { id: 'gold', label: 'Zlato', color: 'text-amber-400' },
                { id: 'diamond', label: 'Diamant', color: 'text-cyan-400' },
                { id: 'legend', label: 'Legenda', color: 'text-purple-400' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTierFilter(t.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 touch-manipulation',
                    tierFilter === t.id
                      ? 'bg-foreground text-background border-foreground shadow-xs'
                      : 'bg-transparent text-muted-foreground border-border/60 hover:text-foreground'
                  )}
                >
                  <span className={t.color}>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Přepínač zobrazení (Série vs. Kompaktní vitrína) */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('series')}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all touch-manipulation',
                  viewMode === 'series'
                    ? 'bg-background text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Série & Klenoty: 8 interaktivních postupových řad + zápasové klenoty (doporučeno pro minimální scrollování)"
              >
                <Layers className="h-4 w-4 text-primary" />
                <span>Série & Klenoty</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all touch-manipulation',
                  viewMode === 'compact'
                    ? 'bg-background text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Kompaktní vitrína: Rychlý přehled všech odznaků na jedné obrazovce"
              >
                <LayoutGrid className="h-4 w-4 text-amber-500" />
                <span>Vitrína všech odznaků</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HLAVNÍ OBSAHOVÁ ČÁST PODLE REŽIMU ZOBRAZENÍ */}
      {viewMode === 'series' && (
        <div className="space-y-8">
          {/* A. 8 POSTUPOVÝCH SÉRIÍ */}
          {filteredSeries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="font-headline font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Postupové série HC Aces
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      8 postupových řad • 5 stupňů (Bronz ➔ Legenda)
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Klepnutím na kterýkoliv stupeň zobrazíte jeho splnění, držitele i historii
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSeries.map((series) => {
                  const seriesMilestones = series.milestoneIds
                    .map((id) => milestoneById.get(id))
                    .filter((m): m is MilestoneWithHolders => Boolean(m));

                  if (seriesMilestones.length === 0) return null;

                  const activeM = getActiveMilestoneForSeries(series);
                  if (!activeM) return null;

                  const activeTierConf = TIER_CONFIG[activeM.definition.tier];

                  const playerHolderRecord = effectivePlayerId
                    ? activeM.holders.find((h) => h.id === effectivePlayerId)
                    : (currentUserId ? activeM.holders.find((h) => h.id === currentUserId) : null);
                  const isCurrentUnlocked = Boolean(playerHolderRecord);
                  const currentPlayerValue = playerHolderRecord?.value ?? 0;

                  return (
                    <div
                      key={series.id}
                      className={cn(
                        'rounded-2xl border p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br',
                        activeTierConf.cardBorderClass,
                        activeTierConf.glowClass
                      )}
                    >
                      {/* Hlavička série */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 rounded-xl bg-background/80 border border-border/80 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                              {getMilestoneIcon(series.iconName, 'gold', 'h-5 w-5')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-headline font-bold text-sm sm:text-base text-foreground leading-snug">
                                {series.title}
                              </h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                                {series.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-start">
                            {seriesMilestones.some((m) => newMilestoneIds?.has(m.definition.id)) && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] px-1.5 py-0.5 animate-pulse border-none shadow-sm">
                                NOVÉ!
                              </Badge>
                            )}
                            <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 font-bold', activeTierConf.badgeClass)}>
                              {activeTierConf.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Interaktivní 5-stupňový stepper */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                            <span className="font-bold text-foreground/80">Stupně série:</span>
                            <span className="text-xs">Klepnutím přepnete úroveň</span>
                          </div>

                          <div className="grid grid-cols-5 gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-xl bg-muted/40 border border-border/60">
                            {seriesMilestones.map((m) => {
                              const tConf = TIER_CONFIG[m.definition.tier];
                              const isActive = activeM.definition.id === m.definition.id;
                              const isUnlocked = effectivePlayerId
                                ? m.holders.some((h) => h.id === effectivePlayerId)
                                : (currentUserId ? m.holders.some((h) => h.id === currentUserId) : false);
                              const isStepNew = Boolean(newMilestoneIds?.has(m.definition.id));

                              return (
                                <button
                                  key={m.definition.id}
                                  type="button"
                                  onClick={() => setSeriesActiveTier((prev) => ({ ...prev, [series.id]: m.definition.id }))}
                                  className={cn(
                                    'relative flex flex-col items-center justify-center py-2 sm:py-2.5 px-0.5 sm:px-1 rounded-lg transition-all touch-manipulation border text-center select-none min-h-[66px] sm:min-h-[72px]',
                                    isActive
                                      ? 'bg-background shadow-sm ring-2 ring-primary border-primary z-10'
                                      : 'bg-background/40 hover:bg-background/80 border-transparent hover:border-border/60',
                                    isUnlocked && !isActive && 'border-emerald-500/40 bg-emerald-500/5'
                                  )}
                                >
                                  {/* Značka splnění hráčem */}
                                  {isUnlocked ? (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                                      ✓
                                    </span>
                                  ) : isStepNew ? (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                                  ) : null}

                                  {/* Tier ikona */}
                                  <div className="mb-0.5">
                                    {getMilestoneIcon(m.definition.iconName, m.definition.tier, 'h-4 w-4 sm:h-5 sm:w-5')}
                                  </div>

                                  {/* Cílová hodnota */}
                                  <span className={cn('text-xs sm:text-sm font-black tabular-nums leading-tight', isActive ? 'text-foreground' : 'text-foreground/80')}>
                                    {m.definition.target}
                                  </span>

                                  {/* Popisek úrovně */}
                                  <span className={cn('text-[10px] sm:text-xs font-bold uppercase tracking-tight truncate max-w-full px-0.5', tConf.iconColor)}>
                                    {tConf.label}
                                  </span>

                                  {/* Počet držitelů */}
                                  <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1 font-medium">
                                    <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    {m.totalHolders}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Detail zvoleného stupně */}
                        <div
                          onClick={() => setSelectedMilestoneDetail(activeM)}
                          className="mt-3 p-3.5 sm:p-4 rounded-xl bg-background/60 hover:bg-background/90 border border-border/60 hover:border-primary/40 space-y-2.5 cursor-pointer transition-all group"
                          title="Kliknutím zobrazíte detail odznaku a radar adeptů"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                                  {activeM.definition.title}
                                </h5>
                                <Badge variant="outline" className={cn('text-xs px-2 py-0.5 font-bold', activeTierConf.badgeClass)}>
                                  {activeTierConf.label}
                                </Badge>
                                <span className="text-xs text-primary/80 font-bold inline-flex items-center gap-1 opacity-90 group-hover:underline">
                                  Detail & Adepti <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                                {activeM.definition.description}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs text-muted-foreground block font-medium">Cíl</span>
                              <span className="text-sm sm:text-base font-black text-foreground">
                                {activeM.definition.target} {formatUnitWithCount(activeM.definition.target, activeM.definition.unit, activeM.definition.id)}
                              </span>
                            </div>
                          </div>

                          {/* Status vybraného hráče */}
                          {(effectivePlayerId || currentUserId) && (
                            <div className="pt-0.5">
                              {isCurrentUnlocked ? (
                                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {effectivePlayerId && effectivePlayerId !== currentUserId
                                    ? `Hráč splnil (${currentPlayerValue} ${formatUnitWithCount(currentPlayerValue, activeM.definition.unit, activeM.definition.id)})`
                                    : `Odemčeno (${currentPlayerValue} ${formatUnitWithCount(currentPlayerValue, activeM.definition.unit, activeM.definition.id)})`}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground flex items-center justify-between bg-muted/40 px-3 py-1.5 rounded-lg">
                                  <span>Stav vybraného hráče:</span>
                                  <span className="font-semibold text-muted-foreground">
                                    {currentPlayerValue > 0 
                                      ? `${currentPlayerValue}/${activeM.definition.target} (zbývá ${Math.max(0, activeM.definition.target - currentPlayerValue)})`
                                      : 'Zatím nesplněno'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dolní část: Držitelé odznaku */}
                      <div className="pt-3 mt-3 border-t border-border/60 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Držitelé tohoto stupně ({activeM.totalHolders}):
                          </span>

                          {activeM.totalHolders > 0 ? (
                            <div className="flex items-center -space-x-1.5 overflow-hidden">
                              {activeM.holders.slice(0, 5).map((holder) => (
                                <div
                                  key={holder.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenPlayerCareer) onOpenPlayerCareer(holder.id);
                                  }}
                                  title={`${holder.name} (${holder.value} ${formatUnitWithCount(holder.value, activeM.definition.unit, activeM.definition.id)})`}
                                  className="cursor-pointer transition-transform hover:scale-110 hover:z-10"
                                >
                                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-background ring-1 ring-border">
                                    <AvatarImage src={holder.photoURL || undefined} />
                                    <AvatarFallback className="text-[10px] font-bold">
                                      {holder.name.substring(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              ))}
                              {activeM.totalHolders > 5 && (
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted border-2 border-background text-[10px] font-bold flex items-center justify-center text-muted-foreground">
                                  +{activeM.totalHolders - 5}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/70 italic">
                              Zatím nikdo
                            </span>
                          )}
                        </div>

                        {/* Jména držitelů (pokud jich je 1-3) */}
                        {activeM.totalHolders > 0 && activeM.totalHolders <= 3 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {activeM.holders.map((h) => (
                              <span
                                key={h.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenPlayerCareer) onOpenPlayerCareer(h.id);
                                }}
                                className={cn(
                                  "cursor-pointer text-xs px-2 py-0.5 rounded-md font-medium transition-colors",
                                  effectivePlayerId === h.id
                                    ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                                    : "bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground"
                                )}
                              >
                                {h.name} <strong className="text-primary font-bold">({h.value})</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. SPECIÁLNÍ ZÁPASOVÉ KLENOTY & DISCIPLÍNA */}
          {filteredSpecialFeats.length > 0 && (
            <div className="pt-4 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                      Zápasové klenoty & Disciplína
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                        {filteredSpecialFeats.length} speciálních odznaků
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Mimořádné zápasové výkony, střelecká galapředstavení, čistá konta a fair-play
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Tématické skupiny speciálních odznaků */}
              <div className="space-y-6">
                {SPECIAL_FEAT_GROUPS.map((group) => {
                  const groupMilestones = filteredSpecialFeats.filter((m) => group.ids.includes(m.definition.id));
                  if (groupMilestones.length === 0) return null;

                  return (
                    <div key={group.id} className="space-y-3">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="font-bold text-foreground text-sm sm:text-base flex items-center gap-1.5">
                          {group.title}
                        </span>
                        <span>•</span>
                        <span className="text-xs sm:text-sm">{group.description}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                        {groupMilestones.map((item) => renderDetailedCard(item))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prázdný stav v režimu Série */}
          {filteredSeries.length === 0 && filteredSpecialFeats.length === 0 && (
            <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground space-y-2 border border-dashed rounded-2xl">
              <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="font-semibold text-foreground">Žádné odznaky neodpovídají zadanému filtru</p>
              <p>Zkuste zvolit jinou kategorii, úroveň nebo zrušit filtr hráče.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. KOMPAKTNÍ VITRÍNA (DENSE BADGE SHOWCASE GRID) */}
      {viewMode === 'compact' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground pb-1">
            <span>
              Zobrazeno <strong className="text-foreground font-bold">{filteredFlatMilestones.length}</strong> odznaků ve vitríně
            </span>
            <span className="text-xs hidden sm:inline">
              Klepnutím na odznak zobrazíte detail, držitele a radar adeptů
            </span>
          </div>

          {filteredFlatMilestones.length === 0 ? (
            <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground space-y-2 border border-dashed rounded-2xl">
              <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="font-semibold text-foreground">Žádné odznaky neodpovídají zadanému filtru</p>
              <p>Zkuste zvolit jinou kategorii nebo úroveň.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
              {filteredFlatMilestones.map((item) => {
                const { definition, holders, totalHolders } = item;
                const tierConf = TIER_CONFIG[definition.tier];
                const isLegend = definition.tier === 'legend';
                const isDiamond = definition.tier === 'diamond';

                const playerHolderRecord = effectivePlayerId 
                  ? holders.find((h) => h.id === effectivePlayerId) 
                  : (currentUserId ? holders.find((h) => h.id === currentUserId) : null);
                const isUnlockedByTarget = Boolean(playerHolderRecord);

                return (
                  <div
                    key={definition.id}
                    onClick={() => setSelectedMilestoneDetail(item)}
                    title={`${definition.title}: ${definition.description} (${holders.length} držitelů) - Klikněte pro detail odznaku a žebříček adeptů`}
                    className={cn(
                      'rounded-xl border p-3 transition-all duration-150 flex items-center gap-3 relative overflow-hidden bg-gradient-to-br hover:shadow-md cursor-pointer select-none group',
                      tierConf.cardBorderClass,
                      tierConf.glowClass,
                      isUnlockedByTarget && 'ring-1 ring-emerald-500/40 bg-emerald-500/5'
                    )}
                  >
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner',
                        isLegend
                          ? 'bg-gradient-to-br from-purple-500/25 to-pink-500/20 border-purple-400/50'
                          : isDiamond
                          ? 'bg-cyan-500/15 border-cyan-400/40'
                          : 'bg-muted/80 border-border/80'
                      )}
                    >
                      {getMilestoneIcon(definition.iconName, definition.tier, 'h-5 w-5')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h5 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {definition.title}
                        </h5>
                        <div className="flex items-center gap-1 shrink-0">
                          {newMilestoneIds?.has(definition.id) && (
                            <Badge className="bg-emerald-500 text-white font-black text-[9px] px-1.5 py-0 h-4 border-none animate-pulse">
                              NOVÉ!
                            </Badge>
                          )}
                          {isUnlockedByTarget && (
                            <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground mt-1">
                        <span className={cn('font-semibold truncate', tierConf.iconColor)}>
                          {tierConf.label} • {definition.target} {definition.unit}
                        </span>
                        <span className="tabular-nums font-bold flex items-center gap-0.5 shrink-0 text-foreground/80">
                          <Users className="h-3 w-3" />
                          {totalHolders}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL DETAILU ODZNAKU, DRŽITELŮ A ADEPTŮ */}
      <MilestoneDetailModal
        milestone={selectedMilestoneDetail}
        isOpen={Boolean(selectedMilestoneDetail)}
        onClose={() => setSelectedMilestoneDetail(null)}
        onOpenPlayerCareer={onOpenPlayerCareer}
        currentUserId={currentUserId}
      />
    </div>
  );
}
