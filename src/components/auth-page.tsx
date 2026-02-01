'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { login, register } from '@/lib/actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/icons/logo'
import { Loader2 } from 'lucide-react'
import { useAuth, useFirestore, useUser } from '@/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

const initialLoginState = {
  errors: {},
  message: null,
}

function LoginForm() {
  const [state, dispatch] = useActionState(login, initialLoginState)
  const auth = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    if (!auth) return;
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/welcome')
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: "Chyba přihlášení",
        description: "Nesprávný e-mail nebo heslo.",
      })
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="hrac@email.com" required />
        {state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Heslo</Label>
        <Input id="password" name="password" type="password" required />
        {state.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
      </div>
       {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <SubmitButton text="Přihlásit se" pendingText="Přihlašování..." />
    </form>
  )
}

const initialRegisterState = {
  errors: {},
  message: null,
}

function RegisterForm() {
  const [state, dispatch] = useActionState(register, initialRegisterState)
  const auth = useAuth()
  const firestore = useFirestore()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
     if (!auth || !firestore) return;
    
    const validatedFields = register.schema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
      // This is a client-side validation, should match server's
      // The server action will handle the final validation
      dispatch(formData);
      return;
    }
    
    const { name, email, password, phone, jerseyNumber } = validatedFields.data;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const role = email === 'janmlcak6@gmail.com' ? 'admin' : 'classic';

      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        name,
        email,
        phone,
        jerseyNumber: jerseyNumber || null,
        role: role,
        dob: null,
      });

      // Also create initial player stats
      await setDoc(doc(firestore, `users/${user.uid}/playerStats`, 'stats'), {
        goals: 0,
        assists: 0,
        gamesPlayed: 0,
        userProfileId: user.uid,
      });


      router.push('/welcome');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Chyba registrace",
        description: error.message,
      });
    }
  }


  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Jméno a příjmení</Label>
        <Input id="name" name="name" placeholder="Adam Hráč" required />
        {state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-register">Email</Label>
        <Input id="email-register" name="email" type="email" placeholder="hrac@email.com" required />
        {state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefonní číslo</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+420 123 456 789" required />
        {state.errors?.phone && <p className="text-sm text-destructive">{state.errors.phone[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="jerseyNumber">Číslo dresu (nepovinné)</Label>
        <Input id="jerseyNumber" name="jerseyNumber" type="number" placeholder="88" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password-register">Heslo</Label>
        <Input id="password-register" name="password" type="password" required />
        {state.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
      </div>
      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <SubmitButton text="Vytvořit účet" pendingText="Vytváření..." />
    </form>
  )
}

function SubmitButton({ text, pendingText }: { text: string; pendingText: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" aria-disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingText}
        </>
      ) : (
        text
      )}
    </Button>
  )
}


export function AuthPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard')
    }
  }, [user, isUserLoading, router])


  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4">Načítání...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Logo className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold font-headline text-foreground">
          Aces Hockey Hub
        </h1>
      </div>
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Přihlásit se</TabsTrigger>
          <TabsTrigger value="register">Registrovat se</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Vítejte zpět</CardTitle>
              <CardDescription>
                Přihlaste se ke svému účtu pro přístup do kabiny.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Vytvořit účet</CardTitle>
              <CardDescription>
                Přidejte se k týmu a sledujte své statistiky a pokrok.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
