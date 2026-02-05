
'use client'

import { useState, Suspense, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase'
import { collection, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MoreHorizontal, Trash2, UserCog, Edit, ShieldCheck, User as UserIcon, Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/toast-hook-placeholder"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Use local hook instead of missing path during generation
const useToast = () => {
    return {
        toast: ({ title, variant, description }: any) => {
            console.log(title, variant, description);
        }
    }
}

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
  const role = searchParams.get('role')

  useEffect(() => {
    if (role !== 'admin') {
      toast({ variant: 'destructive', title: 'Přístup odepřen' });
      router.replace('/dashboard');
    }
  }, [role, router])

  const confirmDelete = async () => {
    if (!selectedUser || !firestore) return;
    setIsSaving(true);
    try {
      await deleteDoc(doc(firestore, 'users', selectedUser.id));
      toast({ title: 'Smazán' });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Chyba' }); }
    finally { setIsSaving(false); setIsDeleteDialogOpen(false); setSelectedUser(null); }
  }

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser || !firestore) return;
    setIsSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const update: any = { name: fd.get('name'), phoneNumber: fd.get('phoneNumber'), jerseyNumber: Number(fd.get('jerseyNumber')) || null, dob: fd.get('dob') || null, playerType: fd.get('playerType') };
      await updateDoc(doc(firestore, 'users', selectedUser.id), update);
      toast({ title: 'Aktualizován' });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Chyba' }); }
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
        const type = fd.get('playerType') as any;
        const email = `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '.')}.${Math.random().toString(36).substring(2,7)}@aces.test`;
        const uc = await createUserWithEmailAndPassword(auth, email, 'Aces123456!');
        await updateProfile(uc.user, { displayName: name });
        await setDoc(doc(firestore, 'users', uc.user.uid), { id: uc.user.uid, name, email, role: 'classic', playerType: type, jerseyNumber: jersey ? Number(jersey) : null });
        if (type === 'player') {
            await setDoc(doc(firestore, `users/${uc.user.uid}/skaterStats`, 'stats'), { userProfileId: uc.user.uid, seasonGoals: 0, seasonAssists: 0, seasonGamesPlayed: 0, playoffGoals: 0, playoffAssists: 0, playoffGamesPlayed: 0, historicalGoals: 0, historicalAssists: 0, historicalGamesPlayed: 0 });
        } else if (type === 'goalie') {
            await setDoc(doc(firestore, `users/${uc.user.uid}/goalieStats`, 'stats'), { userProfileId: uc.user.uid, seasonGamesPlayed: 0, seasonWins: 0, seasonSaves: 0, seasonShotsAgainst: 0, seasonSO: 0, playoffGamesPlayed: 0, playoffWins: 0, playoffSaves: 0, playoffShotsAgainst: 0, playoffSO: 0, historicalGamesPlayed: 0, historicalWins: 0, historicalSaves: 0, historicalShotsAgainst: 0, historicalSO: 0 });
        }
        toast({ title: 'Účet vytvořen' });
        router.push('/');
    } catch (error: any) { toast({ variant: 'destructive', title: 'Chyba' }); }
    finally { setIsSaving(false); setIsAddDialogOpen(false); }
  };
  
  if (usersLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
  return (
    <div className="py-8">
      <Card><CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><CardTitle>Správa týmu</CardTitle></div><Button onClick={() => setIsAddDialogOpen(true)}><Plus className="mr-2 h-4" />Přidat účet</Button></CardHeader>
        <CardContent><Table><TableHeader><TableRow><TableHead>Hráč</TableHead><TableHead>Kontakt</TableHead><TableHead>Pozice</TableHead><TableHead>Role</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{users?.map((u) => (
                <TableRow key={u.id}><TableCell><div className="flex items-center gap-2"><Avatar className="h-10 w-10"><AvatarImage src={u.photoURL ?? `https://picsum.photos/seed/${u.email}/100/100`} /><AvatarFallback>{u.name[0]}</AvatarFallback></Avatar><div><div className="font-medium">{u.name}</div><div className="text-sm text-muted-foreground">{u.jerseyNumber ? `#${u.jerseyNumber}` : ''}</div></div></div></TableCell><TableCell>{u.email}</TableCell><TableCell><Badge variant="outline">{playerTypeLabels[u.playerType]}</Badge></TableCell><TableCell><Badge variant={u.role==='admin'?'default':'secondary'}>{u.role==='admin'?'Admin':'Hráč'}</Badge></TableCell>
                  <TableCell className="text-right"><DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }}>Upravit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }}>Smazat</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>
              ))}</TableBody></Table></CardContent>
      </Card>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}><DialogContent><DialogHeader><DialogTitle>Upravit</DialogTitle></DialogHeader>{selectedUser && (<form onSubmit={handleUpdateUser}><div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Jméno</Label><Input name="name" defaultValue={selectedUser.name} className="col-span-3" /></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Telefon</Label><Input name="phoneNumber" defaultValue={selectedUser.phoneNumber ?? ''} className="col-span-3" /></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Dres</Label><Input name="jerseyNumber" type="number" defaultValue={selectedUser.jerseyNumber ?? ''} className="col-span-3" /></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Pozice</Label><Select name="playerType" defaultValue={selectedUser.playerType}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="player">Hráč</SelectItem><SelectItem value="goalie">Brankář</SelectItem><SelectItem value="member">Člen</SelectItem></SelectContent></Select></div>
                </div><DialogFooter><Button type="submit">Uložit</Button></DialogFooter></form>)}</DialogContent></Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Smazat?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Ne</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Ano</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogContent><DialogHeader><DialogTitle>Nový účet</DialogTitle></DialogHeader><form onSubmit={handleCreateUser}><div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Jméno</Label><Input name="name" className="col-span-3" required /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Pozice</Label><Select name="playerType" required><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="player">Hráč</SelectItem><SelectItem value="goalie">Brankář</SelectItem><SelectItem value="member">Člen</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Dres</Label><Input name="jerseyNumber" type="number" className="col-span-3" /></div>
            </div><DialogFooter><Button type="submit">Vytvořit</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  )
}

export default function TeamManagementPage() { return <Suspense fallback={<div>Načítání...</div>}><TeamManagementContent /></Suspense> }
