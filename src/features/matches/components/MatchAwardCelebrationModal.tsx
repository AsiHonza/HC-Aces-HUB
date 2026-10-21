'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Award, CheckCircle2 } from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import { formatMatchDate } from '@/lib/dates';

export interface CelebrationAwardData {
  matchId: string;
  matchOpponent: string;
  matchDate?: string | Date;
  scoreAces?: number;
  scoreOpponent?: number;
  isWin?: boolean;
  awardRank: 1 | 2 | 3;
  isTied?: boolean;
  awardPoints: number;
  star1Count?: number;
  star2Count?: number;
  star3Count?: number;
  playerName: string;
  playerJersey?: number | null;
  playerPhotoURL?: string | null;
  playerPosition?: string;
  matchGoals?: number;
  matchAssists?: number;
  matchSaves?: number;
  isShutout?: boolean;
  tieBreakerReason?: string;
  isSimulation?: boolean;
}

export interface MatchAwardCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  awardData: CelebrationAwardData | null;
}

/**
 * Lightweight, zero-dependency HTML5 canvas confetti generator.
 * Runs celebratory particle burst for 3.5 seconds on modal open.
 */
function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    let width = (canvas.width = (parent && parent.clientWidth > 0) ? parent.clientWidth : 480);
    let height = (canvas.height = (parent && parent.clientHeight > 0) ? parent.clientHeight : 620);

    const colors = [
      '#F59E0B', '#FBBF24', '#D97706', // Zlato
      '#E2E8F0', '#CBD5E1', '#FFFFFF', // Stříbro
      '#EF4444', '#3B82F6', '#10B981', // Barvy dresů
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      shape: 'rect' | 'circle';
    }

    const particles: Particle[] = [];
    const count = 85;

    // Launch from top-center
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) - Math.PI / 2; // -90 to +90 deg
      const speed = Math.random() * 8 + 4;
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 60,
        y: height * 0.2 + (Math.random() - 0.5) * 40,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed * 0.8,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      });
    }

    let animationId: number;
    const startTime = Date.now();
    const duration = 3800; // 3.8s

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // Gravity
        p.vx *= 0.98; // Air resistance
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20 w-full h-full"
    />
  );
}

function getAwardTheme(awardData: CelebrationAwardData) {
  const isRank1 = awardData.awardRank === 1;
  const isRank2 = awardData.awardRank === 2;

  if (isRank1) {
    return {
      tierName: awardData.isTied ? '1. Hvězda (Dělená) & MVP' : '1. Hvězda & Hráč zápasu (MVP)',
      badgeClass: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black border-amber-400/50 shadow-md',
      glowClass: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      borderClass: 'border-amber-500/40',
      ringClass: 'border-amber-400 ring-4 ring-amber-400/20 shadow-amber-500/30',
      accentText: 'text-amber-500',
      headline: awardData.isTied
        ? 'Byl jsi zvolen dělenou 1. hvězdou zápasu (MVP)!'
        : 'Byl jsi zvolen první hvězdou zápasu (MVP)!',
      starsCount: 3,
      starColor: 'fill-amber-400 text-amber-400',
    };
  }
  if (isRank2) {
    return {
      tierName: '2. Hvězda zápasu',
      badgeClass: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-900 border-slate-300 shadow-md',
      glowClass: 'from-slate-300/20 via-slate-400/10 to-transparent',
      borderClass: 'border-slate-400/40',
      ringClass: 'border-slate-300 ring-4 ring-slate-300/20 shadow-slate-300/30',
      accentText: 'text-slate-300',
      headline: 'Byl jsi zvolen druhou hvězdou zápasu!',
      starsCount: 2,
      starColor: 'fill-slate-300 text-slate-300',
    };
  }
  return {
    tierName: '3. Hvězda zápasu',
    badgeClass: 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white border-amber-700/50 shadow-md',
    glowClass: 'from-amber-700/20 via-amber-800/10 to-transparent',
    borderClass: 'border-amber-700/40',
    ringClass: 'border-amber-700 ring-4 ring-amber-700/20 shadow-amber-700/30',
    accentText: 'text-amber-600 dark:text-amber-400',
    headline: 'Byl jsi zvolen třetí hvězdou zápasu!',
    starsCount: 1,
    starColor: 'fill-amber-600 text-amber-600',
  };
}

