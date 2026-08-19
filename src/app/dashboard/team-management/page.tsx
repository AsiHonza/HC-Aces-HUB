'use client'

import { useState, Suspense, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase'
import { collection, doc, updateDoc, deleteDoc, setDoc, query, where, getDocs, writeBatch } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MoreHorizontal, Trash2, UserCog, Edit, ShieldCheck, User as UserIcon, Loader2, Plus, Search, AlertTriangle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  jerseyNumber?: number;
  role: 'admin' | 'classic';
  playerType: 'player' | 'goalie' | 'member';
  dob?: string;
  photoURL?: string | null;
}

const playerTypeLabels: Record<UserProfile['playerType'], string> = {
    player: 'Hráč',
    goalie: 'Brankář',
    member: 'Člen',
};

function TeamManagementContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const firestore = useFirestore()
  const auth = useAuth();
  
  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollectionRef);
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Diagnostika
  const [purgeEmail, setPurgeEmail] = useState('')
  const [isPurging, setIsPurging] = useState(false)

  const role = searchParams.get('role')

  useEffect(() => {
    if (role !== 'admin') {
      toast({ variant: 'destructive', title: 'Přístup odepřen' });
      router.replace('/dashboard');
    }
  }, [role, router, toast])

  const confirmDelete = async () => {
    if (!selectedUser || !firestore) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'users', selectedUser.id, 'skaterStats', 'stats'));
      batch.delete(doc(firestore, 'users', selectedUser.id, 'goalieStats', 'stats'));
      batch.delete(doc(firestore, 'users', selectedUser.id));
      await batch.commit();
      
      toast({ 
        title: 'Profil smazán z Firestore',
        description: 'Nezapomeňte smazat uživatele i v Firebase Console -> Authentication, aby se mohl znovu registrovat.'
      });
    } catch (error: any) { 
        toast({ variant: 'destructive', title: 'Chyba', description: error.message }); 
    }
    finally { setIsSaving(false); setIsDeleteDialogOpen(false); setSelectedUser(null); }
  }

  const handlePurgeByEmail = async () => {
    if (!firestore || !purgeEmail) return;
    setIsPurging(true);
    try {
        const q = query(collection(firestore, 'users'), where('email', '==', purgeEmail.trim().toLowerCase()));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(firestore);
        let count = 0;

        snapshot.docs.forEach(uDoc => {
            batch.delete(doc(firestore, 'users', uDoc.id, 'skaterStats', 'stats'));
            batch.delete(doc(firestore, 'users', uDoc.id, 'goalieStats', 'stats'));
            batch.delete(doc(firestore, 'users', uDoc.id));
            count++;
        });

        await batch.commit();
        
        toast({ 
            title: count > 0 ? 'Data vyčištěna' : 'Záznamy nenalezeny', 
            description: count > 0 
                ? 'Firestore záznamy byly smazány. Nyní musíte smazat účet v Authentication v konzoli.' 
                : 'V databázi Firestore nebyl pro tento e-mail nalezen žádný profil. Pokud registrace nefunguje, problém je v Authentication v konzoli.'
        });
        
        if (count > 0) setPurgeEmail('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Chyba', description: error.message });
    } finally {
        setIsPurging(false);
    }
  }

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser || !firestore) return;
    setIsSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const update: any = { 
          name: fd.get('name'), 
          phoneNumber: fd.get('phoneNumber'), 
          jerseyNumber: fd.get('jerseyNumber') ? Number(fd.get('jerseyNumber')) : null, 
          dob: fd.get('dob') || null, 
          playerType: fd.get('playerType') 
      };
      await updateDoc(doc(firestore, 'users', selectedUser.id), update);
      toast({ title: 'Profil aktualizován' });
    } catch (error: any) { 
        toast({ variant: 'destructive', title: 'Chyba', description: error.message }); 
    }
    finally { setIsSaving(false); setIsEditDialogOpen(false); setSelectedUser(null); }
  }

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setIsSaving(true);
    try {
        const fd = new FormData(e.currentTarget);
        const name = fd.get('name') as string;
        const jersey = fd.get('jerseyNumber') as string;
        const type = fd.get('playerType') as UserProfile['playerType'];
        const email = `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '.')}.${Math.random().toString(36).substring(2,7)}@aces.test`;
        
        const uc = await createUserWithEmailAndPassword(auth, email, 'Aces123456!');
        await updateProfile(uc.user, { displayName: name });
        
        await setDoc(doc(firestore, 'users', uc.user.uid), { 
            id: uc.user.uid, 
            name, 
            email, 
            role: 'classic', 
            playerType: type, 
            jerseyNumber: jersey ? Number(jersey) : null 
        });
        
        if (type === 'player') {
            await setDoc(doc(firestore, `users/${uc.user.uid}/skaterStats`, 'stats'), { 
                userProfileId: uc.user.uid, 
                seasonGoals: 0, 
                seasonAssists: 0, 
                seasonGamesPlayed: 0, 
                playoffGoals: 0, 
                playoffAssists: 0, 
                playoffGamesPlayed: 0, 
                historicalGoals: 0, 
                historicalAssists: 0, 
                historicalGamesPlayed: 0 
            });
        } else if (type === 'goalie') {
            await setDoc(doc(firestore, `users/${uc.user.uid}/goalieStats`, 'stats'), { 
                userProfileId: uc.user.uid, 
                seasonGamesPlayed: 0, 
                seasonWins: 0, 
                seasonSaves: 0, 
                seasonShotsAgainst: 0, 
                seasonSO: 0, 
                playoffGamesPlayed: 0, 
                playoffWins: 0, 
                playoffSaves: 0, 
                playoffShotsAgainst: 0, 
                playoffSO: 0, 
                historicalGamesPlayed: 0, 
                historicalWins: 0, 
                historicalSaves: 0, 
                historicalShotsAgainst: 0, 
                historicalSO: 0 
            });
        }
        toast({ title: 'Účet vytvořen' });
        setIsAddDialogOpen(false);
    } catch (error: any) { 
        if (error.code === 'auth/email-already-in-use') {
            toast({ 
                variant: 'destructive', 
                title: 'E-mail je již používán', 
                description: 'Tento e-mail už má v systému vytvořený účet (Authentication). Pokud nevidíte profil hráče výše, musíte účet nejdříve smazat v Firebase Console.' 
            });
        } else {
            toast({ variant: 'destructive', title: 'Chyba', description: error.message }); 
        }
    }
    finally { setIsSaving(false); }
  };
  
  if (usersLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>

  return (
    <div className="py-8 space-y-8">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Správa týmu</CardTitle>
                <CardDescription>Seznam všech registrovaných uživatelů.</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="mr-2 h-4" />Přidat účet</Button>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hráč</TableHead>
                            <TableHead className="hidden md:table-cell">Kontakt</TableHead>
                            <TableHead>Pozice</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={u.photoURL ?? `https://picsum.photos/seed/${u.email}/100/100`} />
                                            <AvatarFallback>{u.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-bold leading-none">{u.name}</div>
                                            <div className="text-[10px] text-muted-foreground mt-1">{u.jerseyNumber ? `#${u.jerseyNumber}` : 'bez čísla'}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{u.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                        {playerTypeLabels[u.playerType]}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold">
                                        {u.role === 'admin' ? 'Admin' : 'Hráč'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }}>
                                                <Edit className="mr-2 h-4" /> Upravit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }}>
                                                <Trash2 className="mr-2 h-4" /> Smazat z DB
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5 shadow-inner">
          <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Diagnostika a opravy zaseknutých uživatelů
              </CardTitle>
              <CardDescription>
                  Pokud se hráč <strong>nemůže registrovat</strong> nebo ho nevidíte v seznamu, použijte tento postup.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid gap-4 bg-background/50 p-4 rounded-lg border border-destructive/10">
                  <h4 className="font-bold text-sm flex items-center gap-2"><span className="bg-destructive text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px]">1</span> KROK: Vyčištění databáze Firestore</h4>
                  <p className="text-xs text-muted-foreground">Tento nástroj najde a smaže "neviditelný" profil v databázi.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                          <Label htmlFor="purgeEmail" className="sr-only">Email uživatele</Label>
                          <Input 
                            id="purgeEmail" 
                            placeholder="Zadejte email (např. t.macek1@email.cz)" 
                            value={purgeEmail} 
                            onChange={(e) => setPurgeEmail(e.target.value)}
                          />
                      </div>
                      <Button variant="destructive" onClick={handlePurgeByEmail} disabled={isPurging || !purgeEmail}>
                          {isPurging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                          Vyčistit Firestore
                      </Button>
                  </div>
              </div>

              <div className="grid gap-4 bg-background/50 p-4 rounded-lg border border-destructive/10">
                  <h4 className="font-bold text-sm flex items-center gap-2"><span className="bg-destructive text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px]">2</span> KROK: Smazání z Authentication (Povinné)</h4>
                  <div className="text-xs space-y-2 text-muted-foreground">
                      <p>Firebase odděluje přihlašovací údaje (Auth) a data profilu (Firestore). Pokud smažete pouze Firestore data, uživatel se stále nemůže znovu registrovat se stejným e-mailem.</p>
                      <p className="font-bold text-foreground">Musíte provést smazání v administraci Firebase:</p>
                      <ol className="list-decimal ml-4 space-y-1">
                          <li>Otevřete <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="h-3 w-3" /></a></li>
                          <li>Přejděte do sekce <strong>Build -&gt; Authentication</strong></li>
                          <li>V seznamu uživatelů vyhledejte daný e-mail</li>
                          <li>Smažte uživatelský účet pomocí ikonky koše (Delete account)</li>
                      </ol>
                  </div>
              </div>
          </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Upravit profil</DialogTitle></DialogHeader>
            {selectedUser && (
                <form onSubmit={handleUpdateUser}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Jméno a příjmení</Label>
                            <Input name="name" defaultValue={selectedUser.name} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Telefon</Label>
                                <Input name="phoneNumber" defaultValue={selectedUser.phoneNumber ?? ''} placeholder="+420..." />
                            </div>
                            <div className="grid gap-2">
                                <Label>Číslo dresu</Label>
                                <Input name="jerseyNumber" type="number" defaultValue={selectedUser.jerseyNumber ?? ''} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Pozice</Label>
                            <Select name="playerType" defaultValue={selectedUser.playerType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="player">Hráč</SelectItem>
                                    <SelectItem value="goalie">Brankář</SelectItem>
                                    <SelectItem value="member">Člen</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Datum narození</Label>
                            <Input name="dob" type="date" defaultValue={selectedUser.dob ?? ''} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Zrušit</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Uložit změny
                        </Button>
                    </DialogFooter>
                </form>
            )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Smazat uživatele z Firestore?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                      <p>Tato akce smaže profil hráče a jeho statistiky z databáze Firestore.</p>
                      <p className="font-bold text-destructive">Pozor: Účet pro přihlášení (Authentication) zůstane zachován a hráč se nebude moci znovu registrovat, dokud jej nesmažete manuálně v konzoli Firebase!</p>
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive">Smazat data profilu</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Nový účet</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateUser}>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Celé jméno</Label>
                        <Input name="name" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Pozice</Label>
                            <Select name="playerType" required>
                                <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="player">Hráč</SelectItem>
                                    <SelectItem value="goalie">Brankář</SelectItem>
                                    <SelectItem value="member">Člen</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Dres</Label>
                            <Input name="jerseyNumber" type="number" />
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded">
                        * Systém vygeneruje testovací email a dočasné heslo <strong>Aces123456!</strong>. Hráč si jej může změnit v nastavení.
                    </p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Zrušit</Button>
                    <Button type="submit" disabled={isSaving}>Vytvořit</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TeamManagementPage() { 
    return (
        <Suspense fallback={<div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}>
            <TeamManagementContent />
        </Suspense> 
    ) 
}
