'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/icons/logo'

function WelcomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Create a new URLSearchParams object from the existing one to pass to the next page
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    
    const timer = setTimeout(() => {
      router.replace(`/dashboard?${params.toString()}`)
    }, 2500)

    return () => clearTimeout(timer)
  }, [router, searchParams])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="animate-logo-in">
        <Logo className="h-48 w-48 text-primary" />
      </div>
      <p className="mt-4 text-xl text-muted-foreground animate-pulse">Vítejte v kabině...</p>
    </div>
  )
}

export default function WelcomePage() {
  // Wrap the component that uses useSearchParams in Suspense
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Načítání...</div>}>
      <WelcomeContent />
    </Suspense>
  )
}