export function MatchAwardCelebrationModal({
  isOpen,
  onClose,
  awardData,
}: MatchAwardCelebrationModalProps) {
  // Tactile haptic feedback on mobile if supported
  useEffect(() => {
    if (isOpen && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 60, 140]);
      } catch {
        // Ignore vibration errors
      }
    }
  }, [isOpen]);

  if (!isOpen || !awardData) return null;

  const isRank1 = awardData.awardRank === 1;
  const isRank2 = awardData.awardRank === 2;
  const isRank3 = awardData.awardRank === 3;
  const theme = getAwardTheme(awardData);

  const initials = awardData.playerName
    ? awardData.playerName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'HA';

  const formattedDate = awardData.matchDate
    ? formatMatchDate(awardData.matchDate, 'EEEE d. M. yyyy')
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] sm:w-full p-0 overflow-hidden max-h-[92vh] overflow-y-auto rounded-3xl border border-border/70 bg-card/95 shadow-2xl backdrop-blur-sm">
        <ConfettiCanvas active={isOpen} />

        {/* HORNÍ ZÁHLAVÍ: SVĚTELNÁ ZÁŘE A ODZNAK OCENĚNÍ */}
        <div
          className={cn(
            'relative pt-7 pb-3 px-6 text-center bg-gradient-to-b flex flex-col items-center justify-center',
            theme.glowClass
          )}
        >
          {/* Hvězdy dekorace */}
          <div className="flex items-center gap-1.5 mb-2.5">
            {Array.from({ length: theme.starsCount }).map((_, idx) => (
              <Star
                key={idx}
                className={cn('h-5 w-5 drop-shadow-md', theme.starColor)}
              />
            ))}
          </div>

          <Badge className={cn('text-xs font-bold uppercase tracking-wider px-4 py-1 mb-3.5 rounded-full shadow-xs', theme.badgeClass)}>
            {isRank1 ? <Trophy className="h-3.5 w-3.5 mr-1.5 shrink-0" /> : <Award className="h-3.5 w-3.5 mr-1.5 shrink-0" />}
            {theme.tierName}
          </Badge>

          {/* AVATAR HRÁČE */}
          <div className="relative mb-2">
            <Avatar className={cn('h-20 w-20 border-4 shadow-xl transition-transform hover:scale-105', theme.ringClass)}>
              <AvatarImage src={awardData.playerPhotoURL || undefined} alt={awardData.playerName} />
              <AvatarFallback className="font-headline font-black text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            {awardData.playerJersey && (
              <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-black px-2 py-0.5 rounded-full shadow-md border-2 border-background">
                #{awardData.playerJersey}
              </span>
            )}
          </div>

          {/* Jméno a post */}
          <DialogTitle className="text-xl sm:text-2xl font-black font-headline tracking-tight text-foreground mt-1">
            {awardData.playerName}
          </DialogTitle>
          {awardData.playerPosition && (
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
              {awardData.playerPosition}
            </p>
          )}
        </div>

        {/* TĚLO MODALU: GRATULACE A KONTEXT ZÁPASU */}
        <div className="px-6 pb-6 pt-1 space-y-4">
          <DialogDescription className="text-center text-sm sm:text-base font-bold text-foreground px-2 leading-snug">
            {theme.headline}
          </DialogDescription>

          {/* KARTA ZÁPASU & BODY HLASOVÁNÍ */}
          <div className="rounded-2xl bg-muted/30 border border-border/60 p-4 space-y-3 text-xs shadow-xs">
            {/* Soupeř a výsledek */}
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Utkání</span>
                <span className="font-bold text-foreground truncate block text-sm">
                  HC Aces vs {awardData.matchOpponent}
                </span>
              </div>
              {awardData.scoreAces !== undefined && awardData.scoreOpponent !== undefined && (
                <div className="text-right shrink-0">
                  <span className="text-sm sm:text-base font-black tabular-nums text-foreground block">
                    {awardData.scoreAces} : {awardData.scoreOpponent}
                  </span>
                  {awardData.isWin !== undefined && (
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block',
                        awardData.isWin
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-rose-500/20 text-rose-500'
                      )}
                    >
                      {awardData.isWin ? 'Výhra' : 'Prohra'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Datum a detaily bodování */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Hlasování kabiny</span>
                <span className="font-extrabold text-foreground tabular-nums flex items-center gap-1 mt-0.5">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  {awardData.awardPoints} bodů
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {[
                    awardData.star1Count ? `${awardData.star1Count}× 1.` : null,
                    awardData.star2Count ? `${awardData.star2Count}× 2.` : null,
                    awardData.star3Count ? `${awardData.star3Count}× 3.` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ') || 'Vyhlášeno kabinou'}
                </span>
              </div>

              {/* Zápasový výkon hráče */}
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Tvůj výkon v zápase</span>
                {awardData.matchGoals !== undefined || awardData.matchAssists !== undefined ? (
                  <span className="font-extrabold text-foreground tabular-nums block mt-0.5">
                    {awardData.matchGoals || 0} G + {awardData.matchAssists || 0} A
                  </span>
                ) : awardData.matchSaves !== undefined ? (
                  <span className="font-extrabold text-foreground tabular-nums block mt-0.5">
                    {awardData.matchSaves} zásahů {awardData.isShutout ? '(Čisté konto)' : ''}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Klíčová opora</span>
                )}
                {formattedDate && (
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {formattedDate}
                  </span>
                )}
              </div>
            </div>

            {awardData.tieBreakerReason && (
              <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground text-center italic">
                {awardData.tieBreakerReason}
              </div>
            )}
          </div>

          {/* AKČNÍ TLAČÍTKO */}
          <div className="pt-1">
            <Button
              className="w-full font-bold text-sm h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              onClick={onClose}
            >
              Zavřít okno
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
