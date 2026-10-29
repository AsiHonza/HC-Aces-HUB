'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { UserProfile } from '@/types';
import { 
  type MilestoneWithHolders, 
  type UpcomingMilestone, 
  type TrophyLeader,
  type MilestoneCategory,
  MILESTONE_SERIES,
  MilestoneSeries
} from '../utils/milestones';
import type { TeamChemistryData, DynamicDuoRecord } from '../utils/chemistry';
import { MilestoneDetailModal } from './MilestoneDetailModal';
import { DynamicDuoDetailModal } from './DynamicDuoDetailModal';
import { Sparkles, Trophy, Award, Crown, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

// Redesigned modular components
import { MyProgressCard } from './hall-of-fame/overview/MyProgressCard';
import { NearMilestonesList } from './hall-of-fame/overview/NearMilestonesList';
import { RecentUnlocksFeed } from './hall-of-fame/overview/RecentUnlocksFeed';
import { TeamRecordsGrid } from './hall-of-fame/overview/TeamRecordsGrid';
import { BadgeFilterBar } from './hall-of-fame/catalog/BadgeFilterBar';
import { SeriesRow } from './hall-of-fame/catalog/SeriesRow';
import { SpecialFeatGroup } from './hall-of-fame/catalog/SpecialFeatGroup';
import { BadgeIconGrid } from './hall-of-fame/catalog/BadgeIconGrid';
import { KingsPodiumLeaderboard } from './hall-of-fame/leaderboards/KingsPodiumLeaderboard';
import { DynamicDuoSection } from './hall-of-fame/leaderboards/DynamicDuoSection';

export interface HallOfFameTabProps {
  milestones: MilestoneWithHolders[];
  upcomingMilestones: UpcomingMilestone[];
  allUsers?: UserProfile[];
  currentUserId?: string | null;
  onOpenPlayerCareer?: (playerId: string) => void;
  trophyLeaders?: TrophyLeader[];
  teamChemistry?: TeamChemistryData;
  newMilestoneIds?: Set<string>;
  initialPlayerId?: string;
  initialTab?: 'overview' | 'badges' | 'leaderboards';
}

export type HoFTabType = 'overview' | 'badges' | 'leaderboards';

export const SPECIAL_FEAT_GROUPS = [
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
  initialTab = 'overview',
}: HallOfFameTabProps) {
  // Active Tab: 'overview' | 'badges' | 'leaderboards'
  const [activeTab, setActiveTab] = useState<HoFTabType>(initialTab);

  // Filters state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'series' | 'compact'>('series');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [selectedMilestoneDetail, setSelectedMilestoneDetail] = useState<MilestoneWithHolders | null>(null);
  const [selectedDuoDetail, setSelectedDuoDetail] = useState<DynamicDuoRecord | null>(null);

  // Synchronize initialPlayerId prop changes
  useEffect(() => {
    if (initialPlayerId && initialPlayerId !== selectedPlayerId) {
      setSelectedPlayerId(initialPlayerId);
    }
  }, [initialPlayerId]);

  // Synchronize initialTab prop changes
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Index map of milestones by ID
  const milestoneById = useMemo(() => {
    const map = new Map<string, MilestoneWithHolders>();
    milestones.forEach((m) => map.set(m.definition.id, m));
    return map;
  }, [milestones]);

  // Set of progressive milestone IDs
  const progressiveIds = useMemo(() => {
    const set = new Set<string>();
    MILESTONE_SERIES.forEach((s) => s.milestoneIds.forEach((id) => set.add(id)));
    return set;
  }, []);

  // Available players list for dropdown
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

  // Effective target player ID (null for all team, string for player)
  const effectivePlayerId = selectedPlayerId === 'me'
    ? currentUserId
    : (selectedPlayerId === 'all' ? null : selectedPlayerId);

  // Target player profile for card
  const targetPlayerProfile = useMemo(() => {
    const idToLookup = effectivePlayerId || currentUserId;
    if (!idToLookup) return null;
    return availablePlayers.find((p) => p.id === idToLookup) || null;
  }, [effectivePlayerId, currentUserId, availablePlayers]);

  // Category matching helper
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

  // Fulltext search matcher
  const matchesSearch = (title: string, description: string) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return title.toLowerCase().includes(term) || description.toLowerCase().includes(term);
  };

  // Filtered flat milestones for 'compact' view and counts
  const filteredFlatMilestones = useMemo(() => {
    return milestones.filter((m) => {
      // 1. Search query
      if (!matchesSearch(m.definition.title, m.definition.description)) return false;

      // 2. Category
      if (!matchesCategory(m.definition.category, m.definition.id)) return false;

      // 3. Tier
      if (tierFilter !== 'all' && m.definition.tier !== tierFilter) return false;

      // 4. Status & Player filter
      if (effectivePlayerId) {
        const isHolder = m.holders.some((h) => h.id === effectivePlayerId);
        if (statusFilter === 'unlocked' && !isHolder) return false;
        if (statusFilter === 'locked' && isHolder) return false;
      }

      return true;
    });
  }, [milestones, searchTerm, selectedCategory, tierFilter, effectivePlayerId, statusFilter]);

  // Filtered series for 'series' view
  const filteredSeries = useMemo(() => {
    return MILESTONE_SERIES.filter((s) => {
      const seriesMs = s.milestoneIds
        .map((id) => milestoneById.get(id))
        .filter((m): m is MilestoneWithHolders => Boolean(m));

      if (seriesMs.length === 0) return false;

      // Category check
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'special') return false;
        if (!matchesCategory(s.category, s.milestoneIds[0])) return false;
      }

      // Tier check
      if (tierFilter !== 'all' && !seriesMs.some((m) => m.definition.tier === tierFilter)) {
        return false;
      }

      // Search check: match series title or any milestone in series
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesSeriesTitle = s.title.toLowerCase().includes(term) || s.description.toLowerCase().includes(term);
        const matchesAnyMilestone = seriesMs.some((m) => matchesSearch(m.definition.title, m.definition.description));
        if (!matchesSeriesTitle && !matchesAnyMilestone) return false;
      }

      // Status check
      if (effectivePlayerId && statusFilter !== 'all') {
        const hasUnlockedInSeries = seriesMs.some((m) => m.holders.some((h) => h.id === effectivePlayerId));
        if (statusFilter === 'unlocked' && !hasUnlockedInSeries) return false;
        const hasLockedInSeries = seriesMs.some((m) => !m.holders.some((h) => h.id === effectivePlayerId));
        if (statusFilter === 'locked' && !hasLockedInSeries) return false;
      }

      return true;
    });
  }, [milestoneById, selectedCategory, tierFilter, searchTerm, effectivePlayerId, statusFilter]);

  // Filtered special feats for 'series' view
  const filteredSpecialFeats = useMemo(() => {
    return milestones.filter((m) => {
      if (progressiveIds.has(m.definition.id)) return false;

      // 1. Search query
      if (!matchesSearch(m.definition.title, m.definition.description)) return false;

      // 2. Category
      if (!matchesCategory(m.definition.category, m.definition.id)) return false;

      // 3. Tier
      if (tierFilter !== 'all' && m.definition.tier !== tierFilter) return false;

      // 4. Status & Player filter
      if (effectivePlayerId) {
        const isHolder = m.holders.some((h) => h.id === effectivePlayerId);
        if (statusFilter === 'unlocked' && !isHolder) return false;
        if (statusFilter === 'locked' && isHolder) return false;
      }

      return true;
    });
  }, [milestones, progressiveIds, searchTerm, selectedCategory, tierFilter, effectivePlayerId, statusFilter]);

  // Navigate to badges tab with target player
  const handleNavigateToBadges = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setActiveTab('badges');
  };

  return (
    <div className="space-y-5 pt-1 pb-6">
      {/* ============================================================ */}
      {/* HLAVNÍ 3-TAB NAVIGACE (PŘEHLED / ODZNAKY / ŽEBŘÍČKY)           */}
      {/* ============================================================ */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className="inline-flex items-center p-1 rounded-2xl bg-muted/60 border border-border/80 shadow-xs max-w-full">
          {/* TAB 1: Přehled */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all touch-manipulation',
              activeTab === 'overview'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <Sparkles className={cn('h-4 w-4', activeTab === 'overview' ? 'text-amber-500' : 'text-muted-foreground')} />
            <span>Přehled</span>
          </button>

          {/* TAB 2: Odznaky */}
          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            className={cn(
              'px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all touch-manipulation',
              activeTab === 'badges'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <Award className={cn('h-4 w-4', activeTab === 'badges' ? 'text-primary' : 'text-muted-foreground')} />
            <span>Odznaky</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold hidden xs:inline">
              {milestones.length}
            </span>
          </button>

          {/* TAB 3: Žebříčky */}
          <button
            type="button"
            onClick={() => setActiveTab('leaderboards')}
            className={cn(
              'px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all touch-manipulation',
              activeTab === 'leaderboards'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <Trophy className={cn('h-4 w-4', activeTab === 'leaderboards' ? 'text-amber-500' : 'text-muted-foreground')} />
            <span>Žebříčky</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: PŘEHLED (PERSONAL CARD, RADAR, NOVĚ ODEMČENO, REKORDY) */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Moje karta / Osobní cíl */}
          <MyProgressCard
            targetPlayer={targetPlayerProfile}
            isCurrentUser={Boolean(currentUserId && targetPlayerProfile?.id === currentUserId)}
            milestones={milestones}
            upcomingMilestones={upcomingMilestones}
            trophyLeaders={trophyLeaders}
            onNavigateToBadges={handleNavigateToBadges}
            onOpenMilestoneDetail={(m) => setSelectedMilestoneDetail(m)}
          />

          {/* Na dosah (Radar TOP blížících se milníků) */}
          <NearMilestonesList
            upcomingMilestones={upcomingMilestones}
            milestoneById={milestoneById}
            selectedPlayerId={effectivePlayerId}
            onOpenMilestoneDetail={(m) => setSelectedMilestoneDetail(m)}
            onOpenPlayerCareer={onOpenPlayerCareer}
          />

          {/* Nově odemčeno v týmu (Feed) */}
          <RecentUnlocksFeed
            milestones={milestones}
            newMilestoneIds={newMilestoneIds}
            onOpenMilestoneDetail={(m) => setSelectedMilestoneDetail(m)}
            onOpenPlayerCareer={onOpenPlayerCareer}
          />

          {/* Klubová maxima & rekordy (2x2 grid) */}
          <TeamRecordsGrid
            trophyLeaders={trophyLeaders}
            teamChemistry={teamChemistry}
            milestones={milestones}
            upcomingMilestones={upcomingMilestones}
            onNavigateToLeaderboards={() => setActiveTab('leaderboards')}
            onNavigateToBadges={handleNavigateToBadges}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ODZNAKY (STICKY FILTER, SÉRIE / VITRÍNA)               */}
      {/* ============================================================ */}
      {activeTab === 'badges' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Sticky vyhledávání a filtry */}
          <BadgeFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedPlayerId={selectedPlayerId}
            onPlayerChange={setSelectedPlayerId}
            currentUserId={currentUserId}
            availablePlayers={availablePlayers}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            tierFilter={tierFilter}
            onTierChange={setTierFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalFilteredCount={filteredFlatMilestones.length}
          />

          {/* Zobrazení SÉRIE: 8 kompaktních řádků + Speciální klenoty */}
          {viewMode === 'series' && (
            <div className="space-y-6">
              {/* 8 Postupových sérií */}
              {filteredSeries.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="font-headline font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Postupové série HC Aces
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {filteredSeries.length} sérií
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {filteredSeries.map((s) => (
                      <SeriesRow
                        key={s.id}
                        series={s}
                        milestones={milestones}
                        targetPlayerId={selectedPlayerId}
                        currentUserId={currentUserId}
                        newMilestoneIds={newMilestoneIds}
                        onOpenMilestoneDetail={(m) => setSelectedMilestoneDetail(m)}
                        onOpenPlayerCareer={onOpenPlayerCareer}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Speciální klenoty a disciplína */}
              {filteredSpecialFeats.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-border/40">
                    <h3 className="font-headline font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-500" />
                      Zápasové klenoty & postové odznaky
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {filteredSpecialFeats.length} klenotů
                    </span>
                  </div>

                  <div className="space-y-3">
                    {SPECIAL_FEAT_GROUPS.map((group) => (
                      <SpecialFeatGroup
                        key={group.id}
                        group={group}
                        milestones={filteredSpecialFeats}
                        targetPlayerId={selectedPlayerId}
                        currentUserId={currentUserId}
                        newMilestoneIds={newMilestoneIds}
                        onOpenMilestoneDetail={(m) => setSelectedMilestoneDetail(m)}
                        onOpenPlayerCareer={onOpenPlayerCareer}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Prázdný stav v zobrazení Série */}
              {filteredSeries.length === 0 && filteredSpecialFeats.length === 0 && (
                <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground space-y-2 border border-dashed rounded-2xl">
                  <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="font-semibold text-foreground">Žádné odznaky neodpovídají zadanému filtru</p>
                  <p>Zkuste zvolit jinou kategorii, úroveň nebo zrušit filtr hráče.</p>
                </div>
              )}
            </div>
          )}

          {/* Zobrazení VITRÍNA: Dense Icon Grid */}
          {viewMode === 'compact' && (
            <BadgeIconGrid
              milestones={filteredFlatMilestones}
              targetPlayerId={selectedPlayerId}
              currentUserId={currentUserId}
              newMilestoneIds={newMilestoneIds}
              onOpenMilestoneDetail={(m) => setSelectedMilestoneDetail(m)}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: ŽEBŘÍČKY (KRÁLOVÉ SÍNĚ SLÁVY & DYNAMIC DUO)            */}
      {/* ============================================================ */}
      {activeTab === 'leaderboards' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Králové Síně slávy (Pódium + List) */}
          <KingsPodiumLeaderboard
            trophyLeaders={trophyLeaders}
            onOpenPlayerCareer={onOpenPlayerCareer}
            onSelectPlayerForFilter={handleNavigateToBadges}
          />

          {/* Dynamic Duo (Chemie na ledě) */}
          <DynamicDuoSection
            teamChemistry={teamChemistry}
            onSelectDuo={(duo) => setSelectedDuoDetail(duo)}
            onOpenPlayerCareer={onOpenPlayerCareer}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* MODÁLNÍ OKNA                                                 */}
      {/* ============================================================ */}

      {/* Detail odznaku, držitelé a radar adeptů */}
      <MilestoneDetailModal
        milestone={selectedMilestoneDetail}
        isOpen={Boolean(selectedMilestoneDetail)}
        onClose={() => setSelectedMilestoneDetail(null)}
        onOpenPlayerCareer={onOpenPlayerCareer}
        currentUserId={currentUserId}
      />

      {/* Detail Dynamic Duo: historie asistencí a souhra */}
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
