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

  const name = searchParams.get('name') || 'Adam Hráč'
  const email = searchParams.get('email') || 'adam.hrac@email.com'
  const phone = searchParams.get('phone') || ''
  const jerseyNumber = searchParams.get('jerseyNumber') || ''
  const dob = searchParams.get('dob') || ''
  
  const fallback = name.split(' ').map(n => n[0]).join('').toUpperCase()
  
  useEffect(() => {
    if (searchParams.get('updated') === 'true') {
      toast({
        title: "Úspěch!",
        description: "Profil byl úspěšně aktualizován.",
      })
      // Remove the 'updated' param from URL without reloading
      const newParams = new URLSearchParams(Array.from(searchParams.entries()))
      newParams.delete('updated')
      router.replace(`/dashboard/settings?${newParams.toString()}`, { scroll: false })
    }
  }, [searchParams, router, toast])

  const actionWithParams = updateProfile.bind(null, Object.fromEntries(searchParams.entries()))
  const [state, dispatch] = useActionState(actionWithParams, initialFormState)

  useEffect(() => {
    if (!state.success && state.message) {
      toast({
        variant: 'destructive',
        title: "Chyba",
        description: state.message,
      })
    }
  }, [state, toast])

  return (
    <form action={dispatch}>
      <CardContent className="grid gap-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-primary shadow-lg">
            <AvatarImage src={`https://picsum.photos/seed/${email}/400/400`} data-ai-hint="player portrait" alt={name} />
            <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
          </Avatar>
          <Button type="button" variant="outline">Změnit obrázek</Button>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="name">Jméno a příjmení</Label>
          <Input id="name" name="name" defaultValue={name} />
          {state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" defaultValue={email} disabled />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Telefonní číslo</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={phone} />
           {state.errors?.phone && <p className="text-sm text-destructive">{state.errors.phone[0]}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="jerseyNumber">Číslo dresu</Label>
          <Input id="jerseyNumber" name="jerseyNumber" type="number" defaultValue={jerseyNumber} />
        </div>
        
        <div className="grid gap-2">
            <Label htmlFor="dob">Datum narození</Label>
            <Input id="dob" name="dob" type="date" defaultValue={dob} className="w-[280px]" />
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
