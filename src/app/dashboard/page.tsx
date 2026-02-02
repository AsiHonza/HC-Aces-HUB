'use client'

import { Suspense, useState, useMemo, useEffect, useRef } from 'react'
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
import { Calendar as CalendarIcon, MapPin, Users, Trophy, BarChart, Sword, Pencil, Check, X, Flame, Shield, Plus, Minus, Loader2, Trash2, ClipboardEdit, History, Share2, MoreHorizontal, FileText, View } from "lucide-react"
import { cn } from '@/lib/utils'
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase'
import { doc, collection, collectionGroup, updateDoc, query, Timestamp, addDoc, deleteDoc, writeBatch, orderBy, where, limit, setDoc } from 'firebase/firestore'
import { format, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { LineupBuilder, LineupDisplay, type Lineup } from '@/components/lineup-builder'


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
  team1Score?: number;
  team2Score?: number;
  scorers?: { goal: string; assist: string | null }[];
  lineup?: Lineup;
  goalieId?: string;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
}

interface Attendance {
    id: string; // userId, as it's the doc id
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

function RecordResultForm({ match, allUsers, onSave, onCancel }: { match: Match, allUsers: UserProfile[], onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>, onCancel: () => void }) {
    const [goalCount, setGoalCount] = useState(0)
    const skaters = useMemo(() => allUsers.filter(u => u.playerType === 'player'), [allUsers]);
    const goalies = useMemo(() => allUsers.filter(u => u.playerType === 'goalie'), [allUsers]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        await onSave(e);
    }
    
    return (
        <form onSubmit={handleSubmit}>
             <DialogHeader>
                  <DialogTitle>Zapsat výsledek zápasu</DialogTitle>
                  <DialogDescription>
                    Zadejte konečné skóre a statistiky hráčů.
                  </DialogDescription>
              </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                <p className="text-center font-bold text-lg">{match.team1} vs {match.team2}</p>
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
                            <SelectTrigger>
                                <SelectValue placeholder={`Gól ${index + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {skaters.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select name={`assist-${index}`}>
                            <SelectTrigger>
                                <SelectValue placeholder="Asistence" />
                            </SelectTrigger>
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
                <Button type="button" variant="outline" onClick={onCancel}>Zrušit</Button>
                <Button type="submit">Uložit výsledek</Button>
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

  // Fetch current user's profile and stats
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

  const skaterStatsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'skaterStats') : null, [firestore, user]);
  const { data: skaterStatsData, isLoading: isSkaterStatsLoading } = useCollection<SkaterStats>(skaterStatsCollectionRef);
  
  const goalieStatsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'goalieStats') : null, [firestore, user]);
  const { data: goalieStatsData, isLoading: isGoalieStatsLoading } = useCollection<GoalieStats>(goalieStatsCollectionRef);
  
  // Fetch matches
  const matchesQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'matches'), orderBy('dateTime', 'asc'));
  }, [firestore, user]);
  const { data: allMatches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);
  
  // Fetch all users and stats for leaderboard
  const usersRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'users'): null, [firestore, user]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersRef);

  const allSkaterStatsRef = useMemoFirebase(() => firestore && user ? collectionGroup(firestore, 'skaterStats'): null, [firestore, user]);
  const { data: allSkaterStats, isLoading: areSkaterStatsLoading } = useCollection<SkaterStats>(allSkaterStatsRef);

  const allGoalieStatsRef = useMemoFirebase(() => firestore && user ? collectionGroup(firestore, 'goalieStats'): null, [firestore, user]);
  const { data: allGoalieStats, isLoading: areGoalieStatsLoading } = useCollection<GoalieStats>(allGoalieStatsRef);

  // Fetch attendances for upcoming matches
    const attendancesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collectionGroup(firestore, 'attendees'));
    }, [firestore, user]);
    const { data: allAttendances, isLoading: attendancesLoading } = useCollection<Attendance>(attendancesQuery);

    const leagueSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'league') : null, [firestore]);
    const { data: leagueSettings, isLoading: leagueSettingsLoading } = useDoc<AppSettings>(leagueSettingsRef);
    
    const upcomingMatches = useMemo(() => allMatches?.filter(match => !match.isPlayed) ?? [], [allMatches]);
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
    allSkaterStats.forEach(stat => statsMap.set(stat.userProfileId, stat));

    return allUsers
      .filter(u => u.playerType === 'player')
      .map(u => {
      const stats = statsMap.get(u.id);
      return {
          id: u.id,
          name: u.name,
          season: {
              goals: stats?.seasonGoals ?? 0,
              assists: stats?.seasonAssists ?? 0,
              gamesPlayed: stats?.seasonGamesPlayed ?? 0,
              points: (stats?.seasonGoals ?? 0) + (stats?.seasonAssists ?? 0),
          },
          playoff: {
              goals: stats?.playoffGoals ?? 0,
              assists: stats?.playoffAssists ?? 0,
              gamesPlayed: stats?.playoffGamesPlayed ?? 0,
              points: (stats?.playoffGoals ?? 0) + (stats?.playoffAssists ?? 0),
          },
          history: {
              goals: stats?.historicalGoals ?? 0,
              assists: stats?.historicalAssists ?? 0,
              gamesPlayed: stats?.historicalGamesPlayed ?? 0,
              points: (stats?.historicalGoals ?? 0) + (stats?.historicalAssists ?? 0),
          },
      };
    });
  }, [allUsers, allSkaterStats]);

  const goalieLeaderboard = useMemo(() => {
    if (!allUsers || !allGoalieStats) return [];

    const statsMap = new Map<string, GoalieStats>();
    allGoalieStats.forEach(stat => statsMap.set(stat.userProfileId, stat));

    return allUsers
      .filter(u => u.playerType === 'goalie')
      .map(u => {
        const stats = statsMap.get(u.id);
        const seasonSavePct = (stats?.seasonShotsAgainst ?? 0) > 0 ? ((stats?.seasonSaves ?? 0) / stats!.seasonShotsAgainst) * 100 : 0;
        const playoffSavePct = (stats?.playoffShotsAgainst ?? 0) > 0 ? ((stats?.playoffSaves ?? 0) / stats!.playoffShotsAgainst) * 100 : 0;
        const historicalSavePct = (stats?.historicalShotsAgainst ?? 0) > 0 ? ((stats?.historicalSaves ?? 0) / stats!.historicalShotsAgainst) * 100 : 0;

        return {
          id: u.id,
          name: u.name,
          season: {
            gamesPlayed: stats?.seasonGamesPlayed ?? 0,
            wins: stats?.seasonWins ?? 0,
            shotsAgainst: stats?.seasonShotsAgainst ?? 0,
            saves: stats?.seasonSaves ?? 0,
            savePercentage: seasonSavePct,
          },
          playoff: {
            gamesPlayed: stats?.playoffGamesPlayed ?? 0,
            wins: stats?.playoffWins ?? 0,
            shotsAgainst: stats?.playoffShotsAgainst ?? 0,
            saves: stats?.playoffSaves ?? 0,
            savePercentage: playoffSavePct,
          },
          history: {
            gamesPlayed: stats?.historicalGamesPlayed ?? 0,
            wins: stats?.historicalWins ?? 0,
            shotsAgainst: stats?.historicalShotsAgainst ?? 0,
            saves: stats?.historicalSaves ?? 0,
            savePercentage: historicalSavePct,
          },
        };
      });
  }, [allUsers, allGoalieStats]);
  
  const sortedTeamScoring = useMemo(() => {
      if (!teamScoring) return [];
      const data = teamScoring.map(player => ({
          id: player.id,
          name: player.name,
          ...player[scoringView]
      }));
      return data.sort((a, b) => b.points - a.points || b.goals - a.goals).map((player, index) => ({ ...player, rank: index + 1 }));
  }, [teamScoring, scoringView]);

  const sortedGoalieLeaderboard = useMemo(() => {
    if (!goalieLeaderboard) return [];
    const data = goalieLeaderboard.map(goalie => ({
        id: goalie.id,
        name: goalie.name,
        ...goalie[scoringView]
    }));
    return data.sort((a, b) => b.savePercentage - a.savePercentage || b.wins - a.wins).map((goalie, index) => ({...goalie, rank: index + 1}));
  }, [goalieLeaderboard, scoringView]);

  const sortedLeagueStandings = useMemo(() => {
      const data = isLeagueEditMode ? editableLeagueStandings : leagueStandings;
      if (!data) return [];
      return [...data]
      .sort((a, b) => b.points - a.points)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [leagueStandings, editableLeagueStandings, isLeagueEditMode]);
  
  const attendancesByMatch = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    allAttendances?.forEach(att => {
        if (!map.has(att.matchId)) {
          map.set(att.matchId, []);
        }
        map.get(att.matchId)!.push(att);
    });
    return map;
  }, [allAttendances]);

  const userAttendances = useMemo(() => {
    const map = new Map<string, Attendance>();
    if(user && allAttendances){
        allAttendances.filter(att => att.userId === user.uid).forEach(att => {
            map.set(att.matchId, att);
        });
    }
    return map;
  }, [allAttendances, user]);

  const userAttendancesWithOptimistic = useMemo(() => {
    const map = new Map(userAttendances);
    optimisticAttendances.forEach((optimisticAtt, matchId) => {
        if (optimisticAtt.status === 'unknown') { 
            map.delete(matchId);
        } else {
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
  ] : [], [myStatsToDisplay.assists, myStatsToDisplay.gamesPlayed, myStatsToDisplay.goals, myGoalieStatsToDisplay.gamesPlayed, myGoalieStatsToDisplay.savePct, myGoalieStatsToDisplay.wins, userProfile?.playerType]);
  

  const isLoading = isUserProfileLoading || isSkaterStatsLoading || isGoalieStatsLoading || areMatchesLoading || areUsersLoading || areSkaterStatsLoading || areGoalieStatsLoading || attendancesLoading || leagueSettingsLoading;

  useEffect(() => {
    setOptimisticAttendances(new Map());
  }, [allAttendances]);

  useEffect(() => {
    if (isLoading) return;
    const matchId = searchParams.get('matchId');
    if (!matchId || upcomingMatches.length === 0) return;

    const container = upcomingMatchesRef.current;
    if (!container) return;

    const isOtherMatch = otherUpcomingMatches.some(m => m.id === matchId);
    if (isOtherMatch) {
        setOpenAccordionValue("item-1");
    }
    
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
  
  // When the dialog is told to close, wait for a moment before cleaning up the data.
  // This gives the dialog's exit animation time to complete and prevents race conditions.
  useEffect(() => {
      if (!isLineupBuilderOpen) {
          const timer = setTimeout(() => {
              setLineupMatch(null);
          }, 200);
          return () => clearTimeout(timer);
      }
  }, [isLineupBuilderOpen]);
  
  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  const handleShareMatch = (matchId: string) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('matchId', matchId);
    navigator.clipboard.writeText(url.toString()).then(() => {
      toast({
        title: "Odkaz na zápas zkopírován",
        description: "Nyní ho můžete sdílet s ostatními.",
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se zkopírovat odkaz.",
      });
    });
  };

  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setIsEditDialogOpen(true);
  };
  const handleDeleteMatch = (match: Match) => {
    setSelectedMatch(match);
    setIsDeleteDialogOpen(true);
  };

  const handleRecordResult = (match: Match) => {
    setSelectedMatch(match);
    setIsResultDialogOpen(true);
  }

  const handleBuildLineup = (match: Match) => {
    setLineupMatch(match);
    setIsLineupBuilderOpen(true);
  };

  const handleViewLineup = (match: Match) => {
    if (match.lineup) {
      setLineupMatch(match);
      setViewLineupData(match.lineup);
      setIsLineupViewOpen(true);
    }
  };

  const handleSaveLineup = async (lineupToSave: Lineup) => {
    if (!lineupMatch || !firestore) {
      setIsLineupBuilderOpen(false);
      return;
    };
    const matchRef = doc(firestore, 'matches', lineupMatch.id);
    try {
      await updateDoc(matchRef, { lineup: lineupToSave });
      toast({ title: "Sestava uložena." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chyba', description: `Nepodařilo se uložit sestavu: ${error.message}` });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        operation: 'update', path: matchRef.path, requestResourceData: { lineup: lineupToSave },
      }));
    } finally {
      setIsLineupBuilderOpen(false);
    }
  };

  const confirmDeleteMatch = async () => {
    if (!selectedMatch || !firestore) {
      setIsDeleteDialogOpen(false);
      return;
    };
    
    const matchRef = doc(firestore, 'matches', selectedMatch.id);
    try {
        await deleteDoc(matchRef)
        toast({ title: "Zápas smazán." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se smazat zápas.' });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            operation: 'delete', path: matchRef.path
        }));
    } finally {
        setIsDeleteDialogOpen(false);
        setSelectedMatch(null);
    }
  };

  const handleAttendanceChange = (matchId: string, newStatus: 'going' | 'not-going', note: string) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: "Chyba",
        description: "Uživatel není přihlášen.",
      });
      return Promise.reject(new Error("User not logged in"));
    }

    const attendanceRef = doc(firestore, 'matches', matchId, 'attendees', user.uid);
    const originalAttendance = userAttendances.get(matchId);

    const optimisticData: Partial<Attendance> = { status: newStatus, note: note || '' };
    setOptimisticAttendances(prev => new Map(prev).set(matchId, optimisticData));
    
    const revertOptimisticUpdate = () => {
      setOptimisticAttendances(prev => {
        const newMap = new Map(prev);
        if (originalAttendance) {
          newMap.set(matchId, originalAttendance);
        } else {
           newMap.delete(matchId);
        }
        return newMap;
      });
    };

    const data = {
      userId: user.uid,
      matchId: matchId,
      status: newStatus,
      note: note || '',
    };

    return setDoc(attendanceRef, data, { merge: true }).catch(async (error) => {
      revertOptimisticUpdate();
      toast({ variant: 'destructive', title: "Chyba", description: "Nepodařilo se uložit vaši účast." });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        operation: 'write', path: attendanceRef.path, requestResourceData: data,
      }));
      throw error;
    });
  };

  const handleMatchUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch || !firestore) {
      setIsEditDialogOpen(false);
      return;
    };

    const formData = new FormData(e.currentTarget);
    const timeStr = formData.get('time') as string;
    const dateStr = formData.get('date') as string;
    
    try {
        const newDateTime = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());

        if (isNaN(newDateTime.getTime())) {
            toast({ variant: 'destructive', title: 'Neplatné datum', description: 'Zkontrolujte prosím formát data a času.' });
            return;
        }

        const updatedData = {
            team2: formData.get('opponent') as string,
            location: formData.get('location') as string,
            dateTime: Timestamp.fromDate(newDateTime),
        };
        
        const matchRef = doc(firestore, 'matches', selectedMatch.id);
        await updateDoc(matchRef, updatedData);
        toast({ title: 'Zápas aktualizován' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit zápas.' });
        if(selectedMatch){
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                operation: 'update', path: doc(firestore, 'matches', selectedMatch.id).path, requestResourceData: (error as any).requestResourceData,
            }));
        }
    } finally {
        setIsEditDialogOpen(false);
        setSelectedMatch(null);
    }
  };

  const handleMatchAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) {
        setIsAddDialogOpen(false);
        return;
    };

    const formData = new FormData(e.currentTarget);
    const timeStr = formData.get('time') as string;
    const dateStr = formData.get('date') as string;
    
    try {
      const newDateTime = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());

      if (isNaN(newDateTime.getTime())) {
            toast({ variant: 'destructive', title: 'Neplatné datum', description: 'Zkontrolujte prosím formát data a času.' });
            return;
      }

      const newMatchData = {
          team1: 'Aces',
          team2: formData.get('opponent') as string,
          location: formData.get('location') as string,
          dateTime: Timestamp.fromDate(newDateTime),
          isPlayed: false,
          type: formData.get('type') as 'regular' | 'playoff' | 'friendly',
      };
      
      const matchesCollection = collection(firestore, 'matches')
      await addDoc(matchesCollection, newMatchData)
      toast({ title: 'Zápas přidán.' });
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se přidat zápas.' });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          operation: 'create', path: collection(firestore, 'matches').path, requestResourceData: (error as any).requestResourceData
        }));
    } finally {
        setIsAddDialogOpen(false);
    }
  };

  const handleResultSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch || !firestore || !allSkaterStats || !allAttendances || !allGoalieStats) {
      setIsResultDialogOpen(false);
      return;
    };

    const formData = new FormData(e.currentTarget);
    const team1Score = parseInt(formData.get('team1Score') as string, 10);
    const team2Score = parseInt(formData.get('team2Score') as string, 10);
    const goalieId = formData.get('goalieId') as string;
    const goalieSaves = parseInt(formData.get('goalieSaves') as string, 10) || 0;
    const goalieShotsAgainst = parseInt(formData.get('goalieShotsAgainst') as string, 10) || 0;


    const scorersData = [];
    for (let i = 0; i < team1Score; i++) {
        const goal = formData.get(`goal-${i}`) as string;
        const assist = formData.get(`assist-${i}`) as string;
        if (goal) {
            scorersData.push({
                goal,
                assist: assist && assist !== 'none' ? assist : null,
            });
        }
    }

    const batch = writeBatch(firestore);

    const matchRef = doc(firestore, 'matches', selectedMatch.id);
    batch.update(matchRef, {
        isPlayed: true,
        team1Score,
        team2Score,
        scorers: scorersData,
        goalieId: goalieId && goalieId !== 'none' ? goalieId : null,
        goalieSaves,
        goalieShotsAgainst,
    });

    if (selectedMatch.type !== 'friendly') {
        const skaterGoalsField = selectedMatch.type === 'playoff' ? 'playoffGoals' : 'seasonGoals';
        const skaterAssistsField = selectedMatch.type === 'playoff' ? 'playoffAssists' : 'seasonAssists';
        const skaterGamesPlayedField = selectedMatch.type === 'playoff' ? 'playoffGamesPlayed' : 'seasonGamesPlayed';

        const playerStatUpdates = new Map<string, { goals: number, assists: number }>();
        scorersData.forEach(s => {
            if (s.goal) {
                const current = playerStatUpdates.get(s.goal) || { goals: 0, assists: 0 };
                playerStatUpdates.set(s.goal, { ...current, goals: current.goals + 1 });
            }
            if (s.assist) {
                const current = playerStatUpdates.get(s.assist) || { goals: 0, assists: 0 };
                playerStatUpdates.set(s.assist, { ...current, assists: current.assists + 1 });
            }
        });

        const allSkaterStatsMap = new Map(allSkaterStats.map(s => [s.userProfileId, s]));

        for (const [userId, updates] of playerStatUpdates.entries()) {
            const userStats = allSkaterStatsMap.get(userId);
            if (userStats) {
                const statDocRef = doc(firestore, 'users', userId, 'skaterStats', userStats.id);
                const update: any = {};
                update[skaterGoalsField] = (userStats[skaterGoalsField] || 0) + updates.goals;
                update[skaterAssistsField] = (userStats[skaterAssistsField] || 0) + updates.assists;
                batch.update(statDocRef, update);
            }
        }

        const matchAttendees = attendancesByMatch.get(selectedMatch.id) || [];
        matchAttendees.forEach(att => {
            if (att.status !== 'going') return;
            const userForStat = allUsers?.find(u => u.id === att.userId);
            if (userForStat?.playerType === 'player') {
                const userStats = allSkaterStatsMap.get(att.userId);
                if (userStats) {
                    const statDocRef = doc(firestore, 'users', att.userId, 'skaterStats', userStats.id);
                    batch.update(statDocRef, { [skaterGamesPlayedField]: (userStats[skaterGamesPlayedField] || 0) + 1 });
                }
            }
        });
        
        if (goalieId && goalieId !== 'none') {
            const allGoalieStatsMap = new Map(allGoalieStats.map(s => [s.userProfileId, s]));
            const goalieStats = allGoalieStatsMap.get(goalieId);
            const isWin = team1Score > team2Score;
            
            const goalieGamesPlayedField = selectedMatch.type === 'playoff' ? 'playoffGamesPlayed' : 'seasonGamesPlayed';
            const goalieWinsField = selectedMatch.type === 'playoff' ? 'playoffWins' : 'seasonWins';
            const goalieSavesField = selectedMatch.type === 'playoff' ? 'playoffSaves' : 'seasonSaves';
            const goalieShotsAgainstField = selectedMatch.type === 'playoff' ? 'playoffShotsAgainst' : 'seasonShotsAgainst';
            
            if (goalieStats) {
                const statDocRef = doc(firestore, 'users', goalieId, 'goalieStats', goalieStats.id);
                const update: any = {
                    [goalieGamesPlayedField]: (goalieStats[goalieGamesPlayedField] || 0) + 1,
                    [goalieWinsField]: (goalieStats[goalieWinsField] || 0) + (isWin ? 1 : 0),
                    [goalieSavesField]: (goalieStats[goalieSavesField] || 0) + goalieSaves,
                    [goalieShotsAgainstField]: (goalieStats[goalieShotsAgainstField] || 0) + goalieShotsAgainst,
                };
                batch.update(statDocRef, update);
            } else {
                // Create new goalie stats doc if it doesn't exist
                 const statDocRef = doc(firestore, 'users', goalieId, 'goalieStats', 'stats');
                 batch.set(statDocRef, {
                    userProfileId: goalieId,
                    seasonGamesPlayed: selectedMatch.type !== 'playoff' ? 1 : 0,
                    seasonWins: selectedMatch.type !== 'playoff' && isWin ? 1 : 0,
                    seasonSaves: selectedMatch.type !== 'playoff' ? goalieSaves : 0,
                    seasonShotsAgainst: selectedMatch.type !== 'playoff' ? goalieShotsAgainst : 0,
                    playoffGamesPlayed: selectedMatch.type === 'playoff' ? 1 : 0,
                    playoffWins: selectedMatch.type === 'playoff' && isWin ? 1 : 0,
                    playoffSaves: selectedMatch.type === 'playoff' ? goalieSaves : 0,
                    playoffShotsAgainst: selectedMatch.type === 'playoff' ? goalieShotsAgainst : 0,
                    historicalGamesPlayed: 0,
                    historicalWins: 0,
                    historicalSaves: 0,
                    historicalShotsAgainst: 0
                 });
            }
        }
    }

    try {
        await batch.commit();
        toast({ title: "Výsledek uložen", description: "Statistiky hráčů byly aktualizovány." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Chyba', description: `Nepodařilo se uložit výsledek: ${error.message}` });
    } finally {
        setIsResultDialogOpen(false);
        setSelectedMatch(null);
    }
};

  const handleEditLeagueClick = () => {
    setEditableLeagueStandings(JSON.parse(JSON.stringify(leagueStandings)));
    setEditableIsPlayoffEnabled(isPlayoffEnabled);
    setEditablePlayoffSeries(playoffSeries.map(s => ({...s})));
    setIsLeagueEditMode(true);
  };

  const handleSaveLeague = async () => {
    if (!firestore) {
        setIsLeagueEditMode(false);
        return;
    };
    
    let seriesToSave = editablePlayoffSeries;
    if (editableIsPlayoffEnabled && seriesToSave.length === 0) {
        seriesToSave = [{ round: 'Čtvrtfinále', opponent: 'TBD', wins: 0, losses: 0 }];
    }

    const updatedSettings = {
        isPlayoffEnabled: editableIsPlayoffEnabled,
        playoffSeries: seriesToSave,
        leagueStandings: editableLeagueStandings,
    };

    try {
        const settingsRef = doc(firestore, 'settings', 'league');
        await setDoc(settingsRef, updatedSettings, { merge: true });
        toast({ title: 'Nastavení ligy uloženo.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit nastavení ligy.' });
        const settingsRef = doc(firestore, 'settings', 'league');
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            operation: 'write', path: settingsRef.path, requestResourceData: updatedSettings,
        }));
    } finally {
        setIsLeagueEditMode(false);
    }
  };

  const handleCancelLeague = () => {
    setIsLeagueEditMode(false);
  };
  
  const handleTeamNameChange = (teamId: string, newName: string) => {
    setEditableLeagueStandings(current => current.map(t => 
        t.id === teamId ? { ...t, name: newName } : t
    ));
  };

  const handleDeleteTeam = (teamId: string) => {
    setEditableLeagueStandings(current => current.filter(t => t.id !== teamId));
  };

  const handleAddNewTeam = () => {
    setEditableLeagueStandings(current => [
        ...current,
        {
            id: crypto.randomUUID(),
            name: 'Nový tým',
            points: 0,
            gf: 0,
            ga: 0,
        }
    ]);
  };


  const handleLeagueChange = (teamId: string, stat: 'points' | 'gf' | 'ga', delta: number) => {
    setEditableLeagueStandings(currentStandings =>
      currentStandings.map(t => {
        if (t.id === teamId) {
          const newStatValue = t[stat] + delta;
          return {
            ...t,
            [stat]: Math.max(0, newStatValue),
          };
        }
        return t;
      })
    );
  };

  const handlePlayoffOpponentChange = (index: number, newOpponent: string) => {
      setEditablePlayoffSeries(currentSeries => {
          const newSeries = [...currentSeries];
          newSeries[index] = { ...newSeries[index], opponent: newOpponent };
          return newSeries;
      });
  };

  const handlePlayoffScoreChange = (index: number, field: 'wins' | 'losses', delta: number) => {
      setEditablePlayoffSeries(currentSeries => {
          const newSeries = [...currentSeries];
          const seriesItem = { ...newSeries[index] };
          
          seriesItem[field] = Math.max(0, seriesItem[field] + delta);
          
          if (field === 'wins' && seriesItem.wins >= 3 && seriesItem.round !== 'Vítěz') {
              if (seriesItem.round === 'Čtvrtfinále') {
                  seriesItem.round = 'Semifinále';
                  seriesItem.opponent = 'TBD';
                  seriesItem.wins = 0;
                  seriesItem.losses = 0;
              } else if (seriesItem.round === 'Semifinále') {
                  seriesItem.round = 'Finále';
                  seriesItem.opponent = 'TBD';
                  seriesItem.wins = 0;
                  seriesItem.losses = 0;
              } else if (seriesItem.round === 'Finále') {
                   seriesItem.round = 'Vítěz';
                   seriesItem.opponent = '';
                   seriesItem.wins = 3;
              }
          }
          
          newSeries[index] = seriesItem;
          return newSeries;
      });
  };
  
  const fallback = userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? ''
  
  const renderMatchCard = (match: Match) => {
    const opponent = match.team1 === 'Aces' ? match.team2 : match.team1;
    const attendance = userAttendancesWithOptimistic.get(match.id)?.status;
    const attendeesForMatch = (attendancesByMatch.get(match.id) || []);
    const attendeeCount = attendeesForMatch.filter(a => a.status === 'going').length;
    const sortedAttendees = [
        ...attendeesForMatch.filter(att => att.status === 'going'),
        ...attendeesForMatch.filter(att => att.status === 'not-going'),
    ];

    return (
        <Card id={`match-${match.id}`} className={cn("w-full transition-all", highlightedMatchId === match.id && 'animate-highlight-card')}>
                <CardHeader className="flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl break-words pr-2">{opponent}</CardTitle>
                        <CardDescription className="font-semibold pt-1">{format(match.dateTime.toDate(), "EEEE, d. M. yyyy, HH:mm", { locale: cs })}</CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => handleShareMatch(match.id)}>
                                <Share2 className="mr-2 h-4 w-4" /> Sdílet
                            </DropdownMenuItem>
                            {userProfile?.role === 'admin' && (
                                <>
                                    <DropdownMenuItem onClick={() => handleBuildLineup(match)}>
                                        <FileText className="mr-2 h-4 w-4" /> Tvořit/Upravit sestavu
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRecordResult(match)}>
                                        <ClipboardEdit className="mr-2 h-4 w-4" /> Zapsat výsledek
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditMatch(match)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Upravit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteMatch(match)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Smazat
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                        <MapPin className="h-4 w-4 shrink-0 text-primary"/>
                        <span className="truncate">{match.location}</span>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                    <div className="flex w-full flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-2">
                            <Button
                                variant={attendance === 'going' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    setAttendanceData({ matchId: match.id, status: 'going' });
                                    const currentNote = userAttendances.get(match.id)?.note || '';
                                    setAttendanceNote(currentNote);
                                    setIsAttendanceDialogOpen(true);
                                }}
                                className={cn('text-xs sm:text-sm', attendance === 'going' && "bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 dark:border-green-400 hover:bg-green-500/20 hover:text-green-600")}
                            >
                                <Check className="h-4 w-4 mr-1 sm:mr-2" /> Jdu
                            </Button>
                            <Button
                                variant={attendance === 'not-going' ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    setAttendanceData({ matchId: match.id, status: 'not-going' });
                                    const currentNote = userAttendances.get(match.id)?.note || '';
                                    setAttendanceNote(currentNote);
                                    setIsAttendanceDialogOpen(true);
                                }}
                                className={cn('text-xs sm:text-sm', attendance === 'not-going' && "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20 hover:text-destructive")}
                            >
                                <X className="h-4 w-4 mr-1 sm:mr-2" /> Nejdu
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            {match.lineup && (
                                <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => handleViewLineup(match)}>
                                    <View className="mr-1 sm:mr-2" /> Sestava
                                </Button>
                            )}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                                        <Users className="mr-1 sm:mr-2" />
                                        Účast: {attendeeCount}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Přihlášení na zápas</DialogTitle>
                                        <DialogDescription>
                                            {match.team1} vs {match.team2} - {format(match.dateTime.toDate(), "d. MMMM yyyy", { locale: cs })}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[400px] overflow-y-auto pr-4 space-y-4">
                                        {sortedAttendees.length > 0 ? sortedAttendees.map(att => {
                                            const attendeeProfile = usersMap.get(att.userId);
                                            if (!attendeeProfile) return null;
                                            const isGoing = att.status === 'going';
                                            return (
                                                <div 
                                                    key={att.userId} 
                                                    className={cn(
                                                        "flex items-center gap-4 p-2 rounded-lg border-2 transition-colors",
                                                        isGoing 
                                                            ? "border-green-500 bg-green-500/10" 
                                                            : "border-destructive bg-destructive/10"
                                                    )}
                                                >
                                                    <Avatar>
                                                        <AvatarImage src={attendeeProfile.photoURL ?? `https://picsum.photos/seed/${attendeeProfile.email}/100/100`} data-ai-hint="player portrait" alt={attendeeProfile.name} />
                                                        <AvatarFallback>{attendeeProfile.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{attendeeProfile.name}</p>
                                                        {attendeeProfile.jerseyNumber && <p className="text-sm text-muted-foreground">#{attendeeProfile.jerseyNumber}</p>}
                                                        {att.note && <p className="text-sm text-muted-foreground italic mt-1">"{att.note}"</p>}
                                                    </div>
                                                    {isGoing 
                                                        ? <Check className="h-6 w-6 text-green-500" /> 
                                                        : <X className="h-6 w-6 text-destructive" />
                                                    }
                                                </div>
                                            )
                                        }) : <p className="text-muted-foreground">Zatím nikdo neodpověděl.</p>}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardFooter>
            </Card>
    );
  };


  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-3">
        
        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={userProfile?.photoURL ?? `https://picsum.photos/seed/${userProfile?.email}/400/400`} alt={userProfile?.name ?? ''} data-ai-hint="player portrait" />
              <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl md:text-3xl font-headline">{userProfile?.name}</CardTitle>
            {userProfile?.jerseyNumber && <CardDescription className="text-primary font-bold text-4xl md:text-5xl font-mono mt-2">#{userProfile.jerseyNumber}</CardDescription>}
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><BarChart className="text-primary"/>Moje statistiky</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={myStatsView} onValueChange={(value) => setMyStatsView(value as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="season">Sezóna</TabsTrigger>
                        <TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger>
                        <TabsTrigger value="history">Historie</TabsTrigger>
                    </TabsList>
                    <div className="mt-4">
                        {stats.length > 0 ? (
                             <Table>
                                <TableBody>
                                    {stats.map(stat => (
                                    <TableRow key={stat.metric}>
                                        <TableCell className="font-medium text-base">{stat.metric}</TableCell>
                                        <TableCell className="text-right font-mono text-lg font-bold">{stat.value}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">Pro vaši roli se nezaznamenávají statistiky.</p>
                        )}
                    </div>
                </Tabs>
            </CardContent>
        </Card>

        <div className="lg:col-span-3" ref={upcomingMatchesRef}>
          <div className="flex flex-row items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-headline text-xl font-semibold"><Trophy className="text-primary"/>Příští zápas</h2>
            {userProfile?.role === 'admin' && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Přidat zápas
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Přidat nový zápas</DialogTitle>
                      <DialogDescription>
                        Zadejte podrobnosti o nadcházejícím zápase.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleMatchAdd}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="opponent-add" className="text-right">Soupeř</Label>
                          <Input id="opponent-add" name="opponent" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="date-add" className="text-right">Datum</Label>
                          <Input id="date-add" name="date" type="date" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="time-add" className="text-right">Čas</Label>
                          <Input id="time-add" name="time" type="time" defaultValue="18:00" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="location-add" className="text-right">Místo</Label>
                          <Input id="location-add" name="location" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type-add" className="text-right">Typ zápasu</Label>
                            <Select name="type" required defaultValue="regular">
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Vyberte typ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regular">Základní část</SelectItem>
                                    <SelectItem value="playoff">Play-off</SelectItem>
                                    <SelectItem value="friendly">Přátelský</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Uložit zápas</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
          </div>
          
            {nextMatch ? (
                 <div className="w-full">
                    {renderMatchCard(nextMatch)}
                </div>
            ) : (
                <Card><CardContent className="pt-6">Žádný nadcházející zápas.</CardContent></Card>
            )}

            {otherUpcomingMatches && otherUpcomingMatches.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-4" value={openAccordionValue} onValueChange={setOpenAccordionValue}>
                    <AccordionItem value="item-1" className="border-none">
                        <AccordionTrigger className="rounded-lg border bg-card text-card-foreground shadow-sm px-4 py-3 hover:no-underline font-medium">Další zápasy</AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <div className="space-y-4">
                                {otherUpcomingMatches.map(match => (
                                    renderMatchCard(match)
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

        </div>

        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><History className="text-primary"/>Historie zápasů</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Prohlédněte si výsledky a statistiky již odehraných zápasů.</p>
            </CardContent>
            <CardFooter>
                <Button asChild>
                    <Link href="/dashboard/history">Zobrazit historii</Link>
                </Button>
            </CardFooter>
        </Card>

        <div className="lg:col-span-3 grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline"><Flame className="text-primary"/>Kanadské bodování</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={scoringView} onValueChange={(value) => setScoringView(value as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="season">Sezóna</TabsTrigger>
                            <TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger>
                            <TabsTrigger value="history">Historie</TabsTrigger>
                        </TabsList>
                        <div className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[20px] px-1 sm:px-4">#</TableHead>
                                        <TableHead>Hráč</TableHead>
                                        <TableHead className="text-center w-[40px] px-1 sm:px-4">Z</TableHead>
                                        <TableHead className="text-center w-[40px] px-1 sm:px-4">G</TableHead>
                                        <TableHead className="text-center w-[40px] px-1 sm:px-4">A</TableHead>
                                        <TableHead className="text-right w-[40px] px-1 sm:px-4">B</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedTeamScoring.map((player) => (
                                        <TableRow key={player.id}>
                                            <TableCell className="font-medium px-1 sm:px-4">{player.rank}</TableCell>
                                            <TableCell className="py-2 px-1 sm:px-4">{player.name}</TableCell>
                                            <TableCell className="text-center font-mono py-2 px-1 sm:px-4">{player.gamesPlayed}</TableCell>
                                            <TableCell className="text-center font-mono py-2 px-1 sm:px-4">{player.goals}</TableCell>
                                            <TableCell className="text-center font-mono py-2 px-1 sm:px-4">{player.assists}</TableCell>
                                            <TableCell className="text-right font-mono font-bold py-2 px-1 sm:px-4">{player.points}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                     <div>
                        <CardTitle className="flex items-center gap-2 font-headline"><Shield className="text-primary"/>Statistiky brankářů</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={scoringView} onValueChange={(value) => setScoringView(value as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="season">Sezóna</TabsTrigger>
                            <TabsTrigger value="playoff" disabled={!isScoringInPlayoffMode}>Play-off</TabsTrigger>
                            <TabsTrigger value="history">Historie</TabsTrigger>
                        </TabsList>
                        <div className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Brankář</TableHead>
                                        <TableHead className="text-center">Z</TableHead>
                                        <TableHead className="text-center">V</TableHead>
                                        <TableHead className="text-center hidden sm:table-cell">Střely</TableHead>
                                        <TableHead className="text-center hidden sm:table-cell">Zásahy</TableHead>
                                        <TableHead className="text-right">Úsp%</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedGoalieLeaderboard.map((goalie) => (
                                        <TableRow key={goalie.id}>
                                            <TableCell className="font-medium py-2 px-1 sm:px-4">{goalie.name}</TableCell>
                                            <TableCell className="text-center font-mono py-2 px-1 sm:px-4">{goalie.gamesPlayed}</TableCell>
                                            <TableCell className="text-center font-mono py-2 px-1 sm:px-4">{goalie.wins}</TableCell>
                                            <TableCell className="text-center font-mono hidden sm:table-cell py-2 px-1 sm:px-4">{goalie.shotsAgainst}</TableCell>
                                            <TableCell className="text-center font-mono hidden sm:table-cell py-2 px-1 sm:px-4">{goalie.saves}</TableCell>
                                            <TableCell className="text-right font-mono font-bold py-2 px-1 sm:px-4">{goalie.savePercentage.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
         <div className="lg:col-span-3 mt-8">
            <Card>
                <CardHeader className="flex-row items-start justify-between">
                     <div>
                        <CardTitle className="flex items-center gap-2 font-headline"><Shield className="text-primary"/>Tabulka soutěže</CardTitle>
                        {isLeagueEditMode && userProfile?.role === 'admin' && (
                            <div className="flex items-center space-x-2 mt-4">
                                <Switch
                                    id="playoff-switch"
                                    checked={editableIsPlayoffEnabled}
                                    onCheckedChange={(checked) => {
                                        setEditableIsPlayoffEnabled(checked);
                                        if (checked && editablePlayoffSeries.length === 0) {
                                            setEditablePlayoffSeries([{ round: 'Čtvrtfinále', opponent: 'TBD', wins: 0, losses: 0 }]);
                                        }
                                    }}
                                />
                                <Label htmlFor="playoff-switch">Povolit zobrazení Play-off</Label>
                            </div>
                        )}
                    </div>
                    
                    {userProfile?.role === 'admin' && (
                      <div className="flex gap-2">
                        {isLeagueEditMode ? (
                          <>
                            <Button variant="outline" onClick={handleCancelLeague}>Zrušit</Button>
                            <Button onClick={handleSaveLeague}>Uložit</Button>
                          </>
                        ) : (
                          <Button variant="outline" size="icon" onClick={handleEditLeagueClick}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Upravit tabulku</span>
                          </Button>
                        )}
                      </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Tabs value={leagueView} onValueChange={(value) => setLeagueView(value as 'regular' | 'playoff')} className="w-full">
                        {isPlayoffEnabled && (
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="regular">Základní část</TabsTrigger>
                                <TabsTrigger value="playoff">Play-off</TabsTrigger>
                            </TabsList>
                        )}
                        <TabsContent value="regular" className={cn(!isPlayoffEnabled ? 'block' : (leagueView !== 'regular' && 'hidden'))}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-auto px-2 sm:px-4">#</TableHead>
                                        <TableHead>Tým</TableHead>
                                        <TableHead className="text-center hidden sm:table-cell">GF</TableHead>
                                        <TableHead className="text-center hidden sm:table-cell">GA</TableHead>
                                        <TableHead className="text-center w-auto px-2 sm:px-4">B</TableHead>
                                        {isLeagueEditMode && <TableHead className="w-[50px]"><span className="sr-only">Akce</span></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedLeagueStandings.map((team) => (
                                        <TableRow key={team.id} className={team.name === 'Aces' ? 'bg-primary/10' : ''}>
                                            <TableCell className="font-medium px-2 sm:px-4">{team.rank}</TableCell>
                                            <TableCell>
                                                {isLeagueEditMode ? (
                                                    <Input value={team.name} onChange={(e) => handleTeamNameChange(team.id, e.target.value)} className="h-8" />
                                                ) : ( team.name )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono hidden sm:table-cell">
                                                {isLeagueEditMode ? (
                                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.id, 'gf', -1)}><Minus className="h-4 w-4" /></Button>
                                                        <span className="w-8 text-center">{team.gf}</span>
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.id, 'gf', 1)}><Plus className="h-4 w-4" /></Button>
                                                    </div>
                                                ) : ( team.gf )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono hidden sm:table-cell">
                                                {isLeagueEditMode ? (
                                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.id, 'ga', -1)}><Minus className="h-4 w-4" /></Button>
                                                        <span className="w-8 text-center">{team.ga}</span>
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.id, 'ga', 1)}><Plus className="h-4 w-4" /></Button>
                                                    </div>
                                                ) : ( team.ga )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono px-2 sm:px-4">
                                                {isLeagueEditMode ? (
                                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.id, 'points', -1)}><Minus className="h-4 w-4" /></Button>
                                                        <span className="w-8 text-center">{team.points}</span>
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.id, 'points', 1)}><Plus className="h-4 w-4" /></Button>
                                                    </div>
                                                ) : ( <span className="font-bold">{team.points}</span> )}
                                            </TableCell>
                                            {isLeagueEditMode && (
                                                <TableCell className="px-2 sm:px-4 text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(team.id)} disabled={team.name === 'Aces'}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                             {isLeagueEditMode && (
                                <div className="mt-4">
                                    <Button variant="outline" onClick={handleAddNewTeam}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Přidat tým
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                         <TabsContent value="playoff" className={cn(leagueView !== 'playoff' && 'hidden')}>
                          {(() => {
                              const seriesData = isLeagueEditMode ? editablePlayoffSeries : playoffSeries;
                              if (!isPlayoffEnabled || seriesData.length === 0) {
                                return <p className="text-muted-foreground text-center py-4">Play-off zatím nezačalo.</p>
                              }
                              return seriesData.map((series, index) => (
                                  <div key={index} className="p-4 border rounded-lg mb-4 last:mb-0">
                                      <div className="flex justify-between items-center mb-2">
                                          <h4 className="font-bold text-lg">{series.round}</h4>
                                          {series.round === 'Vítěz' && <Trophy className="h-6 w-6 text-yellow-400" />}
                                      </div>
                                      {series.round !== 'Vítěz' ? (
                                          <>
                                              <div className="flex justify-between items-center mb-4">
                                                  <span className="text-muted-foreground">Soupeř</span>
                                                  {isLeagueEditMode ? (
                                                      <Input 
                                                          className="w-1/2 text-right"
                                                          value={series.opponent} 
                                                          onChange={(e) => handlePlayoffOpponentChange(index, e.target.value)} />
                                                  ) : (
                                                      <span className="font-medium">{series.opponent}</span>
                                                  )}
                                              </div>
                                              <div className="flex justify-between items-center">
                                                  <span className="text-muted-foreground">Stav série</span>
                                                  <div className="flex items-center gap-2 font-mono font-bold text-xl">
                                                      {isLeagueEditMode ? (
                                                          <>
                                                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayoffScoreChange(index, 'wins', -1)}><Minus className="h-4 w-4" /></Button>
                                                              <span>{series.wins}</span>
                                                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayoffScoreChange(index, 'wins', 1)}><Plus className="h-4 w-4" /></Button>
                                                              <span className="px-2">:</span>
                                                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayoffScoreChange(index, 'losses', -1)}><Minus className="h-4 w-4" /></Button>
                                                              <span>{series.losses}</span>
                                                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePlayoffScoreChange(index, 'losses', 1)}><Plus className="h-4 w-4" /></Button>
                                                          </>
                                                      ) : (
                                                          <span>{series.wins} : {series.losses}</span>
                                                      )}
                                                  </div>
                                              </div>
                                          </>
                                      ) : (
                                          <p className="text-center text-xl font-bold text-primary">Mistři!</p>
                                      )}
                                  </div>
                              ));
                          })()}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setIsEditDialogOpen(isOpen); if (!isOpen) setSelectedMatch(null); }}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Upravit zápas</DialogTitle>
                  <DialogDescription>
                      Změňte podrobnosti o nadcházejícím zápase.
                  </DialogDescription>
              </DialogHeader>
              {selectedMatch && <form onSubmit={handleMatchUpdate}>
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="opponent" className="text-right">Soupeř</Label>
                          <Input id="opponent" name="opponent" defaultValue={selectedMatch.team1 === 'Aces' ? selectedMatch.team2 : selectedMatch.team1} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="date-edit" className="text-right">Datum</Label>
                          <Input id="date-edit" name="date" type="date" defaultValue={format(selectedMatch.dateTime.toDate(), 'yyyy-MM-dd')} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="time" className="text-right">Čas</Label>
                          <Input id="time" name="time" type="time" defaultValue={format(selectedMatch.dateTime.toDate(), 'HH:mm')} className="col-span-3" required/>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="location" className="text-right">Místo</Label>
                          <Input id="location" name="location" defaultValue={selectedMatch.location} className="col-span-3" />
                      </div>
                  </div>
                  <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Zrušit</Button>
                      <Button type="submit">Uložit změny</Button>
                  </DialogFooter>
              </form>}
          </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tento zápas?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Záznam o zápase bude trvale odstraněn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMatch} className="bg-destructive hover:bg-destructive/90">Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isResultDialogOpen} onOpenChange={(isOpen) => { setIsResultDialogOpen(isOpen); if (!isOpen) setSelectedMatch(null); }}>
          <DialogContent className="max-w-md">
              {selectedMatch && allUsers && <RecordResultForm match={selectedMatch} allUsers={allUsers} onSave={handleResultSave} onCancel={() => setIsResultDialogOpen(false)} />}
          </DialogContent>
      </Dialog>
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Potvrdit účast</DialogTitle>
                  <DialogDescription>
                      Můžete přidat volitelnou poznámku ke své účasti.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <Label htmlFor="attendance-note">Poznámka</Label>
                  <Textarea
                      id="attendance-note"
                      value={attendanceNote}
                      onChange={(e) => setAttendanceNote(e.target.value)}
                      placeholder="Např. přijdu později, bolí mě noha..."
                  />
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>Zrušit</Button>
                  <Button onClick={async () => {
                      if (attendanceData) {
                          try {
                            await handleAttendanceChange(attendanceData.matchId, attendanceData.status, attendanceNote);
                          } finally {
                            setIsAttendanceDialogOpen(false);
                            setAttendanceNote('');
                          }
                      } else {
                        setIsAttendanceDialogOpen(false);
                        setAttendanceNote('');
                      }
                  }}>
                      Potvrdit
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

        <Dialog open={isLineupBuilderOpen} onOpenChange={setIsLineupBuilderOpen}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                 {lineupMatch && allUsers ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Tvorba sestavy: {lineupMatch.team1} vs {lineupMatch.team2}</DialogTitle>
                            <DialogDescription>
                                Přetáhněte hráče na jejich pozice na hřišti.
                            </DialogDescription>
                        </DialogHeader>
                        <LineupBuilder
                            players={allUsers.filter(u => (attendancesByMatch.get(lineupMatch.id) || []).some(a => a.userId === u.id && a.status === 'going'))}
                            initialData={lineupMatch.lineup}
                            onSave={handleSaveLineup}
                            onCancel={() => setIsLineupBuilderOpen(false)}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
        <Dialog open={isLineupViewOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
              setViewLineupData(null);
              setLineupMatch(null);
            }
            setIsLineupViewOpen(isOpen);
        }}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>{lineupMatch ? `Sestava: ${lineupMatch.team1} vs ${lineupMatch.team2}` : 'Načítání sestavy...'}</DialogTitle>
                    {lineupMatch && <DialogDescription>Uložená sestava pro nadcházející zápas.</DialogDescription>}
                </DialogHeader>
                {viewLineupData ? (
                    <LineupDisplay lineup={viewLineupData} />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="px-4 sm:px-6 py-8">Načítání...</div>}>
      <DashboardPageContent />
    </Suspense>
  )
}
