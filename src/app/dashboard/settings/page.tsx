'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirebase, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase'
import { User, Auth, updateProfile as updateAuthProfile } from 'firebase/auth'
import { Firestore, doc, updateDoc, writeBatch, collectionGroup } from 'firebase/firestore'
import { FirebaseStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface UserProfile {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    jerseyNumber?: number;
    role?: 'admin' | 'classic';
    playerType: 'player' | 'goalie' | 'member';
    dob?: string;
    photoURL?: string | null;
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
  seasonSO: number;
  playoffGamesPlayed: number;
  playoffWins: number;
  playoffShotsAgainst: number;
  playoffSaves: number;
  playoffSO: number;
  historicalGamesPlayed: number;
  historicalWins: number;
  historicalShotsAgainst: number;
  historicalSaves: number;
  historicalSO: number;
}

interface AppSettings {
  isPlayoffEnabled: boolean;
  isScoringInPlayoffMode: boolean;
  playoffSeries: any[]; 
}

interface SettingsFormProps {
    user: User | null;
    auth: Auth;
    firestore: Firestore;
    storage: FirebaseStorage;
    userProfile: UserProfile | null;
}

function SettingsForm({ user, auth, firestore, storage, userProfile }: SettingsFormProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fallback = userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || ''

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Chyba', description: 'Prosím, vyberte platný obrázek.' });
        return;
    }

    if (file.size > 2 * 1024 * 1024) { 
        toast({ variant: 'destructive', title: 'Chyba', description: 'Obrázek je příliš velký (maximálně 2MB).' });
        return;
    }

    setIsUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const path = `avatars/${user.uid}/profile_${Date.now()}.${fileExt}`;
        const avatarRef = storageRef(storage, path);
        
        const uploadResult = await uploadBytes(avatarRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, { photoURL: downloadURL });
        
        // Sync with Firebase Auth profile
        await updateAuthProfile(user, { photoURL: downloadURL });

        toast({
            title: "Profilový obrázek aktualizován",
            description: "Vaše nová fotka byla úspěšně nahrána.",
        });
        
    } catch (error: any) {
        console.error("Storage error:", error);
        
        if (error.code === 'storage/unauthorized') {
            toast({
                variant: 'destructive',
                title: 'Chyba oprávnění',
                description: 'Firebase Storage zamítl přístup. Prosím, nastavte správně Security Rules v konzoli Firebase podle návodu.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Chyba nahrávání',
                description: 'Nepodařilo se nahrát obrázek. Zkontrolujte připojení nebo nastavení úložiště.',
            });
        }
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !firestore || !auth?.currentUser) {
      toast({ variant: 'destructive', title: "Chyba", description: "Musíte být přihlášen." });
      return;
    }
    
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const jerseyNumber = formData.get('jerseyNumber') as string
    const dob = formData.get('dob') as string

    try {
      const userDocRef = doc(firestore, 'users', user.uid)
      await updateDoc(userDocRef, {
        name,
        phoneNumber: phoneNumber || null,
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
        dob: dob || null,
      })
      
      // Update Auth profile name too
      await updateAuthProfile(auth.currentUser, { displayName: name });

      toast({
        title: "Profil aktualizován",
        description: "Vaše údaje byly úspěšně uloženy.",
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba aktualizace',
        description: error.message,
      })
    } finally {
        setIsSaving(false);
    }
  }
  
  return (
    <form onSubmit={handleUpdate}>
      <CardContent className="grid gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary shadow-xl">
                <AvatarImage src={userProfile?.photoURL ?? `https://picsum.photos/seed/${userProfile?.email}/400/400`} alt={userProfile?.name || ''} data-ai-hint="player portrait" />
                <AvatarFallback className="text-4xl font-bold">{fallback}</AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-full backdrop-blur-sm">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}
          </div>
          <div className="space-y-3 text-center sm:text-left">
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Camera className="mr-2 h-4 w-4" />
                {isUploading ? 'Nahrávání...' : 'Změnit fotku'}
              </Button>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                  Doporučujeme čtvercový formát, maximálně 2MB.
              </p>
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Jméno a příjmení</Label>
              <Input id="name" name="name" defaultValue={userProfile?.name} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={userProfile?.email} disabled className="bg-muted/50" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Telefonní číslo</Label>
              <Input id="phoneNumber" name="phoneNumber" type="tel" defaultValue={userProfile?.phoneNumber || ''} placeholder="+420..." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="jerseyNumber">Číslo dresu</Label>
              <Input id="jerseyNumber" name="jerseyNumber" type="number" defaultValue={userProfile?.jerseyNumber || ''} />
            </div>
            
            <div className="grid gap-2">
                <Label htmlFor="dob">Datum narození</Label>
                <Input id="dob" name="dob" type="date" defaultValue={userProfile?.dob || ''} />
            </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button type="submit" disabled={isUploading || isSaving} className="w-full sm:w-auto">
          {(isUploading || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Uložit změny
        </Button>
      </CardFooter>
    </form>
  )
}

function AdminSettings() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const leagueSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'league') : null, [firestore]);
    const { data: leagueSettings, isLoading: leagueSettingsLoading } = useDoc<AppSettings>(leagueSettingsRef);

    const allSkaterStatsRef = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'skaterStats'): null, [firestore]);
    const { data: allSkaterStats, isLoading: allSkaterStatsLoading } = useCollection<SkaterStats>(allSkaterStatsRef);

    const allGoalieStatsRef = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'goalieStats'): null, [firestore]);
    const { data: allGoalieStats, isLoading: allGoalieStatsLoading } = useCollection<GoalieStats>(allGoalieStatsRef);

    const handleTogglePlayoffScoringMode = async (checked: boolean) => {
        if (!firestore) return;
        setIsSaving(true);
        const settingsRef = doc(firestore, 'settings', 'league');
        try {
            await updateDoc(settingsRef, { isScoringInPlayoffMode: checked });
            toast({ title: `Režim statistik play-off ${checked ? 'zapnut' : 'vypnut'}.` });

            if (!checked) {
                const batch = writeBatch(firestore);
                 if (allSkaterStats) {
                    allSkaterStats.forEach(stat => {
                        const statRef = doc(firestore, 'users', stat.userProfileId, 'skaterStats', stat.id);
                        batch.update(statRef, {
                            playoffGoals: 0,
                            playoffAssists: 0,
                            playoffGamesPlayed: 0,
                        });
                    });
                }
                if (allGoalieStats) {
                    allGoalieStats.forEach(stat => {
                        const statRef = doc(firestore, 'users', stat.userProfileId, 'goalieStats', stat.id);
                        batch.update(statRef, {
                            playoffGamesPlayed: 0,
                            playoffWins: 0,
                            playoffSaves: 0,
                            playoffShotsAgainst: 0,
                            playoffSO: 0,
                        });
                    });
                }
                await batch.commit();
                toast({ description: "Statistiky play-off byly vynulovány." });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Chyba', description: `Nepodařilo se změnit režim: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchiveSeason = async () => {
        if (!firestore || !allSkaterStats || !allGoalieStats) {
            toast({ variant: 'destructive', title: 'Chyba', description: 'Data statistik nejsou načtena.' });
            return;
        }
        
        setIsSaving(true);
        const batch = writeBatch(firestore);

        allSkaterStats.forEach(stat => {
            const statRef = doc(firestore, 'users', stat.userProfileId, 'skaterStats', stat.id);
            batch.update(statRef, {
                historicalGoals: (stat.historicalGoals || 0) + (stat.seasonGoals || 0) + (stat.playoffGoals || 0),
                historicalAssists: (stat.historicalAssists || 0) + (stat.seasonAssists || 0) + (stat.playoffAssists || 0),
                historicalGamesPlayed: (stat.historicalGamesPlayed || 0) + (stat.seasonGamesPlayed || 0) + (stat.playoffGamesPlayed || 0),
                seasonGoals: 0,
                seasonAssists: 0,
                seasonGamesPlayed: 0,
                playoffGoals: 0,
                playoffAssists: 0,
                playoffGamesPlayed: 0,
            });
        });

        allGoalieStats.forEach(stat => {
            const statRef = doc(firestore, 'users', stat.userProfileId, 'goalieStats', stat.id);
            batch.update(statRef, {
                historicalGamesPlayed: (stat.historicalGamesPlayed || 0) + (stat.seasonGamesPlayed || 0) + (stat.playoffGamesPlayed || 0),
                historicalWins: (stat.historicalWins || 0) + (stat.seasonWins || 0) + (stat.playoffWins || 0),
                historicalSaves: (stat.historicalSaves || 0) + (stat.seasonSaves || 0) + (stat.playoffSaves || 0),
                historicalShotsAgainst: (stat.historicalShotsAgainst || 0) + (stat.seasonShotsAgainst || 0) + (stat.playoffShotsAgainst || 0),
                historicalSO: (stat.historicalSO || 0) + (stat.seasonSO || 0) + (stat.playoffSO || 0),
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
            });
        });


        const settingsRef = doc(firestore, 'settings', 'league');
        batch.set(settingsRef, { 
            isScoringInPlayoffMode: false,
            isPlayoffEnabled: false,
            playoffSeries: [],
        }, { merge: true });

        try {
            await batch.commit();
            toast({ title: 'Sezóna archivována!', description: 'Nová sezóna může začít.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Chyba archivace', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (leagueSettingsLoading || allSkaterStatsLoading || allGoalieStatsLoading) {
        return <div className="p-6"><Loader2 className="animate-spin" /> Načítání administrace...</div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Správa Statistik</CardTitle>
                <CardDescription>
                    Spravujte režim statistik a archivujte sezóny.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="playoff-scoring-mode" className="text-base">Režim statistik Play-off</Label>
                        <p className="text-sm text-muted-foreground">
                            Přepne sčítání statistik do odděleného režimu pro play-off.
                        </p>
                    </div>
                    <Switch
                        id="playoff-scoring-mode"
                        checked={leagueSettings?.isScoringInPlayoffMode ?? false}
                        onCheckedChange={handleTogglePlayoffScoringMode}
                        disabled={isSaving}
                    />
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex-col items-start gap-4">
                <div>
                    <h4 className="font-medium">Archivovat sezónu</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                        Sečte statistiky sezóny a play-off do celkové historie a vynuluje aktuální sezónu i play-off.
                        Tuto akci nelze vrátit zpět.
                    </p>
                </div>
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isSaving}>
                         {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Archivovat a začít novou sezónu
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Opravdu chcete archivovat sezónu?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Statistiky aktuální sezóny a play-off budou přičteny k historickým statistikám a poté vynulovány. Tato operace je nevratná.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchiveSeason} className="bg-destructive hover:bg-destructive/90">Ano, archivovat</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}

function SettingsPageContent() {
    const { user, auth, firestore, storage } = useFirebase()
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

    if (isLoading || !auth || !firestore || !storage) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
    }

  return (
    <div className="py-8 space-y-8">
       <Card>
        <CardHeader>
          <CardTitle>Nastavení profilu</CardTitle>
          <CardDescription>
            Zde můžete upravit své osobní údaje a profilovou fotku.
          </CardDescription>
        </CardHeader>
        <SettingsForm 
            user={user}
            auth={auth}
            firestore={firestore}
            storage={storage}
            userProfile={userProfile}
        />
      </Card>

      {userProfile?.role === 'admin' && <AdminSettings />}
    </div>
  );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="container py-8">Načítání...</div>}>
            <SettingsPageContent />
        </Suspense>
    )
}
