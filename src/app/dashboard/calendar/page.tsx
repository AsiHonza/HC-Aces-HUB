'use client'

import React, { Suspense, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, collection, query, orderBy, Timestamp } from 'firebase/firestore'
import { format, isSameDay, startOfDay, setYear, parseISO, isValid } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Plus, Trophy, MapPin, Clock, Users, Cake, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatName } from '@/lib/utils'
import { toJsDate } from '@/lib/dates'
import {
    getMatchDetails,
    MatchFormDialog,
    CalendarSyncCard,
    downloadMatchIcs,
    matchesService,
    type MatchFormData,
} from '@/features/matches'
import type { Match } from '@/types'

interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'classic';
  dob?: string;
  email: string;
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

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'users');
    }, [firestore, user]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    const isLoading = isUserProfileLoading || areMatchesLoading || areUsersLoading;

    const matchesOnSelectedDate = useMemo(() => {
        if (!allMatches || !selectedDate) return [];
        return allMatches.filter(match => isSameDay(toJsDate(match.dateTime), selectedDate));
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

    const handleAddMatch = async (data: MatchFormData) => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await matchesService.createMatch(firestore, data);
            toast({ title: 'Zápas přidán a tým byl upozorněn.' });
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

    const matchDates = allMatches?.map(m => startOfDay(toJsDate(m.dateTime))) || [];
    const birthdayDates = allUsers?.filter(u => u.dob).map(u => {
        const dob = parseISO(u.dob!);
        if (!isValid(dob)) return null;
        return setYear(dob, new Date().getFullYear());
    }).filter(Boolean) as Date[];

    return (
        <div className="py-8 space-y-8">
            <CalendarSyncCard matches={allMatches || []} />

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
                                hasBirthday: { fontWeight: 'bold', color: '#f59e0b', textDecoration: 'underline' }
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
                            <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
                                <CardHeader className="py-3">
                                    <div className="flex items-center gap-2 text-amber-500">
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
                                const matchStart = toJsDate(match.dateTime);
                                return (
                                    <Card key={match.id} className="overflow-hidden border-l-4 border-l-primary">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <Badge variant="outline" className="mb-2">
                                                        {match.type === 'regular' ? 'Základní část' : match.type === 'playoff' ? 'Play-off' : 'Přátelský'}
                                                    </Badge>
                                                    {prefix && <p className="text-xs font-bold text-primary uppercase leading-tight mb-1">{prefix}</p>}
                                                    <CardTitle className="text-2xl break-words">{opponent}</CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-8"
                                                        onClick={() => downloadMatchIcs(match)}
                                                    >
                                                        <CalendarPlus className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                                        Do kalendáře
                                                    </Button>
                                                    {match.isPlayed && <Badge>Odehráno</Badge>}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="grid gap-2 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-primary" />
                                                <span>
                                                    {format(matchStart, 'HH:mm')}
                                                </span>
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

            <MatchFormDialog
                open={isAddMatchDialogOpen}
                onOpenChange={setIsAddMatchDialogOpen}
                defaultDate={selectedDate}
                onSave={handleAddMatch}
                isSaving={isSaving}
            />
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
