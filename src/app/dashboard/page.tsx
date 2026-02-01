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
import { Calendar, MapPin, Users, Trophy, BarChart, Sword, Pencil } from "lucide-react"

function DashboardPageContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'Adam Hráč'
  const jerseyNumber = searchParams.get('jerseyNumber')
  const email = searchParams.get('email') || 'adam.hrac@email.com'
  const role = searchParams.get('role') || 'classic'

  const [attendance, setAttendance] = useState('unknown');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
              <RadioGroup value={attendance} onValueChange={setAttendance} className="flex gap-8">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="going" id="r1" />
                  <Label htmlFor="r1" className="text-lg">Jdu</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not-going" id="r2" />
                  <Label htmlFor="r2" className="text-lg">Nejdu</Label>
                </div>
              </RadioGroup>
          </CardFooter>
        </Card>
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
