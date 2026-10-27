'use client';

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { formatName, isGoaliePlayer, areNamesMatching } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';
import { BirthdaysCard, rosterService } from '@/features/roster';
import {
  getSeasonStartMs,
  calculateTeamMilestonesOverview,
  calculatePlayerMilestones,
  statsService,
  historicalStatsBackupService,
  detectFinalsStatus,
} from '@/features/stats';
import { syncLeagueToFirestore } from '@/lib/sync/league-sync';
import type { PlayoffSeries, LeagueStanding, Match, UserProfile, AppSettings } from '@/types';

interface Attendance {
  id: string;
  userId: string;
  matchId: string;
  status: 'going' | 'not-going' | 'unknown';
  note?: string;
}
import { attendanceService } from '@/features/attendance';
import {
  getMatchDetails,
  RecentMatchesSection,
  PostMatchSection,
  getMvpVotingStatus,
  calculateMatchStarsResults,
  type CelebrationAwardData,
  countPlayerCareerMvpAwards,
  countPlayerCareerStars,
  matchesService,
  type RecordResultData,
  type MatchFormData,
} from '@/features/matches';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import {
  doc,
  collection,
  collectionGroup,
  updateDoc,
  query,
  Timestamp,
  orderBy,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { startOfDay, addDays, parseISO, isValid, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { type Lineup, sanitizeLineup, type Player } from '@/components/lineup-builder';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { type PlayerCareerData } from '@/components/player-career-modal';
import { useIsDesktop } from '@/hooks/use-mobile';
import {
  OldMatchesAlert,
  PlayerIdentityStrip,
  UpcomingMatchesSection,
  CompetitionSection,
  TeamScoringSection,
  type StatsPeriod,
  type ScoringPeriod,
} from '@/features/dashboard';

// --- Next.js Dynamic Imports pro těžké dialogy a editory ---
const LineupBuilder = dynamic(
  () => import('@/components/lineup-builder').then((mod) => mod.LineupBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

const LineupDisplay = dynamic(
  () => import('@/components/lineup-builder').then((mod) => mod.LineupDisplay),
  { ssr: false }
);

const PlayerCareerModal = dynamic(
  () => import('@/components/player-career-modal').then((mod) => mod.PlayerCareerModal),
  { ssr: false }
);

const MatchStarsModal = dynamic(
  () => import('@/features/matches').then((mod) => mod.MatchStarsModal),
  { ssr: false }
);

const MatchAwardCelebrationModal = dynamic(
  () => import('@/features/matches').then((mod) => mod.MatchAwardCelebrationModal),
  { ssr: false }
);

const RecordResultDialog = dynamic(
  () => import('@/features/matches').then((mod) => mod.RecordResultDialog),
  { ssr: false }
);

const MatchFormDialog = dynamic(
  () => import('@/features/matches').then((mod) => mod.MatchFormDialog),
  { ssr: false }
);

const PlayoffSeriesDialog = dynamic(
  () => import('@/features/stats').then((mod) => mod.PlayoffSeriesDialog),
  { ssr: false }
);

const ArchiveSeasonDialog = dynamic(
  () => import('@/features/stats').then((mod) => mod.ArchiveSeasonDialog),
  { ssr: false }
);

const FinalsCelebrationBanner = dynamic(
  () => import('@/features/stats').then((mod) => mod.FinalsCelebrationBanner),
  { ssr: false }
);

interface SkaterStats {
  id: string;
  userProfileId: string;
  seasonGoals: number;
  seasonAssists: number;
  seasonGamesPlayed: number;
  playoffGoals: number;
  playoffAssists: number;
  playoffGamesPlayed: number;
  historicalGoals: number;
  historicalAssists: number;
  historicalGamesPlayed: number;
}

interface GoalieStats {
  id: string;
  userProfileId: string;
  seasonGamesPlayed: number;
  seasonWins: number;
  seasonShotsAgainst: number;
  seasonSaves: number;
  seasonSO: number;
  playoffGamesPlayed: number;
  playoffWins: number;
  playoffSaves: number;
  playoffShotsAgainst: number;
  playoffSO: number;
  historicalGamesPlayed: number;
  historicalWins: number;
  historicalShotsAgainst: number;
  historicalSaves: number;
  historicalSO: number;
}

interface SeasonArchive {
  id: string;
  name: string;
  year: string;
  teamCount: number;
  archivedAt: Timestamp;
  standings: LeagueStanding[];
  playoffSeries: PlayoffSeries[];
  skaterStats?: any[];
  goalieStats?: any[];
  matches?: any[];
}

export interface MatchDisplayItem {
  id: string;
  round?: number | null;
  team1: string;
  team2: string;
  team1Score?: number;
  team2Score?: number;
  location?: string;
  date?: string;
  dateTime?: any;
  isPlayed?: boolean;
  type?: 'regular' | 'playoff' | 'friendly';
  playoffStage?: string | null;
  playoffMatchNumber?: number | null;
  scorers?: { goal: string; assist: string | null }[];
  lineup?: Lineup;
  goalieName?: string;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
  goalieSavePercentage?: number;
  periodScores?: string;
  shotsTeam1?: number;
  shotsTeam2?: number;
  shotsAces?: number;
  shotsOpponent?: number;
  penaltiesTeam1?: number;
  penaltiesTeam2?: number;
  penaltiesAces?: number;
  penaltiesOpponent?: number;
  detailedScorers?: { minute: number; team: string; scorer: string; assist: string | null; isPenaltyShot?: boolean }[];
  gameRoster?: string[];
  opponentRoster?: string[];
}

function DashboardPageContent() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();

  // Dialogy a modální stavy
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Docházka
  const [optimisticAttendances, setOptimisticAttendances] = useState<Map<string, Partial<Attendance>>>(new Map());
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ matchId: string; status: 'going' | 'not-going' } | null>(null);
  const [attendanceNote, setAttendanceNote] = useState('');

  // Zvýraznění a akordeon
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [highlightReason, setHighlightReason] = useState<string | null>(null);
  const [openAccordionValue, setOpenAccordionValue] = useState('');

  // Pohledy na statistiky
  const [myStatsView, setMyStatsView] = useState<StatsPeriod>('regular');
  const [scoringView, setScoringView] = useState<ScoringPeriod>('regular');

  // Sestava dialogy
  const [isLineupBuilderOpen, setIsLineupBuilderOpen] = useState(false);
  const [lineupMatch, setLineupMatch] = useState<Match | null>(null);
  const [isLineupViewOpen, setIsLineupViewOpen] = useState(false);
  const [viewLineupData, setViewLineupData] = useState<Lineup | null>(null);
  const [viewScorersData, setViewScorersData] = useState<{ goal: string; assist: string | null }[] | undefined>(undefined);
  const [viewMatchOpponent, setViewMatchOpponent] = useState<string | null>(null);

  // Sezóny a správa ligy
  const [isPlayoffDialogOpen, setIsPlayoffDialogOpen] = useState(false);
  const [isArchiveSeasonDialogOpen, setIsArchiveSeasonDialogOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('current');
  const [selectedCareerPlayer, setSelectedCareerPlayer] = useState<PlayerCareerData | null>(null);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [isStarsModalOpen, setIsStarsModalOpen] = useState(false);
  const [selectedVotingMatch, setSelectedVotingMatch] = useState<Match | null>(null);

  const [celebrationAward, setCelebrationAward] = useState<CelebrationAwardData | null>(null);
  const [isCelebrationModalOpen, setIsCelebrationModalOpen] = useState(false);

  // --- Firestore Queries ---
  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

  const skaterStatsRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid, 'skaterStats', 'stats') : null), [firestore, user]);
  const { data: skaterStatsData, isLoading: isSkaterStatsLoading } = useDoc<SkaterStats>(skaterStatsRef);

  const goalieStatsRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid, 'goalieStats', 'stats') : null), [firestore, user]);
  const { data: goalieStatsData, isLoading: isGoalieStatsLoading } = useDoc<GoalieStats>(goalieStatsRef);

  const matchesQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, 'matches'), orderBy('dateTime', 'asc')) : null), [firestore, user]);
  const { data: allMatches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);

  const usersRef = useMemoFirebase(() => (firestore && user ? collection(firestore, 'users') : null), [firestore, user]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersRef);

  const allSkaterStatsRef = useMemoFirebase(() => (firestore && user ? collectionGroup(firestore, 'skaterStats') : null), [firestore, user]);
  const { data: allSkaterStats, isLoading: areSkaterStatsLoading } = useCollection<SkaterStats>(allSkaterStatsRef);

  const allGoalieStatsRef = useMemoFirebase(() => (firestore && user ? collectionGroup(firestore, 'goalieStats') : null), [firestore, user]);
  const { data: allGoalieStats, isLoading: areGoalieStatsLoading } = useCollection<GoalieStats>(allGoalieStatsRef);

  const attendancesQuery = useMemoFirebase(() => (firestore && user ? query(collectionGroup(firestore, 'attendees')) : null), [firestore, user]);
  const { data: allAttendances, isLoading: attendancesLoading } = useCollection<Attendance>(attendancesQuery);

  const leagueSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'settings', 'league') : null), [firestore]);
  const { data: leagueSettings, isLoading: leagueSettingsLoading } = useDoc<AppSettings>(leagueSettingsRef);
  const seasonStartMs = useMemo(() => getSeasonStartMs(leagueSettings), [leagueSettings]);

  // Archivní sezóny se načítají na pozadí a neblokují kritické zobrazení dashboardu
  const seasonsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'seasons'), orderBy('archivedAt', 'desc')) : null), [firestore]);
  const { data: archivedSeasons } = useCollection<SeasonArchive>(seasonsQuery);

  // --- Memoizované výpočty ---
  const upcomingMatches = useMemo(() => {
    if (!allMatches) return [];
    const nowMs = Date.now();
    return allMatches
      .filter((match) => {
        const mTime = toJsDate(match.dateTime).getTime();
        if (mTime < seasonStartMs) return false;
        return !match.isPlayed && mTime + 90 * 60 * 1000 > nowMs;
      })
      .sort((a, b) => toJsDate(a.dateTime).getTime() - toJsDate(b.dateTime).getTime());
  }, [allMatches, seasonStartMs]);

  const matchesAwaitingResult = useMemo(() => {
    if (!allMatches) return [];
    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const playedRoundNumbers = new Set(
      allMatches
        .filter((m) => m.isPlayed && m.round !== undefined && m.round !== null)
        .map((m) => Number(m.round))
    );

    return allMatches
      .filter((match) => {
        const mTime = toJsDate(match.dateTime).getTime();
        if (mTime < seasonStartMs) return false;

        if (match.round !== undefined && match.round !== null && playedRoundNumbers.has(Number(match.round))) {
          return false;
        }

        const matchEndTime = mTime + 90 * 60 * 1000;
        const isRecentlyEnded = matchEndTime <= nowMs && nowMs - matchEndTime <= sevenDaysMs;
        return !match.isPlayed && isRecentlyEnded;
      })
      .sort((a, b) => toJsDate(b.dateTime).getTime() - toJsDate(a.dateTime).getTime());
  }, [allMatches, seasonStartMs]);

  const oldUnrecordedMatches = useMemo(() => {
    if (!allMatches) return [];
    return allMatches.filter((m) => !m.isPlayed && toJsDate(m.dateTime).getTime() < seasonStartMs);
  }, [allMatches, seasonStartMs]);

  const upcomingBirthdays = useMemo(() => {
    if (!allUsers) return [];
    const now = startOfDay(new Date());
    const sevenDaysFromNow = addDays(now, 7);
    return allUsers
      .filter((u) => {
        if (!u.dob) return false;
        const dob = parseISO(u.dob);
        if (!isValid(dob)) return false;
        let currentYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (currentYearBday < now && differenceInDays(now, currentYearBday) > 300) {
          currentYearBday.setFullYear(now.getFullYear() + 1);
        }
        return currentYearBday >= now && currentYearBday <= sevenDaysFromNow;
      })
      .sort((a, b) => {
        const dobA = parseISO(a.dob!);
        const dobB = parseISO(b.dob!);
        return dobA.getMonth() - dobB.getMonth() || dobA.getDate() - dobB.getDate();
      });
  }, [allUsers]);

  const playedMatches = useMemo(() => {
    if (!allMatches) return [];
    return allMatches
      .filter((match) => match.isPlayed)
      .sort((a, b) => toJsDate(b.dateTime).getTime() - toJsDate(a.dateTime).getTime());
  }, [allMatches]);

  const recentPlayedMatches = useMemo<MatchDisplayItem[]>(() => {
    if (selectedSeasonId !== 'current') {
      const archived = archivedSeasons?.find((s) => s.id === selectedSeasonId);
      if (archived?.matches && archived.matches.length > 0) {
        return archived.matches;
      }
      return playedMatches.filter(
        (m) => m.seasonId === selectedSeasonId || toJsDate(m.dateTime).getTime() < seasonStartMs
      );
    }
    return playedMatches
      .filter((m) => toJsDate(m.dateTime).getTime() >= seasonStartMs)
      .slice(0, 5);
  }, [selectedSeasonId, archivedSeasons, playedMatches, seasonStartMs]);

  const teamScoring = useMemo(() => {
    if (!allUsers || !allSkaterStats) return [];
    const statsMap = new Map<string, SkaterStats>();
    allSkaterStats.forEach((stat) => {
      if (stat.userProfileId) statsMap.set(stat.userProfileId, stat);
    });
    return allUsers
      .filter((u) => u.playerType === 'player')
      .map((u) => {
        const stats = statsMap.get(u.id);
        const reg = {
          goals: stats?.seasonGoals ?? 0,
          assists: stats?.seasonAssists ?? 0,
          gamesPlayed: stats?.seasonGamesPlayed ?? 0,
        };
        const po = {
          goals: stats?.playoffGoals ?? 0,
          assists: stats?.playoffAssists ?? 0,
          gamesPlayed: stats?.playoffGamesPlayed ?? 0,
        };

        return {
          id: u.id,
          name: formatName(u.name),
          regular: reg,
          playoff: po,
          season: {
            goals: reg.goals + po.goals,
            assists: reg.assists + po.assists,
            gamesPlayed: reg.gamesPlayed + po.gamesPlayed,
          },
          history: {
            goals: (stats?.historicalGoals ?? 0) + reg.goals + po.goals,
            assists: (stats?.historicalAssists ?? 0) + reg.assists + po.assists,
            gamesPlayed: (stats?.historicalGamesPlayed ?? 0) + reg.gamesPlayed + po.gamesPlayed,
          },
          rawHistory: {
            goals: stats?.historicalGoals ?? 0,
            assists: stats?.historicalAssists ?? 0,
            gamesPlayed: stats?.historicalGamesPlayed ?? 0,
          },
        };
      });
  }, [allUsers, allSkaterStats]);

  const goalieLeaderboard = useMemo(() => {
    if (!allUsers || !allGoalieStats) return [];
    const statsMap = new Map<string, GoalieStats>();
    allGoalieStats.forEach((stat) => {
      if (stat.userProfileId) statsMap.set(stat.userProfileId, stat);
    });

    return allUsers
      .filter((u) => u.playerType === 'goalie')
      .map((u) => {
        const stats = statsMap.get(u.id);
        let matchWins = 0;
        let matchGames = 0;
        let matchSO = 0;
        if (allMatches) {
          const uTokens = (u.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/);
          const uSurname = uTokens[uTokens.length - 1] || '';
          for (const m of allMatches) {
            if (!m.isPlayed) continue;
            const mTime = toJsDate(m.dateTime).getTime();
            if (mTime < seasonStartMs) continue;
            if (m.type && m.type !== 'regular') continue;

            const isT1 = /aces/i.test(m.team1 || '');
            const isT2 = /aces/i.test(m.team2 || '');
            if (!isT1 && !isT2) continue;
            const gName = (m.goalieName || m.lineup?.B1?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const gId = m.goalieId || m.lineup?.B1?.id;
            if (gId === u.id || (uSurname && gName.includes(uSurname))) {
              matchGames++;
              const acesScore = isT1 ? (m.team1Score ?? 0) : (m.team2Score ?? 0);
              const oppScore = isT1 ? (m.team2Score ?? 0) : (m.team1Score ?? 0);
              if (acesScore > oppScore) matchWins++;
              if (oppScore === 0) matchSO++;
            }
          }
        }

        const officialGames = stats?.seasonGamesPlayed ?? 0;
        const regGames = officialGames > 0 ? officialGames : matchGames;
        let regWins = Math.max(stats?.seasonWins ?? 0, matchWins);
        if (regGames > 0 && regWins > regGames) {
          regWins = Math.min(matchWins > 0 ? matchWins : regWins, regGames);
        }

        const regSO = Math.max(stats?.seasonSO ?? 0, matchSO);
        const shotsAgainst = stats?.seasonShotsAgainst ?? 0;
        const saves = stats?.seasonSaves ?? 0;
        const goalsAgainst = Math.max(0, shotsAgainst - saves);

        const reg = {
          gamesPlayed: regGames,
          wins: regWins,
          shotsAgainst,
          saves,
          goalsAgainst,
          so: regSO,
        };
        const poShotsAgainst = stats?.playoffShotsAgainst ?? 0;
        const poSaves = stats?.playoffSaves ?? 0;
        const poGoalsAgainst = Math.max(0, poShotsAgainst - poSaves);
        const po = {
          gamesPlayed: stats?.playoffGamesPlayed ?? 0,
          wins: stats?.playoffWins ?? 0,
          shotsAgainst: poShotsAgainst,
          saves: poSaves,
          goalsAgainst: poGoalsAgainst,
          so: stats?.playoffSO ?? 0,
        };

        const seasonSaves = reg.saves + po.saves;
        const seasonShots = reg.shotsAgainst + po.shotsAgainst;
        const seasonGA = reg.goalsAgainst + po.goalsAgainst;

        const histSaves = (stats?.historicalSaves ?? 0) + seasonSaves;
        const histShots = (stats?.historicalShotsAgainst ?? 0) + seasonShots;
        const histGA = Math.max(0, histShots - histSaves);

        return {
          id: u.id,
          name: formatName(u.name),
          regular: reg,
          playoff: po,
          season: {
            gamesPlayed: reg.gamesPlayed + po.gamesPlayed,
            wins: reg.wins + po.wins,
            shotsAgainst: seasonShots,
            saves: seasonSaves,
            goalsAgainst: seasonGA,
            so: reg.so + po.so,
          },
          history: {
            gamesPlayed: (stats?.historicalGamesPlayed ?? 0) + reg.gamesPlayed + po.gamesPlayed,
            wins: (stats?.historicalWins ?? 0) + reg.wins + po.wins,
            shotsAgainst: histShots,
            saves: histSaves,
            goalsAgainst: histGA,
            so: (stats?.historicalSO ?? 0) + reg.so + po.so,
          },
          rawHistory: {
            gamesPlayed: stats?.historicalGamesPlayed ?? 0,
            wins: stats?.historicalWins ?? 0,
            shotsAgainst: stats?.historicalShotsAgainst ?? 0,
            saves: stats?.historicalSaves ?? 0,
            goalsAgainst: Math.max(0, (stats?.historicalShotsAgainst ?? 0) - (stats?.historicalSaves ?? 0)),
            so: stats?.historicalSO ?? 0,
          },
        };
      });
  }, [allUsers, allGoalieStats, allMatches, seasonStartMs]);

  const sortedTeamScoring = useMemo(() => {
    if (selectedSeasonId !== 'current') {
      const archived = archivedSeasons?.find((s) => s.id === selectedSeasonId);
      if (archived?.skaterStats && archived.skaterStats.length > 0) {
        return archived.skaterStats
          .map((s, idx) => ({
            id: s.userProfileId || `archived-${idx}`,
            name: s.name,
            gamesPlayed: s.regularGamesPlayed + (s.playoffGamesPlayed || 0),
            goals: s.regularGoals + (s.playoffGoals || 0),
            assists: s.regularAssists + (s.playoffAssists || 0),
            points: s.totalPoints ?? ((s.regularGoals || 0) + (s.regularAssists || 0)),
            rank: s.rank || idx + 1,
          }))
          .sort((a, b) => b.points - a.points || b.goals - a.goals)
          .map((p, i) => ({ ...p, rank: i + 1 }));
      }
      return [];
    }

    const view =
      scoringView === 'season'
        ? 'season'
        : scoringView === 'history'
        ? 'history'
        : scoringView === 'playoff'
        ? 'playoff'
        : 'regular';
    const dataSet = teamScoring.map((p) => ({ id: p.id, name: p.name, ...p[view] }));
    return dataSet
      .map((p) => ({
        ...p,
        points: (Number(p.goals) || 0) + (Number(p.assists) || 0),
      }))
      .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0) || (Number(b.goals) || 0) - (Number(a.goals) || 0))
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [selectedSeasonId, archivedSeasons, teamScoring, scoringView]);

  const sortedGoalieLeaderboard = useMemo(() => {
    if (selectedSeasonId !== 'current') {
      const archived = archivedSeasons?.find((s) => s.id === selectedSeasonId);
      if (archived?.goalieStats && archived.goalieStats.length > 0) {
        return archived.goalieStats
          .map((g, idx) => {
            const sa = g.shotsAgainst || 0;
            const s = g.saves || 0;
            const ga = Math.max(0, sa - s);
            return {
              id: g.userProfileId || `archived-g-${idx}`,
              name: g.name,
              gamesPlayed: g.gamesPlayed,
              wins: g.wins,
              saves: s,
              shotsAgainst: sa,
              goalsAgainst: ga,
              savePercentage: g.savePercentage,
              so: g.shutouts,
              rank: idx + 1,
            };
          })
          .sort((a, b) => (b.savePercentage || 0) - (a.savePercentage || 0) || b.wins - a.wins)
          .map((g, i) => ({ ...g, rank: i + 1 }));
      }
      return [];
    }

    const view =
      scoringView === 'season'
        ? 'season'
        : scoringView === 'history'
        ? 'history'
        : scoringView === 'playoff'
        ? 'playoff'
        : 'regular';
    const dataSet = goalieLeaderboard.map((g) => ({ id: g.id, name: g.name, ...g[view] }));
    return dataSet
      .map((g) => {
        const sa = Number(g.shotsAgainst) || 0;
        const s = Number(g.saves) || 0;
        const ga = g.goalsAgainst ?? Math.max(0, sa - s);
        return {
          ...g,
          goalsAgainst: ga,
          savePercentage: sa > 0 ? (s / sa) * 100 : 0,
        };
      })
      .sort((a, b) => (b.savePercentage || 0) - (a.savePercentage || 0) || (Number(b.wins) || 0) - (Number(a.wins) || 0))
      .map((g, i) => ({ ...g, rank: i + 1 }));
  }, [selectedSeasonId, archivedSeasons, goalieLeaderboard, scoringView]);

  const currentUserStars = useMemo(() => {
    if (!user || !allMatches) {
      return { star1Count: 0, star2Count: 0, star3Count: 0, totalPoints: 0, totalStars: 0 };
    }
    const scopedMatches = allMatches.filter((m) => {
      if (myStatsView === 'regular') return m.type === 'regular';
      if (myStatsView === 'playoff') return m.type === 'playoff';
      if (myStatsView === 'season') return m.type === 'regular' || m.type === 'playoff';
      return true;
    });
    return countPlayerCareerStars(user.uid, scopedMatches);
  }, [user, allMatches, myStatsView]);

  const teamStarsLeaderboard = useMemo(() => {
    if (!allUsers || !allMatches) return [];
    const list = allUsers.map((u) => {
      const stats = countPlayerCareerStars(u.id, allMatches);
      return {
        id: u.id,
        name: formatName(u.name),
        jerseyNumber: u.jerseyNumber,
        photoURL: u.photoURL,
        playerType: u.playerType,
        ...stats,
      };
    });

    return list
      .filter((p) => p.totalPoints > 0)
      .sort(
        (a, b) =>
          b.totalPoints - a.totalPoints ||
          b.star1Count - a.star1Count ||
          b.star2Count - a.star2Count ||
          b.star3Count - a.star3Count
      )
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [allUsers, allMatches]);

  const skaterStarsLeaderboard = useMemo(() => {
    return teamStarsLeaderboard
      .filter((p) => p.playerType !== 'goalie')
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [teamStarsLeaderboard]);

  const goalieStarsLeaderboard = useMemo(() => {
    return teamStarsLeaderboard
      .filter((p) => p.playerType === 'goalie')
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [teamStarsLeaderboard]);

  const attendancesByMatch = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    allAttendances?.forEach((att) => {
      if (!map.has(att.matchId)) map.set(att.matchId, []);
      map.get(att.matchId)!.push(att);
    });
    return map;
  }, [allAttendances]);

  const teamMilestonesData = useMemo(() => {
    return calculateTeamMilestonesOverview(
      allUsers || [],
      teamScoring,
      goalieLeaderboard,
      allMatches || [],
      user?.uid,
      attendancesByMatch
    );
  }, [allUsers, teamScoring, goalieLeaderboard, allMatches, user?.uid, attendancesByMatch]);

  const currentUserBadges = useMemo(() => {
    if (!user) return [];
    return teamMilestonesData.playerFormMap?.get(user.uid)?.badges || [];
  }, [user, teamMilestonesData.playerFormMap]);

  const userAttendancesWithOptimistic = useMemo(() => {
    const map = new Map<string, Attendance>();
    if (user && allAttendances) {
      allAttendances.filter((att) => att.userId === user.uid).forEach((att) => map.set(att.matchId, att));
    }
    optimisticAttendances.forEach((opt, mId) => {
      if (opt.status !== 'unknown') {
        const ex = map.get(mId) || ({ id: user!.uid, userId: user!.uid, matchId: mId } as Attendance);
        map.set(mId, { ...ex, ...opt } as Attendance);
      } else {
        map.delete(mId);
      }
    });
    return map;
  }, [allAttendances, user, optimisticAttendances]);

  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (!allUsers) return map;
    allUsers.forEach((u) => {
      const pType: UserProfile['playerType'] = isGoaliePlayer(u) ? 'goalie' : u.playerType;
      map.set(u.id, { ...u, playerType: pType });
    });
    return map;
  }, [allUsers]);

  const activeSeasonData = useMemo(() => {
    if (selectedSeasonId === 'current') {
      return {
        standings: leagueSettings?.leagueStandings || [],
        playoffSeries: leagueSettings?.playoffSeries || [],
        name: leagueSettings?.currentSeasonName || 'Aktuální sezóna',
      };
    }
    const archived = archivedSeasons?.find((s) => s.id === selectedSeasonId);
    return {
      standings: archived?.standings || [],
      playoffSeries: archived?.playoffSeries || [],
      name: archived?.name || 'Archiv',
    };
  }, [selectedSeasonId, leagueSettings, archivedSeasons]);

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
      matches: allMatches,
      playoffSeries: leagueSettings?.playoffSeries,
      leagueMatches: leagueSettings?.leagueMatches,
    });
  }, [selectedSeasonId, allMatches, leagueSettings?.playoffSeries, leagueSettings?.leagueMatches]);

  // Optimalizace: seasonsLoading záměrně neblokuje kritické načtení stránky
  const isLoading =
    isUserProfileLoading ||
    isSkaterStatsLoading ||
    isGoalieStatsLoading ||
    areMatchesLoading ||
    areUsersLoading ||
    areSkaterStatsLoading ||
    areGoalieStatsLoading ||
    attendancesLoading ||
    leagueSettingsLoading;

  useEffect(() => {
    if (isLoading) return;
    const mId = searchParams.get('matchId');
    const reason = searchParams.get('reason');
    if (!mId) return;

    const isUpcomingButNotNext = upcomingMatches.slice(1).some((m) => m.id === mId);
    if (isUpcomingButNotNext) {
      setOpenAccordionValue('item-1');
    }

    const timer = setTimeout(() => {
      const el = document.getElementById(`match-${mId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMatchId(mId);
        setHighlightReason(reason);
        setTimeout(() => {
          setHighlightedMatchId(null);
          setHighlightReason(null);
        }, 4000);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [isLoading, searchParams, upcomingMatches]);

  const handleShareMatch = (mId: string) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('matchId', mId);
    navigator.clipboard.writeText(url.toString()).then(() => toast({ title: 'Odkaz zkopírován' }));
  };

  const handleOpenCareerModal = (playerId: string) => {
    const profile = usersMap.get(playerId);
    if (!profile) return;

    const isGoalie = profile.playerType === 'goalie';
    const currentSkaterStat = allSkaterStats?.find((s) => s.userProfileId === playerId);
    const currentGoalieStat = allGoalieStats?.find((g) => g.userProfileId === playerId);

    const skaterSeasons: PlayerCareerData['skaterSeasons'] = [];
    const goalieSeasons: PlayerCareerData['goalieSeasons'] = [];

    if (!isGoalie && currentSkaterStat) {
      const regG = currentSkaterStat.seasonGoals || 0;
      const regA = currentSkaterStat.seasonAssists || 0;
      const poG = currentSkaterStat.playoffGoals || 0;
      const poA = currentSkaterStat.playoffAssists || 0;
      const totalG = regG + poG;
      const totalA = regA + poA;
      const totalGP = (currentSkaterStat.seasonGamesPlayed || 0) + (currentSkaterStat.playoffGamesPlayed || 0);

      skaterSeasons.push({
        seasonId: leagueSettings?.currentSeasonId || 'current',
        seasonName: leagueSettings?.currentSeasonName || 'Aktuální sezóna 2025/2026',
        year: '2025/26',
        isCurrent: true,
        gamesPlayed: totalGP,
        goals: totalG,
        assists: totalA,
        points: totalG + totalA,
      });
    }

    if (isGoalie && currentGoalieStat) {
      const regGP = currentGoalieStat.seasonGamesPlayed || 0;
      const poGP = currentGoalieStat.playoffGamesPlayed || 0;
      const totalGP = regGP + poGP;
      const wins = (currentGoalieStat.seasonWins || 0) + (currentGoalieStat.playoffWins || 0);
      const saves = (currentGoalieStat.seasonSaves || 0) + (currentGoalieStat.playoffSaves || 0);
      const sa = (currentGoalieStat.seasonShotsAgainst || 0) + (currentGoalieStat.playoffShotsAgainst || 0);
      const so = (currentGoalieStat.seasonSO || 0) + (currentGoalieStat.playoffSO || 0);
      const pct = sa > 0 ? (saves / sa) * 100 : 0;

      goalieSeasons.push({
        seasonId: leagueSettings?.currentSeasonId || 'current',
        seasonName: leagueSettings?.currentSeasonName || 'Aktuální sezóna 2025/2026',
        year: '2025/26',
        isCurrent: true,
        gamesPlayed: totalGP,
        wins,
        saves,
        shotsAgainst: sa,
        savePercentage: Math.round(pct * 10) / 10,
        shutouts: so,
      });
    }

    if (archivedSeasons) {
      archivedSeasons.forEach((archive) => {
        if (!isGoalie && archive.skaterStats) {
          const found = archive.skaterStats.find(
            (s) => s.userProfileId === playerId || s.name.toLowerCase() === profile.name.toLowerCase()
          );
          if (found) {
            skaterSeasons.push({
              seasonId: archive.id,
              seasonName: archive.name,
              year: archive.year,
              isCurrent: false,
              gamesPlayed: (found.regularGamesPlayed || 0) + (found.playoffGamesPlayed || 0),
              goals: (found.regularGoals || 0) + (found.playoffGoals || 0),
              assists: (found.regularAssists || 0) + (found.playoffAssists || 0),
              points: found.totalPoints ?? ((found.regularGoals || 0) + (found.regularAssists || 0)),
            });
          }
        }

        if (isGoalie && archive.goalieStats) {
          const found = archive.goalieStats.find(
            (g) => g.userProfileId === playerId || g.name.toLowerCase() === profile.name.toLowerCase()
          );
          if (found) {
            goalieSeasons.push({
              seasonId: archive.id,
              seasonName: archive.name,
              year: archive.year,
              isCurrent: false,
              gamesPlayed: found.gamesPlayed,
              wins: found.wins,
              saves: found.saves,
              shotsAgainst: found.shotsAgainst,
              savePercentage: found.savePercentage,
              shutouts: found.shutouts,
            });
          }
        }
      });
    }

    if (!isGoalie && currentSkaterStat && currentSkaterStat.historicalGamesPlayed > 0) {
      const archivedGames = skaterSeasons.filter((s) => !s.isCurrent).reduce((sum, s) => sum + s.gamesPlayed, 0);
      const unrecordedGP = currentSkaterStat.historicalGamesPlayed - archivedGames;
      const unrecordedG = Math.max(
        0,
        currentSkaterStat.historicalGoals - skaterSeasons.filter((s) => !s.isCurrent).reduce((sum, s) => sum + s.goals, 0)
      );
      const unrecordedA = Math.max(
        0,
        currentSkaterStat.historicalAssists - skaterSeasons.filter((s) => !s.isCurrent).reduce((sum, s) => sum + s.assists, 0)
      );

      if (unrecordedGP > 0 || unrecordedG > 0 || unrecordedA > 0) {
        skaterSeasons.push({
          seasonId: 'prior-history',
          seasonName: 'Historické statistiky (do 14. 4. 2026)',
          year: 'Do 2026',
          isCurrent: false,
          gamesPlayed: unrecordedGP > 0 ? unrecordedGP : currentSkaterStat.historicalGamesPlayed,
          goals: unrecordedG > 0 ? unrecordedG : currentSkaterStat.historicalGoals,
          assists: unrecordedA > 0 ? unrecordedA : currentSkaterStat.historicalAssists,
          points:
            (unrecordedG > 0 ? unrecordedG : currentSkaterStat.historicalGoals) +
            (unrecordedA > 0 ? unrecordedA : currentSkaterStat.historicalAssists),
        });
      }
    }

    if (isGoalie && currentGoalieStat && currentGoalieStat.historicalGamesPlayed > 0) {
      const archivedGames = goalieSeasons.filter((s) => !s.isCurrent).reduce((sum, s) => sum + s.gamesPlayed, 0);
      const unrecordedGP = currentGoalieStat.historicalGamesPlayed - archivedGames;
      if (unrecordedGP > 0) {
        const histSA = currentGoalieStat.historicalShotsAgainst || 0;
        const histSV = currentGoalieStat.historicalSaves || 0;
        const histPct = histSA > 0 ? (histSV / histSA) * 100 : 0;
        goalieSeasons.push({
          seasonId: 'prior-history',
          seasonName: 'Historické statistiky (do 14. 4. 2026)',
          year: 'Do 2026',
          isCurrent: false,
          gamesPlayed: unrecordedGP,
          wins: currentGoalieStat.historicalWins || 0,
          saves: histSV,
          shotsAgainst: histSA,
          savePercentage: Math.round(histPct * 10) / 10,
          shutouts: currentGoalieStat.historicalSO || 0,
        });
      }
    }

    const milestones = calculatePlayerMilestones(
      profile.id,
      profile.name,
      teamScoring,
      goalieLeaderboard,
      allMatches || [],
      profile as any,
      attendancesByMatch
    );

    const chemistry = teamMilestonesData.teamChemistry?.byPlayerId.get(profile.id) || null;
    const formSummary = teamMilestonesData.playerFormMap?.get(profile.id) || null;

    setSelectedCareerPlayer({
      id: profile.id,
      name: profile.name,
      photoURL: profile.photoURL,
      jerseyNumber: profile.jerseyNumber,
      playerType: profile.playerType,
      positionInfo: profile as any,
      chemistry,
      formSummary,
      role: profile.role,
      mvpAwardsCount: countPlayerCareerMvpAwards(profile.id, allMatches || []),
      starsStats: countPlayerCareerStars(profile.id, allMatches || []),
      skaterSeasons,
      goalieSeasons,
      milestones,
    });
    setIsCareerModalOpen(true);
  };

  const handleSaveResult = async (resultData: RecordResultData) => {
    if (!selectedMatch || !firestore) return;
    setIsSaving(true);
    try {
      await matchesService.recordResult(firestore, selectedMatch.id, resultData);
      toast({ title: 'Výsledek uložen.' });
      setIsResultDialogOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit výsledek zápasu.' });
    } finally {
      setIsSaving(false);
    }
  };

  const [isRestoringHistoricalSnapshot, setIsRestoringHistoricalSnapshot] = useState(false);

  const hasHistoricalData = useMemo(() => {
    return (allSkaterStats || []).some((s) => (s.historicalGoals || 0) >= 40);
  }, [allSkaterStats]);

  const handleRestoreHistoricalSnapshot = async () => {
    if (!firestore) return;
    setIsRestoringHistoricalSnapshot(true);
    try {
      const result = await historicalStatsBackupService.applySnapshot(firestore, allUsers);
      if (!result.success && result.errors?.length) {
        throw new Error(result.errors.join(', '));
      }
      toast({
        title: 'Historický snapshot byl úspěšně aplikován',
        description: `Aktualizováno ${result.skatersUpdated} hráčů a ${result.goaliesUpdated} brankářů.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při obnově snapshotu',
        description: err.message,
      });
    } finally {
      setIsRestoringHistoricalSnapshot(false);
    }
  };

  const handleSavePlayoffSeries = async (series: PlayoffSeries[]) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'settings', 'league'), { playoffSeries: series }, { merge: true });
      toast({ title: 'Play-off série uloženy.' });
      setIsPlayoffDialogOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit série.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveSeason = async ({
    seasonName,
    year,
    teamCount,
  }: {
    seasonName: string;
    year: string;
    teamCount: number;
  }) => {
    if (!firestore || !leagueSettings) return;
    setIsSaving(true);

    try {
      await statsService.archiveSeason({
        firestore,
        seasonName,
        year,
        teamCount,
        leagueSettings,
        allSkaterStats,
        allGoalieStats,
        allMatches,
        usersMap,
      });

      toast({ title: 'Sezóna byla úspěšně archivována', description: `Nová sezóna ${seasonName} byla zahájena.` });
      setIsArchiveSeasonDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chyba archivace', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMatch = async (data: MatchFormData) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await matchesService.createMatch(firestore, data, leagueSettings?.currentSeasonId || 'current');
      setIsAddDialogOpen(false);
      toast({ title: 'Zápas přidán a tým upozorněn.' });
    } catch {
      // Permission error emitován v service
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMatch = async (data: MatchFormData) => {
    if (!firestore || !selectedMatch) return;
    setIsSaving(true);
    try {
      await matchesService.updateMatch(firestore, selectedMatch.id, data);
      setIsEditDialogOpen(false);
      toast({ title: 'Změny uloženy' });
    } catch {
      // Permission error emitován v service
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!selectedMatch || !firestore) return;
    setIsSaving(true);
    try {
      await matchesService.deleteMatch(firestore, selectedMatch.id);
      toast({ title: 'Zápas smazán' });
    } catch {
      // Permission error emitován v service
    } finally {
      setIsSaving(false);
      setIsDeleteDialogOpen(false);
      setSelectedMatch(null);
    }
  };

  const handleQuickAttendance = async (matchId: string, status: 'going' | 'not-going') => {
    if (!user || !firestore) return;
    const isCurrentUserGoalie = isGoaliePlayer(userProfile);
    const currentNote = userAttendancesWithOptimistic.get(matchId)?.note || '';
    setOptimisticAttendances((cur) =>
      new Map(cur).set(matchId, { status, note: currentNote, isGoalie: isCurrentUserGoalie } as any)
    );
    try {
      await attendanceService.submitAttendance(firestore, {
        matchId,
        userId: user.uid,
        status,
        note: currentNote,
        isGoalie: isCurrentUserGoalie,
      });
      if (isCurrentUserGoalie && userProfile?.playerType !== 'goalie') {
        try {
          await setDoc(doc(firestore, 'users', user.uid), { playerType: 'goalie' }, { merge: true });
        } catch {
          // ignore
        }
      }
      toast({
        title:
          status === 'going'
            ? isCurrentUserGoalie
              ? 'Účast potvrzena: Jdu (Brankář)'
              : 'Účast potvrzena: Jdu'
            : 'Účast zrušena: Nejdu',
        description: status === 'going' ? 'Vidíme se na ledě!' : 'Zaznamenáno.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se zapsat docházku.' });
    }
  };

  const [isProcessingOldMatches, setIsProcessingOldMatches] = useState(false);

  const handleArchiveOldMatches = async () => {
    if (!firestore || oldUnrecordedMatches.length === 0) return;
    setIsProcessingOldMatches(true);
    try {
      const count = await matchesService.archiveOldUnrecordedMatches(firestore, oldUnrecordedMatches);
      toast({
        title: 'Staré zápasy zapsány a archivovány',
        description: `Úspěšně uzavřeno a přesunuto do archivu ${count} zápasů z předchozího období.`,
      });
    } catch {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se zapsat staré zápasy.' });
    } finally {
      setIsProcessingOldMatches(false);
    }
  };

  const handleDeleteOldMatches = async () => {
    if (!firestore || oldUnrecordedMatches.length === 0) return;
    if (
      !window.confirm(
        `Opravdu chcete trvale smazat ${oldUnrecordedMatches.length} starých testovacích zápasů z předchozího období?`
      )
    )
      return;
    setIsProcessingOldMatches(true);
    try {
      const count = await matchesService.deleteOldTestMatches(
        firestore,
        oldUnrecordedMatches.map((m) => m.id)
      );
      toast({
        title: 'Staré testovací zápasy smazány',
        description: `Úspěšně odstraněno ${count} zápasů z databáze.`,
      });
    } catch {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se smazat staré zápasy.' });
    } finally {
      setIsProcessingOldMatches(false);
    }
  };

  const [isSyncingLeague, setIsSyncingLeague] = useState(false);

  const handleSyncLeagueFromWeb = async () => {
    if (!firestore || userProfile?.role !== 'admin') return;
    setIsSyncingLeague(true);
    try {
      toast({
        title: 'Synchronizuji s webem ligy...',
        description: 'Stahuji aktuální výsledky, statistiky a oficiální zápisy.',
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
            toast({
              title: 'Statistiky ligy úspěšně synchronizovány!',
              description: `Aktualizováno ${clientSync.standingsCount} týmů, ${clientSync.matchesUpdated} zápasů a ${clientSync.skatersUpdated} hráčů.`,
            });
            return;
          }
        }
        throw new Error(syncResult.errors?.join(', ') || syncResult.error || 'Některá data se nepodařilo zapsat.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba synchronizace',
        description: err.message || 'Nepodařilo se synchronizovat data z webu ligy.',
      });
    } finally {
      setIsSyncingLeague(false);
    }
  };

  const activeMvpMatch = useMemo(() => {
    if (!allMatches || allMatches.length === 0) return null;
    const currentMatches = allMatches.filter((m) => toJsDate(m.dateTime).getTime() >= seasonStartMs);

    const openMatch = [...currentMatches].reverse().find((m) => getMvpVotingStatus(m).status === 'open');
    if (openMatch) return openMatch;

    const playedWithVotes = [...currentMatches]
      .filter(
        (m) =>
          (m.isPlayed || toJsDate(m.dateTime).getTime() + 90 * 60 * 1000 <= Date.now()) &&
          ((m.mvpVotes && Object.keys(m.mvpVotes).length > 0) || (m.starsVotes && Object.keys(m.starsVotes).length > 0))
      )
      .sort((a, b) => toJsDate(b.dateTime).getTime() - toJsDate(a.dateTime).getTime())[0];
    return playedWithVotes || null;
  }, [allMatches, seasonStartMs]);

  const postMatchData = useMemo(() => {
    if (!allMatches || allMatches.length === 0 || selectedSeasonId !== 'current') return null;

    if (matchesAwaitingResult.length > 0) {
      return {
        match: matchesAwaitingResult[0],
        additionalAwaiting: matchesAwaitingResult.slice(1),
      };
    }

    if (activeMvpMatch) {
      const votingStatus = getMvpVotingStatus(activeMvpMatch);
      const isVotingOpen = votingStatus.status === 'open';
      const votingClosesMs = votingStatus.closesAt.getTime();
      const isWithin24hAfterVotingCloses = Date.now() <= votingClosesMs + 24 * 60 * 60 * 1000;

      if (isVotingOpen || isWithin24hAfterVotingCloses) {
        return {
          match: activeMvpMatch,
          additionalAwaiting: [],
        };
      }
    }

    return null;
  }, [allMatches, selectedSeasonId, matchesAwaitingResult, activeMvpMatch]);

  // Automatické vyskočení modalu pro volbu 3 hvězd
  useEffect(() => {
    const targetMatch = postMatchData?.match || activeMvpMatch;
    if (!targetMatch || !user?.uid) return;

    const votingStatus = getMvpVotingStatus(targetMatch);
    if (votingStatus.status !== 'open') return;

    const hasVoted = Boolean(targetMatch.starsVotes?.[user.uid] || targetMatch.mvpVotes?.[user.uid]);
    if (hasVoted) return;

    const matchAttendees = attendancesByMatch.get(targetMatch.id) || [];
    const isParticipant =
      (targetMatch.lineup && Object.values(targetMatch.lineup).some((p) => p?.id === user.uid)) ||
      matchAttendees.some((a) => a.userId === user.uid && a.status === 'going');

    if (!isParticipant) return;

    const storageKey = `dismissed_stars_modal_${targetMatch.id}_${user.uid}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return;
    }

    setSelectedVotingMatch(targetMatch);
    setIsStarsModalOpen(true);
  }, [postMatchData, activeMvpMatch, user?.uid, attendancesByMatch]);

  const handleCloseCelebration = () => {
    if (celebrationAward && user?.uid) {
      const storageKey = `aces_award_modal_seen_${user.uid}_${celebrationAward.matchId}_${celebrationAward.awardRank}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, new Date().toISOString());
      }
    }
    setIsCelebrationModalOpen(false);
  };

  // Automatické vyskočení gratulačního okna
  useEffect(() => {
    if (!user?.uid || !allMatches || allMatches.length === 0) return;
    const nowMs = Date.now();

    const sortedMatches = [...allMatches]
      .filter((m) => {
        const mTime = toJsDate(m.dateTime || m.date).getTime();
        return mTime >= seasonStartMs;
      })
      .sort((a, b) => toJsDate(b.dateTime || b.date).getTime() - toJsDate(a.dateTime || a.date).getTime());

    for (const m of sortedMatches) {
      const votingStatus = getMvpVotingStatus(m, nowMs);
      if (votingStatus.status !== 'closed') continue;

      const starsResults = calculateMatchStarsResults(m, usersMap);
      if (starsResults.totalPoints === 0) continue;

      const myStanding = starsResults.standings.find((s) => s.candidateId === user.uid);
      if (!myStanding || myStanding.rank > 3 || myStanding.points === 0) continue;

      const awardRank = (myStanding.rank <= 3 ? myStanding.rank : 3) as 1 | 2 | 3;
      const storageKey = `aces_award_modal_seen_${user.uid}_${m.id}_${awardRank}`;

      if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
        continue;
      }

      const details = getMatchDetails(m as any);
      const isTeam1Aces = m.team1.toLowerCase().includes('aces');
      const scoreAces = isTeam1Aces ? m.team1Score : m.team2Score;
      const scoreOpponent = isTeam1Aces ? m.team2Score : m.team1Score;
      const isWin = scoreAces !== undefined && scoreOpponent !== undefined ? scoreAces > scoreOpponent : undefined;

      setCelebrationAward({
        matchId: m.id,
        matchOpponent: details.opponent,
        matchDate: m.dateTime || m.date,
        scoreAces,
        scoreOpponent,
        isWin,
        awardRank,
        isTied: Boolean(myStanding.isTied),
        awardPoints: myStanding.points,
        star1Count: myStanding.star1Count,
        star2Count: myStanding.star2Count,
        star3Count: myStanding.star3Count,
        playerName: userProfile?.name || myStanding.name,
        playerJersey: userProfile?.jerseyNumber ?? myStanding.jerseyNumber ?? null,
        playerPhotoURL: userProfile?.photoURL || myStanding.photoURL || null,
        playerPosition: myStanding.playerType === 'goalie' ? 'Brankář' : 'Hráč v poli',
        matchGoals: myStanding.matchGoals,
        matchAssists: myStanding.matchAssists,
        matchSaves: myStanding.matchSaves,
        isShutout: myStanding.isShutout,
        tieBreakerReason: myStanding.tieBreakerReason,
        isSimulation: false,
      });
      setIsCelebrationModalOpen(true);
      break;
    }
  }, [allMatches, user?.uid, usersMap, userProfile, seasonStartMs]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );
  }

  // --- Sub-sekce s memoizovanými komponentami ---
  const oldMatchesAlert = (
    <OldMatchesAlert
      isAdmin={userProfile?.role === 'admin'}
      oldMatches={oldUnrecordedMatches}
      isCurrentSeason={selectedSeasonId === 'current'}
      isProcessing={isProcessingOldMatches}
      onArchive={handleArchiveOldMatches}
      onDelete={handleDeleteOldMatches}
    />
  );

  const nextMatchesSection = (
    <UpcomingMatchesSection
      selectedSeasonId={selectedSeasonId}
      activeSeasonName={activeSeasonData.name}
      onSelectCurrentSeason={() => setSelectedSeasonId('current')}
      isAdmin={userProfile?.role === 'admin'}
      upcomingMatches={upcomingMatches}
      allMatches={allMatches || []}
      archivedSeasons={archivedSeasons || []}
      userAttendances={userAttendancesWithOptimistic}
      attendancesByMatch={attendancesByMatch}
      usersMap={usersMap}
      currentUserId={user?.uid}
      playerFormMap={teamMilestonesData.playerFormMap}
      leagueSkaters={leagueSettings?.leagueSkaters}
      highlightedMatchId={highlightedMatchId}
      highlightReason={highlightReason}
      openAccordionValue={openAccordionValue}
      onOpenAccordionChange={setOpenAccordionValue}
      onAddMatchClick={() => setIsAddDialogOpen(true)}
      onRsvp={handleQuickAttendance}
      onOpenNoteDialog={(matchId, status, currentNote) => {
        setAttendanceData({ matchId, status });
        setAttendanceNote(currentNote || '');
        setIsAttendanceDialogOpen(true);
      }}
      onShareMatch={handleShareMatch}
      onOpenLineupView={(match) => {
        setViewLineupData(match.lineup!);
        setViewScorersData(match.scorers);
        setViewMatchOpponent(getMatchDetails(match as any).opponent);
        setIsLineupViewOpen(true);
      }}
      onOpenLineupBuilder={(match) => {
        setLineupMatch(match as any);
        setIsLineupBuilderOpen(true);
      }}
      onRecordResult={(match) => {
        setSelectedMatch(match as any);
        setIsResultDialogOpen(true);
      }}
      onEditMatch={(match) => {
        setSelectedMatch(match as any);
        setIsEditDialogOpen(true);
      }}
      onDeleteMatch={(match) => {
        setSelectedMatch(match as any);
        setIsDeleteDialogOpen(true);
      }}
    />
  );

  const postMatchSection =
    selectedSeasonId === 'current' && postMatchData ? (
      <div className="space-y-3 w-full min-w-0 overflow-hidden">
        <PostMatchSection
          match={postMatchData.match}
          currentUserId={user.uid}
          users={allUsers || []}
          usersMap={usersMap}
          attendees={attendancesByMatch.get(postMatchData.match.id) || []}
          attendancesByMatch={attendancesByMatch}
          isAdmin={userProfile?.role === 'admin'}
          onRecordResult={(match) => {
            setSelectedMatch(match as any);
            setIsResultDialogOpen(true);
          }}
          onOpenStarsModal={(m) => {
            setSelectedVotingMatch(m || postMatchData.match);
            setIsStarsModalOpen(true);
          }}
          additionalAwaitingMatches={postMatchData.additionalAwaiting}
        />
      </div>
    ) : null;

  const leagueSection = (
    <CompetitionSection
      selectedSeasonId={selectedSeasonId}
      onSelectSeasonId={setSelectedSeasonId}
      currentSeasonName={leagueSettings?.currentSeasonName}
      archivedSeasons={archivedSeasons}
      isAdmin={userProfile?.role === 'admin'}
      isSyncingLeague={isSyncingLeague}
      onSyncLeague={handleSyncLeagueFromWeb}
      onOpenPlayoffDialog={() => setIsPlayoffDialogOpen(true)}
      onOpenArchiveSeasonDialog={() => setIsArchiveSeasonDialogOpen(true)}
      activeSeasonData={activeSeasonData}
    />
  );

  const recentMatchesSection = (
    <RecentMatchesSection
      matches={recentPlayedMatches as any}
      usersMap={usersMap}
      className="h-fit border-border/70 bg-card/95 w-full min-w-0 overflow-hidden"
      onViewLineup={(m) => {
        let lineupToDisplay = m.lineup || null;
        const hasExistingLineup = Boolean(lineupToDisplay && Object.values(lineupToDisplay).some((p: any) => p !== null));

        if (!hasExistingLineup && m.gameRoster && m.gameRoster.length > 0) {
          const skaterPlayers = m.gameRoster.map((skaterName, idx) => {
            const u = allUsers?.find((usr) => areNamesMatching(usr.name, skaterName));
            return u
              ? { id: u.id, name: u.name, email: u.email || '', jerseyNumber: u.jerseyNumber ?? null, photoURL: u.photoURL ?? null }
              : { id: `skater-${idx}`, name: skaterName, email: '', jerseyNumber: null, photoURL: null };
          });
          const goalieUser = m.goalieName ? allUsers?.find((usr) => areNamesMatching(usr.name, m.goalieName!)) : null;
          const goaliePlayer = goalieUser
            ? { id: goalieUser.id, name: goalieUser.name, email: goalieUser.email || '', jerseyNumber: goalieUser.jerseyNumber ?? null, photoURL: goalieUser.photoURL ?? null }
            : m.goalieName
            ? { id: 'goalie', name: m.goalieName, email: '', jerseyNumber: null, photoURL: null }
            : null;

          lineupToDisplay = {
            B1: goaliePlayer,
            LK1: skaterPlayers[0] || null,
            C1: skaterPlayers[1] || null,
            PK1: skaterPlayers[2] || null,
            LO1: skaterPlayers[3] || null,
            PO1: skaterPlayers[4] || null,
            LK2: skaterPlayers[5] || null,
            C2: skaterPlayers[6] || null,
            PK2: skaterPlayers[7] || null,
            LO2: skaterPlayers[8] || null,
            PO2: skaterPlayers[9] || null,
            LK3: skaterPlayers[10] || null,
            C3: skaterPlayers[11] || null,
            PK3: skaterPlayers[12] || null,
          } as any;
        } else if (!hasExistingLineup) {
          const matchAttendees = attendancesByMatch.get(m.id) || [];
          const goingUsers = matchAttendees
            .filter((a) => a.status === 'going')
            .map((a) => usersMap.get(a.userId))
            .filter((u): u is NonNullable<typeof u> => Boolean(u));

          if (goingUsers.length > 0) {
            const goalie = goingUsers.find((u) => isGoaliePlayer(u) || u.playerType === 'goalie');
            const skaters = goingUsers.filter((u) => u !== goalie);
            lineupToDisplay = {
              B1: goalie ? { id: goalie.id, name: goalie.name, email: goalie.email || '', jerseyNumber: goalie.jerseyNumber ?? null, photoURL: goalie.photoURL ?? null } : null,
              LK1: skaters[0] ? { id: skaters[0].id, name: skaters[0].name, email: skaters[0].email || '', jerseyNumber: skaters[0].jerseyNumber ?? null, photoURL: skaters[0].photoURL ?? null } : null,
              C1: skaters[1] ? { id: skaters[1].id, name: skaters[1].name, email: skaters[1].email || '', jerseyNumber: skaters[1].jerseyNumber ?? null, photoURL: skaters[1].photoURL ?? null } : null,
              PK1: skaters[2] ? { id: skaters[2].id, name: skaters[2].name, email: skaters[2].email || '', jerseyNumber: skaters[2].jerseyNumber ?? null, photoURL: skaters[2].photoURL ?? null } : null,
              LO1: skaters[3] ? { id: skaters[3].id, name: skaters[3].name, email: skaters[3].email || '', jerseyNumber: skaters[3].jerseyNumber ?? null, photoURL: skaters[3].photoURL ?? null } : null,
              PO1: skaters[4] ? { id: skaters[4].id, name: skaters[4].name, email: skaters[4].email || '', jerseyNumber: skaters[4].jerseyNumber ?? null, photoURL: skaters[4].photoURL ?? null } : null,
              LK2: skaters[5] ? { id: skaters[5].id, name: skaters[5].name, email: skaters[5].email || '', jerseyNumber: skaters[5].jerseyNumber ?? null, photoURL: skaters[5].photoURL ?? null } : null,
              C2: skaters[6] ? { id: skaters[6].id, name: skaters[6].name, email: skaters[6].email || '', jerseyNumber: skaters[6].jerseyNumber ?? null, photoURL: skaters[6].photoURL ?? null } : null,
              PK2: skaters[7] ? { id: skaters[7].id, name: skaters[7].name, email: skaters[7].email || '', jerseyNumber: skaters[7].jerseyNumber ?? null, photoURL: skaters[7].photoURL ?? null } : null,
              LO2: skaters[8] ? { id: skaters[8].id, name: skaters[8].name, email: skaters[8].email || '', jerseyNumber: skaters[8].jerseyNumber ?? null, photoURL: skaters[8].photoURL ?? null } : null,
              PO2: skaters[9] ? { id: skaters[9].id, name: skaters[9].name, email: skaters[9].email || '', jerseyNumber: skaters[9].jerseyNumber ?? null, photoURL: skaters[9].photoURL ?? null } : null,
              LK3: skaters[10] ? { id: skaters[10].id, name: skaters[10].name, email: skaters[10].email || '', jerseyNumber: skaters[10].jerseyNumber ?? null, photoURL: skaters[10].photoURL ?? null } : null,
              C3: skaters[11] ? { id: skaters[11].id, name: skaters[11].name, email: skaters[11].email || '', jerseyNumber: skaters[11].jerseyNumber ?? null, photoURL: skaters[11].photoURL ?? null } : null,
              PK3: skaters[12] ? { id: skaters[12].id, name: skaters[12].name, email: skaters[12].email || '', jerseyNumber: skaters[12].jerseyNumber ?? null, photoURL: skaters[12].photoURL ?? null } : null,
            } as any;
          }
        }

        setViewLineupData(lineupToDisplay);
        setViewScorersData(m.scorers);
        setViewMatchOpponent(getMatchDetails(m as any).opponent);
        setIsLineupViewOpen(true);
      }}
    />
  );

  const scoringSection = (
    <TeamScoringSection
      currentUserId={user?.uid}
      isAdmin={userProfile?.role === 'admin'}
      selectedSeasonId={selectedSeasonId}
      activeSeasonName={activeSeasonData.name}
      teamScoring={teamScoring}
      goalieLeaderboard={goalieLeaderboard}
      sortedTeamScoring={sortedTeamScoring}
      sortedGoalieLeaderboard={sortedGoalieLeaderboard}
      skaterStarsLeaderboard={skaterStarsLeaderboard}
      goalieStarsLeaderboard={goalieStarsLeaderboard}
      allUsers={allUsers || []}
      allMatches={allMatches || []}
      playerFormMap={teamMilestonesData.playerFormMap}
      scoringView={scoringView}
      onScoringViewChange={setScoringView}
      hasHistoricalData={hasHistoricalData}
      isRestoringHistoricalSnapshot={isRestoringHistoricalSnapshot}
      onRestoreHistoricalSnapshot={handleRestoreHistoricalSnapshot}
      onOpenCareerModal={handleOpenCareerModal}
      onSaveManualStats={async (view, editableSkaters, editableGoalies) => {
        if (!firestore) return;
        setIsSaving(true);
        try {
          await statsService.saveManualStats(
            firestore,
            view as any,
            editableSkaters,
            editableGoalies
          );
          toast({ title: 'Statistiky úspěšně uloženy' });
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Chyba',
            description: err.message || 'Nepodařilo se uložit statistiky.',
          });
        } finally {
          setIsSaving(false);
        }
      }}
      isSavingManualStats={isSaving}
    />
  );

  return (
    <div className="py-4 sm:py-6 space-y-4 lg:space-y-5 w-full min-w-0 max-w-7xl mx-auto">
      {selectedSeasonId !== 'current' && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] uppercase font-bold">
                  Archivní ročník
                </Badge>
                <h3 className="font-bold text-base">{activeSeasonData.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prohlížíte historické statistiky, tabulku a odehrané zápasy tohoto ročníku. Údaje jsou uzamčeny.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSeasonId('current')}
            className="shrink-0 text-xs font-bold border-amber-500/40 hover:bg-amber-500/10"
          >
            Zpět na aktuální sezónu
          </Button>
        </div>
      )}

      {/* FINALS DECIDED CELEBRATION / AUTO-ARCHIVE 1-CLICK BANNER */}
      {selectedSeasonId === 'current' && finalsStatus.isFinished && (
        <FinalsCelebrationBanner
          status={finalsStatus}
          seasonName={leagueSettings?.currentSeasonName || 'Sezóna 2025/2026'}
          seasonYear={leagueSettings?.currentSeasonName?.match(/\d{4}\/\d{4}/)?.[0] || '2025/2026'}
          isAdmin={userProfile?.role === 'admin'}
          onArchiveClick={() => setIsArchiveSeasonDialogOpen(true)}
        />
      )}

      <BirthdaysCard birthdays={upcomingBirthdays} />

      {/* PROFESIONÁLNÍ HRÁČSKÁ LIŠTA (PLAYER STRIP) */}
      <PlayerIdentityStrip
        userProfile={userProfile}
        userId={user.uid}
        allMatches={allMatches || []}
        currentUserBadges={currentUserBadges}
        myStatsView={myStatsView}
        onMyStatsViewChange={setMyStatsView}
        goalieStats={goalieLeaderboard.find((g) => g.id === user.uid)?.[myStatsView] || null}
        skaterStats={teamScoring.find((p) => p.id === user.uid)?.[myStatsView] || null}
        currentUserStars={currentUserStars}
        onOpenCareerModal={handleOpenCareerModal}
      />

      {/* HLAVNÍ BLOKY: RESPONZIVNÍ 2 NEZÁVISLÉ SLOUPCE NA DESKTOPU VS JEDEN SLOUPEC NA MOBILU */}
      {isDesktop ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-start w-full min-w-0">
          {/* LEVÝ SLOUPEC: Příští zápasy -> Soutěž -> Statistiky týmu */}
          <div className="space-y-4 lg:space-y-5 w-full min-w-0">
            {nextMatchesSection}
            {leagueSection}
            {scoringSection}
          </div>

          {/* PRAVÝ SLOUPEC: Upozornění -> Poslední zápas & MVP -> Odehrané zápasy */}
          <div className="space-y-4 lg:space-y-5 w-full min-w-0">
            {oldMatchesAlert}
            {postMatchSection}
            {recentMatchesSection}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4 w-full min-w-0">
          {oldMatchesAlert}
          {nextMatchesSection}
          {postMatchSection}
          {leagueSection}
          {recentMatchesSection}
          {scoringSection}
        </div>
      )}

      {/* --- Modální dialogy (lazy loaded) --- */}
      <MatchFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleCreateMatch}
        isSaving={isSaving}
      />

      <PlayoffSeriesDialog
        isOpen={isPlayoffDialogOpen}
        onOpenChange={setIsPlayoffDialogOpen}
        series={leagueSettings?.playoffSeries}
        onSave={handleSavePlayoffSeries}
        isSaving={isSaving}
      />

      <ArchiveSeasonDialog
        isOpen={isArchiveSeasonDialogOpen}
        onOpenChange={setIsArchiveSeasonDialogOpen}
        onArchive={handleArchiveSeason}
        isSaving={isSaving}
      />

      <RecordResultDialog
        open={isResultDialogOpen}
        onOpenChange={setIsResultDialogOpen}
        match={selectedMatch}
        allUsers={allUsers || []}
        onSave={handleSaveResult}
        isSaving={isSaving}
      />

      {/* Dialog poznámky k docházce */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potvrdit účast</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 p-1">
            <Label>Poznámka (volitelné)</Label>
            <Textarea
              value={attendanceNote}
              onChange={(e) => setAttendanceNote(e.target.value)}
              placeholder="Např. přijdu později..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>
              Zrušit
            </Button>
            <Button
              onClick={async () => {
                if (!attendanceData || !user || !firestore) return;
                setIsSaving(true);
                try {
                  const isCurrentUserGoalie = isGoaliePlayer(userProfile);
                  setOptimisticAttendances((cur) =>
                    new Map(cur).set(attendanceData.matchId, {
                      status: attendanceData.status,
                      note: attendanceNote,
                      isGoalie: isCurrentUserGoalie,
                    } as any)
                  );
                  await attendanceService.submitAttendance(firestore, {
                    userId: user.uid,
                    matchId: attendanceData.matchId,
                    status: attendanceData.status,
                    note: attendanceNote,
                    isGoalie: isCurrentUserGoalie,
                  });
                  if (isCurrentUserGoalie && userProfile?.playerType !== 'goalie') {
                    try {
                      await setDoc(doc(firestore, 'users', user.uid), { playerType: 'goalie' }, { merge: true });
                    } catch {
                      // ignore
                    }
                  }
                  setIsAttendanceDialogOpen(false);
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              Potvrdit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor sestavy */}
      <Dialog open={isLineupBuilderOpen} onOpenChange={setIsLineupBuilderOpen}>
        <DialogContent className="max-w-5xl xl:max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 pb-0 flex-shrink-0">
            <DialogTitle>Editor sestavy</DialogTitle>
          </DialogHeader>
          {lineupMatch && (
            <LineupBuilder
              players={
                allUsers
                  ?.map((u) => ({
                    ...u,
                    playerType: isGoaliePlayer(u) ? ('goalie' as const) : u.playerType,
                  })) || []
              }
              confirmedPlayerIds={
                (attendancesByMatch.get(lineupMatch.id) || [])
                  .filter((a) => a.status === 'going')
                  .map((a) => a.userId)
              }
              initialData={lineupMatch.lineup}
              teamChemistry={teamMilestonesData.teamChemistry}
              isSaving={isSaving}
              onSave={async (l) => {
                if (!lineupMatch || !firestore) return;
                setIsSaving(true);
                try {
                  const sanitizedLineup = sanitizeLineup(l);
                  await updateDoc(doc(firestore, 'matches', lineupMatch.id), { lineup: sanitizedLineup });

                  if (userProfile?.role === 'admin' && allUsers) {
                    try {
                      await rosterService.syncPositionsFromLineup(firestore, sanitizedLineup, allUsers as any);
                    } catch (syncErr) {
                      console.warn('Nepodařilo se synchronizovat posty:', syncErr);
                    }
                  }

                  setIsLineupBuilderOpen(false);
                  toast({ title: 'Sestava úspěšně uložena!' });

                  // Decoupled notification dispatch:
                  // If sending notifications fails, the match lineup is ALREADY safely saved!
                  try {
                    const opponent = getMatchDetails(lineupMatch).opponent;
                    const playerIds = Array.from(
                      new Set(
                        Object.values(sanitizedLineup)
                          .filter((p): p is Player => p !== null && !String(p.id).startsWith('guest-'))
                          .map((p) => p.id)
                      )
                    );

                    if (playerIds.length > 0) {
                      const batch = writeBatch(firestore);
                      playerIds.forEach((pId) => {
                        const notifRef = doc(collection(firestore, 'users', pId, 'notifications'));
                        batch.set(notifRef, {
                          title: 'Byl jsi nominován do sestavy!',
                          message: `Máš místo v sestavě na zápas proti ${opponent}. Koukni na detaily!`,
                          type: 'lineup_added',
                          createdAt: Timestamp.now(),
                          read: false,
                          matchId: lineupMatch.id,
                        });
                      });
                      await batch.commit();
                    }
                  } catch (notifErr) {
                    console.warn('Nepodařilo se odeslat push/in-app notifikace o nominaci:', notifErr);
                  }
                } catch (err: any) {
                  console.error('Chyba při ukládání sestavy:', err);
                  toast({
                    variant: 'destructive',
                    title: 'Chyba při ukládání sestavy',
                    description: err?.message || 'Nepodařilo se uložit sestavu do databáze.',
                  });
                } finally {
                  setIsSaving(false);
                }
              }}
              onCancel={() => setIsLineupBuilderOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Náhled sestavy */}
      <Dialog open={isLineupViewOpen} onOpenChange={setIsLineupViewOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden text-left bg-card border border-border shadow-2xl">
          <DialogHeader className="px-4 py-2.5 sm:px-6 sm:py-3 flex-shrink-0 border-b">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-lg sm:text-xl font-headline">Sestava na zápas</DialogTitle>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold uppercase text-xs">
                vs {viewMatchOpponent || 'Soupeř'}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              HC Aces Brno • Zápasová nominace a herní formace
            </DialogDescription>
          </DialogHeader>
          {viewLineupData && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <LineupDisplay lineup={viewLineupData} scorers={viewScorersData} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog smazání zápasu */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat zápas?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={handleDeleteMatch} disabled={isSaving}>
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog úpravy zápasu */}
      <MatchFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        match={selectedMatch}
        onSave={handleUpdateMatch}
        isSaving={isSaving}
      />

      {/* Kariérní modal hráče */}
      <PlayerCareerModal
        player={selectedCareerPlayer}
        isOpen={isCareerModalOpen}
        onClose={() => setIsCareerModalOpen(false)}
      />

      {/* Modal 3 hvězd zápasu */}
      {(selectedVotingMatch || postMatchData?.match || activeMvpMatch) && (
        <MatchStarsModal
          match={selectedVotingMatch || postMatchData?.match || activeMvpMatch!}
          currentUserId={user.uid}
          users={allUsers || []}
          attendees={attendancesByMatch.get((selectedVotingMatch || postMatchData?.match || activeMvpMatch)?.id || '') || []}
          isOpen={isStarsModalOpen}
          onOpenChange={(open) => {
            setIsStarsModalOpen(open);
            if (!open) setSelectedVotingMatch(null);
          }}
        />
      )}

      {/* Gratulace k ocenění */}
      <MatchAwardCelebrationModal
        isOpen={isCelebrationModalOpen}
        onClose={handleCloseCelebration}
        awardData={celebrationAward}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8 text-center flex justify-center">
          <Loader2 className="animate-spin text-primary h-8 w-8" />
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
