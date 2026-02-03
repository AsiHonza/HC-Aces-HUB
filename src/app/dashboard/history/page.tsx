'use client'

import { Suspense, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { query, collection, Timestamp, collectionGroup, doc, writeBatch, updateDoc, orderBy, increment } from 'firebase/firestore'
import { format, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Users, Pencil, Trash2, MoreHorizontal, ShieldCheck, View, Plus, Disc } from 'lucide-react'
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
import { LineupBuilder, LineupDisplay, type Lineup } from '@/components/lineup-builder'

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
  team1Score?: number;
  team2Score?: number;
  scorers?: { goal: string; assist: string | null }[];
  goalieId?: string;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
  lineup?: Lineup;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'classic';
  playerType: 'player' | 'goalie' | 'member';
}

interface Attendance {
    id: string;
    userId: string;
    matchId: string;
    status: 'going' | 'not-going' | 'unknown';
    note?: string;
}

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

function MatchResultFormFields({ match, allUsers, onGoalCountChange }: { match?: Partial<Match>, allUsers: UserProfile[], onGoalCountChange: (count: number) => void }) {
    const [goalCount, setGoalCount] = useState(match?.team1Score || 0);
    const [selectedScorers, setSelectedScorers] = useState<Record<number, string | null>>(() => {
        const initialScorers: Record<number, string | null> = {};
        match?.scorers?.forEach((scorer, index) => {
            if (scorer.goal) initialScorers[index] = scorer.goal;
        });
        return initialScorers;
    });

    const goalies = useMemo(() => allUsers.filter(u => u.playerType === 'goalie'), [allUsers]);
    const skaters = useMemo(() => allUsers.filter(u => u.playerType === 'player'), [allUsers]);

    const handleGoalCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCount = parseInt(e.target.value, 10) || 0;
        setGoalCount(newCount);
        onGoalCountChange(newCount);
    };
    
    const handleScorerChange = (index: number, scorerId: string) => {
        setSelectedScorers(prev => ({ ...prev, [index]: scorerId }));
    };

    return (
        <div className="grid gap-4">
            <div className="grid grid-cols-2 items-center gap-4">
                <div className="grid gap-2 text-center">
                    <Label htmlFor="team1Score">Aces</Label>
                    <Input id="team1Score" name="team1Score" type="number" className="text-center text-2xl font-bold h-16" min="0" required defaultValue={match?.team1Score} onChange={handleGoalCountChange} />
                </div>
                 <div className="grid gap-2 text-center">
                    <Label htmlFor="team2Score">Soupeř</Label>
                    <Input id="team2Score" name="team2Score" type="number" className="text-center text-2xl font-bold h-16" min="0" required defaultValue={match?.team2Score} />
                </div>
            </div>
            {goalCount > 0 && <p className="font-medium mt-4">Střelci a asistence (Aces)</p>}
            {Array.from({ length: goalCount }).map((_, index) => (
                <div key={index} className="grid grid-cols-2 gap-2 items-center">
                    <Select name={`goal-${index}`} required defaultValue={match?.scorers?.[index]?.goal} onValueChange={(value) => handleScorerChange(index, value)}>
                        <SelectTrigger>
                            <SelectValue placeholder={`Gól ${index + 1}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {skaters.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select name={`assist-${index}`} defaultValue={match?.scorers?.[index]?.assist || 'none'}>
                        <SelectTrigger>
                            <SelectValue placeholder="Asistence" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Žádná</SelectItem>
                            {skaters.filter(u => u.id !== selectedScorers[index]).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            ))}
             <p className="font-medium mt-4">Statistiky brankáře</p>
             <div className="grid grid-cols-2 gap-2 items-center">
                <Select name="goalieId" defaultValue={match?.goalieId || 'none'}>
                    <SelectTrigger>
                        <SelectValue placeholder="Vyberte brankáře" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Žádný</SelectItem>
                        {goalies.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
             <div className="grid grid-cols-2 gap-2 items-center">
                <div className="grid gap-1">
                    <Label htmlFor="goalieShotsAgainst">Střely</Label>
                    <Input id="goalieShotsAgainst" name="goalieShotsAgainst" type="number" min="0" defaultValue={match?.goalieShotsAgainst} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="goalieSaves">Zásahy</Label>
                    <Input id="goalieSaves" name="goalieSaves" type="number" min="0" defaultValue={match?.goalieSaves} />
                </div>
            </div>
        </div>
    )
}

function HistoryPageContent() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAddMatchDialogOpen, setIsAddMatchDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const [addMatchType, setAddMatchType] = useState<Match['type']>('regular');
    const [editMatchType, setEditMatchType] = useState<Match['type']>('regular');

    const [isSaving, setIsSaving] = useState(false);

    const [isLineupViewOpen, setIsLineupViewOpen] = useState(false);
    const [isLineupBuilderOpen, setIsLineupBuilderOpen] = useState(false);
    const [lineupMatch, setLineupMatch] = useState<Match | null>(null);
    const [viewLineupData, setViewLineupData] = useState<Lineup | null>(null);
    const [viewScorersData, setViewScorersData] = useState<Match['scorers'] | undefined>(undefined);
    const [viewMatchPrefix, setViewMatchPrefix] = useState('');
    const [viewMatchOpponent, setViewMatchOpponent] = useState('');

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

    const attendancesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collectionGroup(firestore, 'attendees'));
    }, [firestore, user]);
    const { data: allAttendances, isLoading: attendancesLoading } = useCollection<Attendance>(attendancesQuery);
    
    const attendancesByMatch = useMemo(() => {
        if (!allAttendances) return new Map<string, Attendance[]>();
        const map = new Map<string, Attendance[]>();
        allAttendances.forEach(att => {
            if (!map.has(att.matchId)) map.set(att.matchId, []);
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
    
    const isLoading = userProfileLoading || matchesLoading || usersLoading || attendancesLoading;

    const handleEditMatch = (match: Match) => {
        setSelectedMatch(match);
        setEditMatchType(match.type);
        setIsEditDialogOpen(true);
    };

    const handleDeleteMatch = (match: Match) => {
        setSelectedMatch(match);
        setIsDeleteDialogOpen(true);
    };

    const handleViewLineup = (match: Match) => {
        if (match.lineup) {
          const { prefix, opponent } = getMatchDetails(match);
          setViewLineupData(match.lineup);
          setViewScorersData(match.scorers);
          setViewMatchPrefix(prefix);
          setViewMatchOpponent(opponent);
          setIsLineupViewOpen(true);
        }
    };

    const handleEditLineup = (match: Match) => {
        setLineupMatch(match);
        setIsLineupBuilderOpen(true);
    };

    const handleSaveLineup = async (lineup: Lineup) => {
        if (!lineupMatch || !firestore) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            const matchRef = doc(firestore, 'matches', lineupMatch.id);
            batch.update(matchRef, { lineup });

            // Stats update for additions/removals
            const oldLineup = lineupMatch.lineup || {};
            const oldPlayerIds = new Set(Object.values(oldLineup).filter(p => p !== null).map(p => p!.id));
            const newPlayerIds = new Set(Object.values(lineup).filter(p => p !== null).map(p => p!.id));

            // Already counted participants shouldn't be touched by lineup delta
            const alreadyCountedIds = new Set<string>();
            lineupMatch.scorers?.forEach(s => {
                if (s.goal) alreadyCountedIds.add(s.goal);
                if (s.assist) alreadyCountedIds.add(s.assist);
            });
            if (lineupMatch.goalieId) alreadyCountedIds.add(lineupMatch.goalieId);

            newPlayerIds.forEach(pid => {
                if (!oldPlayerIds.has(pid) && !alreadyCountedIds.has(pid)) {
                    const statRef = doc(firestore, 'users', pid, 'skaterStats', 'stats');
                    const update: any = { historicalGamesPlayed: increment(1) };
                    if (lineupMatch.type === 'playoff') update.playoffGamesPlayed = increment(1);
                    else if (lineupMatch.type === 'regular') update.seasonGamesPlayed = increment(1);
                    batch.set(statRef, update, { merge: true });
                }
            });

            oldPlayerIds.forEach(pid => {
                if (!newPlayerIds.has(pid) && !alreadyCountedIds.has(pid)) {
                    const statRef = doc(firestore, 'users', pid, 'skaterStats', 'stats');
                    const update: any = { historicalGamesPlayed: increment(-1) };
                    if (lineupMatch.type === 'playoff') update.playoffGamesPlayed = increment(-1);
                    else if (lineupMatch.type === 'regular') update.seasonGamesPlayed = increment(-1);
                    batch.set(statRef, update, { merge: true });
                }
            });

            await batch.commit();
            toast({ title: "Sestava uložena." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Chyba", description: `Nepodařilo se uložit sestavu: ${error.message}` });
        } finally {
            setIsSaving(false);
            setIsLineupBuilderOpen(false);
            setLineupMatch(null);
        }
    };
    
    const confirmDeleteMatch = async () => {
        if (!selectedMatch || !firestore) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            const participants = new Set<string>();
            if (selectedMatch.lineup) {
                Object.values(selectedMatch.lineup).forEach(p => { if(p) participants.add(p.id); });
            }
            selectedMatch.scorers?.forEach(s => {
                if (s.goal) participants.add(s.goal);
                if (s.assist) participants.add(s.assist);
            });
            if (selectedMatch.goalieId) participants.add(selectedMatch.goalieId);

            // Revert all skaters/participants
            for (const pid of participants) {
                const statRef = doc(firestore, 'users', pid, 'skaterStats', 'stats');
                const update: any = { historicalGamesPlayed: increment(-1) };
                if (selectedMatch.type === 'playoff') update.playoffGamesPlayed = increment(-1);
                else if (selectedMatch.type === 'regular') update.seasonGamesPlayed = increment(-1);
                
                let g = 0, a = 0;
                selectedMatch.scorers?.forEach(s => {
                    if (s.goal === pid) g++;
                    if (s.assist === pid) a++;
                });
                if (g > 0) {
                    update.historicalGoals = increment(-g);
                    if (selectedMatch.type === 'playoff') update.playoffGoals = increment(-g);
                    else if (selectedMatch.type === 'regular') update.seasonGoals = increment(-g);
                }
                if (a > 0) {
                    update.historicalAssists = increment(-a);
                    if (selectedMatch.type === 'playoff') update.playoffAssists = increment(-a);
                    else if (selectedMatch.type === 'regular') update.seasonAssists = increment(-a);
                }
                batch.set(statRef, update, { merge: true });
            }
            
            if (selectedMatch.goalieId) {
                const goalieRef = doc(firestore, 'users', selectedMatch.goalieId, 'goalieStats', 'stats');
                const isWin = (selectedMatch.team1Score ?? 0) > (selectedMatch.team2Score ?? 0);
                const update: any = {
                    historicalGamesPlayed: increment(-1),
                    historicalWins: isWin ? increment(-1) : increment(0),
                    historicalSaves: increment(-(selectedMatch.goalieSaves || 0)),
                    historicalShotsAgainst: increment(-(selectedMatch.goalieShotsAgainst || 0)),
                };
                if (selectedMatch.type === 'playoff') {
                    update.playoffGamesPlayed = increment(-1);
                    if (isWin) update.playoffWins = increment(-1);
                    update.playoffSaves = increment(-(selectedMatch.goalieSaves || 0));
                    update.playoffShotsAgainst = increment(-(selectedMatch.goalieShotsAgainst || 0));
                } else if (selectedMatch.type === 'regular') {
                    update.seasonGamesPlayed = increment(-1);
                    if (isWin) update.seasonWins = increment(-1);
                    update.seasonSaves = increment(-(selectedMatch.goalieSaves || 0));
                    update.seasonShotsAgainst = increment(-(selectedMatch.goalieShotsAgainst || 0));
                }
                batch.set(goalieRef, update, { merge: true });
            }
            
            const matchRef = doc(firestore, 'matches', selectedMatch.id);
            batch.delete(matchRef);
            await batch.commit();
            toast({ title: "Zápas smazán." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Chyba", description: `Nepodařilo se smazat zápas: ${error.message}` });
        } finally {
            setIsSaving(false);
            setIsDeleteDialogOpen(false);
            setSelectedMatch(null);
        }
    }

    const handleResultSave = async (e: React.FormEvent<HTMLFormElement>, isNew: boolean = false) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSaving(true);
        try {
            const formData = new FormData(e.currentTarget);
            const mType = formData.get('type') as 'regular' | 'playoff' | 'friendly';
            const t1Score = parseInt(formData.get('team1Score') as string, 10);
            const t2Score = parseInt(formData.get('team2Score') as string, 10);
            const goalieId = formData.get('goalieId') as string | null;
            const gId = goalieId && goalieId !== 'none' ? goalieId : null;
            const gSaves = parseInt(formData.get('goalieSaves') as string, 10) || 0;
            const gShots = parseInt(formData.get('goalieShotsAgainst') as string, 10) || 0;

            const newScorersData: { goal: string, assist: string | null }[] = [];
            for (let i = 0; i < t1Score; i++) {
                const goal = formData.get(`goal-${i}`) as string;
                const assist = formData.get(`assist-${i}`) as string;
                if (goal) newScorersData.push({ goal, assist: assist && assist !== 'none' ? assist : null });
            }

            const batch = writeBatch(firestore);
            let matchId = selectedMatch?.id;
            const commonMatchData: any = { type: mType, team1Score: t1Score, team2Score: t2Score, scorers: newScorersData, goalieId: gId, goalieSaves: gSaves, goalieShotsAgainst: gShots };

            if (mType === 'regular') {
                commonMatchData.round = Number(formData.get('round')) || null;
                commonMatchData.playoffStage = null; commonMatchData.playoffMatchNumber = null;
            } else if (mType === 'playoff') {
                commonMatchData.playoffStage = formData.get('playoffStage') as string;
                commonMatchData.playoffMatchNumber = Number(formData.get('playoffMatchNumber')) || null;
                commonMatchData.round = null;
            }

            if (isNew) {
                const dateStr = formData.get('date') as string;
                const timeStr = formData.get('time') as string;
                const dateTime = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
                const matchRef = doc(collection(firestore, 'matches'));
                matchId = matchRef.id;
                batch.set(matchRef, { id: matchId, dateTime: Timestamp.fromDate(dateTime), location: formData.get('location') as string, team1: 'Aces', team2: formData.get('opponent') as string, isPlayed: true, ...commonMatchData });
            }

            // Stats Delta Logic
            const oldParticipants = new Set<string>();
            const newParticipants = new Set<string>();
            
            if (!isNew && selectedMatch) {
                if (selectedMatch.lineup) Object.values(selectedMatch.lineup).forEach(p => { if(p) oldParticipants.add(p.id); });
                selectedMatch.scorers?.forEach(s => { if(s.goal) oldParticipants.add(s.goal); if(s.assist) oldParticipants.add(s.assist); });
                if (selectedMatch.goalieId) oldParticipants.add(selectedMatch.goalieId);
            }

            if (selectedMatch?.lineup) Object.values(selectedMatch.lineup).forEach(p => { if(p) newParticipants.add(p.id); });
            newScorersData.forEach(s => { if(s.goal) newParticipants.add(s.goal); if(s.assist) newParticipants.add(s.assist); });
            if (gId) newParticipants.add(gId);

            const allPids = new Set([...oldParticipants, ...newParticipants]);
            for (const pid of allPids) {
                const statRef = doc(firestore, 'users', pid, 'skaterStats', 'stats');
                const update: any = {};
                
                // Games Played diff
                let gpDiff = (newParticipants.has(pid) ? 1 : 0) - (oldParticipants.has(pid) ? 1 : 0);
                if (gpDiff !== 0) {
                    update.historicalGamesPlayed = increment(gpDiff);
                    if (mType === 'playoff') update.playoffGamesPlayed = increment(gpDiff);
                    else if (mType === 'regular') update.seasonGamesPlayed = increment(gpDiff);
                }

                // Goals/Assists diff
                let oldG = 0, oldA = 0, newG = 0, newA = 0;
                if (!isNew && selectedMatch) {
                    selectedMatch.scorers?.forEach(s => { if(s.goal === pid) oldG++; if(s.assist === pid) oldA++; });
                }
                newScorersData.forEach(s => { if(s.goal === pid) newG++; if(s.assist === pid) newA++; });

                let gDiff = newG - oldG;
                let aDiff = newA - oldA;

                if (gDiff !== 0) {
                    update.historicalGoals = increment(gDiff);
                    if (mType === 'playoff') update.playoffGoals = increment(gDiff);
                    else if (mType === 'regular') update.seasonGoals = increment(gDiff);
                }
                if (aDiff !== 0) {
                    update.historicalAssists = increment(aDiff);
                    if (mType === 'playoff') update.playoffAssists = increment(aDiff);
                    else if (mType === 'regular') update.seasonAssists = increment(aDiff);
                }

                if (Object.keys(update).length > 0) batch.set(statRef, update, { merge: true });
            }

            // Goalie diff
            const oldGid = isNew ? null : selectedMatch?.goalieId;
            const newGid = gId;
            if (oldGid) {
                const goalieRef = doc(firestore, 'users', oldGid, 'goalieStats', 'stats');
                const oldIsWin = (selectedMatch?.team1Score ?? 0) > (selectedMatch?.team2Score ?? 0);
                const u: any = { historicalGamesPlayed: increment(-1), historicalWins: oldIsWin ? increment(-1) : increment(0), historicalSaves: increment(-(selectedMatch?.goalieSaves || 0)), historicalShotsAgainst: increment(-(selectedMatch?.goalieShotsAgainst || 0)) };
                if (selectedMatch?.type === 'playoff') { u.playoffGamesPlayed = increment(-1); if (oldIsWin) u.playoffWins = increment(-1); u.playoffSaves = increment(-(selectedMatch?.goalieSaves || 0)); u.playoffShotsAgainst = increment(-(selectedMatch?.goalieShotsAgainst || 0)); }
                else if (selectedMatch?.type === 'regular') { u.seasonGamesPlayed = increment(-1); if (oldIsWin) u.seasonWins = increment(-1); u.seasonSaves = increment(-(selectedMatch?.goalieSaves || 0)); u.seasonShotsAgainst = increment(-(selectedMatch?.goalieShotsAgainst || 0)); }
                batch.set(goalieRef, u, { merge: true });
            }
            if (newGid) {
                const goalieRef = doc(firestore, 'users', newGid, 'goalieStats', 'stats');
                const newIsWin = t1Score > t2Score;
                const u: any = { historicalGamesPlayed: increment(1), historicalWins: newIsWin ? increment(1) : increment(0), historicalSaves: increment(gSaves), historicalShotsAgainst: increment(gShots) };
                if (mType === 'playoff') { u.playoffGamesPlayed = increment(1); u.playoffWins = newIsWin ? increment(1) : increment(0); u.playoffSaves = increment(gSaves); u.playoffShotsAgainst = increment(gShots); }
                else if (mType === 'regular') { u.seasonGamesPlayed = increment(1); u.seasonWins = newIsWin ? increment(1) : increment(0); u.seasonSaves = increment(gSaves); u.seasonShotsAgainst = increment(gShots); }
                batch.set(goalieRef, u, { merge: true });
            }

            if (!isNew && selectedMatch) {
                const matchRef = doc(firestore, 'matches', selectedMatch.id);
                batch.update(matchRef, commonMatchData);
            }

            await batch.commit();
            toast({ title: isNew ? "Zápas přidán." : "Výsledek aktualizován." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Chyba", description: `Nepodařilo se uložit změny: ${error.message}` });
        } finally {
            setIsSaving(false); setIsEditDialogOpen(false); setIsAddMatchDialogOpen(false); setSelectedMatch(null);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>

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
        <div className="py-4 sm:py-6 lg:py-8">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Historie zápasů</CardTitle>
                        <CardDescription>Přehled všech odehraných zápasů a jejich statistik.</CardDescription>
                    </div>
                    {userProfile?.role === 'admin' && (
                        <Button onClick={() => setIsAddMatchDialogOpen(true)} className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            Přidat odehraný zápas
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {matches && matches.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {matches.map(match => {
                                const { prefix, opponent } = getMatchDetails(match);
                                return (
                                    <AccordionItem value={match.id} key={match.id}>
                                        <AccordionTrigger className="hover:no-underline text-left">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-2 gap-y-1 gap-x-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-muted-foreground uppercase leading-none mb-1">{format(match.dateTime.toDate(), "d. M. yy", { locale: cs })}</p>
                                                    {prefix && <p className="text-[9px] font-bold text-primary uppercase leading-tight mb-0.5">{prefix}</p>}
                                                    <p className="font-semibold truncate text-base">{opponent}</p>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm sm:text-base font-bold font-mono">{match.team1Score} : {match.team2Score}</span>
                                                        <Badge variant={getResultBadgeVariant(match.team1Score, match.team2Score)}>{getResultText(match.team1Score, match.team2Score)}</Badge>
                                                    </div>
                                                    {userProfile?.role === 'admin' && (
                                                        <DropdownMenu modal={false}>
                                                            <DropdownMenuTrigger asChild>
                                                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation() }} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </div>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleEditMatch(match)}}>
                                                                    <Pencil className="mr-2 h-4 w-4" /> Upravit výsledek
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleEditLineup(match)}}>
                                                                    <Users className="mr-2 h-4 w-4" /> Upravit sestavu
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
                                                                    <Disc className="h-4 w-4 text-primary" />
                                                                    <span className="font-medium">{usersMap.get(scorer.goal) || 'Neznámý hráč'}</span>
                                                                    {scorer.assist && (
                                                                        <span className="ml-2 flex items-center gap-1.5 text-muted-foreground">
                                                                            <span className="font-bold text-accent text-base">A</span>
                                                                            <span>{usersMap.get(scorer.assist) || 'Neznámý'}</span>
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <p className="text-muted-foreground">Žádné zaznamenané góly.</p>}
                                                </div>
                                                 {match.goalieId && (
                                                    <div className="mt-4">
                                                        <h4 className="font-semibold flex items-center gap-2 mb-2"><ShieldCheck className="h-5 w-5 text-primary" />Výkon brankáře</h4>
                                                        <p><strong>Brankář:</strong> {usersMap.get(match.goalieId) || 'Neznámý'}</p>
                                                        <p><strong>Zásahy:</strong> {match.goalieSaves} / {match.goalieShotsAgainst}</p>
                                                        <p><strong>Úspěšnost:</strong> {match.goalieShotsAgainst ? ((match.goalieSaves || 0) / match.goalieShotsAgainst * 100).toFixed(2) : 'N/A'}%</p>
                                                    </div>
                                                )}
                                                {match.lineup && (
                                                    <div className="mt-4">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewLineup(match)}><View className="mr-2 h-4 w-4" /> Zobrazit sestavu</Button>
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : <p className="text-muted-foreground text-center py-12">Zatím nebyly odehrány žádné zápasy.</p>}
                </CardContent>
            </Card>

            <Dialog open={isAddMatchDialogOpen} onOpenChange={setIsAddMatchDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Přidat odehraný zápas</DialogTitle>
                        <DialogDescription>Zadejte detaily zápasu a výsledky. Účastníci budou započítáni podle střelců a později upravitelné sestavy.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => handleResultSave(e, true)}>
                        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label htmlFor="opponent">Soupeř</Label><Input id="opponent" name="opponent" required /></div>
                                <div className="grid gap-2"><Label htmlFor="location">Místo</Label><Input id="location" name="location" required /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2"><Label htmlFor="date">Datum</Label><Input id="date" name="date" type="date" required /></div>
                                <div className="grid gap-2"><Label htmlFor="time">Čas</Label><Input id="time" name="time" type="time" defaultValue="18:00" required /></div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Typ</Label>
                                    <Select name="type" value={addMatchType} onValueChange={(val) => setAddMatchType(val as Match['type'])}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="regular">Základní část</SelectItem>
                                            <SelectItem value="playoff">Play-off</SelectItem>
                                            <SelectItem value="friendly">Přátelský</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {addMatchType === 'regular' && <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="round-add" className="text-right">Kolo</Label><Input id="round-add" name="round" type="number" min="1" className="col-span-3" /></div>}
                            {addMatchType === 'playoff' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2"><Label htmlFor="playoffStage-add">Fáze</Label><Select name="playoffStage" required defaultValue="čtvrtfinále"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="čtvrtfinále">Čtvrtfinále</SelectItem><SelectItem value="semifinále">Semifinále</SelectItem><SelectItem value="finále">Finále</SelectItem></SelectContent></Select></div>
                                    <div className="grid gap-2"><Label htmlFor="playoffMatchNumber-add">Zápas č.</Label><Input id="playoffMatchNumber-add" name="playoffMatchNumber" type="number" min="1" /></div>
                                </div>
                            )}
                            {users && <MatchResultFormFields allUsers={users} onGoalCountChange={() => {}} />}
                        </div>
                        <DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={() => setIsAddMatchDialogOpen(false)} disabled={isSaving}>Zrušit</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Uložit zápas</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { if (!isSaving) { setIsEditDialogOpen(isOpen); if (!isOpen) setSelectedMatch(null); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Upravit výsledek zápasu</DialogTitle><DialogDescription>Změňte skóre a statistiky.</DialogDescription></DialogHeader>
                    {selectedMatch && users ? (
                        <form onSubmit={(e) => handleResultSave(e, false)}>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                                <p className="text-center font-bold text-lg">{getMatchDetails(selectedMatch).fullTitle}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2"><Label htmlFor="type-edit">Typ</Label><Select name="type" value={editMatchType} onValueChange={(val) => setEditMatchType(val as Match['type'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="regular">Základní část</SelectItem><SelectItem value="playoff">Play-off</SelectItem><SelectItem value="friendly">Přátelský</SelectItem></SelectContent></Select></div>
                                    {editMatchType === 'regular' && <div className="grid gap-2"><Label htmlFor="round-edit">Kolo</Label><Input id="round-edit" name="round" type="number" min="1" defaultValue={selectedMatch.round} /></div>}
                                </div>
                                {editMatchType === 'playoff' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2"><Label htmlFor="playoffStage-edit">Fáze</Label><Select name="playoffStage" required defaultValue={selectedMatch.playoffStage || "čtvrtfinále"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="čtvrtfinále">Čtvrtfinále</SelectItem><SelectItem value="semifinále">Semifinále</SelectItem><SelectItem value="finále">Finále</SelectItem></SelectContent></Select></div>
                                        <div className="grid gap-2"><Label htmlFor="playoffMatchNumber-edit">Zápas č.</Label><Input id="playoffMatchNumber-edit" name="playoffMatchNumber" type="number" min="1" defaultValue={selectedMatch.playoffMatchNumber} /></div>
                                    </div>
                                )}
                                <MatchResultFormFields match={selectedMatch} allUsers={users} onGoalCountChange={() => {}} />
                            </div>
                            <DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Zrušit</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Uložit změny</Button></DialogFooter>
                        </form>
                    ) : <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => { if (!isSaving) { setIsDeleteDialogOpen(isOpen); if (!isOpen) setSelectedMatch(null); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Opravdu chcete smazat tento zápas?</AlertDialogTitle><AlertDialogDescription>Tato akce je nevratná a statistiky budou trvale odečteny všem účastníkům.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel disabled={isSaving}>Zrušit</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteMatch} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Smazat</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isLineupViewOpen} onOpenChange={(isOpen) => { setIsLineupViewOpen(isOpen); if (!isOpen) { setTimeout(() => { setViewLineupData(null); setViewScorersData(undefined); setViewMatchPrefix(''); setViewMatchOpponent(''); }, 200); } }}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader><DialogTitle>{viewMatchOpponent ? `Sestava: ${viewMatchOpponent}` : 'Načítání sestavy...'}</DialogTitle><DialogDescription>{viewMatchPrefix && <span className="block font-bold text-primary uppercase text-xs mb-1">{viewMatchPrefix}</span>}Sestava a body hráčů v zápase.</DialogDescription></DialogHeader>
                    {viewLineupData ? <LineupDisplay lineup={viewLineupData} scorers={viewScorersData} /> : <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                </DialogContent>
            </Dialog>

            <Dialog open={isLineupBuilderOpen} onOpenChange={(isOpen) => { if (!isSaving) { setIsLineupBuilderOpen(isOpen); if (!isOpen) setLineupMatch(null); } }}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                     {lineupMatch && users ? (
                        <><DialogHeader><DialogTitle>Upravit sestavu: {getMatchDetails(lineupMatch).opponent}</DialogTitle><DialogDescription>Změna sestavy u odehraného zápasu automaticky přepočítá odehrané zápasy hráčů.</DialogDescription></DialogHeader><LineupBuilder players={users} initialData={lineupMatch.lineup} onSave={handleSaveLineup} onCancel={() => setIsLineupBuilderOpen(false)} /></>
                    ) : <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function HistoryPage() {
    return <Suspense fallback={<div className="py-4 sm:py-6 lg:py-8">Načítání historie...</div>}><HistoryPageContent /></Suspense>
}
