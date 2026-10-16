'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

export function AuthPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <p className="mt-4 text-sm text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Logo className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold font-headline">HC Aces</h1>
      </div>

      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Přihlásit</TabsTrigger>
          <TabsTrigger value="register">Registrovat</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Vítejte zpět</CardTitle>
              <CardDescription>Přihlaste se ke svému účtu v kabině HC Aces.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm onForgotPassword={() => setIsResetOpen(true)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Vytvořit účet</CardTitle>
              <CardDescription>Registrace nového hráče, brankáře nebo člena týmu.</CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ForgotPasswordDialog isOpen={isResetOpen} onOpenChange={setIsResetOpen} />
    </>
  );
}
