
'use client'

import { Suspense, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { query, collection, Timestamp, doc, updateDoc, orderBy, setDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore'
import { format, parse } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Loader2, Trophy, Pencil, Trash2, MoreHorizontal, View, Plus, Disc, Users, Share2 } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Match {
  id: string;
  dateTime: Timestamp;
  location: string;
  team1: string;
  team2: string;
  isPlayed: boolean;
  isStatsExported?: boolean;
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

const formatName = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
};

function MatchResultFormFields({ match, allUsers, onGoalCountChange }: { match?: Partial<Match>, allUsers: UserProfile[], onGoalCountChange: (count: number) => void }) {
    const [goalCount, setGoalCount] = useState(match?.team1Score || 0);
    const skaters = useMemo(() => allUsers.filter(u => u.playerType === 'player'), [allUsers]);
    const goalies = useMemo(() => allUsers.filter(u => u.playerType === 'goalie'), [allUsers]);
    
    const handleGoalCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCount = parseInt(e.target.value, 10) || 0;
        setGoalCount(newCount);
        onGoalCountChange(newCount);
    };

    return (
        <div className="grid gap-4 p-1">
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

            <div className="grid gap-4 border p-4 rounded-lg bg-muted/20">
                <p className="font-bold text-sm uppercase tracking-wider text-primary">Statistiky brankáře</p>
                <div className="grid gap-2">
                    <Label>Brankář</Label>
                    <Select name="goalieId" defaultValue={match?.goalieId || 'none'}>
                        <SelectTrigger><SelectValue placeholder="Vyberte brankáře" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Žádný</SelectItem>
                            {goalies.map(u => <SelectItem key={u.id} value={u.id}>{formatName(u.name)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Zásahy</Label>
                        <Input name="goalieSaves" type="number" min="0" defaultValue={match?.goalieSaves || 0} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Střely proti</Label>
                        <Input name="goalieShotsAgainst" type="number" min="0" defaultValue={match?.goalieShotsAgainst || 0} />
                    </div>
                </div>
            </div>

            {goalCount > 0 && <p className="font-medium mt-4">Střelci a asistence (Aces)</p>}
            <div className="grid gap-3">
                {Array.from({ length: goalCount }).map((_, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 items-center">
                        <div className="grid gap-1.5">
                           <Label className="text-xs text-muted-foreground">Střelec</Label>
                           <Select name={`goal-${index}`} defaultValue={match?.scorers?.[index]?.goal}>
                                <SelectTrigger><SelectValue placeholder={`Vyberte hráče`} /></SelectTrigger>
                                <SelectContent>{skaters.map(u => <SelectItem key={u.id} value={u.id}>{formatName(u.name)}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                           <Label className="text-xs text-muted-foreground">Asistence</Label>
                           <Select name={`assist-${index}`} defaultValue={match?.scorers?.[index]?.assist || 'none'}>
                                <SelectTrigger><SelectValue placeholder="Asistence" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Žádná</SelectItem>
                                    {skaters.map(u => <SelectItem key={u.id} value={u.id}>{formatName(u.name)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ))}
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

    const handleExportStats = async (match: Match) => {
        if (!firestore || !match.lineup) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            // Match regular/friendly to season fields, playoff to playoff fields
            const typePrefix = match.type === 'playoff' ? 'playoff' : 'season';
            const skaterChanges = new Map<string, { goals: number, assists: number, games: number }>();

            // 1. Identification of players from lineup
            Object.values(match.lineup).forEach(p => {
                if (p && p.id) {
                    skaterChanges.set(p.id, { goals: 0, assists: 0, games: 1 });
                }
            });

            // 2. Addition of goals and assists
            match.scorers?.forEach(s => {
                if (s.goal) {
                    const current = skaterChanges.get(s.goal) || { goals: 0, assists: 0, games: 0 };
                    current.goals += 1;
                    skaterChanges.set(s.goal, current);
                }
                if (s.assist) {
                    const current = skaterChanges.get(s.assist) || { goals: 0, assists: 0, games: 0 };
                    current.assists += 1;
                    skaterChanges.set(s.assist, current);
                }
            });

            // 3. Application to SkaterStats
            skaterChanges.forEach((vals, uId) => {
                const ref = doc(firestore, 'users', uId, 'skaterStats', 'stats');
                batch.set(ref, {
                    userProfileId: uId,
                    [`${typePrefix}Goals`]: increment(vals.goals),
                    [`${typePrefix}Assists`]: increment(vals.assists),
                    [`${typePrefix}GamesPlayed`]: increment(vals.games)
                }, { merge: true });
            });

            // 4. Goalies
            if (match.goalieId && match.goalieId !== 'none') {
                const ref = doc(firestore, 'users', match.goalieId, 'goalieStats', 'stats');
                const isWin = (match.team1Score || 0) > (match.team2Score || 0);
                batch.set(ref, {
                    userProfileId: match.goalieId,
                    [`${typePrefix}GamesPlayed`]: increment(1),
                    [`${typePrefix}Wins`]: increment(isWin ? 1 : 0),
                    [`${typePrefix}Saves`]: increment(match.goalieSaves || 0),
                    [`${typePrefix}ShotsAgainst`]: increment(match.goalieShotsAgainst || 0)
                }, { merge: true });
            }

            // 5. Mark match as exported
            batch.update(doc(firestore, 'matches', match.id), { isStatsExported: true });

            await batch.commit();
            toast({ title: "Body byly úspěšně exportovány hráčům." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Chyba exportu", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLineup = async (lineup: Lineup) => {
        if (!lineupMatch || !firestore) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(firestore, 'matches', lineupMatch.id), { lineup });
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
            await deleteDoc(doc(firestore, 'matches', selectedMatch.id));
            toast({ title: "Zápas smazán." });
        } catch (error: any) { 
            toast({ variant: 'destructive', title: "Chyba", description: error.message }); 
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
                        <CardDescription>Odehrané zápasy. Body se zapisují ručně přes tlačítko "Exportovat body".</CardDescription>
                    </div>
                    {userProfile?.role === 'admin' && <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="mr-2 h-4" />Přidat odehraný zápas</Button>}
                </CardHeader>
                <CardContent>
                    {playedMatches?.length ? (
                        <Accordion type="single" collapsible className="w-full">
                            {playedMatches.map(m => {
                                const { prefix, opponent } = getMatchDetails(m);
                                return (
                                    <AccordionItem value={m.id} key={m.id} className="relative">
                                        <div className="flex items-center w-full relative">
                                            <AccordionTrigger className="flex-1 text-left hover:no-underline px-4 border-b">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-12 gap-2">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-muted-foreground uppercase">{format(m.dateTime.toDate(), "d. M. yyyy")}</p>
                                                        {prefix && <p className="text-[9px] font-bold text-primary uppercase">{prefix}</p>}
                                                        <p className="font-semibold">{opponent}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <strong className="text-lg">{String(m.team1Score)} : {String(m.team2Score)}</strong>
                                                        <Badge variant={(m.team1Score || 0) > (m.team2Score || 0) ? 'default' : 'destructive'}>
                                                            {(m.team1Score || 0) > (m.team2Score || 0) ? 'Výhra' : 'Prohra'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            {userProfile?.role === 'admin' && (
                                                <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
                                                    <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => { setSelectedMatch(m); setIsEditDialogOpen(true); }}>
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
                                                                    <span className="font-medium">{formatName(usersMap.get(s.goal) || 'Neznámý hráč')}</span>
                                                                    {s.assist && (
                                                                        <span className="text-muted-foreground">(A: {formatName(usersMap.get(s.assist) || '?')})</span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-muted-foreground text-sm italic">Žádné góly nebyly zaznamenány.</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-3 items-end">
                                                    <div className="flex gap-2">
                                                        {m.lineup && (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => { setViewLineupData(m.lineup!); setViewScorersData(m.scorers); setViewMatchOpponent(getMatchDetails(m).opponent); setIsLineupViewOpen(true); }}
                                                            >
                                                                <View className="mr-2 h-4" /> Zobrazit sestavu
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => {
                                                            const url = new URL(window.location.origin + '/dashboard');
                                                            url.searchParams.set('matchId', m.id);
                                                            navigator.clipboard.writeText(url.toString()).then(() => toast({ title: "Odkaz zkopírován" }));
                                                        }}>
                                                            <Share2 className="mr-2 h-4" /> Sdílet
                                                        </Button>
                                                    </div>

                                                    {userProfile?.role === 'admin' && (
                                                        <div className="mt-2">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="inline-block">
                                                                            <Button 
                                                                                variant={m.isStatsExported ? "secondary" : "default"}
                                                                                size="sm"
                                                                                disabled={!m.lineup || m.isStatsExported || isSaving}
                                                                                onClick={() => handleExportStats(m)}
                                                                                className="font-bold"
                                                                            >
                                                                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                                {m.isStatsExported ? "Body exportovány" : "Exportovat body"}
                                                                            </Button>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        {!m.lineup ? "Pro export bodů je nutné vyplnit sestavu." : m.isStatsExported ? "Statistiky z tohoto zápasu již byly připsány hráčům." : "Připíše zápas a góly/asistence hráčům ze sestavy."}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
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
                    <DialogHeader><DialogTitle>Upravit výsledek</DialogTitle></DialogHeader>
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
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader><DialogTitle>Sestava: {viewMatchOpponent}</DialogTitle></DialogHeader>
                    {viewLineupData && <LineupDisplay lineup={viewLineupData} scorers={viewScorersData} />}
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
