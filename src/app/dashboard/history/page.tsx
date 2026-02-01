'use client'

import { Suspense, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { query, collection, Timestamp, collectionGroup, doc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Users, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

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
  role?: 'admin' | 'classic';
}

interface PlayerStats {
  id: string;
  userProfileId: string;
  goals: number;
  assists: number;
  gamesPlayed: number;
}

function EditResultForm({ match, allUsers, onSave, onCancel }: { match: Match, allUsers: UserProfile[], onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>, onCancel: () => void }) {
    const [goalCount, setGoalCount] = useState(match.team1Score || 0);

    const handleGoalCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCount = parseInt(e.target.value, 10) || 0;
        setGoalCount(newCount);
    };

    return (
        <form onSubmit={onSave}>
            <DialogHeader>
                <DialogTitle>Upravit výsledek zápasu</DialogTitle>
                <DialogDescription>
                    Změňte konečné skóre a střelce gólů a asistence.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                <p className="text-center font-bold text-lg">{match.team1} vs {match.team2}</p>
                <div className="grid grid-cols-2 items-center gap-4">
                    <div className="grid gap-2 text-center">
                        <Label htmlFor="team1Score">Aces</Label>
                        <Input id="team1Score" name="team1Score" type="number" className="text-center text-2xl font-bold h-16" min="0" required defaultValue={match.team1Score} onChange={handleGoalCountChange} />
                    </div>
                     <div className="grid gap-2 text-center">
                        <Label htmlFor="team2Score">Soupeř</Label>
                        <Input id="team2Score" name="team2Score" type="number" className="text-center text-2xl font-bold h-16" min="0" required defaultValue={match.team2Score} />
                    </div>
                </div>
                {goalCount > 0 && <p className="font-medium mt-4">Střelci a asistence (Aces)</p>}
                {Array.from({ length: goalCount }).map((_, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 items-center">
                        <Select name={`goal-${index}`} required defaultValue={match.scorers?.[index]?.goal}>
                            <SelectTrigger>
                                <SelectValue placeholder={`Gól ${index + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select name={`assist-${index}`} defaultValue={match.scorers?.[index]?.assist || 'none'}>
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
            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Zrušit</Button>
                <Button type="submit">Uložit změny</Button>
            </DialogFooter>
        </form>
    )
}

function HistoryPageContent() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: userProfileLoading } = useDoc<UserProfile>(userDocRef);

    const matchesQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return collection(firestore, 'matches');
    }, [firestore, user]);
    const { data: allMatches, isLoading: matchesLoading } = useCollection<Match>(matchesQuery);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'users');
    }, [firestore, user]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

    const allStatsRef = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return collectionGroup(firestore, 'playerStats');
    }, [firestore, user]);
    const { data: allStats, isLoading: statsLoading } = useCollection<PlayerStats>(allStatsRef);

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
    
    const isLoading = userProfileLoading || matchesLoading || usersLoading || statsLoading;

    const handleEditMatch = (match: Match) => {
        setSelectedMatch(match);
        setIsEditDialogOpen(true);
    };

    const handleDeleteMatch = (match: Match) => {
        setSelectedMatch(match);
        setIsDeleteDialogOpen(true);
    };
    
    const confirmDeleteMatch = async () => {
        if (!selectedMatch || !firestore || !allStats) return;
    
        const batch = writeBatch(firestore);
        
        const statsToRevert = new Map<string, { goals: number, assists: number }>();
        selectedMatch.scorers?.forEach(scorer => {
            if (scorer.goal) {
                const current = statsToRevert.get(scorer.goal) || { goals: 0, assists: 0 };
                statsToRevert.set(scorer.goal, { ...current, goals: current.goals + 1 });
            }
            if (scorer.assist) {
                const current = statsToRevert.get(scorer.assist) || { goals: 0, assists: 0 };
                statsToRevert.set(scorer.assist, { ...current, assists: current.assists + 1 });
            }
        });
    
        const allStatsMap = new Map(allStats.map(s => [s.userProfileId, s]));
        for (const [userId, revert] of statsToRevert.entries()) {
            const userStats = allStatsMap.get(userId);
            if (userStats) {
                const statDocRef = doc(firestore, 'users', userId, 'playerStats', userStats.id);
                batch.update(statDocRef, {
                    goals: Math.max(0, (userStats.goals || 0) - revert.goals),
                    assists: Math.max(0, (userStats.assists || 0) - revert.assists),
                });
            }
        }
    
        const matchRef = doc(firestore, 'matches', selectedMatch.id);
        batch.delete(matchRef);
    
        try {
            await batch.commit();
            toast({ title: "Zápas smazán." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Chyba", description: `Nepodařilo se smazat zápas: ${error.message}` });
        }
    
        setIsDeleteDialogOpen(false);
        setSelectedMatch(null);
    }

    const handleResultSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedMatch || !firestore || !allStats || !users) return;

        const formData = new FormData(e.currentTarget);
        const team1Score = parseInt(formData.get('team1Score') as string, 10);
        const team2Score = parseInt(formData.get('team2Score') as string, 10);

        const newScorersData: { goal: string, assist: string | null }[] = [];
        for (let i = 0; i < team1Score; i++) {
            const goal = formData.get(`goal-${i}`) as string;
            const assist = formData.get(`assist-${i}`) as string;
            if (goal) {
                newScorersData.push({
                    goal,
                    assist: assist && assist !== 'none' ? assist : null,
                });
            }
        }

        const batch = writeBatch(firestore);
        const statsDiff = new Map<string, { goals: number, assists: number }>();

        selectedMatch.scorers?.forEach(scorer => {
            if (scorer.goal) {
                const current = statsDiff.get(scorer.goal) || { goals: 0, assists: 0 };
                statsDiff.set(scorer.goal, { ...current, goals: current.goals - 1 });
            }
            if (scorer.assist) {
                const current = statsDiff.get(scorer.assist) || { goals: 0, assists: 0 };
                statsDiff.set(scorer.assist, { ...current, assists: current.assists - 1 });
            }
        });

        newScorersData.forEach(scorer => {
            if (scorer.goal) {
                const current = statsDiff.get(scorer.goal) || { goals: 0, assists: 0 };
                statsDiff.set(scorer.goal, { ...current, goals: current.goals + 1 });
            }
            if (scorer.assist) {
                const current = statsDiff.get(scorer.assist) || { goals: 0, assists: 0 };
                statsDiff.set(scorer.assist, { ...current, assists: current.assists + 1 });
            }
        });

        const allStatsMap = new Map(allStats.map(s => [s.userProfileId, s]));
        for (const [userId, diff] of statsDiff.entries()) {
            const userStats = allStatsMap.get(userId);
            if (userStats) {
                const statDocRef = doc(firestore, 'users', userId, 'playerStats', userStats.id);
                batch.update(statDocRef, {
                    goals: Math.max(0, (userStats.goals || 0) + diff.goals),
                    assists: Math.max(0, (userStats.assists || 0) + diff.assists),
                });
            }
        }

        const matchRef = doc(firestore, 'matches', selectedMatch.id);
        batch.update(matchRef, {
            team1Score,
            team2Score,
            scorers: newScorersData,
        });

        try {
            await batch.commit();
            toast({ title: "Výsledek zápasu aktualizován." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Chyba", description: `Nepodařilo se uložit změny: ${error.message}` });
        }

        setIsEditDialogOpen(false);
        setSelectedMatch(null);
    };

    if (isLoading) {
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
                                    <AccordionTrigger className="hover:no-underline text-left">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-2 gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm text-muted-foreground">{format(match.dateTime.toDate(), "EEEE, d. MMMM yyyy", { locale: cs })}</p>
                                                <p className="font-semibold">{match.team1} vs {match.team2}</p>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base sm:text-lg font-bold font-mono">{match.team1Score} : {match.team2Score}</span>
                                                    <Badge variant={getResultBadgeVariant(match.team1Score, match.team2Score)}>{getResultText(match.team1Score, match.team2Score)}</Badge>
                                                </div>
                                                {userProfile?.role === 'admin' && (
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditMatch(match); }}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteMatch(match); }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-4 border-l ml-2 text-sm">
                                        <div className="grid gap-4 pt-2">
                                            <h4 className="font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Kanadské bodování zápasu (Aces)</h4>
                                            {match.scorers && match.scorers.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {match.scorers.map((scorer, i) => (
                                                        <li key={i} className="flex items-center gap-2">
                                                           <Users className="h-4 w-4 text-muted-foreground" />
                                                           <span className="font-medium">{usersMap.get(scorer.goal) || 'Neznámý hráč'}</span>
                                                           {scorer.assist && <span className="text-muted-foreground">(as. {usersMap.get(scorer.assist) || 'Neznámý'})</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : <p className="text-muted-foreground">Žádné zaznamenané góly.</p>}
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

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    {selectedMatch && users && (
                        <EditResultForm 
                            match={selectedMatch} 
                            allUsers={users}
                            onSave={handleResultSave}
                            onCancel={() => setIsEditDialogOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Opravdu chcete smazat tento zápas?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tato akce je nevratná. Záznam o zápase a související statistiky (góly, asistence) budou trvale odstraněny.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Zrušit</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteMatch} className="bg-destructive hover:bg-destructive/90">Smazat</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
