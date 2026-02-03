'use client'

import React, { Suspense, useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
import { Switch } from "@/components/ui/switch"
import { LineupBuilder, LineupDisplay, type Lineup } from '@/components/lineup-builder'
import { Badge } from '@/components/ui/badge'

// Types based on backend.json
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

interface PlayoffSeries {
  round: 'Čtvrtfinále' | 'Semifinále' | 'Finále' | 'Vítěz';
  opponent: string;
  wins: number;
  losses: number;
}

interface LeagueStanding {
    id: string;
    rank?: number;
    name: string;
    points: number;
    gf: number;
    ga: number;
}

interface AppSettings {
  isPlayoffEnabled: boolean;
  isScoringInPlayoffMode: boolean;
  playoffSeries: PlayoffSeries[];
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
    return { 
        prefix, 
        opponent, 
        fullTitle: prefix ? `[${prefix}] ${opponent}` : opponent 
    };
}

function RecordResultForm({ match, allUsers, onSave, onCancel, isSaving }: { match: Match, allUsers: UserProfile[], onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>, onCancel: () => void, isSaving: boolean }) {
    const [goalCount, setGoalCount] = useState(0);
    const [selectedScorers, setSelectedScorers] = useState<Record<number, string | null>>({});

    const skaters = useMemo(() => allUsers.filter(u => u.playerType === 'player'), [allUsers]);
    const goalies = useMemo(() => allUsers.filter(u => u.playerType === 'goalie'), [allUsers]);

    const handleScorerChange = (index: number, scorerId: string) => {
        setSelectedScorers(prev => ({ ...prev, [index]: scorerId }));
    };
    
    const { prefix, opponent } = getMatchDetails(match);

    return (
        <form onSubmit={onSave}>
             <DialogHeader>
                  <DialogTitle>Zapsat výsledek zápasu</DialogTitle>
                  <DialogDescription>
                    Zadejte konečné skóre a statistiky hráčů. Účastníkům bude automaticky přičten odehraný zápas.
                  </DialogDescription>
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
                        <Select name={`goal-${index}`} required onValueChange={(value) => handleScorerChange(index, value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={`Gól ${index + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {skaters.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select name={`assist-${index}`} defaultValue="none">
                            <SelectTrigger>
                                <SelectValue placeholder="Asistence" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Žádná</SelectItem>
                                {skaters.filter(u => u.id !== selectedScorers[index]).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
                <p className="font-medium mt-4">Statistiky brankáře</p>
                <div className="grid grid-cols-2 gap-2 items-center">
                     <Select name="goalieId">
                        <SelectTrigger>
                            <SelectValue placeholder="Vyberte brankáře" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Žádný</SelectItem>
                            {goalies.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="grid gap-1">
                        <Label htmlFor="goalieShotsAgainst">Střely</Label>
                        <Input id="goalieShotsAgainst" name="goalieShotsAgainst" type="number" min="0" placeholder="Počet střel na bránu" />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="goalieSaves">Zásahy</Label>
                        <Input id="goalieSaves" name="goalieSaves" type="number" min="0" placeholder="Počet zásahů" />
                    </div>
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

  const [addMatchType, setAddMatchType] = useState<Match['type']>('regular');
  const [editMatchType, setEditMatchType] = useState<Match['type']>('regular');

  const [isSaving, setIsSaving] = useState(false);

  const [isLeagueEditMode, setIsLeagueEditMode] = useState(false);
  
  const [optimisticAttendances, setOptimisticAttendances] = useState<Map<string, Partial<Attendance>>>(new Map());
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ matchId: string; status: 'going' | 'not-going' } | null>(null);
  const [attendanceNote, setAttendanceNote] = useState('');
  
  const upcomingMatchesRef = useRef<HTMLDivElement>(null);
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [openAccordionValue, setOpenAccordionValue] = useState('');

  const [leagueView, setLeagueView] = useState<'regular' | 'playoff'>('regular');
  const [editablePlayoffSeries, setEditablePlayoffSeries] = useState<PlayoffSeries[]>([]);
  const [editableLeagueStandings, setEditableLeagueStandings] = useState<LeagueStanding[]>([]);
  const [editableIsPlayoffEnabled, setEditableIsPlayoffEnabled] = useState(false);

  const [myStatsView, setMyStatsView] = useState<'season' | 'playoff' | 'history'>('season');
  const [scoringView, setScoringView] = useState<'season' | 'playoff' | 'history'>('season');

  const [isLineupBuilderOpen, setIsLineupBuilderOpen] = useState(false);
  const [lineupMatch, setLineupMatch] = useState<Match | null>(null);

  const [isLineupViewOpen, setIsLineupViewOpen] = useState(false);
  const [viewLineupData, setViewLineupData] = useState<Lineup | null>(null);

  const [isStatEditMode, setIsStatEditMode] = useState(false);
  const [editableSkaterStats, setEditableSkaterStats] = useState<any[]>([]);
  const [editableGoalieStats, setEditableGoalieStats] = useState<any[]>([]);
  const [playersForMatch, setPlayersForMatch] = useState<UserProfile[] | null>(null);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

  const skaterStatsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'skaterStats') : null, [firestore, user]);
  const { data: skaterStatsData, isLoading: isSkaterStatsLoading } = useCollection<SkaterStats>(skaterStatsCollectionRef);
  
  const goalieStatsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'goalieStats') : null, [firestore, user]);
  const { data: goalieStatsData, isLoading: isGoalieStatsLoading } = useCollection<GoalieStats>(goalieStatsCollectionRef);
  
  const matchesQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'matches'), orderBy('dateTime', 'asc'));
  }, [firestore, user]);
  const { data: allMatches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);
  
  const usersRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'users'): null, [firestore, user]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersRef);

  const allSkaterStatsRef = useMemoFirebase(() => firestore && user ? collectionGroup(firestore, 'skaterStats'): null, [firestore, user]);
  const { data: allSkaterStats, isLoading: areSkaterStatsLoading } = useCollection<SkaterStats>(allSkaterStatsRef);

  const allGoalieStatsRef = useMemoFirebase(() => firestore && user ? collectionGroup(firestore, 'goalieStats'): null, [firestore, user]);
  const { data: allGoalieStats, isLoading: areGoalieStatsLoading } = useCollection<GoalieStats>(allGoalieStatsRef);

    const attendancesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collectionGroup(firestore, 'attendees'));
    }, [firestore, user]);
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
            const currentYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
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
    
    const isPlayoffEnabled = leagueSettings?.isPlayoffEnabled ?? false;
    const isScoringInPlayoffMode = leagueSettings?.isScoringInPlayoffMode ?? false;
    const playoffSeries = leagueSettings?.playoffSeries ?? [];
    const leagueStandings = useMemo(() => leagueSettings?.leagueStandings ?? [], [leagueSettings]);

    const myStatsToDisplay = useMemo(() => {
        if (userProfile?.playerType === 'player' && skaterStatsData?.[0]) {
            const stats = skaterStatsData[0];
            switch(myStatsView) {
                case 'playoff': return { goals: stats.playoffGoals, assists: stats.playoffAssists, gamesPlayed: stats.playoffGamesPlayed };
                case 'history': return { goals: stats.historicalGoals, assists: stats.historicalAssists, gamesPlayed: stats.historicalGamesPlayed };
                case 'season':
                default:
                    return { goals: stats.seasonGoals, assists: stats.seasonAssists, gamesPlayed: stats.seasonGamesPlayed };
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
                case 'season':
                default:
                    return { gamesPlayed: stats.seasonGamesPlayed, wins: stats.seasonWins, savePct: stats.seasonShotsAgainst > 0 ? (stats.seasonSaves / stats.seasonShotsAgainst) * 100 : 0 };
            }
        }
        return { gamesPlayed: 0, wins: 0, savePct: 0 };
    }, [myStatsView, goalieStatsData, userProfile]);
  
    const teamScoring = useMemo(() => {
        if (!allUsers || !allSkaterStats) return [];
        const statsMap = new Map<string, SkaterStats>();
        allSkaterStats.forEach(stat => {
            if (stat.userProfileId) statsMap.set(stat.userProfileId, stat);
        });
        return allUsers.filter(u => u.playerType === 'player').map(u => {
            const stats = statsMap.get(u.id);
            return {
                id: u.id, name: u.name,
                season: { goals: stats?.seasonGoals ?? 0, assists: stats?.seasonAssists ?? 0, gamesPlayed: stats?.seasonGamesPlayed ?? 0, points: (stats?.seasonGoals ?? 0) + (stats?.seasonAssists ?? 0) },
                playoff: { goals: stats?.playoffGoals ?? 0, assists: stats?.playoffAssists ?? 0, gamesPlayed: stats?.playoffGamesPlayed ?? 0, points: (stats?.playoffGoals ?? 0) + (stats?.playoffAssists ?? 0) },
                history: { goals: stats?.historicalGoals ?? 0, assists: stats?.historicalAssists ?? 0, gamesPlayed: stats?.historicalGamesPlayed ?? 0, points: (stats?.historicalGoals ?? 0) + (stats?.historicalAssists ?? 0) },
            };
        });
    }, [allUsers, allSkaterStats]);

    const goalieLeaderboard = useMemo(() => {
        if (!allUsers || !allGoalieStats) return [];
        const statsMap = new Map<string, GoalieStats>();
        allGoalieStats.forEach(stat => {
            if (stat.userProfileId) statsMap.set(stat.userProfileId, stat);
        });
        return allUsers.filter(u => u.playerType === 'goalie').map(u => {
            const stats = statsMap.get(u.id);
            const seasonSavePct = (stats?.seasonShotsAgainst ?? 0) > 0 ? ((stats?.seasonSaves ?? 0) / stats!.seasonShotsAgainst) * 100 : 0;
            const playoffSavePct = (stats?.playoffShotsAgainst ?? 0) > 0 ? ((stats?.playoffSaves ?? 0) / stats!.playoffShotsAgainst) * 100 : 0;
            const historicalSavePct = (stats?.historicalShotsAgainst ?? 0) > 0 ? ((stats?.historicalSaves ?? 0) / stats!.historicalShotsAgainst) * 100 : 0;
            return {
                id: u.id, name: u.name,
                season: { gamesPlayed: stats?.seasonGamesPlayed ?? 0, wins: stats?.seasonWins ?? 0, shotsAgainst: stats?.seasonShotsAgainst ?? 0, saves: stats?.seasonSaves ?? 0, savePercentage: seasonSavePct },
                playoff: { gamesPlayed: stats?.playoffGamesPlayed ?? 0, wins: stats?.playoffWins ?? 0, shotsAgainst: stats?.playoffShotsAgainst ?? 0, saves: stats?.playoffSaves ?? 0, savePercentage: playoffSavePct },
                history: { gamesPlayed: stats?.historicalGamesPlayed ?? 0, wins: stats?.historicalWins ?? 0, shotsAgainst: stats?.historicalShotsAgainst ?? 0, saves: stats?.historicalSaves ?? 0, savePercentage: historicalSavePct },
            };
        });
    }, [allUsers, allGoalieStats]);
  
    const sortedTeamScoring = useMemo(() => {
        const dataSet = isStatEditMode ? editableSkaterStats : teamScoring.map(player => ({ id: player.id, name: player.name, ...player[scoringView] }));
        const data = dataSet.map(p => ({ ...p, points: (p.goals ?? 0) + (p.assists ?? 0) }));
        return data.sort((a, b) => b.points - a.points || b.goals - a.goals).map((player, index) => ({ ...player, rank: index + 1 }));
    }, [teamScoring, scoringView, isStatEditMode, editableSkaterStats]);

    const sortedGoalieLeaderboard = useMemo(() => {
        const dataSet = isStatEditMode ? editableGoalieStats : goalieLeaderboard.map(goalie => ({ id: goalie.id, name: goalie.name, ...goalie[scoringView] }));
        const data = dataSet.map(g => ({...g, savePercentage: (g.shotsAgainst ?? 0) > 0 ? ((g.saves ?? 0) / g.shotsAgainst) * 100 : 0}));
        return data.sort((a, b) => b.savePercentage - a.savePercentage || b.wins - a.wins).map((goalie, index) => ({...goalie, rank: index + 1}));
    }, [goalieLeaderboard, scoringView, isStatEditMode, editableGoalieStats]);

    const sortedLeagueStandings = useMemo(() => {
        const data = isLeagueEditMode ? editableLeagueStandings : leagueStandings;
        if (!data) return [];
        return [...data].sort((a, b) => b.points - a.points).map((team, index) => ({ ...team, rank: index + 1 }));
    }, [leagueStandings, editableLeagueStandings, isLeagueEditMode]);
  
    const attendancesByMatch = useMemo(() => {
        const map = new Map<string, Attendance[]>();
        allAttendances?.forEach(att => {
            if (!map.has(att.matchId)) map.set(att.matchId, []);
            map.get(att.matchId)!.push(att);
        });
        return map;
    }, [allAttendances]);

    const userAttendances = useMemo(() => {
        const map = new Map<string, Attendance>();
        if(user && allAttendances) allAttendances.filter(att => att.userId === user.uid).forEach(att => map.set(att.matchId, att));
        return map;
    }, [allAttendances, user]);

    const userAttendancesWithOptimistic = useMemo(() => {
        const map = new Map(userAttendances);
        optimisticAttendances.forEach((optimisticAtt, matchId) => {
            if (optimisticAtt.status === 'unknown') map.delete(matchId);
            else {
                const existingAtt = map.get(matchId) || { id: user!.uid, userId: user!.uid, matchId: matchId };
                map.set(matchId, { ...existingAtt, ...optimisticAtt } as Attendance);
            }
        });
        return map;
    }, [userAttendances, optimisticAttendances, user]);

    const usersMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u])), [allUsers]);
  
    const stats = useMemo(() => userProfile?.playerType === 'player' ? [
        { metric: 'Góly', value: myStatsToDisplay.goals ?? 0 },
        { metric: 'Asistence', value: myStatsToDisplay.assists ?? 0 },
        { metric: 'Body', value: (myStatsToDisplay.goals ?? 0) + (myStatsToDisplay.assists ?? 0) },
        { metric: 'Odehrané zápasy', value: myStatsToDisplay.gamesPlayed ?? 0 },
    ] : userProfile?.playerType === 'goalie' ? [
        { metric: 'Zápasy', value: myGoalieStatsToDisplay.gamesPlayed },
        { metric: 'Výhry', value: myGoalieStatsToDisplay.wins },
        { metric: 'Úspěšnost', value: `${myGoalieStatsToDisplay.savePct.toFixed(2)} %` },
    ] : [], [myStatsToDisplay, myGoalieStatsToDisplay, userProfile?.playerType]);
  

    const isLoading = isUserProfileLoading || isSkaterStatsLoading || isGoalieStatsLoading || areMatchesLoading || areUsersLoading || areSkaterStatsLoading || areGoalieStatsLoading || attendancesLoading || leagueSettingsLoading;

    const getResultBadgeVariant = (acesScore?: number, opponentScore?: number) => {
        if (acesScore === undefined || opponentScore === undefined) return 'secondary';
        if (acesScore > opponentScore) return 'default';
        if (acesScore < opponentScore) return 'destructive';
        return 'secondary';
    }
     const getResultText = (acesScore?: number, opponentScore?: number) => {
        if (acesScore === undefined || opponentScore === undefined) return 'N/A';
        if (acesScore > opponentScore) return 'Výhra';
        if (acesScore < opponentScore) return 'Prohra';
        return 'Remíza';
    }

  const handleCancelStatsEditClick = useCallback(() => {
    setIsStatEditMode(false);
    setEditableSkaterStats([]);
    setEditableGoalieStats([]);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const matchId = searchParams.get('matchId');
    if (!matchId || upcomingMatches.length === 0) return;
    const isOtherMatch = otherUpcomingMatches.some(m => m.id === matchId);
    if (isOtherMatch) setOpenAccordionValue("item-1");
    setTimeout(() => {
        const element = document.getElementById(`match-${matchId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMatchId(matchId);
            setTimeout(() => {
                setHighlightedMatchId(null);
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('matchId');
                window.history.replaceState({}, '', newUrl);
            }, 3000);
        }
    }, 200);
  }, [isLoading, upcomingMatches, otherUpcomingMatches, searchParams]);

  useEffect(() => { handleCancelStatsEditClick(); }, [scoringView, handleCancelStatsEditClick]);
  
  if (isLoading || !user) return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>

  const handleShareMatch = (matchId: string) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('matchId', matchId);
    navigator.clipboard.writeText(url.toString()).then(() => {
      toast({ title: "Odkaz na zápas zkopírován" });
    }).catch(() => toast({ variant: "destructive", title: "Chyba" }));
  };

  const handleEditMatch = (match: Match) => { setSelectedMatch(match); setEditMatchType(match.type); setIsEditDialogOpen(true); };
  const handleDeleteMatch = (match: Match) => { setSelectedMatch(match); setIsDeleteDialogOpen(true); };

  const handleRecordResult = (match: Match) => {
    if (!allUsers || !attendancesByMatch) return;
    const matchAttendees = attendancesByMatch.get(match.id) || [];
    const goingUserIds = new Set(matchAttendees.filter(a => a.status === 'going').map(a => a.userId));
    const players = allUsers.filter(u => goingUserIds.has(u.id));
    setPlayersForMatch(players);
    setSelectedMatch(match);
    setIsResultDialogOpen(true);
  }

  const handleBuildLineup = (match: Match) => { setLineupMatch(match); setIsLineupBuilderOpen(true); };
  const handleViewLineup = (match: Match) => { if (match.lineup) { setLineupMatch(match); setViewLineupData(match.lineup); setIsLineupViewOpen(true); } };

  const handleSaveLineup = async (lineupToSave: Lineup) => {
    if (!lineupMatch || !firestore) { setIsLineupBuilderOpen(false); return; };
    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);
      const matchRef = doc(firestore, 'matches', lineupMatch.id);
      batch.update(matchRef, { lineup: lineupToSave });
      if (lineupMatch.isPlayed) {
          const oldLineup = lineupMatch.lineup || {};
          const oldPlayerIds = new Set(Object.values(oldLineup).filter(p => p !== null).map(p => p!.id));
          const newPlayerIds = new Set(Object.values(lineupToSave).filter(p => p !== null).map(p => p!.id));
          const alreadyCountedIds = new Set<string>();
          lineupMatch.scorers?.forEach(s => { if (s.goal) alreadyCountedIds.add(s.goal); if (s.assist) alreadyCountedIds.add(s.assist); });
          if (lineupMatch.goalieId) alreadyCountedIds.add(lineupMatch.goalieId);
          newPlayerIds.forEach(pid => {
              if (!oldPlayerIds.has(pid) && !alreadyCountedIds.has(pid)) {
                  const statRef = doc(firestore, 'users', pid, 'skaterStats', 'stats');
                  const update: any = { historicalGamesPlayed: increment(1), userProfileId: pid };
                  if (lineupMatch.type === 'playoff') update.playoffGamesPlayed = increment(1);
                  else if (lineupMatch.type === 'regular') update.seasonGamesPlayed = increment(1);
                  batch.set(statRef, update, { merge: true });
              }
          });
          oldPlayerIds.forEach(pid => {
              if (!newPlayerIds.has(pid) && !alreadyCountedIds.has(pid)) {
                  const statRef = doc(firestore, 'users', pid, 'skaterStats', 'stats');
                  const update: any = { historicalGamesPlayed: increment(-1), userProfileId: pid };
                  if (lineupMatch.type === 'playoff') update.playoffGamesPlayed = increment(-1);
                  else if (lineupMatch.type === 'regular') update.seasonGamesPlayed = increment(-1);
                  batch.set(statRef, update, { merge: true });
              }
          });
      }
      await batch.commit();
      toast({ title: "Sestava uložena." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chyba', description: `Nepodařilo se uložit sestavu: ${error.message}` });
    } finally { setIsSaving(false); setIsLineupBuilderOpen(false); }
  };

  const confirmDeleteMatch = async () => {
    if (!selectedMatch || !firestore) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);
        if (selectedMatch.isPlayed) {
            const participants = new Set<string>();
            if (selectedMatch.lineup) Object.values(selectedMatch.lineup).forEach(p => { if(p) participants.add(p.id); });
            selectedMatch.scorers?.forEach(s => { if (s.goal) participants.add(s.goal); if (s.assist) participants.add(s.assist); });
            if (selectedMatch.goalieId) participants.add(selectedMatch.goalieId);
            for (const pid of participants) {
                const statRef = doc(firestore, 'users', pid, 'skaterStats', 'stats');
                const update: any = { historicalGamesPlayed: increment(-1), userProfileId: pid };
                if (selectedMatch.type === 'playoff') update.playoffGamesPlayed = increment(-1);
                else if (selectedMatch.type === 'regular') update.seasonGamesPlayed = increment(-1);
                let g = 0, a = 0;
                selectedMatch.scorers?.forEach(s => { if (s.goal === pid) g++; if (s.assist === pid) a++; });
                if (g > 0) {
                    update.historicalGoals = increment(-g);
                    if (selectedMatch.type === 'playoff') update.playoffGoals = increment(-g);
                    else if (selectedMatch.type === 'regular') update.seasonGoals = increment(-g);
                }
                if (a > 0) {
                    update.historicalAssists = increment(-a);
                    if (selectedMatch.type === 'playoff') update.playoffAssists = increment(-a);
                    else if (selectedMatch.type === 'regular') update.seasonAssists = increment(-a);
                }
                batch.set(statRef, update, { merge: true });
            }
            if (selectedMatch.goalieId) {
                const goalieRef = doc(firestore, 'users', selectedMatch.goalieId, 'goalieStats', 'stats');
                const isWin = (selectedMatch.team1Score ?? 0) > (selectedMatch.team2Score ?? 0);
                const update: any = { historicalGamesPlayed: increment(-1), historicalWins: isWin ? increment(-1) : increment(0), historicalSaves: increment(-(selectedMatch.goalieSaves || 0)), historicalShotsAgainst: increment(-(selectedMatch.goalieShotsAgainst || 0)), userProfileId: selectedMatch.goalieId };
                if (selectedMatch.type === 'playoff') {
                    update.playoffGamesPlayed = increment(-1); if (isWin) update.playoffWins = increment(-1);
                    update.playoffSaves = increment(-(selectedMatch.goalieSaves || 0)); update.playoffShotsAgainst = increment(-(selectedMatch.goalieShotsAgainst || 0));
                } else if (selectedMatch.type === 'regular') {
                    update.seasonGamesPlayed = increment(-1); if (isWin) update.seasonWins = increment(-1);
                    update.seasonSaves = increment(-(selectedMatch.goalieSaves || 0)); update.seasonShotsAgainst = increment(-(selectedMatch.goalieShotsAgainst || 0));
                }
                batch.set(goalieRef, update, { merge: true });
            }
        }
        batch.delete(doc(firestore, 'matches', selectedMatch.id));
        await batch.commit();
        toast({ title: "Zápas smazán." });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Chyba' }); }
    finally { setIsSaving(false); setIsDeleteDialogOpen(false); setSelectedMatch(null); }
  };

  const handleAttendanceChange = (matchId: string, newStatus: 'going' | 'not-going', note: string) => {
    if (!user || !firestore) return Promise.reject(new Error("User not logged in"));
    const attendanceRef = doc(firestore, 'matches', matchId, 'attendees', user.uid);
    const originalAttendance = userAttendances.get(matchId);
    setOptimisticAttendances(prev => new Map(prev).set(matchId, { status: newStatus, note: note || '' }));
    return setDoc(attendanceRef, { userId: user.uid, matchId: matchId, status: newStatus, note: note || '' }, { merge: true }).catch(async (error) => {
      setOptimisticAttendances(prev => { const newMap = new Map(prev); if (originalAttendance) newMap.set(matchId, originalAttendance); else newMap.delete(matchId); return newMap; });
      toast({ variant: 'destructive', title: "Chyba" });
      throw error;
    });
  };

  const confirmAttendance = async () => {
    if (!attendanceData) return;
    setIsSaving(true);
    try { await handleAttendanceChange(attendanceData.matchId, attendanceData.status, attendanceNote); setIsAttendanceDialogOpen(false); }
    catch (error) {} finally { setIsSaving(false); setAttendanceData(null); setAttendanceNote(''); }
  };

  const handleMatchUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch || !firestore) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as Match['type'];
    try {
        const newDateTime = parse(`${formData.get('date')} ${formData.get('time')}`, 'yyyy-MM-dd HH:mm', new Date());
        if (isNaN(newDateTime.getTime())) { toast({ variant: 'destructive', title: 'Neplatné datum' }); setIsSaving(false); return; }
        const updatedData: any = { team2: formData.get('opponent') as string, location: formData.get('location') as string, dateTime: Timestamp.fromDate(newDateTime), type: type };
        if (type === 'regular') { updatedData.round = Number(formData.get('round')) || null; updatedData.playoffStage = null; updatedData.playoffMatchNumber = null; }
        else if (type === 'playoff') { updatedData.playoffStage = formData.get('playoffStage') as string; updatedData.playoffMatchNumber = Number(formData.get('playoffMatchNumber')) || null; updatedData.round = null; }
        await updateDoc(doc(firestore, 'matches', selectedMatch.id), updatedData);
        toast({ title: 'Zápas aktualizován' });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Chyba' }); }
    finally { setIsSaving(false); setIsEditDialogOpen(false); setSelectedMatch(null); }
  };

  const handleMatchAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as Match['type'];
    try {
      const newDateTime = parse(`${formData.get('date')} ${formData.get('time')}`, 'yyyy-MM-dd HH:mm', new Date());
      if (isNaN(newDateTime.getTime())) { toast({ variant: 'destructive', title: 'Neplatné datum' }); setIsSaving(false); return; }
      const newMatchData: any = { team1: 'Aces', team2: formData.get('opponent') as string, location: formData.get('location') as string, dateTime: Timestamp.fromDate(newDateTime), isPlayed: false, type: type };
      if (type === 'regular') newMatchData.round = Number(formData.get('round')) || null;
      else if (type === 'playoff') { newMatchData.playoffStage = formData.get('playoffStage') as string; newMatchData.playoffMatchNumber = Number(formData.get('playoffMatchNumber')) || null; }
      await addDoc(collection(firestore, 'matches'), newMatchData);
      toast({ title: 'Zápas přidán.' });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Chyba' }); }
    finally { setIsSaving(false); setIsAddDialogOpen(false); }
  };

  const handleResultSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch || !firestore) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const t1Score = parseInt(formData.get('team1Score') as string, 10);
    const t2Score = parseInt(formData.get('team2Score') as string, 10);
    const goalieId = formData.get('goalieId') as string;
    const gId = (goalieId && goalieId !== 'none') ? goalieId : null;
    const gSaves = parseInt(formData.get('goalieSaves') as string, 10) || 0;
    const gShots = parseInt(formData.get('goalieShotsAgainst') as string, 10) || 0;
    const scorersData: { goal: string, assist: string | null }[] = [];
    const pStatsMap = new Map<string, { goals: number, assists: number }>();
    const participants = new Set<string>();
    
    if (selectedMatch.lineup) {
        Object.values(selectedMatch.lineup).forEach(p => { if(p) participants.add(p.id); });
    } else {
        (attendancesByMatch.get(selectedMatch.id) || []).forEach(att => { if (att.status === 'going') participants.add(att.userId); });
    }

    for (let i = 0; i < t1Score; i++) {
        const goal = formData.get(`goal-${i}`) as string;
        const assist = formData.get(`assist-${i}`) as string;
        if (goal) {
            scorersData.push({ goal, assist: (assist && assist !== 'none') ? assist : null });
            const g = pStatsMap.get(goal) || { goals: 0, assists: 0 }; pStatsMap.set(goal, { ...g, goals: g.goals + 1 });
            participants.add(goal);
            if (assist && assist !== 'none') {
                const a = pStatsMap.get(assist) || { goals: 0, assists: 0 }; pStatsMap.set(assist, { ...a, assists: a.assists + 1 });
                participants.add(assist);
            }
        }
    }
    
    if (gId) participants.add(gId);

    const batch = writeBatch(firestore);
    try {
      batch.update(doc(firestore, 'matches', selectedMatch.id), { 
          isPlayed: true, 
          team1Score: t1Score, 
          team2Score: t2Score, 
          scorers: scorersData, 
          goalieId: gId, 
          goalieSaves: gSaves, 
          goalieShotsAgainst: gShots 
      });

      for (const pid of participants) {
          const statRef = doc(firestore, 'users', pid, 'skaterStats', 'stats');
          const p = pStatsMap.get(pid) || { goals: 0, assists: 0 };
          const update: any = { 
              historicalGamesPlayed: increment(1), 
              historicalGoals: increment(p.goals), 
              historicalAssists: increment(p.assists), 
              userProfileId: pid 
          };
          if (selectedMatch.type === 'playoff') { 
              update.playoffGoals = increment(p.goals); 
              update.playoffAssists = increment(p.assists); 
              update.playoffGamesPlayed = increment(1); 
          } else if (selectedMatch.type === 'regular') { 
              update.seasonGoals = increment(p.goals); 
              update.seasonAssists = increment(p.assists); 
              update.seasonGamesPlayed = increment(1); 
          }
          batch.set(statRef, update, { merge: true });
      }

      if (gId) {
          const goalieRef = doc(firestore, 'users', gId, 'goalieStats', 'stats');
          const isWin = t1Score > t2Score;
          const update: any = { 
              historicalGamesPlayed: increment(1), 
              historicalWins: isWin ? increment(1) : increment(0), 
              historicalSaves: increment(gSaves), 
              historicalShotsAgainst: increment(gShots), 
              userProfileId: gId 
          };
          if (selectedMatch.type === 'playoff') { 
              update.playoffGamesPlayed = increment(1); 
              update.playoffWins = isWin ? increment(1) : increment(0); 
              update.playoffSaves = increment(gSaves); 
              update.playoffShotsAgainst = increment(gShots); 
          } else if (selectedMatch.type === 'regular') { 
              update.seasonGamesPlayed = increment(1); 
              update.seasonWins = isWin ? increment(1) : increment(0); 
              update.seasonSaves = increment(gSaves); 
              update.seasonShotsAgainst = increment(gShots); 
          }
          batch.set(goalieRef, update, { merge: true });
      }
      await batch.commit();
      toast({ title: "Výsledek uložen" });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Chyba', description: error.message }); }
    finally { setIsSaving(false); setIsResultDialogOpen(false); setSelectedMatch(null); setPlayersForMatch(null); }
};

  const handleEditLeagueClick = () => { setEditableLeagueStandings(JSON.parse(JSON.stringify(leagueStandings))); setEditableIsPlayoffEnabled(isPlayoffEnabled); setEditablePlayoffSeries(playoffSeries.map(s => ({...s}))); setIsLeagueEditMode(true); };
  const handleSaveLeague = async () => {
    if (!firestore) return;
    setIsSaving(true);
    let seriesToSave = editablePlayoffSeries;
    if (editableIsPlayoffEnabled && seriesToSave.length === 0) seriesToSave = [{ round: 'Čtvrtfinále', opponent: 'TBD', wins: 0, losses: 0 }];
    try {
        await setDoc(doc(firestore, 'settings', 'league'), { isPlayoffEnabled: editableIsPlayoffEnabled, playoffSeries: seriesToSave, leagueStandings: editableLeagueStandings }, { merge: true });
        toast({ title: 'Nastavení ligy uloženo.' });
    } catch (error) { toast({ variant: 'destructive', title: 'Chyba' }); }
    finally { setIsSaving(false); setIsLeagueEditMode(false); }
  };

  const handleEditStatsClick = () => {
        setIsStatEditMode(true);
        const skaters = teamScoring.map(p => ({ id: p.id, name: p.name, ...p[scoringView] }));
        const goalies = goalieLeaderboard.map(p => ({ id: p.id, name: p.name, ...p[scoringView] }));
        setEditableSkaterStats(JSON.parse(JSON.stringify(skaters)));
        setEditableGoalieStats(JSON.parse(JSON.stringify(goalies)));
    };

    const handleSaveStatsClick = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            let prefix = scoringView === 'history' ? 'historical' : scoringView;
            editableSkaterStats.forEach(p => {
                batch.set(doc(firestore, 'users', p.id, 'skaterStats', 'stats'), { [`${prefix}Goals`]: p.goals, [`${prefix}Assists`]: p.assists, [`${prefix}GamesPlayed`]: p.gamesPlayed, userProfileId: p.id }, { merge: true });
            });
            editableGoalieStats.forEach(g => {
                batch.set(doc(firestore, 'users', g.id, 'goalieStats', 'stats'), { [`${prefix}GamesPlayed`]: g.gamesPlayed, [`${prefix}Wins`]: g.wins, [`${prefix}Saves`]: g.saves, [`${prefix}ShotsAgainst`]: g.shotsAgainst, userProfileId: g.id }, { merge: true });
            });
            await batch.commit();
            toast({ title: 'Statistiky uloženy.' });
            handleCancelStatsEditClick();
        } catch (error: any) { toast({ variant: 'destructive', title: 'Chyba' }); }
        finally { setIsSaving(false); }
    };

    const handleSkaterStatChange = (pid: string, f: 'goals' | 'assists' | 'gamesPlayed', d: number) => { setEditableSkaterStats(curr => curr.map(p => p.id === pid ? { ...p, [f]: Math.max(0, p[f] + d) } : p)); };
    const handleGoalieStatChange = (gid: string, f: 'gamesPlayed' | 'wins' | 'saves' | 'shotsAgainst', d: number) => { setEditableGoalieStats(curr => curr.map(g => g.id === gid ? { ...g, [f]: Math.max(0, g[f] + d) } : g)); };

    const handleTeamNameChange = (tid: string, n: string) => { setEditableLeagueStandings(curr => curr.map(t => t.id === tid ? { ...t, name: n } : t)); };
    const handleLeagueChange = (tid: string, f: 'gf' | 'ga' | 'points', d: number) => { setEditableLeagueStandings(curr => curr.map(t => t.id === tid ? { ...t, [f]: Math.max(0, t[f] + d) } : t)); };
    const handleAddNewTeam = () => { setEditableLeagueStandings(curr => [...curr, { id: Math.random().toString(36).substring(7), name: 'Nový tým', gf: 0, ga: 0, points: 0 }]); };
    const handlePlayoffOpponentChange = (idx: number, n: string) => { setEditablePlayoffSeries(curr => curr.map((s, i) => i === idx ? { ...s, opponent: n } : s)); };
    const handlePlayoffScoreChange = (idx: number, f: 'wins' | 'losses', d: number) => { setEditablePlayoffSeries(curr => curr.map((s, i) => i === idx ? { ...s, [f]: Math.max(0, s[f] + d) } : s)); };
  
  const fallback = userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? ''
  
  const renderMatchCard = (match: Match) => {
    const { prefix, opponent } = getMatchDetails(match);
    const attendance = userAttendancesWithOptimistic.get(match.id)?.status;
    const attendeesForMatch = (attendancesByMatch.get(match.id) || []);
    const attendeeCount = attendeesForMatch.filter(a => a.status === 'going').length;
    const sortedAttendees = [...attendeesForMatch.filter(att => att.status === 'going'), ...attendeesForMatch.filter(att => att.status === 'not-going')];
    return (
        <Card id={`match-${match.id}`} className={cn("w-full transition-all", highlightedMatchId === match.id && 'animate-highlight-card')}>
                <CardHeader className="flex-row items-start justify-between pb-2">
                    <div className="space-y-0.5">
                        {prefix && <p className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider leading-none mb-1">{prefix}</p>}
                        <CardTitle className="text-xl sm:text-2xl font-headline break-words pr-2">{opponent}</CardTitle>
                        <CardDescription className="font-semibold pt-1">{format(match.dateTime.toDate(), "EEEE, d. M. yyyy, HH:mm", { locale: cs })}</CardDescription>
                    </div>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleShareMatch(match.id)}><Share2 className="h-4 w-4" /><span className="sr-only">Sdílet</span></Button>
                        {userProfile?.role === 'admin' && (
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleBuildLineup(match)}><FileText className="mr-2 h-4 w-4" /> Tvořit sestavu</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRecordResult(match)}><ClipboardEdit className="mr-2 h-4 w-4" /> Zapsat výsledek</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditMatch(match)}><Pencil className="mr-2 h-4 w-4" /> Upravit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteMatch(match)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Smazat</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm"><div className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 shrink-0 text-primary"/><span className="truncate">{match.location}</span></div></CardContent>
                <CardFooter className="flex-col items-start gap-4 p-4 sm:p-6">
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant={attendance === 'going' ? 'default' : 'outline'} size="sm" onClick={() => { setAttendanceData({ matchId: match.id, status: 'going' }); setAttendanceNote(userAttendances.get(matchId)?.note || ''); setIsAttendanceDialogOpen(true); }} className={cn('flex-1 sm:flex-initial text-xs sm:text-sm', attendance === 'going' && "bg-green-500/10 border-green-500 text-green-600")}><Check className="h-4 w-4 mr-1 sm:mr-2" /> Jdu</Button>
                            <Button variant={attendance === 'not-going' ? 'destructive' : 'outline'} size="sm" onClick={() => { setAttendanceData({ matchId: match.id, status: 'not-going' }); setAttendanceNote(userAttendances.get(matchId)?.note || ''); setIsAttendanceDialogOpen(true); }} className={cn('flex-1 sm:flex-initial text-xs sm:text-sm', attendance === 'not-going' && "bg-destructive/10 border-destructive text-destructive")}><X className="h-4 w-4 mr-1 sm:mr-2" /> Nejdu</Button>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {match.lineup && <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => handleViewLineup(match)}><View className="mr-1 sm:mr-2" /> Sestava</Button>}
                            <Dialog><DialogTrigger asChild><Button variant="outline" size="sm" className="text-xs sm:text-sm"><Users className="mr-1 sm:mr-2" /> Účast: {attendeeCount}</Button></DialogTrigger>
                                <DialogContent><DialogHeader><DialogTitle>Přihlášení na zápas</DialogTitle><DialogDescription>{opponent} - {format(match.dateTime.toDate(), "d. MMMM yyyy", { locale: cs })}</DialogDescription></DialogHeader>
                                    <div className="max-h-[400px] overflow-y-auto pr-4 space-y-4">{sortedAttendees.length > 0 ? sortedAttendees.map(att => {
                                            const ap = usersMap.get(att.userId); if (!ap) return null;
                                            return (
                                                <div key={att.userId} className={cn("flex items-center gap-4 p-2 rounded-lg border-2", att.status === 'going' ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10")}>
                                                    <Avatar><AvatarImage src={ap.photoURL ?? `https://picsum.photos/seed/${ap.email}/100/100`} /><AvatarFallback>{ap.name?.split(' ').map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                                    <div className="flex-1"><p className="font-medium">{ap.name}</p>{ap.jerseyNumber && <p className="text-sm text-muted-foreground">#{ap.jerseyNumber}</p>}{att.note && <p className="text-sm text-muted-foreground italic mt-1">"{att.note}"</p>}</div>
                                                    {att.status === 'going' ? <Check className="h-6 w-6 text-green-500" /> : <X className="h-6 w-6 text-destructive" />}
                                                </div>
                                            )
                                        }) : <p className="text-muted-foreground">Zatím nikdo neodpověděl.</p>}</div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardFooter>
            </Card>
    );
  };

  return (
    <div className="py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {upcomingBirthdays.length > 0 && (
            <Card className="lg:col-span-3 border-l-4 border-l-accent bg-accent/5">
                <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-4">
                    <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0"><Cake className="h-6 w-6 text-accent" /></div>
                    <div className="flex-1 text-center sm:text-left"><h3 className="font-bold text-lg">Blížící se narozeniny</h3><p className="text-muted-foreground text-sm">{upcomingBirthdays.map((u, i) => (<span key={u.id}><span className="font-semibold text-foreground">{u.name}</span> ({format(parseISO(u.dob!), "d. M.")}){i < upcomingBirthdays.length - 1 ? ', ' : ''}</span>))}</p></div>
                    <Button variant="outline" size="sm" asChild className="shrink-0"><Link href="/dashboard/calendar">V kalendáři</Link></Button>
                </CardContent>
            </Card>
        )}
        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 mb-4 border-4 border-primary shadow-lg"><AvatarImage src={userProfile?.photoURL ?? `https://picsum.photos/seed/${userProfile?.email}/400/400`} /><AvatarFallback className="text-4xl">{fallback}</AvatarFallback></Avatar>
            <CardTitle className="text-2xl md:text-3xl font-headline">{userProfile?.name}</CardTitle>
            {userProfile?.jerseyNumber && <CardDescription className="text-primary font-bold text-4xl md:text-5xl font-mono mt-2">#{userProfile.jerseyNumber}</CardDescription>}
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2 font-headline"><BarChart className="text-primary"/>Moje statistiky</CardTitle></CardHeader>
            <CardContent><Tabs value={myStatsView} onValueChange={(v) => setMyStatsView(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="season">Sezóna</TabsTrigger><TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger><TabsTrigger value="history">Historie</TabsTrigger></TabsList>
                    <div className="mt-4">{stats.length > 0 ? ( <Table><TableBody>{stats.map(s => (<TableRow key={s.metric}><TableCell className="font-medium text-base py-3">{s.metric}</TableCell><TableCell className="text-right font-mono text-lg font-bold py-3">{s.value}</TableCell></TableRow>))}</TableBody></Table> ) : <p className="text-muted-foreground text-center py-4">Nenalezeny.</p>}</div>
                </Tabs></CardContent>
        </Card>
        <div className="lg:col-span-3" ref={upcomingMatchesRef}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="flex items-center gap-2 font-headline text-xl font-semibold"><Trophy className="text-primary"/>Příští zápasy (14 dní)</h2>
            {userProfile?.role === 'admin' && (
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-initial" asChild><Link href="/dashboard/calendar"><CalendarIcon className="mr-2 h-4 w-4" />Kalendář</Link></Button>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogTrigger asChild><Button className="flex-1 sm:flex-initial"><Plus className="mr-2 h-4 w-4" />Přidat</Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>Přidat nový zápas</DialogTitle></DialogHeader><form onSubmit={handleMatchAdd}><div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Soupeř</Label><Input name="opponent" className="col-span-3" required /></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Datum</Label><Input name="date" type="date" className="col-span-3" required /></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Čas</Label><Input name="time" type="time" defaultValue="18:00" className="col-span-3" required /></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Místo</Label><Input name="location" className="col-span-3" required /></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Typ</Label><Select name="type" required value={addMatchType} onValueChange={(v) => setAddMatchType(v as any)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="regular">Základní</SelectItem><SelectItem value="playoff">Play-off</SelectItem><SelectItem value="friendly">Přátelský</SelectItem></SelectContent></Select></div>
                            {addMatchType === 'regular' && <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Kolo</Label><Input name="round" type="number" min="1" className="col-span-3" /></div>}
                            {addMatchType === 'playoff' && <><div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Fáze</Label><Select name="playoffStage" required defaultValue="čtvrtfinále"><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="čtvrtfinále">Čtvrtfinále</SelectItem><SelectItem value="semifinále">Semifinále</SelectItem><SelectItem value="finále">Finále</SelectItem></SelectContent></Select></div><div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Zápas č.</Label><Input name="playoffMatchNumber" type="number" min="1" className="col-span-3" /></div></>}
                        </div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Zrušit</Button><Button type="submit" disabled={isSaving}>Uložit</Button></DialogFooter></form></DialogContent></Dialog>
                </div>
              )}
          </div>
          {nextMatch ? <div className="w-full">{renderMatchCard(nextMatch)}</div> : <Card><CardContent className="pt-6 text-center text-muted-foreground">Žádný zápas v dohledu.</CardContent></Card>}
          {otherUpcomingMatches.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-4" value={openAccordionValue} onValueChange={setOpenAccordionValue}>
                    <AccordionItem value="item-1" className="border-none"><AccordionTrigger className="rounded-lg border bg-card px-4 py-3 font-medium">Další zápasy</AccordionTrigger>
                        <AccordionContent className="pt-4"><div className="space-y-4">{otherUpcomingMatches.map(m => (<React.Fragment key={m.id}>{renderMatchCard(m)}</React.Fragment>))}</div></AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </div>
        <Card className="lg:col-span-3"><CardHeader><CardTitle className="flex items-center gap-2 font-headline"><History className="text-primary"/>Poslední zápasy</CardTitle></CardHeader>
            <CardContent>{recentPlayedMatches.length > 0 ? (<div className="space-y-4">{recentPlayedMatches.map(m => {
                            const { prefix, opponent } = getMatchDetails(m);
                            const sum = (<div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left w-full"><div className="flex-1 min-w-0"><p className="text-[10px] text-muted-foreground uppercase mb-0.5">{format(m.dateTime.toDate(), "d. M. yyyy")}</p>{prefix && <p className="text-[9px] font-bold text-primary uppercase mb-0.5">{prefix}</p>}<p className="font-semibold truncate text-base">{opponent}</p></div><div className="flex items-center gap-2 self-end sm:self-center"><span className="text-lg font-bold font-mono">{m.team1Score} : {m.team2Score}</span><Badge variant={getResultBadgeVariant(m.team1Score, m.team2Score)}>{getResultText(m.team1Score, m.team2Score)}</Badge></div></div>)
                            if (m.scorers?.length) return ( <Accordion type="single" collapsible key={m.id} className="w-full"><AccordionItem value={m.id} className="border rounded-lg"><AccordionTrigger className="p-3 hover:no-underline">{sum}</AccordionTrigger><AccordionContent className="px-4 pb-3"><h4 className="font-semibold mb-2 text-sm text-primary">Góly</h4><ul className="space-y-1.5 text-sm">{m.scorers.map((s, i) => (<li key={i} className="flex items-center gap-2"><Disc className="h-4 w-4 text-primary" /><span className="font-medium">{usersMap.get(s.goal)?.name || 'Hráč'}</span>{s.assist && <span className="ml-2 text-muted-foreground"><span className="font-bold text-accent">A</span> {usersMap.get(s.assist)?.name || 'Hráč'}</span>}</li>))}</ul></AccordionContent></AccordionItem></Accordion> )
                            return <div key={m.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-3 gap-2">{sum}</div>
                        })}</div>) : <p className="text-muted-foreground">Žádné.</p>}</CardContent>
            <CardFooter><Button asChild><Link href="/dashboard/history">Všechny zápasy</Link></Button></CardFooter>
        </Card>
        <div className="lg:col-span-3 grid gap-8 md:grid-cols-2">
            <Card><CardHeader className="pb-4"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><CardTitle className="flex items-center gap-2 font-headline"><Flame className="text-primary"/>Kanadské bodování</CardTitle>{userProfile?.role === 'admin' && ( isStatEditMode ? (<div className="flex gap-2 w-full sm:w-auto"><Button variant="outline" size="sm" onClick={handleCancelStatsEditClick}>Zrušit</Button><Button size="sm" onClick={handleSaveStatsClick} disabled={isSaving}>Uložit</Button></div>) : <Button variant="outline" size="sm" onClick={handleEditStatsClick}><Pencil className="mr-2 h-4 w-4" /> Upravit</Button> )}</div></CardHeader>
                <CardContent><Tabs value={scoringView} onValueChange={(v) => setScoringView(v as any)} className="w-full"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="season">Sezóna</TabsTrigger><TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger><TabsTrigger value="history">Historie</TabsTrigger></TabsList>
                        <div className="mt-4"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Hráč</TableHead><TableHead className="text-center px-1">Z</TableHead><TableHead className="text-center px-1">G</TableHead><TableHead className="text-center px-1">A</TableHead><TableHead className="text-right px-1">B</TableHead></TableRow></TableHeader>
                                <TableBody>{sortedTeamScoring.map((p) => (<TableRow key={p.id} className={p.id === user?.uid ? 'bg-primary/10' : ''}><TableCell className="px-2">{p.rank}</TableCell><TableCell className="font-medium truncate max-w-[100px] px-2">{p.name}</TableCell>{isStatEditMode ? (<><TableCell className="px-1"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSkaterStatChange(p.id, 'gamesPlayed', -1)}><Minus className="h-3 w-3" /></Button><span>{p.gamesPlayed}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSkaterStatChange(p.id, 'gamesPlayed', 1)}><Plus className="h-3 w-3" /></Button></div></TableCell><TableCell className="px-1"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSkaterStatChange(p.id, 'goals', -1)}><Minus className="h-3 w-3" /></Button><span>{p.goals}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSkaterStatChange(p.id, 'goals', 1)}><Plus className="h-3 w-3" /></Button></div></TableCell><TableCell className="px-1"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSkaterStatChange(p.id, 'assists', -1)}><Minus className="h-3 w-3" /></Button><span>{p.assists}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSkaterStatChange(p.id, 'assists', 1)}><Plus className="h-3 w-3" /></Button></div></TableCell></>) : (<><TableCell className="text-center px-1">{p.gamesPlayed}</TableCell><TableCell className="text-center px-1">{p.goals}</TableCell><TableCell className="text-center px-1">{p.assists}</TableCell></>)}<TableCell className="text-right font-bold px-2">{p.points}</TableCell></TableRow>))}</TableBody>
                            </Table></div></Tabs></CardContent>
            </Card>
            <Card><CardHeader className="pb-4"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><CardTitle className="flex items-center gap-2 font-headline"><Shield className="text-primary"/>Brankáři</CardTitle>{userProfile?.role === 'admin' && ( isStatEditMode ? (<div className="flex gap-2 w-full sm:w-auto"><Button variant="outline" size="sm" onClick={handleCancelStatsEditClick}>Zrušit</Button><Button size="sm" onClick={handleSaveStatsClick} disabled={isSaving}>Uložit</Button></div>) : <Button variant="outline" size="sm" onClick={handleEditStatsClick}><Pencil className="mr-2 h-4 w-4" /> Upravit</Button> )}</div></CardHeader>
                <CardContent><Tabs value={scoringView} onValueChange={(v) => setScoringView(v as any)} className="w-full"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="season">Sezóna</TabsTrigger><TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger><TabsTrigger value="history">Historie</TabsTrigger></TabsList>
                        <div className="mt-4"><Table><TableHeader><TableRow><TableHead className="px-2">Brankář</TableHead><TableHead className="text-center px-1">Z</TableHead><TableHead className="text-center px-1">V</TableHead><TableHead className="text-right px-2">Úsp%</TableHead></TableRow></TableHeader>
                                <TableBody>{sortedGoalieLeaderboard.map((g) => (<TableRow key={g.id} className={g.id === user?.uid ? 'bg-primary/10' : ''}><TableCell className="font-medium truncate max-w-[100px] px-2">{g.name}</TableCell>{isStatEditMode ? (<><TableCell className="px-1"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGoalieStatChange(g.id, 'gamesPlayed', -1)}><Minus className="h-3 w-3" /></Button><span>{g.gamesPlayed}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGoalieStatChange(g.id, 'gamesPlayed', 1)}><Plus className="h-3 w-3" /></Button></div></TableCell><TableCell className="px-1"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGoalieStatChange(g.id, 'wins', -1)}><Minus className="h-3 w-3" /></Button><span>{g.wins}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGoalieStatChange(g.id, 'wins', 1)}><Plus className="h-3 w-3" /></Button></div></TableCell></>) : (<><TableCell className="text-center px-1">{g.gamesPlayed}</TableCell><TableCell className="text-center px-1">{g.wins}</TableCell></>)}<TableCell className="text-right font-bold px-2">{g.savePercentage.toFixed(2)}%</TableCell></TableRow>))}</TableBody>
                            </Table></div></Tabs></CardContent>
            </Card>
        </div>
         <div className="lg:col-span-3 mt-8"><Card><CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><CardTitle className="flex items-center gap-2 font-headline"><Shield className="text-primary"/>Tabulka soutěže</CardTitle>{isLeagueEditMode && <div className="flex items-center space-x-2 mt-4"><Switch id="p-sw" checked={editableIsPlayoffEnabled} onCheckedChange={(c) => setEditableIsPlayoffEnabled(c)} /><Label htmlFor="p-sw">Play-off zapnuto</Label></div>}</div>{userProfile?.role === 'admin' && (<div className="flex gap-2 w-full sm:w-auto">{isLeagueEditMode ? (<><Button variant="outline" onClick={() => setIsLeagueEditMode(false)}>Zrušit</Button><Button onClick={handleSaveLeague} disabled={isSaving}>Uložit</Button></>) : <Button variant="outline" size="icon" onClick={handleEditLeagueClick}><Pencil className="h-4 w-4" /></Button>}</div>)}</CardHeader>
                <CardContent><Tabs value={leagueView} onValueChange={(v) => setLeagueView(v as any)} className="w-full">{isPlayoffEnabled && <TabsList className="grid w-full grid-cols-2 mb-4"><TabsTrigger value="regular">Základní</TabsTrigger><TabsTrigger value="playoff">Play-off</TabsTrigger></TabsList>}
                        <TabsContent value="regular"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Tým</TableHead><TableHead className="text-center">GF</TableHead><TableHead className="text-center">GA</TableHead><TableHead className="text-right">B</TableHead></TableRow></TableHeader>
                                <TableBody>{sortedLeagueStandings.map((t) => (<TableRow key={t.id} className={t.name === 'Aces' ? 'bg-primary/10' : ''}><TableCell>{t.rank}</TableCell><TableCell>{isLeagueEditMode ? <Input value={t.name} onChange={(e) => handleTeamNameChange(t.id, e.target.value)} className="h-8" /> : t.name}</TableCell><TableCell className="text-center">{isLeagueEditMode ? <div className="flex items-center justify-center gap-1"><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(t.id, 'gf', -1)}><Minus className="h-3 w-3" /></Button><span>{t.gf}</span><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(t.id, 'gf', 1)}><Plus className="h-3 w-3" /></Button></div> : t.gf}</TableCell><TableCell className="text-center">{isLeagueEditMode ? <div className="flex items-center justify-center gap-1"><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(t.id, 'ga', -1)}><Minus className="h-3 w-3" /></Button><span>{t.ga}</span><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(t.id, 'ga', 1)}><Plus className="h-3 w-3" /></Button></div> : t.ga}</TableCell><TableCell className="text-right">{isLeagueEditMode ? <div className="flex items-center justify-end gap-1"><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(t.id, 'points', -1)}><Minus className="h-3 w-3" /></Button><span>{t.points}</span><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(t.id, 'points', 1)}><Plus className="h-3 w-3" /></Button></div> : t.points}</TableCell></TableRow>))}</TableBody>
                            </Table>{isLeagueEditMode && <Button variant="outline" onClick={handleAddNewTeam} className="mt-4"><Plus className="mr-2 h-4 w-4" />Přidat tým</Button>}</TabsContent>
                         <TabsContent value="playoff">{(isLeagueEditMode ? editablePlayoffSeries : playoffSeries).map((s, i) => (<div key={i} className="p-4 border rounded-lg mb-4">
                                      <div className="flex justify-between items-center mb-2"><h4 className="font-bold">{s.round}</h4>{s.round === 'Vítěz' && <Trophy className="h-6 w-6 text-yellow-400" />}</div>
                                      {s.round !== 'Vítěz' ? (<><div className="flex justify-between items-center mb-4"><span>Soupeř</span>{isLeagueEditMode ? <Input className="w-1/2 text-right" value={s.opponent} onChange={(e) => handlePlayoffOpponentChange(i, e.target.value)} /> : <span className="font-medium">{s.opponent}</span>}</div><div className="flex justify-between items-center"><span>Stav</span><div className="flex items-center gap-2 font-bold">{isLeagueEditMode ? (<><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayoffScoreChange(i, 'wins', -1)}><Minus className="h-4 w-4" /></Button><span>{s.wins}</span><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayoffScoreChange(i, 'wins', 1)}><Plus className="h-4 w-4" /></Button><span>:</span><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayoffScoreChange(i, 'losses', -1)}><Minus className="h-4 w-4" /></Button><span>{s.losses}</span><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayoffScoreChange(i, 'losses', 1)}><Plus className="h-4 w-4" /></Button></>) : <span>{s.wins} : {s.losses}</span>}</div></div></>) : <p className="text-center font-bold text-primary">Mistři!</p>}
                                  </div>))}</TabsContent>
                    </Tabs></CardContent>
            </Card></div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}><DialogContent><DialogHeader><DialogTitle>Upravit zápas</DialogTitle></DialogHeader>{selectedMatch && <form onSubmit={handleMatchUpdate}><div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Soupeř</Label><Input name="opponent" defaultValue={selectedMatch.team1 === 'Aces' ? selectedMatch.team2 : selectedMatch.team1} className="col-span-3" /></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Datum</Label><Input name="date" type="date" defaultValue={format(selectedMatch.dateTime.toDate(), 'yyyy-MM-dd')} className="col-span-3" required /></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Čas</Label><Input name="time" type="time" defaultValue={format(selectedMatch.dateTime.toDate(), 'HH:mm')} className="col-span-3" required/></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Místo</Label><Input name="location" defaultValue={selectedMatch.location} className="col-span-3" /></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Typ</Label><Select name="type" required value={editMatchType} onValueChange={(v) => setEditMatchType(v as any)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="regular">Základní</SelectItem><SelectItem value="playoff">Play-off</SelectItem><SelectItem value="friendly">Přátelský</SelectItem></SelectContent></Select></div>
                      {editMatchType === 'regular' && <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Kolo</Label><Input name="round" type="number" min="1" defaultValue={selectedMatch.round} className="col-span-3" /></div>}
                      {editMatchType === 'playoff' && <><div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Fáze</Label><Select name="playoffStage" required defaultValue={selectedMatch.playoffStage || "čtvrtfinále"}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="čtvrtfinále">Čtvrtfinále</SelectItem><SelectItem value="semifinále">Semifinále</SelectItem><SelectItem value="finále">Finále</SelectItem></SelectContent></Select></div><div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Zápas č.</Label><Input name="playoffMatchNumber" type="number" min="1" defaultValue={selectedMatch.playoffMatchNumber} className="col-span-3" /></div></>}
                  </div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Zrušit</Button><Button type="submit">Uložit</Button></DialogFooter></form>}</DialogContent></Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Smazat zápas?</AlertDialogTitle><AlertDialogDescription>Tato akce je nevratná a statistiky hráčů budou odečteny.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Zrušit</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteMatch} className="bg-destructive">Smazat</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}><DialogContent className="max-w-md">{selectedMatch && playersForMatch ? ( playersForMatch.length > 0 ? <RecordResultForm match={selectedMatch} allUsers={playersForMatch} onSave={handleResultSave} onCancel={() => { setIsResultDialogOpen(false); setSelectedMatch(null); setPlayersForMatch(null); }} isSaving={isSaving} /> : <div className="p-4 text-center">Nejsou přihlášeni žádní hráči.</div> ) : <div className="flex justify-center h-24"><Loader2 className="animate-spin text-primary" /></div>}</DialogContent></Dialog>
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}><DialogContent><DialogHeader><DialogTitle>Potvrdit účast</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><Label>Poznámka</Label><Textarea value={attendanceNote} onChange={(e) => setAttendanceNote(e.target.value)} placeholder="Např. přijdu později..." /></div><DialogFooter><Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>Zrušit</Button><Button onClick={confirmAttendance}>Potvrdit</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isLineupBuilderOpen} onOpenChange={setIsLineupBuilderOpen}><DialogContent className="max-w-4xl h-[90vh] flex flex-col">{lineupMatch && allUsers ? <><DialogHeader><DialogTitle>Sestava: {getMatchDetails(lineupMatch).fullTitle}</DialogTitle></DialogHeader><LineupBuilder players={allUsers.filter(u => (attendancesByMatch.get(lineupMatch.id) || []).some(a => a.userId === u.id && a.status === 'going'))} initialData={lineupMatch.lineup} onSave={handleSaveLineup} onCancel={() => setIsLineupBuilderOpen(false)} /></> : <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}</DialogContent></Dialog>
      <Dialog open={isLineupViewOpen} onOpenChange={setIsLineupViewOpen}><DialogContent className="max-w-4xl h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Sestava: {lineupMatch ? getMatchDetails(lineupMatch).opponent : '...'}</DialogTitle></DialogHeader>{viewLineupData ? <LineupDisplay lineup={viewLineupData} /> : <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}</DialogContent></Dialog>
    </div>
  )
}

export default function DashboardPage() { return <Suspense fallback={<div className="container py-8">Načítání...</div>}><DashboardPageContent /></Suspense> }
