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
import { MapPin, Users, Trophy, BarChart, Pencil, Check, X, Flame, Shield, Plus, Loader2, Trash2, ClipboardEdit, History, Share2, MoreHorizontal, FileText, View, Disc, Cake, Minus, ChevronDown, ListOrdered } from "lucide-react"
import { cn } from '@/lib/utils'
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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  jerseyNumber?: number;
  phoneNumber?: string;
  role: 'admin' | 'classic';
  playerType: 'player' | 'goalie' | 'member';
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

interface Match {
  id: string;
  dateTime: Timestamp;
  location: string;
  team1: string;
  team2: string;
  isPlayed: boolean;
  type: 'regular' | 'playoff' | 'friendly';
  round?: number;
  playoffStage?: 'čtvrtfinále' | 'semifinále' | 'finále';
  playoffMatchNumber?: number;
  team1Score?: number;
  team2Score?: number;
  scorers?: { goal: string; assist: string | null }[];
  lineup?: Lineup;
  goalieId?: string;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
}

interface Attendance {
    id: string; 
    userId: string;
    matchId: string;
    status: 'going' | 'not-going' | 'unknown';
    note?: string;
}

interface LeagueStanding {
    id: string;
    name: string;
    points: number;
    gf: number;
    ga: number;
}

interface PlayoffSeries {
    round: 'Čtvrtfinále' | 'Semifinále' | 'Finále' | 'Vítěz';
    opponent: string;
    wins: number;
    losses: number;
}

interface AppSettings {
  isPlayoffEnabled: boolean;
  isScoringInPlayoffMode: boolean;
  playoffSeries?: PlayoffSeries[];
  leagueStandings?: LeagueStanding[];
}

function getMatchDetails(match: Match) {
    let prefix = '';
    if (match.type === 'regular' && match.round) {
        prefix = `${match.round}. kolo`;
    } else if (match.type === 'playoff' && match.playoffStage) {
        const stage = match.playoffStage.charAt(0).toUpperCase() + match.playoffStage.slice(1);
        prefix = `${stage}${match.playoffMatchNumber ? ` - ${match.playoffMatchNumber}. zápas` : ''}`;
    }
    const opponent = match.team1 === 'Aces' ? match.team2 : match.team1;
    return { prefix, opponent };
}

const formatName = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
};

