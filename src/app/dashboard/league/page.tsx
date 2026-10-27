'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListOrdered, CalendarDays, Trophy, Shield, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { syncLeagueToFirestore } from '@/lib/sync/league-sync';
import type { AppSettings, UserProfile } from '@/types';
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

  // Raw datasets
  const standings = useMemo(() => leagueSettings?.leagueStandings || [], [leagueSettings]);
  const matches = useMemo(() => leagueSettings?.leagueMatches || [], [leagueSettings]);
  const skaters = useMemo(() => leagueSettings?.leagueSkaters || [], [leagueSettings]);
  const goalies = useMemo(() => leagueSettings?.leagueGoalies || [], [leagueSettings]);

  // Derived Analytics
  const teamSummaries = useMemo(() => {
    return calculateTeamAnalytics(standings, matches, skaters, goalies);
  }, [standings, matches, skaters, goalies]);

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
        description: 'Stahuji rozpis, výsledky kol, střelce a statistiky brankářů.',
      });

      const res = await fetch('/api/sync/league', { method: 'POST' });
      const syncResult = await res.json();

      if (syncResult.success) {
        toast({
          title: 'Statistiky ligy úspěšně synchronizovány!',
          description: `Aktualizováno ${syncResult.standingsCount} týmů, ${syncResult.matchesUpdated} zápasů a ${syncResult.skatersUpdated} hráčů.`,
        });
      } else {
        // Fallback to client-side write if server admin permissions hit edge-case
        const scrapeRes = await fetch('/api/sync/league?action=scrape');
        const scrapeJson = await scrapeRes.json();
        if (scrapeJson.success && scrapeJson.data) {
          const clientSync = await syncLeagueToFirestore(firestore, scrapeJson.data);
          if (clientSync.success) {
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
        lastSyncAt={leagueSettings?.leagueLastSyncAt}
        isAdmin={isAdmin}
        isSyncing={isSyncing}
        onSync={handleSyncLeague}
      />

      {!hasData ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-border/80 bg-card/60">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Ligová data zatím nejsou synchronizována</h3>
              <p className="text-xs text-muted-foreground">
                V databázi zatím nejsou uloženy výsledky ani tabulka ligy HobbyHokej Brno.
              </p>
            </div>
            {isAdmin && (
              <Button
                onClick={handleSyncLeague}
                disabled={isSyncing}
                className="font-bold text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Spustit prvotní synchronizaci
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
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 border border-border/60 rounded-xl">
            <TabsTrigger
              value="standings"
              className="py-2 text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
            >
              <ListOrdered className="h-4 w-4" />
              <span>Tabulka & Analytika</span>
            </TabsTrigger>

            <TabsTrigger
              value="matches"
              className="py-2 text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Zápasy & Výsledky ({matches.length})</span>
            </TabsTrigger>

            <TabsTrigger
              value="scorers"
              className="py-2 text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
            >
              <Trophy className="h-4 w-4" />
              <span>Kanadské bodování ({skaters.length})</span>
            </TabsTrigger>

            <TabsTrigger
              value="goalies"
              className="py-2 text-xs font-bold rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
            >
              <Shield className="h-4 w-4" />
              <span>Brankáři ({goalies.length})</span>
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
