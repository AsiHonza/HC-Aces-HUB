
'use client'

import React, { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MapPin, Users, Trophy, Award, BarChart, Pencil, Check, X, Flame, Shield, Plus, Loader2, Trash2, ClipboardEdit, History, Share2, MoreHorizontal, FileText, View, Disc, Cake, Minus, ChevronDown, ListOrdered, CalendarDays, ChevronUp, MessageSquarePlus, Goal, Calendar, Star, Clock, Archive, ShieldAlert, RefreshCw, DatabaseBackup, Sparkles } from "lucide-react"
import { cn, formatName, isGoaliePlayer, areNamesMatching } from '@/lib/utils'
import { toJsDate } from '@/lib/dates'
import { BirthdaysCard, rosterService } from '@/features/roster'
import { resolvePlayerPosition, POSITION_METADATA } from '@/features/roster/utils/positions'
import { 
  LeagueStandingsTable, 
  PlayerScoringTable, 
  GoalieStatsTable, 
 
  PlayoffSeriesDialog, 
  ArchiveSeasonDialog, 
  getSeasonStartMs,
  PlayerFormBadgeItem,
  calculateTeamMilestonesOverview,
  calculatePlayerMilestones,
  statsService,
  historicalStatsBackupService
} from '@/features/stats'
import { syncLeagueToFirestore } from '@/lib/sync/league-sync'
import type { PlayoffSeries, LeagueStanding, Match } from '@/types'
import { QuickRsvpButtons, attendanceService } from '@/features/attendance'
import {
  GoalTimeline,
  getMatchDetails,
  RecordResultDialog,
  UpcomingMatchCard,
  RecentMatchesSection,
  MatchFormDialog,
  MvpVotingCard,
  MatchStarsModal,
  AwaitingResultCard,
  PostMatchSection,
  getMvpVotingStatus,
  calculateMatchStarsResults,
  MatchAwardCelebrationModal,
  type CelebrationAwardData,
  countPlayerCareerMvpAwards,
  countPlayerCareerStars,
  matchesService,
  type RecordResultData,
  type MatchFormData,
} from '@/features/matches'
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, collection, collectionGroup, updateDoc, query, Timestamp, addDoc, orderBy, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore'
import { format, startOfDay, addDays, parseISO, isValid, differenceInDays, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineupBuilder, LineupDisplay, type Lineup } from '@/components/lineup-builder'
import { Badge } from '@/components/ui/badge'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlayerCareerModal, type PlayerCareerData } from '@/components/player-career-modal'
import { useIsDesktop } from '@/hooks/use-mobile'

interface UserProfile {
  id: string;
  name: string;
  email: string;
  jerseyNumber?: number;
  phoneNumber?: string;
  role: 'admin' | 'classic';
  playerType: 'player' | 'goalie' | 'member';
  fieldPosition?: 'defense' | 'wing' | 'center' | null;
  positionLocked?: boolean;
  photoURL?: string | null;
  dob?: string;
}

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


interface Attendance {
    id: string; 
    userId: string;
    matchId: string;
    status: 'going' | 'not-going' | 'unknown';
    note?: string;
}


interface SeasonArchive {
  id: string;
  name: string;
  year: string;
  teamCount: number;
  archivedAt: Timestamp;
  standings: LeagueStanding[];
  playoffSeries: PlayoffSeries[];
  skaterStats?: {
    userProfileId?: string;
    name: string;
    regularGoals: number;
    regularAssists: number;
    playoffGoals?: number;
    playoffAssists?: number;
    totalPoints: number;
    regularGamesPlayed: number;
    playoffGamesPlayed?: number;
    rank?: number;
  }[];
  goalieStats?: {
    userProfileId?: string;
    name: string;
    gamesPlayed: number;
    wins: number;
    saves: number;
    shotsAgainst: number;
    savePercentage: number;
    shutouts: number;
  }[];
  matches?: {
    id: string;
    round?: number;
    team1: string;
    team2: string;
    team1Score?: number;
    team2Score?: number;
    location?: string;
    date?: string;
    scorers?: { goal: string; assist: string | null }[];
  }[];
}