function RecordResultForm({ match, allUsers, onSave, onCancel, isSaving }: { match: Match, allUsers: UserProfile[], onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>, onCancel: () => void, isSaving: boolean }) {
    const [goalCount, setGoalCount] = useState(match.team1Score || 0);
    const skaters = useMemo(() => allUsers.filter(u => u.playerType === 'player'), [allUsers]);
    const goalies = useMemo(() => allUsers.filter(u => u.playerType === 'goalie'), [allUsers]);
    const { prefix, opponent } = getMatchDetails(match);

    return (
        <form onSubmit={onSave}>
             <DialogHeader>
                  <DialogTitle>Zapsat výsledek zápasu</DialogTitle>
                  <DialogDescription>Zadejte konečné skóre a detaily zápasu.</DialogDescription>
              </DialogHeader>
            <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4 p-1">
                <div className="text-center">
                    {prefix && <p className="text-xs font-bold text-primary uppercase mb-1">{prefix}</p>}
                    <p className="font-bold text-lg">{opponent}</p>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                    <div className="grid gap-2 text-center">
                        <Label htmlFor="team1Score">Aces</Label>
                        <Input id="team1Score" name="team1Score" type="number" className="text-center text-2xl font-bold h-16" min="0" required defaultValue={match.team1Score} onChange={(e) => setGoalCount(parseInt(e.target.value) || 0)} />
                    </div>
                     <div className="grid gap-2 text-center">
                        <Label htmlFor="team2Score">Soupeř</Label>
                        <Input id="team2Score" name="team2Score" type="number" className="text-center text-2xl font-bold h-16" min="0" required defaultValue={match.team2Score} />
                    </div>
                </div>

                <div className="grid gap-4 border p-4 rounded-lg bg-muted/20">
                    <p className="font-bold text-sm uppercase tracking-wider text-primary">Statistiky brankáře</p>
                    <div className="grid gap-2">
                        <Label>Brankář</Label>
                        <Select name="goalieId" defaultValue={match.goalieId || 'none'}>
                            <SelectTrigger><SelectValue placeholder="Vyberte brankáře" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Žádný</SelectItem>
                                {goalies.map(u => <SelectItem key={u.id} value={u.id}>{formatName(u.name)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Zásahy</Label>
                            <Input name="goalieSaves" type="number" min="0" defaultValue={match.goalieSaves || 0} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Střely proti</Label>
                            <Input name="goalieShotsAgainst" type="number" min="0" defaultValue={match.goalieShotsAgainst || 0} />
                        </div>
                    </div>
                </div>

                {goalCount > 0 && <p className="font-medium mt-4">Střelci</p>}
                <div className="grid gap-3">
                    {Array.from({ length: goalCount }).map((_, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2 items-center">
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-muted-foreground">Střelec</Label>
                                <Select name={`goal-${index}`} defaultValue={match.scorers?.[index]?.goal}>
                                    <SelectTrigger><SelectValue placeholder={`Vyberte hráče`} /></SelectTrigger>
                                    <SelectContent>{skaters.map(u => <SelectItem key={u.id} value={u.id}>{formatName(u.name)}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-muted-foreground">Asistence</Label>
                                <Select name={`assist-${index}`} defaultValue={match.scorers?.[index]?.assist || "none"}>
                                    <SelectTrigger><SelectValue placeholder="Asistence" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Žádná</SelectItem>
                                        {skaters.map(u => <SelectItem key={u.id} value={u.id}>{formatName(u.name)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Zrušit</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Uložit výsledek
                </Button>
            </DialogFooter>
        </form>
    )
}

function StatAdjuster({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const num = parseInt(value || '0', 10);
    const updateValue = (delta: number) => {
        const newVal = Math.max(0, num + delta);
        onChange(String(newVal));
    };

    return (
        <div className="flex items-center justify-center gap-1.5">
            <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => updateValue(-1)}
            >
                <Minus className="h-3 w-3" />
            </Button>
            <Input 
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-14 h-7 text-center font-bold text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => updateValue(1)}
            >
                <Plus className="h-3 w-3" />
            </Button>
        </div>
    );
}

function DashboardPageContent() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
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
  const [isStatEditMode, setIsStatEditMode] = useState(false);
  const [expandedStatId, setExpandedStatId] = useState<string | null>(null);
  const [addMatchType, setAddMatchType] = useState<Match['type']>('regular');
  
  const [editableSkaterStats, setEditableSkaterStats] = useState<any[]>([]);
  const [editableGoalieStats, setEditableGoalieStats] = useState<any[]>([]);

  const [isLeagueDialogOpen, setIsLeagueDialogOpen] = useState(false);
  const [isPlayoffDialogOpen, setIsPlayoffDialogOpen] = useState(false);

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
    
  const upcomingMatches = useMemo(() => {
      if (!allMatches) return [];
      const now = startOfDay(new Date());
      return allMatches.filter(match => !match.isPlayed && match.dateTime.toDate() >= now);
  }, [allMatches]);

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
      return allMatches.filter(match => match.isPlayed).sort((a, b) => b.dateTime.toDate().getTime() - a.dateTime.toDate().getTime());
  }, [allMatches]);
  
  const recentPlayedMatches = useMemo(() => playedMatches.slice(0, 5), [playedMatches]);
    
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
          const reg = { gamesPlayed: stats?.seasonGamesPlayed ?? 0, wins: stats?.seasonWins ?? 0, shotsAgainst: stats?.seasonShotsAgainst ?? 0, saves: stats?.seasonSaves ?? 0, so: stats?.seasonSO ?? 0 };
          const po = { gamesPlayed: stats?.playoffGamesPlayed ?? 0, wins: stats?.playoffWins ?? 0, shotsAgainst: stats?.playoffShotsAgainst ?? 0, saves: stats?.playoffSaves ?? 0, so: stats?.playoffSO ?? 0 };
          
          return {
              id: u.id, name: formatName(u.name),
              regular: reg,
              playoff: po,
              season: { 
                  gamesPlayed: reg.gamesPlayed + po.gamesPlayed, 
                  wins: reg.wins + po.wins, 
                  shotsAgainst: reg.shotsAgainst + po.shotsAgainst, 
                  saves: reg.saves + po.saves,
                  so: reg.so + po.so
              },
              history: { 
                  gamesPlayed: (stats?.historicalGamesPlayed ?? 0) + reg.gamesPlayed + po.gamesPlayed, 
                  wins: (stats?.historicalWins ?? 0) + reg.wins + po.wins, 
                  shotsAgainst: (stats?.historicalShotsAgainst ?? 0) + reg.shotsAgainst + po.shotsAgainst, 
                  saves: (stats?.historicalSaves ?? 0) + reg.saves + po.saves, 
                  so: (stats?.historicalSO ?? 0) + reg.so + po.so 
              },
              rawHistory: {
                  gamesPlayed: stats?.historicalGamesPlayed ?? 0,
                  wins: stats?.historicalWins ?? 0,
                  shotsAgainst: stats?.historicalShotsAgainst ?? 0,
                  saves: stats?.historicalSaves ?? 0,
                  so: stats?.historicalSO ?? 0
              }
          };
      });
  }, [allUsers, allGoalieStats]);
  
  const sortedTeamScoring = useMemo(() => {
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
  }, [teamScoring, scoringView, isStatEditMode, editableSkaterStats]);

  const sortedGoalieLeaderboard = useMemo(() => {
      if (isStatEditMode) {
          return editableGoalieStats.map((g, i) => {
              const sa = Number(g.shotsAgainst) || 0;
              const s = Number(g.saves) || 0;
              return {
                  ...g,
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
          return {
              ...g, 
              savePercentage: sa > 0 ? (s / sa) * 100 : 0
          }
      })
      .sort((a, b) => (b.savePercentage || 0) - (a.savePercentage || 0) || (Number(b.wins) || 0) - (Number(a.wins) || 0))
      .map((g, i) => ({...g, rank: i + 1}));
  }, [goalieLeaderboard, scoringView, isStatEditMode, editableGoalieStats]);
  
  const attendancesByMatch = useMemo(() => {
      const map = new Map<string, Attendance[]>();
      allAttendances?.forEach(att => { if (!map.has(att.matchId)) map.set(att.matchId, []); map.get(att.matchId)!.push(att); });
      return map;
  }, [allAttendances]);

  const userAttendancesWithOptimistic = useMemo(() => {
      const map = new Map<string, Attendance>();
      if(user && allAttendances) allAttendances.filter(att => att.userId === user.uid).forEach(att => map.set(att.matchId, att));
      optimisticAttendances.forEach((opt, mId) => { if (opt.status !== 'unknown') { const ex = map.get(mId) || { id: user!.uid, userId: user!.uid, matchId: mId }; map.set(mId, { ...ex, ...opt } as Attendance); } else map.delete(mId); });
      return map;
  }, [allAttendances, user, optimisticAttendances]);

  const usersMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u])), [allUsers]);
  
  const isLoading = isUserProfileLoading || isSkaterStatsLoading || isGoalieStatsLoading || areMatchesLoading || areUsersLoading || areSkaterStatsLoading || areGoalieStatsLoading || attendancesLoading || leagueSettingsLoading;

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

  const handleSaveResult = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch || !firestore) return;
    setIsSaving(true);
    try {
        const fd = new FormData(e.currentTarget);
        const t1Score = parseInt(fd.get('team1Score') as string, 10) || 0;
        const t2Score = parseInt(fd.get('team2Score') as string, 10) || 0;
        const goalieId = fd.get('goalieId') as string;
        const goalieSaves = parseInt(fd.get('goalieSaves') as string, 10) || 0;
        const goalieShotsAgainst = parseInt(fd.get('goalieShotsAgainst') as string, 10) || 0;
        
        const scorers: { goal: string, assist: string | null }[] = [];
        for (let i = 0; i < t1Score; i++) {
            const goal = fd.get(`goal-${i}`) as string;
            const assist = fd.get(`assist-${i}`) as string;
            if (goal) {
                scorers.push({ goal, assist: (assist && assist !== 'none') ? assist : null });
            }
        }

        const newMatchData: any = { 
            isPlayed: true, 
            team1Score: t1Score, 
            team2Score: t2Score, 
            scorers,
            goalieId: goalieId !== 'none' ? goalieId : null,
            goalieSaves,
            goalieShotsAgainst
        };

        await updateDoc(doc(firestore, 'matches', selectedMatch.id), newMatchData);
        toast({ title: "Výsledek uložen." });
        setIsResultDialogOpen(false);
    } catch (err: any) { 
        const permissionError = new FirestorePermissionError({
            path: `matches/${selectedMatch.id}`,
            operation: 'update'
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally { 
        setIsSaving(false); 
    }
  };

  const handleSaveStatsManual = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
        const prefix = scoringView === 'history' ? 'historical' : (scoringView === 'regular' ? 'season' : (scoringView === 'playoff' ? 'playoff' : null));
        
        if (!prefix) {
            toast({ variant: 'destructive', title: 'Chyba', description: 'Tuto sekci nelze přímo upravovat.' });
            setIsSaving(false);
            return;
        }

        const goalsKey = `${prefix}Goals`;
        const assistsKey = `${prefix}Assists`;
        const gamesPlayedKey = `${prefix}GamesPlayed`;

        const goalieWinsKey = `${prefix}Wins`;
        const goalieSavesKey = `${prefix}Saves`;
        const goalieShotsAgainstKey = `${prefix}ShotsAgainst`;
        const goalieGamesPlayedKey = `${prefix}GamesPlayed`;
        const goalieSOKey = `${prefix}SO`;

        const updatePromises: Promise<any>[] = [];

        for (const p of editableSkaterStats) {
            if (!p.id) continue;
            updatePromises.push(setDoc(doc(firestore, 'users', p.id, 'skaterStats', 'stats'), { 
                userProfileId: p.id, 
                [goalsKey]: Number(p.goals) || 0, 
                [assistsKey]: Number(p.assists) || 0, 
                [gamesPlayedKey]: Number(p.gamesPlayed) || 0 
            }, { merge: true }));
        }

        for (const g of editableGoalieStats) {
            if (!g.id) continue;
            updatePromises.push(setDoc(doc(firestore, 'users', g.id, 'goalieStats', 'stats'), { 
                userProfileId: g.id, 
                [goalieGamesPlayedKey]: Number(g.gamesPlayed) || 0, 
                [goalieWinsKey]: Number(g.wins) || 0, 
                [goalieSavesKey]: Number(g.saves) || 0, 
                [goalieShotsAgainstKey]: Number(g.shotsAgainst) || 0,
                [goalieSOKey]: Number(g.so) || 0
            }, { merge: true }));
        }

        await Promise.all(updatePromises);
        toast({ title: 'Statistiky úspěšně uloženy' });
        setIsStatEditMode(false);
        setExpandedStatId(null);
    } catch (err: any) { 
        const permissionError = new FirestorePermissionError({
            path: 'users/{userId}/stats',
            operation: 'write'
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally { 
        setIsSaving(false); 
    }
  };

  const handleSaveLeagueStandings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSaving(true);
    try {
        const formData = new FormData(e.currentTarget);
        const teams: LeagueStanding[] = [];
        const entries = Array.from(formData.entries());
        
        const teamGroups = new Map<number, Partial<LeagueStanding>>();
        entries.forEach(([key, value]) => {
            const match = key.match(/^(name|points|gf|ga)-(\d+)$/);
            if (match) {
                const [, field, idx] = match;
                const index = parseInt(idx, 10);
                if (!teamGroups.has(index)) teamGroups.set(index, {});
                const group = teamGroups.get(index)!;
                if (field === 'name') group.name = value as string;
                else if (field === 'points') group.points = Number(value);
                else if (field === 'gf') group.gf = Number(value);
                else if (field === 'ga') group.ga = Number(value);
            }
        });

        teamGroups.forEach((group, idx) => {
            if (group.name) {
                teams.push({
                    id: `team-${idx}`,
                    name: group.name,
                    points: group.points || 0,
                    gf: group.gf || 0,
                    ga: group.ga || 0
                });
            }
        });

        await setDoc(doc(firestore, 'settings', 'league'), { leagueStandings: teams }, { merge: true });
        toast({ title: "Tabulka uložena." });
        setIsLeagueDialogOpen(false);
    } catch (err: any) {
        toast({ variant: 'destructive', title: "Chyba", description: "Nepodařilo se uložit tabulku." });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSavePlayoffSeries = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSaving(true);
    try {
        const formData = new FormData(e.currentTarget);
        const series: PlayoffSeries[] = [];
        const entries = Array.from(formData.entries());
        
        const seriesGroups = new Map<number, Partial<PlayoffSeries>>();
        entries.forEach(([key, value]) => {
            const match = key.match(/^(round|opponent|wins|losses)-(\d+)$/);
            if (match) {
                const [, field, idx] = match;
                const index = parseInt(idx, 10);
                if (!seriesGroups.has(index)) seriesGroups.set(index, {});
                const group = seriesGroups.get(index)!;
                if (field === 'round') group.round = value as any;
                else if (field === 'opponent') group.opponent = value as string;
                else if (field === 'wins') group.wins = Number(value);
                else if (field === 'losses') group.losses = Number(value);
            }
        });

        seriesGroups.forEach((group) => {
            if (group.opponent && group.round) {
                series.push({
                    round: group.round as any,
                    opponent: group.opponent,
                    wins: group.wins || 0,
                    losses: group.losses || 0
                });
            }
        });

        await setDoc(doc(firestore, 'settings', 'league'), { playoffSeries: series }, { merge: true });
        toast({ title: "Play-off série uloženy." });
        setIsPlayoffDialogOpen(false);
    } catch (err: any) {
        toast({ variant: 'destructive', title: "Chyba", description: "Nepodařilo se uložit série." });
    } finally {
        setIsSaving(false);
    }
  };

  const renderMatchCard = (m: Match) => {
    const { prefix, opponent } = getMatchDetails(m);
    const attStatus = userAttendancesWithOptimistic.get(m.id)?.status;
    const goesCount = (attendancesByMatch.get(m.id) || []).filter(a => a.status === 'going').length;
    const isLineupHighlighted = highlightedMatchId === m.id && highlightReason === 'lineup';

    return (
        <Card id={`match-${m.id}`} key={m.id} className={cn("w-full transition-all", highlightedMatchId === m.id && 'animate-highlight-card')}>
            <CardHeader className="flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                    {prefix && <p className="text-xs font-bold text-primary uppercase">{prefix}</p>}
                    <CardTitle className="text-xl sm:text-2xl font-headline">{opponent}</CardTitle>
                    <CardDescription className="font-semibold">{format(m.dateTime.toDate(), "EEEE, d. M. yyyy, HH:mm", { locale: cs })}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleShareMatch(m.id)}><Share2 className="h-4" /></Button>
                    {userProfile?.role === 'admin' && (
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setLineupMatch(m); setIsLineupBuilderOpen(true); }}><FileText className="mr-2 h-4" /> Sestava</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedMatch(m); setIsResultDialogOpen(true); }}><ClipboardEdit className="mr-2 h-4" /> Výsledek</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedMatch(m); setIsEditDialogOpen(true); }}><Pencil className="mr-2 h-4" /> Upravit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedMatch(m); setIsDeleteDialogOpen(true); }} className="text-destructive"><Trash2 className="mr-2 h-4" /> Smazat</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent className="text-sm"><div className="flex items-center gap-2"><MapPin className="h-4 text-primary" />{m.location}</div></CardContent>
            <CardFooter className="flex-col items-start gap-4">
                <div className="flex w-full flex-wrap justify-between gap-3">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant={attStatus === 'going' ? 'default' : 'outline'} size="sm" onClick={() => { setAttendanceData({ matchId: m.id, status: 'going' }); setAttendanceNote(userAttendancesWithOptimistic.get(m.id)?.note || ''); setIsAttendanceDialogOpen(true); }} className={cn('flex-1', attStatus === 'going' && "bg-green-500/10 border-green-500 text-green-600")}><Check className="h-4 mr-2" /> Jdu</Button>
                        <Button variant={attStatus === 'not-going' ? 'destructive' : 'outline'} size="sm" onClick={() => { setAttendanceData({ matchId: m.id, status: 'not-going' }); setAttendanceNote(userAttendancesWithOptimistic.get(m.id)?.note || ''); setIsAttendanceDialogOpen(true); }} className={cn('flex-1', attStatus === 'not-going' && "bg-destructive/10 border-destructive text-destructive")}><X className="h-4 mr-2" /> Nejdu</Button>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {m.lineup && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setViewLineupData(m.lineup!); setIsLineupViewOpen(true); }}
                            className={cn(isLineupHighlighted && "animate-highlight-button border-primary border-2 shadow-primary/50")}
                          >
                            <View className="mr-2 h-4" /> Sestava
                          </Button>
                        )}
                        <Dialog>
                            <DialogTrigger asChild><Button variant="outline" size="sm"><Users className="mr-2 h-4" /> Účast: {goesCount}</Button></DialogTrigger>
                            <DialogContent className="p-0">
                                <DialogHeader className="p-6 pb-0">
                                    <DialogTitle>Účastníci</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-[40vh] overflow-y-auto space-y-2 p-6 pt-2 text-left">
                                    {(attendancesByMatch.get(m.id) || []).map(att => {
                                        const p = usersMap.get(att.userId); if (!p) return null;
                                        return (
                                            <div key={att.userId} className={cn("flex items-center gap-3 p-2 rounded-lg border", att.status === 'going' ? "bg-green-500/5" : "bg-destructive/5")}>
                                                <Avatar className="h-8 w-8"><AvatarImage src={p.photoURL || `https://picsum.photos/seed/${p.email}/80/80`} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                                                <div className="flex-1"><p className="text-sm font-medium">{formatName(p.name)}</p>{att.note && <p className="text-xs text-muted-foreground italic">"{att.note}"</p>}</div>
                                                {att.status === 'going' ? <Check className="h-4 text-green-500" /> : <X className="h-4 text-destructive" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
  }

  if (isLoading || !user) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>

  return (
    <div className="py-8 space-y-8">
      {upcomingBirthdays.length > 0 && (
          <Card className="border-l-4 border-l-accent bg-accent/5"><CardContent className="flex items-center gap-4 py-4"><Cake className="h-6 text-accent" /><div className="flex-1 text-sm"><span className="font-bold">Narozeniny: </span>{upcomingBirthdays.map((u, i) => (<span key={u.id} className="font-medium">{formatName(u.name)} ({format(parseISO(u.dob!), "d. M.")}){i < upcomingBirthdays.length - 1 ? ', ' : ''}</span>))}</div></CardContent></Card>
      )}
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="p-6 text-center flex flex-col items-center">
            <Avatar className="h-24 w-24 mb-4 border-2 border-primary"><AvatarImage src={userProfile?.photoURL || `https://picsum.photos/seed/${userProfile?.email}/200/200`} /><AvatarFallback>{userProfile?.name[0]}</AvatarFallback></Avatar>
            <CardTitle>{userProfile?.name || ''}</CardTitle>
            {userProfile?.jerseyNumber && <p className="text-3xl font-bold text-primary mt-1">#{userProfile.jerseyNumber}</p>}
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart className="text-primary"/>Moje statistiky</CardTitle></CardHeader>
            <CardContent>
                <Tabs value={myStatsView} onValueChange={(v) => setMyStatsView(v as any)}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="regular" className="text-[10px] sm:text-xs">ZČ</TabsTrigger>
                      <TabsTrigger value="playoff" className="text-[10px] sm:text-xs">Play-off</TabsTrigger>
                      <TabsTrigger value="season" className="text-[10px] sm:text-xs">Sezona</TabsTrigger>
                      <TabsTrigger value="history" className="text-[10px] sm:text-xs">Historie</TabsTrigger>
                    </TabsList>
                    <div className="mt-4">
                        <Table>
                            <TableBody>
                                {userProfile?.playerType === 'player' && (
                                    <>
                                        <TableRow><TableCell className="font-medium">Góly</TableCell><TableCell className="text-right font-bold tabular-nums">{String(teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.goals || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Asistence</TableCell><TableCell className="text-right font-bold tabular-nums">{String(teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.assists || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Body</TableCell><TableCell className="text-right font-bold tabular-nums">{String((teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.goals || 0) + (teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.assists || 0))}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Zápasy</TableCell><TableCell className="text-right font-bold tabular-nums">{String(teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.gamesPlayed || 0)}</TableCell></TableRow>
                                    </>
                                )}
                                {userProfile?.playerType === 'goalie' && (
                                    <>
                                        <TableRow><TableCell className="font-medium">Zápasy</TableCell><TableCell className="text-right font-bold tabular-nums">{String(goalieLeaderboard.find(g=>g.id===user.uid)?.[myStatsView]?.gamesPlayed || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Výhry</TableCell><TableCell className="text-right font-bold tabular-nums">{String(goalieLeaderboard.find(g=>g.id===user.uid)?.[myStatsView]?.wins || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Čistá konta (SO)</TableCell><TableCell className="text-right font-bold tabular-nums">{String(goalieLeaderboard.find(g=>g.id===user.uid)?.[myStatsView]?.so || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Úspěšnost</TableCell><TableCell className="text-right font-bold tabular-nums">
                                            {(() => {
                                                const stats = goalieLeaderboard.find(g=>g.id===user.uid)?.[myStatsView];
                                                const sa = Number(stats?.shotsAgainst) || 0;
                                                const s = Number(stats?.saves) || 0;
                                                return sa > 0 ? ((s / sa) * 100).toFixed(2) : '0.00';
                                            })()}%
                                        </TableCell></TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-2 sm:px-0"><h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-primary"/>Příští zápasy</h2>{userProfile?.role === 'admin' && <Button size="sm" onClick={() => setIsAddDialogOpen(true)}><Plus className="h-4 mr-2" />Přidat zápas</Button>}</div>
          {nextMatch ? renderMatchCard(nextMatch) : <p className="text-center py-8 text-muted-foreground">Žádné blížící se zápasy.</p>}
          {(allMatches?.filter(match => !match.isPlayed && match.dateTime.toDate() >= startOfDay(new Date())).slice(1) || []).length > 0 && (
                <Accordion type="single" collapsible className="w-full px-2 sm:px-0" value={openAccordionValue} onValueChange={setOpenAccordionValue}>
                    <AccordionItem value="item-1" className="border-none">
                        <AccordionTrigger className="rounded-lg border px-4 bg-card">Další zápasy</AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-4">{(allMatches?.filter(match => !match.isPlayed && match.dateTime.toDate() >= startOfDay(new Date())).slice(1) || []).map(m => renderMatchCard(m))}</AccordionContent>
                    </AccordionItem>
                </Accordion>
          )}
        </div>

        <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between gap-4 py-4 px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 whitespace-nowrap"><ListOrdered className="text-primary"/>Soutěž</CardTitle>
                {userProfile?.role === 'admin' && (
                    <div className="flex items-center gap-2">
                         <Button size="sm" variant="outline" onClick={() => setIsLeagueDialogOpen(true)} className="h-8 text-[10px] sm:text-xs"><Pencil className="h-3 w-3 mr-1" />Tabulka</Button>
                         <Button size="sm" variant="outline" onClick={() => setIsPlayoffDialogOpen(true)} className="h-8 text-[10px] sm:text-xs"><Pencil className="h-3 w-3 mr-1" />Play-off</Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
                <Tabs defaultValue="standings">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="standings" className="text-xs">Tabulka</TabsTrigger>
                        <TabsTrigger value="playoff" className="text-xs">Play-off série</TabsTrigger>
                    </TabsList>
                    <TabsContent value="standings">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8 px-1">#</TableHead>
                                    <TableHead className="px-2">Tým</TableHead>
                                    <TableHead className="text-center px-1">GF</TableHead>
                                    <TableHead className="text-center px-1">GA</TableHead>
                                    <TableHead className="text-right px-2">B</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(leagueSettings?.leagueStandings || [])
                                    .sort((a,b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga))
                                    .map((team, idx) => (
                                    <TableRow key={team.id} className={cn(team.name.toLowerCase().includes('aces') && 'bg-primary/10 font-bold')}>
                                        <TableCell className="px-1">{idx + 1}.</TableCell>
                                        <TableCell className="px-2">{team.name}</TableCell>
                                        <TableCell className="text-center px-1 tabular-nums">{team.gf}</TableCell>
                                        <TableCell className="text-center px-1 tabular-nums">{team.ga}</TableCell>
                                        <TableCell className="text-right px-2 font-bold tabular-nums">{team.points}</TableCell>
                                    </TableRow>
                                ))}
                                {(!leagueSettings?.leagueStandings || leagueSettings.leagueStandings.length === 0) && (
                                    <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground italic">Tabulka zatím není vyplněna.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="playoff">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {(leagueSettings?.playoffSeries || []).map((series, idx) => (
                                <Card key={idx} className="bg-muted/30">
                                    <CardHeader className="pb-2 p-4">
                                        <p className="text-[10px] font-bold text-primary uppercase">{series.round}</p>
                                        <CardTitle className="text-base text-left">{series.opponent}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium">Stav série</p>
                                            <p className="text-xl font-bold text-primary tabular-nums">{series.wins} : {series.losses}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {(!leagueSettings?.playoffSeries || leagueSettings.playoffSeries.length === 0) && (
                                <div className="col-span-full py-8 text-center text-muted-foreground italic">Play-off série zatím nebyly definovány.</div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>

        <Card className="lg:col-span-3">
            <CardHeader className="py-4 px-4 sm:px-6"><CardTitle className="flex items-center gap-2"><History className="text-primary" />Nedávné výsledky</CardTitle></CardHeader>
            <CardContent className="px-2 sm:px-6">
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {recentPlayedMatches.map(m => {
                        const { prefix, opponent } = getMatchDetails(m);
                        const hasGoals = m.scorers && m.scorers.length > 0;
                        return (
                            <AccordionItem value={m.id} key={m.id} className="border rounded-lg bg-card overflow-hidden shadow-sm hover:border-primary/50 transition-colors">
                                <AccordionTrigger className="hover:no-underline py-4 px-3 sm:px-6 [&>svg]:ml-2">
                                    <div className="flex items-center justify-between w-full text-left gap-2 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{format(m.dateTime.toDate(), "d. M. yyyy")}</p>
                                            {prefix && <p className="text-[9px] font-bold text-primary uppercase truncate">{prefix}</p>}
                                            <p className="font-bold text-sm sm:text-lg truncate">{opponent}</p>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                            <span className="font-bold text-lg sm:text-xl tabular-nums tracking-tighter">{m.team1Score} : {m.team2Score}</span>
                                            <Badge variant={(m.team1Score || 0) > (m.team2Score || 0) ? 'default' : 'destructive'} className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex items-center justify-center shrink-0 rounded-full font-bold">
                                                {(m.team1Score || 0) > (m.team2Score || 0) ? 'V' : 'P'}
                                            </Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-muted/30 px-3 sm:px-6 py-4 sm:py-6 border-t">
                                    <div className="space-y-6">
                                        {hasGoals ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-primary border-b border-primary/20 pb-2">
                                                    <Trophy className="h-4 w-4" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Detaily zápasu: Aces</span>
                                                </div>
                                                <div className="grid gap-3">
                                                    {m.scorers!.map((s, i) => (
                                                        <div key={i} className="flex items-center gap-3 text-xs sm:text-sm group">
                                                            <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 text-primary shrink-0">
                                                                <Disc className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                            </div>
                                                            <div className="flex flex-wrap items-baseline gap-x-2">
                                                                <span className="font-bold text-foreground">{formatName(usersMap.get(s.goal)?.name || 'Neznámý')}</span>
                                                                {s.assist && (
                                                                    <span className="text-muted-foreground text-[10px] sm:text-xs italic">(A: {formatName(usersMap.get(s.assist)?.name || '?')})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-4 text-muted-foreground text-center">
                                                 <Disc className="h-6 w-6 sm:h-8 sm:w-8 opacity-20 mb-2" />
                                                 <p className="text-xs italic">Žádné góly Aces nebyly k tomuto zápasu zaznamenány.</p>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
            <CardFooter className="pt-2 px-4 sm:px-6"><Button variant="link" asChild className="p-0 h-auto font-bold text-primary text-xs"><Link href="/dashboard/history">Zobrazit celou historii</Link></Button></CardFooter>
        </Card>

        <div className="lg:col-span-3 grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader className="flex-row items-center justify-between py-4 px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2"><Flame className="text-primary"/>Bodování</CardTitle>
                    {userProfile?.role === 'admin' && !isStatEditMode && scoringView !== 'season' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { 
                            // Při editaci "Historie" upravujeme rawHistory data (minulé sezóny), ne dynamický součet.
                            const viewKey = scoringView === 'history' ? 'rawHistory' : (scoringView === 'regular' ? 'regular' : 'playoff');
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
                            setIsStatEditMode(true); 
                            setExpandedStatId(null);
                        }}><Pencil className="h-3 w-3 mr-1" />Upravit</Button>
                    )}
                    {isStatEditMode && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => { setIsStatEditMode(false); setExpandedStatId(null); }}>Zrušit</Button>
                            <Button size="sm" className="h-8 text-[10px]" onClick={handleSaveStatsManual}>Uložit</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="px-1 sm:px-6">
                    <Tabs value={scoringView} onValueChange={(v) => { if (!isStatEditMode) setScoringView(v as any); }}>
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="regular" className="text-[10px] px-1">ZČ</TabsTrigger>
                            <TabsTrigger value="playoff" className="text-[10px] px-1">Play-off</TabsTrigger>
                            <TabsTrigger value="season" className="text-[10px] px-1">Sezona</TabsTrigger>
                            <TabsTrigger value="history" className="text-[10px] px-1">Historie</TabsTrigger>
                        </TabsList>
                        {isStatEditMode && (
                            <div className="mb-4 p-2 bg-primary/5 border rounded-lg text-[10px] text-primary text-center font-bold uppercase">
                                {scoringView === 'history' ? 'Upravujete historii (minulé sezóny)' : (scoringView === 'regular' ? 'Upravujete základní část' : 'Upravujete play-off')}
                            </div>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-6 px-1 text-center">#</TableHead>
                                    <TableHead className="px-2">Hráč</TableHead>
                                    <TableHead className="text-center px-1">Z</TableHead>
                                    <TableHead className="text-center px-1">G</TableHead>
                                    <TableHead className="text-center px-1">A</TableHead>
                                    <TableHead className="text-right px-2">B</TableHead>
                                    {isStatEditMode && <TableHead className="w-8 px-1"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedTeamScoring.map(p => (
                                    <React.Fragment key={p.id}>
                                        <TableRow className={cn(p.id === user?.uid && 'bg-primary/5', expandedStatId === p.id && 'bg-muted/50')}>
                                            <TableCell className="px-1 text-center tabular-nums">{String(p.rank || 0)}</TableCell>
                                            <TableCell className="font-medium whitespace-nowrap px-2">{formatName(p.name)}</TableCell>
                                            <TableCell className="text-center px-1 tabular-nums">{String(p.gamesPlayed || 0)}</TableCell>
                                            <TableCell className="text-center px-1 tabular-nums">{String(p.goals || 0)}</TableCell>
                                            <TableCell className="text-center px-1 tabular-nums">{String(p.assists || 0)}</TableCell>
                                            <TableCell className="text-right font-bold px-2 tabular-nums">{String(p.points || 0)}</TableCell>
                                            {isStatEditMode && (
                                                <TableCell className="p-0 text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7"
                                                        onClick={() => setExpandedStatId(expandedStatId === p.id ? null : p.id)}
                                                    >
                                                        <ChevronDown className={cn("h-3 w-3 transition-transform", expandedStatId === p.id && "rotate-180")} />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                        {isStatEditMode && expandedStatId === p.id && (
                                            <TableRow className="bg-muted/30 border-b-2 border-primary/20">
                                                <TableCell colSpan={7} className="p-2 sm:p-4">
                                                    <div className="flex flex-wrap items-center justify-around gap-2 bg-background/50 rounded-lg p-2 border">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Zápasy</Label>
                                                            <StatAdjuster value={String(p.gamesPlayed || 0)} onChange={val => setEditableSkaterStats(cur => cur.map(it => it.id === p.id ? {...it, gamesPlayed: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Góly</Label>
                                                            <StatAdjuster value={String(p.goals || 0)} onChange={val => setEditableSkaterStats(cur => cur.map(it => it.id === p.id ? {...it, goals: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Asistence</Label>
                                                            <StatAdjuster value={String(p.assists || 0)} onChange={val => setEditableSkaterStats(cur => cur.map(it => it.id === p.id ? {...it, assists: val} : it))} />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </Tabs>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex-row items-center justify-between py-4 px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/>Brankáři</CardTitle>
                    {userProfile?.role === 'admin' && !isStatEditMode && scoringView !== 'season' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { 
                            const viewKey = scoringView === 'history' ? 'rawHistory' : (scoringView === 'regular' ? 'regular' : 'playoff');
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
                            setIsStatEditMode(true); 
                            setExpandedStatId(null);
                        }}><Pencil className="h-3 w-3 mr-1" />Upravit</Button>
                    )}
                </CardHeader>
                <CardContent className="px-1 sm:px-6">
                    <Tabs value={scoringView} onValueChange={(v) => { if (!isStatEditMode) setScoringView(v as any); }}>
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="regular" className="text-[10px] px-1">ZČ</TabsTrigger>
                            <TabsTrigger value="playoff" className="text-[10px] px-1">Play-off</TabsTrigger>
                            <TabsTrigger value="season" className="text-[10px] px-1">Sezona</TabsTrigger>
                            <TabsTrigger value="history" className="text-[10px] px-1">Historie</TabsTrigger>
                        </TabsList>
                        {isStatEditMode && (
                            <div className="mb-4 p-2 bg-primary/5 border rounded-lg text-[10px] text-primary text-center font-bold uppercase">
                                {scoringView === 'history' ? 'Upravujete historii (minulé sezóny)' : (scoringView === 'regular' ? 'Upravujete základní část' : 'Upravujete play-off')}
                            </div>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-2">Jméno</TableHead>
                                    <TableHead className="text-center px-1">Z</TableHead>
                                    <TableHead className="text-center px-1">V</TableHead>
                                    <TableHead className="text-center px-1">SO</TableHead>
                                    <TableHead className="text-right px-2">Úspěšnost</TableHead>
                                    {isStatEditMode && <TableHead className="w-8 px-1"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedGoalieLeaderboard.map(g => (
                                    <React.Fragment key={g.id}>
                                        <TableRow className={cn(g.id === user?.uid && 'bg-primary/5', expandedStatId === g.id && 'bg-muted/50')}>
                                            <TableCell className="font-medium whitespace-nowrap px-2">{formatName(g.name)}</TableCell>
                                            <TableCell className="text-center px-1 tabular-nums">{String(g.gamesPlayed || 0)}</TableCell>
                                            <TableCell className="text-center px-1 tabular-nums">{String(g.wins || 0)}</TableCell>
                                            <TableCell className="text-center px-1 tabular-nums">{String(g.so || 0)}</TableCell>
                                            <TableCell className="text-right font-bold px-2 tabular-nums">{String((g.savePercentage || 0).toFixed(2))}%</TableCell>
                                            {isStatEditMode && (
                                                <TableCell className="p-0 text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7"
                                                        onClick={() => setExpandedStatId(expandedStatId === g.id ? null : g.id)}
                                                    >
                                                        <ChevronDown className={cn("h-3 w-3 transition-transform", expandedStatId === g.id && "rotate-180")} />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                        {isStatEditMode && expandedStatId === g.id && (
                                            <TableRow className="bg-muted/30 border-b-2 border-primary/20">
                                                <TableCell colSpan={6} className="p-2 sm:p-4">
                                                    <div className="flex flex-wrap items-center justify-around gap-2 bg-background/50 rounded-lg p-2 border">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Zápasy</Label>
                                                            <StatAdjuster value={String(g.gamesPlayed || 0)} onChange={val => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, gamesPlayed: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Výhry</Label>
                                                            <StatAdjuster value={String(g.wins || 0)} onChange={val => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, wins: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">SO</Label>
                                                            <StatAdjuster value={String(g.so || 0)} onChange={val => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, so: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Zásahy</Label>
                                                            <StatAdjuster value={String(g.saves || 0)} onChange={val => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, saves: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Střely</Label>
                                                            <StatAdjuster value={String(g.shotsAgainst || 0)} onChange={val => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, shotsAgainst: val} : it))} />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat zápas</DialogTitle>
          </DialogHeader>
          <form onSubmit={async e => { 
            e.preventDefault(); 
            if(!firestore) return; 
            setIsSaving(true); 
            try {
                const fd = new FormData(e.currentTarget); 
                const dt = parse(`${fd.get('date')} ${fd.get('time')}`, 'yyyy-MM-dd HH:mm', new Date()); 
                const opponent = fd.get('opponent') as string;
                const mData: any = { 
                    team1: 'Aces', 
                    team2: opponent, 
                    location: fd.get('location'), 
                    dateTime: Timestamp.fromDate(dt), 
                    isPlayed: false, 
                    type: addMatchType 
                };
                if (addMatchType === 'regular') mData.round = Number(fd.get('round')) || null;
                else if (addMatchType === 'playoff') {
                    mData.playoffStage = fd.get('playoffStage');
                    mData.playoffMatchNumber = Number(fd.get('playoffMatchNumber')) || null;
                }
                const matchDoc = await addDoc(collection(firestore, 'matches'), mData); 
                
                const usersSnap = await getDocs(collection(firestore, 'users'));
                const batch = writeBatch(firestore);
                usersSnap.forEach(uDoc => {
                    const notifRef = doc(collection(firestore, 'users', uDoc.id, 'notifications'));
                    batch.set(notifRef, {
                        title: 'Nový zápas naplánován!',
                        message: `Příští zápas: Aces vs ${opponent} (${format(dt, 'd. M. HH:mm')}). Přihlaš se!`,
                        type: 'match_new',
                        createdAt: Timestamp.now(),
                        read: false,
                        matchId: matchDoc.id
                    });
                });
                await batch.commit();

                setIsAddDialogOpen(false); 
                toast({ title: "Zápas přidán a tým upozorněn." }); 
            } catch (err: any) {
                const permissionError = new FirestorePermissionError({
                    path: 'matches',
                    operation: 'create'
                });
                errorEmitter.emit('permission-error', permissionError);
            } finally {
                setIsSaving(false); 
            }
          }}>
            <div className="grid gap-6 py-4 p-1">
              <div className="grid gap-2"><Label>Soupeř</Label><Input name="opponent" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Datum</Label><Input name="date" type="date" required /></div>
                <div className="grid gap-2"><Label>Čas</Label><Input name="time" type="time" defaultValue="18:00" required /></div>
              </div>
              <div className="grid gap-2"><Label>Místo</Label><Input name="location" required /></div>
              <div className="grid gap-2">
                <Label>Typ</Label>
                <Select name="type" required value={addMatchType} onValueChange={(v) => setAddMatchType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Základní část</SelectItem>
                    <SelectItem value="playoff">Play-off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {addMatchType === 'regular' && (
                  <div className="grid gap-2">
                      <Label>Kolo</Label>
                      <Input name="round" type="number" min="1" placeholder="Číslo kola" />
                  </div>
              )}
              {addMatchType === 'playoff' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Fáze</Label>
                        <Select name="playoffStage" required defaultValue="čtvrtfinále">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="čtvrtfinále">Čtvrtfinále</SelectItem>
                                <SelectItem value="semifinále">Semifinále</SelectItem>
                                <SelectItem value="finále">Finále</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Zápas č.</Label>
                        <Input name="playoffMatchNumber" type="number" min="1" placeholder="Pořadí v sérii" />
                    </div>
                  </div>
              )}
            </div>
            <DialogFooter><Button type="submit" disabled={isSaving}>Uložit</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLeagueDialogOpen} onOpenChange={setIsLeagueDialogOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Upravit ligovou tabulku</DialogTitle>
                  <DialogDescription>Aktualizujte statistiky týmů v lize.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveLeagueStandings}>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-0">
                                <div className="col-span-1 text-center font-bold text-muted-foreground pb-2">{i+1}.</div>
                                <div className="col-span-5 space-y-1">
                                    <Label className="text-[9px] uppercase">Název týmu</Label>
                                    <Input name={`name-${i}`} defaultValue={leagueSettings?.leagueStandings?.[i]?.name || ''} placeholder="Tým" className="h-8 text-xs" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[9px] uppercase">GF</Label>
                                    <Input name={`gf-${i}`} type="number" defaultValue={leagueSettings?.leagueStandings?.[i]?.gf || 0} className="h-8 text-xs px-1" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[9px] uppercase">GA</Label>
                                    <Input name={`ga-${i}`} type="number" defaultValue={leagueSettings?.leagueStandings?.[i]?.ga || 0} className="h-8 text-xs px-1" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[9px] uppercase font-bold text-primary">Body</Label>
                                    <Input name={`points-${i}`} type="number" defaultValue={leagueSettings?.leagueStandings?.[i]?.points || 0} className="h-8 text-xs px-1 font-bold border-primary" />
                                </div>
                            </div>
                        ))}
                  </div>
                  <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsLeagueDialogOpen(false)}>Zrušit</Button>
                      <Button type="submit" disabled={isSaving}>Uložit tabulku</Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>

      <Dialog open={isPlayoffDialogOpen} onOpenChange={setIsPlayoffDialogOpen}>
          <DialogContent className="max-w-xl">
              <DialogHeader>
                  <DialogTitle>Upravit play-off série</DialogTitle>
                  <DialogDescription>Nastavte aktuální soupeře a stavy sérií.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSavePlayoffSeries}>
                  <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="grid gap-4 p-4 border rounded-lg bg-muted/20">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Fáze</Label>
                                        <Select name={`round-${i}`} defaultValue={leagueSettings?.playoffSeries?.[i]?.round || 'Čtvrtfinále'}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Čtvrtfinále">Čtvrtfinále</SelectItem>
                                                <SelectItem value="Semifinále">Semifinále</SelectItem>
                                                <SelectItem value="Finále">Finále</SelectItem>
                                                <SelectItem value="Vítěz">Vítěz</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Soupeř</Label>
                                        <Input name={`opponent-${i}`} defaultValue={leagueSettings?.playoffSeries?.[i]?.opponent || ''} placeholder="Název týmu" className="h-8 text-xs" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Výhry Aces</Label>
                                        <Input name={`wins-${i}`} type="number" min="0" defaultValue={leagueSettings?.playoffSeries?.[i]?.wins || 0} className="h-8 text-xs" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Prohry Aces</Label>
                                        <Input name={`losses-${i}`} type="number" min="0" defaultValue={leagueSettings?.playoffSeries?.[i]?.losses || 0} className="h-8 text-xs" />
                                    </div>
                                </div>
                            </div>
                        ))}
                  </div>
                  <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsPlayoffDialogOpen(false)}>Zrušit</Button>
                      <Button type="submit" disabled={isSaving}>Uložit série</Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>

      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
          <DialogContent className="max-w-md">
              {selectedMatch && <RecordResultForm match={selectedMatch} allUsers={allUsers || []} onSave={handleSaveResult} onCancel={() => setIsResultDialogOpen(false)} isSaving={isSaving} />}
          </DialogContent>
      </Dialog>

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
                        setOptimisticAttendances(cur => new Map(cur).set(attendanceData.matchId, { status: attendanceData.status, note: attendanceNote })); 
                        await setDoc(doc(firestore, 'matches', attendanceData.matchId, 'attendees', user.uid), { userId: user.uid, matchId: attendanceData.matchId, status: attendanceData.status, note: attendanceNote }, { merge: true }); 
                        setIsAttendanceDialogOpen(false); 
                    } catch (err: any) {
                        const permissionError = new FirestorePermissionError({
                            path: `matches/${attendanceData.matchId}/attendees/${user.uid}`,
                            operation: 'write'
                        });
                        errorEmitter.emit('permission-error', permissionError);
                    } finally {
                        setIsSaving(false); 
                    }
                  }}>Potvrdit</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isLineupBuilderOpen} onOpenChange={setIsLineupBuilderOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden text-left">
            <DialogHeader className="p-6 pb-0 flex-shrink-0">
                <DialogTitle>Editor sestavy</DialogTitle>
            </DialogHeader>
            {lineupMatch && <LineupBuilder players={allUsers?.filter(u => (attendancesByMatch.get(lineupMatch.id)||[]).some(a => a.userId === u.id && a.status === 'going')) || []} initialData={lineupMatch.lineup} onSave={async l => { 
                if(!lineupMatch || !firestore) return; 
                setIsSaving(true); 
                try {
                    await updateDoc(doc(firestore, 'matches', lineupMatch.id), { lineup: l }); 
                    
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
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden text-left">
            <DialogHeader className="p-6 pb-0 flex-shrink-0">
                <DialogTitle>Zobrazení sestavy</DialogTitle>
            </DialogHeader>
            {viewLineupData && <div className="flex-1 min-h-0 overflow-hidden"><LineupDisplay lineup={viewLineupData} /></div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Smazat zápas?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive" onClick={async () => { 
                    if(!selectedMatch || !firestore) return; 
                    setIsSaving(true); 
                    try { 
                        await deleteDoc(doc(firestore, 'matches', selectedMatch.id)); 
                        toast({ title: "Zápas smazán" }); 
                    } catch (e: any) { 
                        const permissionError = new FirestorePermissionError({
                            path: `matches/${selectedMatch.id}`,
                            operation: 'delete'
                        });
                        errorEmitter.emit('permission-error', permissionError);
                    } finally { 
                        setIsSaving(false); 
                        setIsDeleteDialogOpen(false); 
                        setSelectedMatch(null); 
                    } 
                  }}>Smazat</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Upravit zápas</DialogTitle></DialogHeader>
              {selectedMatch && <form onSubmit={async e => { 
                e.preventDefault(); 
                if(!firestore || !selectedMatch) return; 
                setIsSaving(true); 
                try {
                    const fd = new FormData(e.currentTarget); 
                    const dt = parse(`${fd.get('date')} ${fd.get('time')}`, 'yyyy-MM-dd HH:mm', new Date()); 
                    const upd: any = { team2: fd.get('opponent'), location: fd.get('location'), dateTime: Timestamp.fromDate(dt), type: fd.get('type') };
                    if (upd.type === 'regular') upd.round = Number(fd.get('round')) || null;
                    else if (upd.type === 'playoff') {
                        upd.playoffStage = fd.get('playoffStage');
                        upd.playoffMatchNumber = Number(fd.get('playoffMatchNumber')) || null;
                    }
                    await updateDoc(doc(firestore, 'matches', selectedMatch.id), upd); 
                    setIsEditDialogOpen(false); 
                    toast({ title: "Změny uloženy" }); 
                } catch (err: any) {
                    const permissionError = new FirestorePermissionError({
                        path: `matches/${selectedMatch.id}`,
                        operation: 'update'
                    });
                    errorEmitter.emit('permission-error', permissionError);
                } finally {
                    setIsSaving(false); 
                }
              }}>
                  <div className="grid gap-6 py-4 p-1 text-left">
                      <div className="grid gap-2"><Label>Soupeř</Label><Input name="opponent" defaultValue={selectedMatch.team2} required /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2"><Label>Datum</Label><Input name="date" type="date" defaultValue={format(selectedMatch.dateTime.toDate(), 'yyyy-MM-dd')} required /></div>
                          <div className="grid gap-2"><Label>Čas</Label><Input name="time" type="time" defaultValue={format(selectedMatch.dateTime.toDate(), 'HH:mm')} required /></div>
                      </div>
                      <div className="grid gap-2"><Label>Místo</Label><Input name="location" defaultValue={selectedMatch.location} required /></div>
                      <div className="grid gap-2">
                          <Label>Typ</Label>
                          <Select name="type" required defaultValue={selectedMatch.type}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="regular">Základní část</SelectItem><SelectItem value="playoff">Play-off</SelectItem></SelectContent>
                          </Select>
                      </div>
                      <div className="grid gap-4 border p-3 rounded-lg bg-muted/20">
                        <div className="grid gap-2"><Label>Kolo (Zákl. část)</Label><Input name="round" type="number" defaultValue={selectedMatch.round || ''} placeholder="Číslo kola" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Fáze (Play-off)</Label>
                                <Select name="playoffStage" defaultValue={selectedMatch.playoffStage || 'čtvrtfinále'}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="čtvrtfinále">Čtvrtfinále</SelectItem>
                                        <SelectItem value="semifinále">Semifinále</SelectItem>
                                        <SelectItem value="finále">Finále</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>Zápas č. (Play-off)</Label><Input name="playoffMatchNumber" type="number" defaultValue={selectedMatch.playoffMatchNumber || ''} placeholder="Pořadí v sérii" /></div>
                        </div>
                      </div>
                  </div>
                  <DialogFooter><Button type="submit">Uložit</Button></DialogFooter>
              </form>}
          </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardPage() { return <Suspense fallback={<div className="container py-8 text-center">Načítání...</div>}><DashboardPageContent /></Suspense> }
