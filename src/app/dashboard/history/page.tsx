'use client'

import { Suspense, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { query, collection, Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function HistoryPageContent() {
    const firestore = useFirestore()

    const matchesQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'matches') : null, 
    [firestore]);
    const { data: allMatches, isLoading: matchesLoading } = useCollection<Match>(matchesQuery);

    const usersQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'users') : null, 
    [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

    const matches = useMemo(() => {
        if (!allMatches) return null;
        return allMatches
            .filter(m => m.isPlayed)
            .sort((a, b) => b.dateTime.toMillis() - a.dateTime.toMillis());
    }, [allMatches]);

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u.name]));
    }, [users]);

    if (matchesLoading || usersLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    const getResultBadgeVariant = (acesScore?: number, opponentScore?: number) => {
        if (acesScore === undefined || opponentScore === undefined) return 'secondary';
        if (acesScore > opponentScore) return 'default';
        if (acesScore < opponentScore) return 'destructive';
        return 'secondary';
    }
     const getResultText = (acesScore?: number, opponentScore?: number) => {
        if (acesScore === undefined || opponentScore === undefined) return 'N/A';
        if (acesScore > opponentScore) return 'Výhra';
        if (acesScore < opponentScore) return 'Prohra';
        return 'Remíza';
    }


    return (
        <div className="container py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Historie zápasů</CardTitle>
                    <CardDescription>Přehled všech odehraných zápasů a jejich statistik.</CardDescription>
                </CardHeader>
                <CardContent>
                    {matches && matches.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {matches.map(match => (
                                <AccordionItem value={match.id} key={match.id}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <div className="flex flex-col text-left">
                                                <span className="text-sm text-muted-foreground">{format(match.dateTime.toDate(), "EEEE, d. MMMM yyyy", { locale: cs })}</span>
                                                <span className="text-lg font-semibold">{match.team1} vs {match.team2}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl font-bold font-mono">{match.team1Score} : {match.team2Score}</span>
                                                <Badge variant={getResultBadgeVariant(match.team1Score, match.team2Score)}>{getResultText(match.team1Score, match.team2Score)}</Badge>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-4 border-l ml-2">
                                        <div className="grid gap-4 pt-2">
                                            <h4 className="font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Kanadské bodování zápasu (Aces)</h4>
                                            {match.scorers && match.scorers.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {match.scorers.map((scorer, i) => (
                                                        <li key={i} className="flex items-center gap-2 text-sm">
                                                           <Users className="h-4 w-4 text-muted-foreground" />
                                                           <span className="font-medium">{usersMap.get(scorer.goal) || 'Neznámý hráč'}</span>
                                                           {scorer.assist && <span className="text-muted-foreground">(as. {usersMap.get(scorer.assist) || 'Neznámý'})</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : <p className="text-sm text-muted-foreground">Žádné zaznamenané góly.</p>}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">Zatím nebyly odehrány žádné zápasy.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function HistoryPage() {
    return (
        <Suspense fallback={<div className="container py-8">Načítání...</div>}>
            <HistoryPageContent />
        </Suspense>
    )
}
