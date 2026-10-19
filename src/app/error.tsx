'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Aces Hub runtime exception caught by ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md p-6 bg-card border border-border/80 rounded-2xl shadow-xl flex flex-col items-center text-center space-y-5">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
          <Logo className="h-10 w-10 text-primary" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold font-headline tracking-tight">
            Došlo k chybě při načítání
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Aplikace narazila na drobný problém při načítání dat. Většinou pomůže rychlé obnovení stránky.
          </p>
        </div>

        {error?.message && (
          <div className="w-full p-2.5 bg-muted/40 rounded-lg text-left overflow-hidden border border-border/60">
            <p className="text-[11px] font-mono text-muted-foreground truncate" title={error.message}>
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-1">
          <Button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Obnovit stránku
          </Button>

          <Button
            asChild
            variant="outline"
            className="flex-1 text-xs h-9 font-semibold"
          >
            <Link href="/dashboard">
              <Home className="mr-1.5 h-3.5 w-3.5" />
              Do kabiny
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