interface AppSettings {
  currentSeasonId?: string;
  currentSeasonName?: string;
  isPlayoffEnabled: boolean;
  isScoringInPlayoffMode: boolean;
  playoffSeries?: PlayoffSeries[];
  leagueStandings?: LeagueStanding[];
  leagueSkaters?: any[];
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
  playoffStage?: 'čtvrtfinále' | 'semifinále' | 'finále' | string | null;
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
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const isDesktop = useIsDesktop()
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [optimisticAttendances, setOptimisticAttendances] = useState<Map<string, Partial<Attendance>>>(new Map());
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ matchId: string; status: 'going' | 'not-going' } | null>(null);
  const [attendanceNote, setAttendanceNote] = useState('');
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [highlightReason, setHighlightReason] = useState<string | null>(null);
  const [openAccordionValue, setOpenAccordionValue] = useState('');
  const [myStatsView, setMyStatsView] = useState<'regular' | 'playoff' | 'season' | 'history'>('regular');
  const [scoringView, setScoringView] = useState<'regular' | 'playoff' | 'season' | 'history'>('regular');
  const [isLineupBuilderOpen, setIsLineupBuilderOpen] = useState(false);
  const [lineupMatch, setLineupMatch] = useState<Match | null>(null);
  const [isLineupViewOpen, setIsLineupViewOpen] = useState(false);
  const [viewLineupData, setViewLineupData] = useState<Lineup | null>(null);
  const [viewScorersData, setViewScorersData] = useState<{ goal: string; assist: string | null }[] | undefined>(undefined);
  const [viewMatchOpponent, setViewMatchOpponent] = useState<string | null>(null);
  const [isStatEditMode, setIsStatEditMode] = useState(false);
  const [expandedStatId, setExpandedStatId] = useState<string | null>(null);
  
  const [showAllScoring, setShowAllScoring] = useState(false);
  const [showAllGoalies, setShowAllGoalies] = useState(false);
  const [showAllStars, setShowAllStars] = useState(false);
  const [showAllGoalieStars, setShowAllGoalieStars] = useState(false);
  const [statsCategory, setStatsCategory] = useState<'skaters' | 'goalies'>('skaters');
  const [activeStatsTab, setActiveStatsTab] = useState<'stats' | 'stars'>('stats');

  const [editableSkaterStats, setEditableSkaterStats] = useState<any[]>([]);
  const [editableGoalieStats, setEditableGoalieStats] = useState<any[]>([]);


  const [isPlayoffDialogOpen, setIsPlayoffDialogOpen] = useState(false);
  const [isArchiveSeasonDialogOpen, setIsArchiveSeasonDialogOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('current');
  const [selectedCareerPlayer, setSelectedCareerPlayer] = useState<PlayerCareerData | null>(null);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [isStarsModalOpen, setIsStarsModalOpen] = useState(false);
  const [selectedVotingMatch, setSelectedVotingMatch] = useState<Match | null>(null);

  const [celebrationAward, setCelebrationAward] = useState<CelebrationAwardData | null>(null);
  const [isCelebrationModalOpen, setIsCelebrationModalOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

  const skaterStatsRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid, 'skaterStats', 'stats') : null, [firestore, user]);
  const { data: skaterStatsData, isLoading: isSkaterStatsLoading } = useDoc<SkaterStats>(skaterStatsRef);
  
  const goalieStatsRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid, 'goalieStats', 'stats') : null, [firestore, user]);
  const { data: goalieStatsData, isLoading: isGoalieStatsLoading } = useDoc<GoalieStats>(goalieStatsRef);
  
  const matchesQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'matches'), orderBy('dateTime', 'asc')) : null, [firestore, user]);
  const { data: allMatches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);
  
  const usersRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users'): null, [firestore, user]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersRef);

  const allSkaterStatsRef = useMemoFirebase(() => (firestore && user) ? collectionGroup(firestore, 'skaterStats'): null, [firestore, user]);
  const { data: allSkaterStats, isLoading: areSkaterStatsLoading } = useCollection<SkaterStats>(allSkaterStatsRef);

  const allGoalieStatsRef = useMemoFirebase(() => (firestore && user) ? collectionGroup(firestore, 'goalieStats'): null, [firestore, user]);
  const { data: allGoalieStats, isLoading: areGoalieStatsLoading } = useCollection<GoalieStats>(allGoalieStatsRef);

  const attendancesQuery = useMemoFirebase(() => (firestore && user) ? query(collectionGroup(firestore, 'attendees')) : null, [firestore, user]);
  const { data: allAttendances, isLoading: attendancesLoading } = useCollection<Attendance>(attendancesQuery);

  const leagueSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'league') : null, [firestore]);
  const { data: leagueSettings, isLoading: leagueSettingsLoading } = useDoc<AppSettings>(leagueSettingsRef);
  const seasonStartMs = useMemo(() => getSeasonStartMs(leagueSettings), [leagueSettings]);

  const seasonsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'seasons'), orderBy('archivedAt', 'desc')) : null, [firestore]);
  const { data: archivedSeasons, isLoading: seasonsLoading } = useCollection<SeasonArchive>(seasonsQuery);
    
  const upcomingMatches = useMemo(() => {
      if (!allMatches) return [];
      const nowMs = Date.now();
      return allMatches
        .filter(match => {
          const mTime = toJsDate(match.dateTime).getTime();
          if (mTime < seasonStartMs) return false;
          return !match.isPlayed && (mTime + 90 * 60 * 1000 > nowMs);
        })
        .sort((a, b) => toJsDate(a.dateTime).getTime() - toJsDate(b.dateTime).getTime());
  }, [allMatches, seasonStartMs]);

  const matchesAwaitingResult = useMemo(() => {
      if (!allMatches) return [];
      const nowMs = Date.now();

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      // Bezpečnostní pojistka proti kolizi: zjistíme čísla kol zápasů, které již JSOU odehrané (isPlayed: true)
      const playedRoundNumbers = new Set(
        allMatches
          .filter(m => m.isPlayed && m.round !== undefined && m.round !== null)
          .map(m => Number(m.round))
      );

      return allMatches
        .filter(match => {
          const mTime = toJsDate(match.dateTime).getTime();
          // Striktně pouze zápasy z aktuální sezóny (od 16. 9. 2026)
          if (mTime < seasonStartMs) return false;

          // Pokud už dané kolo bylo odehráno a zapsáno (např. ručně či v minulé verzi),
          // nebudeme duplicitní neodehraný záznam zobrazovat jako "čeká na oficiální zápis"
          if (match.round !== undefined && match.round !== null && playedRoundNumbers.has(Number(match.round))) {
            return false;
          }

          const matchEndTime = mTime + 90 * 60 * 1000;
          // Zápas musí být dohraný a skončit v posledních 7 dnech (aktuálně čekající na oficiální zápis)
          const isRecentlyEnded = matchEndTime <= nowMs && (nowMs - matchEndTime <= sevenDaysMs);
          return !match.isPlayed && isRecentlyEnded;
        })
        .sort((a, b) => toJsDate(b.dateTime).getTime() - toJsDate(a.dateTime).getTime());
  }, [allMatches, seasonStartMs]);

  // Staré neuzavřené zápasy před začátkem aktuální sezóny (< 16. 9. 2026)
  const oldUnrecordedMatches = useMemo(() => {
      if (!allMatches) return [];

      return allMatches.filter(m => !m.isPlayed && toJsDate(m.dateTime).getTime() < seasonStartMs);
  }, [allMatches, seasonStartMs]);

  const nextMatch = upcomingMatches[0];

  const upcomingBirthdays = useMemo(() => {
      if (!allUsers) return [];
      const now = startOfDay(new Date());
      const sevenDaysFromNow = addDays(now, 7);
      return allUsers.filter(u => {
          if (!u.dob) return false;
          const dob = parseISO(u.dob);
          if (!isValid(dob)) return false;
          let currentYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
          if (currentYearBday < now && differenceInDays(now, currentYearBday) > 300) currentYearBday.setFullYear(now.getFullYear() + 1);
          return currentYearBday >= now && currentYearBday <= sevenDaysFromNow;
      }).sort((a, b) => {
          const dobA = parseISO(a.dob!);
          const dobB = parseISO(b.dob!);
          return dobA.getMonth() - dobB.getMonth() || dobA.getDate() - dobB.getDate();
      });
  }, [allUsers]);

  const playedMatches = useMemo(() => {
      if (!allMatches) return [];
      return allMatches.filter(match => match.isPlayed).sort((a, b) => toJsDate(b.dateTime).getTime() - toJsDate(a.dateTime).getTime());
  }, [allMatches, seasonStartMs]);
  
  const recentPlayedMatches = useMemo<MatchDisplayItem[]>(() => {

      if (selectedSeasonId !== 'current') {
          const archived = archivedSeasons?.find(s => s.id === selectedSeasonId);
          if (archived?.matches && archived.matches.length > 0) {
              return archived.matches;
          }
          return playedMatches.filter(m => m.seasonId === selectedSeasonId || toJsDate(m.dateTime).getTime() < seasonStartMs);
      }
      return playedMatches
        .filter(m => toJsDate(m.dateTime).getTime() >= seasonStartMs)
        .slice(0, 5);
  }, [selectedSeasonId, archivedSeasons, playedMatches]);
    
  const teamScoring = useMemo(() => {
      if (!allUsers || !allSkaterStats) return [];
      const statsMap = new Map<string, SkaterStats>();
      allSkaterStats.forEach(stat => { if (stat.userProfileId) statsMap.set(stat.userProfileId, stat); });
      return allUsers.filter(u => u.playerType === 'player').map(u => {
          const stats = statsMap.get(u.id);
          const reg = { goals: stats?.seasonGoals ?? 0, assists: stats?.seasonAssists ?? 0, gamesPlayed: stats?.seasonGamesPlayed ?? 0 };
          const po = { goals: stats?.playoffGoals ?? 0, assists: stats?.playoffAssists ?? 0, gamesPlayed: stats?.playoffGamesPlayed ?? 0 };
          
          return {
              id: u.id, name: formatName(u.name),
              regular: reg,
              playoff: po,
              season: { 
                  goals: reg.goals + po.goals, 
                  assists: reg.assists + po.assists, 
                  gamesPlayed: reg.gamesPlayed + po.gamesPlayed 
              },
              history: { 
                  goals: (stats?.historicalGoals ?? 0) + reg.goals + po.goals, 
                  assists: (stats?.historicalAssists ?? 0) + reg.assists + po.assists, 
                  gamesPlayed: (stats?.historicalGamesPlayed ?? 0) + reg.gamesPlayed + po.gamesPlayed 
              },
              rawHistory: {
                  goals: stats?.historicalGoals ?? 0,
                  assists: stats?.historicalAssists ?? 0,
                  gamesPlayed: stats?.historicalGamesPlayed ?? 0
              }
          };
      });
  }, [allUsers, allSkaterStats]);

  const goalieLeaderboard = useMemo(() => {
      if (!allUsers || !allGoalieStats) return [];
      const statsMap = new Map<string, GoalieStats>();
      allGoalieStats.forEach(stat => { if (stat.userProfileId) statsMap.set(stat.userProfileId, stat); });


      return allUsers.filter(u => u.playerType === 'goalie').map(u => {
          const stats = statsMap.get(u.id);

          // Spočteme výhry, zápasy a čistá konta přímo z odehraných zápasů v Firestore pro AKTUÁLNÍ SEZÓNU
          let matchWins = 0;
          let matchGames = 0;
          let matchSO = 0;
          if (allMatches) {
              const uTokens = (u.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/);
              const uSurname = uTokens[uTokens.length - 1] || '';
              for (const m of allMatches) {
                  if (!m.isPlayed) continue;
                  // Striktně pouze zápasy z aktuální sezóny (od 16. 9. 2026) a základní části
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

          // Prioritně použijeme oficiální počet zápasů z hobbyhokejbrno (stats.seasonGamesPlayed),
          // fallback na spočtené zápasy z odehraných utkání aktuální sezóny.
          const officialGames = stats?.seasonGamesPlayed ?? 0;
          const regGames = officialGames > 0 ? officialGames : matchGames;

          // Výhry v sezóně: nesmí přesáhnout počet odehraných zápasů v základní části
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
              so: regSO 
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
              so: stats?.playoffSO ?? 0 
          };
          
          const seasonSaves = reg.saves + po.saves;
          const seasonShots = reg.shotsAgainst + po.shotsAgainst;
          const seasonGA = reg.goalsAgainst + po.goalsAgainst;

          const histSaves = (stats?.historicalSaves ?? 0) + seasonSaves;
          const histShots = (stats?.historicalShotsAgainst ?? 0) + seasonShots;
          const histGA = Math.max(0, histShots - histSaves);

          return {
              id: u.id, name: formatName(u.name),
              regular: reg,
              playoff: po,
              season: { 
                  gamesPlayed: reg.gamesPlayed + po.gamesPlayed, 
                  wins: reg.wins + po.wins, 
                  shotsAgainst: seasonShots, 
                  saves: seasonSaves,
                  goalsAgainst: seasonGA,
                  so: reg.so + po.so
              },
              history: { 
                  gamesPlayed: (stats?.historicalGamesPlayed ?? 0) + reg.gamesPlayed + po.gamesPlayed, 
                  wins: (stats?.historicalWins ?? 0) + reg.wins + po.wins, 
                  shotsAgainst: histShots, 
                  saves: histSaves, 
                  goalsAgainst: histGA,
                  so: (stats?.historicalSO ?? 0) + reg.so + po.so 
              },
              rawHistory: {
                  gamesPlayed: stats?.historicalGamesPlayed ?? 0,
                  wins: stats?.historicalWins ?? 0,
                  shotsAgainst: stats?.historicalShotsAgainst ?? 0,
                  saves: stats?.historicalSaves ?? 0,
                  goalsAgainst: Math.max(0, (stats?.historicalShotsAgainst ?? 0) - (stats?.historicalSaves ?? 0)),
                  so: stats?.historicalSO ?? 0
              }
          };
      });
  }, [allUsers, allGoalieStats, allMatches]);
  
  const sortedTeamScoring = useMemo(() => {
      if (selectedSeasonId !== 'current') {
          const archived = archivedSeasons?.find(s => s.id === selectedSeasonId);
          if (archived?.skaterStats && archived.skaterStats.length > 0) {
              return archived.skaterStats.map((s, idx) => ({
                  id: s.userProfileId || `archived-${idx}`,
                  name: s.name,
                  gamesPlayed: s.regularGamesPlayed + (s.playoffGamesPlayed || 0),
                  goals: s.regularGoals + (s.playoffGoals || 0),
                  assists: s.regularAssists + (s.playoffAssists || 0),
                  points: s.totalPoints ?? ((s.regularGoals || 0) + (s.regularAssists || 0)),
                  rank: s.rank || (idx + 1)
              })).sort((a, b) => b.points - a.points || b.goals - a.goals)
                 .map((p, i) => ({ ...p, rank: i + 1 }));
          }
          return [];
      }

      if (isStatEditMode) {
          return editableSkaterStats.map((p, i) => ({
              ...p,
              points: (Number(p.goals) || 0) + (Number(p.assists) || 0),
              rank: i + 1
          }));
      }

      const view = scoringView === 'season' ? 'season' : (scoringView === 'history' ? 'history' : (scoringView === 'playoff' ? 'playoff' : 'regular'));
      const dataSet = teamScoring.map(p => ({ id: p.id, name: p.name, ...p[view] }));
      return dataSet.map(p => ({ 
          ...p, 
          points: (Number(p.goals) || 0) + (Number(p.assists) || 0) 
      }))
      .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0) || (Number(b.goals) || 0) - (Number(a.goals) || 0))
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [selectedSeasonId, archivedSeasons, teamScoring, scoringView, isStatEditMode, editableSkaterStats]);

  const sortedGoalieLeaderboard = useMemo(() => {
      if (selectedSeasonId !== 'current') {
          const archived = archivedSeasons?.find(s => s.id === selectedSeasonId);
          if (archived?.goalieStats && archived.goalieStats.length > 0) {
              return archived.goalieStats.map((g, idx) => {
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
                      rank: idx + 1
                  };
              }).sort((a, b) => (b.savePercentage || 0) - (a.savePercentage || 0) || b.wins - a.wins)
                 .map((g, i) => ({ ...g, rank: i + 1 }));
          }
          return [];
      }

      if (isStatEditMode) {
          return editableGoalieStats.map((g, i) => {
              const sa = Number(g.shotsAgainst) || 0;
              const s = Number(g.saves) || 0;
              const ga = Math.max(0, sa - s);
              return {
                  ...g,
                  goalsAgainst: ga,
                  savePercentage: sa > 0 ? (s / sa) * 100 : 0,
                  rank: i + 1
              };
          });
      }

      const view = scoringView === 'season' ? 'season' : (scoringView === 'history' ? 'history' : (scoringView === 'playoff' ? 'playoff' : 'regular'));
      const dataSet = goalieLeaderboard.map(g => ({ id: g.id, name: g.name, ...g[view] }));
      return dataSet.map(g => {
          const sa = Number(g.shotsAgainst) || 0;
          const s = Number(g.saves) || 0;
          const ga = g.goalsAgainst ?? Math.max(0, sa - s);
          return {
              ...g, 
              goalsAgainst: ga,
              savePercentage: sa > 0 ? (s / sa) * 100 : 0
          }
      })
      .sort((a, b) => (b.savePercentage || 0) - (a.savePercentage || 0) || (Number(b.wins) || 0) - (Number(a.wins) || 0))
      .map((g, i) => ({...g, rank: i + 1}));
  }, [selectedSeasonId, archivedSeasons, goalieLeaderboard, scoringView, isStatEditMode, editableGoalieStats]);
  
  const currentUserStars = useMemo(() => {
    if (!user || !allMatches) return { star1Count: 0, star2Count: 0, star3Count: 0, totalPoints: 0, totalStars: 0 };
    const scopedMatches = allMatches.filter(m => {
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
      allAttendances?.forEach(att => { if (!map.has(att.matchId)) map.set(att.matchId, []); map.get(att.matchId)!.push(att); });
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
      if(user && allAttendances) allAttendances.filter(att => att.userId === user.uid).forEach(att => map.set(att.matchId, att));
      optimisticAttendances.forEach((opt, mId) => { if (opt.status !== 'unknown') { const ex = map.get(mId) || { id: user!.uid, userId: user!.uid, matchId: mId }; map.set(mId, { ...ex, ...opt } as Attendance); } else map.delete(mId); });
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
              name: leagueSettings?.currentSeasonName || 'Aktuální sezóna'
          };
      }
      const archived = archivedSeasons?.find(s => s.id === selectedSeasonId);
      return {
          standings: archived?.standings || [],
          playoffSeries: archived?.playoffSeries || [],
          name: archived?.name || 'Archiv'
      };
  }, [selectedSeasonId, leagueSettings, archivedSeasons]);
  
  const isLoading = isUserProfileLoading || isSkaterStatsLoading || isGoalieStatsLoading || areMatchesLoading || areUsersLoading || areSkaterStatsLoading || areGoalieStatsLoading || attendancesLoading || leagueSettingsLoading || seasonsLoading;

  useEffect(() => {
    if (isLoading) return;
    const mId = searchParams.get('matchId');
    const reason = searchParams.get('reason');
    if (!mId) return;

    const isUpcomingButNotNext = upcomingMatches.slice(1).some(m => m.id === mId);
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
    navigator.clipboard.writeText(url.toString()).then(() => toast({ title: "Odkaz zkopírován" }));
  };

  const handleOpenCareerModal = (playerId: string) => {
    const profile = usersMap.get(playerId);
    if (!profile) return;

    const isGoalie = profile.playerType === 'goalie';
    const currentSkaterStat = allSkaterStats?.find(s => s.userProfileId === playerId);
    const currentGoalieStat = allGoalieStats?.find(g => g.userProfileId === playerId);

    const skaterSeasons: PlayerCareerData['skaterSeasons'] = [];
    const goalieSeasons: PlayerCareerData['goalieSeasons'] = [];

    // 1. Current Season Record
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

    // 2. Archived Seasons Records
    if (archivedSeasons) {
      archivedSeasons.forEach(archive => {
        if (!isGoalie && archive.skaterStats) {
          const found = archive.skaterStats.find(s => s.userProfileId === playerId || s.name.toLowerCase() === profile.name.toLowerCase());
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
          const found = archive.goalieStats.find(g => g.userProfileId === playerId || g.name.toLowerCase() === profile.name.toLowerCase());
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

    // 3. Historical baseline prior to app deployment
    if (!isGoalie && currentSkaterStat && currentSkaterStat.historicalGamesPlayed > 0) {
      const archivedGames = skaterSeasons.filter(s => !s.isCurrent).reduce((sum, s) => sum + s.gamesPlayed, 0);
      const unrecordedGP = currentSkaterStat.historicalGamesPlayed - archivedGames;
      const unrecordedG = Math.max(0, currentSkaterStat.historicalGoals - skaterSeasons.filter(s => !s.isCurrent).reduce((sum, s) => sum + s.goals, 0));
      const unrecordedA = Math.max(0, currentSkaterStat.historicalAssists - skaterSeasons.filter(s => !s.isCurrent).reduce((sum, s) => sum + s.assists, 0));

      if (unrecordedGP > 0 || unrecordedG > 0 || unrecordedA > 0) {
        skaterSeasons.push({
          seasonId: 'prior-history',
          seasonName: 'Historické statistiky (do 14. 4. 2026)',
          year: 'Do 2026',
          isCurrent: false,
          gamesPlayed: unrecordedGP > 0 ? unrecordedGP : currentSkaterStat.historicalGamesPlayed,
          goals: unrecordedG > 0 ? unrecordedG : currentSkaterStat.historicalGoals,
          assists: unrecordedA > 0 ? unrecordedA : currentSkaterStat.historicalAssists,
          points: (unrecordedG > 0 ? unrecordedG : currentSkaterStat.historicalGoals) +
                  (unrecordedA > 0 ? unrecordedA : currentSkaterStat.historicalAssists),
        });
      }
    }

    if (isGoalie && currentGoalieStat && currentGoalieStat.historicalGamesPlayed > 0) {
      const archivedGames = goalieSeasons.filter(s => !s.isCurrent).reduce((sum, s) => sum + s.gamesPlayed, 0);
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

    const positionInfo = resolvePlayerPosition(profile as any, allMatches || []);
    const chemistry = teamMilestonesData.teamChemistry?.byPlayerId.get(profile.id) || null;
    const formSummary = teamMilestonesData.playerFormMap?.get(profile.id) || null;

    setSelectedCareerPlayer({
      id: profile.id,
      name: profile.name,
      photoURL: profile.photoURL,
      jerseyNumber: profile.jerseyNumber,
      playerType: profile.playerType,
      positionInfo,
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
      toast({ title: "Výsledek uložen." });
      setIsResultDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit výsledek zápasu.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStatsManual = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await statsService.saveManualStats(
        firestore,
        scoringView as any,
        editableSkaterStats,
        editableGoalieStats
      );
      toast({ title: 'Statistiky úspěšně uloženy' });
      setIsStatEditMode(false);
      setExpandedStatId(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Chyba', description: err.message || 'Nepodařilo se uložit statistiky.' });
    } finally {
      setIsSaving(false);
    }
  };

  const [isRestoringHistoricalSnapshot, setIsRestoringHistoricalSnapshot] = useState(false);

  const hasHistoricalData = useMemo(() => {
    return (allSkaterStats || []).some(s => (s.historicalGoals || 0) >= 40);
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
        description: `Aktualizováno ${result.skatersUpdated} hráčů a ${result.goaliesUpdated} brankářů (přeskočeno ${result.skippedUnregisteredCount} neregistrovaných).`,
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
      toast({ title: "Play-off série uloženy." });
      setIsPlayoffDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Chyba", description: "Nepodařilo se uložit série." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveSeason = async ({ seasonName, year, teamCount }: { seasonName: string; year: string; teamCount: number }) => {
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
      toast({ title: "Zápas přidán a tým upozorněn." });
    } catch (err: any) {
      // Permission error emitted in service
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
      toast({ title: "Změny uloženy" });
    } catch (err: any) {
      // Permission error emitted in service
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!selectedMatch || !firestore) return;
    setIsSaving(true);
    try {
      await matchesService.deleteMatch(firestore, selectedMatch.id);
      toast({ title: "Zápas smazán" });
    } catch (e: any) {
      // Permission error emitted in service
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
    setOptimisticAttendances(cur => new Map(cur).set(matchId, { status, note: currentNote, isGoalie: isCurrentUserGoalie } as any));
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
        title: status === 'going' 
          ? (isCurrentUserGoalie ? 'Účast potvrzena: Jdu (Brankář)' : 'Účast potvrzena: Jdu') 
          : 'Účast zrušena: Nejdu',
        description: status === 'going' ? 'Vidíme se na ledě!' : 'Zaznamenáno.',
      });
    } catch (err: any) {
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
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se zapsat staré zápasy.' });
    } finally {
      setIsProcessingOldMatches(false);
    }
  };

  const handleDeleteOldMatches = async () => {
    if (!firestore || oldUnrecordedMatches.length === 0) return;
    if (!window.confirm(`Opravdu chcete trvale smazat ${oldUnrecordedMatches.length} starých testovacích zápasů z předchozího období?`)) return;
    setIsProcessingOldMatches(true);
    try {
      const count = await matchesService.deleteOldTestMatches(firestore, oldUnrecordedMatches.map(m => m.id));
      toast({
        title: 'Staré testovací zápasy smazány',
        description: `Úspěšně odstraněno ${count} zápasů z databáze.`,
      });
    } catch (err: any) {
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
        // Pokud server narazil na chybu, zkusíme klientský fallback
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

    const openMatch = [...currentMatches]
      .reverse()
      .find((m) => getMvpVotingStatus(m).status === 'open');
    if (openMatch) return openMatch;

    const playedWithVotes = [...currentMatches]
      .filter((m) => (m.isPlayed || toJsDate(m.dateTime).getTime() + 90 * 60 * 1000 <= Date.now()) && ((m.mvpVotes && Object.keys(m.mvpVotes).length > 0) || (m.starsVotes && Object.keys(m.starsVotes).length > 0)))
      .sort((a, b) => toJsDate(b.dateTime).getTime() - toJsDate(a.dateTime).getTime())[0];
    return playedWithVotes || null;
  }, [allMatches, seasonStartMs]);

  const postMatchData = useMemo(() => {
    if (!allMatches || allMatches.length === 0 || selectedSeasonId !== 'current') return null;

    // 1. Priorita: Zápas dohraný, ale čekající na oficiální výsledek
    if (matchesAwaitingResult.length > 0) {
      return {
        match: matchesAwaitingResult[0],
        additionalAwaiting: matchesAwaitingResult.slice(1),
      };
    }

    // 2. Priorita: Zápas s otevřeným hlasováním o 3 hvězdách nebo nedávno odehraný zápas (do 24 hodin po skončení hlasování)
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

  // Automatické vyskočení modalu pro volbu 3 hvězd po odehraném zápase (1,5 hodiny po začátku)
  useEffect(() => {
    const targetMatch = postMatchData?.match || activeMvpMatch;
    if (!targetMatch || !user?.uid) return;

    // Zkontrolujeme, zda je hlasování otevřené (otevírá se přesně 1,5 hodiny po začátku zápasu)
    const votingStatus = getMvpVotingStatus(targetMatch);
    if (votingStatus.status !== 'open') return;

    // Zkontrolujeme, zda už uživatel nehlasoval
    const hasVoted = Boolean(targetMatch.starsVotes?.[user.uid] || targetMatch.mvpVotes?.[user.uid]);
    if (hasVoted) return;

    // Zkontrolujeme oprávněnost k hlasování (účast v zápase)
    const matchAttendees = attendancesByMatch.get(targetMatch.id) || [];
    const isParticipant =
      (targetMatch.lineup && Object.values(targetMatch.lineup).some((p) => p?.id === user.uid)) ||
      matchAttendees.some((a) => a.userId === user.uid && a.status === 'going');

    if (!isParticipant) return;

    // Zkontrolujeme session storage, zda uživatel okno v této relaci nezavřel
    const storageKey = `dismissed_stars_modal_${targetMatch.id}_${user.uid}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return;
    }

    // Automaticky otevřeme modal pro volbu 3 hvězd
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

  // Automatické vyskočení gratulačního okna pro MVP / Hvězdy zápasu po skončení hlasování
  // (pouze při 1. otevření aplikace po uzavření hlasování daného zápasu)
  useEffect(() => {
    if (!user?.uid || !allMatches || allMatches.length === 0) return;

    const nowMs = Date.now();


    // Vybereme odehrané zápasy od začátku sezóny seřazené od nejnovějšího
    const sortedMatches = [...allMatches]
      .filter((m) => {
        const mTime = toJsDate(m.dateTime || m.date).getTime();
        return mTime >= seasonStartMs;
      })
      .sort((a, b) => toJsDate(b.dateTime || b.date).getTime() - toJsDate(a.dateTime || a.date).getTime());

    for (const m of sortedMatches) {
      const votingStatus = getMvpVotingStatus(m, nowMs);
      // Hlasování musí být kompletně uzavřeno!
      if (votingStatus.status !== 'closed') continue;

      const starsResults = calculateMatchStarsResults(m, usersMap);
      if (starsResults.totalPoints === 0) continue;

      // Zkontrolujeme, zda je přihlášený uživatel mezi vyhlášenými hvězdami (TOP 3)
      const myStanding = starsResults.standings.find((s) => s.candidateId === user.uid);
      if (!myStanding || myStanding.rank > 3 || myStanding.points === 0) continue;

      const awardRank = (myStanding.rank <= 3 ? myStanding.rank : 3) as 1 | 2 | 3;
      const storageKey = `aces_award_modal_seen_${user.uid}_${m.id}_${awardRank}`;

      // Zkontrolujeme localStorage - pokud už uživatel tuto gratulaci viděl, nepřeskakujeme dál
      if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
        continue;
      }

      // Nalezena neoznámená hvězda pro aktuálního uživatele!
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
  }, [allMatches, user?.uid, usersMap, userProfile]);

  const renderMatchCard = (m: Match) => {
    const attStatus = userAttendancesWithOptimistic.get(m.id)?.status;
    const matchAttendees = attendancesByMatch.get(m.id) || [];
    const isLineupHighlighted = highlightedMatchId === m.id && highlightReason === 'lineup';

    return (
      <UpcomingMatchCard
        key={m.id}
        match={m as any}
        allMatches={allMatches || []}
        archivedSeasons={archivedSeasons || []}
        attendanceStatus={attStatus as any}
        attendanceNote={userAttendancesWithOptimistic.get(m.id)?.note}
        attendees={matchAttendees as any}
        usersMap={usersMap}
        currentUserId={user?.uid}
        playerFormMap={teamMilestonesData.playerFormMap}
        leagueSkaters={leagueSettings?.leagueSkaters}
        isAdmin={userProfile?.role === 'admin'}
        isCardHighlighted={highlightedMatchId === m.id}
        isLineupHighlighted={isLineupHighlighted}
        onRsvp={(status) => handleQuickAttendance(m.id, status)}
        onOpenNoteDialog={() => {
          setAttendanceData({ matchId: m.id, status: attStatus === 'not-going' ? 'not-going' : 'going' });
          setAttendanceNote(userAttendancesWithOptimistic.get(m.id)?.note || '');
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
  };

  if (isLoading || !user) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>

  // 1. Upozornění pro administrátora na staré nezapsané zápasy
  const oldMatchesAlert = userProfile?.role === 'admin' && oldUnrecordedMatches.length > 0 && selectedSeasonId === 'current' ? (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm w-full min-w-0 overflow-hidden">
      <div className="space-y-1">
        <p className="text-sm font-bold text-amber-500 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Nalezeno {oldUnrecordedMatches.length} starých zápasů z předchozího období (před 16. 9. 2026)
        </p>
        <p className="text-xs text-muted-foreground">
          Tyto zápasy proběhly před zahájením aktuální sezóny. Chcete je zapsat a archivovat do minulého ročníku, nebo smazat testovací data?
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handleArchiveOldMatches}
          disabled={isProcessingOldMatches}
          className="text-xs font-semibold border-amber-500/50 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 h-7"
        >
          {isProcessingOldMatches ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Archive className="mr-1.5 h-3 w-3" />}
          Zapsat a archivovat
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDeleteOldMatches}
          disabled={isProcessingOldMatches}
          className="text-xs text-destructive hover:bg-destructive/10 h-7"
        >
          <Trash2 className="mr-1.5 h-3 w-3" />
          Smazat staré zápasy
        </Button>
      </div>
    </div>
  ) : null;

  // 2. Příští zápasy (nebo archivní upozornění pro uzavřený ročník)
  const nextMatchesSection = selectedSeasonId !== 'current' ? (
    <div className="p-3.5 sm:p-4 rounded-xl border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left w-full min-w-0 overflow-hidden">
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Prohlížíte uzavřený ročník <span className="font-semibold text-foreground">{activeSeasonData.name}</span>. Nadcházející zápasy a docházka jsou aktivní pouze v aktuální sezóně.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => setSelectedSeasonId('current')} className="text-xs h-7 shrink-0">
        Přejít na aktuální sezónu
      </Button>
    </div>
  ) : (
    <div className="space-y-3 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between px-1 sm:px-0">
        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <Trophy className="text-primary h-4.5 w-4.5" />
          Příští zápasy
        </h2>
        {userProfile?.role === 'admin' && (
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="h-7 text-xs font-semibold">
            <Plus className="h-3 w-3 mr-1" />
            Přidat zápas
          </Button>
        )}
      </div>
      {nextMatch ? renderMatchCard(nextMatch) : <p className="text-center py-6 text-muted-foreground text-xs sm:text-sm">Žádné blížící se zápasy.</p>}
      {upcomingMatches.slice(1).length > 0 && (
        <Accordion type="single" collapsible className="w-full" value={openAccordionValue} onValueChange={setOpenAccordionValue}>
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="rounded-lg border px-3.5 py-2 bg-card hover:bg-card/80 text-xs font-semibold">
              Další zápasy ({upcomingMatches.slice(1).length})
            </AccordionTrigger>
            <AccordionContent className="pt-2.5 space-y-3">{upcomingMatches.slice(1).map(m => renderMatchCard(m))}</AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );

  // 3. Poslední zápas & MVP (pouze v aktuální sezóně a pokud existuje odehraný zápas)
  const postMatchSection = selectedSeasonId === 'current' && postMatchData ? (
    <div className="space-y-3 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between px-1 sm:px-0">
        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <Award className="text-primary h-4.5 w-4.5" />
          Poslední zápas & MVP
        </h2>
      </div>
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

  // 4. Ligová soutěž
  const leagueSection = (
          <Card className="h-fit border-border/70 bg-card/95 w-full min-w-0 overflow-hidden">
            <CardHeader className="flex-col items-start gap-3 py-3.5 px-3.5 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg whitespace-nowrap"><ListOrdered className="text-primary"/>Soutěž</CardTitle>
                    <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                            <SelectTrigger className="h-7 w-[160px] text-xs">
                                <SelectValue placeholder="Vyberte sezónu" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="current">{leagueSettings?.currentSeasonName || 'Aktuální sezóna'}</SelectItem>
                                {archivedSeasons?.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.year})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {userProfile?.role === 'admin' && selectedSeasonId === 'current' && (
                    <div className="flex flex-wrap items-center gap-1.5 w-full pt-2 border-t border-border/40">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={handleSyncLeagueFromWeb}
                           disabled={isSyncingLeague}
                           className="h-7 text-[10px] sm:text-xs font-semibold border-primary/50 text-primary hover:bg-primary/10"
                           title="Stáhnout a propsat aktuální ligovou tabulku, odehrané zápasy a statistiky hráčů z hobbyhokejbrno.cz"
                         >
                           <RefreshCw className={cn("h-3 w-3 mr-1", isSyncingLeague && "animate-spin")} />
                           {isSyncingLeague ? 'Stahuji...' : 'Synchronizovat'}
                         </Button>
                         
                         <Button size="sm" variant="outline" onClick={() => setIsPlayoffDialogOpen(true)} className="h-7 text-[10px] sm:text-xs"><Pencil className="h-3 w-3 mr-1" />Play-off</Button>
                         <Button size="sm" variant="destructive" onClick={() => setIsArchiveSeasonDialogOpen(true)} className="h-7 text-[10px] sm:text-xs"><History className="h-3 w-3 mr-1" />Ukončit</Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-4">
                <Tabs defaultValue="standings">
                    <TabsList className="grid w-full grid-cols-2 mb-3">
                        <TabsTrigger value="standings" className="text-xs">Tabulka</TabsTrigger>
                        <TabsTrigger value="playoff" className="text-xs">Play-off série</TabsTrigger>
                    </TabsList>
                    <TabsContent value="standings">
                        <LeagueStandingsTable standings={activeSeasonData.standings} />
                    </TabsContent>
                    <TabsContent value="playoff">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {(activeSeasonData.playoffSeries || []).map((series, idx) => (
                                <Card key={idx} className="bg-muted/30">
                                    <CardHeader className="pb-2 p-3">
                                        <p className="text-[10px] font-bold text-primary uppercase">{series.round}</p>
                                        <CardTitle className="text-sm text-left">{series.opponent}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium">Stav série</p>
                                            <p className="text-lg font-bold text-primary tabular-nums">{series.wins} : {series.losses}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {(!activeSeasonData.playoffSeries || activeSeasonData.playoffSeries.length === 0) && (
                                <div className="col-span-full py-8 text-center text-muted-foreground italic text-xs">Play-off série zatím nebyly definovány.</div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
  );

  // 5. Odehrané zápasy
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
                  const u = allUsers?.find(usr => areNamesMatching(usr.name, skaterName));
                  return u
                    ? { id: u.id, name: u.name, email: u.email || '', jerseyNumber: u.jerseyNumber ?? null, photoURL: u.photoURL ?? null }
                    : { id: `skater-${idx}`, name: skaterName, email: '', jerseyNumber: null, photoURL: null };
                });
                const goalieUser = m.goalieName ? allUsers?.find(usr => areNamesMatching(usr.name, m.goalieName!)) : null;
                const goaliePlayer = goalieUser
                  ? { id: goalieUser.id, name: goalieUser.name, email: goalieUser.email || '', jerseyNumber: goalieUser.jerseyNumber ?? null, photoURL: goalieUser.photoURL ?? null }
                  : (m.goalieName ? { id: 'goalie', name: m.goalieName, email: '', jerseyNumber: null, photoURL: null } : null);
                
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
                  .filter(a => a.status === 'going')
                  .map(a => usersMap.get(a.userId))
                  .filter((u): u is NonNullable<typeof u> => Boolean(u));
                
                if (goingUsers.length > 0) {
                  const goalie = goingUsers.find(u => isGoaliePlayer(u) || u.playerType === 'goalie');
                  const skaters = goingUsers.filter(u => u !== goalie);
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

  // 6. Týmové statistiky (Hráči v poli & Brankáři)
  const scoringSection = (
    <Card className="h-fit w-full min-w-0 overflow-hidden">
      <Tabs value={activeStatsTab} onValueChange={(v) => setActiveStatsTab(v as 'stats' | 'stars')}>
        <CardHeader className="py-3 px-3 sm:px-6 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Přepínač Hráči v poli vs Brankáři (bez rušivých ikon, jednořádkový) */}
            <div className="inline-flex p-1 bg-muted/80 rounded-xl border border-border/60 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  if (isStatEditMode) return;
                  setStatsCategory('skaters');
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer whitespace-nowrap",
                  statsCategory === 'skaters'
                    ? "bg-background text-primary shadow-xs border border-border/40 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
              >
                <span>Hráči v poli</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors",
                  statsCategory === 'skaters' ? "bg-primary/15 text-primary" : "bg-muted-foreground/15 text-muted-foreground"
                )}>
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
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer whitespace-nowrap",
                  statsCategory === 'goalies'
                    ? "bg-background text-primary shadow-xs border border-border/40 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
              >
                <span>Brankáři</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors",
                  statsCategory === 'goalies' ? "bg-primary/15 text-primary" : "bg-muted-foreground/15 text-muted-foreground"
                )}>
                  {goalieLeaderboard.length}
                </span>
              </button>
            </div>

            {/* Režim: Bodování / Hvězdy + akční tlačítka (stabilní šířka bez překrytí textu) */}
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
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/30">Uzamčený archiv</Badge>
                  )}
                  {userProfile?.role === 'admin' && !isStatEditMode && scoringView !== 'season' && selectedSeasonId === 'current' && (
                    <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => { 
                      const viewKey = scoringView === 'history' ? 'rawHistory' : (scoringView === 'regular' ? 'regular' : 'playoff');
                      if (statsCategory === 'skaters') {
                        const initialEditData = teamScoring.map(p => {
                          const data = p[viewKey as keyof typeof p] as any;
                          return {
                            id: p.id,
                            name: p.name,
                            goals: String(data.goals || 0),
                            assists: String(data.assists || 0),
                            gamesPlayed: String(data.gamesPlayed || 0)
                          };
                        });
                        setEditableSkaterStats(initialEditData); 
                      } else {
                        const initialEditData = goalieLeaderboard.map(g => {
                          const data = g[viewKey as keyof typeof g] as any;
                          return {
                            id: g.id,
                            name: g.name,
                            gamesPlayed: String(data.gamesPlayed || 0),
                            wins: String(data.wins || 0),
                            saves: String(data.saves || 0),
                            shotsAgainst: String(data.shotsAgainst || 0),
                            so: String(data.so || 0)
                          };
                        });
                        setEditableGoalieStats(initialEditData); 
                      }
                      setIsStatEditMode(true); 
                      setExpandedStatId(null);
                    }}>Upravit</Button>
                  )}
                  {isStatEditMode && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => { setIsStatEditMode(false); setExpandedStatId(null); }}>Zrušit</Button>
                      <Button size="sm" className="h-8 text-[10px]" onClick={handleSaveStatsManual}>Uložit</Button>
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
            <Tabs value={scoringView} onValueChange={(v) => { if (!isStatEditMode) setScoringView(v as any); }}>
              {selectedSeasonId === 'current' ? (
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="regular" className="text-[10px] px-1">ZČ</TabsTrigger>
                  <TabsTrigger value="playoff" className="text-[10px] px-1">Play-off</TabsTrigger>
                  <TabsTrigger value="season" className="text-[10px] px-1">Sezona</TabsTrigger>
                  <TabsTrigger value="history" className="text-[10px] px-1">Historie</TabsTrigger>
                </TabsList>
              ) : (
                <div className="mb-3 px-1 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Konečné statistiky ročníku <strong>{activeSeasonData.name}</strong></span>
                  <Badge variant="secondary" className="text-[10px]">Archiv</Badge>
                </div>
              )}
              {isStatEditMode && (
                <div className="mb-4 p-2 bg-primary/5 border rounded-lg text-[10px] text-primary text-center font-bold uppercase">
                  {statsCategory === 'skaters' ? (
                    scoringView === 'history' ? 'Upravujete historii hráčů (minulé sezóny)' : (scoringView === 'regular' ? 'Upravujete základní část hráčů' : 'Upravujete play-off hráčů')
                  ) : (
                    scoringView === 'history' ? 'Upravujete historii brankářů (minulé sezóny)' : (scoringView === 'regular' ? 'Upravujete základní část brankářů' : 'Upravujete play-off brankářů')
                  )}
                </div>
              )}
              {scoringView === 'history' && userProfile?.role === 'admin' && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                      <DatabaseBackup className="h-4 w-4" />
                      <span>Oficiální historický snapshot (stav k 14. 4. 2026)</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      {statsCategory === 'skaters' ? (
                        hasHistoricalData
                          ? 'Historické statistiky (37 hráčů, 6 brankářů) jsou aktivní a dopočítávají se k letošní sezóně.'
                          : 'V databázi chybí historické statistiky (byly dříve vynulovány). Kliknutím níže obnovíte oficiální čísla k 14. 4. 2026.'
                      ) : (
                        hasHistoricalData
                          ? 'Historické statistiky brankářů (Štěpán 88 Z, Lacko 31 Z, Bara 5 Z...) jsou aktivní.'
                          : 'V databázi chybí historické statistiky brankářů. Kliknutím níže obnovíte oficiální čísla k 14. 4. 2026.'
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={hasHistoricalData ? 'outline' : 'default'}
                    className={cn(
                      'h-8 text-xs font-semibold shrink-0',
                      !hasHistoricalData && 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                    )}
                    onClick={handleRestoreHistoricalSnapshot}
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
                  scorers={sortedTeamScoring}
                  currentUserId={user?.uid}
                  onPlayerClick={handleOpenCareerModal}
                  showAll={showAllScoring}
                  onToggleShowAll={() => setShowAllScoring(!showAllScoring)}
                  isStatEditMode={isStatEditMode}
                  expandedStatId={expandedStatId}
                  onToggleExpandStat={(id) => setExpandedStatId(expandedStatId === id ? null : id)}
                  onUpdateEditableSkaterStat={setEditableSkaterStats}
                  allUsers={allUsers || []}
                  allMatches={allMatches || []}
                  playerFormMap={teamMilestonesData.playerFormMap}
                />
              ) : (
                <GoalieStatsTable
                  goalies={sortedGoalieLeaderboard}
                  currentUserId={user?.uid}
                  onGoalieClick={handleOpenCareerModal}
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
                        const isMe = player.id === user.uid;
                        return (
                          <TableRow
                            key={player.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              isMe && "bg-primary/10 hover:bg-primary/15 font-semibold"
                            )}
                            onClick={() => handleOpenCareerModal(player.id)}
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
            ) : (
              goalieStarsLeaderboard.length === 0 ? (
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
                        const isMe = player.id === user.uid;
                        return (
                          <TableRow
                            key={player.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              isMe && "bg-primary/10 hover:bg-primary/15 font-semibold"
                            )}
                            onClick={() => handleOpenCareerModal(player.id)}
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
              )
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );

  return (
    <div className="py-4 sm:py-6 space-y-4 lg:space-y-5 w-full min-w-0 max-w-7xl mx-auto">
      {selectedSeasonId !== 'current' && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <History className="h-5 w-5" />
            </div>
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

      <BirthdaysCard birthdays={upcomingBirthdays} />

        {/* PROFESIONÁLNÍ HRÁČSKÁ LIŠTA (PLAYER STRIP) */}
        <Card className="border-border/70 bg-card/95 shadow-sm overflow-hidden w-full min-w-0">
        <div className="p-3.5 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full min-w-0">
          {/* Vizuální identita hráče */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/80 shadow-sm">
                <AvatarImage src={userProfile?.photoURL || `https://picsum.photos/seed/${userProfile?.email}/200/200`} />
                <AvatarFallback className="font-bold text-sm sm:text-base">{userProfile?.name ? userProfile.name[0] : 'U'}</AvatarFallback>
              </Avatar>
              {userProfile?.jerseyNumber && (
                <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] sm:text-[11px] font-black px-1.5 py-0.2 rounded-full shadow">
                  #{userProfile.jerseyNumber}
                </span>
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-headline font-bold truncate text-foreground">
                  {userProfile?.name || 'Hráč Aces'}
                </h1>
                {(() => {
                  if (!userProfile) return null;
                  const posInfo = resolvePlayerPosition(userProfile as any, allMatches || []);
                  return (
                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", posInfo.meta.badgeClass)}>
                      {posInfo.meta.label}
                    </Badge>
                  );
                })()}
                {currentUserBadges.map((b) => (
                  <PlayerFormBadgeItem key={b.type} badge={b} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {userProfile?.role === 'admin' ? 'Administrátor týmu' : 'Aktivní soupiska HC Aces'}
              </p>
            </div>
          </div>

          {/* Sjednocený pravý blok: Přepínač období & Rychlé statistiky & Kariérní karta */}
          <div className="flex flex-wrap items-center gap-3 lg:gap-4 shrink-0">
            <Tabs value={myStatsView} onValueChange={(v) => setMyStatsView(v as any)} className="w-auto shrink-0">
              <TabsList className="h-8 p-0.5 bg-muted/60">
                <TabsTrigger value="regular" className="text-[10px] sm:text-xs h-7 px-2.5">ZČ</TabsTrigger>
                <TabsTrigger value="playoff" className="text-[10px] sm:text-xs h-7 px-2.5">Play-off</TabsTrigger>
                <TabsTrigger value="season" className="text-[10px] sm:text-xs h-7 px-2.5">Sezona</TabsTrigger>
                <TabsTrigger value="history" className="text-[10px] sm:text-xs h-7 px-2.5">Historie</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Metriky hráče / brankáře */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 scrollbar-none">
              {userProfile?.playerType === 'goalie' ? (
                <>
                  <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[42px] shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Zápasy</span>
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                      {String(goalieLeaderboard.find(g => g.id === user.uid)?.[myStatsView]?.gamesPlayed || 0)}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[42px] shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Výhry</span>
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                      {String(goalieLeaderboard.find(g => g.id === user.uid)?.[myStatsView]?.wins || 0)}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[42px] shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">SO</span>
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                      {String(goalieLeaderboard.find(g => g.id === user.uid)?.[myStatsView]?.so || 0)}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-primary/15 border border-primary/50 text-center shrink-0 shadow-2xs">
                    <span className="text-[9px] uppercase font-black text-primary block">Úspěšnost</span>
                    <span className="text-xs sm:text-sm font-black tabular-nums text-primary">
                      {(() => {
                        const stats = goalieLeaderboard.find(g => g.id === user.uid)?.[myStatsView];
                        const sa = Number(stats?.shotsAgainst) || 0;
                        const s = Number(stats?.saves) || 0;
                        return sa > 0 ? ((s / sa) * 100).toFixed(2) : '0.00';
                      })()}%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[38px] shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Z</span>
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                      {String(teamScoring.find(p => p.id === user.uid)?.[myStatsView]?.gamesPlayed || 0)}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[38px] shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">G</span>
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                      {String(teamScoring.find(p => p.id === user.uid)?.[myStatsView]?.goals || 0)}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-muted/60 dark:bg-muted/50 border border-border/70 text-center shrink-0 min-w-[38px] shadow-2xs">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">A</span>
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                      {String(teamScoring.find(p => p.id === user.uid)?.[myStatsView]?.assists || 0)}
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-md bg-primary/15 border border-primary/50 text-center shrink-0 min-w-[42px] shadow-2xs">
                    <span className="text-[9px] uppercase font-black text-primary block">Body</span>
                    <span className="text-xs sm:text-sm font-black tabular-nums text-primary">
                      {String((teamScoring.find(p => p.id === user.uid)?.[myStatsView]?.goals || 0) + (teamScoring.find(p => p.id === user.uid)?.[myStatsView]?.assists || 0))}
                    </span>
                  </div>
                </>
              )}

              {/* Hvězdy zápasu shrnutí */}
              <div
                className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-center shrink-0 cursor-default shadow-2xs"
                title={`${currentUserStars.star1Count}x 1. hvězda (3b), ${currentUserStars.star2Count}x 2. hvězda (2b), ${currentUserStars.star3Count}x 3. hvězda (1b)`}
              >
                <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                  Hvězdy
                </span>
                <span className="text-xs sm:text-sm font-black tabular-nums text-amber-600 dark:text-amber-400">
                  {currentUserStars.totalPoints} <span className="text-[10px] font-medium text-muted-foreground">b</span>
                </span>
              </div>
            </div>

            {/* Tlačítko kariérní karty */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 hover:text-primary shrink-0"
                onClick={() => handleOpenCareerModal(user.uid)}
              >
                <Trophy className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Kariérní karta
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* HLAVNÍ BLOKY: RESPONZIVNÍ 2 NEZÁVISLÉ SLOUPCE NA DESKTOPU VS JEDEN SLOUPEC NA MOBILU */}
      {isDesktop ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-start w-full min-w-0">
          {/* LEVÝ SLOUPEC: Příští zápasy -> Soutěž -> Statistiky týmu (Hráči & Brankáři) */}
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

      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Potvrdit účast</DialogTitle></DialogHeader>
              <div className="py-4 space-y-2 p-1">
                  <Label>Poznámka (volitelné)</Label>
                  <Textarea value={attendanceNote} onChange={e => setAttendanceNote(e.target.value)} placeholder="Např. přijdu později..." />
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>Zrušit</Button>
                  <Button onClick={async () => { 
                    if(!attendanceData || !user || !firestore) return; 
                    setIsSaving(true); 
                    try {
                        const isCurrentUserGoalie = isGoaliePlayer(userProfile);
                        setOptimisticAttendances(cur => new Map(cur).set(attendanceData.matchId, { status: attendanceData.status, note: attendanceNote, isGoalie: isCurrentUserGoalie } as any)); 
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
                    } catch (err: any) {
                        // error emitted in attendanceService
                    } finally {
                        setIsSaving(false); 
                    }
                  }}>Potvrdit</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isLineupBuilderOpen} onOpenChange={setIsLineupBuilderOpen}>
        <DialogContent className="max-w-5xl xl:max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden text-left">
            <DialogHeader className="p-6 pb-0 flex-shrink-0">
                <DialogTitle>Editor sestavy</DialogTitle>
            </DialogHeader>
            {lineupMatch && <LineupBuilder players={allUsers?.map(u => {
              const resolvedPos = resolvePlayerPosition(u as any, allMatches || []).resolvedPosition;
              const derivedFieldPos = (resolvedPos === 'defense' || resolvedPos === 'wing' || resolvedPos === 'center') ? resolvedPos : u.fieldPosition;
              return {
                ...u,
                playerType: (isGoaliePlayer(u) ? 'goalie' : u.playerType) as 'goalie' | 'player' | 'member',
                fieldPosition: derivedFieldPos,
              };
            }).filter(u => (attendancesByMatch.get(lineupMatch.id)||[]).some(a => a.userId === u.id && a.status === 'going')) || []} initialData={lineupMatch.lineup} teamChemistry={teamMilestonesData.teamChemistry} onSave={async l => { 
                if(!lineupMatch || !firestore) return; 
                setIsSaving(true); 
                try {
                    await updateDoc(doc(firestore, 'matches', lineupMatch.id), { lineup: l }); 
                    if (userProfile?.role === 'admin' && allUsers) {
                        await rosterService.syncPositionsFromLineup(firestore, l, allUsers as any);
                    } 
                    
                    const batch = writeBatch(firestore);
                    const opponent = getMatchDetails(lineupMatch).opponent;
                    
                    const playerIds = Object.values(l).filter(p => p !== null).map(p => p!.id);
                    
                    playerIds.forEach(pId => {
                        const notifRef = doc(collection(firestore, 'users', pId, 'notifications'));
                        batch.set(notifRef, {
                            title: 'Byl jsi nominován do sestavy!',
                            message: `Máš místo v sestavě na zápas proti ${opponent}. Koukni na detaily!`,
                            type: 'lineup_added',
                            createdAt: Timestamp.now(),
                            read: false,
                            matchId: lineupMatch.id
                        });
                    });
                    
                    await batch.commit();
                    
                    setIsLineupBuilderOpen(false); 
                    toast({ title: "Sestava uložena a hráči informováni." }); 
                } catch (err: any) {
                    const permissionError = new FirestorePermissionError({
                        path: `matches/${lineupMatch.id}`,
                        operation: 'update'
                    });
                    errorEmitter.emit('permission-error', permissionError);
                } finally {
                    setIsSaving(false); 
                }
            }} onCancel={() => setIsLineupBuilderOpen(false)} />}
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Smazat zápas?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive" onClick={handleDeleteMatch} disabled={isSaving}>Smazat</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <MatchFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        match={selectedMatch}
        onSave={handleUpdateMatch}
        isSaving={isSaving}
      />

      <PlayerCareerModal 
        player={selectedCareerPlayer}
        isOpen={isCareerModalOpen}
        onClose={() => setIsCareerModalOpen(false)}
      />

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

      <MatchAwardCelebrationModal
        isOpen={isCelebrationModalOpen}
        onClose={handleCloseCelebration}
        awardData={celebrationAward}
      />
    </div>
  );
}

export default function DashboardPage() { return <Suspense fallback={<div className="container py-8 text-center">Načítání...</div>}><DashboardPageContent /></Suspense> }
