'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles, CalendarCheck, Shield, Trophy } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center p-4 gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 shadow-lg shadow-primary/10">
          <img src="/teams/aces.png" alt="HC Aces" className="h-11 w-11 object-contain" />
        </div>
        <Loader2 className="animate-spin text-primary h-6 w-6" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Načítání kabiny...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto py-8 px-2 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-10">
        {/* Left Column: Club Hero Landing Showcase */}
        <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Oficiální týmová platforma • HC Aces Rajhrad</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/25 via-primary/10 to-card border border-primary/35 shadow-xl shadow-primary/15">
              <img src="/teams/aces.png" alt="HC Aces" className="h-14 w-14 object-contain drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tight text-foreground">
                HC ACES <span className="text-primary">HUB</span>
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-muted-foreground max-w-xl">
                Digitální kabina týmu HC Aces. Docházka na zápasy, živé statistiky HobbyHokej ligy, hlasování o hvězdách utkání a klubová kronika na jednom místě.
              </p>
            </div>
          </div>

          {/* Feature Bento Pills */}
          <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md p-3.5 text-left shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Zápasy & Sestavy</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Rychlé potvrzení účasti, formace a iCal synchronizace.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md p-3.5 text-left shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/25">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Ligové centrum</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Kompletní tabulka, skauting soupeřů a vzájemná bilance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md p-3.5 text-left shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Milníky & MVP</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Kariérní karty hráčů, jubilea a Síň slávy HC Aces.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Glassmorphic Auth Card */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-2xl bg-muted/80 p-1">
              <TabsTrigger value="login" className="rounded-xl text-xs sm:text-sm font-bold">
                Přihlásit
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl text-xs sm:text-sm font-bold">
                Registrovat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-3">
              <Card className="border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-black">Vítejte zpět</CardTitle>
                  <CardDescription>Přihlaste se ke svému účtu v kabině HC Aces.</CardDescription>
                </CardHeader>
                <CardContent>
                  <LoginForm onForgotPassword={() => setIsResetOpen(true)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register" className="mt-3">
              <Card className="border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-black">Vytvořit účet</CardTitle>
                  <CardDescription>Registrace nového hráče, brankáře nebo člena týmu.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RegisterForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ForgotPasswordDialog isOpen={isResetOpen} onOpenChange={setIsResetOpen} />
    </div>
  );
}
