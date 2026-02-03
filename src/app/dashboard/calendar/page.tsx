'use client'

import React, { Suspense, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, collection, query, orderBy, Timestamp, addDoc } from 'firebase/firestore'
import { format, isSameDay, startOfDay } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Plus, Trophy, MapPin, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'classic';
}

interface Match {
  id: string;
  dateTime: Timestamp;
  location: string;
  team1: string;
  team2: string;
  isPlayed: boolean;
  type: 'regular' | 'playoff' | 'friendly';
}

function CalendarPageContent() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isAddMatchDialogOpen, setIsAddMatchDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

    const matchesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'matches'), orderBy('dateTime', 'asc'));
    }, [firestore, user]);
    const { data: allMatches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);

    const isLoading = isUserProfileLoading || areMatchesLoading;

    const matchesOnSelectedDate = useMemo(() => {
        if (!allMatches || !selectedDate) return [];
        return allMatches.filter(match => isSameDay(match.dateTime.toDate(), selectedDate));
    }, [allMatches, selectedDate]);

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
    };

    const handleAddMatch = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !selectedDate) return;

        setIsSaving(true);
        const formData = new FormData(e.currentTarget);
        const timeStr = formData.get('time') as string;
        
        try {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const matchDateTime = new Date(selectedDate);
            matchDateTime.setHours(hours, minutes);

            const newMatchData = {
                team1: 'Aces',
                team2: formData.get('opponent') as string,
                location: formData.get('location') as string,
                dateTime: Timestamp.fromDate(matchDateTime),
                isPlayed: false,
                type: formData.get('type') as Match['type'],
            };
            
            await addDoc(collection(firestore, 'matches'), newMatchData);
            toast({ title: 'Zápas přidán do kalendáře.' });
            setIsAddMatchDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se přidat zápas.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    const matchDates = allMatches?.map(m => startOfDay(m.dateTime.toDate())) || [];

    return (
        <div className="py-8 space-y-8">
            <div className="grid gap-8 md:grid-cols-12">
                <Card className="md:col-span-5 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Kalendář událostí</CardTitle>
                        <CardDescription>Vyberte den pro zobrazení detailů nebo přidání zápasu.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center px-2 sm:px-6">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            className="rounded-md border shadow w-full"
                            locale={cs}
                            modifiers={{
                                hasMatch: matchDates,
                            }}
                            modifiersStyles={{
                                hasMatch: { fontWeight: 'bold', color: 'hsl(var(--primary))', textDecoration: 'underline' }
                            }}
                        />
                    </CardContent>
                    {userProfile?.role === 'admin' && selectedDate && (
                        <div className="p-6 pt-0">
                            <Button className="w-full" onClick={() => setIsAddMatchDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Přidat zápas na {format(selectedDate, 'd. M.', { locale: cs })}
                            </Button>
                        </div>
                    )}
                </Card>

                <div className="md:col-span-7 lg:col-span-8 space-y-4">
                    <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                        {selectedDate ? format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: cs }) : 'Vyberte datum'}
                    </h3>
                    
                    {matchesOnSelectedDate.length > 0 ? (
                        <div className="grid gap-4">
                            {matchesOnSelectedDate.map(match => (
                                <Card key={match.id} className="overflow-hidden border-l-4 border-l-primary">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Badge variant="outline" className="mb-2">
                                                    {match.type === 'regular' ? 'Základní část' : match.type === 'playoff' ? 'Play-off' : 'Přátelský'}
                                                </Badge>
                                                <CardTitle className="text-2xl">{match.team1} vs {match.team2}</CardTitle>
                                            </div>
                                            {match.isPlayed && <Badge>Odehráno</Badge>}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid gap-2 text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-primary" />
                                            <span>{format(match.dateTime.toDate(), 'HH:mm')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            <span>{match.location}</span>
                                        </div>
                                        {!match.isPlayed && (
                                            <Button variant="link" className="p-0 h-auto text-primary w-fit mt-2" asChild>
                                                <Link href={`/dashboard?matchId=${match.id}`}>Zobrazit účast a detaily na nástěnce</Link>
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Na tento den nejsou naplánovány žádné události.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog open={isAddMatchDialogOpen} onOpenChange={setIsAddMatchDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Přidat zápas na {selectedDate && format(selectedDate, 'd. M. yyyy')}</DialogTitle>
                        <DialogDescription>Zadejte detaily nového zápasu.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddMatch}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="opponent" className="text-right">Soupeř</Label>
                                <Input id="opponent" name="opponent" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="time" className="text-right">Čas</Label>
                                <Input id="time" name="time" type="time" defaultValue="18:00" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="location" className="text-right">Místo</Label>
                                <Input id="location" name="location" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right">Typ</Label>
                                <Select name="type" required defaultValue="regular">
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
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
                            <Button type="button" variant="outline" onClick={() => setIsAddMatchDialogOpen(false)} disabled={isSaving}>Zrušit</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Uložit zápas
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div className="py-8 text-center">Načítání kalendáře...</div>}>
            <CalendarPageContent />
        </Suspense>
    )
}
