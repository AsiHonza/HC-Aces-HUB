'use client'

import { Suspense, useEffect } from 'react'
import { Logo } from "@/components/icons/logo"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Power, User, Users, Loader2, LayoutDashboard, History, Calendar as CalendarIcon } from "lucide-react"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { signOut } from 'firebase/auth'
import { useRouter, usePathname } from 'next/navigation'
import { doc } from 'firebase/firestore'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/features/notifications'
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

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/');
        }
    }, [isUserLoading, user, router]);

    if (isUserLoading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const navLinks = [
        { href: '/dashboard', label: 'Nástěnka', icon: LayoutDashboard },
        { href: '/dashboard/calendar', label: 'Kalendář', icon: CalendarIcon },
        { href: '/dashboard/history', label: 'Historie', icon: History },
    ];
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-foreground">
                <Logo className="h-8 w-8 text-primary" />
                <span className="font-headline hidden sm:inline-block">HC Aces</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                {navLinks.map(link => (
                    <Link 
                        key={link.href}
                        href={link.href} 
                        className={cn(
                            "transition-colors hover:text-primary flex items-center gap-1.5",
                            pathname === link.href ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                    </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex md:hidden items-center space-x-1 text-sm font-medium">
                 {navLinks.map(link => (
                    <Link 
                        key={link.href}
                        href={link.href} 
                        className={cn(
                            "p-2 transition-colors hover:text-primary",
                            pathname === link.href ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <link.icon className="h-5 w-5" />
                        <span className="sr-only">{link.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="flex items-center gap-1 sm:gap-2">
                <NotificationBell />
                <UserNav />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
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
