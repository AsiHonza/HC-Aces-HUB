'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Disc, 
  Award, 
  Shield, 
  Flame, 
  Activity, 
  Star, 
  Crown, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  ShieldCheck,
  TrendingUp,
  Crosshair,
  HeartHandshake,
  Target,
  Timer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PlayerMilestoneProgress } from '@/features/stats/utils/milestones';
import { TIER_CONFIG, formatUnitWithCount, getMilestoneRarityScore } from '@/features/stats/utils/milestones';

export interface PlayerSeasonRecord {
  seasonId: string;
  seasonName: string;
  year: string;
  isCurrent?: boolean;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
}

export interface GoalieSeasonRecord {
  seasonId: string;
  seasonName: string;
  year: string;
  isCurrent?: boolean;
  gamesPlayed: number;
  wins: number;
  saves: number;
  shotsAgainst: number;
  savePercentage: number;
  shutouts: number;
}

export interface PlayerCareerData {
  id: string;
  name: string;
  photoURL?: string | null;
  jerseyNumber?: number;
  playerType: 'player' | 'goalie' | 'member';
  role?: string;
  mvpAwardsCount?: number;
  starsStats?: {
    star1Count: number;
    star2Count: number;
    star3Count: number;
    totalPoints: number;
    totalStars: number;
  };
  skaterSeasons?: PlayerSeasonRecord[];
  goalieSeasons?: GoalieSeasonRecord[];
  milestones?: PlayerMilestoneProgress[];
}

function renderMilestoneIcon(iconName: string, iconColor: string) {
  switch (iconName) {
    case 'Crown':
      return <Crown className={cn("h-4 w-4", iconColor)} />;
    case 'Flame':
      return <Flame className={cn("h-4 w-4", iconColor)} />;
    case 'Disc':
      return <Disc className={cn("h-4 w-4", iconColor)} />;
    case 'Award':
      return <Award className={cn("h-4 w-4", iconColor)} />;
    case 'Star':
      return <Star className={cn("h-4 w-4 fill-current", iconColor)} />;
    case 'ShieldCheck':
      return <ShieldCheck className={cn("h-4 w-4", iconColor)} />;
    case 'Zap':
      return <Zap className={cn("h-4 w-4", iconColor)} />;
    case 'Sparkles':
      return <Sparkles className={cn("h-4 w-4", iconColor)} />;
    case 'Crosshair':
      return <Crosshair className={cn("h-4 w-4", iconColor)} />;
    case 'HeartHandshake':
      return <HeartHandshake className={cn("h-4 w-4", iconColor)} />;
    case 'Target':
      return <Target className={cn("h-4 w-4", iconColor)} />;
    case 'Timer':
      return <Timer className={cn("h-4 w-4", iconColor)} />;
    case 'TrendingUp':
      return <TrendingUp className={cn("h-4 w-4", iconColor)} />;
    default:
      return <Shield className={cn("h-4 w-4", iconColor)} />;
  }
}

export interface PlayerCareerModalProps {
  player: PlayerCareerData | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMilestoneDetail?: (milestoneId: string) => void;
}

