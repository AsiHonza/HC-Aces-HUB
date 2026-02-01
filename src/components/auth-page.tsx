'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, register } from '@/lib/actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/icons/logo'
import { Loader2 } from 'lucide-react'

const initialLoginState = {
  errors: {},
  message: null,
}

function LoginForm() {
  const [state, dispatch] = useActionState(login, initialLoginState)

  return (
    <form action={dispatch} className="space-y-4">
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

  return (
    <form action={dispatch} className="space-y-4">
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
