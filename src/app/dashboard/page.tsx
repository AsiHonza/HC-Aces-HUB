'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
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
import { Calendar as CalendarIcon, MapPin, Users, Trophy, BarChart, Sword, Pencil, Check, X, Flame, Shield, Plus, Minus, Loader2, Trash2, ClipboardEdit, History, Share2 } from "lucide-react"
import { cn } from '@/lib/utils'
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase'
import { doc, collection, collectionGroup, updateDoc, query, Timestamp, addDoc, deleteDoc, writeBatch, orderBy, where, limit, setDoc } from 'firebase/firestore'
import { format, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel'
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Textarea } from '@/components/ui/textarea'

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
  
  const [api, setApi] = useState<CarouselApi | null>(null)
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
    if (!allMatches) return [];
    return allMatches
      .filter(match => !match.isPlayed)
      .slice(0, 5);
  }, [allMatches]);
  
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
    if (!api || !upcomingMatches || upcomingMatches.length === 0) return;

    const matchId = searchParams.get('matchId');
    if (matchId) {
        const matchIndex = upcomingMatches.findIndex(m => m.id === matchId);
        if (matchIndex !== -1) {
            api.scrollTo(matchIndex);
        }
    }
  }, [api, upcomingMatches, searchParams]);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<string, UserProfile>();
    return new Map(allUsers.map(u => [u.id, u]));
  }, [allUsers]);
  
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

  const [editableScoring, setEditableScoring] = useState(teamScoring);
  
  const [leagueStandings, setLeagueStandings] = useState([
    { rank: 1, name: 'Aces', points: 45, gf: 120, ga: 85 },
    { rank: 2, name: 'HC Draci', points: 42, gf: 115, ga: 90 },
    { rank: 3, name: 'Rytíři', points: 38, gf: 100, ga: 95 },
    { rank: 4, name: 'Kometa', points: 35, gf: 95, ga: 105 },
    { rank: 5, name: 'Lvi', points: 30, gf: 90, ga: 110 },
  ]);
  const [editableLeagueStandings, setEditableLeagueStandings] = useState(leagueStandings);

  const isLoading = isUserLoading || isUserProfileLoading || isPlayerStatsLoading || areMatchesLoading || areUsersLoading || areStatsLoading || attendancesLoading;

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
    await deleteDoc(matchRef);
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

    const optimisticData: Partial<Attendance> = { status: newStatus, note: note || '' };
    setOptimisticAttendances(prev => new Map(prev).set(matchId, optimisticData));

    const revertOptimisticUpdate = () => {
      setOptimisticAttendances(prev => {
        const newMap = new Map(prev);
        if (originalAttendance) {
          newMap.set(matchId, originalAttendance);
        } else {
          // If there was no original, we can remove it or set to unknown
           newMap.set(matchId, { status: 'unknown' });
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

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center items-center">
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
        await updateDoc(matchRef, updatedData);
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
      
      await addDoc(collection(firestore, 'matches'), newMatchData);
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
    setIsLeagueEditMode(true);
  };

  const handleSaveLeague = () => {
    setLeagueStandings(editableLeagueStandings);
    setIsLeagueEditMode(false);
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

  const scoringData = isScoringEditMode ? editableScoring : teamScoring;
  const sortedTeamScoring = [...scoringData]
    .sort((a, b) => b.points - a.points)
    .map((player, index) => ({ ...player, rank: index + 1 }));
  
  const leagueData = isLeagueEditMode ? editableLeagueStandings : leagueStandings;
  const sortedLeagueStandings = [...leagueData]
    .sort((a, b) => b.points - a.points)
    .map((team, index) => ({ ...team, rank: index + 1 }));

  return (
    <div className="container py-8">
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

        <Card className="lg:col-span-3 relative">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-headline text-xl"><Trophy className="text-primary"/>Příští zápas</CardTitle>
            <div className="flex items-center gap-2">
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
          </CardHeader>
          {upcomingMatches.length > 0 ? (
            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
              }}
              className="w-full"
            >
              <CarouselContent>
                {upcomingMatches.map((match) => {
                  const opponent = match.team1 === 'Aces' ? match.team2 : match.team1;
                  const attendance = userAttendancesWithOptimistic.get(match.id)?.status;
                  const attendeesForMatch = (attendancesByMatch.get(match.id) || []);
                  const attendeeCount = attendeesForMatch.filter(a => a.status === 'going').length;
                  const sortedAttendees = [
                      ...attendeesForMatch.filter(att => att.status === 'going'),
                      ...attendeesForMatch.filter(att => att.status === 'not-going'),
                  ];

                  return (
                    <CarouselItem key={match.id} className="relative">
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleShareMatch(match.id)}>
                                <Share2 className="h-4 w-4" />
                                <span className="sr-only">Sdílet zápas</span>
                            </Button>
                           {userProfile?.role === 'admin' && (
                              <>
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRecordResult(match)}>
                                    <ClipboardEdit className="h-4 w-4" />
                                    <span className="sr-only">Zapsat výsledek</span>
                                  </Button>
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditMatch(match)}>
                                      <Pencil className="h-4 w-4" />
                                      <span className="sr-only">Upravit zápas</span>
                                  </Button>
                                  <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteMatch(match)}>
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Smazat zápas</span>
                                  </Button>
                              </>
                            )}
                        </div>
                        <>
                        <CardContent className="grid gap-6 md:grid-cols-5 items-center pt-6">
                            <div className="md:col-span-2 text-center md:text-left">
                            <p className="text-base text-muted-foreground">Soupeř</p>
                            <p className="text-xl md:text-3xl font-bold flex items-center gap-3 justify-center md:justify-start mt-1"><Users /> {opponent}</p>
                            </div>
                            
                            <div className="hidden md:flex justify-center items-center">
                                <Sword className="h-16 w-16 text-muted-foreground/20" />
                            </div>

                            <div className="md:col-span-2 text-center md:text-left">
                            <p className="text-base text-muted-foreground">Kdy a kde</p>
                            <p className="text-base md:text-lg font-semibold flex items-center gap-2 justify-center md:justify-start mt-1">
                                <CalendarIcon /> {format(match.dateTime.toDate(), "EEEE, d. MMMM yyyy", { locale: cs })} - {format(match.dateTime.toDate(), 'HH:mm')}
                            </p>
                            <p className="text-base flex items-center gap-2 text-muted-foreground justify-center md:justify-start mt-1"><MapPin /> {match.location}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-4 pt-4 border-t">
                            <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-base font-medium mb-2">Tvoje účast:</p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={attendance === 'going' ? 'default' : 'outline'}
                                            onClick={() => {
                                                setAttendanceData({ matchId: match.id, status: 'going' });
                                                const currentNote = userAttendances.get(match.id)?.note || '';
                                                setAttendanceNote(currentNote);
                                                setIsAttendanceDialogOpen(true);
                                            }}
                                            className={cn( "h-10 px-4", attendance === 'going' && "bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 dark:border-green-400 hover:bg-green-500/20 hover:text-green-600"
                                            )}
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            Jdu
                                        </Button>
                                        <Button
                                             variant={attendance === 'not-going' ? 'destructive' : 'outline'}
                                             onClick={() => {
                                                setAttendanceData({ matchId: match.id, status: 'not-going' });
                                                const currentNote = userAttendances.get(match.id)?.note || '';
                                                setAttendanceNote(currentNote);
                                                setIsAttendanceDialogOpen(true);
                                            }}
                                             className={cn("h-10 px-4", attendance === 'not-going' && "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20 hover:text-destructive"
                                             )}
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Nejdu
                                        </Button>
                                    </div>
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <Users className="mr-2" />
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
                        </>
                    </CarouselItem>
                  )
                })}
              </CarouselContent>
              {upcomingMatches.length > 1 && (
                <>
                  <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden h-8 w-8 md:flex" />
                  <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden h-8 w-8 md:flex" />
                </>
              )}
            </Carousel>
          ) : (
            <CardContent><p>Žádný nadcházející zápas.</p></CardContent>
          )}
        </Card>

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
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Hráč</TableHead>
                                <TableHead className="text-center hidden sm:table-cell w-24">G</TableHead>
                                <TableHead className="text-center hidden sm:table-cell w-24">A</TableHead>
                                <TableHead className="text-right w-16">B</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTeamScoring.map((player) => (
                                <TableRow key={player.id}>
                                    <TableCell className="font-medium">{player.rank}</TableCell>
                                    <TableCell>{player.name}</TableCell>
                                    <TableCell className="text-center font-mono hidden sm:table-cell">
                                      {isScoringEditMode ? (
                                        <div className="flex items-center justify-center gap-2">
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
                                        <div className="flex items-center justify-center gap-2">
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
                                    <TableCell className="text-right font-mono font-bold">{player.points}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-headline"><Shield className="text-primary"/>Tabulka soutěže</CardTitle>
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Tým</TableHead>
                                <TableHead className="text-center hidden sm:table-cell">GF</TableHead>
                                <TableHead className="text-center hidden sm:table-cell">GA</TableHead>
                                <TableHead className="text-center w-24">B</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLeagueStandings.map((team) => (
                                <TableRow key={team.name} className={team.name === 'Aces' ? 'bg-primary/10' : ''}>
                                    <TableCell className="font-medium">{team.rank}</TableCell>
                                    <TableCell>{team.name}</TableCell>
                                    <TableCell className="text-center font-mono hidden sm:table-cell">
                                        {isLeagueEditMode ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'gf', -1)}><Minus className="h-4 w-4" /></Button>
                                                <span className="w-8 text-center">{team.gf}</span>
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'gf', 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            team.gf
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center font-mono hidden sm:table-cell">
                                        {isLeagueEditMode ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'ga', -1)}><Minus className="h-4 w-4" /></Button>
                                                <span className="w-8 text-center">{team.ga}</span>
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'ga', 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            team.ga
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                        {isLeagueEditMode ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'points', -1)}><Minus className="h-4 w-4" /></Button>
                                                <span className="w-8 text-center">{team.points}</span>
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleLeagueChange(team.name, 'points', 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            <span className="font-bold">{team.points}</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
    <Suspense fallback={<div className="container py-8">Načítání...</div>}>
      <DashboardPageContent />
    </Suspense>
  )
}

