'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, Flame, Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeSettingsCard() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm card-hover-effect">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Vzhled a motiv aplikace</CardTitle>
        </div>
        <CardDescription>
          Zvolte si barevný styl prostředí podle svých preferencí. K dispozici je původní klubový motiv, moderní noční grafit i čistý světlý režim.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* 1. PŮVODNÍ HC ACES (Klubový tmavý) */}
          <button
            type="button"
            onClick={() => setTheme('aces')}
            className={cn(
              'group relative flex flex-col items-start justify-between gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer select-none',
              theme === 'aces'
                ? 'border-primary bg-primary/10 shadow-md shadow-primary/15 ring-1 ring-primary/40'
                : 'border-border/60 hover:border-amber-500/40 hover:bg-muted/40'
            )}
          >
            <div className="flex items-start justify-between w-full gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-amber-950/40 border border-amber-600/40 flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                  <Flame className="h-4.5 w-4.5 fill-amber-500/20" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                    <span>Původní HC Aces</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Originál
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    Teplá klubová černá, dřevo a sytá oranžová
                  </div>
                </div>
              </div>
              {theme === 'aces' && (
                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Miniature UI preview: Aces Warm Dark */}
            <div className="w-full h-16 rounded-lg bg-[#19120c] border border-amber-900/40 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner mt-1">
              <div className="flex items-center justify-between">
                <div className="h-2 w-16 bg-[#ff8000] rounded shadow-sm" />
                <div className="h-2 w-8 bg-[#3d2a1b] rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-3/4 bg-[#2b1e13] rounded" />
                <div className="h-1.5 w-1/2 bg-[#2b1e13] rounded" />
              </div>
            </div>
          </button>

          {/* 2. NOČNÍ GRAFIT (Midnight tmavý) */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              'group relative flex flex-col items-start justify-between gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer select-none',
              theme === 'dark'
                ? 'border-primary bg-primary/10 shadow-md shadow-primary/15 ring-1 ring-primary/40'
                : 'border-border/60 hover:border-sky-500/40 hover:bg-muted/40'
            )}
          >
            <div className="flex items-start justify-between w-full gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                  <Moon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground">Noční grafit</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    Moderní chladné břidlicové tóny a kontrast
                  </div>
                </div>
              </div>
              {theme === 'dark' && (
                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Miniature UI preview: Midnight Cool Dark */}
            <div className="w-full h-16 rounded-lg bg-[#0b0e14] border border-zinc-800 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner mt-1">
              <div className="flex items-center justify-between">
                <div className="h-2 w-16 bg-[#ff8000] rounded shadow-sm" />
                <div className="h-2 w-8 bg-zinc-700 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-3/4 bg-zinc-800 rounded" />
                <div className="h-1.5 w-1/2 bg-zinc-800 rounded" />
              </div>
            </div>
          </button>

          {/* 3. SVĚTLÝ REŽIM */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={cn(
              'group relative flex flex-col items-start justify-between gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer select-none',
              theme === 'light'
                ? 'border-primary bg-primary/10 shadow-md shadow-primary/15 ring-1 ring-primary/40'
                : 'border-border/60 hover:border-amber-500/40 hover:bg-muted/40'
            )}
          >
            <div className="flex items-start justify-between w-full gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                  <Sun className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground">Světlý režim</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    Vysoký kontrast a čistý denní vzhled
                  </div>
                </div>
              </div>
              {theme === 'light' && (
                <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Miniature UI preview: Light */}
            <div className="w-full h-16 rounded-lg bg-slate-100 border border-slate-200 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner mt-1">
              <div className="flex items-center justify-between">
                <div className="h-2 w-16 bg-[#d96500] rounded shadow-sm" />
                <div className="h-2 w-8 bg-slate-300 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                <div className="h-1.5 w-1/2 bg-slate-200 rounded" />
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