export function PlayerCareerModal({ player, isOpen, onClose, onOpenMilestoneDetail }: PlayerCareerModalProps) {
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  if (!player) return null;

  const isGoalie = player.playerType === 'goalie';
  const mvpAwards = player.mvpAwardsCount ?? 0;

  // Career totals for skaters
  const totalGames = (player.skaterSeasons || []).reduce((sum, s) => sum + (s.gamesPlayed || 0), 0);
  const totalGoals = (player.skaterSeasons || []).reduce((sum, s) => sum + (s.goals || 0), 0);
  const totalAssists = (player.skaterSeasons || []).reduce((sum, s) => sum + (s.assists || 0), 0);
  const totalPoints = totalGoals + totalAssists;

  // Career totals for goalies
  const goalieGames = (player.goalieSeasons || []).reduce((sum, s) => sum + (s.gamesPlayed || 0), 0);
  const goalieWins = (player.goalieSeasons || []).reduce((sum, s) => sum + (s.wins || 0), 0);
  const goalieSaves = (player.goalieSeasons || []).reduce((sum, s) => sum + (s.saves || 0), 0);
  const goalieShots = (player.goalieSeasons || []).reduce((sum, s) => sum + (s.shotsAgainst || 0), 0);
  const goalieSO = (player.goalieSeasons || []).reduce((sum, s) => sum + (s.shutouts || 0), 0);
  const careerSavePct = goalieShots > 0 ? ((goalieSaves / goalieShots) * 100).toFixed(1) : '0.0';

  const initials = player.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-primary shadow-md">
                <AvatarImage src={player.photoURL || undefined} alt={player.name} />
                <AvatarFallback className="font-bold text-lg bg-muted">{initials}</AvatarFallback>
              </Avatar>
              {player.jerseyNumber && (
                <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground font-black text-xs px-1.5 py-0.5 rounded-full border border-background shadow-sm">
                  #{player.jerseyNumber}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-headline font-bold">{player.name}</DialogTitle>
                <Badge variant={isGoalie ? 'secondary' : 'default'} className="text-xs">
                  {isGoalie ? 'Brankář' : player.playerType === 'player' ? 'Útočník / Obránce' : 'Člen'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Kariérní karta a statistiky po ročnících v HC Aces
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Výrazná sekce ocenění: Hvězdy zápasů & MVP */}
        <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Karta Hvězdy zápasů */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent flex items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <span>Hvězdy zápasů</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black font-headline text-foreground tabular-nums">
                {player.starsStats?.totalPoints || 0}{' '}
                <span className="text-sm font-semibold text-amber-500">bodů</span>
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {player.starsStats?.star1Count || 0}x 1.
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-300 font-bold border border-zinc-500/30">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {player.starsStats?.star2Count || 0}x 2.
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-800/20 text-amber-600 dark:text-amber-500 font-bold border border-amber-800/30">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {player.starsStats?.star3Count || 0}x 3.
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
              <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
            </div>
          </div>

          {/* Karta MVP zápasů */}
          <div className="p-3.5 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent flex items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Trophy className="h-4 w-4 text-primary" />
                <span>Hráč zápasu (MVP)</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black font-headline text-foreground tabular-nums">
                {mvpAwards || 0}x{' '}
                <span className="text-sm font-semibold text-primary">oceněn</span>
              </p>
              <p className="text-[11px] text-muted-foreground font-medium pt-0.5">
                Zvolen nejlepším hráčem týmu po odehraném zápase
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0 shadow-inner">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Souhrnné statistiky za celou historii */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            Celková bilance v dresu HC Aces
          </h4>
          {!isGoalie ? (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <p className="text-[11px] text-muted-foreground">Zápasy</p>
                <p className="text-lg font-bold font-headline">{totalGames}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Disc className="h-3 w-3 text-primary" /> Góly
                </p>
                <p className="text-lg font-bold font-headline text-primary">{totalGoals}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Award className="h-3 w-3 text-muted-foreground" /> Asistence
                </p>
                <p className="text-lg font-bold font-headline">{totalAssists}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-[11px] text-primary font-semibold flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3" /> Body celkem
                </p>
                <p className="text-xl font-extrabold font-headline text-primary">{totalPoints}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <p className="text-[11px] text-muted-foreground">Zápasy</p>
                <p className="text-lg font-bold font-headline">{goalieGames}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <p className="text-[11px] text-muted-foreground">Výhry</p>
                <p className="text-lg font-bold font-headline text-primary">{goalieWins}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <p className="text-[11px] text-muted-foreground">Zásahy</p>
                <p className="text-lg font-bold font-headline">{goalieSaves}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <p className="text-[11px] text-muted-foreground">Čistá konta</p>
                <p className="text-lg font-bold font-headline">{goalieSO}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-[11px] text-primary font-semibold">Úspěšnost</p>
                <p className="text-xl font-extrabold font-headline text-primary">{careerSavePct}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Klubové milníky a Síň slávy hráče */}
        {player.milestones && player.milestones.length > 0 && (() => {
          const unlocked = player.milestones.filter(m => m.isUnlocked);
          const sortedUnlocked = [...unlocked].sort((a, b) => {
            const scoreA = a.milestone.rarityScore ?? getMilestoneRarityScore(a.milestone);
            const scoreB = b.milestone.rarityScore ?? getMilestoneRarityScore(b.milestone);
            return scoreB - scoreA;
          });
          const hasMore = sortedUnlocked.length > 3;
          const displayedUnlocked = showAllMilestones ? sortedUnlocked : sortedUnlocked.slice(0, 3);

          const upcoming = player.milestones
            .filter(m => !m.isUnlocked && m.current > 0)
            .sort((a, b) => a.remaining - b.remaining || b.progressPct - a.progressPct)
            .slice(0, 3);

          return (
            <div className="mb-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  {unlocked.length > 3 && !showAllMilestones
                    ? `TOP 3 nejcennější odznaky (${unlocked.length} celkem)`
                    : `Klubové odznaky & milníky (${unlocked.length} odemčeno)`}
                </h4>
                {hasMore && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-primary hover:text-primary font-semibold"
                    onClick={() => setShowAllMilestones(prev => !prev)}
                  >
                    {showAllMilestones ? (
                      <>
                        Zobrazit pouze TOP 3
                        <ChevronUp className="h-3 w-3 ml-1" />
                      </>
                    ) : (
                      <>
                        Zobrazit všech {unlocked.length} odznaků
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              {unlocked.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {displayedUnlocked.map(p => {
                    const cfg = TIER_CONFIG[p.milestone.tier];
                    return (
                      <div
                        key={p.milestone.id}
                        onClick={() => {
                          if (onOpenMilestoneDetail) {
                            onClose();
                            onOpenMilestoneDetail(p.milestone.id);
                          }
                        }}
                        className={cn(
                          "p-2.5 rounded-lg border text-left flex items-start gap-2.5 bg-gradient-to-br transition-all relative overflow-hidden select-none",
                          onOpenMilestoneDetail && "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99]",
                          cfg.cardBorderClass,
                          cfg.glowClass
                        )}
                        title={onOpenMilestoneDetail ? "Kliknutím zobrazíte detail odznaku v Síni slávy" : undefined}
                      >
                        <div className="h-8 w-8 rounded-md bg-background/80 border border-border flex items-center justify-center shrink-0 mt-0.5">
                          {renderMilestoneIcon(p.milestone.iconName, cfg.iconColor)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={cn("text-[9px] px-1.5 py-0 rounded border font-bold uppercase tracking-wider", cfg.badgeClass)}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs font-bold leading-snug text-foreground break-words">{p.milestone.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {p.current} {formatUnitWithCount(p.current, p.milestone.unit, p.milestone.id)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/20 border border-dashed rounded-lg p-2.5 text-center">
                  Zatím žádný odemčený milník – pokračuj v bojích za Aces!
                </p>
              )}

              {/* Nejbližší cíle s progress barem */}
              {upcoming.length > 0 && (
                <div className="pt-1.5 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">Nejbližší cíle k odemčení:</p>
                  <div className="space-y-1.5">
                    {upcoming.map(u => (
                      <div 
                        key={u.milestone.id} 
                        onClick={() => {
                          if (onOpenMilestoneDetail) {
                            onClose();
                            onOpenMilestoneDetail(u.milestone.id);
                          }
                        }}
                        className={cn(
                          "p-2 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1 select-none",
                          onOpenMilestoneDetail && "cursor-pointer hover:border-amber-500/50 hover:bg-muted/70 transition-colors"
                        )}
                        title={onOpenMilestoneDetail ? "Kliknutím zobrazíte detail odznaku v Síni slávy" : undefined}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className={cn("text-[9px] px-1 py-0 rounded border font-bold", TIER_CONFIG[u.milestone.tier].badgeClass)}>
                              {TIER_CONFIG[u.milestone.tier].label}
                            </span>
                            {u.milestone.title}
                          </span>
                          <span className="text-amber-500 font-bold tabular-nums">
                            {u.current} / {u.target} {formatUnitWithCount(u.target, u.milestone.unit, u.milestone.id)}
                          </span>
                        </div>
                        <Progress value={u.progressPct} className="h-1.5 bg-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tabulka jednotlivých ročníků */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Statistiky v jednotlivých ročnících
          </h4>

          {!isGoalie ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs">Sezóna / Soutěž</TableHead>
                    <TableHead className="text-center text-xs">Ročník</TableHead>
                    <TableHead className="text-center text-xs">Z</TableHead>
                    <TableHead className="text-center text-xs">G</TableHead>
                    <TableHead className="text-center text-xs">A</TableHead>
                    <TableHead className="text-center text-xs font-bold text-primary">B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(player.skaterSeasons || []).map((s) => (
                    <TableRow key={s.seasonId} className={s.isCurrent ? 'bg-primary/5 font-semibold' : ''}>
                      <TableCell className="text-xs py-2.5">
                        <div className="flex items-center gap-1.5">
                          {s.seasonName}
                          {s.isCurrent && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary">
                              Aktuální
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs py-2.5 text-muted-foreground">{s.year}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.gamesPlayed}</TableCell>
                      <TableCell className="text-center text-xs py-2.5 font-medium">{s.goals}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.assists}</TableCell>
                      <TableCell className="text-center text-xs py-2.5 font-bold text-primary">{s.points}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold border-t-2">
                    <TableCell className="text-xs py-2.5" colSpan={2}>
                      Celkem v HC Aces
                    </TableCell>
                    <TableCell className="text-center text-xs py-2.5">{totalGames}</TableCell>
                    <TableCell className="text-center text-xs py-2.5">{totalGoals}</TableCell>
                    <TableCell className="text-center text-xs py-2.5">{totalAssists}</TableCell>
                    <TableCell className="text-center text-xs py-2.5 text-primary">{totalPoints}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs">Sezóna / Soutěž</TableHead>
                    <TableHead className="text-center text-xs">Ročník</TableHead>
                    <TableHead className="text-center text-xs">Z</TableHead>
                    <TableHead className="text-center text-xs">V</TableHead>
                    <TableHead className="text-center text-xs">Zásahy</TableHead>
                    <TableHead className="text-center text-xs">Střely</TableHead>
                    <TableHead className="text-center text-xs font-bold text-primary">Úsp. %</TableHead>
                    <TableHead className="text-center text-xs">SO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(player.goalieSeasons || []).map((s) => (
                    <TableRow key={s.seasonId} className={s.isCurrent ? 'bg-primary/5 font-semibold' : ''}>
                      <TableCell className="text-xs py-2.5">
                        <div className="flex items-center gap-1.5">
                          {s.seasonName}
                          {s.isCurrent && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary">
                              Aktuální
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs py-2.5 text-muted-foreground">{s.year}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.gamesPlayed}</TableCell>
                      <TableCell className="text-center text-xs py-2.5 font-medium">{s.wins}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.saves}</TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.shotsAgainst}</TableCell>
                      <TableCell className="text-center text-xs py-2.5 font-bold text-primary">
                        {s.savePercentage.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center text-xs py-2.5">{s.shutouts}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold border-t-2">
                    <TableCell className="text-xs py-2.5" colSpan={2}>
                      Celkem v HC Aces
                    </TableCell>
                    <TableCell className="text-center text-xs py-2.5">{goalieGames}</TableCell>
                    <TableCell className="text-center text-xs py-2.5">{goalieWins}</TableCell>
                    <TableCell className="text-center text-xs py-2.5">{goalieSaves}</TableCell>
                    <TableCell className="text-center text-xs py-2.5">{goalieShots}</TableCell>
                    <TableCell className="text-center text-xs py-2.5 text-primary">{careerSavePct}%</TableCell>
                    <TableCell className="text-center text-xs py-2.5">{goalieSO}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
