'use client';

import React from 'react';
import { Search, X, Users, Star, User, Filter, Layers, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TIER_CONFIG, type MilestoneTier } from '../../../utils/milestones';

export interface BadgeFilterBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedPlayerId: string;
  onPlayerChange: (playerId: string) => void;
  currentUserId?: string | null;
  availablePlayers: {
    id: string;
    name: string;
    jerseyNumber?: number | null;
    photoURL?: string | null;
  }[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  statusFilter: 'all' | 'unlocked' | 'locked';
  onStatusChange: (status: 'all' | 'unlocked' | 'locked') => void;
  tierFilter: string;
  onTierChange: (tier: string) => void;
  viewMode: 'series' | 'compact';
  onViewModeChange: (mode: 'series' | 'compact') => void;
  totalFilteredCount: number;
}

const CATEGORIES = [
  { id: 'all', label: 'Všechny odznaky' },
  { id: 'defense', label: 'Obrana & Tým' },
  { id: 'games', label: 'Zápasy & Šňůry' },
  { id: 'points', label: 'Body' },
  { id: 'scoring', label: 'Góly & Asistence' },
  { id: 'goalies', label: 'Brankáři' },
  { id: 'stars', label: 'Hvězdy & MVP' },
  { id: 'special', label: 'Speciální klenoty' },
];

export function BadgeFilterBar({
  searchTerm,
  onSearchChange,
  selectedPlayerId,
  onPlayerChange,
  currentUserId,
  availablePlayers,
  selectedCategory,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  tierFilter,
  onTierChange,
  viewMode,
  onViewModeChange,
  totalFilteredCount,
}: BadgeFilterBarProps) {
  const selectedPlayerProfile = availablePlayers.find((p) => p.id === selectedPlayerId);

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-1 pb-3 space-y-2.5 border-b border-border/60">
      {/* 1. ŘÁDEK: Hledání + Přepínač zobrazení (Série / Vitrína) */}
      <div className="flex items-center justify-between gap-2.5">
        {/* Vyhledávací pole */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Hledat odznak podle názvu, popisu..."
            className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-muted/40 border-border/80 rounded-xl focus-visible:ring-primary/40"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Přepínač zobrazení: Série vs Vitrína */}
        <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('series')}
            className={cn(
              'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-manipulation',
              viewMode === 'series'
                ? 'bg-background text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Série & Klenoty"
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Série</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('compact')}
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

      {/* 2. ŘÁDEK: Hráčský filtr + Stav (odemčené/zamčené) + Tier filtr */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Výběr hráče */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => onPlayerChange('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all touch-manipulation',
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
                type="button"
                onClick={() => onPlayerChange(selectedPlayerId === 'me' ? 'all' : 'me')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all touch-manipulation',
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

          {/* Dropdown hráče */}
          <div className="w-32 sm:w-44 shrink-0">
            <Select
              value={selectedPlayerId === 'me' || selectedPlayerId === 'all' ? '' : selectedPlayerId}
              onValueChange={(val) => {
                if (val) onPlayerChange(val);
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

          {/* Filtr stavu (odemčené / zamčené / vše) - zobrazuje se pouze při výběru hráče nebo "Moje" */}
          {selectedPlayerId !== 'all' && (
            <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-xs shrink-0">
              <button
                type="button"
                onClick={() => onStatusChange('all')}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-bold transition-all',
                  statusFilter === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Vše
              </button>
              <button
                type="button"
                onClick={() => onStatusChange('unlocked')}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-bold transition-all',
                  statusFilter === 'unlocked'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Odemčené
              </button>
              <button
                type="button"
                onClick={() => onStatusChange('locked')}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-bold transition-all',
                  statusFilter === 'locked'
                    ? 'bg-zinc-700 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Zamčené
              </button>
            </div>
          )}
        </div>

        {/* Tier dropdown */}
        <div className="shrink-0">
          <Select value={tierFilter} onValueChange={(val) => onTierChange(val)}>
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

      {/* 3. ŘÁDEK: Horizontálně rolovatelné kategorie */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full scrollbar-none [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
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
    </div>
  );
}
