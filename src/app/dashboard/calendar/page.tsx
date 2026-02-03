
'use client'

import React, { Suspense, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, collection, query, orderBy, Timestamp, addDoc } from 'firebase/firestore'
import { format, isSameDay, startOfDay, setYear, parseISO, isValid } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Plus, Trophy, MapPin, Clock, Users, Cake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'classic';
  dob?: string;
  email: string;
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
}

const formatName = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
};

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

function CalendarPageContent() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isAddMatchDialogOpen, setIsAddMatchDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [matchType, setMatchType] = useState<Match['type']>('regular');

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

    const matchesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'matches'), orderBy('dateTime', 'asc'));
    }, [firestore, user]);
    const { data: allMatches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'users');
    }, [firestore, user]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    const isLoading = isUserProfileLoading || areMatchesLoading || areUsersLoading;

    const matchesOnSelectedDate = useMemo(() => {
        if (!allMatches || !selectedDate) return [];
        return allMatches.filter(match => isSameDay(match.dateTime.toDate(), selectedDate));
    }, [allMatches, selectedDate]);

    const birthdaysOnSelectedDate = useMemo(() => {
        if (!allUsers || !selectedDate) return [];
        return allUsers.filter(u => {
            if (!u.dob) return false;
            const dob = parseISO(u.dob);
            if (!isValid(dob)) return false;
            return dob.getMonth() === selectedDate.getMonth() && dob.getDate() === selectedDate.getDate();
        });
    }, [allUsers, selectedDate]);

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

            const newMatchData: any = {
                team1: 'Aces',
                team2: formData.get('opponent') as string,
                location: formData.get('location') as string,
                dateTime: Timestamp.fromDate(matchDateTime),
                isPlayed: false,
                type: matchType,
            };

            if (matchType === 'regular') {
                newMatchData.round = Number(formData.get('round')) || null;
            } else if (matchType === 'playoff') {
                newMatchData.playoffStage = formData.get('playoffStage') as string;
                newMatchData.playoffMatchNumber = Number(formData.get('playoffMatchNumber')) || null;
            }
            
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
    const birthdayDates = allUsers?.filter(u => u.dob).map(u => {
        const dob = parseISO(u.dob!);
        if (!isValid(dob)) return null;
        return setYear(dob, new Date().getFullYear());
    }).filter(Boolean) as Date[];

    return (
        <div className="py-8 space-y-8">
            <div className="grid gap-8 md:grid-cols-12">
                <Card className="md:col-span-5 lg:col-span-4 h-fit">
                    <CardHeader>
                        <CardTitle>Kalendář událostí</CardTitle>
                        <CardDescription>Vyberte den pro detaily nebo přidání zápasu.</CardDescription>
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
                                hasBirthday: birthdayDates,
                            }}
                            modifiersStyles={{
                                hasMatch: { fontWeight: 'bold', color: 'hsl(var(--primary))', textDecoration: 'underline' },
                                hasBirthday: { fontWeight: 'bold', color: 'hsl(var(--accent))', textDecoration: 'underline' }
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
                    
                    <div className="grid gap-4">
                        {birthdaysOnSelectedDate.length > 0 && (
                            <Card className="border-l-4 border-l-accent bg-accent/5">
                                <CardHeader className="py-3">
                                    <div className="flex items-center gap-2 text-accent">
                                        <Cake className="h-5 w-5" />
                                        <CardTitle className="text-lg">Dnes má narozeniny</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1">
                                        {birthdaysOnSelectedDate.map(u => (
                                            <div key={u.id} className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={`https://picsum.photos/seed/${u.email}/100/100`} />
                                                    <AvatarFallback>{u.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                                <p className="font-semibold text-lg">{formatName(u.name)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {matchesOnSelectedDate.length > 0 ? (
                            matchesOnSelectedDate.map(match => {
                                const { prefix, opponent } = getMatchDetails(match);
                                return (
                                    <Card key={match.id} className="overflow-hidden border-l-4 border-l-primary">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <Badge variant="outline" className="mb-2">
                                                        {match.type === 'regular' ? 'Základní část' : match.type === 'playoff' ? 'Play-off' : 'Přátelský'}
                                                    </Badge>
                                                    {prefix && <p className="text-xs font-bold text-primary uppercase leading-tight mb-1">{prefix}</p>}
                                                    <CardTitle className="text-2xl break-words">{opponent}</CardTitle>
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
                                )
                            })
                        ) : (
                            !birthdaysOnSelectedDate.length && (
                                <Card>
                                    <CardContent className="py-12 text-center text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>Na tento den nejsou naplánovány žádné události.</p>
                                    </CardContent>
                                </Card>
                            )
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={isAddMatchDialogOpen} onOpenChange={setIsAddMatchDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Přidat zápas na {selectedDate && format(selectedDate, 'd. M. yyyy')}</DialogTitle>
                        <DialogDescription>Zadejte detaily nového zápasu.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddMatch}>
                        <div className="grid gap-6 py-4 p-1">
                            <div className="grid gap-2">
                                <Label htmlFor="opponent">Soupeř</Label>
                                <Input id="opponent" name="opponent" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="time">Čas</Label>
                                    <Input id="time" name="time" type="time" defaultValue="18:00" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="location">Místo</Label>
                                    <Input id="location" name="location" required />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">Typ zápasu</Label>
                                <Select name="type" required value={matchType} onValueChange={(val) => setMatchType(val as Match['type'])}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="regular">Základní část</SelectItem>
                                        <SelectItem value="playoff">Play-off</SelectItem>
                                        <SelectItem value="friendly">Přátelský</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {matchType === 'regular' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="round">Kolo</Label>
                                    <Input id="round" name="round" type="number" min="1" placeholder="Číslo kola" />
                                </div>
                            )}
                            {matchType === 'playoff' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="playoffStage">Fáze</Label>
                                        <Select name="playoffStage" required defaultValue="čtvrtfinále">
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="čtvrtfinále">Čtvrtfinále</SelectItem>
                                                <SelectItem value="semifinále">Semifinále</SelectItem>
                                                <SelectItem value="finále">Finále</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="playoffMatchNumber">Zápas č.</Label>
                                        <Input id="playoffMatchNumber" name="playoffMatchNumber" type="number" min="1" placeholder="Pořadí v sérii" />
                                    </div>
                                </div>
                            )}
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
