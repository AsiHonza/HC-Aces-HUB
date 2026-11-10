'use client'

import { Suspense, useEffect } from 'react'
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Power, User, Users, Loader2, LayoutDashboard, History, Calendar as CalendarIcon, Trophy, Shield } from "lucide-react"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { signOut } from 'firebase/auth'
import { useRouter, usePathname } from 'next/navigation'
import { doc } from 'firebase/firestore'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/features/notifications'
import { useTeamMilestonesData } from '@/features/stats'
import type { UserProfile } from '@/types'

function UserNav() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userDocRef);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push('/');
  };

  if (isUserLoading || (user && isUserProfileLoading)) {
    return <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
  }

  const name = user?.displayName || 'Uživatel'
  const email = user?.email || ''
  const fallback = name.split(' ').map(n => n[0]).join('').toUpperCase()
  const role = userProfile?.role || 'classic';
  const photoURL = userProfile?.photoURL ?? `https://picsum.photos/seed/${email}/100/100`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 ring-2 ring-primary/35 hover:ring-primary transition-all">
          <Avatar className="h-8 w-8">
            <AvatarImage src={photoURL} data-ai-hint="player portrait" alt={name} className="object-cover" />
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 rounded-2xl border-border/80 bg-popover/95 backdrop-blur-xl p-1.5 shadow-xl" align="end" forceMount>
        <DropdownMenuLabel className="font-normal px-2.5 py-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none truncate">{name}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        {role === 'admin' && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2 text-xs font-semibold">
            <Link href="/dashboard/team-management">
              <Users className="mr-2 h-4 w-4 text-primary" />
              <span>Správa týmu</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2 text-xs font-semibold">
          <Link href="/dashboard/settings">
            <User className="mr-2 h-4 w-4 text-primary" />
            <span>Nastavení</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-xl py-2 text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10">
          <Power className="mr-2 h-4 w-4" />
          <span>Odhlásit se</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { ThemeToggle } from '@/components/theme-provider';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { hasNewMilestones, markMilestonesAsSeen } = useTeamMilestonesData(user?.uid);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (pathname === '/dashboard/hall-of-fame') {
      markMilestonesAsSeen();
    }
  }, [pathname, markMilestonesAsSeen]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background" suppressHydrationWarning>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 shadow-lg shadow-primary/10">
          <img src="/teams/aces.png" alt="HC Aces" className="h-10 w-10 object-contain" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const navLinks = [
    { href: '/dashboard', label: 'Nástěnka', icon: LayoutDashboard },
    { href: '/dashboard/league', label: 'Liga', icon: Shield },
    { href: '/dashboard/calendar', label: 'Kalendář', icon: CalendarIcon },
    { href: '/dashboard/history', label: 'Historie', icon: History },
    { href: '/dashboard/hall-of-fame', label: 'Síň slávy', icon: Trophy, isMilestones: true },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background" suppressHydrationWarning>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          <Link href="/dashboard" className="flex items-center gap-3 font-bold text-lg text-foreground group shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
              <img src="/teams/aces.png" alt="HC Aces" className="h-7 w-7 object-contain drop-shadow-sm" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-black tracking-tight text-base sm:text-lg text-foreground leading-none">
                HC ACES
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/90 mt-0.5">
                Hockey Hub • Rajhrad
              </span>
            </div>
          </Link>

          {/* Desktop Center Segmented Pill Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-muted/60 p-1 border border-border/60 shadow-inner">
            {navLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-2 text-xs font-bold relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <link.icon className={cn("h-3.5 w-3.5", isActive ? "scale-105" : "opacity-80")} />
                  <span>{link.label}</span>
                  {link.isMilestones && hasNewMilestones && (
                    <span className="relative flex h-2 w-2 ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <NotificationBell />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full min-w-0 overflow-x-hidden pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full min-w-0">
          {children}
        </div>
      </main>

      {/* Material 3 Expressive Mobile Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-2xl px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.35)]">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25"
                      : "group-hover:bg-muted/60"
                  )}
                >
                  <link.icon className={cn("h-4 w-4 transition-transform", isActive && "scale-110 stroke-[2.4]")} />
                  {link.isMilestones && hasNewMilestones && (
                    <span className="absolute -top-0.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] tracking-tight leading-none truncate max-w-full px-0.5",
                    isActive ? "font-extrabold text-foreground" : "font-medium"
                  )}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}
