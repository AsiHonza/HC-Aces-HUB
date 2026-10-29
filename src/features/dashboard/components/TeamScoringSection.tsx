import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, DatabaseBackup, History, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlayerScoringTable, GoalieStatsTable, type PositionFilterType } from '@/features/stats';
import type { Match, UserProfile } from '@/types';

export type ScoringPeriod = 'regular' | 'playoff' | 'season' | 'history';

interface TeamScoringSectionProps {
  currentUserId?: string;
  isAdmin: boolean;
  selectedSeasonId: string;
  activeSeasonName: string;
  teamScoring: any[];
  goalieLeaderboard: any[];
  sortedTeamScoring: any[];
  sortedGoalieLeaderboard: any[];
  skaterStarsLeaderboard: any[];
  goalieStarsLeaderboard: any[];
  allUsers: UserProfile[];
  allMatches: Match[];
  playerFormMap?: Map<string, any>;
  scoringView: ScoringPeriod;
  onScoringViewChange: (v: ScoringPeriod) => void;
  hasHistoricalData: boolean;
  isRestoringHistoricalSnapshot: boolean;
  onRestoreHistoricalSnapshot: () => void;
  onOpenCareerModal: (playerId: string) => void;
  onSaveManualStats: (
    scoringView: ScoringPeriod,
    editableSkaters: any[],
    editableGoalies: any[]
  ) => Promise<void>;
  isSavingManualStats: boolean;
}

