'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useAuth, useUser, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LeagueSyncCard } from '@/features/stats';
import {
  TeamMembersTable,
  EditPlayerDialog,
  AddPlayerDialog,
  DeletePlayerDialog,
  AccountDiagnosticsCard,
  rosterService,
  type UpdateUserData,
  type CreateUserData,
} from '@/features/roster';
import type { UserProfile, Match } from '@/types';

function TeamManagementContent() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const currentUserRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(currentUserRef);

  const usersCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const matchesCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'matches') : null),
    [firestore]
  );
  const { data: allMatches } = useCollection<Match>(matchesCollectionRef);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [hasStartedProfileLoad, setHasStartedProfileLoad] = useState(false);

  useEffect(() => {
    if (isProfileLoading) {
      setHasStartedProfileLoad(true);
    }
  }, [isProfileLoading]);

  const isAdmin = currentUserProfile?.role === 'admin';
  const isAuthChecking = isUserLoading || isProfileLoading || !currentUserProfile;

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace('/dashboard');
      return;
    }

    if (currentUserProfile) {
      if (currentUserProfile.role !== 'admin') {
        toast({
          variant: 'destructive',
          title: 'Přístup odepřen',
          description: 'Sekce Správa týmu je přístupná výhradně administrátorům týmu.',
        });
        router.replace('/dashboard');
      }
    } else if (hasStartedProfileLoad && !isProfileLoading) {
      toast({
        variant: 'destructive',
        title: 'Přístup odepřen',
        description: 'Uživatelský profil nebyl nalezen.',
      });
      router.replace('/dashboard');
    }
  }, [isUserLoading, user, currentUserProfile, hasStartedProfileLoad, isProfileLoading, router, toast]);

  const handleResetPassword = async (email: string) => {
    if (!auth) return;
    try {
      await rosterService.resetPassword(auth, email);
      toast({
        title: 'Resetovací e-mail odeslán',
        description: `Odkaz pro změnu hesla byl zaslán na adresu ${email}.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chyba', description: error.message });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser || !firestore) return;
    setIsSaving(true);
    try {
      await rosterService.deleteUser(firestore, selectedUser.id);
      toast({
        title: 'Profil smazán z Firestore',
        description: 'Nyní můžete v případě potřeby uživatele smazat i v Firebase Console -> Authentication.',
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chyba mazání', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurgeByEmail = async (email: string) => {
    if (!firestore || !email) return;
    setIsPurging(true);
    try {
      const count = await rosterService.purgeByEmail(firestore, email);
      toast({
        title: count > 0 ? 'Data vyčištěna' : 'Záznamy nenalezeny',
        description:
          count > 0
            ? `Smazáno ${count} záznamů z databáze Firestore. V případě potřeby odstraňte účet i v konzoli Authentication.`
            : 'V databázi Firestore nebyl pro tento e-mail nalezen žádný profil.',
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chyba čištění', description: error.message });
    } finally {
      setIsPurging(false);
    }
  };

  const handleUpdateUser = async (data: UpdateUserData) => {
    if (!selectedUser || !firestore) return;
    setIsSaving(true);
    try {
      await rosterService.updateProfile(firestore, selectedUser.id, data);
      toast({ title: 'Profil hráče byl úspěšně aktualizován' });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chyba', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (data: CreateUserData) => {
    if (!auth || !firestore) return;
    setIsSaving(true);
    try {
      const { email } = await rosterService.createPlayerAccount(auth, firestore, data);
      toast({
        title: 'Účet hráče byl vytvořen',
        description: `Hráč ${data.name} byl zaregistrován s e-mailem ${email}.`,
      });
      setIsAddDialogOpen(false);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: 'destructive',
          title: 'E-mail je již používán',
          description:
            'Tento e-mail už má v systému vytvořený účet. Pokud nevidíte profil hráče výše, je nutné účet nejprve smazat ve Firebase Console.',
        });
      } else {
        toast({ variant: 'destructive', title: 'Chyba vytvoření účtu', description: error.message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthChecking || !isAdmin || usersLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
        <p className="text-xs text-muted-foreground font-medium">Ověřuji oprávnění správce...</p>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <LeagueSyncCard />

      <TeamMembersTable
        users={users || []}
        allMatches={allMatches || []}
        onEditUser={(u) => {
          setSelectedUser(u);
          setIsEditDialogOpen(true);
        }}
        onResetPassword={handleResetPassword}
        onDeleteUser={(u) => {
          setSelectedUser(u);
          setIsDeleteDialogOpen(true);
        }}
        onAddUser={() => setIsAddDialogOpen(true)}
      />

      <AccountDiagnosticsCard onPurgeByEmail={handlePurgeByEmail} isPurging={isPurging} />

      <EditPlayerDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        onSave={handleUpdateUser}
        isSaving={isSaving}
      />

      <AddPlayerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleCreateUser}
        isSaving={isSaving}
      />

      <DeletePlayerDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
        onConfirm={handleConfirmDelete}
        isSaving={isSaving}
      />
    </div>
  );
}

export default function TeamManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-primary h-12 w-12" />
        </div>
      }
    >
      <TeamManagementContent />
    </Suspense>
  );
}
