'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { mockUsers, type User as UserType } from '@/lib/mock-users'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MoreHorizontal, Trash2, UserCog, Edit, ShieldCheck, User as UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function TeamManagementContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [users, setUsers] = useState<UserType[]>(mockUsers)
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user)
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = (user: UserType) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!selectedUser) return
    setUsers(users.filter(u => u.id !== selectedUser.id))
    toast({
      title: 'Uživatel smazán',
      description: `Uživatel ${selectedUser.name} byl úspěšně smazán.`,
    })
    setIsDeleteDialogOpen(false)
    setSelectedUser(null)
  }

  const handleRoleChange = (userId: string, newRole: 'admin' | 'classic') => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    const user = users.find(u => u.id === userId);
    if (user) {
        toast({
          title: 'Role změněna',
          description: `Role uživatele ${user.name} byla změněna na ${newRole}.`,
        })
    }
  }
  
  const handleUpdateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(e.currentTarget);
    const updatedUser: UserType = {
        ...selectedUser,
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        jerseyNumber: formData.get('jerseyNumber') as string || null,
        dob: formData.get('dob') as string || undefined,
    };
    
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    toast({
      title: 'Profil aktualizován',
      description: `Profil uživatele ${updatedUser.name} byl úspěšně aktualizován.`,
    });
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  }

  if (role !== 'admin') {
    return <div className="container py-8">Ověřování oprávnění...</div>;
  }

  return (
    <div className="container py-8">
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
                <TableHead className="text-center">Role</TableHead>
                <TableHead><span className="sr-only">Akce</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
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
                     <div className="text-sm text-muted-foreground">{user.phone}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Hráč'}
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
                                    <span>Změnit roli</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuRadioGroup value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole as 'admin' | 'classic')}>
                                        <DropdownMenuRadioItem value="admin">
                                            <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Admin
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="classic">
                                            <UserIcon className="mr-2 h-4 w-4" /> Hráč
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                    <Input id="phone-edit" name="phone" defaultValue={selectedUser.phone} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jersey-edit" className="text-right">Číslo dresu</Label>
                    <Input id="jersey-edit" name="jerseyNumber" defaultValue={selectedUser.jerseyNumber ?? ''} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dob-edit" className="text-right">Datum nar.</Label>
                    <Input id="dob-edit" name="dob" type="date" defaultValue={selectedUser.dob ?? ''} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Zrušit</Button>
                  <Button type="submit">Uložit změny</Button>
                </DialogFooter>
              </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tohoto uživatele?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Účet uživatele {selectedUser?.name} bude trvale odstraněn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function TeamManagementPage() {
    return (
        <Suspense fallback={<div className="container py-8">Načítání...</div>}>
            <TeamManagementContent />
        </Suspense>
    )
}
