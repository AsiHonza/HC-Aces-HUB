'use client'

import { useState, Suspense, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MoreHorizontal, Trash2, UserCog, Edit, ShieldCheck, User as UserIcon, Loader2, Contact } from 'lucide-react'
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
  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollectionRef);
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const role = searchParams.get('role')

  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (role !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Přístup odepřen',
        description: 'Pro přístup do správy týmu musíte být administrátor.',
      })
      router.replace(`/dashboard?${params.toString()}`)
    }
  }, [role, router, searchParams, toast])

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedUser || !firestore) return;
    
    setIsSaving(true);
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    try {
      await deleteDoc(userDocRef);
      toast({
        title: 'Uživatel smazán',
        description: `Záznam uživatele ${selectedUser.name} byl úspěšně smazán.`,
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: `Nepodařilo se smazat uživatele: ${error.message}`,
      })
    } finally {
      setIsSaving(false);
      setIsDeleteDialogOpen(false)
      setSelectedUser(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'classic') => {
    if (!firestore || !users) return;
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const userDocRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userDocRef, { role: newRole });
      toast({
        title: 'Role změněna',
        description: `Role uživatele ${user.name} byla změněna na ${newRole === 'admin' ? 'Admin' : 'Hráč'}.`,
      })
    } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Chyba',
          description: `Nepodařilo se změnit roli: ${error.message}`,
        })
    }
  }
  
  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser || !firestore) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updatedData: Partial<UserProfile> = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phoneNumber: formData.get('phoneNumber') as string,
        jerseyNumber: Number(formData.get('jerseyNumber') as string) || undefined,
        dob: formData.get('dob') as string || undefined,
        playerType: formData.get('playerType') as UserProfile['playerType']
    };
    
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    try {
      await updateDoc(userDocRef, updatedData);
      toast({
        title: 'Profil aktualizován',
        description: `Profil uživatele ${updatedData.name} byl úspěšně aktualizován.`,
      });
    } catch (error: any) {
      toast({
          variant: 'destructive',
          title: 'Chyba',
          description: `Nepodařilo se aktualizovat profil: ${error.message}`,
      });
    } finally {
        setIsSaving(false);
        setIsEditDialogOpen(false);
        setSelectedUser(null);
    }
  }
  
  if (usersLoading) {
    return (
      <div className="px-4 sm:px-6 py-8 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (role !== 'admin') {
    return <div className="px-4 sm:px-6 py-8">Ověřování oprávnění...</div>;
  }

  return (
    <div className="px-4 sm:px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Správa týmu</CardTitle>
          <CardDescription>
            Zde můžete spravovat uživatelské účty, měnit role a upravovat profily.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hráč</TableHead>
                <TableHead className="hidden md:table-cell">Kontakt</TableHead>
                <TableHead className="hidden sm:table-cell">Pozice</TableHead>
                <TableHead className="text-center">Role</TableHead>
                <TableHead><span className="sr-only">Akce</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                         <AvatarImage src={`https://picsum.photos/seed/${user.email}/100/100`} data-ai-hint="player portrait" alt={user.name} />
                         <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.jerseyNumber ? `#${user.jerseyNumber}` : ''}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                     <div>{user.email}</div>
                     <div className="text-sm text-muted-foreground">{user.phoneNumber}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                     {user.playerType && <Badge variant="outline">{playerTypeLabels[user.playerType]}</Badge>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Uživatel'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Akce</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Upravit</span>
                            </DropdownMenuItem>
                             <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    <span>Změnit admin roli</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuRadioGroup value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole as 'admin' | 'classic')}>
                                        <DropdownMenuRadioItem value="admin">
                                            <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Admin
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="classic">
                                            <UserIcon className="mr-2 h-4 w-4" /> Uživatel
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Smazat</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !isSaving && setIsEditDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit uživatele</DialogTitle>
            <DialogDescription>
              Změňte podrobnosti o uživateli {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name-edit" className="text-right">Jméno</Label>
                    <Input id="name-edit" name="name" defaultValue={selectedUser.name} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email-edit" className="text-right">Email</Label>
                    <Input id="email-edit" name="email" defaultValue={selectedUser.email} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone-edit" className="text-right">Telefon</Label>
                    <Input id="phone-edit" name="phoneNumber" defaultValue={selectedUser.phoneNumber ?? ''} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jersey-edit" className="text-right">Číslo dresu</Label>
                    <Input id="jersey-edit" name="jerseyNumber" type="number" defaultValue={selectedUser.jerseyNumber ?? ''} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dob-edit" className="text-right">Datum nar.</Label>
                    <Input id="dob-edit" name="dob" type="date" defaultValue={selectedUser.dob ?? ''} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="playerType-edit" className="text-right">Pozice</Label>
                    <Select name="playerType" defaultValue={selectedUser.playerType}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Vyberte pozici" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Hráč</SelectItem>
                        <SelectItem value="goalie">Brankář</SelectItem>
                        <SelectItem value="member">Člen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Zrušit</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Uložit změny
                  </Button>
                </DialogFooter>
              </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !isSaving && setIsDeleteDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tohoto uživatele?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Záznam o uživateli {selectedUser?.name} bude trvale odstraněn z databáze týmu. Jeho přihlašovací účet zůstane aktivní.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
               {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function TeamManagementPage() {
    return (
        <Suspense fallback={<div className="px-4 sm:px-6 py-8">Načítání...</div>}>
            <TeamManagementContent />
        </Suspense>
    )
}
