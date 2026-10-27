'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListOrdered, CalendarDays, Trophy, Shield, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { syncLeagueToFirestore, buildEnrichedLeagueMatches } from '@/lib/sync/league-sync';
import type { AppSettings, UserProfile, LeagueMatchItem, LeagueSkaterItem, LeagueGoalieItem, LeagueFairPlayItem, LeagueStanding } from '@/types';
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

export default function LeagueDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'scorers' | 'goalies'>('standings');
  const [selectedTeam, setSelectedTeam] = useState<TeamAnalyticsSummary | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [scrapedFallback, setScrapedFallback] = useState<ScrapedLeagueData | null>(null);
  const [isAutoLoading, setIsAutoLoading] = useState<boolean>(false);

  // Fetch league settings from Firestore settings/league
  const leagueDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'league') : null),
    [firestore]
  );
  const { data: leagueSettings, isLoading: isLeagueLoading } = useDoc<AppSettings>(leagueDocRef);

  // Fetch user profile to check admin status
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';

  // Auto-fetch live scraper data if leagueMatches or Fair Play is not yet present in Firestore
  useEffect(() => {
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
  }, [isLeagueLoading, leagueSettings, scrapedFallback, isAutoLoading, firestore, isAdmin]);

  // Raw datasets: either from Firestore or live fallback
  const standings: LeagueStanding[] = useMemo(() => {
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
  }, [leagueSettings?.leagueStandings, scrapedFallback]);

  const matches: LeagueMatchItem[] = useMemo(() => {
    if (leagueSettings?.leagueMatches && leagueSettings.leagueMatches.length > 0) {
      return leagueSettings.leagueMatches;
    }
    if (scrapedFallback?.allMatches) {
      return buildEnrichedLeagueMatches(scrapedFallback.allMatches, scrapedFallback.matchReports);
    }
    return [];
  }, [leagueSettings?.leagueMatches, scrapedFallback]);

  const skaters: LeagueSkaterItem[] = useMemo(() => {
    if (leagueSettings?.leagueSkaters && leagueSettings.leagueSkaters.length > 0) {
      return leagueSettings.leagueSkaters;
    }
    if (scrapedFallback?.allSkaters) {
      return scrapedFallback.allSkaters;
    }
    return [];
  }, [leagueSettings?.leagueSkaters, scrapedFallback]);

  const goalies: LeagueGoalieItem[] = useMemo(() => {
    if (leagueSettings?.leagueGoalies && leagueSettings.leagueGoalies.length > 0) {
      return leagueSettings.leagueGoalies;
    }
    if (scrapedFallback?.allGoalies) {
      return scrapedFallback.allGoalies;
    }
    return [];
  }, [leagueSettings?.leagueGoalies, scrapedFallback]);

  const fairPlay: LeagueFairPlayItem[] = useMemo(() => {
    if (leagueSettings?.leagueFairPlay && leagueSettings.leagueFairPlay.length > 0) {
      return leagueSettings.leagueFairPlay;
    }
    if (scrapedFallback?.fairPlay) {
      return scrapedFallback.fairPlay;
    }
    return [];
  }, [leagueSettings?.leagueFairPlay, scrapedFallback]);

  // Derived Analytics using full data & Fair Play
  const teamSummaries = useMemo(() => {
    return calculateTeamAnalytics(standings, matches, skaters, goalies, fairPlay);
  }, [standings, matches, skaters, goalies, fairPlay]);

  const leagueOverview = useMemo(() => {
    return calculateLeagueOverview(teamSummaries, matches, skaters, goalies);
  }, [teamSummaries, matches, skaters, goalies]);

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

  // Sync handler for admins
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
      {/* Header with quick KPI banner */}
      <LeagueHeader
        overview={leagueOverview}
        lastSyncAt={leagueSettings?.leagueLastSyncAt || (scrapedFallback ? new Date() : null)}
        isAdmin={isAdmin}
        isSyncing={isSyncing}
        onSync={handleSyncLeague}
      />

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
            {isAdmin && (
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

      {/* Team Detail Modal */}
      <TeamDetailDialog
        team={selectedTeam}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        allMatches={matches}
        allSkaters={skaters}
        allGoalies={goalies}
      />
    </div>
  );
}
