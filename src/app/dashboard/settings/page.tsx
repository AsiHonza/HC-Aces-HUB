'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { updateProfile as validateProfile } from '@/lib/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import { useFormStatus } from 'react-dom'
import { useToast } from "@/hooks/use-toast"
import { useFirebase, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { updateProfile as updateFirebaseProfile } from 'firebase/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Uložit změny
    </Button>
  )
}

const initialFormState = {
  errors: {},
  message: null,
  success: false,
}

function SettingsForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, auth } = useFirebase()
  const firestore = useFirestore()

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading } = useDoc(userDocRef);

  const [state, setState] = useState(initialFormState);

  const fallback = userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || ''

  useEffect(() => {
    if (searchParams.get('updated') === 'true') {
      toast({
        title: "Úspěch!",
        description: "Profil byl úspěšně aktualizován.",
      })
      const newPath = window.location.pathname
      window.history.replaceState({}, '', newPath)
    }
  }, [searchParams, toast])
  
  useEffect(() => {
    if (state.success === false && state.message) {
      toast({
        variant: 'destructive',
        title: "Chyba",
        description: state.message,
      })
    }
  }, [state, toast])

  const handleUpdate = async (formData: FormData) => {
    if (!user || !firestore || !auth?.currentUser) {
      toast({ variant: 'destructive', title: "Chyba", description: "Musíte být přihlášen." });
      return;
    }
    
    const validationResult = await validateProfile(user.uid, null, formData);
    if (validationResult && !validationResult.success) {
        setState(validationResult);
        return;
    }

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
      await updateFirebaseProfile(auth.currentUser, { displayName: name });
      
      router.push('/dashboard/settings?updated=true', { scroll: false })
      router.refresh();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba aktualizace',
        description: error.message,
      })
    }
  }
  
  if (isLoading) {
      return <div className="p-6"><Loader2 className="animate-spin" /> Načítání profilu...</div>
  }

  return (
    <form action={handleUpdate}>
      <CardContent className="grid gap-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-primary shadow-lg">
            <AvatarImage src={`https://picsum.photos/seed/${userProfile?.email}/400/400`} data-ai-hint="player portrait" alt={userProfile?.name || ''} />
            <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
          </Avatar>
          <Button type="button" variant="outline">Změnit obrázek</Button>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="name">Jméno a příjmení</Label>
          <Input id="name" name="name" defaultValue={userProfile?.name} />
          {state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" defaultValue={userProfile?.email} disabled />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phoneNumber">Telefonní číslo</Label>
          <Input id="phoneNumber" name="phoneNumber" type="tel" defaultValue={userProfile?.phoneNumber || ''} />
           {state.errors?.phoneNumber && <p className="text-sm text-destructive">{state.errors.phoneNumber[0]}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="jerseyNumber">Číslo dresu</Label>
          <Input id="jerseyNumber" name="jerseyNumber" type="number" defaultValue={userProfile?.jerseyNumber || ''} />
           {state.errors?.jerseyNumber && <p className="text-sm text-destructive">{state.errors.jerseyNumber[0]}</p>}
        </div>
        
        <div className="grid gap-2">
            <Label htmlFor="dob">Datum narození</Label>
            <Input id="dob" name="dob" type="date" defaultValue={userProfile?.dob || ''} className="w-[280px]" />
             {state.errors?.dob && <p className="text-sm text-destructive">{state.errors.dob[0]}</p>}
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <SubmitButton />
      </CardFooter>
    </form>
  )
}

function SettingsPageContent() {
  return (
    <div className="px-4 sm:px-6 py-8">
       <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Nastavení profilu</CardTitle>
          <CardDescription>
            Zde můžete upravit své osobní údaje.
          </CardDescription>
        </CardHeader>
        <SettingsForm />
      </Card>
    </div>
  );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="px-4 sm:px-6 py-8">Načítání...</div>}>
            <SettingsPageContent />
        </Suspense>
    )
}
