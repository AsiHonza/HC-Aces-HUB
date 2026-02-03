'use client'

import React, { Suspense, useState, useMemo, useEffect, useCallback } from 'react'
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
import { Calendar as CalendarIcon, MapPin, Users, Trophy, BarChart, Pencil, Check, X, Flame, Shield, Plus, Minus, Loader2, Trash2, ClipboardEdit, History, Share2, MoreHorizontal, FileText, View, Disc, Cake } from "lucide-react"
import { cn } from '@/lib/utils'
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, collection, collectionGroup, updateDoc, query, Timestamp, addDoc, writeBatch, orderBy, setDoc, increment } from 'firebase/firestore'
import { format, startOfDay, addDays, parseISO, isValid, differenceInDays, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineupBuilder, LineupDisplay, type Lineup } from '@/components/lineup-builder'
import { Badge } from '@/components/ui/badge'

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
  playoffShotsAgainst: number;
  playoffSaves: number;
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

interface AppSettings {
  isPlayoffEnabled: boolean;
  isScoringInPlayoffMode: boolean;
  playoffSeries: any[];
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

function RecordResultForm({ match, allUsers, onSave, onCancel, isSaving }: { match: Match, allUsers: UserProfile[], onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>, onCancel: () => void, isSaving: boolean }) {
    const [goalCount, setGoalCount] = useState(0);
    const skaters = useMemo(() => allUsers.filter(u => u.playerType === 'player'), [allUsers]);
    const goalies = useMemo(() => allUsers.filter(u => u.playerType === 'goalie'), [allUsers]);
    const { prefix, opponent } = getMatchDetails(match);

    return (
        <form onSubmit={onSave}>
             <DialogHeader>
                  <DialogTitle>Zapsat výsledek zápasu</DialogTitle>
                  <DialogDescription>Zadejte konečné skóre a statistiky hráčů.</DialogDescription>
              </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                <div className="text-center">
                    {prefix && <p className="text-xs font-bold text-primary uppercase mb-1">{prefix}</p>}
                    <p className="font-bold text-lg">{opponent}</p>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                    <div className="grid gap-2 text-center">
                        <Label htmlFor="team1Score">Aces</Label>
                        <Input id="team1Score" name="team1Score" type="number" className="text-center text-2xl font-bold h-16" min="0" required onChange={(e) => setGoalCount(parseInt(e.target.value) || 0)} />
                    </div>
                     <div className="grid gap-2 text-center">
                        <Label htmlFor="team2Score">Soupeř</Label>
                        <Input id="team2Score" name="team2Score" type="number" className="text-center text-2xl font-bold h-16" min="0" required />
                    </div>
                </div>
                {goalCount > 0 && <p className="font-medium mt-4">Střelci a asistence (Aces)</p>}
                {Array.from({ length: goalCount }).map((_, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 items-center">
                        <Select name={`goal-${index}`} required>
                            <SelectTrigger><SelectValue placeholder={`Gól ${index + 1}`} /></SelectTrigger>
                            <SelectContent>{skaters.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select name={`assist-${index}`} defaultValue="none">
                            <SelectTrigger><SelectValue placeholder="Asistence" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Žádná</SelectItem>
                                {skaters.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
                <p className="font-medium mt-4">Statistiky brankáře</p>
                <div className="grid grid-cols-2 gap-2 items-center">
                     <Select name="goalieId">
                        <SelectTrigger><SelectValue placeholder="Vyberte brankáře" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Žádný</SelectItem>
                            {goalies.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="grid gap-1"><Label>Střely</Label><Input name="goalieShotsAgainst" type="number" min="0" /></div>
                    <div className="grid gap-1"><Label>Zásahy</Label><Input name="goalieSaves" type="number" min="0" /></div>
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
  const [isLeagueEditMode, setIsLeagueEditMode] = useState(false);
  const [optimisticAttendances, setOptimisticAttendances] = useState<Map<string, Partial<Attendance>>>(new Map());
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ matchId: string; status: 'going' | 'not-going' } | null>(null);
  const [attendanceNote, setAttendanceNote] = useState('');
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [openAccordionValue, setOpenAccordionValue] = useState('');
  const [editableLeagueStandings, setEditableLeagueStandings] = useState<LeagueStanding[]>([]);
  const [myStatsView, setMyStatsView] = useState<'season' | 'playoff' | 'history'>('season');
  const [scoringView, setScoringView] = useState<'season' | 'playoff' | 'history'>('season');
  const [isLineupBuilderOpen, setIsLineupBuilderOpen] = useState(false);
  const [lineupMatch, setLineupMatch] = useState<Match | null>(null);
  const [isLineupViewOpen, setIsLineupViewOpen] = useState(false);
  const [viewLineupData, setViewLineupData] = useState<Lineup | null>(null);
  const [isStatEditMode, setIsStatEditMode] = useState(false);
  const [editableSkaterStats, setEditableSkaterStats] = useState<any[]>([]);
  const [editableGoalieStats, setEditableGoalieStats] = useState<any[]>([]);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

  const skaterStatsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'skaterStats') : null, [firestore, user]);
  const { data: skaterStatsData, isLoading: isSkaterStatsLoading } = useCollection<SkaterStats>(skaterStatsCollectionRef);
  
  const goalieStatsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'goalieStats') : null, [firestore, user]);
  const { data: goalieStatsData, isLoading: isGoalieStatsLoading } = useCollection<GoalieStats>(goalieStatsCollectionRef);
  
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
      const twoWeeksFromNow = addDays(now, 14);
      return allMatches.filter(match => !match.isPlayed && match.dateTime.toDate() >= now && match.dateTime.toDate() <= twoWeeksFromNow);
  }, [allMatches]);

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
  const recentPlayedMatches = useMemo(() => playedMatches.slice(0, 3), [playedMatches]);
  const otherUpcomingMatches = useMemo(() => upcomingMatches?.slice(1) || [], [upcomingMatches]);
  const nextMatch = upcomingMatches?.[0];
    
  const isScoringInPlayoffMode = leagueSettings?.isScoringInPlayoffMode ?? false;
  const leagueStandings = useMemo(() => leagueSettings?.leagueStandings ?? [], [leagueSettings]);

  const myStatsToDisplay = useMemo(() => {
      if (userProfile?.playerType === 'player' && skaterStatsData?.[0]) {
          const stats = skaterStatsData[0];
          switch(myStatsView) {
              case 'playoff': return { goals: stats.playoffGoals, assists: stats.playoffAssists, gamesPlayed: stats.playoffGamesPlayed };
              case 'history': return { goals: stats.historicalGoals, assists: stats.historicalAssists, gamesPlayed: stats.historicalGamesPlayed };
              default: return { goals: stats.seasonGoals, assists: stats.seasonAssists, gamesPlayed: stats.seasonGamesPlayed };
          }
      }
      return { goals: 0, assists: 0, gamesPlayed: 0 };
  }, [myStatsView, skaterStatsData, userProfile]);

  const myGoalieStatsToDisplay = useMemo(() => {
      if (userProfile?.playerType === 'goalie' && goalieStatsData?.[0]) {
          const stats = goalieStatsData[0];
          switch(myStatsView) {
              case 'playoff': return { gamesPlayed: stats.playoffGamesPlayed, wins: stats.playoffWins, savePct: stats.playoffShotsAgainst > 0 ? (stats.playoffSaves / stats.playoffShotsAgainst) * 100 : 0 };
              case 'history': return { gamesPlayed: stats.historicalGamesPlayed, wins: stats.historicalWins, savePct: stats.historicalShotsAgainst > 0 ? (stats.historicalSaves / stats.historicalShotsAgainst) * 100 : 0 };
              default: return { gamesPlayed: stats.seasonGamesPlayed, wins: stats.seasonWins, savePct: stats.seasonShotsAgainst > 0 ? (stats.seasonSaves / stats.seasonShotsAgainst) * 100 : 0 };
          }
      }
      return { gamesPlayed: 0, wins: 0, savePct: 0 };
  }, [myStatsView, goalieStatsData, userProfile]);
  
  const teamScoring = useMemo(() => {
      if (!allUsers || !allSkaterStats) return [];
      const statsMap = new Map<string, SkaterStats>();
      allSkaterStats.forEach(stat => { if (stat.userProfileId) statsMap.set(stat.userProfileId, stat); });
      return allUsers.filter(u => u.playerType === 'player').map(u => {
          const stats = statsMap.get(u.id);
          return {
              id: u.id, name: u.name,
              season: { goals: stats?.seasonGoals ?? 0, assists: stats?.seasonAssists ?? 0, gamesPlayed: stats?.seasonGamesPlayed ?? 0 },
              playoff: { goals: stats?.playoffGoals ?? 0, assists: stats?.playoffAssists ?? 0, gamesPlayed: stats?.playoffGamesPlayed ?? 0 },
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
              id: u.id, name: u.name,
              season: { gamesPlayed: stats?.seasonGamesPlayed ?? 0, wins: stats?.seasonWins ?? 0, shotsAgainst: stats?.seasonShotsAgainst ?? 0, saves: stats?.seasonSaves ?? 0 },
              playoff: { gamesPlayed: stats?.playoffGamesPlayed ?? 0, wins: stats?.playoffWins ?? 0, shotsAgainst: stats?.playoffShotsAgainst ?? 0, saves: stats?.playoffSaves ?? 0 },
              history: { gamesPlayed: stats?.historicalGamesPlayed ?? 0, wins: stats?.historicalWins ?? 0, shotsAgainst: stats?.historicalShotsAgainst ?? 0, saves: stats?.historicalSaves ?? 0 },
          };
      });
  }, [allUsers, allGoalieStats]);
  
  const sortedTeamScoring = useMemo(() => {
      const dataSet = isStatEditMode ? editableSkaterStats : teamScoring.map(p => ({ id: p.id, name: p.name, ...p[scoringView] }));
      const data = dataSet.map(p => ({ ...p, points: (p.goals ?? 0) + (p.assists ?? 0) }));
      return data.sort((a, b) => b.points - a.points || b.goals - a.goals).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [teamScoring, scoringView, isStatEditMode, editableSkaterStats]);

  const sortedGoalieLeaderboard = useMemo(() => {
      const dataSet = isStatEditMode ? editableGoalieStats : goalieLeaderboard.map(g => ({ id: g.id, name: g.name, ...g[scoringView] }));
      const data = dataSet.map(g => ({...g, savePercentage: (g.shotsAgainst ?? 0) > 0 ? ((g.saves ?? 0) / g.shotsAgainst) * 100 : 0}));
      return data.sort((a, b) => b.savePercentage - a.savePercentage || b.wins - a.wins).map((g, i) => ({...g, rank: i + 1}));
  }, [goalieLeaderboard, scoringView, isStatEditMode, editableGoalieStats]);

  const sortedLeagueStandings = useMemo(() => {
      const data = isLeagueEditMode ? editableLeagueStandings : leagueStandings;
      return [...(data || [])].sort((a, b) => b.points - a.points).map((t, i) => ({ ...t, rank: i + 1 }));
  }, [leagueStandings, editableLeagueStandings, isLeagueEditMode]);
  
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
  
  const stats = useMemo(() => userProfile?.playerType === 'player' ? [
      { metric: 'Góly', value: myStatsToDisplay.goals ?? 0 },
      { metric: 'Asistence', value: myStatsToDisplay.assists ?? 0 },
      { metric: 'Body', value: (myStatsToDisplay.goals ?? 0) + (myStatsToDisplay.assists ?? 0) },
      { metric: 'Zápasy', value: myStatsToDisplay.gamesPlayed ?? 0 },
  ] : userProfile?.playerType === 'goalie' ? [
      { metric: 'Zápasy', value: myGoalieStatsToDisplay.gamesPlayed },
      { metric: 'Výhry', value: myGoalieStatsToDisplay.wins },
      { metric: 'Úspěšnost', value: `${myGoalieStatsToDisplay.savePct.toFixed(2)} %` },
  ] : [], [myStatsToDisplay, myGoalieStatsToDisplay, userProfile?.playerType]);

  const isLoading = isUserProfileLoading || isSkaterStatsLoading || isGoalieStatsLoading || areMatchesLoading || areUsersLoading || areSkaterStatsLoading || areGoalieStatsLoading || attendancesLoading || leagueSettingsLoading;

  useEffect(() => {
    if (isLoading) return;
    const mId = searchParams.get('matchId');
    if (!mId) return;
    setTimeout(() => {
        const el = document.getElementById(`match-${mId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMatchId(mId);
            setTimeout(() => { setHighlightedMatchId(null); }, 3000);
        }
    }, 200);
  }, [isLoading, searchParams]);

  const handleShareMatch = (mId: string) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('matchId', mId);
    navigator.clipboard.writeText(url.toString()).then(() => toast({ title: "Zkopírováno" }));
  };

  const handleSaveResult = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch || !firestore) return;
    setIsSaving(true);
    try {
        const fd = new FormData(e.currentTarget);
        const t1Score = parseInt(fd.get('team1Score') as string, 10);
        const t2Score = parseInt(fd.get('team2Score') as string, 10);
        const goalieId = fd.get('goalieId') as string;
        const gId = goalieId !== 'none' ? goalieId : null;
        const gSaves = parseInt(fd.get('goalieSaves') as string, 10) || 0;
        const gShots = parseInt(fd.get('goalieShotsAgainst') as string, 10) || 0;
        const scorers: { goal: string, assist: string | null }[] = [];
        const pStatsMap = new Map<string, { g: number, a: number }>();
        const participants = new Set<string>();
        
        if (selectedMatch.lineup) Object.values(selectedMatch.lineup).forEach(p => { if(p) participants.add(p.id); });
        else (attendancesByMatch.get(selectedMatch.id) || []).forEach(att => { if (att.status === 'going') participants.add(att.userId); });

        for (let i = 0; i < t1Score; i++) {
            const goal = fd.get(`goal-${i}`) as string;
            const assist = fd.get(`assist-${i}`) as string;
            if (goal) {
                scorers.push({ goal, assist: (assist && assist !== 'none') ? assist : null });
                const cur = pStatsMap.get(goal) || { g: 0, a: 0 }; pStatsMap.set(goal, { ...cur, g: cur.g + 1 });
                participants.add(goal);
                if (assist && assist !== 'none') { const ac = pStatsMap.get(assist) || { g: 0, a: 0 }; pStatsMap.set(assist, { ...ac, a: ac.a + 1 }); participants.add(assist); }
            }
        }
        if (gId) participants.add(gId);

        const batch = writeBatch(firestore);
        batch.update(doc(firestore, 'matches', selectedMatch.id), { isPlayed: true, team1Score: t1Score, team2Score: t2Score, scorers, goalieId: gId, goalieSaves: gSaves, goalieShotsAgainst: gShots });
        
        const typePrefix = selectedMatch.type === 'playoff' ? 'playoff' : 'season';
        for (const pid of participants) {
            const p = pStatsMap.get(pid) || { g: 0, a: 0 };
            batch.set(doc(firestore, 'users', pid, 'skaterStats', 'stats'), {
                userProfileId: pid,
                historicalGamesPlayed: increment(1),
                historicalGoals: increment(p.g),
                historicalAssists: increment(p.a),
                [`${typePrefix}GamesPlayed`]: increment(1),
                [`${typePrefix}Goals`]: increment(p.g),
                [`${typePrefix}Assists`]: increment(p.a)
            }, { merge: true });
        }
        if (gId) {
            const win = t1Score > t2Score;
            batch.set(doc(firestore, 'users', gId, 'goalieStats', 'stats'), {
                userProfileId: gId,
                historicalGamesPlayed: increment(1),
                historicalWins: increment(win ? 1 : 0),
                historicalSaves: increment(gSaves),
                historicalShotsAgainst: increment(gShots),
                [`${typePrefix}GamesPlayed`]: increment(1),
                [`${typePrefix}Wins`]: increment(win ? 1 : 0),
                [`${typePrefix}Saves`]: increment(gSaves),
                [`${typePrefix}ShotsAgainst`]: increment(gShots)
            }, { merge: true });
        }
        await batch.commit();
        toast({ title: "Výsledek uložen" });
        setIsResultDialogOpen(false);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Chyba', description: err.message }); }
    finally { setIsSaving(false); }
  };

  const handleSaveStatsManual = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);
        const prefix = scoringView === 'history' ? 'historical' : scoringView;
        editableSkaterStats.forEach(p => { batch.set(doc(firestore, 'users', p.id, 'skaterStats', 'stats'), { userProfileId: p.id, [`${prefix}Goals`]: p.goals, [`${prefix}Assists`]: p.assists, [`${prefix}GamesPlayed`]: p.gamesPlayed }, { merge: true }); });
        editableGoalieStats.forEach(g => { batch.set(doc(firestore, 'users', g.id, 'goalieStats', 'stats'), { userProfileId: g.id, [`${prefix}GamesPlayed`]: g.gamesPlayed, [`${prefix}Wins`]: g.wins, [`${prefix}Saves`]: g.saves, [`${prefix}ShotsAgainst`]: g.shotsAgainst }, { merge: true }); });
        await batch.commit();
        toast({ title: 'Statistiky uloženy' });
        setIsStatEditMode(false);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Chyba' }); }
    finally { setIsSaving(false); }
  };

  if (isLoading || !user) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>

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
                        <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><Users className="mr-2 h-4" /> Účast: {goesCount}</Button></DialogTrigger>
                            <DialogContent><DialogHeader><DialogTitle>Účastníci</DialogTitle></DialogHeader>
                                <div className="max-h-[40vh] overflow-y-auto space-y-2">
                                    {(attendancesByMatch.get(m.id) || []).map(att => {
                                        const p = usersMap.get(att.userId); if (!p) return null;
                                        return (
                                            <div key={att.userId} className={cn("flex items-center gap-3 p-2 rounded-lg border", att.status === 'going' ? "bg-green-500/5" : "bg-destructive/5")}>
                                                <Avatar className="h-8 w-8"><AvatarImage src={p.photoURL || `https://picsum.photos/seed/${p.email}/80/80`} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                                                <div className="flex-1"><p className="text-sm font-medium">{p.name}</p>{att.note && <p className="text-xs text-muted-foreground italic">"{att.note}"</p>}</div>
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

  return (
    <div className="py-8 space-y-8">
      {upcomingBirthdays.length > 0 && (
          <Card className="border-l-4 border-l-accent bg-accent/5"><CardContent className="flex items-center gap-4 py-4"><Cake className="h-6 text-accent" /><div className="flex-1 text-sm"><span className="font-bold">Narozeniny: </span>{upcomingBirthdays.map((u, i) => (<span key={u.id} className="font-medium">{u.name} ({format(parseISO(u.dob!), "d. M.")}){i < upcomingBirthdays.length - 1 ? ', ' : ''}</span>))}</div></CardContent></Card>
      )}
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="p-6 text-center flex flex-col items-center">
            <Avatar className="h-24 w-24 mb-4 border-2 border-primary"><AvatarImage src={userProfile?.photoURL || `https://picsum.photos/seed/${userProfile?.email}/200/200`} /><AvatarFallback>{userProfile?.name[0]}</AvatarFallback></Avatar>
            <CardTitle>{userProfile?.name}</CardTitle>
            {userProfile?.jerseyNumber && <p className="text-3xl font-bold text-primary mt-1">#{userProfile.jerseyNumber}</p>}
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart className="text-primary"/>Moje statistiky</CardTitle></CardHeader>
            <CardContent>
                <Tabs value={myStatsView} onValueChange={(v) => setMyStatsView(v as any)}>
                    <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="season">Sezóna</TabsTrigger><TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger><TabsTrigger value="history">Historie</TabsTrigger></TabsList>
                    <div className="mt-4"><Table><TableBody>{stats.map(s => (<TableRow key={s.metric}><TableCell className="font-medium">{s.metric}</TableCell><TableCell className="text-right font-bold">{s.value}</TableCell></TableRow>))}</TableBody></Table></div>
                </Tabs>
            </CardContent>
        </Card>
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-primary"/>Příští zápasy</h2>{userProfile?.role === 'admin' && <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="h-4 mr-2" />Přidat zápas</Button>}</div>
          {nextMatch ? renderMatchCard(nextMatch) : <p className="text-center py-8 text-muted-foreground">Žádné blížící se zápasy.</p>}
          {otherUpcomingMatches.length > 0 && (
                <Accordion type="single" collapsible className="w-full" value={openAccordionValue} onValueChange={setOpenAccordionValue}>
                    <AccordionItem value="item-1" className="border-none"><AccordionTrigger className="rounded-lg border px-4 bg-card">Další zápasy</AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-4">{otherUpcomingMatches.map(m => renderMatchCard(m))}</AccordionContent>
                    </AccordionItem>
                </Accordion>
          )}
        </div>
        <Card className="lg:col-span-3">
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="text-primary" />Nedávné výsledky</CardTitle></CardHeader>
            <CardContent className="space-y-3">{recentPlayedMatches.map(m => {
                const { prefix, opponent } = getMatchDetails(m);
                return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex-1"><p className="text-[10px] text-muted-foreground uppercase">{format(m.dateTime.toDate(), "d. M.")}</p>{prefix && <p className="text-[9px] font-bold text-primary uppercase">{prefix}</p>}<p className="font-semibold">{opponent}</p></div>
                        <div className="flex items-center gap-3"><span className="font-bold text-lg">{m.team1Score} : {m.team2Score}</span><Badge variant={m.team1Score! > m.team2Score! ? 'default' : 'destructive'}>{m.team1Score! > m.team2Score! ? 'V' : 'P'}</Badge></div>
                    </div>
                )
            })}</CardContent>
            <CardFooter><Button variant="link" asChild><Link href="/dashboard/history">Všechny výsledky</Link></Button></CardFooter>
        </Card>
        <div className="lg:col-span-3 grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Flame className="text-primary"/>Bodování</CardTitle>{userProfile?.role === 'admin' && (isStatEditMode ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setIsStatEditMode(false)}>Zrušit</Button><Button size="sm" onClick={handleSaveStatsManual}>Uložit</Button></div> : <Button size="sm" variant="outline" onClick={() => { setEditableSkaterStats(teamScoring.map(p => ({ ...p[scoringView], id: p.id, name: p.name }))); setIsStatEditMode(true); }}><Pencil className="h-3 mr-2" />Upravit</Button>)}</CardHeader>
                <CardContent><Tabs value={scoringView} onValueChange={(v) => setScoringView(v as any)}>
                    <TabsList className="grid w-full grid-cols-3 mb-4"><TabsTrigger value="season">Sezóna</TabsTrigger><TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger><TabsTrigger value="history">Historie</TabsTrigger></TabsList>
                    <Table><TableHeader><TableRow><TableHead className="w-8">#</TableHead><TableHead>Hráč</TableHead><TableHead className="text-center">Z</TableHead><TableHead className="text-center">G</TableHead><TableHead className="text-center">A</TableHead><TableHead className="text-right">B</TableHead></TableRow></TableHeader>
                        <TableBody>{sortedTeamScoring.map(p => (
                            <TableRow key={p.id} className={p.id === user?.uid ? 'bg-primary/10' : ''}><TableCell>{p.rank}</TableCell><TableCell className="font-medium">{p.name}</TableCell>
                                {isStatEditMode ? (<><TableCell><Input className="h-7 w-12 text-center" type="number" value={p.gamesPlayed} onChange={e => setEditableSkaterStats(cur => cur.map(it => it.id === p.id ? {...it, gamesPlayed: parseInt(e.target.value)||0} : it))} /></TableCell><TableCell><Input className="h-7 w-12 text-center" type="number" value={p.goals} onChange={e => setEditableSkaterStats(cur => cur.map(it => it.id === p.id ? {...it, goals: parseInt(e.target.value)||0} : it))} /></TableCell><TableCell><Input className="h-7 w-12 text-center" type="number" value={p.assists} onChange={e => setEditableSkaterStats(cur => cur.map(it => it.id === p.id ? {...it, assists: parseInt(e.target.value)||0} : it))} /></TableCell></>) : (<><TableCell className="text-center">{p.gamesPlayed}</TableCell><TableCell className="text-center">{p.goals}</TableCell><TableCell className="text-center">{p.assists}</TableCell></>)}
                                <TableCell className="text-right font-bold">{p.points}</TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                </Tabs></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Shield className="text-primary"/>Brankáři</CardTitle>{userProfile?.role === 'admin' && (isStatEditMode ? null : <Button size="sm" variant="outline" onClick={() => { setEditableGoalieStats(goalieLeaderboard.map(g => ({ ...g[scoringView], id: g.id, name: g.name }))); setIsStatEditMode(true); }}><Pencil className="h-3 mr-2" />Upravit</Button>)}</CardHeader>
                <CardContent><Tabs value={scoringView} onValueChange={(v) => setScoringView(v as any)}>
                    <TabsList className="grid w-full grid-cols-3 mb-4"><TabsTrigger value="season">Sezóna</TabsTrigger><TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger><TabsTrigger value="history">Historie</TabsTrigger></TabsList>
                    <Table><TableHeader><TableRow><TableHead>Jméno</TableHead><TableHead className="text-center">Z</TableHead><TableHead className="text-center">V</TableHead><TableHead className="text-right">Úspěšnost</TableHead></TableRow></TableHeader>
                        <TableBody>{sortedGoalieLeaderboard.map(g => (
                            <TableRow key={g.id} className={g.id === user?.uid ? 'bg-primary/10' : ''}><TableCell className="font-medium">{g.name}</TableCell>
                                {isStatEditMode ? (<><TableCell><Input className="h-7 w-12 text-center" type="number" value={g.gamesPlayed} onChange={e => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, gamesPlayed: parseInt(e.target.value)||0} : it))} /></TableCell><TableCell><Input className="h-7 w-12 text-center" type="number" value={g.wins} onChange={e => setEditableGoalieStats(cur => cur.map(it => it.id === g.id ? {...it, wins: parseInt(e.target.value)||0} : it))} /></TableCell></>) : (<><TableCell className="text-center">{g.gamesPlayed}</TableCell><TableCell className="text-center">{g.wins}</TableCell></>)}
                                <TableCell className="text-right font-bold">{g.savePercentage.toFixed(2)}%</TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                </Tabs></CardContent>
            </Card>
        </div>
      </div>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogContent><DialogHeader><DialogTitle>Přidat zápas</DialogTitle></DialogHeader><form onSubmit={async e => { e.preventDefault(); if(!firestore) return; setIsSaving(true); const fd = new FormData(e.currentTarget); const dt = parse(`${fd.get('date')} ${fd.get('time')}`, 'yyyy-MM-dd HH:mm', new Date()); await addDoc(collection(firestore, 'matches'), { team1: 'Aces', team2: fd.get('opponent'), location: fd.get('location'), dateTime: Timestamp.fromDate(dt), isPlayed: false, type: fd.get('type') }); setIsAddDialogOpen(false); setIsSaving(false); toast({ title: "Zápas přidán" }); }}><div className="grid gap-4 py-4"><div className="grid gap-2"><Label>Soupeř</Label><Input name="opponent" required /></div><div className="grid grid-cols-2 gap-2"><div className="grid gap-2"><Label>Datum</Label><Input name="date" type="date" required /></div><div className="grid gap-2"><Label>Čas</Label><Input name="time" type="time" defaultValue="18:00" required /></div></div><div className="grid gap-2"><Label>Místo</Label><Input name="location" required /></div><div className="grid gap-2"><Label>Typ</Label><Select name="type" required defaultValue="regular"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="regular">Základní</SelectItem><SelectItem value="playoff">Play-off</SelectItem></SelectContent></Select></div></div><DialogFooter><Button type="submit">Uložit</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}><DialogContent className="max-w-md">{selectedMatch && <RecordResultForm match={selectedMatch} allUsers={allUsers || []} onSave={handleSaveResult} onCancel={() => setIsResultDialogOpen(false)} isSaving={isSaving} />}</DialogContent></Dialog>
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}><DialogContent><DialogHeader><DialogTitle>Potvrdit účast</DialogTitle></DialogHeader><div className="py-4 space-y-2"><Label>Poznámka (volitelné)</Label><Textarea value={attendanceNote} onChange={e => setAttendanceNote(e.target.value)} placeholder="Např. přijdu později..." /></div><DialogFooter><Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>Zrušit</Button><Button onClick={async () => { if(!attendanceData || !user || !firestore) return; setIsSaving(true); setOptimisticAttendances(cur => new Map(cur).set(attendanceData.matchId, { status: attendanceData.status, note: attendanceNote })); await setDoc(doc(firestore, 'matches', attendanceData.matchId, 'attendees', user.uid), { userId: user.uid, matchId: attendanceData.matchId, status: attendanceData.status, note: attendanceNote }, { merge: true }); setIsAttendanceDialogOpen(false); setIsSaving(false); }}>Potvrdit</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isLineupBuilderOpen} onOpenChange={setIsLineupBuilderOpen}><DialogContent className="max-w-4xl h-[90vh] flex flex-col">{lineupMatch && <LineupBuilder players={allUsers?.filter(u => (attendancesByMatch.get(lineupMatch.id)||[]).some(a => a.userId === u.id && a.status === 'going')) || []} initialData={lineupMatch.lineup} onSave={async l => { if(!lineupMatch || !firestore) return; setIsSaving(true); await updateDoc(doc(firestore, 'matches', lineupMatch.id), { lineup: l }); setIsLineupBuilderOpen(false); setIsSaving(false); toast({ title: "Sestava uložena" }); }} onCancel={() => setIsLineupBuilderOpen(false)} />}</DialogContent></Dialog>
      <Dialog open={isLineupViewOpen} onOpenChange={setIsLineupViewOpen}><DialogContent className="max-w-4xl h-[90vh] flex flex-col">{viewLineupData && <LineupDisplay lineup={viewLineupData} />}</DialogContent></Dialog>
    </div>
  )
}

export default function DashboardPage() { return <Suspense fallback={<div className="container py-8">Načítání...</div>}><DashboardPageContent /></Suspense> }
