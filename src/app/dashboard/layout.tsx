'use client'

import { Suspense, useEffect } from 'react'
import { Logo } from "@/components/icons/logo"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Power, User, Users, Loader2, LayoutDashboard, History, Calendar as CalendarIcon, Trophy } from "lucide-react"
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
    return <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
  }

  const name = user?.displayName || 'Uživatel'
  const email = user?.email || ''
  const fallback = name.split(' ').map(n => n[0]).join('').toUpperCase()
  const role = userProfile?.role || 'classic';
  const photoURL = userProfile?.photoURL ?? `https://picsum.photos/seed/${email}/100/100`;


  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage src={photoURL} data-ai-hint="player portrait" alt={name} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === 'admin' && (
            <DropdownMenuItem asChild>
                <Link href={{ pathname: '/dashboard/team-management', query: { role } }}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Správa týmu</span>
                </Link>
            </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <User className="mr-2 h-4 w-4" />
            <span>Nastavení</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
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
            <div className="flex h-screen w-full items-center justify-center bg-background" suppressHydrationWarning>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const navLinks = [
        { href: '/dashboard', label: 'Nástěnka', icon: LayoutDashboard },
        { href: '/dashboard/calendar', label: 'Kalendář', icon: CalendarIcon },
        { href: '/dashboard/history', label: 'Historie', icon: History },
        { href: '/dashboard/hall-of-fame', label: 'Síň slávy', icon: Trophy, isMilestones: true },
    ];
  
  return (
    <div className="min-h-screen flex flex-col bg-background" suppressHydrationWarning>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-foreground group">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center transition-transform group-hover:scale-105">
                  <Logo className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center">
                  <span className="font-headline font-black tracking-wider text-base sm:text-lg text-foreground">HC ACES</span>
                </div>
            </Link>
            <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
                {navLinks.map(link => (
                    <Link 
                        key={link.href}
                        href={link.href} 
                        className={cn(
                            "px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold relative",
                            pathname === link.href
                              ? "bg-primary/10 text-primary font-bold shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                        {link.isMilestones && hasNewMilestones && (
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                          </span>
                        )}
                    </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <NotificationBell />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full min-w-0 max-w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around supports-[backdrop-filter]:bg-background/85">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors relative",
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <link.icon className={cn("h-5 w-5 mb-0.5", isActive ? "text-primary" : "text-muted-foreground")} />
                {link.isMilestones && hasNewMilestones && (
                  <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                  </span>
                )}
              </div>
              <span>{link.label}</span>
            </Link>
          );
        })}
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
