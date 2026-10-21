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
import { DynamicDuoDetailModal } from './DynamicDuoDetailModal';
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
  ChevronRight,
  Medal
} from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import type { TeamChemistryData, DynamicDuoRecord } from '../utils/chemistry';

interface HallOfFameTabProps {
  milestones: MilestoneWithHolders[];
  upcomingMilestones: UpcomingMilestone[];
  allUsers?: UserProfile[];
  currentUserId?: string | null;
  onOpenPlayerCareer?: (playerId: string) => void;
  trophyLeaders?: TrophyLeader[];
  teamChemistry?: TeamChemistryData;
  newMilestoneIds?: Set<string>;
  initialPlayerId?: string;
}

type ViewMode = 'series' | 'compact';

const SPECIAL_FEAT_GROUPS = [
  {
    id: 'defense_team',
    title: 'Defenzivní pilíře, postové klenoty & černá práce',
    description: 'Čistá konta v poli, ocenění bez kanadských bodů, ubráněné těsné výhry a příspěvky obránců',
    iconName: 'ShieldCheck',
    ids: [
      'feat-unsung-hero',
      'feat-skater-shutout',
      'feat-win-talisman',
      'feat-defense-qb',
      'feat-defense-scorer',
      'feat-shot-suppressor',
      'feat-clutch-closer',
      'feat-center-playmaker',
      'feat-wing-sniper',
    ],
  },
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
      'feat-wing-sniper',
      'feat-center-playmaker',
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
  teamChemistry,
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
  const [selectedDuoDetail, setSelectedDuoDetail] = useState<DynamicDuoRecord | null>(null);
  const [duoUnitFilter, setDuoUnitFilter] = useState<'attack' | 'defense'>('attack');

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
    if (selectedCategory === 'games') return category === 'games' || category === 'ironman';
    if (selectedCategory === 'defense') {
      return (
        category === 'defense' ||
        category === 'ironman' ||
        [
          'feat-unsung-hero',
          'feat-skater-shutout',
          'feat-win-talisman',
          'feat-defense-qb',
          'feat-defense-scorer',
          'feat-shot-suppressor',
          'feat-clutch-closer',
        ].includes(milestoneId)
      );
    }
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
                      <span className="text-xs font-black shrink-0 w-6 text-center tabular-nums inline-flex items-center justify-center">
                        {idx === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500 fill-amber-500 mr-0.5" />}
                        {idx === 1 && <Trophy className="h-3.5 w-3.5 text-slate-300 fill-slate-300 mr-0.5" />}
                        {idx === 2 && <Trophy className="h-3.5 w-3.5 text-amber-700 fill-amber-700 mr-0.5" />}
                        #{idx + 1}
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
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold" title="Legendární odznaky">
                          <Crown className="h-3 w-3 fill-current" />
                          <span>{leader.legendCount}</span>
                        </span>
                      )}
                      {leader.diamondCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold" title="Diamantové odznaky">
                          <Sparkles className="h-3 w-3 fill-current" />
                          <span>{leader.diamondCount}</span>
                        </span>
                      )}
                      {leader.goldCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold" title="Zlaté odznaky">
                          <Medal className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span>{leader.goldCount}</span>
                        </span>
                      )}
                      {leader.silverCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-zinc-300 font-bold" title="Stříbrné odznaky">
                          <Medal className="h-3 w-3 text-slate-300 fill-slate-300" />
                          <span>{leader.silverCount}</span>
                        </span>
                      )}
                      {leader.bronzeCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-600 font-bold" title="Bronzové odznaky">
                          <Medal className="h-3 w-3 text-amber-700 fill-amber-700" />
                          <span>{leader.bronzeCount}</span>
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

      {/* 2B. DYNAMIC DUO (CHEMIE HRÁČŮ) */}
      {teamChemistry && (
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-card p-3.5 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                    <HeartHandshake className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-headline font-bold text-sm sm:text-base text-foreground">
                        Dynamic Duo – Chemie na ledě
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30 font-bold"
                      >
                        Archivováno od 25. 10. 2026
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Souhra v rámci útočných trojic (LK–C–PK), obranných párů (LO–PO) a gólových akcí Ú + O
                    </p>
                  </div>
                </div>

                {(teamChemistry.topDuos.length > 0 ||
                  (teamChemistry.topDefensePairs?.length || 0) > 0) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {teamChemistry.topDuos.length > 0 &&
                      (teamChemistry.topDefensePairs?.length || 0) > 0 && (
                        <div className="inline-flex items-center bg-muted/70 p-0.5 rounded-xl border border-border/60">
                          <button
                            type="button"
                            onClick={() => setDuoUnitFilter('attack')}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all',
                              duoUnitFilter === 'attack'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Flame className="h-3 w-3" />
                            <span>Útočná souhra ({teamChemistry.topDuos.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDuoUnitFilter('defense')}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all',
                              duoUnitFilter === 'defense'
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Shield className="h-3 w-3" />
                            <span>Obranné páry ({teamChemistry.topDefensePairs.length})</span>
                          </button>
                        </div>
                      )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const activeList =
                          duoUnitFilter === 'defense' && (teamChemistry.topDefensePairs?.length || 0) > 0
                            ? teamChemistry.topDefensePairs
                            : teamChemistry.topDuos;
                        if (activeList[0]) setSelectedDuoDetail(activeList[0]);
                      }}
                      className="h-7 px-2.5 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 shrink-0"
                    >
                      <span>Detail souhry</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </div>

              {teamChemistry.topDuos.length === 0 &&
              (teamChemistry.topDefensePairs?.length || 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-primary/30 bg-card/60 p-4 text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground text-xs sm:text-sm">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <span>Přesná evidence souhry startuje od zápasu 25. 10. 2026</span>
                  </div>
                  <p className="leading-relaxed">
                    Aby byla statistika 100% věrná realitě, počítá se <strong>Dynamic Duo</strong> čistě ze zápasů s archivovanou sestavou:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="rounded-lg bg-muted/50 border border-border/60 p-2.5">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Útočné trojice (Ú + Ú)</span>
                      </div>
                      <p className="text-[11px] mt-0.5">
                        Dvojice útočníků nasazených spolu ve stejné útočné lajně (1., 2. nebo 3. útok).
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 border border-border/60 p-2.5">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span>Obranné páry (O + O)</span>
                      </div>
                      <p className="text-[11px] mt-0.5">
                        Dvojice obránců ve stejném obranném páru (1. nebo 2. obrana).
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 border border-border/60 p-2.5">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <HeartHandshake className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>Spolupráce Ú + O</span>
                      </div>
                      <p className="text-[11px] mt-0.5">
                        Gólová kombinace útočníka a obránce při nahrávce na gól napříč lajnami.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(duoUnitFilter === 'defense' && (teamChemistry.topDefensePairs?.length || 0) > 0
                    ? teamChemistry.topDefensePairs
                    : teamChemistry.topDuos
                  )
                    .slice(0, 4)
                    .map((duo, idx) => {
                      const isDef = duo.unitType === 'defense';
                      const totalG = Math.max(1, duo.totalCombinedGoals);
                      const dir1Pct = Math.round((duo.p1GoalsFromP2 / totalG) * 100);
                      const dir2Pct = 100 - dir1Pct;
                      const isBothWays = duo.p1GoalsFromP2 > 0 && duo.p2GoalsFromP1 > 0;

                      const p1Pts = duo.p1GoalsInShared + duo.p1AssistsInShared;
                      const p2Pts = duo.p2GoalsInShared + duo.p2AssistsInShared;
                      const totalPts = Math.max(1, p1Pts + p2Pts);
                      const pts1Pct = Math.round((p1Pts / totalPts) * 100);
                      const pts2Pct = 100 - pts1Pct;

                      return (
                        <div
                          key={duo.duoKey}
                          onClick={() => setSelectedDuoDetail(duo)}
                          className={cn(
                            'rounded-xl border border-border/70 bg-card/85 hover:bg-card p-3 flex flex-col justify-between gap-2.5 hover:shadow-md transition-all cursor-pointer group',
                            isDef ? 'hover:border-sky-500/50' : 'hover:border-primary/50'
                          )}
                        >
                          {/* Top row: Rank + Names + Formation Tag + Main Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-lg font-black text-[11px] tabular-nums shrink-0 border',
                                  idx === 0
                                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/35'
                                    : idx === 1
                                    ? 'bg-slate-400/15 text-slate-300 border-slate-400/35'
                                    : idx === 2
                                    ? 'bg-orange-500/15 text-orange-400 border-orange-500/35'
                                    : 'bg-muted text-muted-foreground border-border'
                                )}
                              >
                                #{idx + 1}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-foreground flex-wrap">
                                <span className="group-hover:text-primary transition-colors inline-flex items-center gap-1">
                                  {duo.player1Jersey != null && (
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                      #{duo.player1Jersey}
                                    </span>
                                  )}
                                  <span>{formatName(duo.player1Name)}</span>
                                </span>
                                <span className="text-primary/80 font-black">↔</span>
                                <span className="group-hover:text-primary transition-colors inline-flex items-center gap-1">
                                  {duo.player2Jersey != null && (
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                      #{duo.player2Jersey}
                                    </span>
                                  )}
                                  <span>{formatName(duo.player2Name)}</span>
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-muted/70 text-muted-foreground border-border font-semibold"
                              >
                                {duo.formationLabel}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isDef && duo.totalCombinedGoals === 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-sky-500/15 text-sky-400 border-sky-500/35 font-black text-xs shrink-0 inline-flex items-center gap-1 px-2 py-0.5"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                                  <span>{duo.lockdownGamesTogether}× ≤2G</span>
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-primary/15 text-primary border-primary/35 font-black text-xs shrink-0 inline-flex items-center gap-1 px-2 py-0.5"
                                >
                                  <Flame className="h-3.5 w-3.5 fill-primary text-primary" />
                                  <span>{duo.totalCombinedGoals} G</span>
                                </Badge>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                            </div>
                          </div>

                          {/* Middle row: Directional synergy breakdown & visual bar */}
                          <div className="space-y-1">
                            {duo.totalCombinedGoals > 0 ? (
                              <>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2 flex-wrap">
                                  {isBothWays ? (
                                    <>
                                      <span>
                                        {formatName(duo.player2Name)} ➔{' '}
                                        <strong className="text-foreground">
                                          {formatName(duo.player1Name)}
                                        </strong>{' '}
                                        ({duo.p1GoalsFromP2} G)
                                      </span>
                                      <span>
                                        {formatName(duo.player1Name)} ➔{' '}
                                        <strong className="text-foreground">
                                          {formatName(duo.player2Name)}
                                        </strong>{' '}
                                        ({duo.p2GoalsFromP1} G)
                                      </span>
                                    </>
                                  ) : duo.p1GoalsFromP2 > 0 ? (
                                    <span>
                                      Nahrává{' '}
                                      <strong className="text-foreground">
                                        {formatName(duo.player2Name)}
                                      </strong>{' '}
                                      ➔ pálí{' '}
                                      <strong className="text-primary">
                                        {formatName(duo.player1Name)}
                                      </strong>{' '}
                                      ({duo.p1GoalsFromP2}×)
                                    </span>
                                  ) : (
                                    <span>
                                      Nahrává{' '}
                                      <strong className="text-foreground">
                                        {formatName(duo.player1Name)}
                                      </strong>{' '}
                                      ➔ pálí{' '}
                                      <strong className="text-primary">
                                        {formatName(duo.player2Name)}
                                      </strong>{' '}
                                      ({duo.p2GoalsFromP1}×)
                                    </span>
                                  )}
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden flex gap-0.5">
                                  {duo.p1GoalsFromP2 > 0 && (
                                    <div
                                      className="h-full bg-primary rounded-l-full"
                                      style={{ width: `${Math.max(15, dir1Pct)}%` }}
                                    />
                                  )}
                                  {duo.p2GoalsFromP1 > 0 && (
                                    <div
                                      className="h-full bg-amber-500 rounded-r-full"
                                      style={{ width: `${Math.max(15, dir2Pct)}%` }}
                                    />
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2 flex-wrap">
                                  <span>
                                    Body od modré:{' '}
                                    <strong className="text-foreground">
                                      {duo.combinedPointsInSharedGames} KB
                                    </strong>
                                  </span>
                                  <span>
                                    Průměr obdržených:{' '}
                                    <strong className="text-sky-400">
                                      {duo.avgGoalsAgainstTogether} G/zápas
                                    </strong>
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden flex gap-0.5">
                                  <div
                                    className="h-full bg-sky-500 rounded-l-full"
                                    style={{ width: `${Math.max(15, pts1Pct)}%` }}
                                  />
                                  <div
                                    className="h-full bg-amber-500 rounded-r-full"
                                    style={{ width: `${Math.max(15, pts2Pct)}%` }}
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          {/* Bottom row: Full readable stats without truncation */}
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/50 text-[11px] text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>
                                Společné zápasy:{' '}
                                <strong className="text-foreground">{duo.gamesTogether}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Výhry spolu:{' '}
                                <strong className="text-foreground">{duo.winRatePct} %</strong>
                              </span>
                              {duo.gwgCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500 font-bold inline-flex items-center gap-0.5">
                                    <Trophy className="h-3 w-3" />
                                    {duo.gwgCount}× GWG
                                  </span>
                                </>
                              )}
                              {isDef && duo.shutoutsTogether > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-500 font-bold">
                                    {duo.shutoutsTogether}× nula
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-primary/90 group-hover:text-primary">
                              Detail souhry →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
      )}

      {/* 3. KOMPAKTNÍ FILTR PODLE HRÁČE A OVLÁDACÍ PRVKY */}
      <div className="space-y-2.5 pb-2 border-b">
        {/* Horní řada: Hráčský přepínač + Výběr z dropdownu + Přepínač zobrazení (Série / Vitrína) */}
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Hráčský výběr: Tým / Moje / Jiný hráč */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="inline-flex items-center bg-muted/60 p-0.5 sm:p-1 rounded-xl border border-border/60 shrink-0">
              <button
                onClick={() => setSelectedPlayerId('all')}
                className={cn(
                  'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all touch-manipulation',
                  selectedPlayerId === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Tým</span>
              </button>

              {currentUserId && (
                <button
                  onClick={() => setSelectedPlayerId(selectedPlayerId === 'me' ? 'all' : 'me')}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all touch-manipulation',
                    selectedPlayerId === 'me'
                      ? 'bg-amber-500 text-amber-950 shadow-xs'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                  )}
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>Moje</span>
                </button>
              )}
            </div>

            {/* Dropdown pro výběr konkrétního hráče */}
            <div className="w-36 sm:w-48 shrink-0">
              <Select
                value={selectedPlayerId === 'me' || selectedPlayerId === 'all' ? '' : selectedPlayerId}
                onValueChange={(val) => {
                  if (val) setSelectedPlayerId(val);
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-background/80 rounded-xl px-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {selectedPlayerId !== 'all' && selectedPlayerId !== 'me' && selectedPlayerProfile
                        ? selectedPlayerProfile.name
                        : 'Jiný hráč...'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase">
                    Hráči na soupisce
                  </div>
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id} className="text-xs">
                      {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Přepínač zobrazení: Série vs Vitrína */}
          <div className="inline-flex items-center bg-muted/60 p-0.5 sm:p-1 rounded-xl border border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('series')}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-manipulation',
                viewMode === 'series'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Série & Klenoty: interaktivní řady"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Série</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-manipulation',
                viewMode === 'compact'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Vitrína všech odznaků"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Vitrína</span>
            </button>
          </div>
        </div>

        {/* Informační lišta o aktivním filtru hráče (zobrazuje se pouze při výběru konkrétního hráče nebo 'Moje') */}
        {selectedPlayerProfile && (
          <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6 border border-primary/30 shrink-0">
                <AvatarImage src={selectedPlayerProfile.photoURL || undefined} />
                <AvatarFallback className="text-[10px] font-bold">
                  {selectedPlayerProfile.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-foreground text-xs truncate">
                {selectedPlayerProfile.name} {selectedPlayerProfile.jerseyNumber ? `#${selectedPlayerProfile.jerseyNumber}` : ''}
              </span>
              <span className="text-muted-foreground text-[11px] hidden xs:inline">•</span>
              <span className="text-muted-foreground text-[11px] truncate">
                <strong className="text-primary font-bold">{playerUnlockedCount}</strong>/{milestones.length} ({Math.round((playerUnlockedCount / milestones.length) * 100)}%)
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="inline-flex items-center bg-background/80 rounded-lg p-0.5 border text-[11px]">
                <button
                  onClick={() => setPlayerFilterMode('only_unlocked')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-bold transition-all',
                    playerFilterMode === 'only_unlocked'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Získané ({playerUnlockedCount})
                </button>
                <button
                  onClick={() => setPlayerFilterMode('all_badges')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-bold transition-all',
                    playerFilterMode === 'all_badges'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Vše
                </button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPlayerId('all')}
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                title="Zrušit filtr hráče"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Dolní řada: Scrollable kategorie + Dropdown výběr úrovně (Tier) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Horizontálně rolovatelné kategorie bez ošklivého posuvníku */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full flex-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'all', label: 'Všechny odznaky' },
              { id: 'defense', label: 'Obrana & Tým' },
              { id: 'games', label: 'Zápasy & Šňůry' },
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
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all touch-manipulation shrink-0',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Kompaktní dropdown výběru úrovně - nezabírá zbytečné místo */}
          <div className="shrink-0">
            <Select value={tierFilter} onValueChange={(val) => setTierFilter(val)}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-background/80 border-border/80 rounded-lg px-2.5 gap-1.5 shrink-0 w-auto">
                <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className={cn(
                  "text-xs font-bold whitespace-nowrap",
                  tierFilter !== 'all' ? TIER_CONFIG[tierFilter as MilestoneTier]?.iconColor : "text-muted-foreground"
                )}>
                  {tierFilter === 'all' ? 'Úroveň: Vše' : TIER_CONFIG[tierFilter as MilestoneTier]?.label}
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all" className="text-xs font-semibold">Všechny úrovně</SelectItem>
                <SelectItem value="bronze" className="text-xs font-bold text-amber-700 dark:text-amber-500">Bronz</SelectItem>
                <SelectItem value="silver" className="text-xs font-bold text-zinc-300">Stříbro</SelectItem>
                <SelectItem value="gold" className="text-xs font-bold text-amber-400">Zlato</SelectItem>
                <SelectItem value="diamond" className="text-xs font-bold text-cyan-400">Diamant</SelectItem>
                <SelectItem value="legend" className="text-xs font-bold text-purple-400">Legenda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. HLAVNÍ OBSAHOVÁ ČÁST PODLE REŽIMU ZOBRAZENÍ */}
      {viewMode === 'series' && (
        <div className="space-y-8">
          {/* A. 8 POSTUPOVÝCH SÉRIÍ */}
          {filteredSeries.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-1">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-headline font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                      Postupové série HC Aces
                    </h3>
                    <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 border border-border/60">
                      {MILESTONE_SERIES.length} sérií • 5 stupňů
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
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
                            <span className="font-bold text-foreground/80 text-xs">Stupně série</span>
                            <span className="text-[11px] text-muted-foreground/80">Klepnutím přepnete úroveň</span>
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
                                    'relative flex flex-col items-center justify-between py-1.5 sm:py-2.5 px-0.5 sm:px-1 rounded-lg transition-all touch-manipulation border text-center select-none min-h-[74px] sm:min-h-[82px]',
                                    isActive
                                      ? 'bg-background shadow-sm ring-2 ring-primary border-primary z-10'
                                      : 'bg-background/40 hover:bg-background/80 border-transparent hover:border-border/60',
                                    isUnlocked && !isActive && 'border-emerald-500/40 bg-emerald-500/5'
                                  )}
                                >
                                  {/* Značka splnění hráčem */}
                                  {isUnlocked ? (
                                    <span className="absolute -top-1.5 -right-1.5 z-20 h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm border border-background">
                                      ✓
                                    </span>
                                  ) : isStepNew ? (
                                    <span className="absolute -top-1.5 -right-1.5 z-20 h-3 w-3 rounded-full bg-emerald-500 animate-ping border border-background" />
                                  ) : null}

                                  {/* Tier ikona */}
                                  <div className="mb-0.5 mt-0.5">
                                    {getMilestoneIcon(m.definition.iconName, m.definition.tier, 'h-4 w-4 sm:h-5 sm:w-5')}
                                  </div>

                                  {/* Cílová hodnota */}
                                  <span className={cn('text-xs sm:text-sm font-black tabular-nums leading-none', isActive ? 'text-foreground' : 'text-foreground/80')}>
                                    {m.definition.target}
                                  </span>

                                  {/* Popisek úrovně */}
                                  <span className={cn('text-[9px] sm:text-[10px] font-black uppercase tracking-tighter truncate max-w-full px-0.5 leading-none', tConf.iconColor)}>
                                    {tConf.label}
                                  </span>

                                  {/* Počet držitelů */}
                                  <span className="text-[9px] sm:text-[10px] text-muted-foreground pb-0.5 flex items-center justify-center gap-0.5 font-medium leading-none">
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

      {/* 5. MODAL DETAILU DYNAMIC DUO (HISTORIE GÓLOVÝCH SITUACÍ & SOUHRY) */}
      <DynamicDuoDetailModal
        open={Boolean(selectedDuoDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedDuoDetail(null);
        }}
        selectedDuo={selectedDuoDetail}
        attackDuos={teamChemistry?.topDuos || []}
        defensePairs={teamChemistry?.topDefensePairs || []}
        onSelectDuo={(duo) => setSelectedDuoDetail(duo)}
        onOpenPlayerCareer={onOpenPlayerCareer}
      />
    </div>
  );
}
