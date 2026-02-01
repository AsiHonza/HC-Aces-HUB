'use client'

import { Suspense, useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { query, collection, Timestamp, collectionGroup, doc, writeBatch, deleteDoc, updateDoc, orderBy } from 'firebase/firestore'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Users, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface Match {
  id: string;
  dateTime: Timestamp;
  location: string;
  team1: string;
  team2: string;
  isPlayed: boolean;
  type: 'regular' | 'playoff' | 'friendly';
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
  seasonGoals: number;
  seasonAssists: number;
  seasonGamesPlayed: number;
  playoffGoals: number;
  playoffAssists: number;
  playoffGamesPlayed: number;
  historicalGoals: number;
  historicalAssists: number;
  historicalGamesPlayed: number;
}

interface Attendance {
    id: string;
    userId: string;
    matchId: string;
    status: 'going' | 'not-going' | 'unknown';
    note?: string;
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
      return query(collection(firestore, 'matches'), orderBy('dateTime', 'desc'));
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

    const matches = useMemo(() => {
        if (!allMatches) return null;
        return allMatches.filter(m => m.isPlayed);
    }, [allMatches]);

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u.name]));
    }, [users]);
    
    const isLoading = userProfileLoading || matchesLoading || usersLoading || statsLoading || attendancesLoading;

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
        const matchType = selectedMatch.type;
        
        if (matchType !== 'friendly') {
            // Revert goals and assists
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
                    const update: any = {};
                    if (matchType === 'playoff') {
                        update.playoffGoals = Math.max(0, (userStats.playoffGoals || 0) - revert.goals);
                        update.playoffAssists = Math.max(0, (userStats.playoffAssists || 0) - revert.assists);
                    } else {
                        update.seasonGoals = Math.max(0, (userStats.seasonGoals || 0) - revert.goals);
                        update.seasonAssists = Math.max(0, (userStats.seasonAssists || 0) - revert.assists);
                    }
                    batch.update(statDocRef, update);
                }
            }
            
            // Revert games played
            const matchAttendees = attendancesByMatch.get(selectedMatch.id) || [];
            matchAttendees.forEach(att => {
                const userStats = allStatsMap.get(att.userId);
                if (att.status === 'going' && userStats) {
                    const statDocRef = doc(firestore, 'users', att.userId, 'playerStats', userStats.id);
                    if (matchType === 'playoff') {
                        batch.update(statDocRef, {
                            playoffGamesPlayed: Math.max(0, (userStats.playoffGamesPlayed || 0) - 1)
                        });
                    } else {
                        batch.update(statDocRef, {
                            seasonGamesPlayed: Math.max(0, (userStats.seasonGamesPlayed || 0) - 1)
                        });
                    }
                }
            });
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

        const matchType = selectedMatch.type;

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

        if (matchType !== 'friendly') {
            const statsDiff = new Map<string, { goals: number, assists: number }>();

            // Revert old stats
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

            // Apply new stats
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
                    const update: any = {};
                    if (matchType === 'playoff') {
                        update.playoffGoals = Math.max(0, (userStats.playoffGoals || 0) + diff.goals);
                        update.playoffAssists = Math.max(0, (userStats.playoffAssists || 0) + diff.assists);
                    } else {
                        update.seasonGoals = Math.max(0, (userStats.seasonGoals || 0) + diff.goals);
                        update.seasonAssists = Math.max(0, (userStats.seasonAssists || 0) + diff.assists);
                    }
                    batch.update(statDocRef, update);
                }
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
        } finally {
            setIsEditDialogOpen(false);
            setSelectedMatch(null);
        }
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

    const renderMatchTypeBadge = (type: Match['type']) => {
        switch (type) {
            case 'playoff': return <Badge variant="outline">Playoff</Badge>;
            case 'friendly': return <Badge variant="secondary">Přátelský</Badge>;
            default: return null;
        }
    }


    return (
        <div className="p-4 sm:p-6 lg:p-8">
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
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-2 gap-y-1 gap-x-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground">{format(match.dateTime.toDate(), "d. M. yy", { locale: cs })}</p>
                                                <p className="font-semibold truncate">{match.team1} vs {match.team2}</p>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm sm:text-base font-bold font-mono">{match.team1Score} : {match.team2Score}</span>
                                                    <Badge variant={getResultBadgeVariant(match.team1Score, match.team2Score)}>{getResultText(match.team1Score, match.team2Score)}</Badge>
                                                    {renderMatchTypeBadge(match.type)}
                                                </div>
                                                {userProfile?.role === 'admin' && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenuItem onClick={() => handleEditMatch(match)}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Upravit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDeleteMatch(match)} className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Smazat
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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
                          Tato akce je nevratná. Záznam o zápase a související statistiky (góly, asistence, odehrané zápasy) budou trvale odstraněny.
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
        <Suspense fallback={<div className="p-4 sm:p-6 lg:p-8">Načítání...</div>}>
            <HistoryPageContent />
        </Suspense>
    )
}
