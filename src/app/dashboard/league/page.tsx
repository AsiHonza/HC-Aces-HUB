'use client';

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, query, collection, orderBy } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListOrdered, CalendarDays, Trophy, Shield, RefreshCw, History, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { syncLeagueToFirestore, buildEnrichedLeagueMatches } from '@/lib/sync/league-sync';
import { ArchiveSeasonDialog, statsService, FinalsCelebrationBanner, detectFinalsStatus } from '@/features/stats';
import type {
  AppSettings,
  UserProfile,
  LeagueMatchItem,
  LeagueSkaterItem,
  LeagueGoalieItem,
  LeagueFairPlayItem,
  LeagueStanding,
  Match,
} from '@/types';
import type { ScrapedLeagueData } from '@/lib/sync/league-scraper';
import {
  LeagueHeader,
  LeagueAwardsLeaders,
  LeagueStandingsAnalyticsTable,
  LeagueMatchesView,
  LeagueScorersTable,
  LeagueGoaliesTable,
  TeamDetailDialog,
  calculateTeamAnalytics,
  calculateLeagueOverview,
  TeamAnalyticsSummary,
} from '@/features/league';

interface SeasonArchiveDoc {
  id: string;
  name: string;
  year: string;
  teamCount?: number;
  standings?: LeagueStanding[];
  leagueStandings?: LeagueStanding[];
  leagueMatches?: LeagueMatchItem[];
  matches?: any[];
  leagueSkaters?: LeagueSkaterItem[];
  leagueGoalies?: LeagueGoalieItem[];
  leagueFairPlay?: LeagueFairPlayItem[];
}