export const TeamScoringSection = React.memo(function TeamScoringSection({
  currentUserId,
  isAdmin,
  selectedSeasonId,
  activeSeasonName,
  teamScoring,
  goalieLeaderboard,
  sortedTeamScoring,
  sortedGoalieLeaderboard,
  skaterStarsLeaderboard,
  goalieStarsLeaderboard,
  allUsers,
  allMatches,
  playerFormMap,
  scoringView,
  onScoringViewChange,
  hasHistoricalData,
  isRestoringHistoricalSnapshot,
  onRestoreHistoricalSnapshot,
  onOpenCareerModal,
  onSaveManualStats,
  isSavingManualStats,
}: TeamScoringSectionProps) {
  const [statsCategory, setStatsCategory] = useState<'skaters' | 'goalies'>('skaters');
  const [activeStatsTab, setActiveStatsTab] = useState<'stats' | 'stars'>('stats');
  const [posFilter, setPosFilter] = useState<PositionFilterType>('all');
  const [showAllScoring, setShowAllScoring] = useState(false);
  const [showAllGoalies, setShowAllGoalies] = useState(false);
  const [showAllStars, setShowAllStars] = useState(false);
  const [showAllGoalieStars, setShowAllGoalieStars] = useState(false);

  const [isStatEditMode, setIsStatEditMode] = useState(false);
  const [expandedStatId, setExpandedStatId] = useState<string | null>(null);
  const [editableSkaterStats, setEditableSkaterStats] = useState<any[]>([]);
  const [editableGoalieStats, setEditableGoalieStats] = useState<any[]>([]);

  const handleStartEdit = () => {
    const viewKey =
      scoringView === 'history'
        ? 'rawHistory'
        : scoringView === 'regular'
        ? 'regular'
        : 'playoff';

    if (statsCategory === 'skaters') {
      const initialEditData = teamScoring.map((p) => {
        const data = p[viewKey as keyof typeof p] as any;
        return {
          id: p.id,
          name: p.name,
          goals: String(data?.goals || 0),
          assists: String(data?.assists || 0),
          gamesPlayed: String(data?.gamesPlayed || 0),
        };
      });
      setEditableSkaterStats(initialEditData);
    } else {
      const initialEditData = goalieLeaderboard.map((g) => {
        const data = g[viewKey as keyof typeof g] as any;
        return {
          id: g.id,
          name: g.name,
          gamesPlayed: String(data?.gamesPlayed || 0),
          wins: String(data?.wins || 0),
          saves: String(data?.saves || 0),
          shotsAgainst: String(data?.shotsAgainst || 0),
          so: String(data?.so || 0),
        };
      });
      setEditableGoalieStats(initialEditData);
    }
    setIsStatEditMode(true);
    setExpandedStatId(null);
  };

  const handleCancelEdit = () => {
    setIsStatEditMode(false);
    setExpandedStatId(null);
  };

  const handleSave = async () => {
    await onSaveManualStats(scoringView, editableSkaterStats, editableGoalieStats);
    setIsStatEditMode(false);
    setExpandedStatId(null);
  };

  const displayedScorers = isStatEditMode
    ? editableSkaterStats.map((p, i) => ({
        ...p,
        points: (Number(p.goals) || 0) + (Number(p.assists) || 0),
        rank: i + 1,
      }))
    : sortedTeamScoring;

  const displayedGoalies = isStatEditMode
    ? editableGoalieStats.map((g, i) => {
        const sa = Number(g.shotsAgainst) || 0;
        const s = Number(g.saves) || 0;
        const ga = Math.max(0, sa - s);
        return {
          ...g,
          goalsAgainst: ga,
          savePercentage: sa > 0 ? (s / sa) * 100 : 0,
          rank: i + 1,
        };
      })
    : sortedGoalieLeaderboard;

  return (
    <Card className="h-fit w-full min-w-0 overflow-hidden">
      <Tabs value={activeStatsTab} onValueChange={(v) => setActiveStatsTab(v as 'stats' | 'stars')}>
        <CardHeader className="py-3 px-3 sm:px-6 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Přepínač Hráči v poli vs Brankáři */}
            <div className="inline-flex p-1 bg-muted/80 rounded-xl border border-border/60 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  if (isStatEditMode) return;
                  setStatsCategory('skaters');
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer whitespace-nowrap',
                  statsCategory === 'skaters'
                    ? 'bg-background text-primary shadow-xs border border-border/40 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                )}
              >
                <span>Hráči v poli</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors',
                    statsCategory === 'skaters' ? 'bg-primary/15 text-primary' : 'bg-muted-foreground/15 text-muted-foreground'
                  )}
                >
                  {teamScoring.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isStatEditMode) return;
                  setStatsCategory('goalies');
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer whitespace-nowrap',
                  statsCategory === 'goalies'
                    ? 'bg-background text-primary shadow-xs border border-border/40 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                )}
              >
                <span>Brankáři</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors',
                    statsCategory === 'goalies' ? 'bg-primary/15 text-primary' : 'bg-muted-foreground/15 text-muted-foreground'
                  )}
                >
                  {goalieLeaderboard.length}
                </span>
              </button>
            </div>

            {/* Režim: Bodování / Hvězdy + akční tlačítka */}
            <div className="flex items-center gap-2 shrink-0">
              <TabsList className="grid grid-cols-2 h-8 w-[156px] shrink-0">
                <TabsTrigger value="stats" className="text-xs px-2 h-7 font-semibold whitespace-nowrap">
                  {statsCategory === 'skaters' ? 'Bodování' : 'Statistiky'}
                </TabsTrigger>
                <TabsTrigger value="stars" className="text-xs px-2 h-7 font-semibold whitespace-nowrap">
                  Hvězdy
                </TabsTrigger>
              </TabsList>

              {activeStatsTab === 'stats' && (
                <div className="flex items-center gap-2">
                  {selectedSeasonId !== 'current' && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/30">
                      Uzamčený archiv
                    </Badge>
                  )}
                  {isAdmin && !isStatEditMode && scoringView !== 'season' && selectedSeasonId === 'current' && (
                    <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={handleStartEdit}>
                      Upravit
                    </Button>
                  )}
                  {isStatEditMode && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={handleCancelEdit}>
                        Zrušit
                      </Button>
                      <Button size="sm" className="h-8 text-[10px]" onClick={handleSave} disabled={isSavingManualStats}>
                        {isSavingManualStats ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Uložit
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeStatsTab === 'stars' && (
                <Badge variant="outline" className="text-[11px] font-semibold border-amber-500/30 text-amber-500 bg-amber-500/10 shrink-0">
                  3 b. / 2 b. / 1 b.
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <TabsContent value="stats" className="mt-0">
          <CardContent className="px-1 sm:px-6 pt-4">
            <Tabs
              value={scoringView}
              onValueChange={(v) => {
                if (!isStatEditMode) onScoringViewChange(v as ScoringPeriod);
              }}
            >
              {selectedSeasonId === 'current' ? (
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                  {/* Kompaktní výběr období */}
                  <TabsList className="grid grid-cols-4 h-8 w-full sm:w-[260px] shrink-0">
                    <TabsTrigger value="regular" className="text-[11px] px-1.5 h-7 font-bold">ZČ</TabsTrigger>
                    <TabsTrigger value="playoff" className="text-[11px] px-1.5 h-7 font-bold">Play-off</TabsTrigger>
                    <TabsTrigger value="season" className="text-[11px] px-1.5 h-7 font-bold">Sezona</TabsTrigger>
                    <TabsTrigger value="history" className="text-[11px] px-1.5 h-7 font-bold">Historie</TabsTrigger>
                  </TabsList>

                  {/* Výběr pozic (pouze pro hráče v poli a mimo edit režim) */}
                  {statsCategory === 'skaters' && !isStatEditMode && (
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                      {[
                        { id: 'all' as const, label: 'Všichni' },
                        { id: 'forwards' as const, label: 'Útočníci' },
                        { id: 'defense' as const, label: 'Obránci' },
                        { id: 'center' as const, label: 'Centři' },
                        { id: 'wing' as const, label: 'Křídla' },
                      ].map((tab) => {
                        const active = posFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setPosFilter(tab.id)}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 border cursor-pointer',
                              active
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/70'
                            )}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-3 px-1 text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    Konečné statistiky ročníku <strong>{activeSeasonName}</strong>
                  </span>
                  <Badge variant="secondary" className="text-[10px]">Archiv</Badge>
                </div>
              )}

              {isStatEditMode && (
                <div className="mb-4 p-2 bg-primary/5 border rounded-lg text-[10px] text-primary text-center font-bold uppercase">
                  {statsCategory === 'skaters'
                    ? scoringView === 'history'
                      ? 'Upravujete historii hráčů (minulé sezóny)'
                      : scoringView === 'regular'
                      ? 'Upravujete základní část hráčů'
                      : 'Upravujete play-off hráčů'
                    : scoringView === 'history'
                    ? 'Upravujete historii brankářů (minulé sezóny)'
                    : scoringView === 'regular'
                    ? 'Upravujete základní část brankářů'
                    : 'Upravujete play-off brankářů'}
                </div>
              )}

              {scoringView === 'history' && isAdmin && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                      <DatabaseBackup className="h-4 w-4" />
                      <span>Oficiální historický snapshot (stav k 14. 4. 2026)</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      {statsCategory === 'skaters'
                        ? hasHistoricalData
                          ? 'Historické statistiky (37 hráčů, 6 brankářů) jsou aktivní a dopočítávají se k letošní sezóně.'
                          : 'V databázi chybí historické statistiky (byly dříve vynulovány). Kliknutím níže obnovíte oficiální čísla k 14. 4. 2026.'
                        : hasHistoricalData
                        ? 'Historické statistiky brankářů (Štěpán 88 Z, Lacko 31 Z, Bara 5 Z...) jsou aktivní.'
                        : 'V databázi chybí historické statistiky brankářů. Kliknutím níže obnovíte oficiální čísla k 14. 4. 2026.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={hasHistoricalData ? 'outline' : 'default'}
                    className={cn(
                      'h-8 text-xs font-semibold shrink-0',
                      !hasHistoricalData && 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                    )}
                    onClick={onRestoreHistoricalSnapshot}
                    disabled={isRestoringHistoricalSnapshot}
                  >
                    {isRestoringHistoricalSnapshot ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <History className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {hasHistoricalData ? 'Znovu přepsat snapshotem' : 'Aplikovat snapshot historie (1 klik)'}
                  </Button>
                </div>
              )}

              {statsCategory === 'skaters' ? (
                <PlayerScoringTable
                  scorers={displayedScorers}
                  currentUserId={currentUserId}
                  onPlayerClick={onOpenCareerModal}
                  showAll={showAllScoring}
                  onToggleShowAll={() => setShowAllScoring(!showAllScoring)}
                  isStatEditMode={isStatEditMode}
                  expandedStatId={expandedStatId}
                  onToggleExpandStat={(id) => setExpandedStatId(expandedStatId === id ? null : id)}
                  onUpdateEditableSkaterStat={setEditableSkaterStats}
                  allUsers={allUsers}
                  allMatches={allMatches}
                  playerFormMap={playerFormMap}
                  posFilter={posFilter}
                  onPosFilterChange={setPosFilter}
                  hidePositionFilter={selectedSeasonId === 'current'}
                />
              ) : (
                <GoalieStatsTable
                  goalies={displayedGoalies}
                  currentUserId={currentUserId}
                  onGoalieClick={onOpenCareerModal}
                  showAll={showAllGoalies}
                  onToggleShowAll={() => setShowAllGoalies(!showAllGoalies)}
                  isStatEditMode={isStatEditMode}
                  expandedStatId={expandedStatId}
                  onToggleExpandStat={(id) => setExpandedStatId(expandedStatId === id ? null : id)}
                  onUpdateEditableGoalieStat={setEditableGoalieStats}
                />
              )}
            </Tabs>
          </CardContent>
        </TabsContent>

        <TabsContent value="stars" className="mt-0">
          <CardContent className="px-2 sm:px-6 pt-4">
            {statsCategory === 'skaters' ? (
              skaterStarsLeaderboard.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Star className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Zatím nebyly uděleny žádné hvězdy hráčům</p>
                  <p className="mt-1">Po skončení každého zápasu mohou hráči v kabině hlasovat o 1., 2. a 3. hvězdě.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center font-bold text-xs">#</TableHead>
                        <TableHead className="text-xs">Hráč</TableHead>
                        <TableHead className="text-center text-xs" title="1. hvězda (3 body)">
                          <span className="inline-flex items-center gap-0.5 justify-center text-amber-500">
                            1.<Star className="h-2.5 w-2.5 fill-current" />
                          </span>
                        </TableHead>
                        <TableHead className="text-center text-xs" title="2. hvězda (2 body)">
                          <span className="inline-flex items-center gap-0.5 justify-center text-zinc-300">
                            2.<Star className="h-2.5 w-2.5 fill-current" />
                          </span>
                        </TableHead>
                        <TableHead className="text-center text-xs" title="3. hvězda (1 bod)">
                          <span className="inline-flex items-center gap-0.5 justify-center text-amber-600 dark:text-amber-500">
                            3.<Star className="h-2.5 w-2.5 fill-current" />
                          </span>
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold">Body</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showAllStars ? skaterStarsLeaderboard : skaterStarsLeaderboard.slice(0, 10)).map((player) => {
                        const isMe = player.id === currentUserId;
                        return (
                          <TableRow
                            key={player.id}
                            className={cn(
                              'cursor-pointer transition-colors',
                              isMe && 'bg-primary/10 hover:bg-primary/15 font-semibold'
                            )}
                            onClick={() => onOpenCareerModal(player.id)}
                          >
                            <TableCell className="text-center font-bold tabular-nums text-xs">
                              {player.rank}.
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={player.photoURL || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {player.name.substring(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{player.name}</span>
                                {player.jerseyNumber && (
                                  <span className="text-[11px] text-muted-foreground">
                                    #{player.jerseyNumber}
                                  </span>
                                )}
                                {isMe && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/50 text-primary">
                                    Ty
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-xs font-medium">
                              {player.star1Count > 0 ? (
                                <span className="text-amber-500 font-bold">{player.star1Count}x</span>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-xs font-medium">
                              {player.star2Count > 0 ? (
                                <span className="text-zinc-400 font-bold">{player.star2Count}x</span>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-xs font-medium">
                              {player.star3Count > 0 ? (
                                <span className="text-amber-700 dark:text-amber-600 font-bold">{player.star3Count}x</span>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs font-bold text-amber-500">
                              {player.totalPoints} b.
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {skaterStarsLeaderboard.length > 10 && (
                    <div className="text-center pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowAllStars(!showAllStars)}
                      >
                        {showAllStars ? 'Zobrazit méně' : `Zobrazit všech ${skaterStarsLeaderboard.length} hráčů`}
                      </Button>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground text-right pt-1">
                    Bodování: 1. hvězda = 3 b. • 2. hvězda = 2 b. • 3. hvězda = 1 b.
                  </p>
                </div>
              )
            ) : goalieStarsLeaderboard.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Star className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="font-semibold text-foreground">Zatím nebyly uděleny žádné hvězdy brankářům</p>
                <p className="mt-1">Po skončení každého zápasu mohou hráči v kabině hlasovat o 1., 2. a 3. hvězdě.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center font-bold text-xs">#</TableHead>
                      <TableHead className="text-xs">Brankář</TableHead>
                      <TableHead className="text-center text-xs" title="1. hvězda (3 body)">
                        <span className="inline-flex items-center gap-0.5 justify-center text-amber-500">
                          1.<Star className="h-2.5 w-2.5 fill-current" />
                        </span>
                      </TableHead>
                      <TableHead className="text-center text-xs" title="2. hvězda (2 body)">
                        <span className="inline-flex items-center gap-0.5 justify-center text-zinc-300">
                          2.<Star className="h-2.5 w-2.5 fill-current" />
                        </span>
                      </TableHead>
                      <TableHead className="text-center text-xs" title="3. hvězda (1 bod)">
                        <span className="inline-flex items-center gap-0.5 justify-center text-amber-600 dark:text-amber-500">
                          3.<Star className="h-2.5 w-2.5 fill-current" />
                        </span>
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold">Body</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllGoalieStars ? goalieStarsLeaderboard : goalieStarsLeaderboard.slice(0, 10)).map((player) => {
                      const isMe = player.id === currentUserId;
                      return (
                        <TableRow
                          key={player.id}
                          className={cn(
                            'cursor-pointer transition-colors',
                            isMe && 'bg-primary/10 hover:bg-primary/15 font-semibold'
                          )}
                          onClick={() => onOpenCareerModal(player.id)}
                        >
                          <TableCell className="text-center font-bold tabular-nums text-xs">
                            {player.rank}.
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={player.photoURL || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {player.name.substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{player.name}</span>
                              {player.jerseyNumber && (
                                <span className="text-[11px] text-muted-foreground">
                                  #{player.jerseyNumber}
                                </span>
                              )}
                              {isMe && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/50 text-primary">
                                  Ty
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-medium">
                            {player.star1Count > 0 ? (
                              <span className="text-amber-500 font-bold">{player.star1Count}x</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-medium">
                            {player.star2Count > 0 ? (
                              <span className="text-zinc-400 font-bold">{player.star2Count}x</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-medium">
                            {player.star3Count > 0 ? (
                              <span className="text-amber-700 dark:text-amber-600 font-bold">{player.star3Count}x</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-bold text-amber-500">
                            {player.totalPoints} b.
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {goalieStarsLeaderboard.length > 10 && (
                  <div className="text-center pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowAllGoalieStars(!showAllGoalieStars)}
                    >
                      {showAllGoalieStars ? 'Zobrazit méně' : `Zobrazit všech ${goalieStarsLeaderboard.length} brankářů`}
                    </Button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground text-right pt-1">
                  Bodování: 1. hvězda = 3 b. • 2. hvězda = 2 b. • 3. hvězda = 1 b.
                </p>
              </div>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
});
