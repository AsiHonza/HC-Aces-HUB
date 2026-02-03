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
import { doc, collection, collectionGroup, updateDoc, query, Timestamp, addDoc, orderBy, setDoc, deleteDoc } from 'firebase/firestore'
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
  playoffGamesPlayed: number;
  playoffWins: number;
  playoffSaves: number;
  playoffShotsAgainst: number;
  historicalGamesPlayed: number;
  historicalWins: number;
  historicalShotsAgainst: number;
  historicalSaves: number;
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
            <div className="w-8 text-center font-bold text-sm">{value || '0'}</div>
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

  // League Management States
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
          return {
              id: u.id, name: formatName(u.name),
              regular: { goals: stats?.seasonGoals ?? 0, assists: stats?.seasonAssists ?? 0, gamesPlayed: stats?.seasonGamesPlayed ?? 0 },
              playoff: { goals: stats?.playoffGoals ?? 0, assists: stats?.playoffAssists ?? 0, gamesPlayed: stats?.playoffGamesPlayed ?? 0 },
              season: { 
                  goals: (stats?.seasonGoals ?? 0) + (stats?.playoffGoals ?? 0), 
                  assists: (stats?.seasonAssists ?? 0) + (stats?.playoffAssists ?? 0), 
                  gamesPlayed: (stats?.seasonGamesPlayed ?? 0) + (stats?.playoffGamesPlayed ?? 0) 
              },
              history: { goals: stats?.historicalGoals ?? 0, assists: stats?.historicalAssists ?? 0, gamesPlayed: stats?.historicalGamesPlayed ?? 0 },
          };
      });
  }, [allUsers, allSkaterStats]);

  const goalieLeaderboard = useMemo(() => {
      if (!allUsers || !allGoalieStats) return [];
      const statsMap = new Map<string, GoalieStats>();
      allGoalieStats.forEach(stat => { if (stat.userProfileId) statsMap.set(stat.userProfileId, stat); });
      return allUsers.filter(u => u.playerType === 'goalie').map(u => {
          const stats = statsMap.get(u.id);
          return {
              id: u.id, name: formatName(u.name),
              regular: { gamesPlayed: stats?.seasonGamesPlayed ?? 0, wins: stats?.seasonWins ?? 0, shotsAgainst: stats?.seasonShotsAgainst ?? 0, saves: stats?.seasonSaves ?? 0 },
              playoff: { gamesPlayed: stats?.playoffGamesPlayed ?? 0, wins: stats?.playoffWins ?? 0, shotsAgainst: stats?.playoffShotsAgainst ?? 0, saves: stats?.playoffSaves ?? 0 },
              season: { 
                  gamesPlayed: (stats?.seasonGamesPlayed ?? 0) + (stats?.playoffGamesPlayed ?? 0), 
                  wins: (stats?.seasonWins ?? 0) + (stats?.playoffWins ?? 0), 
                  shotsAgainst: (stats?.seasonShotsAgainst ?? 0) + (stats?.playoffShotsAgainst ?? 0), 
                  saves: (stats?.seasonSaves ?? 0) + (stats?.playoffSaves ?? 0) 
              },
              history: { gamesPlayed: stats?.historicalGamesPlayed ?? 0, wins: stats?.historicalWins ?? 0, shotsAgainst: stats?.historicalShotsAgainst ?? 0, saves: stats?.historicalSaves ?? 0 },
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

      const dataSet = teamScoring.map(p => ({ id: p.id, name: p.name, ...p[scoringView] }));
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

      const dataSet = goalieLeaderboard.map(g => ({ id: g.id, name: g.name, ...g[scoringView] }));
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
    if (!mId) return;
    const timer = setTimeout(() => {
        const el = document.getElementById(`match-${mId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMatchId(mId);
            setTimeout(() => { setHighlightedMatchId(null); }, 3000);
        }
    }, 200);
    return () => clearTimeout(timer);
  }, [isLoading, searchParams]);

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
                [goalieShotsAgainstKey]: Number(g.shotsAgainst) || 0 
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

  // League Standings and Playoff Series Save Logic
  const handleSaveLeagueStandings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSaving(true);
    try {
        const formData = new FormData(e.currentTarget);
        const teams: LeagueStanding[] = [];
        const entries = Array.from(formData.entries());
        
        // Group by index
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
                        {m.lineup && <Button variant="outline" size="sm" onClick={() => { setViewLineupData(m.lineup!); setIsLineupViewOpen(true); }}><View className="mr-2 h-4" /> Sestava</Button>}
                        <Dialog>
                            <DialogTrigger asChild><Button variant="outline" size="sm"><Users className="mr-2 h-4" /> Účast: {goesCount}</Button></DialogTrigger>
                            <DialogContent className="p-0">
                                <DialogHeader className="p-6 pb-0">
                                    <DialogTitle>Účastníci</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-[40vh] overflow-y-auto space-y-2 p-6 pt-2">
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
            <CardTitle>{formatName(userProfile?.name || '')}</CardTitle>
            {userProfile?.jerseyNumber && <p className="text-3xl font-bold text-primary mt-1">#{userProfile.jerseyNumber}</p>}
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart className="text-primary"/>Moje statistiky</CardTitle></CardHeader>
            <CardContent>
                <Tabs value={myStatsView} onValueChange={(v) => setMyStatsView(v as any)}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="regular" className="text-xs sm:text-sm">Základ</TabsTrigger>
                      <TabsTrigger value="playoff" className="text-xs sm:text-sm">P.off</TabsTrigger>
                      <TabsTrigger value="season" className="text-xs sm:text-sm">Sezóna</TabsTrigger>
                      <TabsTrigger value="history" className="text-xs sm:text-sm">Historie</TabsTrigger>
                    </TabsList>
                    <div className="mt-4">
                        <Table>
                            <TableBody>
                                {userProfile?.playerType === 'player' && (
                                    <>
                                        <TableRow><TableCell className="font-medium">Góly</TableCell><TableCell className="text-right font-bold">{String(teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.goals || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Asistence</TableCell><TableCell className="text-right font-bold">{String(teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.assists || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Body</TableCell><TableCell className="text-right font-bold">{String((teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.goals || 0) + (teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.assists || 0))}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Zápasy</TableCell><TableCell className="text-right font-bold">{String(teamScoring.find(p=>p.id===user.uid)?.[myStatsView]?.gamesPlayed || 0)}</TableCell></TableRow>
                                    </>
                                )}
                                {userProfile?.playerType === 'goalie' && (
                                    <>
                                        <TableRow><TableCell className="font-medium">Zápasy</TableCell><TableCell className="text-right font-bold">{String(goalieLeaderboard.find(g=>g.id===user.uid)?.[myStatsView]?.gamesPlayed || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Výhry</TableCell><TableCell className="text-right font-bold">{String(goalieLeaderboard.find(g=>g.id===user.uid)?.[myStatsView]?.wins || 0)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Úspěšnost</TableCell><TableCell className="text-right font-bold">
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
          <div className="flex items-center justify-between"><h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-primary"/>Příští zápasy</h2>{userProfile?.role === 'admin' && <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="h-4 mr-2" />Přidat zápas</Button>}</div>
          {nextMatch ? renderMatchCard(nextMatch) : <p className="text-center py-8 text-muted-foreground">Žádné blížící se zápasy.</p>}
          {(allMatches?.filter(match => !match.isPlayed && match.dateTime.toDate() >= startOfDay(new Date())).slice(1) || []).length > 0 && (
                <Accordion type="single" collapsible className="w-full" value={openAccordionValue} onValueChange={setOpenAccordionValue}>
                    <AccordionItem value="item-1" className="border-none">
                        <AccordionTrigger className="rounded-lg border px-4 bg-card">Další zápasy</AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-4">{(allMatches?.filter(match => !match.isPlayed && match.dateTime.toDate() >= startOfDay(new Date())).slice(1) || []).map(m => renderMatchCard(m))}</AccordionContent>
                    </AccordionItem>
                </Accordion>
          )}
        </div>

        {/* League and Playoff Section */}
        <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><ListOrdered className="text-primary"/>Soutěž</CardTitle>
                {userProfile?.role === 'admin' && (
                    <div className="flex gap-2">
                         <Button size="sm" variant="outline" onClick={() => setIsLeagueDialogOpen(true)}><Pencil className="h-3 mr-2" />Tabulka</Button>
                         <Button size="sm" variant="outline" onClick={() => setIsPlayoffDialogOpen(true)}><Pencil className="h-3 mr-2" />Play-off</Button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="standings">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="standings">Tabulka</TabsTrigger>
                        <TabsTrigger value="playoff">Play-off série</TabsTrigger>
                    </TabsList>
                    <TabsContent value="standings">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8">#</TableHead>
                                    <TableHead>Tým</TableHead>
                                    <TableHead className="text-center">GF</TableHead>
                                    <TableHead className="text-center">GA</TableHead>
                                    <TableHead className="text-right">Body</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(leagueSettings?.leagueStandings || [])
                                    .sort((a,b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga))
                                    .map((team, idx) => (
                                    <TableRow key={team.id} className={cn(team.name.toLowerCase().includes('aces') && 'bg-primary/10 font-bold')}>
                                        <TableCell>{idx + 1}.</TableCell>
                                        <TableCell>{team.name}</TableCell>
                                        <TableCell className="text-center">{team.gf}</TableCell>
                                        <TableCell className="text-center">{team.ga}</TableCell>
                                        <TableCell className="text-right font-bold">{team.points}</TableCell>
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
                                    <CardHeader className="pb-2">
                                        <p className="text-[10px] font-bold text-primary uppercase">{series.round}</p>
                                        <CardTitle className="text-lg">{series.opponent}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">Stav série</p>
                                            <p className="text-2xl font-bold text-primary">{series.wins} : {series.losses}</p>
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
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="text-primary" />Nedávné výsledky</CardTitle></CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {recentPlayedMatches.map(m => {
                        const { prefix, opponent } = getMatchDetails(m);
                        const hasGoals = m.scorers && m.scorers.length > 0;
                        return (
                            <AccordionItem value={m.id} key={m.id} className="border rounded-lg bg-card overflow-hidden shadow-sm hover:border-primary/50 transition-colors">
                                <AccordionTrigger className="hover:no-underline py-4 px-6 [&>svg]:ml-2">
                                    <div className="flex items-center justify-between w-full text-left gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-muted-foreground uppercase leading-tight font-bold tracking-wider">{format(m.dateTime.toDate(), "d. M. yyyy")}</p>
                                            {prefix && <p className="text-[10px] font-bold text-primary uppercase truncate">{prefix}</p>}
                                            <p className="font-bold text-base sm:text-lg truncate">{opponent}</p>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <span className="font-bold text-xl tabular-nums tracking-tighter">{m.team1Score} : {m.team2Score}</span>
                                            <Badge variant={(m.team1Score || 0) > (m.team2Score || 0) ? 'default' : 'destructive'} className="h-8 w-8 p-0 flex items-center justify-center shrink-0 rounded-full font-bold">
                                                {(m.team1Score || 0) > (m.team2Score || 0) ? 'V' : 'P'}
                                            </Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-muted/30 px-6 py-6 border-t">
                                    <div className="space-y-6">
                                        {hasGoals ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-primary border-b border-primary/20 pb-2">
                                                    <Trophy className="h-4 w-4" />
                                                    <span className="text-xs font-bold uppercase tracking-widest">Detaily zápasu: Aces</span>
                                                </div>
                                                <div className="grid gap-3">
                                                    {m.scorers!.map((s, i) => (
                                                        <div key={i} className="flex items-center gap-4 text-sm group">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary shrink-0">
                                                                <Disc className="h-3.5 w-3.5" />
                                                            </div>
                                                            <div className="flex flex-wrap items-baseline gap-x-2">
                                                                <span className="font-bold text-foreground">{formatName(usersMap.get(s.goal)?.name || 'Neznámý')}</span>
                                                                {s.assist && (
                                                                    <span className="text-muted-foreground text-xs italic">(asistence: {formatName(usersMap.get(s.assist)?.name || '?')})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-center">
                                                 <Disc className="h-8 w-8 opacity-20 mb-2" />
                                                 <p className="text-sm italic">Žádné góly Aces nebyly k tomuto zápasu zaznamenány.</p>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
            <CardFooter className="pt-2"><Button variant="link" asChild className="p-0 h-auto font-bold text-primary"><Link href="/dashboard/history">Zobrazit celou historii</Link></Button></CardFooter>
        </Card>

        {/* Scoring Leaderboards */}
        <div className="lg:col-span-3 grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Flame className="text-primary"/>Bodování</CardTitle>
                    {userProfile?.role === 'admin' && !isStatEditMode && scoringView !== 'season' && (
                        <Button size="sm" variant="outline" onClick={() => { 
                            const initialEditData = sortedTeamScoring.map(p => ({ 
                                ...p,
                                goals: String(p.goals || 0),
                                assists: String(p.assists || 0),
                                gamesPlayed: String(p.gamesPlayed || 0)
                            }));
                            setEditableSkaterStats(initialEditData); 
                            setIsStatEditMode(true); 
                            setExpandedStatId(null);
                        }}><Pencil className="h-3 mr-2" />Upravit</Button>
                    )}
                    {isStatEditMode && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setIsStatEditMode(false); setExpandedStatId(null); }}>Zrušit</Button>
                            <Button size="sm" onClick={handleSaveStatsManual}>Uložit</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Tabs value={scoringView} onValueChange={(v) => { if (!isStatEditMode) setScoringView(v as any); }}>
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="regular" className="text-xs">Základ</TabsTrigger>
                            <TabsTrigger value="playoff" className="text-xs">P.off</TabsTrigger>
                            <TabsTrigger value="season" className="text-xs">Sezóna</TabsTrigger>
                            <TabsTrigger value="history" className="text-xs">Historie</TabsTrigger>
                        </TabsList>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8">#</TableHead>
                                    <TableHead>Hráč</TableHead>
                                    <TableHead className="text-center">Z</TableHead>
                                    <TableHead className="text-center">G</TableHead>
                                    <TableHead className="text-center">A</TableHead>
                                    <TableHead className="text-right">B</TableHead>
                                    {isStatEditMode && <TableHead className="w-10"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedTeamScoring.map(p => (
                                    <React.Fragment key={p.id}>
                                        <TableRow className={cn(p.id === user?.uid && 'bg-primary/5', expandedStatId === p.id && 'bg-muted/50')}>
                                            <TableCell>{String(p.rank || 0)}</TableCell>
                                            <TableCell className="font-medium whitespace-nowrap">{formatName(p.name)}</TableCell>
                                            <TableCell className="text-center">{String(p.gamesPlayed || 0)}</TableCell>
                                            <TableCell className="text-center">{String(p.goals || 0)}</TableCell>
                                            <TableCell className="text-center">{String(p.assists || 0)}</TableCell>
                                            <TableCell className="text-right font-bold">{String(p.points || 0)}</TableCell>
                                            {isStatEditMode && (
                                                <TableCell className="p-0 text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8"
                                                        onClick={() => setExpandedStatId(expandedStatId === p.id ? null : p.id)}
                                                    >
                                                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedStatId === p.id && "rotate-180")} />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                        {isStatEditMode && expandedStatId === p.id && (
                                            <TableRow className="bg-muted/30 border-b-2 border-primary/20">
                                                <TableCell colSpan={7} className="p-4">
                                                    <div className="flex flex-wrap items-center justify-around gap-4 bg-background/50 rounded-lg p-3 border">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Zápasy</Label>
                                                            <StatAdjuster value={String(p.gamesPlayed || 0)} onChange={val => setEditableSkaterStats(cur => cur.map(it => it.id === p.id ? {...it, gamesPlayed: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Góly</Label>
                                                            <StatAdjuster value={String(p.goals || 0)} onChange={val => setEditableSkaterStats(cur => cur.map(it => it.id === p.id ? {...it, goals: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Asistence</Label>
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
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/>Brankáři</CardTitle>
                    {userProfile?.role === 'admin' && !isStatEditMode && scoringView !== 'season' && (
                        <Button size="sm" variant="outline" onClick={() => { 
                            const initialEditData = sortedGoalieLeaderboard.map(g => ({ 
                                ...g,
                                gamesPlayed: String(g.gamesPlayed || 0),
                                wins: String(g.wins || 0),
                                saves: String(g.saves || 0),
                                shotsAgainst: String(g.shotsAgainst || 0)
                            }));
                            setEditableGoalieStats(initialEditData); 
                            setIsStatEditMode(true); 
                            setExpandedStatId(null);
                        }}><Pencil className="h-3 mr-2" />Upravit</Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Tabs value={scoringView} onValueChange={(v) => { if (!isStatEditMode) setScoringView(v as any); }}>
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="regular" className="text-xs">Základ</TabsTrigger>
                            <TabsTrigger value="playoff" className="text-xs">P.off</TabsTrigger>
                            <TabsTrigger value="season" className="text-xs">Sezóna</TabsTrigger>
                            <TabsTrigger value="history" className="text-xs">Historie</TabsTrigger>
                        </TabsList>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Jméno</TableHead>
                                    <TableHead className="text-center">Z</TableHead>
                                    <TableHead className="text-center">V</TableHead>
                                    <TableHead className="text-right">Úspěšnost</TableHead>
                                    {isStatEditMode && <TableHead className="w-10"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedGoalieLeaderboard.map(g => (
                                    <React.Fragment key={g.id}>
                                        <TableRow className={cn(g.id === user?.uid && 'bg-primary/5', expandedStatId === g.id && 'bg-muted/50')}>
                                            <TableCell className="font-medium whitespace-nowrap">{formatName(g.name)}</TableCell>
                                            <TableCell className="text-center">{String(g.gamesPlayed || 0)}</TableCell>
                                            <TableCell className="text-center">{String(g.wins || 0)}</TableCell>
                                            <TableCell className="text-right font-bold">{String((g.savePercentage || 0).toFixed(2))}%</TableCell>
                                            {isStatEditMode && (
                                                <TableCell className="p-0 text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8"
                                                        onClick={() => setExpandedStatId(expandedStatId === g.id ? null : g.id)}
                                                    >
                                                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedStatId === g.id && "rotate-180")} />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                        {isStatEditMode && expandedStatId === g.id && (
                                            <TableRow className="bg-muted/30 border-b-2 border-primary/20">
                                                <TableCell colSpan={5} className="p-4">
                                                    <div className="flex flex-wrap items-center justify-around gap-4 bg-background/50 rounded-lg p-3 border">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Zápasy</Label>
                                                            <StatAdjuster value={String(g.gamesPlayed || 0)} onChange={val => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, gamesPlayed: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Výhry</Label>
                                                            <StatAdjuster value={String(g.wins || 0)} onChange={val => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, wins: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Zásahy</Label>
                                                            <StatAdjuster value={String(g.saves || 0)} onChange={val => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, saves: val} : it))} />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Střely</Label>
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
      
      {/* Existing Dialogs (Matches, Results, Attendance, Lineup) */}
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
                const mData: any = { 
                    team1: 'Aces', 
                    team2: fd.get('opponent'), 
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
                await addDoc(collection(firestore, 'matches'), mData); 
                setIsAddDialogOpen(false); 
                toast({ title: "Zápas přidán" }); 
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

      {/* League Standing Edit Dialog */}
      <Dialog open={isLeagueDialogOpen} onOpenChange={setIsLeagueDialogOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Upravit ligovou tabulku</DialogTitle>
                  <DialogDescription>Aktualizujte statistiky týmů v lize.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveLeagueStandings}>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4 p-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-0">
                                <div className="col-span-1 text-center font-bold text-muted-foreground pb-2">{i+1}.</div>
                                <div className="col-span-5 space-y-1">
                                    <Label className="text-[10px] uppercase">Název týmu</Label>
                                    <Input name={`name-${i}`} defaultValue={leagueSettings?.leagueStandings?.[i]?.name || ''} placeholder="Tým" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase">GF</Label>
                                    <Input name={`gf-${i}`} type="number" defaultValue={leagueSettings?.leagueStandings?.[i]?.gf || 0} />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase">GA</Label>
                                    <Input name={`ga-${i}`} type="number" defaultValue={leagueSettings?.leagueStandings?.[i]?.ga || 0} />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-primary">Body</Label>
                                    <Input name={`points-${i}`} type="number" defaultValue={leagueSettings?.leagueStandings?.[i]?.points || 0} className="font-bold border-primary" />
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

      {/* Playoff Series Edit Dialog */}
      <Dialog open={isPlayoffDialogOpen} onOpenChange={setIsPlayoffDialogOpen}>
          <DialogContent className="max-w-xl">
              <DialogHeader>
                  <DialogTitle>Upravit play-off série</DialogTitle>
                  <DialogDescription>Nastavte aktuální soupeře a stavy sérií.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSavePlayoffSeries}>
                  <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4 p-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="grid gap-4 p-4 border rounded-lg bg-muted/20">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase">Fáze</Label>
                                        <Select name={`round-${i}`} defaultValue={leagueSettings?.playoffSeries?.[i]?.round || 'Čtvrtfinále'}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Čtvrtfinále">Čtvrtfinále</SelectItem>
                                                <SelectItem value="Semifinále">Semifinále</SelectItem>
                                                <SelectItem value="Finále">Finále</SelectItem>
                                                <SelectItem value="Vítěz">Vítěz</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase">Soupeř</Label>
                                        <Input name={`opponent-${i}`} defaultValue={leagueSettings?.playoffSeries?.[i]?.opponent || ''} placeholder="Název týmu" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase">Výhry Aces</Label>
                                        <Input name={`wins-${i}`} type="number" min="0" defaultValue={leagueSettings?.playoffSeries?.[i]?.wins || 0} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase">Prohry Aces</Label>
                                        <Input name={`losses-${i}`} type="number" min="0" defaultValue={leagueSettings?.playoffSeries?.[i]?.losses || 0} />
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

      {/* Existing Match Result, Attendance, Lineup Dialogs */}
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
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Editor sestavy</DialogTitle>
            </DialogHeader>
            {lineupMatch && <LineupBuilder players={allUsers?.filter(u => (attendancesByMatch.get(lineupMatch.id)||[]).some(a => a.userId === u.id && a.status === 'going')) || []} initialData={lineupMatch.lineup} onSave={async l => { 
                if(!lineupMatch || !firestore) return; 
                setIsSaving(true); 
                try {
                    await updateDoc(doc(firestore, 'matches', lineupMatch.id), { lineup: l }); 
                    setIsLineupBuilderOpen(false); 
                    toast({ title: "Sestava uložena" }); 
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
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Zobrazení sestavy</DialogTitle>
            </DialogHeader>
            {viewLineupData && <LineupDisplay lineup={viewLineupData} />}
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
                  <div className="grid gap-6 py-4 p-1">
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

export default function DashboardPage() { return <Suspense fallback={<div className="container py-8">Načítání...</div>}><DashboardPageContent /></Suspense> }
