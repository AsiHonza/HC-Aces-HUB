
'use client'

import { Suspense, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { query, collection, Timestamp, doc, updateDoc, orderBy, setDoc, deleteDoc } from 'firebase/firestore'
import { format, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Pencil, Trash2, MoreHorizontal, View, Plus, Disc, Users, Share2, Search, Filter, Shield, Goal, Calendar, MapPin, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LineupBuilder, LineupDisplay, type Lineup } from '@/components/lineup-builder'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { cn, formatName } from '@/lib/utils'
import { toJsDate } from '@/lib/dates'
import { GoalTimeline, MatchResultFormFields, PlayedMatchAccordionItem } from '@/features/matches'

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
  goalieName?: string;
  goalieSaves?: number;
  goalieShotsAgainst?: number;
  goalieSavePercentage?: number;
  periodScores?: string;
  shotsTeam1?: number;
  shotsTeam2?: number;
  shotsAces?: number;
  shotsOpponent?: number;
  penaltiesTeam1?: number;
  penaltiesTeam2?: number;
  penaltiesAces?: number;
  penaltiesOpponent?: number;
  detailedScorers?: { minute: number; team: string; scorer: string; assist: string | null; isPenaltyShot?: boolean }[];
  gameRoster?: string[];
  opponentRoster?: string[];
  lineup?: Lineup;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'classic';
  playerType: 'player' | 'goalie' | 'member';
}

function getMatchDetails(match: Match) {
    let prefix = '';
    if (match.type === 'regular' && match.round) {
        prefix = `${match.round}. kolo`;
    } else if (match.type === 'playoff' && match.playoffStage) {
        const stage = match.playoffStage.charAt(0).toUpperCase() + match.playoffStage.slice(1);
        prefix = `${stage}${match.playoffMatchNumber ? ` - ${match.playoffMatchNumber}. zápas` : ''}`;
    }
    const opponent = (match.team1 === 'Aces' || match.team1 === 'HC Aces') ? match.team2 : match.team1;
    return { 
        prefix, 
        opponent, 
        fullTitle: prefix ? `[${prefix}] ${opponent}` : opponent 
    };
}

