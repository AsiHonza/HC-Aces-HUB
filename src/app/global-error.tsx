'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home } from 'lucide-react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal global error caught in global-error boundary:', error);
  }, [error]);

  return (
    <html lang="cs" className="dark">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-body antialiased">
        <div className="w-full max-w-md p-6 bg-card border border-border/80 rounded-2xl shadow-xl flex flex-col items-center text-center space-y-5">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl font-black">
            ACES
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold font-headline tracking-tight">
              Aces Hub: Obnovit relaci
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Při komunikaci se serverem došlo k přerušení. Kliknutím na tlačítko níže obnovíte kabinu.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-1">
            <Button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard';
                } else {
                  reset();
                }
              }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 shadow"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Obnovit aplikaci
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
