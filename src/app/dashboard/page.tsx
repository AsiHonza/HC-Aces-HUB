'use client'

import { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, MapPin, Users, Trophy, BarChart, Sword, Pencil, Check, X, Flame, Shield, Plus, Minus, Loader2, Trash2, ClipboardEdit, History, Share2, MoreHorizontal } from "lucide-react"
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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'


// Types based on backend.json
interface UserProfile {
  id: string;
  name: string;
  email: string;
  jerseyNumber?: number;
  phoneNumber?: string;
  role: 'admin' | 'classic';
}

interface PlayerStats {
  id: string; // Document ID from playerStats subcollection
  userProfileId: string;
  goals: number;
  assists: number;
  gamesPlayed: number;
}

interface Match {
  id: string;
  dateTime: Timestamp;
  location: string;
  team1: string;
  team2: string;
  isPlayed: boolean;
  team1Score?: number;
  team2Score?: number;
  scorers?: { goal: string; assist: string | null }[];
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

interface AppSettings {
  isPlayoffEnabled: boolean;
  playoffSeries: PlayoffSeries[];
}

function RecordResultForm({ match, allUsers, onSave, onCancel }: { match: Match, allUsers: UserProfile[], onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>, onCancel: () => void }) {
    const [goalCount, setGoalCount] = useState(0)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        await onSave(e);
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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
                                {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select name={`assist-${index}`}>
                            <SelectTrigger>
                                <SelectValue placeholder="Asistence" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Žádná</SelectItem>
                                {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Zrušit</Button>
                <Button type="submit">Uložit výsledek</Button>
            </DialogFooter>
        </form>
    )
}

function DashboardPageContent() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const [isScoringEditMode, setIsScoringEditMode] = useState(false);
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
  const [editableIsPlayoffEnabled, setEditableIsPlayoffEnabled] = useState(false);

  // Fetch current user's profile and stats
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

  const playerStatsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'playerStats') : null, [firestore, user]);
  const { data: playerStatsData, isLoading: isPlayerStatsLoading } = useCollection<PlayerStats>(playerStatsCollectionRef);
  const playerStats = useMemo(() => playerStatsData?.[0], [playerStatsData]);

  // Fetch matches
  const matchesQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'matches'), orderBy('dateTime', 'asc'));
  }, [firestore, user]);
  const { data: allMatches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);
  
  const upcomingMatches = useMemo(() => {
    if (!allMatches || !user) return [];
    return allMatches
      .filter(match => !match.isPlayed);
  }, [allMatches, user]);

  const nextMatch = useMemo(() => upcomingMatches?.[0], [upcomingMatches]);
  const otherUpcomingMatches = useMemo(() => upcomingMatches?.slice(1) || [], [upcomingMatches]);
  
  // Fetch all users and stats for leaderboard
  const usersRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'users'): null, [firestore, user]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersRef);

  const allStatsRef = useMemoFirebase(() => firestore && user ? collectionGroup(firestore, 'playerStats'): null, [firestore, user]);
  const { data: allStats, isLoading: areStatsLoading } = useCollection<PlayerStats>(allStatsRef);

  // Fetch attendances for upcoming matches
    const attendancesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collectionGroup(firestore, 'attendees'));
    }, [firestore, user]);
    const { data: allAttendances, isLoading: attendancesLoading } = useCollection<Attendance>(attendancesQuery);

    const leagueSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'league') : null, [firestore]);
    const { data: leagueSettings, isLoading: leagueSettingsLoading } = useDoc<AppSettings>(leagueSettingsRef);

    const isPlayoffEnabled = leagueSettings?.isPlayoffEnabled ?? false;
    const playoffSeries = leagueSettings?.playoffSeries ?? [];

  const teamScoring = useMemo(() => {
    if (!allUsers || !allStats) return [];
    
    const statsMap = new Map<string, PlayerStats>();
    allStats.forEach(stat => statsMap.set(stat.userProfileId, stat));

    return allUsers.map(u => {
      const stats = statsMap.get(u.id);
      return {
        id: u.id,
        name: u.name,
        goals: stats?.goals ?? 0,
        assists: stats?.assists ?? 0,
        points: (stats?.goals ?? 0) + (stats?.assists ?? 0),
      };
    });
  }, [allUsers, allStats]);
  
  const [leagueStandings, setLeagueStandings] = useState([
    { rank: 1, name: 'Aces', points: 45, gf: 120, ga: 85 },
    { rank: 2, name: 'HC Draci', points: 42, gf: 115, ga: 90 },
    { rank: 3, name: 'Rytíři', points: 38, gf: 100, ga: 95 },
    { rank: 4, name: 'Kometa', points: 35, gf: 95, ga: 105 },
    { rank: 5, name: 'Lvi', points: 30, gf: 90, ga: 110 },
  ]);
  const [editableLeagueStandings, setEditableLeagueStandings] = useState(leagueStandings);

  const scoringData = isScoringEditMode ? editableScoring : teamScoring;
  const sortedTeamScoring = useMemo(() => [...scoringData]
    .sort((a, b) => b.points - a.points)
    .map((player, index) => ({ ...player, rank: index + 1 })), [scoringData]);
  
  const leagueData = isLeagueEditMode ? editableLeagueStandings : leagueStandings;
  const sortedLeagueStandings = useMemo(() => [...leagueData]
    .sort((a, b) => b.points - a.points)
    .map((team, index) => ({ ...team, rank: index + 1 })), [leagueData]);

  const [editableScoring, setEditableScoring] = useState(teamScoring);

  const attendancesByMatch = useMemo(() => {
    if (!allAttendances) return new Map<string, Attendance[]>();
    const map = new Map<string, Attendance[]>();
    allAttendances.forEach(att => {
        if (!map.has(att.matchId)) {
            map.set(att.matchId, []);
        }
        map.get(att.matchId)!.push(att);
    });
    return map;
  }, [allAttendances]);

  const userAttendances = useMemo(() => {
    if (!allAttendances || !user) return new Map<string, Attendance>();
    const map = new Map<string, Attendance>();
    allAttendances.filter(att => att.userId === user.uid).forEach(att => {
        map.set(att.matchId, att);
    });
    return map;
  }, [allAttendances, user]);

  const userAttendancesWithOptimistic = useMemo(() => {
      const merged = new Map(userAttendances);
      optimisticAttendances.forEach((optimisticAtt, matchId) => {
          if (optimisticAtt.status === 'unknown') { 
              merged.delete(matchId);
          } else {
              const existingAtt = merged.get(matchId) || { id: user!.uid, userId: user!.uid, matchId: matchId };
              merged.set(matchId, { 
                  ...existingAtt, 
                  ...optimisticAtt,
              } as Attendance);
          }
      });
      return merged;
  }, [userAttendances, optimisticAttendances, user]);


  useEffect(() => {
    // When fresh data arrives from Firestore, clear any optimistic updates
    setOptimisticAttendances(new Map());
  }, [allAttendances]);

  useEffect(() => {
    const matchId = searchParams.get('matchId');
    if (!matchId || !upcomingMatches || upcomingMatches.length === 0) return;

    const isOtherMatch = otherUpcomingMatches.some(m => m.id === matchId);
    if (isOtherMatch) {
        setOpenAccordionValue("item-1");
    }
    
    // Using a timeout to allow the accordion to render and open before scrolling
    setTimeout(() => {
        const element = document.getElementById(`match-${matchId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMatchId(matchId);

            setTimeout(() => {
                setHighlightedMatchId(null);
                // Clear the matchId from URL without reloading
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('matchId');
                window.history.replaceState({}, '', newUrl);
            }, 2500);
        }
    }, 200);

  }, [upcomingMatches, otherUpcomingMatches, searchParams]);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<string, UserProfile>();
    return new Map(allUsers.map(u => [u.id, u]));
  }, [allUsers]);
  

  const isLoading = isUserLoading || isUserProfileLoading || isPlayerStatsLoading || areMatchesLoading || areUsersLoading || areStatsLoading || attendancesLoading || leagueSettingsLoading;

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

  const confirmDeleteMatch = async () => {
    if (!selectedMatch || !firestore) return;
    
    const matchRef = doc(firestore, 'matches', selectedMatch.id);
    deleteDoc(matchRef).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        operation: 'delete', path: matchRef.path
      }));
    });
    setIsDeleteDialogOpen(false);
    setSelectedMatch(null);
  };

  const handleAttendanceChange = (matchId: string, newStatus: 'going' | 'not-going', note: string) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: "Chyba",
        description: "Uživatel není přihlášen.",
      });
      return;
    }

    const attendanceRef = doc(firestore, 'matches', matchId, 'attendees', user.uid);
    const originalAttendance = userAttendances.get(matchId);

    // Optimistic update
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

    setDoc(attendanceRef, data, { merge: true }).catch(async (error) => {
      revertOptimisticUpdate();
      toast({ variant: 'destructive', title: "Chyba", description: "Nepodařilo se uložit vaši účast." });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        operation: 'write', path: attendanceRef.path, requestResourceData: data,
      }));
    });
  };

  const handleMatchUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch || !firestore) return;

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
        updateDoc(matchRef, updatedData).catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            operation: 'update', path: matchRef.path, requestResourceData: updatedData,
          }));
        });
        setIsEditDialogOpen(false);
        setSelectedMatch(null);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit zápas. Zkontrolujte formát data.' });
    }
  };

  const handleMatchAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

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
          team1Score: null,
          team2Score: null,
          scorers: [],
      };
      
      const matchesCollection = collection(firestore, 'matches')
      addDoc(matchesCollection, newMatchData).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          operation: 'create', path: matchesCollection.path, requestResourceData: newMatchData
        }));
      });
      setIsAddDialogOpen(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se přidat zápas. Zkontrolujte formát data.' });
    }
  };

  const handleResultSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch || !firestore || !allStats) return;

    const formData = new FormData(e.currentTarget);
    const team1Score = parseInt(formData.get('team1Score') as string, 10);
    const team2Score = parseInt(formData.get('team2Score') as string, 10);

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

    // 1. Update the match document
    const matchRef = doc(firestore, 'matches', selectedMatch.id);
    batch.update(matchRef, {
        isPlayed: true,
        team1Score,
        team2Score,
        scorers: scorersData,
    });

    // 2. Tally up goals and assists for each player
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

    // 3. Create batch updates for playerStats
    const allStatsMap = new Map(allStats.map(s => [s.userProfileId, s]));

    for (const [userId, updates] of playerStatUpdates.entries()) {
        const userStats = allStatsMap.get(userId);
        // Each user has one stats doc, ID is 'stats'
        if (userStats) {
             const statDocRef = doc(firestore, 'users', userId, 'playerStats', userStats.id);
            batch.update(statDocRef, {
                goals: (userStats.goals || 0) + updates.goals,
                assists: (userStats.assists || 0) + updates.assists,
            });
        }
    }

    await batch.commit();

    setIsResultDialogOpen(false);
    setSelectedMatch(null);
};

  const handleEditScoringClick = () => {
    setEditableScoring(teamScoring.map(p => ({...p})));
    setIsScoringEditMode(true);
  };

  const handleSaveScoring = async () => {
    setIsScoringEditMode(false);
    if (!firestore || !allStats) return;

    const batch = writeBatch(firestore);
    const statsMap = new Map(allStats.map(s => [s.userProfileId, s.id]));

    editableScoring.forEach(player => {
        const statDocId = statsMap.get(player.id);
        if (statDocId) {
            const playerStatsRef = doc(firestore, 'users', player.id, 'playerStats', statDocId);
            batch.update(playerStatsRef, {
                goals: player.goals,
                assists: player.assists
            });
        }
    });
    await batch.commit();
  };
  
  const handleCancelScoring = () => {
    setIsScoringEditMode(false);
  };

  const handleScoringChange = (playerId: string, stat: 'goals' | 'assists', delta: number) => {
    setEditableScoring(currentScoring =>
      currentScoring.map(p => {
        if (p.id === playerId) {
          const newStatValue = p[stat] + delta;
          const updatedPlayer = {
            ...p,
            [stat]: Math.max(0, newStatValue),
          };
          updatedPlayer.points = updatedPlayer.goals + updatedPlayer.assists;
          return updatedPlayer;
        }
        return p;
      })
    );
  };

  const handleEditLeagueClick = () => {
    setEditableLeagueStandings(leagueStandings.map(t => ({...t})));
    setEditableIsPlayoffEnabled(isPlayoffEnabled);
    setEditablePlayoffSeries(playoffSeries.map(s => ({...s})));
    setIsLeagueEditMode(true);
  };

  const handleSaveLeague = () => {
    if (!firestore) return;
    setIsLeagueEditMode(false);
    setLeagueStandings(editableLeagueStandings);
    
    const settingsRef = doc(firestore, 'settings', 'league');
    
    let seriesToSave = editablePlayoffSeries;
    if (editableIsPlayoffEnabled && seriesToSave.length === 0) {
        seriesToSave = [{ round: 'Čtvrtfinále', opponent: 'TBD', wins: 0, losses: 0 }];
    }

    const updatedSettings = {
        isPlayoffEnabled: editableIsPlayoffEnabled,
        playoffSeries: seriesToSave,
    };

    setDoc(settingsRef, updatedSettings, { merge: true })
        .then(() => {
            toast({ title: 'Nastavení ligy uloženo.' });
        })
        .catch((error) => {
            toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit nastavení ligy.' });
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                operation: 'write', path: settingsRef.path, requestResourceData: updatedSettings,
            }));
        });
  };

  const handleCancelLeague = () => {
    setIsLeagueEditMode(false);
  };

  const handleLeagueChange = (teamName: string, stat: 'points' | 'gf' | 'ga', delta: number) => {
    setEditableLeagueStandings(currentStandings =>
      currentStandings.map(t => {
        if (t.name === teamName) {
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }
  
  const fallback = userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? ''

  const stats = [
    { metric: 'Góly', value: playerStats?.goals ?? 0 },
    { metric: 'Asistence', value: playerStats?.assists ?? 0 },
    { metric: 'Body', value: (playerStats?.goals ?? 0) + (playerStats?.assists ?? 0) },
    { metric: 'Odehrané zápasy', value: playerStats?.gamesPlayed ?? 0 },
  ]
  
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
        <CarouselItem key={match.id} id={`match-${match.id}`} className={cn("basis-full relative", highlightedMatchId === match.id && 'animate-highlight-card')}>
            <Card>
                <CardHeader className="flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl break-words pr-2">{opponent}</CardTitle>
                        <CardDescription className="text-xs">{format(match.dateTime.toDate(), "EEEE, d. M. yyyy, HH:mm", { locale: cs })}</CardDescription>
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
                    <div className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0"/>
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
                                                    <AvatarImage src={`https://picsum.photos/seed/${attendeeProfile.email}/100/100`} data-ai-hint="player portrait" alt={attendeeProfile.name} />
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
                </CardFooter>
            </Card>
        </CarouselItem>
    );
  };


  return (
    <div className="py-8 px-4 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        
        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={`https://picsum.photos/seed/${userProfile?.email}/400/400`} alt={userProfile?.name ?? ''} data-ai-hint="player portrait" />
              <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl md:text-3xl font-headline">{userProfile?.name}</CardTitle>
            {userProfile?.jerseyNumber && <CardDescription className="text-primary font-bold text-4xl md:text-5xl font-mono mt-2">#{userProfile.jerseyNumber}</CardDescription>}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><BarChart className="text-primary"/>Statistiky sezóny</CardTitle>
          </CardHeader>
          <CardContent>
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
                 <div id={`match-${nextMatch.id}`} className={cn('relative', highlightedMatchId === nextMatch.id && 'animate-highlight-card')}>
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
                                    <div id={`match-${match.id}`} key={match.id} className={cn('relative', highlightedMatchId === match.id && 'animate-highlight-card')}>
                                        {renderMatchCard(match)}
                                    </div>
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
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-headline"><Flame className="text-primary"/>Kanadské bodování</CardTitle>
                    {userProfile?.role === 'admin' && (
                      <div className="flex gap-2">
                        {isScoringEditMode ? (
                          <>
                            <Button variant="outline" onClick={handleCancelScoring}>Zrušit</Button>
                            <Button onClick={handleSaveScoring}>Uložit</Button>
                          </>
                        ) : (
                          <Button variant="outline" size="icon" onClick={handleEditScoringClick}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Upravit bodování</span>
                          </Button>
                        )}
                      </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px] px-2 sm:px-4">#</TableHead>
                                <TableHead>Hráč</TableHead>
                                <TableHead className="text-center hidden sm:table-cell w-[80px]">G</TableHead>
                                <TableHead className="text-center hidden sm:table-cell w-[80px]">A</TableHead>
                                <TableHead className="text-right w-[60px] px-2 sm:px-4">B</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTeamScoring.map((player) => (
                                <TableRow key={player.id}>
                                    <TableCell className="font-medium px-2 sm:px-4">{player.rank}</TableCell>
                                    <TableCell>{player.name}</TableCell>
                                    <TableCell className="text-center font-mono hidden sm:table-cell">
                                      {isScoringEditMode ? (
                                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleScoringChange(player.id, 'goals', -1)}>
                                            <Minus className="h-4 w-4" />
                                          </Button>
                                          <span className="w-6 text-center">{player.goals}</span>
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleScoringChange(player.id, 'goals', 1)}>
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        player.goals
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center font-mono hidden sm:table-cell">
                                      {isScoringEditMode ? (
                                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleScoringChange(player.id, 'assists', -1)}>
                                            <Minus className="h-4 w-4" />
                                          </Button>
                                          <span className="w-6 text-center">{player.assists}</span>
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleScoringChange(player.id, 'assists', 1)}>
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        player.assists
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold px-2 sm:px-4">{player.points}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

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
                                        <TableHead className="w-[40px] px-2 sm:px-4">#</TableHead>
                                        <TableHead>Tým</TableHead>
                                        <TableHead className="text-center hidden sm:table-cell">GF</TableHead>
                                        <TableHead className="text-center hidden sm:table-cell">GA</TableHead>
                                        <TableHead className="text-center w-[100px] sm:w-auto px-2 sm:px-4">B</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedLeagueStandings.map((team) => (
                                        <TableRow key={team.name} className={team.name === 'Aces' ? 'bg-primary/10' : ''}>
                                            <TableCell className="font-medium px-2 sm:px-4">{team.rank}</TableCell>
                                            <TableCell>{team.name}</TableCell>
                                            <TableCell className="text-center font-mono hidden sm:table-cell">
                                                {isLeagueEditMode ? (
                                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'gf', -1)}><Minus className="h-4 w-4" /></Button>
                                                        <span className="w-8 text-center">{team.gf}</span>
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'gf', 1)}><Plus className="h-4 w-4" /></Button>
                                                    </div>
                                                ) : ( team.gf )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono hidden sm:table-cell">
                                                {isLeagueEditMode ? (
                                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'ga', -1)}><Minus className="h-4 w-4" /></Button>
                                                        <span className="w-8 text-center">{team.ga}</span>
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'ga', 1)}><Plus className="h-4 w-4" /></Button>
                                                    </div>
                                                ) : ( team.ga )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono px-2 sm:px-4">
                                                {isLeagueEditMode ? (
                                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'points', -1)}><Minus className="h-4 w-4" /></Button>
                                                        <span className="w-8 text-center">{team.points}</span>
                                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'points', 1)}><Plus className="h-4 w-4" /></Button>
                                                    </div>
                                                ) : ( <span className="font-bold">{team.points}</span> )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
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
              <DialogHeader>
                  <DialogTitle>Zapsat výsledek zápasu</DialogTitle>
                  <DialogDescription>
                    Zadejte konečné skóre a vyberte střelce gólů a asistence.
                  </DialogDescription>
              </DialogHeader>
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
                  <Button onClick={() => {
                      if (attendanceData) {
                          handleAttendanceChange(attendanceData.matchId, attendanceData.status, attendanceNote);
                      }
                      setIsAttendanceDialogOpen(false);
                      setAttendanceNote('');
                  }}>
                      Potvrdit
                  </Button>
              </DialogFooter>
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
