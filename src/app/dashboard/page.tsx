'use client'

import { Suspense, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, MapPin, Users, Trophy, BarChart, Sword, Pencil, Check, X, Flame, Shield, Plus, Minus, Loader2 } from "lucide-react"
import { cn } from '@/lib/utils'
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, collection, collectionGroup, updateDoc, query, orderBy, Timestamp, addDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
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
}

function DashboardPageContent() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  
  const [attendances, setAttendances] = useState<Record<string, string>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isScoringEditMode, setIsScoringEditMode] = useState(false);
  const [isLeagueEditMode, setIsLeagueEditMode] = useState(false);
  
  // Fetch current user's profile and stats
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

  const playerStatsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'playerStats') : null, [firestore, user]);
  const { data: playerStatsData, isLoading: isPlayerStatsLoading } = useCollection<PlayerStats>(playerStatsCollectionRef);
  const playerStats = useMemo(() => playerStatsData?.[0], [playerStatsData]);

  // Fetch matches
  const matchesQuery = useMemoFirebase(() => query(collection(firestore, 'matches'), orderBy('dateTime', 'asc')), [firestore]);
  const { data: matches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);
  
  const upcomingMatches = useMemo(() => {
    if (!matches) return [];
    const now = new Date();
    return matches.filter(m => m.dateTime.toDate() > now).slice(0, 5);
  }, [matches]);
  
  const nextMatch = useMemo(() => {
    return upcomingMatches[0] || null;
  }, [upcomingMatches]);

  // Fetch all users and stats for leaderboard
  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersRef);

  const allStatsRef = useMemoFirebase(() => collectionGroup(firestore, 'playerStats'), [firestore]);
  const { data: allStats, isLoading: areStatsLoading } = useCollection<PlayerStats>(allStatsRef);
  
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

  const isLoading = isUserLoading || isUserProfileLoading || isPlayerStatsLoading || areMatchesLoading || areUsersLoading || areStatsLoading;

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
  
  const opponent = nextMatch?.team1 === 'Aces' ? nextMatch?.team2 : nextMatch?.team1;

  const handleMatchUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nextMatch || !firestore) return;

    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get('date') as string;
    const timeStr = formData.get('time') as string;
    
    // Combine date and time and create a Timestamp
    const [day, month, year] = dateStr.split('. ').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDateTime = new Date(year, month - 1, day, hours, minutes);

    const updatedData = {
        team2: formData.get('opponent') as string, // Assuming Aces is always team1 for simplicity
        location: formData.get('location') as string,
        dateTime: Timestamp.fromDate(newDateTime),
    };
    
    const matchRef = doc(firestore, 'matches', nextMatch.id);
    await updateDoc(matchRef, updatedData);
    setIsEditDialogOpen(false);
  };

  const handleMatchAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get('date') as string;
    const timeStr = formData.get('time') as string;
    
    const [day, month, year] = dateStr.split('. ').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDateTime = new Date(year, month - 1, day, hours, minutes);

    const newMatchData = {
        team1: 'Aces',
        team2: formData.get('opponent') as string,
        location: formData.get('location') as string,
        dateTime: Timestamp.fromDate(newDateTime),
    };
    
    await addDoc(collection(firestore, 'matches'), newMatchData);
    setIsAddDialogOpen(false);
  };

  const handleEditScoringClick = () => {
    setEditableScoring(teamScoring.map(p => ({...p})));
    setIsScoringEditMode(true);
  };

  const handleSaveScoring = async () => {
    setIsScoringEditMode(false);
    if (!firestore || !allStats) return;

    const statsMap = new Map<string, { id: string }>();
    allStats.forEach(stat => {
        if (stat.id) {
            statsMap.set(stat.userProfileId, { id: stat.id });
        }
    });

    const updates = editableScoring.map(player => {
        const statInfo = statsMap.get(player.id);
        if (statInfo) {
            const playerStatsRef = doc(firestore, 'users', player.id, 'playerStats', statInfo.id);
            return updateDoc(playerStatsRef, {
                goals: player.goals,
                assists: player.assists
            });
        }
        return Promise.resolve(); // Should not happen if data is consistent
    });
    await Promise.all(updates);
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
            <Avatar className="h-32 w-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={`https://picsum.photos/seed/${userProfile?.email}/400/400`} alt={userProfile?.name ?? ''} data-ai-hint="player portrait" />
              <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-headline">{userProfile?.name}</CardTitle>
            {userProfile?.jerseyNumber && <CardDescription className="text-primary font-bold text-5xl font-mono mt-2">#{userProfile.jerseyNumber}</CardDescription>}
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
            <CardTitle className="flex items-center gap-2 font-headline"><Trophy className="text-primary"/>Příští zápas</CardTitle>
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
                          <Input id="date-add" name="date" defaultValue={format(new Date(), 'd. M. yyyy')} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="time-add" className="text-right">Čas</Label>
                          <Input id="time-add" name="time" defaultValue="18:00" className="col-span-3" required />
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
              {userProfile?.role === 'admin' && nextMatch && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Upravit zápas</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upravit příští zápas</DialogTitle>
                      <DialogDescription>
                        Změňte podrobnosti o nadcházejícím zápase.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleMatchUpdate}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="opponent" className="text-right">Soupeř</Label>
                          <Input id="opponent" name="opponent" defaultValue={opponent ?? ''} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="date" className="text-right">Datum</Label>
                          <Input id="date" name="date" defaultValue={format(nextMatch.dateTime.toDate(), 'd. M. yyyy')} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="time" className="text-right">Čas</Label>
                          <Input id="time" name="time" defaultValue={format(nextMatch.dateTime.toDate(), 'HH:mm')} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="location" className="text-right">Místo</Label>
                          <Input id="location" name="location" defaultValue={nextMatch.location} className="col-span-3" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Uložit změny</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          {upcomingMatches.length > 0 ? (
            <Carousel
              opts={{
                align: "start",
              }}
              className="w-full"
            >
              <CarouselContent>
                {upcomingMatches.map((match) => {
                  const opponent = match.team1 === 'Aces' ? match.team2 : match.team1;
                  const attendance = attendances[match.id] || 'unknown';

                  return (
                    <CarouselItem key={match.id}>
                        <>
                        <CardContent className="grid gap-6 md:grid-cols-5 items-center pt-6">
                            <div className="md:col-span-2 text-center md:text-left">
                            <p className="text-lg text-muted-foreground">Soupeř</p>
                            <p className="text-4xl font-bold flex items-center gap-3 justify-center md:justify-start mt-1"><Users /> {opponent}</p>
                            </div>
                            
                            <div className="hidden md:flex justify-center items-center">
                                <Sword className="h-16 w-16 text-muted-foreground/20" />
                            </div>

                            <div className="md:col-span-2 text-center md:text-left">
                            <p className="text-lg text-muted-foreground">Kdy a kde</p>
                            <p className="text-xl font-semibold flex items-center gap-2 justify-center md:justify-start mt-1">
                                <Calendar /> {format(match.dateTime.toDate(), "EEEE, d. MMMM yyyy", { locale: cs })} - {format(match.dateTime.toDate(), 'HH:mm')}
                            </p>
                            <p className="text-lg flex items-center gap-2 text-muted-foreground justify-center md:justify-start mt-1"><MapPin /> {match.location}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-4 pt-4 border-t">
                            <p className="text-base font-medium">Tvoje účast:</p>
                            <RadioGroup value={attendance} onValueChange={(value) => setAttendances(prev => ({...prev, [match.id]: value}))} className="flex gap-4">
                                <Label
                                htmlFor={`going-${match.id}`}
                                className={cn(
                                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border h-12 px-6 cursor-pointer",
                                    attendance === 'going'
                                    ? "bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 dark:border-green-400 hover:bg-green-500/20"
                                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                                )}
                                >
                                <RadioGroupItem value="going" id={`going-${match.id}`} className="sr-only" />
                                <Check className="h-5 w-5" />
                                Jdu
                                </Label>
                                <Label
                                htmlFor={`not-going-${match.id}`}
                                className={cn(
                                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border h-12 px-6 cursor-pointer",
                                    attendance === 'not-going'
                                    ? "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20"
                                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                                )}
                                >
                                <RadioGroupItem value="not-going" id={`not-going-${match.id}`} className="sr-only" />
                                <X className="h-5 w-5" />
                                Nejdu
                                </Label>
                            </RadioGroup>
                        </CardFooter>
                        </>
                    </CarouselItem>
                  )
                })}
              </CarouselContent>
              {upcomingMatches.length > 1 && (
                <>
                  <CarouselPrevious className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 hidden h-8 w-8 md:flex" />
                  <CarouselNext className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden h-8 w-8 md:flex" />
                </>
              )}
            </Carousel>
          ) : (
            <CardContent><p>Žádný nadcházející zápas.</p></CardContent>
          )}
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
                                <TableHead className="w-[40px]">#</TableHead>
                                <TableHead>Hráč</TableHead>
                                <TableHead className="text-center">G</TableHead>
                                <TableHead className="text-center">A</TableHead>
                                <TableHead className="text-right">B</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTeamScoring.map((player) => (
                                <TableRow key={player.id}>
                                    <TableCell className="font-medium">{player.rank}</TableCell>
                                    <TableCell>{player.name}</TableCell>
                                    <TableCell className="text-center font-mono">
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
                                    <TableCell className="text-center font-mono">
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
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Tým</TableHead>
                                <TableHead className="text-center w-[120px]">GF</TableHead>
                                <TableHead className="text-center w-[120px]">GA</TableHead>
                                <TableHead className="text-center w-[120px]">B</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLeagueStandings.map((team) => (
                                <TableRow key={team.name} className={team.name === 'Aces' ? 'bg-primary/10' : ''}>
                                    <TableCell className="font-medium">{team.rank}</TableCell>
                                    <TableCell>{team.name}</TableCell>
                                    <TableCell className="text-center font-mono">
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
                                    <TableCell className="text-center font-mono">
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
