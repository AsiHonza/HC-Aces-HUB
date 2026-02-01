'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, MapPin, Users, Trophy, BarChart, Sword, Pencil, Check, X, Flame, Shield, Plus, Minus } from "lucide-react"
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'

function DashboardPageContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'Adam Hráč'
  const jerseyNumber = searchParams.get('jerseyNumber')
  const email = searchParams.get('email') || 'adam.hrac@email.com'
  const role = searchParams.get('role') || 'classic'

  const [attendance, setAttendance] = useState('unknown');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScoringEditMode, setIsScoringEditMode] = useState(false);
  const [isLeagueStandingsEditDialogOpen, setIsLeagueStandingsEditDialogOpen] = useState(false);

  const player = {
    name,
    jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
    photoUrl: `https://picsum.photos/seed/${email}/400/400`,
    photoHint: 'player portrait'
  }

  const stats = [
    { metric: 'Góly', value: 12 },
    { metric: 'Asistence', value: 21 },
    { metric: 'Body', value: 33 },
    { metric: 'Trestné minuty', value: '28' },
  ]

  const [nextMatch, setNextMatch] = useState({
    opponent: 'HC Draci',
    date: 'Sobota, 22. června 2024',
    time: '18:00',
    location: 'Zimní stadion, Město',
  })

  const [teamScoring, setTeamScoring] = useState([
    { rank: 1, name: 'Adam Hráč', goals: 12, assists: 21, points: 33 },
    { rank: 2, name: 'Jan Mlcak', goals: 15, assists: 15, points: 30 },
    { rank: 3, name: 'Petr Novák', goals: 10, assists: 18, points: 28 },
    { rank: 4, name: 'Tomáš Dvořák', goals: 8, assists: 15, points: 23 },
    { rank: 5, name: 'Martin Černý', goals: 5, assists: 12, points: 17 },
  ]);
  const [editableScoring, setEditableScoring] = useState(teamScoring);

  const [leagueStandings, setLeagueStandings] = useState([
    { rank: 1, name: 'Aces', points: 45, gf: 120, ga: 85 },
    { rank: 2, name: 'HC Draci', points: 42, gf: 115, ga: 90 },
    { rank: 3, name: 'Rytíři', points: 38, gf: 100, ga: 95 },
    { rank: 4, name: 'Kometa', points: 35, gf: 95, ga: 105 },
    { rank: 5, name: 'Lvi', points: 30, gf: 90, ga: 110 },
  ]);

  const fallback = name.split(' ').map(n => n[0]).join('').toUpperCase()

  const handleMatchUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newMatchData = {
        opponent: formData.get('opponent') as string,
        date: formData.get('date') as string,
        time: formData.get('time') as string,
        location: formData.get('location') as string,
    };
    setNextMatch(newMatchData);
    setIsEditDialogOpen(false);
  };

  const handleLeagueStandingsUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const newData = JSON.parse(formData.get('standingsData') as string);
      setLeagueStandings(newData);
      setIsLeagueStandingsEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to parse league standings JSON", error);
       // In a real app, you might want to show a toast notification here
    }
  };

  const handleEditScoringClick = () => {
    setEditableScoring(teamScoring.map(p => ({...p})));
    setIsScoringEditMode(true);
  };

  const handleSaveScoring = () => {
    setTeamScoring(editableScoring);
    setIsScoringEditMode(false);
  };

  const handleCancelScoring = () => {
    setIsScoringEditMode(false);
  };

  const handleScoringChange = (playerName: string, stat: 'goals' | 'assists', delta: number) => {
    setEditableScoring(currentScoring =>
      currentScoring.map(p => {
        if (p.name === playerName) {
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

  const scoringData = isScoringEditMode ? editableScoring : teamScoring;
  const sortedTeamScoring = [...scoringData]
    .sort((a, b) => b.points - a.points)
    .map((player, index) => ({ ...player, rank: index + 1 }));

  const sortedLeagueStandings = [...leagueStandings]
    .sort((a, b) => b.points - a.points)
    .map((team, index) => ({ ...team, rank: index + 1 }));

  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        
        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
            <Avatar className="h-32 w-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={player.photoUrl} alt={player.name} data-ai-hint={player.photoHint} />
              <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-headline">{player.name}</CardTitle>
            {player.jerseyNumber && <CardDescription className="text-primary font-bold text-5xl font-mono mt-2">#{player.jerseyNumber}</CardDescription>}
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

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-headline"><Trophy className="text-primary"/>Příští zápas</CardTitle>
             {role === 'admin' && (
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
                        <Input id="opponent" name="opponent" defaultValue={nextMatch.opponent} className="col-span-3" />
                      </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Datum</Label>
                        <Input id="date" name="date" defaultValue={nextMatch.date} className="col-span-3" />
                      </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">Čas</Label>
                        <Input id="time" name="time" defaultValue={nextMatch.time} className="col-span-3" />
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
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-5 items-center">
            <div className="md:col-span-2 text-center md:text-left">
              <p className="text-lg text-muted-foreground">Soupeř</p>
              <p className="text-4xl font-bold flex items-center gap-3 justify-center md:justify-start mt-1"><Users /> {nextMatch.opponent}</p>
            </div>
            
            <div className="hidden md:flex justify-center items-center">
                <Sword className="h-16 w-16 text-muted-foreground/20" />
            </div>

            <div className="md:col-span-2 text-center md:text-left">
              <p className="text-lg text-muted-foreground">Kdy a kde</p>
              <p className="text-xl font-semibold flex items-center gap-2 justify-center md:justify-start mt-1"><Calendar /> {nextMatch.date} - {nextMatch.time}</p>
              <p className="text-lg flex items-center gap-2 text-muted-foreground justify-center md:justify-start mt-1"><MapPin /> {nextMatch.location}</p>
            </div>
          </CardContent>
           <CardFooter className="flex-col items-start gap-4 pt-4 border-t">
              <p className="text-base font-medium">Tvoje účast:</p>
              <RadioGroup value={attendance} onValueChange={setAttendance} className="flex gap-4">
                <Label
                  htmlFor="going"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border h-12 px-6 cursor-pointer",
                    attendance === 'going'
                      ? "bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 dark:border-green-400 hover:bg-green-500/20"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <RadioGroupItem value="going" id="going" className="sr-only" />
                  <Check className="h-5 w-5" />
                  Jdu
                </Label>
                <Label
                  htmlFor="not-going"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border h-12 px-6 cursor-pointer",
                    attendance === 'not-going'
                      ? "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <RadioGroupItem value="not-going" id="not-going" className="sr-only" />
                  <X className="h-5 w-5" />
                  Nejdu
                </Label>
              </RadioGroup>
          </CardFooter>
        </Card>

        <div className="lg:col-span-3 grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-headline"><Flame className="text-primary"/>Kanadské bodování</CardTitle>
                    {role === 'admin' && (
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
                                <TableRow key={player.name}>
                                    <TableCell className="font-medium">{player.rank}</TableCell>
                                    <TableCell>{player.name}</TableCell>
                                    <TableCell className="text-center font-mono">
                                      {isScoringEditMode ? (
                                        <div className="flex items-center justify-center gap-2">
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleScoringChange(player.name, 'goals', -1)}>
                                            <Minus className="h-4 w-4" />
                                          </Button>
                                          <span className="w-6 text-center">{player.goals}</span>
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleScoringChange(player.name, 'goals', 1)}>
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
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleScoringChange(player.name, 'assists', -1)}>
                                            <Minus className="h-4 w-4" />
                                          </Button>
                                          <span className="w-6 text-center">{player.assists}</span>
                                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleScoringChange(player.name, 'assists', 1)}>
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
                    {role === 'admin' && (
                      <Dialog open={isLeagueStandingsEditDialogOpen} onOpenChange={setIsLeagueStandingsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Upravit tabulku</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upravit tabulku soutěže</DialogTitle>
                            <DialogDescription>
                              Upravte data v JSON formátu. Pořadí bude automaticky seřazeno.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleLeagueStandingsUpdate}>
                            <div className="grid gap-4 py-4">
                              <Textarea
                                id="standingsData"
                                name="standingsData"
                                defaultValue={JSON.stringify(leagueStandings, null, 2)}
                                className="col-span-4 h-64 font-mono text-xs"
                              />
                            </div>
                            <DialogFooter>
                              <Button type="submit">Uložit změny</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Tým</TableHead>
                                <TableHead>Skóre</TableHead>
                                <TableHead className="text-right">B</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLeagueStandings.map((team) => (
                                <TableRow key={team.name} className={team.name === 'Aces' ? 'bg-primary/10' : ''}>
                                    <TableCell className="font-medium">{team.rank}</TableCell>
                                    <TableCell>{team.name}</TableCell>
                                    <TableCell className="font-mono text-xs">{team.gf}:{team.ga}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{team.points}</TableCell>
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
