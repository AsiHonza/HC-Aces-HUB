'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Loader2, Sparkles, Shield, Flame } from 'lucide-react';
import { useUser } from '@/firebase';
import { 
  HallOfFameTab, 
  useTeamMilestonesData, 
  calculatePlayerMilestones,
  MilestoneDetailModal,
  type MilestoneWithHolders
} from '@/features/stats';
import { PlayerCareerModal, type PlayerCareerData, type PlayerSeasonRecord, type GoalieSeasonRecord } from '@/components/player-career-modal';
import { countPlayerCareerStars } from '@/features/matches/utils/matchStars';
import { countPlayerCareerMvpAwards } from '@/features/matches/utils/mvpVoting';
import { cn } from '@/lib/utils';

export default function HallOfFamePage() {
  const { user } = useUser();
  const { 
    teamMilestonesData, 
    teamScoring, 
    goalieLeaderboard, 
    allUsers, 
    allMatches, 
    isLoading, 
    newMilestoneIds,
    markMilestonesAsSeen 
  } = useTeamMilestonesData(user?.uid);

  const [selectedCareerPlayer, setSelectedCareerPlayer] = useState<PlayerCareerData | null>(null);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [tabPlayerFilter, setTabPlayerFilter] = useState<string>('all');
  const [pageMilestoneDetail, setPageMilestoneDetail] = useState<MilestoneWithHolders | null>(null);

  // Automatically mark milestones as seen when user visits this page
  useEffect(() => {
    if (!isLoading) {
      markMilestonesAsSeen();
    }
  }, [isLoading, markMilestonesAsSeen]);

  const handleOpenMilestoneDetail = (milestoneId: string) => {
    const m = teamMilestonesData.allMilestones.find((item) => item.definition.id === milestoneId);
    if (m) {
      setPageMilestoneDetail(m);
    }
  };

  const handleOpenCareerModal = (playerId: string) => {
    const profile = allUsers?.find((u) => u.id === playerId);
    if (!profile) return;

    const isGoalie = profile.playerType === 'goalie';
    const skaterSeasons: PlayerSeasonRecord[] = [];
    const goalieSeasons: GoalieSeasonRecord[] = [];

    // Current season stats
    const currentSkaterStat = teamScoring.find((p) => p.id === profile.id);
    const currentGoalieStat = goalieLeaderboard.find((g) => g.id === profile.id);

    if (!isGoalie && currentSkaterStat) {
      skaterSeasons.push({
        seasonId: 'current',
        seasonName: 'Aktuální sezóna',
        year: '2026/27',
        isCurrent: true,
        gamesPlayed: currentSkaterStat.season?.gamesPlayed || 0,
        goals: currentSkaterStat.season?.goals || 0,
        assists: currentSkaterStat.season?.assists || 0,
        points: (currentSkaterStat.season?.goals || 0) + (currentSkaterStat.season?.assists || 0),
      });
      if (currentSkaterStat.rawHistory?.gamesPlayed > 0) {
        skaterSeasons.push({
          seasonId: 'prior-history',
          seasonName: 'Předchozí kariéra (historický záznam)',
          year: 'Před 2026',
          isCurrent: false,
          gamesPlayed: currentSkaterStat.rawHistory.gamesPlayed,
          goals: currentSkaterStat.rawHistory.goals,
          assists: currentSkaterStat.rawHistory.assists,
          points: currentSkaterStat.rawHistory.goals + currentSkaterStat.rawHistory.assists,
        });
      }
    }

    if (isGoalie && currentGoalieStat) {
      const sa = currentGoalieStat.season?.shotsAgainst || 0;
      const sv = currentGoalieStat.season?.saves || 0;
      const pct = sa > 0 ? (sv / sa) * 100 : 0;
      goalieSeasons.push({
        seasonId: 'current',
        seasonName: 'Aktuální sezóna',
        year: '2026/27',
        isCurrent: true,
        gamesPlayed: currentGoalieStat.season?.gamesPlayed || 0,
        wins: currentGoalieStat.season?.wins || 0,
        saves: sv,
        shotsAgainst: sa,
        savePercentage: Math.round(pct * 10) / 10,
        shutouts: currentGoalieStat.season?.so || 0,
      });
      if (currentGoalieStat.rawHistory?.gamesPlayed > 0) {
        const histSA = currentGoalieStat.rawHistory.shotsAgainst || 0;
        const histSV = currentGoalieStat.rawHistory.saves || 0;
        const histPct = histSA > 0 ? (histSV / histSA) * 100 : 0;
        goalieSeasons.push({
          seasonId: 'prior-history',
          seasonName: 'Předchozí kariéra (historický záznam)',
          year: 'Před 2026',
          isCurrent: false,
          gamesPlayed: currentGoalieStat.rawHistory.gamesPlayed,
          wins: currentGoalieStat.rawHistory.wins || 0,
          saves: histSV,
          shotsAgainst: histSA,
          savePercentage: Math.round(histPct * 10) / 10,
          shutouts: currentGoalieStat.rawHistory.so || 0,
        });
      }
    }

    const milestones = calculatePlayerMilestones(
      profile.id,
      profile.name,
      teamScoring,
      goalieLeaderboard,
      allMatches || []
    );

    setSelectedCareerPlayer({
      id: profile.id,
      name: profile.name,
      photoURL: profile.photoURL,
      jerseyNumber: profile.jerseyNumber,
      playerType: profile.playerType,
      role: profile.role,
      mvpAwardsCount: countPlayerCareerMvpAwards(profile.id, allMatches || []),
      starsStats: countPlayerCareerStars(profile.id, allMatches || []),
      skaterSeasons,
      goalieSeasons,
      milestones,
    });
    setIsCareerModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Načítám Síň slávy HC Aces...
        </p>
      </div>
    );
  }

  const totalUnlockedAcrossTeam = teamMilestonesData.allMilestones.reduce((sum, m) => sum + m.totalHolders, 0);

  return (
    <div className="py-6 space-y-6 max-w-7xl mx-auto">
      {/* HERO BANNER SÍNĚ SLÁVY */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-background to-background p-4 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 relative z-10">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner shrink-0">
              <Trophy className="h-6 w-6 sm:h-9 sm:w-9" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline font-black text-xl sm:text-2xl lg:text-3xl tracking-tight text-foreground">
                  Síň slávy HC Aces
                </h1>
                <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold uppercase">
                  5 Úrovní odznaků
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Přehled historických milníků, klubových odznaků, rekordů a blížících se jubileí v dresu HC Aces.
              </p>
            </div>
          </div>

          {/* Rychlý status */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div 
              onClick={() => setTabPlayerFilter('all')}
              className={cn(
                "rounded-xl border px-3 sm:px-3.5 py-2 text-center min-w-[85px] sm:min-w-[90px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm",
                tabPlayerFilter === 'all'
                  ? "bg-card/90 border-primary/50 shadow-md ring-1 ring-primary/40"
                  : "border-border/70 bg-card/70 hover:border-primary/40"
              )}
              title="Kliknutím zobrazíte odznaky celého týmu"
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">Tým pokořil</p>
              <p className="text-base sm:text-lg font-black font-headline text-foreground tabular-nums">
                {totalUnlockedAcrossTeam} <span className="text-xs text-amber-500 font-bold">odznaků</span>
              </p>
            </div>
            {user && (
              <div 
                onClick={() => setTabPlayerFilter((prev) => (prev === 'me' ? 'all' : 'me'))}
                className={cn(
                  "rounded-xl border px-3 sm:px-3.5 py-2 text-center min-w-[85px] sm:min-w-[90px] cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm select-none",
                  tabPlayerFilter === 'me'
                    ? "bg-amber-500 text-amber-950 font-bold border-amber-600 shadow-md ring-2 ring-amber-400"
                    : "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                )}
                title="Kliknutím přepnete filtr na svoje získané odznaky"
              >
                <p className={cn("text-[10px] sm:text-xs uppercase font-semibold", tabPlayerFilter === 'me' ? "text-amber-950" : "text-amber-600 dark:text-amber-400")}>
                  Tvoje odznaky
                </p>
                <p className={cn("text-base sm:text-lg font-black font-headline tabular-nums", tabPlayerFilter === 'me' ? "text-amber-950" : "text-amber-500")}>
                  {teamMilestonesData.myUnlockedCount} / {teamMilestonesData.totalMilestonesCount}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OBSAH SÍNĚ SLÁVY */}
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="p-2 sm:p-6">
          <HallOfFameTab
            key={tabPlayerFilter}
            milestones={teamMilestonesData.allMilestones}
            upcomingMilestones={teamMilestonesData.upcomingMilestones}
            allUsers={allUsers || []}
            currentUserId={user?.uid}
            onOpenPlayerCareer={handleOpenCareerModal}
            trophyLeaders={teamMilestonesData.trophyLeaders}
            newMilestoneIds={newMilestoneIds}
            initialPlayerId={tabPlayerFilter}
          />
        </CardContent>
      </Card>

      {/* Kariérní karta hráče */}
      <PlayerCareerModal
        player={selectedCareerPlayer}
        isOpen={isCareerModalOpen}
        onClose={() => {
          setIsCareerModalOpen(false);
          setSelectedCareerPlayer(null);
        }}
        onOpenMilestoneDetail={handleOpenMilestoneDetail}
      />

      {/* Detail odznaku otevřený z kariérní karty */}
      <MilestoneDetailModal
        milestone={pageMilestoneDetail}
        isOpen={Boolean(pageMilestoneDetail)}
        onClose={() => setPageMilestoneDetail(null)}
        onOpenPlayerCareer={handleOpenCareerModal}
        currentUserId={user?.uid}
      />
    </div>
  );
}
