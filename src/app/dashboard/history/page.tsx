
'use client'

import { Suspense, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase'
import { query, collection, Timestamp, collectionGroup, doc, writeBatch, deleteDoc, updateDoc, orderBy, addDoc } from 'firebase/firestore'
import { format, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Users, Pencil, Trash2, MoreHorizontal, ShieldCheck, View, Plus, MapPin, Calendar as CalendarIcon, Disc } from 'lucide-react'
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
            if (scorer.goal) {
                initialScorers[index] = scorer.goal;
            }
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
            const matchRef = doc(firestore, 'matches', lineupMatch.id);
            await updateDoc(matchRef, { lineup });
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
        if (!selectedMatch || !firestore || !allSkaterStats || !allGoalieStats) return;
    
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            const matchType = selectedMatch.type;
            const allSkaterStatsMap = new Map(allSkaterStats.map(s => [s.userProfileId, s]));
            const allGoalieStatsMap = new Map(allGoalieStats.map(s => [s.userProfileId, s]));

            // Revert skater points and games played
            const statsToRevert = new Map<string, { goals: number, assists: number, gamesPlayed: number }>();
            
            // From scorers
            selectedMatch.scorers?.forEach(scorer => {
                if (scorer.goal) {
                    const current = statsToRevert.get(scorer.goal) || { goals: 0, assists: 0, gamesPlayed: 0 };
                    statsToRevert.set(scorer.goal, { ...current, goals: current.goals + 1 });
                }
                if (scorer.assist) {
                    const current = statsToRevert.get(scorer.assist) || { goals: 0, assists: 0, gamesPlayed: 0 };
                    statsToRevert.set(scorer.assist, { ...current, assists: current.assists + 1 });
                }
            });

            // From attendance or lineup (let's assume anyone in lineup played)
            const playersInMatch = new Set<string>();
            if (selectedMatch.lineup) {
                Object.values(selectedMatch.lineup).forEach(p => { if(p) playersInMatch.add(p.id); });
            } else {
                // Fallback to attendees
                const attendees = attendancesByMatch.get(selectedMatch.id) || [];
                attendees.forEach(a => { if(a.status === 'going') playersInMatch.add(a.userId); });
            }
            
            playersInMatch.forEach(pid => {
                const current = statsToRevert.get(pid) || { goals: 0, assists: 0, gamesPlayed: 0 };
                statsToRevert.set(pid, { ...current, gamesPlayed: 1 });
            });
        
            for (const [userId, revert] of statsToRevert.entries()) {
                const userStats = allSkaterStatsMap.get(userId);
                if (userStats) {
                    const statDocRef = doc(firestore, 'users', userId, 'skaterStats', userStats.id);
                    const update: any = {
                        historicalGoals: Math.max(0, (userStats.historicalGoals || 0) - revert.goals),
                        historicalAssists: Math.max(0, (userStats.historicalAssists || 0) - revert.assists),
                        historicalGamesPlayed: Math.max(0, (userStats.historicalGamesPlayed || 0) - revert.gamesPlayed),
                    };
                    if (matchType === 'playoff') {
                        update.playoffGoals = Math.max(0, (userStats.playoffGoals || 0) - revert.goals);
                        update.playoffAssists = Math.max(0, (userStats.playoffAssists || 0) - revert.assists);
                        update.playoffGamesPlayed = Math.max(0, (userStats.playoffGamesPlayed || 0) - revert.gamesPlayed);
                    } else if (matchType === 'regular') {
                        update.seasonGoals = Math.max(0, (userStats.seasonGoals || 0) - revert.goals);
                        update.seasonAssists = Math.max(0, (userStats.seasonAssists || 0) - revert.assists);
                        update.seasonGamesPlayed = Math.max(0, (userStats.seasonGamesPlayed || 0) - revert.gamesPlayed);
                    }
                    batch.update(statDocRef, update);
                }
            }
            
            // Revert goalie stats
            if (selectedMatch.goalieId) {
                const goalieStats = allGoalieStatsMap.get(selectedMatch.goalieId);
                if (goalieStats) {
                    const goalieStatRef = doc(firestore, 'users', selectedMatch.goalieId, 'goalieStats', goalieStats.id);
                    const isWin = (selectedMatch.team1Score ?? 0) > (selectedMatch.team2Score ?? 0);
                    const update: any = {
                         historicalGamesPlayed: Math.max(0, (goalieStats.historicalGamesPlayed || 0) - 1),
                         historicalWins: isWin ? Math.max(0, (goalieStats.historicalWins || 0) - 1) : (goalieStats.historicalWins || 0),
                         historicalSaves: Math.max(0, (goalieStats.historicalSaves || 0) - (selectedMatch.goalieSaves || 0)),
                         historicalShotsAgainst: Math.max(0, (goalieStats.historicalShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0)),
                    };

                     if (matchType === 'playoff') {
                        update.playoffGamesPlayed = Math.max(0, (goalieStats.playoffGamesPlayed || 0) - 1);
                        if (isWin) update.playoffWins = Math.max(0, (goalieStats.playoffWins || 0) - 1);
                        update.playoffSaves = Math.max(0, (goalieStats.playoffSaves || 0) - (selectedMatch.goalieSaves || 0));
                        update.playoffShotsAgainst = Math.max(0, (goalieStats.playoffShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0));
                    } else if (matchType === 'regular') {
                        update.seasonGamesPlayed = Math.max(0, (goalieStats.seasonGamesPlayed || 0) - 1);
                        if (isWin) update.seasonWins = Math.max(0, (goalieStats.seasonWins || 0) - 1);
                        update.seasonSaves = Math.max(0, (goalieStats.seasonSaves || 0) - (selectedMatch.goalieSaves || 0));
                        update.seasonShotsAgainst = Math.max(0, (goalieStats.seasonShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0));
                    }
                    batch.update(goalieStatRef, update);
                }
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
        if (!firestore || !allSkaterStats || !users || !allGoalieStats) return;
        
        setIsSaving(true);
        try {
            const formData = new FormData(e.currentTarget);
            
            const matchType = formData.get('type') as 'regular' | 'playoff' | 'friendly';
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
            const allSkaterStatsMap = new Map(allSkaterStats.map(s => [s.userProfileId, s]));
            const allGoalieStatsMap = new Map(allGoalieStats.map(s => [s.userProfileId, s]));

            let matchId = selectedMatch?.id;
            const commonMatchData: any = {
                type: matchType,
                team1Score,
                team2Score,
                scorers: newScorersData,
                goalieId: goalieId && goalieId !== 'none' ? goalieId : null,
                goalieSaves,
                goalieShotsAgainst,
            };

            if (matchType === 'regular') {
                commonMatchData.round = Number(formData.get('round')) || null;
                commonMatchData.playoffStage = null;
                commonMatchData.playoffMatchNumber = null;
            } else if (matchType === 'playoff') {
                commonMatchData.playoffStage = formData.get('playoffStage') as string;
                commonMatchData.playoffMatchNumber = Number(formData.get('playoffMatchNumber')) || null;
                commonMatchData.round = null;
            } else {
                commonMatchData.round = null;
                commonMatchData.playoffStage = null;
                commonMatchData.playoffMatchNumber = null;
            }

            if (isNew) {
                const dateStr = formData.get('date') as string;
                const timeStr = formData.get('time') as string;
                const dateTime = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
                
                const matchRef = doc(collection(firestore, 'matches'));
                matchId = matchRef.id;
                batch.set(matchRef, {
                    id: matchId,
                    dateTime: Timestamp.fromDate(dateTime),
                    location: formData.get('location') as string,
                    team1: 'Aces',
                    team2: formData.get('opponent') as string,
                    isPlayed: true,
                    ...commonMatchData,
                });
            }

            // --- Skater Stats Accumulation ---
            const statsDiff = new Map<string, { goals: number, assists: number, gamesPlayed: number }>();
            
            // Revert old version if editing
            if (!isNew && selectedMatch) {
                selectedMatch.scorers?.forEach(scorer => {
                    if (scorer.goal) {
                        const current = statsDiff.get(scorer.goal) || { goals: 0, assists: 0, gamesPlayed: 0 };
                        statsDiff.set(scorer.goal, { ...current, goals: current.goals - 1 });
                    }
                    if (scorer.assist) {
                        const current = statsDiff.get(scorer.assist) || { goals: 0, assists: 0, gamesPlayed: 0 };
                        statsDiff.set(scorer.assist, { ...current, assists: current.assists - 1 });
                    }
                });
                
                // Old games played
                const oldPlayers = new Set<string>();
                if (selectedMatch.lineup) {
                    Object.values(selectedMatch.lineup).forEach(p => { if(p) oldPlayers.add(p.id); });
                } else {
                    selectedMatch.scorers?.forEach(s => { if(s.goal) oldPlayers.add(s.goal); if(s.assist) oldPlayers.add(s.assist); });
                }
                oldPlayers.forEach(pid => {
                    const current = statsDiff.get(pid) || { goals: 0, assists: 0, gamesPlayed: 0 };
                    statsDiff.set(pid, { ...current, gamesPlayed: current.gamesPlayed - 1 });
                });
            }

            // Add new version
            newScorersData.forEach(scorer => {
                if (scorer.goal) {
                    const current = statsDiff.get(scorer.goal) || { goals: 0, assists: 0, gamesPlayed: 0 };
                    statsDiff.set(scorer.goal, { ...current, goals: current.goals + 1 });
                }
                if (scorer.assist) {
                    const current = statsDiff.get(scorer.assist) || { goals: 0, assists: 0, gamesPlayed: 0 };
                    statsDiff.set(scorer.assist, { ...current, assists: current.assists + 1 });
                }
            });
            
            // New games played (from lineup or scorers)
            const newPlayers = new Set<string>();
            if (selectedMatch?.lineup) {
                Object.values(selectedMatch.lineup).forEach(p => { if(p) newPlayers.add(p.id); });
            } else {
                newScorersData.forEach(s => { if(s.goal) newPlayers.add(s.goal); if(s.assist) newPlayers.add(s.assist); });
            }
            newPlayers.forEach(pid => {
                const current = statsDiff.get(pid) || { goals: 0, assists: 0, gamesPlayed: 0 };
                statsDiff.set(pid, { ...current, gamesPlayed: current.gamesPlayed + 1 });
            });

            // Apply to Batch
            for (const [userId, diff] of statsDiff.entries()) {
                const userStats = allSkaterStatsMap.get(userId);
                if (userStats) {
                    const statDocRef = doc(firestore, 'users', userId, 'skaterStats', userStats.id);
                    const update: any = {
                        historicalGoals: Math.max(0, (userStats.historicalGoals || 0) + diff.goals),
                        historicalAssists: Math.max(0, (userStats.historicalAssists || 0) + diff.assists),
                        historicalGamesPlayed: Math.max(0, (userStats.historicalGamesPlayed || 0) + diff.gamesPlayed),
                    };

                    if (matchType !== 'friendly') {
                        if (matchType === 'playoff') {
                            update.playoffGoals = Math.max(0, (userStats.playoffGoals || 0) + diff.goals);
                            update.playoffAssists = Math.max(0, (userStats.playoffAssists || 0) + diff.assists);
                            update.playoffGamesPlayed = Math.max(0, (userStats.playoffGamesPlayed || 0) + diff.gamesPlayed);
                        } else { // regular
                            update.seasonGoals = Math.max(0, (userStats.seasonGoals || 0) + diff.goals);
                            update.seasonAssists = Math.max(0, (userStats.seasonAssists || 0) + diff.assists);
                            update.seasonGamesPlayed = Math.max(0, (userStats.seasonGamesPlayed || 0) + diff.gamesPlayed);
                        }
                    }
                    batch.update(statDocRef, update);
                }
            }
            
            // --- Goalie Stats Accumulation ---
            const oldGoalieId = isNew ? null : selectedMatch?.goalieId;
            const newGoalieId = goalieId === 'none' ? null : goalieId;
            const oldIsWin = isNew ? false : (selectedMatch?.team1Score ?? 0) > (selectedMatch?.team2Score ?? 0);
            const newIsWin = team1Score > team2Score;

            // Revert old goalie stats
            if (oldGoalieId && selectedMatch) {
                const oldGoalieStats = allGoalieStatsMap.get(oldGoalieId);
                if (oldGoalieStats) {
                    const oldGoalieStatRef = doc(firestore, 'users', oldGoalieId, 'goalieStats', oldGoalieStats.id);
                    const update: any = {
                        historicalGamesPlayed: Math.max(0, (oldGoalieStats.historicalGamesPlayed || 0) - 1),
                        historicalWins: Math.max(0, (oldGoalieStats.historicalWins || 0) - (oldIsWin ? 1 : 0)),
                        historicalSaves: Math.max(0, (oldGoalieStats.historicalSaves || 0) - (selectedMatch.goalieSaves || 0)),
                        historicalShotsAgainst: Math.max(0, (oldGoalieStats.historicalShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0)),
                    };
                    if (selectedMatch.type !== 'friendly') {
                        if (selectedMatch.type === 'playoff') {
                            update.playoffGamesPlayed = Math.max(0, (oldGoalieStats.playoffGamesPlayed || 0) - 1);
                            update.playoffWins = Math.max(0, (oldGoalieStats.playoffWins || 0) - (oldIsWin ? 1 : 0));
                            update.playoffSaves = Math.max(0, (oldGoalieStats.playoffSaves || 0) - (selectedMatch.goalieSaves || 0));
                            update.playoffShotsAgainst = Math.max(0, (oldGoalieStats.playoffShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0));
                        } else {
                            update.seasonGamesPlayed = Math.max(0, (oldGoalieStats.seasonGamesPlayed || 0) - 1);
                            update.seasonWins = Math.max(0, (oldGoalieStats.seasonWins || 0) - (oldIsWin ? 1 : 0));
                            update.seasonSaves = Math.max(0, (oldGoalieStats.seasonSaves || 0) - (selectedMatch.goalieSaves || 0));
                            update.seasonShotsAgainst = Math.max(0, (oldGoalieStats.seasonShotsAgainst || 0) - (selectedMatch.goalieShotsAgainst || 0));
                        }
                    }
                    batch.update(oldGoalieStatRef, update);
                }
            }

            // Apply new goalie stats (refetching might be needed if oldGoalieId === newGoalieId, but batch uses final state)
            // To be safe, we calculate it based on the stats AFTER potential revert above
            if (newGoalieId) {
                 const newGoalieStats = allGoalieStatsMap.get(newGoalieId);
                 if (newGoalieStats) {
                    const newGoalieStatRef = doc(firestore, 'users', newGoalieId, 'goalieStats', newGoalieStats.id);
                    
                    // We need the values AFTER the revert if oldGoalieId === newGoalieId
                    const isSame = oldGoalieId === newGoalieId;
                    const baseGames = (newGoalieStats.historicalGamesPlayed || 0) - (isSame ? 1 : 0);
                    const baseWins = (newGoalieStats.historicalWins || 0) - (isSame && oldIsWin ? 1 : 0);
                    const baseSaves = (newGoalieStats.historicalSaves || 0) - (isSame ? (selectedMatch?.goalieSaves || 0) : 0);
                    const baseShots = (newGoalieStats.historicalShotsAgainst || 0) - (isSame ? (selectedMatch?.goalieShotsAgainst || 0) : 0);

                    const update: any = {
                        historicalGamesPlayed: baseGames + 1,
                        historicalWins: baseWins + (newIsWin ? 1 : 0),
                        historicalSaves: baseSaves + goalieSaves,
                        historicalShotsAgainst: baseShots + goalieShotsAgainst,
                    };

                    if (matchType !== 'friendly') {
                        if (matchType === 'playoff') {
                            const bGP = (newGoalieStats.playoffGamesPlayed || 0) - (isSame && selectedMatch?.type === 'playoff' ? 1 : 0);
                            const bW = (newGoalieStats.playoffWins || 0) - (isSame && selectedMatch?.type === 'playoff' && oldIsWin ? 1 : 0);
                            const bS = (newGoalieStats.playoffSaves || 0) - (isSame && selectedMatch?.type === 'playoff' ? (selectedMatch?.goalieSaves || 0) : 0);
                            const bSA = (newGoalieStats.playoffShotsAgainst || 0) - (isSame && selectedMatch?.type === 'playoff' ? (selectedMatch?.goalieShotsAgainst || 0) : 0);
                            
                            update.playoffGamesPlayed = bGP + 1;
                            update.playoffWins = bW + (newIsWin ? 1 : 0);
                            update.playoffSaves = bS + goalieSaves;
                            update.playoffShotsAgainst = bSA + goalieShotsAgainst;
                        } else {
                            const bGP = (newGoalieStats.seasonGamesPlayed || 0) - (isSame && selectedMatch?.type === 'regular' ? 1 : 0);
                            const bW = (newGoalieStats.seasonWins || 0) - (isSame && selectedMatch?.type === 'regular' && oldIsWin ? 1 : 0);
                            const bS = (newGoalieStats.seasonSaves || 0) - (isSame && selectedMatch?.type === 'regular' ? (selectedMatch?.goalieSaves || 0) : 0);
                            const bSA = (newGoalieStats.seasonShotsAgainst || 0) - (isSame && selectedMatch?.type === 'regular' ? (selectedMatch?.goalieShotsAgainst || 0) : 0);

                            update.seasonGamesPlayed = bGP + 1;
                            update.seasonWins = bW + (newIsWin ? 1 : 0);
                            update.seasonSaves = bS + goalieSaves;
                            update.seasonShotsAgainst = bSA + goalieShotsAgainst;
                        }
                    }
                    batch.update(newGoalieStatRef, update);
                 }
            }

            if (!isNew && selectedMatch) {
                const matchRef = doc(firestore, 'matches', selectedMatch.id);
                batch.update(matchRef, commonMatchData);
            }

            await batch.commit();
            toast({ title: isNew ? "Zápas přidán." : "Výsledek zápasu aktualizován." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Chyba", description: `Nepodařilo se uložit změny: ${error.message}` });
        } finally {
            setIsSaving(false);
            setIsEditDialogOpen(false);
            setIsAddMatchDialogOpen(false);
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
                                const { prefix, opponent, fullTitle } = getMatchDetails(match);
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
                                                        {renderMatchTypeBadge(match.type)}
                                                    </div>
                                                    {userProfile?.role === 'admin' && (
                                                        <DropdownMenu modal={false}>
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
                                                {match.lineup && (
                                                    <div className="mt-4">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewLineup(match)}>
                                                            <View className="mr-2 h-4 w-4" />
                                                            Zobrazit sestavu
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : (
                        <p className="text-muted-foreground text-center py-12">Zatím nebyly odehrány žádné zápasy.</p>
                    )}
                </CardContent>
            </Card>

            {/* Add Match Dialog */}
            <Dialog open={isAddMatchDialogOpen} onOpenChange={setIsAddMatchDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Přidat odehraný zápas</DialogTitle>
                        <DialogDescription>Zadejte detaily zápasu a výsledky. Hráči budou vybráni z celého týmu.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => handleResultSave(e, true)}>
                        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="opponent">Soupeř</Label>
                                    <Input id="opponent" name="opponent" placeholder="Název soupeře" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="location">Místo</Label>
                                    <Input id="location" name="location" placeholder="Zimní stadion..." required />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="date">Datum</Label>
                                    <Input id="date" name="date" type="date" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="time">Čas</Label>
                                    <Input id="time" name="time" type="time" defaultValue="18:00" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Typ</Label>
                                    <Select name="type" value={addMatchType} onValueChange={(val) => setAddMatchType(val as Match['type'])}>
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
                            </div>
                            {addMatchType === 'regular' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="round-add" className="text-right">Kolo</Label>
                                    <Input id="round-add" name="round" type="number" min="1" className="col-span-3" />
                                </div>
                            )}
                            {addMatchType === 'playoff' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="playoffStage-add">Fáze</Label>
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
                                        <Label htmlFor="playoffMatchNumber-add">Zápas č.</Label>
                                        <Input id="playoffMatchNumber-add" name="playoffMatchNumber" type="number" min="1" />
                                    </div>
                                </div>
                            )}
                            {users && <MatchResultFormFields allUsers={users} onGoalCountChange={() => {}} />}
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsAddMatchDialogOpen(false)} disabled={isSaving}>Zrušit</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Uložit zápas
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Result Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
                if (!isSaving) {
                    setIsEditDialogOpen(isOpen);
                    if (!isOpen) setSelectedMatch(null);
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upravit výsledek zápasu</DialogTitle>
                        <DialogDescription>Změňte skóre a statistiky. Výběr hráčů je možný z celého týmu.</DialogDescription>
                    </DialogHeader>
                    {selectedMatch && users ? (
                        <form onSubmit={(e) => handleResultSave(e, false)}>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                                <p className="text-center font-bold text-lg">{getMatchDetails(selectedMatch).fullTitle}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="type-edit">Typ</Label>
                                        <Select name="type" value={editMatchType} onValueChange={(val) => setEditMatchType(val as Match['type'])}>
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
                                    {editMatchType === 'regular' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="round-edit">Kolo</Label>
                                            <Input id="round-edit" name="round" type="number" min="1" defaultValue={selectedMatch.round} />
                                        </div>
                                    )}
                                </div>
                                {editMatchType === 'playoff' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="playoffStage-edit">Fáze</Label>
                                            <Select name="playoffStage" required defaultValue={selectedMatch.playoffStage || "čtvrtfinále"}>
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
                                            <Label htmlFor="playoffMatchNumber-edit">Zápas č.</Label>
                                            <Input id="playoffMatchNumber-edit" name="playoffMatchNumber" type="number" min="1" defaultValue={selectedMatch.playoffMatchNumber} />
                                        </div>
                                    </div>
                                )}
                                <MatchResultFormFields match={selectedMatch} allUsers={users} onGoalCountChange={() => {}} />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Zrušit</Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Uložit změny
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                         <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => {
                if (!isSaving) {
                    setIsDeleteDialogOpen(isOpen);
                     if (!isOpen) setSelectedMatch(null);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Opravdu chcete smazat tento zápas?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tato akce je nevratná. Záznam o zápase a související statistiky budou trvale odstraněny.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Zrušit</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteMatch} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Smazat
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isLineupViewOpen} onOpenChange={(isOpen) => {
                setIsLineupViewOpen(isOpen);
                if (!isOpen) {
                    setTimeout(() => {
                        setViewLineupData(null);
                        setViewScorersData(undefined);
                        setViewMatchPrefix('');
                        setViewMatchOpponent('');
                    }, 200);
                }
            }}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{viewMatchOpponent ? `Sestava: ${viewMatchOpponent}` : 'Načítání sestavy...'}</DialogTitle>
                        <DialogDescription>
                            {viewMatchPrefix && <span className="block font-bold text-primary uppercase text-xs mb-1">{viewMatchPrefix}</span>}
                            Sestava a body hráčů v zápase.
                        </DialogDescription>
                    </DialogHeader>
                    {viewLineupData ? (
                        <LineupDisplay lineup={viewLineupData} scorers={viewScorersData} />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isLineupBuilderOpen} onOpenChange={(isOpen) => {
                if (!isSaving) {
                    setIsLineupBuilderOpen(isOpen);
                    if (!isOpen) setLineupMatch(null);
                }
            }}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                     {lineupMatch && users ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Upravit sestavu: {getMatchDetails(lineupMatch).opponent}</DialogTitle>
                                <DialogDescription>Upravte sestavu pro historický zápas. Výběr je možný z celého týmu.</DialogDescription>
                            </DialogHeader>
                            <LineupBuilder
                                players={users}
                                initialData={lineupMatch.lineup}
                                onSave={handleSaveLineup}
                                onCancel={() => setIsLineupBuilderOpen(false)}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}

export default function HistoryPage() {
    return (
        <Suspense fallback={<div className="py-4 sm:py-6 lg:py-8">Načítání historie...</div>}>
            <HistoryPageContent />
        </Suspense>
    )
}
