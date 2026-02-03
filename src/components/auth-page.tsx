
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, register } from '@/lib/actions'
import { registerSchema } from '@/lib/schemas'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/icons/logo'
import { Loader2 } from 'lucide-react'
import { useAuth, useFirestore, useUser } from '@/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const initialLoginState = { errors: {}, message: null }

function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
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
       toast({ variant: 'destructive', title: "Chyba", description: "Nesprávné údaje." })
    }
  }
  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label htmlFor="password">Heslo</Label><Button variant="link" className="px-0 font-normal text-xs h-auto" type="button" onClick={onForgotPassword}>Zapomněli jste?</Button></div>
        <Input id="password" name="password" type="password" required />
      </div>
      <SubmitButton text="Přihlásit se" pendingText="Přihlašování..." />
    </form>
  )
}

function RegisterForm() {
  const [state, dispatch] = useActionState(register, { errors: {}, message: null })
  const auth = useAuth()
  const firestore = useFirestore()
  const { toast } = useToast()
  const router = useRouter()
  const handleSubmit = async (formData: FormData) => {
     if (!auth || !firestore) return;
    const validated = registerSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validated.success) { dispatch(formData); return; }
    const { name, email, password, phoneNumber, jerseyNumber, playerType } = validated.data;
    try {
      const uc = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(uc.user, { displayName: name });
      await setDoc(doc(firestore, 'users', uc.user.uid), { id: uc.user.uid, name, email, phoneNumber, jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null, role: email === 'janmlcak6@gmail.com' ? 'admin' : 'classic', playerType, photoURL: null });
      if (playerType === 'player') {
        await setDoc(doc(firestore, `users/${uc.user.uid}/skaterStats`, 'stats'), { userProfileId: uc.user.uid, seasonGoals: 0, seasonAssists: 0, seasonGamesPlayed: 0, playoffGoals: 0, playoffAssists: 0, playoffGamesPlayed: 0, historicalGoals: 0, historicalAssists: 0, historicalGamesPlayed: 0 });
      } else if (playerType === 'goalie') {
         await setDoc(doc(firestore, `users/${uc.user.uid}/goalieStats`, 'stats'), { userProfileId: uc.user.uid, seasonGamesPlayed: 0, seasonWins: 0, seasonSaves: 0, seasonShotsAgainst: 0, playoffGamesPlayed: 0, playoffWins: 0, playoffSaves: 0, playoffShotsAgainst: 0, historicalGamesPlayed: 0, historicalWins: 0, historicalSaves: 0, historicalShotsAgainst: 0 });
      }
      router.push('/welcome');
    } catch (error: any) { toast({ variant: 'destructive', title: "Chyba", description: error.message }); }
  }
  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2"><Label>Jméno a příjmení</Label><Input name="name" required /></div>
      <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required /></div>
       <div className="space-y-2"><Label>Pozice</Label><Select name="playerType" required><SelectTrigger><SelectValue placeholder="Vyberte pozici" /></SelectTrigger><SelectContent><SelectItem value="player">Hráč</SelectItem><SelectItem value="goalie">Brankář</SelectItem><SelectItem value="member">Člen</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Telefon</Label><Input name="phoneNumber" required /></div>
      <div className="space-y-2"><Label>Číslo dresu</Label><Input name="jerseyNumber" type="number" /></div>
      <div className="space-y-2"><Label>Heslo</Label><Input name="password" type="password" required /></div>
      <SubmitButton text="Vytvořit účet" pendingText="Vytváření..." />
    </form>
  )
}

function SubmitButton({ text, pendingText }: { text: string; pendingText: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" className="w-full" disabled={pending}>{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{pendingText}</> : text}</Button>
}

export function AuthPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetLoading, setIsResetLoading] = useState(false)
  useEffect(() => { if (!isUserLoading && user) router.replace('/dashboard') }, [user, isUserLoading, router])
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); if (!auth || !resetEmail) return
    setIsResetLoading(true)
    try { await sendPasswordResetEmail(auth, resetEmail); toast({ title: "Email odeslán" }); setIsResetOpen(false); }
    catch (e: any) { toast({ variant: "destructive", title: "Chyba" }); }
    finally { setIsResetLoading(false) }
  }
  if (isUserLoading || user) return <div className="flex flex-col items-center justify-center p-4"><Loader2 className="animate-spin text-primary" /><p className="mt-4">Načítání...</p></div>
  return (
    <>
      <div className="flex items-center gap-4 mb-6"><Logo className="h-12 w-12 text-primary" /><h1 className="text-3xl font-bold font-headline">HC Aces</h1></div>
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="login">Přihlásit</TabsTrigger><TabsTrigger value="register">Registrovat</TabsTrigger></TabsList>
        <TabsContent value="login"><Card><CardHeader><CardTitle>Vítejte zpět</CardTitle></CardHeader><CardContent><LoginForm onForgotPassword={() => setIsResetOpen(true)} /></CardContent></Card></TabsContent>
        <TabsContent value="register"><Card><CardHeader><CardTitle>Vytvořit účet</CardTitle></CardHeader><CardContent><RegisterForm /></CardContent></Card></TabsContent>
      </Tabs>
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}><DialogContent><DialogHeader><DialogTitle>Zapomenuté heslo</DialogTitle></DialogHeader><form onSubmit={handleReset}><div className="grid gap-4 py-4"><Label>Email</Label><Input type="email" value={resetEmail} onChange={(e)=>setResetEmail(e.target.value)} required /></div><DialogFooter><Button type="submit" disabled={isResetLoading}>Poslat odkaz</Button></DialogFooter></form></DialogContent></Dialog>
    </>
  )
}
