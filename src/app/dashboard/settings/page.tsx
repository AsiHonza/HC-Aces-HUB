'use client'

import { useActionState, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { updateProfile } from '@/lib/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import { useFormStatus } from 'react-dom'
import { useToast } from "@/hooks/use-toast"
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
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

  const actionWithParams = updateProfile.bind(null, user?.uid || '')
  const [state, dispatch] = useActionState(actionWithParams, initialFormState)
  
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
    
    // This will trigger the server action for validation
    const validationResult = await updateProfile(user.uid, null, formData);
    if (validationResult && !validationResult.success) {
        setState(validationResult);
        return;
    }

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const jerseyNumber = formData.get('jerseyNumber') as string
    const dob = formData.get('dob') as string

    try {
      const userDocRef = doc(firestore, 'users', user.uid)
      await updateDoc(userDocRef, {
        name,
        phone: phone || null,
        jerseyNumber: jerseyNumber || null,
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
          <Label htmlFor="phone">Telefonní číslo</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={userProfile?.phone || ''} />
           {state.errors?.phone && <p className="text-sm text-destructive">{state.errors.phone[0]}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="jerseyNumber">Číslo dresu</Label>
          <Input id="jerseyNumber" name="jerseyNumber" type="number" defaultValue={userProfile?.jerseyNumber || ''} />
        </div>
        
        <div className="grid gap-2">
            <Label htmlFor="dob">Datum narození</Label>
            <Input id="dob" name="dob" type="date" defaultValue={userProfile?.dob || ''} className="w-[280px]" />
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
    <div className="container py-8">
       <Card>
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
        <Suspense fallback={<div className="container py-8">Načítání...</div>}>
            <SettingsPageContent />
        </Suspense>
    )
}