function HistoryPageContent() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAddMatchDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [addMatchType, setAddMatchType] = useState<Match['type']>('regular');
    const [isSaving, setIsSaving] = useState(false);
    const [isLineupViewOpen, setIsLineupViewOpen] = useState(false);
    const [isLineupBuilderOpen, setIsLineupBuilderOpen] = useState(false);
    const [lineupMatch, setLineupMatch] = useState<Match | null>(null);
    const [viewLineupData, setViewLineupData] = useState<Lineup | null>(null);
    const [viewScorersData, setViewScorersData] = useState<Match['scorers'] | undefined>(undefined);
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

    const [searchQuery, setSearchQuery] = useState('');
    const [resultFilter, setResultFilter] = useState<'all' | 'wins' | 'losses'>('all');

    const playedMatches = useMemo(() => allMatches?.filter(m => m.isPlayed) || null, [allMatches]);
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u]) || []), [users]);
    const isLoading = userProfileLoading || matchesLoading || usersLoading;

    const filteredMatches = useMemo(() => {
        if (!playedMatches) return [];
        return playedMatches.filter(m => {
            const { opponent } = getMatchDetails(m);
            if (searchQuery.trim() && !opponent.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
                return false;
            }
            const isAcesHome = /aces/i.test(m.team1);
            const acesScore = isAcesHome ? m.team1Score : m.team2Score;
            const oppScore = isAcesHome ? m.team2Score : m.team1Score;
            const isWin = (acesScore || 0) > (oppScore || 0);

            if (resultFilter === 'wins' && !isWin) return false;
            if (resultFilter === 'losses' && isWin) return false;
            return true;
        });
    }, [playedMatches, searchQuery, resultFilter]);

    const statsCounts = useMemo(() => {
        if (!playedMatches) return { all: 0, wins: 0, losses: 0 };
        let wins = 0;
        let losses = 0;
        playedMatches.forEach(m => {
            const isAcesHome = /aces/i.test(m.team1);
            const acesScore = isAcesHome ? m.team1Score : m.team2Score;
            const oppScore = isAcesHome ? m.team2Score : m.team1Score;
            if ((acesScore || 0) > (oppScore || 0)) wins++;
            else if ((acesScore || 0) < (oppScore || 0)) losses++;
        });
        return { all: playedMatches.length, wins, losses };
    }, [playedMatches]);

    const handleSaveLineup = async (lineup: Lineup) => {
        if (!lineupMatch || !firestore) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(firestore, 'matches', lineupMatch.id), { lineup });
            toast({ title: "Sestava uložena." });
        } catch (error: any) { 
            const permissionError = new FirestorePermissionError({
                path: `matches/${lineupMatch.id}`,
                operation: 'update',
                requestResourceData: { lineup }
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally { 
            setIsSaving(false); setIsLineupBuilderOpen(false); setLineupMatch(null); 
        }
    };
    
    const confirmDeleteMatch = async () => {
        if (!selectedMatch || !firestore) return;
        setIsSaving(true);
        try {
            await deleteDoc(doc(firestore, 'matches', selectedMatch.id));
            toast({ title: "Zápas smazán." });
        } catch (error: any) { 
            const permissionError = new FirestorePermissionError({
                path: `matches/${selectedMatch.id}`,
                operation: 'delete'
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally { 
            setIsSaving(false); setIsDeleteDialogOpen(false); setSelectedMatch(null); 
        }
    }

    const handleResultSave = async (e: React.FormEvent<HTMLFormElement>, isNew: boolean = false) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSaving(true);
        try {
            const fd = new FormData(e.currentTarget);
            const mType = fd.get('type') as Match['type'];
            const t1Score = parseInt(fd.get('team1Score') as string, 10) || 0;
            const t2Score = parseInt(fd.get('team2Score') as string, 10) || 0;
            const goalieId = fd.get('goalieId') as string;
            const goalieSaves = parseInt(fd.get('goalieSaves') as string, 10) || 0;
            const goalieShotsAgainst = parseInt(fd.get('goalieShotsAgainst') as string, 10) || 0;

            const newScorers: any[] = [];
            for (let i = 0; i < t1Score; i++) {
                const goal = fd.get(`goal-${i}`) as string;
                const assist = fd.get(`assist-${i}`) as string;
                if (goal) newScorers.push({ goal, assist: (assist && assist !== 'none') ? assist : null });
            }

            const common: any = { 
                type: mType, 
                team1Score: t1Score, 
                team2Score: t2Score, 
                scorers: newScorers, 
                isPlayed: true,
                goalieId: goalieId !== 'none' ? goalieId : null,
                goalieSaves,
                goalieShotsAgainst
            };
            if (mType === 'regular') {
                common.round = Number(fd.get('round')) || null;
            } else if (mType === 'playoff') { 
                common.playoffStage = fd.get('playoffStage'); 
                common.playoffMatchNumber = Number(fd.get('playoffMatchNumber')) || null; 
            }
            
            if (isNew) {
                const dt = parse(`${fd.get('date')} ${fd.get('time')}`, 'yyyy-MM-dd HH:mm', new Date());
                const matchId = doc(collection(firestore, 'matches')).id;
                await setDoc(doc(firestore, 'matches', matchId), { id: matchId, team1: 'Aces', team2: fd.get('opponent'), location: fd.get('location'), dateTime: Timestamp.fromDate(dt), ...common });
            } else if (selectedMatch) {
                await updateDoc(doc(firestore, 'matches', selectedMatch.id), common);
            }
            
            toast({ title: isNew ? "Zápas přidán." : "Zápas aktualizován." });
        } catch (error: any) { 
            const permissionError = new FirestorePermissionError({
                path: isNew ? 'matches' : `matches/${selectedMatch?.id}`,
                operation: isNew ? 'create' : 'update'
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        finally { setIsSaving(false); setIsAddDialogOpen(false); setIsEditDialogOpen(false); setSelectedMatch(null); }
    };

    if (isLoading) return <div className="flex justify-center h-64"><Loader2 className="animate-spin text-primary" /></div>

    return (
        <div className="py-8 space-y-8">
            <Card className="border-border/60 bg-card/95 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b bg-muted/10 pb-4">
                    <div>
                        <CardTitle className="text-xl sm:text-2xl font-headline flex items-center gap-2">
                            <Trophy className="text-primary h-6 w-6" />
                            Historie odehraných zápasů
                        </CardTitle>
                        <CardDescription>
                            Oficiální výsledky, protokoly utkání, statistiky brankářů a časové osy gólů.
                        </CardDescription>
                    </div>
                    {userProfile?.role === 'admin' && (
                        <Button onClick={() => setIsAddDialogOpen(true)} className="font-bold">
                            <Plus className="mr-2 h-4 w-4" /> Přidat odehraný zápas
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">
                    {/* Search and Filters Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filtrovat podle soupeře..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs sm:text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <Button
                                variant={resultFilter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setResultFilter('all')}
                                className="text-xs h-8 px-3 font-semibold"
                            >
                                Všechny ({statsCounts.all})
                            </Button>
                            <Button
                                variant={resultFilter === 'wins' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setResultFilter('wins')}
                                className={cn("text-xs h-8 px-3 font-semibold", resultFilter !== 'wins' && "text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10")}
                            >
                                Výhry ({statsCounts.wins})
                            </Button>
                            <Button
                                variant={resultFilter === 'losses' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setResultFilter('losses')}
                                className={cn("text-xs h-8 px-3 font-semibold", resultFilter !== 'losses' && "text-rose-500 border-rose-500/30 hover:bg-rose-500/10")}
                            >
                                Prohry ({statsCounts.losses})
                            </Button>
                        </div>
                    </div>

                    {filteredMatches.length ? (
                        <Accordion type="single" collapsible className="w-full space-y-3">
                            {filteredMatches.map(m => (
                                <PlayedMatchAccordionItem
                                    key={m.id}
                                    match={m as any}
                                    usersMap={usersMap}
                                    isAdmin={userProfile?.role === 'admin'}
                                    onViewLineup={() => {
                                        setViewLineupData(m.lineup!);
                                        setViewScorersData(m.scorers);
                                        setViewMatchOpponent(getMatchDetails(m).opponent);
                                        setIsLineupViewOpen(true);
                                    }}
                                    onShareMatch={() => {
                                        const url = new URL(window.location.origin + '/dashboard');
                                        url.searchParams.set('matchId', m.id);
                                        navigator.clipboard.writeText(url.toString()).then(() => toast({ title: "Odkaz zkopírován" }));
                                    }}
                                    onEditResult={() => { setSelectedMatch(m); setIsEditDialogOpen(true); }}
                                    onEditLineup={() => { setLineupMatch(m); setIsLineupBuilderOpen(true); }}
                                    onDeleteMatch={() => { setSelectedMatch(m); setIsDeleteDialogOpen(true); }}
                                />
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground space-y-2">
                            <Trophy className="h-8 w-8 mx-auto opacity-30" />
                            <p className="text-sm">
                                {searchQuery ? `Žádný odehraný zápas neodpovídá výrazu „${searchQuery}“.` : 'Zatím nebyly odehrány žádné zápasy.'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAddMatchDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Přidat odehraný zápas</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => handleResultSave(e, true)}>
                        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4 p-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label>Soupeř</Label><Input name="opponent" required /></div>
                                <div className="grid gap-2"><Label>Místo</Label><Input name="location" required /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2"><Label>Datum</Label><Input name="date" type="date" required /></div>
                                <div className="grid gap-2"><Label>Čas</Label><Input name="time" type="time" defaultValue="18:00" required /></div>
                                <div className="grid gap-2">
                                    <Label>Typ</Label>
                                    <Select name="type" value={addMatchType} onValueChange={(v) => setAddMatchType(v as any)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="regular">Základní část</SelectItem>
                                            <SelectItem value="playoff">Play-off</SelectItem>
                                            <SelectItem value="friendly">Přátelský</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {addMatchType === 'regular' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="round">Kolo</Label>
                                    <Input id="round" name="round" type="number" min="1" placeholder="Číslo kola" />
                                </div>
                            )}
                            {addMatchType === 'playoff' && (
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

                            {users && <MatchResultFormFields allUsers={users} onGoalCountChange={() => {}} />}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Zrušit</Button>
                            <Button type="submit" disabled={isSaving}>Uložit výsledek</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Upravit výsledek</DialogTitle>
                    </DialogHeader>
                    {selectedMatch && users && (
                        <form onSubmit={(e) => handleResultSave(e, false)}>
                            <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4 p-1">
                                <div className="grid gap-2">
                                    <Label>Typ</Label>
                                    <Select name="type" defaultValue={selectedMatch.type}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="regular">Základní část</SelectItem>
                                            <SelectItem value="playoff">Play-off</SelectItem>
                                            <SelectItem value="friendly">Přátelský</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <MatchResultFormFields match={selectedMatch} allUsers={users} onGoalCountChange={() => {}} />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Zrušit</Button>
                                <Button type="submit" disabled={isSaving}>Uložit změny</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Opravdu chcete smazat tento zápas?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Zrušit</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteMatch} className="bg-destructive">Smazat</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isLineupViewOpen} onOpenChange={setIsLineupViewOpen}>
                <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden text-left bg-card border border-border shadow-2xl">
                    <DialogHeader className="px-4 py-2.5 sm:px-6 sm:py-3 flex-shrink-0 border-b">
                        <DialogTitle className="text-lg sm:text-xl font-headline">Sestava na zápas: {viewMatchOpponent || 'HC Aces'}</DialogTitle>
                    </DialogHeader>
                    {viewLineupData && (
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <LineupDisplay lineup={viewLineupData} scorers={viewScorersData} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isLineupBuilderOpen} onOpenChange={setIsLineupBuilderOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle>Editor sestavy</DialogTitle>
                    </DialogHeader>
                    {lineupMatch && users && (
                        <LineupBuilder players={users} initialData={lineupMatch.lineup} onSave={handleSaveLineup} onCancel={() => setIsLineupBuilderOpen(false)} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function HistoryPage() { 
    return (
        <Suspense fallback={<div className="py-8 flex justify-center items-center h-screen"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>}>
            <HistoryPageContent />
        </Suspense> 
    ); 
}
