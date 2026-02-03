
'use client'

import { Suspense, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { query, collection, Timestamp, collectionGroup, doc, writeBatch, updateDoc, orderBy, increment, setDoc, deleteDoc } from 'firebase/firestore'
import { format, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Users, Pencil, Trash2, MoreHorizontal, ShieldCheck, View, Plus, Disc } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
        match?.scorers?.forEach((scorer, index) => { if (scorer.goal) initialScorers[index] = scorer.goal; });
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
                        <SelectTrigger><SelectValue placeholder={`Gól ${index + 1}`} /></SelectTrigger>
                        <SelectContent>{skaters.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select name={`assist-${index}`} defaultValue={match?.scorers?.[index]?.assist || 'none'}>
                        <SelectTrigger><SelectValue placeholder="Asistence" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Vyberte brankáře" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Žádný</SelectItem>
                        {goalies.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
             <div className="grid grid-cols-2 gap-2 items-center">
                <div className="grid gap-1"><Label htmlFor="goalieShotsAgainst">Střely</Label><Input id="goalieShotsAgainst" name="goalieShotsAgainst" type="number" min="0" defaultValue={match?.goalieShotsAgainst} /></div>
                <div className="grid gap-1"><Label htmlFor="goalieSaves">Zásahy</Label><Input id="goalieSaves" name="goalieSaves" type="number" min="0" defaultValue={match?.goalieSaves} /></div>
            </div>
        </div>
    )
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
    const [editMatchType, setEditMatchType] = useState<Match['type']>('regular');
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

    const playedMatches = useMemo(() => allMatches?.filter(m => m.isPlayed) || null, [allMatches]);
    const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u.name]) || []), [users]);
    const isLoading = userProfileLoading || matchesLoading || usersLoading;

    const handleSaveLineup = async (lineup: Lineup) => {
        if (!lineupMatch || !firestore) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            batch.update(doc(firestore, 'matches', lineupMatch.id), { lineup });
            
            const newPids = new Set(Object.values(lineup).filter(p => p !== null).map(p => p!.id));
            newPids.forEach(pid => {
                const update: any = { historicalGamesPlayed: increment(1), userProfileId: pid };
                if (lineupMatch.type === 'playoff') update.playoffGamesPlayed = increment(1);
                else update.seasonGamesPlayed = increment(1);
                batch.set(doc(firestore, 'users', pid, 'skaterStats', 'stats'), update, { merge: true });
            });
            await batch.commit();
            toast({ title: "Sestava uložena." });
        } catch (error: any) { 
            toast({ variant: 'destructive', title: "Chyba", description: error.message }); 
        } finally { 
            setIsSaving(false); setIsLineupBuilderOpen(false); setLineupMatch(null); 
        }
    };
    
    const confirmDeleteMatch = async () => {
        if (!selectedMatch || !firestore) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            const participants = new Set<string>();
            if (selectedMatch.lineup) Object.values(selectedMatch.lineup).forEach(p => { if(p) participants.add(p.id); });
            selectedMatch.scorers?.forEach(s => { if (s.goal) participants.add(s.goal); if (s.assist) participants.add(s.assist); });
            if (selectedMatch.goalieId) participants.add(selectedMatch.goalieId);

            for (const pid of participants) {
                const update: any = { historicalGamesPlayed: increment(-1), userProfileId: pid };
                if (selectedMatch.type === 'playoff') update.playoffGamesPlayed = increment(-1);
                else update.seasonGamesPlayed = increment(-1);
                
                let g = 0, a = 0;
                selectedMatch.scorers?.forEach(s => { if (s.goal === pid) g++; if (s.assist === pid) a++; });
                if (g > 0) { update.historicalGoals = increment(-g); if (selectedMatch.type === 'playoff') update.playoffGoals = increment(-g); else update.seasonGoals = increment(-g); }
                if (a > 0) { update.historicalAssists = increment(-a); if (selectedMatch.type === 'playoff') update.playoffAssists = increment(-a); else update.seasonAssists = increment(-a); }
                batch.set(doc(firestore, 'users', pid, 'skaterStats', 'stats'), update, { merge: true });
            }
            if (selectedMatch.goalieId) {
                const win = (selectedMatch.team1Score || 0) > (selectedMatch.team2Score || 0);
                const u: any = { historicalGamesPlayed: increment(-1), historicalWins: win ? increment(-1) : increment(0), historicalSaves: increment(-(selectedMatch.goalieSaves || 0)), historicalShotsAgainst: increment(-(selectedMatch.goalieShotsAgainst || 0)), userProfileId: selectedMatch.goalieId };
                if (selectedMatch.type === 'playoff') { u.playoffGamesPlayed = increment(-1); if (win) u.playoffWins = increment(-1); u.playoffSaves = increment(-(selectedMatch.goalieSaves || 0)); u.playoffShotsAgainst = increment(-(selectedMatch.goalieShotsAgainst || 0)); }
                else { u.seasonGamesPlayed = increment(-1); if (win) u.seasonWins = increment(-1); u.seasonSaves = increment(-(selectedMatch.goalieSaves || 0)); u.seasonShotsAgainst = increment(-(selectedMatch.goalieShotsAgainst || 0)); }
                batch.set(doc(firestore, 'users', selectedMatch.goalieId, 'goalieStats', 'stats'), u, { merge: true });
            }
            batch.delete(doc(firestore, 'matches', selectedMatch.id));
            await batch.commit();
            toast({ title: "Zápas smazán." });
        } catch (error: any) { toast({ variant: 'destructive', title: "Chyba", description: error.message }); }
        finally { setIsSaving(false); setIsDeleteDialogOpen(false); setSelectedMatch(null); }
    }

    const handleResultSave = async (e: React.FormEvent<HTMLFormElement>, isNew: boolean = false) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSaving(true);
        try {
            const fd = new FormData(e.currentTarget);
            const mType = fd.get('type') as any;
            const t1Score = parseInt(fd.get('team1Score') as string, 10);
            const t2Score = parseInt(fd.get('team2Score') as string, 10);
            const goalieId = fd.get('goalieId') as string;
            const gId = (goalieId && goalieId !== 'none') ? goalieId : null;
            const gSaves = parseInt(fd.get('goalieSaves') as string, 10) || 0;
            const gShots = parseInt(fd.get('goalieShotsAgainst') as string, 10) || 0;
            const newScorers: any[] = [];
            for (let i = 0; i < t1Score; i++) {
                const goal = fd.get(`goal-${i}`) as string;
                const assist = fd.get(`assist-${i}`) as string;
                if (goal) newScorers.push({ goal, assist: (assist && assist !== 'none') ? assist : null });
            }
            const batch = writeBatch(firestore);
            const typePrefix = mType === 'playoff' ? 'playoff' : 'season';
            const participants = new Set<string>();
            newScorers.forEach(s => { if(s.goal) participants.add(s.goal); if(s.assist) participants.add(s.assist); });
            if (gId) participants.add(gId);

            for (const pid of participants) {
                const p = { userProfileId: pid, historicalGamesPlayed: increment(1), [`${typePrefix}GamesPlayed`]: increment(1) };
                let g = 0, a = 0;
                newScorers.forEach(s => { if(s.goal === pid) g++; if(s.assist === pid) a++; });
                if (g > 0) { (p as any).historicalGoals = increment(g); (p as any)[`${typePrefix}Goals`] = increment(g); }
                if (a > 0) { (p as any).historicalAssists = increment(a); (p as any)[`${typePrefix}Assists`] = increment(a); }
                batch.set(doc(firestore, 'users', pid, 'skaterStats', 'stats'), p, { merge: true });
            }
            if (gId) {
                const win = t1Score > t2Score;
                batch.set(doc(firestore, 'users', gId, 'goalieStats', 'stats'), { userProfileId: gId, historicalGamesPlayed: increment(1), historicalWins: increment(win ? 1 : 0), historicalSaves: increment(gSaves), historicalShotsAgainst: increment(gShots), [`${typePrefix}GamesPlayed`]: increment(1), [`${typePrefix}Wins`]: increment(win ? 1 : 0), [`${typePrefix}Saves`]: increment(gSaves), [`${typePrefix}ShotsAgainst`]: increment(gShots) }, { merge: true });
            }

            const common: any = { type: mType, team1Score: t1Score, team2Score: t2Score, scorers: newScorers, goalieId: gId, goalieSaves: gSaves, goalieShotsAgainst: gShots, isPlayed: true };
            if (mType === 'regular') common.round = Number(fd.get('round')) || null;
            else if (mType === 'playoff') { common.playoffStage = fd.get('playoffStage'); common.playoffMatchNumber = Number(fd.get('playoffMatchNumber')) || null; }
            
            if (isNew) {
                const mRef = doc(collection(firestore, 'matches'));
                const dt = parse(`${fd.get('date')} ${fd.get('time')}`, 'yyyy-MM-dd HH:mm', new Date());
                batch.set(mRef, { id: mRef.id, team1: 'Aces', team2: fd.get('opponent'), location: fd.get('location'), dateTime: Timestamp.fromDate(dt), ...common });
            } else if (selectedMatch) {
                batch.update(doc(firestore, 'matches', selectedMatch.id), common);
            }
            await batch.commit();
            toast({ title: isNew ? "Zápas přidán." : "Aktualizováno." });
        } catch (error: any) { toast({ variant: 'destructive', title: "Chyba", description: error.message }); }
        finally { setIsSaving(false); setIsAddDialogOpen(false); setIsEditDialogOpen(false); setSelectedMatch(null); }
    };

    if (isLoading) return <div className="flex justify-center h-64"><Loader2 className="animate-spin text-primary" /></div>

    return (
        <div className="py-8 space-y-8">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Historie</CardTitle>
                        <CardDescription>Všechny odehrané zápasy a výsledky.</CardDescription>
                    </div>
                    {userProfile?.role === 'admin' && <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="mr-2 h-4" />Přidat odehraný zápas</Button>}
                </CardHeader>
                <CardContent>
                    {playedMatches?.length ? (
                        <Accordion type="single" collapsible className="w-full">
                            {playedMatches.map(m => {
                                const { prefix, opponent } = getMatchDetails(m);
                                return (
                                    <AccordionItem value={m.id} key={m.id} className="relative group">
                                        <div className="flex items-center w-full border-b relative">
                                            <AccordionTrigger className="flex-1 text-left hover:no-underline px-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-12 gap-2">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-muted-foreground uppercase">{format(m.dateTime.toDate(), "d. M. yyyy")}</p>
                                                        {prefix && <p className="text-[9px] font-bold text-primary uppercase">{prefix}</p>}
                                                        <p className="font-semibold">{opponent}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <strong className="text-lg">{m.team1Score} : {m.team2Score}</strong>
                                                        <Badge variant={(m.team1Score || 0) > (m.team2Score || 0) ? 'default' : 'destructive'}>
                                                            {(m.team1Score || 0) > (m.team2Score || 0) ? 'Výhra' : 'Prohra'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            {userProfile?.role === 'admin' && (
                                                <div className="absolute right-1 top-4 z-10">
                                                    <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => { setSelectedMatch(m); setEditMatchType(m.type); setIsEditDialogOpen(true); }}>
                                                                <Pencil className="mr-2 h-4" /> Upravit výsledek
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => { setLineupMatch(m); setIsLineupBuilderOpen(true); }}>
                                                                <Users className="mr-2 h-4" /> Upravit sestavu
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => { setSelectedMatch(m); setIsDeleteDialogOpen(true); }} className="text-destructive">
                                                                <Trash2 className="mr-2 h-4" /> Smazat zápas
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </div>
                                        <AccordionContent className="p-4 bg-muted/30">
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div>
                                                    <h4 className="font-semibold flex items-center gap-2 mb-3"><Trophy className="h-4 text-primary" /> Bodování</h4>
                                                    {m.scorers?.length ? (
                                                        <ul className="space-y-2">
                                                            {m.scorers.map((s, i) => (
                                                                <li key={i} className="flex items-center gap-3 text-sm">
                                                                    <Disc className="h-4 w-4 text-primary" />
                                                                    <span className="font-medium">{usersMap.get(s.goal) || 'Neznámý hráč'}</span>
                                                                    {s.assist && (
                                                                        <span className="text-muted-foreground">(A: {usersMap.get(s.assist) || '?'})</span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-muted-foreground text-sm italic">Žádné góly nebyly zaznamenány.</p>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    {m.goalieId && (
                                                        <div>
                                                            <h4 className="font-semibold flex items-center gap-2 mb-2"><ShieldCheck className="h-4 text-primary" /> Brankář</h4>
                                                            <p className="text-sm font-medium">{usersMap.get(m.goalieId)}</p>
                                                            <p className="text-xs text-muted-foreground">Zákroky: {m.goalieSaves} / {m.goalieShotsAgainst} ({m.goalieShotsAgainst ? ((m.goalieSaves! / m.goalieShotsAgainst!) * 100).toFixed(2) : 0} %)</p>
                                                        </div>
                                                    )}
                                                    {m.lineup && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full sm:w-auto"
                                                            onClick={() => { setViewLineupData(m.lineup!); setViewScorersData(m.scorers); setViewMatchOpponent(getMatchDetails(m).opponent); setIsLineupViewOpen(true); }}
                                                        >
                                                            <View className="mr-2 h-4" /> Zobrazit celou sestavu
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : (
                        <p className="text-center py-12 text-muted-foreground">Zatím nebyly odehrány žádné zápasy.</p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAddMatchDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Přidat odehraný zápas</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => handleResultSave(e, true)}>
                        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Upravit výsledek</DialogTitle></DialogHeader>
                    {selectedMatch && users && (
                        <form onSubmit={(e) => handleResultSave(e, false)}>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
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
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader><DialogTitle>Sestava: {viewMatchOpponent}</DialogTitle></DialogHeader>
                    {viewLineupData && <LineupDisplay lineup={viewLineupData} scorers={viewScorersData} />}
                </DialogContent>
            </Dialog>

            <Dialog open={isLineupBuilderOpen} onOpenChange={setIsLineupBuilderOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
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