function LeagueDashboardContent() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const queryTab = (searchParams?.get('tab') as 'standings' | 'matches' | 'scorers' | 'goalies') || 'standings';
  const querySeason = searchParams?.get('season') || 'current';

  const [selectedSeasonId, setSelectedSeasonIdState] = useState<string>(querySeason);
  const [activeTab, setActiveTabState] = useState<'standings' | 'matches' | 'scorers' | 'goalies'>(queryTab);
  const [selectedTeam, setSelectedTeam] = useState<TeamAnalyticsSummary | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState<boolean>(false);
  const [scrapedFallback, setScrapedFallback] = useState<ScrapedLeagueData | null>(null);
  const [isAutoLoading, setIsAutoLoading] = useState<boolean>(false);

  // Sync state if URL changes externally
  useEffect(() => {
    if (queryTab && queryTab !== activeTab) {
      setActiveTabState(queryTab);
    }
  }, [queryTab, activeTab]);

  useEffect(() => {
    if (querySeason && querySeason !== selectedSeasonId) {
      setSelectedSeasonIdState(querySeason);
    }
  }, [querySeason, selectedSeasonId]);

  const setActiveTab = useCallback(
    (newTab: 'standings' | 'matches' | 'scorers' | 'goalies') => {
      setActiveTabState(newTab);
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', newTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const setSelectedSeasonId = useCallback(
    (newSeasonId: string) => {
      setSelectedSeasonIdState(newSeasonId);
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('season', newSeasonId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Fetch league settings from Firestore settings/league
  const leagueDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'league') : null),
    [firestore]
  );
  const { data: leagueSettings, isLoading: isLeagueLoading } = useDoc<AppSettings>(leagueDocRef);

  // Fetch archived seasons from collection 'seasons'
  const seasonsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'seasons'), orderBy('archivedAt', 'desc')) : null),
    [firestore]
  );
  const { data: archivedSeasons } = useCollection<SeasonArchiveDoc>(seasonsQuery);

  // Fetch user profile to check admin status
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';

  // Fetch Aces matches to track playoff / finals
  const acesMatchesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'matches') : null),
    [firestore]
  );
  const { data: acesMatches } = useCollection<Match>(acesMatchesQuery);

  // Auto-fetch live scraper data if leagueMatches or Fair Play is not yet present in Firestore for current season
  useEffect(() => {
    if (selectedSeasonId !== 'current') return;

    const hasFullMatches =
      Boolean(leagueSettings?.leagueMatches && leagueSettings.leagueMatches.length > 0);
    const hasFairPlay =
      Boolean(leagueSettings?.leagueFairPlay && leagueSettings.leagueFairPlay.length > 0);

    if (!isLeagueLoading && (!hasFullMatches || !hasFairPlay) && !scrapedFallback && !isAutoLoading) {
      setIsAutoLoading(true);
      fetch('/api/sync/league?action=scrape')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setScrapedFallback(json.data);

            // If user is admin, auto-persist to Firestore in background
            if (firestore && isAdmin) {
              syncLeagueToFirestore(firestore, json.data).catch((e) =>
                console.warn('Auto-save to Firestore in background failed:', e)
              );
            }
          }
        })
        .catch((e) => console.warn('Auto-fetch scrape error:', e))
        .finally(() => setIsAutoLoading(false));
    }
  }, [selectedSeasonId, isLeagueLoading, leagueSettings, scrapedFallback, isAutoLoading, firestore, isAdmin]);

  // Selected archived season reference if not current or upcoming
  const selectedArchivedSeason = useMemo(() => {
    if (selectedSeasonId === 'current' || selectedSeasonId === 'upcoming') return null;
    return archivedSeasons?.find((s) => s.id === selectedSeasonId) || null;
  }, [selectedSeasonId, archivedSeasons]);

  // Standings data
  const standings: LeagueStanding[] = useMemo(() => {
    if (selectedSeasonId === 'upcoming') {
      return [];
    }
    if (selectedArchivedSeason) {
      return selectedArchivedSeason.leagueStandings || selectedArchivedSeason.standings || [];
    }
    if (leagueSettings?.leagueStandings && leagueSettings.leagueStandings.length > 0) {
      return leagueSettings.leagueStandings;
    }
    if (scrapedFallback?.standings) {
      return scrapedFallback.standings.map((s) => ({
        id: s.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: s.name === 'Aces' ? 'HC Aces' : s.name,
        points: s.points,
        gf: s.gf,
        ga: s.ga,
        gp: s.gamesPlayed,
        w: s.wins,
        d: s.draws,
        l: s.losses,
        rank: s.rank,
        penaltyMinutes: s.penaltyMinutes ?? 0,
      }));
    }
    return [];
  }, [selectedSeasonId, selectedArchivedSeason, leagueSettings?.leagueStandings, scrapedFallback]);

  // Matches data
  const matches: LeagueMatchItem[] = useMemo(() => {
    if (selectedSeasonId === 'upcoming') {
      return [];
    }
    if (selectedArchivedSeason) {
      return selectedArchivedSeason.leagueMatches || (selectedArchivedSeason.matches as any) || [];
    }
    if (leagueSettings?.leagueMatches && leagueSettings.leagueMatches.length > 0) {
      return leagueSettings.leagueMatches;
    }
    if (scrapedFallback?.allMatches) {
      return buildEnrichedLeagueMatches(scrapedFallback.allMatches, scrapedFallback.matchReports);
    }
    return [];
  }, [selectedSeasonId, selectedArchivedSeason, leagueSettings?.leagueMatches, scrapedFallback]);

  // Skaters data
  const skaters: LeagueSkaterItem[] = useMemo(() => {
    if (selectedSeasonId === 'upcoming') {
      return [];
    }
    if (selectedArchivedSeason) {
      return selectedArchivedSeason.leagueSkaters || [];
    }
    if (leagueSettings?.leagueSkaters && leagueSettings.leagueSkaters.length > 0) {
      return leagueSettings.leagueSkaters;
    }
    if (scrapedFallback?.allSkaters) {
      return scrapedFallback.allSkaters;
    }
    return [];
  }, [selectedSeasonId, selectedArchivedSeason, leagueSettings?.leagueSkaters, scrapedFallback]);

  // Goalies data
  const goalies: LeagueGoalieItem[] = useMemo(() => {
    if (selectedSeasonId === 'upcoming') {
      return [];
    }
    if (selectedArchivedSeason) {
      return selectedArchivedSeason.leagueGoalies || [];
    }
    if (leagueSettings?.leagueGoalies && leagueSettings.leagueGoalies.length > 0) {
      return leagueSettings.leagueGoalies;
    }
    if (scrapedFallback?.allGoalies) {
      return scrapedFallback.allGoalies;
    }
    return [];
  }, [selectedSeasonId, selectedArchivedSeason, leagueSettings?.leagueGoalies, scrapedFallback]);

  // Fair Play data
  const fairPlay: LeagueFairPlayItem[] = useMemo(() => {
    if (selectedSeasonId === 'upcoming') {
      return [];
    }
    if (selectedArchivedSeason) {
      return selectedArchivedSeason.leagueFairPlay || [];
    }
    if (leagueSettings?.leagueFairPlay && leagueSettings.leagueFairPlay.length > 0) {
      return leagueSettings.leagueFairPlay;
    }
    if (scrapedFallback?.fairPlay) {
      return scrapedFallback.fairPlay;
    }
    return [];
  }, [selectedSeasonId, selectedArchivedSeason, leagueSettings?.leagueFairPlay, scrapedFallback]);

  // Derived Analytics using full data & Fair Play
  const teamSummaries = useMemo(() => {
    return calculateTeamAnalytics(standings, matches, skaters, goalies, fairPlay);
  }, [standings, matches, skaters, goalies, fairPlay]);

  const leagueOverview = useMemo(() => {
    return calculateLeagueOverview(teamSummaries, matches, skaters, goalies);
  }, [teamSummaries, matches, skaters, goalies]);

  // Detect if Finals (Best-of-5 on 3 wins) has finished for auto-archive prompt
  const finalsStatus = useMemo(() => {
    if (selectedSeasonId !== 'current') {
      return {
        isFinished: false,
        winnerWins: 0,
        loserWins: 0,
        seriesScore: '0 : 0',
        isAcesInvolved: false,
        isAcesWinner: false,
        source: 'none' as const,
        finalGamesCount: 0,
      };
    }
    return detectFinalsStatus({
      matches: acesMatches,
      playoffSeries: leagueSettings?.playoffSeries,
      leagueMatches: matches,
    });
  }, [selectedSeasonId, acesMatches, leagueSettings?.playoffSeries, matches]);

  // Handle Team Selection (open detail dialog)
  const handleSelectTeamByName = (teamName: string) => {
    const found = teamSummaries.find(
      (t) => t.name.toLowerCase() === teamName.toLowerCase() || t.name.includes(teamName) || teamName.includes(t.name)
    );
    if (found) {
      setSelectedTeam(found);
      setIsDetailDialogOpen(true);
    }
  };

  const handleSelectTeam = (team: TeamAnalyticsSummary) => {
    setSelectedTeam(team);
    setIsDetailDialogOpen(true);
  };

  // Sync handler for admins (current season only)
  const handleSyncLeague = async () => {
    if (!firestore || !isAdmin) return;
    setIsSyncing(true);
    try {
      toast({
        title: 'Synchronizuji s webem HobbyHokej...',
        description: 'Stahuji rozpis, výsledky kol, střelce, tresty a statistiky brankářů.',
      });

      const res = await fetch('/api/sync/league', { method: 'POST' });
      const syncResult = await res.json();

      if (syncResult.success) {
        toast({
          title: 'Statistiky ligy úspěšně synchronizovány!',
          description: `Aktualizováno ${syncResult.standingsCount} týmů, ${syncResult.matchesUpdated} zápasů a ${syncResult.skatersUpdated} hráčů.`,
        });
      } else {
        const scrapeRes = await fetch('/api/sync/league?action=scrape');
        const scrapeJson = await scrapeRes.json();
        if (scrapeJson.success && scrapeJson.data) {
          const clientSync = await syncLeagueToFirestore(firestore, scrapeJson.data);
          if (clientSync.success) {
            setScrapedFallback(scrapeJson.data);
            toast({
              title: 'Statistiky ligy úspěšně synchronizovány!',
              description: `Aktualizováno ${clientSync.standingsCount} týmů, ${clientSync.matchesUpdated} zápasů a ${clientSync.skatersUpdated} hráčů.`,
            });
            return;
          }
        }
        throw new Error(syncResult.error || 'Synchronizace selhala.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba synchronizace',
        description: err.message || 'Nepodařilo se stáhnout data z ligového webu.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Archive Season Handler for Admins
  const handleArchiveSeason = async ({
    seasonName,
    year,
    teamCount,
  }: {
    seasonName: string;
    year: string;
    teamCount: number;
  }) => {
    if (!firestore || !leagueSettings || !isAdmin) return;
    setIsSyncing(true);
    try {
      await statsService.archiveSeason({
        firestore,
        seasonName,
        year,
        teamCount,
        leagueSettings,
        allSkaterStats: [],
        allGoalieStats: [],
        allMatches: matches,
      });

      toast({
        title: 'Sezóna byla úspěšně archivována!',
        description: `Ročník ${year} byl uložen do archivu a byla zahájena nová sezóna ${seasonName}.`,
      });
      setIsArchiveDialogOpen(false);
      setSelectedSeasonId('current');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba archivace sezóny',
        description: err.message || 'Nepodařilo se archivovat sezónu.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLeagueLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Načítám Ligové centrum...</p>
      </div>
    );
  }

  const hasData = standings.length > 0 || matches.length > 0;

  return (
    <div className="space-y-6 py-4 sm:py-6">
      {/* Header with season selector & KPI strip */}
      <LeagueHeader
        overview={leagueOverview}
        lastSyncAt={leagueSettings?.leagueLastSyncAt || (scrapedFallback ? new Date() : null)}
        isAdmin={isAdmin}
        isSyncing={isSyncing}
        onSync={handleSyncLeague}
        selectedSeasonId={selectedSeasonId}
        onSelectSeasonId={setSelectedSeasonId}
        archivedSeasons={archivedSeasons}
        onOpenArchiveDialog={() => setIsArchiveDialogOpen(true)}
        currentSeasonName={leagueSettings?.currentSeasonName}
      />

      {/* Finals Celebration / 1-Click Auto-Archive Banner */}
      {selectedSeasonId === 'current' && finalsStatus.isFinished && (
        <FinalsCelebrationBanner
          status={finalsStatus}
          seasonName={leagueSettings?.currentSeasonName || 'Sezóna 2025/2026'}
          seasonYear={leagueSettings?.currentSeasonName?.match(/\d{4}\/\d{4}/)?.[0] || '2025/2026'}
          isAdmin={isAdmin}
          onArchiveClick={() => setIsArchiveDialogOpen(true)}
        />
      )}

      {/* Archived Season Notice Banner */}
      {selectedArchivedSeason && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs sm:text-sm font-semibold">
          <History className="h-4 w-4 shrink-0" />
          <span>
            Prohlížíte uzavřený archiv ročníku {selectedArchivedSeason.name} ({selectedArchivedSeason.year}). Data jsou uložena v režimu pouze pro čtení.
          </span>
        </div>
      )}

      {/* Upcoming Season Notice Banner */}
      {selectedSeasonId === 'upcoming' && (
        <Card className="p-8 sm:p-12 text-center border-dashed border-border/80 bg-card/60">
          <CardContent className="space-y-3 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Nadcházející sezóna (2026/2027)</h3>
              <p className="text-xs text-muted-foreground">
                Příprava na nový ročník soutěže. Jakmile bude na webu HobbyHokej zveřejněn nový rozpis a soupisky, stačí spustit synchronizaci.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSeasonId('current')}
              className="font-bold text-xs"
            >
              ← Zpět na nynější sezónu (2025/2026)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      {selectedSeasonId !== 'upcoming' && (
        <>
          {!hasData ? (
            <Card className="p-8 sm:p-12 text-center border-dashed border-border/80 bg-card/60">
              <CardContent className="space-y-4 max-w-md mx-auto">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Ligová data se načítají...</h3>
                  <p className="text-xs text-muted-foreground">
                    Stahuji aktuální rozpis, tabulku Fair Play a statistiky hráčů z ligového webu.
                  </p>
                </div>
                {isAdmin && selectedSeasonId === 'current' && (
                  <Button
                    onClick={handleSyncLeague}
                    disabled={isSyncing}
                    className="font-bold text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Spustit synchronizaci nyní
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as any)}
              className="space-y-5"
            >
              {/* Main Navigation Tabs */}
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1.5 bg-card/95 border-2 border-border/80 shadow-md rounded-2xl gap-1">
                <TabsTrigger
                  value="standings"
                  className={cn(
                    "py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:font-black"
                  )}
                >
                  <ListOrdered className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
                  <span>Tabulka & Analytika</span>
                </TabsTrigger>

                <TabsTrigger
                  value="matches"
                  className={cn(
                    "py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:font-black"
                  )}
                >
                  <CalendarDays className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
                  <span>Zápasy & Výsledky</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-muted/60 data-[state=active]:bg-black/20 text-foreground data-[state=active]:text-primary-foreground tabular-nums">
                    {matches.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="scorers"
                  className={cn(
                    "py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:font-black"
                  )}
                >
                  <Trophy className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
                  <span>Statistika hráčů</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-muted/60 data-[state=active]:bg-black/20 text-foreground data-[state=active]:text-primary-foreground tabular-nums">
                    {skaters.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="goalies"
                  className={cn(
                    "py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:font-black"
                  )}
                >
                  <Shield className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
                  <span>Brankáři</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-muted/60 data-[state=active]:bg-black/20 text-foreground data-[state=active]:text-primary-foreground tabular-nums">
                    {goalies.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Standings & Analytics Tab */}
              <TabsContent value="standings" className="space-y-6 focus-visible:outline-none">
                <LeagueAwardsLeaders
                  overview={leagueOverview}
                  onSelectTeam={handleSelectTeamByName}
                />

                <LeagueStandingsAnalyticsTable
                  teams={teamSummaries}
                  onSelectTeam={handleSelectTeam}
                />
              </TabsContent>

              {/* Matches & Schedule Tab */}
              <TabsContent value="matches" className="focus-visible:outline-none">
                <LeagueMatchesView
                  matches={matches}
                  onSelectTeam={handleSelectTeamByName}
                />
              </TabsContent>

              {/* League Scorers Tab */}
              <TabsContent value="scorers" className="focus-visible:outline-none">
                <LeagueScorersTable
                  skaters={skaters}
                  onSelectTeam={handleSelectTeamByName}
                />
              </TabsContent>

              {/* Goalies Tab */}
              <TabsContent value="goalies" className="focus-visible:outline-none">
                <LeagueGoaliesTable
                  goalies={goalies}
                  onSelectTeam={handleSelectTeamByName}
                />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {/* Team Detail Modal */}
      <TeamDetailDialog
        team={selectedTeam}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        allMatches={matches}
        allSkaters={skaters}
        allGoalies={goalies}
      />

      {/* Archive Season Confirmation Dialog */}
      <ArchiveSeasonDialog
        isOpen={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        onArchive={handleArchiveSeason}
        isSaving={isSyncing}
      />
    </div>
  );
}

export default function LeagueDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Načítám Ligové centrum...</p>
        </div>
      }
    >
      <LeagueDashboardContent />
    </Suspense>
  );
}
