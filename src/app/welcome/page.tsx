'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/icons/logo'

export default function WelcomePage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard')
    }, 2500)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="animate-logo-in">
        <Logo className="h-48 w-48 text-primary" />
      </div>
      <p className="mt-4 text-xl text-muted-foreground animate-pulse">Vítejte v kabině...</p>
    </div>
  )
}
