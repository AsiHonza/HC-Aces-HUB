'use client'

import { Suspense, useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { query, collection, Timestamp, collectionGroup, doc, writeBatch, deleteDoc, updateDoc, orderBy } from 'firebase/firestore'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Users, Pencil, Trash2, MoreHorizontal, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

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
  goalieId?: string;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'classic';
  playerType: 'player' | 'goalie' | 'member';
}

interface SkaterStats {
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

interface GoalieStats {
  id: string;
  userProfileId: string;
  seasonGamesPlayed: number;
  seasonWins: number;
  seasonShotsAgainst: number;
  seasonSaves: number;
  playoffGamesPlayed: number;
  playoffWins: number;
  playoffShotsAgainst: number;
  playoffSaves: number;
  historicalGamesPlayed: number;
  historicalWins: number;
  historicalShotsAgainst: number;
  historicalSaves: number;
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
    const goalies = useMemo(() => allUsers.filter(u => u.playerType === 'goalie'), [allUsers]);

    const handleGoalCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCount = parseInt(e.target.value, 10) || 0;
        setGoalCount(newCount);
    };

    return (
        <form onSubmit={onSave}>
            <DialogHeader>
                <DialogTitle>Upravit výsledek zápasu</DialogTitle>
                <DialogDescription>
                    Změňte konečné skóre a statistiky.
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
                                {allUsers.filter(u => u.playerType === 'player').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select name={`assist-${index}`} defaultValue={match.scorers?.[index]?.assist || 'none'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Asistence" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Žádná</SelectItem>
                                {allUsers.filter(u => u.playerType === 'player').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
                 <p className="font-medium mt-4">Statistiky brankáře</p>
                 <div className="grid grid-cols-2 gap-2 items-center">
                    <Select name="goalieId" defaultValue={match.goalieId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Vyberte brankáře" />
                        </SelectTrigger>
                        <SelectContent>
                            {goalies.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="grid gap-1">
                        <Label htmlFor="goalieShotsAgainst">Střely</Label>
                        <Input id="goalieShotsAgainst" name="goalieShotsAgainst" type="number" min="0" defaultValue={match.goalieShotsAgainst} />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="goalieSaves">Zásahy</Label>
                        <Input id="goalieSaves" name="goalieSaves" type="number" min="0" defaultValue={match.goalieSaves} />
                    </div>
                </div>
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

    const allSkaterStatsRef = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return collectionGroup(firestore, 'skaterStats');
    }, [firestore, user]);
    const { data: allSkaterStats, isLoading: skaterStatsLoading } = useCollection<SkaterStats>(allSkaterStatsRef);

    const allGoalieStatsRef = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return collectionGroup(firestore, 'goalieStats');
    }, [firestore, user]);
    const { data: allGoalieStats, isLoading: goalieStatsLoading } = useCollection<GoalieStats>(allGoalieStatsRef);
    
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
    
    const isLoading = userProfileLoading || matchesLoading || usersLoading || skaterStatsLoading || goalieStatsLoading || attendancesLoading;

    const handleEditMatch = (match: Match) => {
        setSelectedMatch(match);
        setIsEditDialogOpen(true);
    };

    const handleDeleteMatch = (match: Match) => {
        setSelectedMatch(match);
        setIsDeleteDialogOpen(true);
    };
    
    const confirmDeleteMatch = async () => {
        if (!selectedMatch || !firestore || !allSkaterStats || !allGoalieStats) return;
    
        const batch = writeBatch(firestore);
        const matchType = selectedMatch.type;
        
        if (matchType !== 'friendly') {
            // Revert skater stats
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
        
            const allSkaterStatsMap = new Map(allSkaterStats.map(s => [s.userProfileId, s]));
            for (const [userId, revert] of statsToRevert.entries()) {
                const userStats = allSkaterStatsMap.get(userId);
                if (userStats) {
                    const statDocRef = doc(firestore, 'users', userId, 'skaterStats', userStats.id);
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
            
            const matchAttendees = attendancesByMatch.get(selectedMatch.id) || [];
            matchAttendees.forEach(att => {
                const userStats = allSkaterStatsMap.get(att.userId);
                if (att.status === 'going' && userStats) {
                    const statDocRef = doc(firestore, 'users', att.userId, 'skaterStats', userStats.id);
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

            // Revert goalie stats
            if (selectedMatch.goalieId) {
                const allGoalieStatsMap = new Map(allGoalieStats.map(s => [s.userProfileId, s]));
                const goalieStats = allGoalieStatsMap.get(selectedMatch.goalieId);
                if (goalieStats) {
                    const goalieStatRef = doc(firestore, 'users', selectedMatch.goalieId, 'goalieStats', goalieStats.id);
                    const isWin = (selectedMatch.team1Score ?? 0) > (selectedMatch.team2Score ?? 0);
                    const update: any = {};
                     if (matchType === 'playoff') {
                        update.playoffGamesPlayed = Math.max(0, (goalieStats.playoffGamesPlayed || 0) - 1);
                        if (isWin) update.playoffWins = Math.max(0, (goalieStats.playoffWins || 0) - 1);
                        update.playoffSaves = Math.max(0, (goalieStats.playoffSaves || 0) - (selectedMatch.goalieSaves || 0));
                        update.playoffShotsAgainst = Math.max(0, (goalieStats.playoffShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0));
                    } else {
                        update.seasonGamesPlayed = Math.max(0, (goalieStats.seasonGamesPlayed || 0) - 1);
                        if (isWin) update.seasonWins = Math.max(0, (goalieStats.seasonWins || 0) - 1);
                        update.seasonSaves = Math.max(0, (goalieStats.seasonSaves || 0) - (selectedMatch.goalieSaves || 0));
                        update.seasonShotsAgainst = Math.max(0, (goalieStats.seasonShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0));
                    }
                    batch.update(goalieStatRef, update);
                }
            }
        }

        const matchRef = doc(firestore, 'matches', selectedMatch.id);
        batch.delete(matchRef);
    
        try {
            await batch.commit();
            toast({ title: "Zápas smazán." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Chyba", description: `Nepodařilo se smazat zápas: ${error.message}` });
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedMatch(null);
        }
    }

    const handleResultSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedMatch || !firestore || !allSkaterStats || !users || !allGoalieStats) return;
        
        try {
            const matchType = selectedMatch.type;

            const formData = new FormData(e.currentTarget);
            const team1Score = parseInt(formData.get('team1Score') as string, 10);
            const team2Score = parseInt(formData.get('team2Score') as string, 10);
            const goalieId = formData.get('goalieId') as string | null;
            const goalieSaves = parseInt(formData.get('goalieSaves') as string, 10) || 0;
            const goalieShotsAgainst = parseInt(formData.get('goalieShotsAgainst') as string, 10) || 0;


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
                // --- Skater Stats Diff ---
                const statsDiff = new Map<string, { goals: number, assists: number }>();
                selectedMatch.scorers?.forEach(scorer => {
                    if (scorer.goal) statsDiff.set(scorer.goal, { ...statsDiff.get(scorer.goal) || { goals: 0, assists: 0 }, goals: -1 });
                    if (scorer.assist) statsDiff.set(scorer.assist, { ...statsDiff.get(scorer.assist) || { goals: 0, assists: 0 }, assists: -1 });
                });
                newScorersData.forEach(scorer => {
                    if (scorer.goal) statsDiff.set(scorer.goal, { ...statsDiff.get(scorer.goal) || { goals: 0, assists: 0 }, goals: (statsDiff.get(scorer.goal)?.goals || 0) + 1 });
                    if (scorer.assist) statsDiff.set(scorer.assist, { ...statsDiff.get(scorer.assist) || { goals: 0, assists: 0 }, assists: (statsDiff.get(scorer.assist)?.assists || 0) + 1 });
                });
                const allSkaterStatsMap = new Map(allSkaterStats.map(s => [s.userProfileId, s]));
                for (const [userId, diff] of statsDiff.entries()) {
                    const userStats = allSkaterStatsMap.get(userId);
                    if (userStats) {
                        const statDocRef = doc(firestore, 'users', userId, 'skaterStats', userStats.id);
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
                
                // --- Goalie Stats Diff ---
                const allGoalieStatsMap = new Map(allGoalieStats.map(s => [s.userProfileId, s]));
                // Revert old goalie stats if goalie changed
                if (selectedMatch.goalieId && selectedMatch.goalieId !== goalieId) {
                    const oldGoalieStats = allGoalieStatsMap.get(selectedMatch.goalieId);
                    if (oldGoalieStats) {
                        const oldGoalieStatRef = doc(firestore, 'users', selectedMatch.goalieId, 'goalieStats', oldGoalieStats.id);
                        const isOldWin = (selectedMatch.team1Score ?? 0) > (selectedMatch.team2Score ?? 0);
                        const update: any = {};
                        if (matchType === 'playoff') {
                            update.playoffWins = Math.max(0, (oldGoalieStats.playoffWins || 0) - (isOldWin ? 1 : 0));
                            update.playoffSaves = Math.max(0, (oldGoalieStats.playoffSaves || 0) - (selectedMatch.goalieSaves || 0));
                            update.playoffShotsAgainst = Math.max(0, (oldGoalieStats.playoffShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0));
                        } else {
                            update.seasonWins = Math.max(0, (oldGoalieStats.seasonWins || 0) - (isOldWin ? 1 : 0));
                            update.seasonSaves = Math.max(0, (oldGoalieStats.seasonSaves || 0) - (selectedMatch.goalieSaves || 0));
                            update.seasonShotsAgainst = Math.max(0, (oldGoalieStats.seasonShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0));
                        }
                         batch.update(oldGoalieStatRef, update);
                    }
                }

                // Apply new goalie stats
                if (goalieId) {
                     const newGoalieStats = allGoalieStatsMap.get(goalieId);
                     if (newGoalieStats) {
                        const newGoalieStatRef = doc(firestore, 'users', goalieId, 'goalieStats', newGoalieStats.id);
                        const isNewWin = team1Score > team2Score;
                        const oldSaves = selectedMatch.goalieId === goalieId ? (selectedMatch.goalieSaves || 0) : 0;
                        const oldShots = selectedMatch.goalieId === goalieId ? (selectedMatch.goalieShotsAgainst || 0) : 0;
                        const oldWin = selectedMatch.goalieId === goalieId && (selectedMatch.team1Score ?? 0) > (selectedMatch.team2Score ?? 0);
                        const update: any = {};

                        if (matchType === 'playoff') {
                            update.playoffWins = Math.max(0, (newGoalieStats.playoffWins || 0) - (oldWin ? 1 : 0) + (isNewWin ? 1 : 0));
                            update.playoffSaves = Math.max(0, (newGoalieStats.playoffSaves || 0) - oldSaves + goalieSaves);
                            update.playoffShotsAgainst = Math.max(0, (newGoalieStats.playoffShotsAgainst || 0) - oldShots + goalieShotsAgainst);
                        } else {
                            update.seasonWins = Math.max(0, (newGoalieStats.seasonWins || 0) - (oldWin ? 1 : 0) + (isNewWin ? 1 : 0));
                            update.seasonSaves = Math.max(0, (newGoalieStats.seasonSaves || 0) - oldSaves + goalieSaves);
                            update.seasonShotsAgainst = Math.max(0, (newGoalieStats.seasonShotsAgainst || 0) - oldShots + goalieShotsAgainst);
                        }
                        batch.update(newGoalieStatRef, update);
                     }
                }
            }

            const matchRef = doc(firestore, 'matches', selectedMatch.id);
            batch.update(matchRef, {
                team1Score,
                team2Score,
                scorers: newScorersData,
                goalieId: goalieId || null,
                goalieSaves: goalieSaves || null,
                goalieShotsAgainst: goalieShotsAgainst || null,
            });

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
                                                            <div
                                                              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                                                              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </div>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleEditMatch(match)}}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Upravit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleDeleteMatch(match)}} className="text-destructive">
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
                                            <div>
                                                <h4 className="font-semibold flex items-center gap-2 mb-2"><Trophy className="h-5 w-5 text-primary" />Kanadské bodování zápasu (Aces)</h4>
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
                                             {match.goalieId && (
                                                <div className="mt-4">
                                                    <h4 className="font-semibold flex items-center gap-2 mb-2"><ShieldCheck className="h-5 w-5 text-primary" />Výkon brankáře</h4>
                                                    <p>
                                                        <strong>Brankář:</strong> {usersMap.get(match.goalieId) || 'Neznámý'}
                                                    </p>
                                                    <p>
                                                        <strong>Zásahy:</strong> {match.goalieSaves} / {match.goalieShotsAgainst}
                                                    </p>
                                                    <p>
                                                        <strong>Úspěšnost:</strong> {match.goalieShotsAgainst ? ((match.goalieSaves || 0) / match.goalieShotsAgainst * 100).toFixed(2) : 'N/A'}%
                                                    </p>
                                                </div>
                                            )}
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

    