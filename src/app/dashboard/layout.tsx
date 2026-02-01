'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Logo } from "@/components/icons/logo"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Power, User, Users } from "lucide-react"

function UserNav() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'Adam Hráč'
  const email = searchParams.get('email') || 'adam.hrac@email.com'
  const fallback = name.split(' ').map(n => n[0]).join('').toUpperCase()
  const params = new URLSearchParams(Array.from(searchParams.entries()))
  const role = searchParams.get('role')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage src={`https://picsum.photos/seed/${email}/100/100`} data-ai-hint="player portrait" alt={name} />
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
                <Link href={`/dashboard/team-management?${params.toString()}`}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Správa týmu</span>
                </Link>
            </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/settings?${params.toString()}`}>
            <User className="mr-2 h-4 w-4" />
            <span>Nastavení</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <Power className="mr-2 h-4 w-4" />
            <span>Odhlásit se</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-headline">Aces Hockey Hub</span>
          </Link>
          <UserNav />
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-10 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-foreground">
              <Logo className="h-8 w-8 text-primary" />
              <span className="font-headline">Aces Hockey Hub</span>
            </Link>
          </div>
        </header>
        <main className="flex-1">
        </main>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}
