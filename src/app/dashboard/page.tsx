import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, Trophy, BarChart, Sword } from "lucide-react"

export default function DashboardPage() {
  const player = {
    name: 'Adam Hráč',
    jerseyNumber: 88,
    photoUrl: 'https://picsum.photos/seed/1/400/400',
    photoHint: 'player portrait'
  }

  const stats = [
    { metric: 'Góly', value: 12 },
    { metric: 'Asistence', value: 21 },
    { metric: 'Body', value: 33 },
    { metric: 'Trestné minuty', value: '28' },
  ]

  const nextMatch = {
    opponent: 'HC Draci',
    date: 'Sobota, 22. června 2024',
    time: '18:00',
    location: 'Zimní stadion, Město',
  }

  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        
        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
            <Avatar className="h-32 w-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={player.photoUrl} alt={player.name} data-ai-hint={player.photoHint} />
              <AvatarFallback className="text-4xl">{player.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Trophy className="text-primary"/>Příští zápas</CardTitle>
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
        </Card>
      </div>
    </div>
  )
}
