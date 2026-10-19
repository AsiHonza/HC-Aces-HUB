'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Trophy,
  Crown,
  Flame,
  Disc,
  Shield,
  ShieldCheck,
  Star,
  Zap,
  Sparkles,
  Crosshair,
  Target,
  HeartHandshake,
  CheckCircle2,
  Users,
  TrendingUp,
  Award,
  ChevronRight,
  Sparkle,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TIER_CONFIG,
  formatUnitWithCount,
  type MilestoneWithHolders,
  type MilestoneTier,
} from '../utils/milestones';

export interface MilestoneDetailModalProps {
  milestone: MilestoneWithHolders | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPlayerCareer?: (playerId: string) => void;
  currentUserId?: string | null;
}

export function MilestoneDetailModal({
  milestone,
  isOpen,
  onClose,
  onOpenPlayerCareer,
  currentUserId,
}: MilestoneDetailModalProps) {
  if (!milestone) return null;

  const { definition, holders, totalHolders, candidates = [] } = milestone;
  const tierConf = TIER_CONFIG[definition.tier];
  const isLegend = definition.tier === 'legend';
  const isDiamond = definition.tier === 'diamond';

  // Check current user status
  const userHolderRecord = currentUserId ? holders.find((h) => h.id === currentUserId) : null;
  const userCandidateRecord = currentUserId ? candidates.find((c) => c.id === currentUserId) : null;
  const isUnlockedByMe = Boolean(userHolderRecord);

  const renderMilestoneIcon = (iconName: string, tier: MilestoneTier, className: string = 'h-6 w-6') => {
    const config = TIER_CONFIG[tier];
    switch (iconName) {
      case 'Crown':
        return <Crown className={cn(className, config.iconColor)} />;
      case 'Flame':
        return <Flame className={cn(className, config.iconColor)} />;
      case 'Disc':
        return <Disc className={cn(className, config.iconColor)} />;
      case 'Award':
        return <Award className={cn(className, config.iconColor)} />;
      case 'Shield':
        return <Shield className={cn(className, config.iconColor)} />;
      case 'ShieldCheck':
        return <ShieldCheck className={cn(className, config.iconColor)} />;
      case 'Star':
        return <Star className={cn(className, config.iconColor, 'fill-current')} />;
      case 'Trophy':
        return <Trophy className={cn(className, config.iconColor)} />;
      case 'Zap':
        return <Zap className={cn(className, config.iconColor)} />;
      case 'Sparkles':
        return <Sparkles className={cn(className, config.iconColor)} />;
      case 'Crosshair':
        return <Crosshair className={cn(className, config.iconColor)} />;
      case 'Target':
        return <Target className={cn(className, config.iconColor)} />;
      case 'HeartHandshake':
        return <HeartHandshake className={cn(className, config.iconColor)} />;
      default:
        return <Trophy className={cn(className, config.iconColor)} />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'games': return 'Zápasy';
      case 'points': return 'Kanadské body';
      case 'goals': return 'Střelci (Góly)';
      case 'assists': return 'Nahrávači (Asistence)';
      case 'goalie_wins': return 'Brankáři (Výhry)';
      case 'goalie_so': return 'Brankáři (Čistá konta)';
      case 'stars': return 'Hvězdy zápasů';
      case 'mvp': return 'Ocenění MVP';
      case 'special': return 'Zápasové klenoty';
      default: return 'Klubový milník';
    }
  };

  const handlePlayerClick = (playerId: string) => {
    onClose();
    if (onOpenPlayerCareer) {
      onOpenPlayerCareer(playerId);
    }
  };

  const defaultTab = totalHolders > 0 ? 'holders' : 'candidates';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden text-left border-border/80 shadow-2xl">
        {/* HORNÍ HERO BANNER ODZNAKU */}
        <div
          className={cn(
            'p-5 sm:p-6 border-b relative overflow-hidden bg-gradient-to-br',
            tierConf.cardBorderClass,
            tierConf.glowClass
          )}
        >
          {/* Tagy úrovně a kategorie */}
          <div className="flex items-center justify-between gap-2 mb-3 pr-8 sm:pr-9">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 font-bold', tierConf.badgeClass)}>
                {tierConf.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-semibold text-muted-foreground">
                {getCategoryLabel(definition.category)}
              </Badge>
            </div>

            <span className="text-[11px] font-bold text-foreground/80 flex items-center gap-1 bg-background/70 backdrop-blur px-2.5 py-1 rounded-full border border-border/60 shrink-0">
              <Users className="h-3 w-3 text-muted-foreground" />
              {totalHolders} {totalHolders === 1 ? 'držitel' : totalHolders >= 2 && totalHolders <= 4 ? 'držitelé' : 'držitelů'}
            </span>
          </div>

          {/* Vizuální střed: Ikona, Titul a Popis */}
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner mt-0.5',
                isLegend
                  ? 'bg-gradient-to-br from-purple-500/25 to-pink-500/20 border-purple-400/50 shadow-purple-500/20'
                  : isDiamond
                  ? 'bg-cyan-500/20 border-cyan-400/40 shadow-cyan-500/15'
                  : 'bg-muted/80 border-border/80'
              )}
            >
              {renderMilestoneIcon(definition.iconName, definition.tier, 'h-7 w-7 sm:h-8 sm:w-8')}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <DialogHeader className="p-0 text-left space-y-1">
                <DialogTitle className="font-headline font-black text-lg sm:text-xl text-foreground flex items-center gap-2 flex-wrap leading-tight">
                  <span>{definition.title}</span>
                  {isLegend && <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 inline" />}
                  {isDiamond && <Sparkle className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 inline" />}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-normal">
                  {definition.description}
                </DialogDescription>
              </DialogHeader>

              <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-background/80 border border-border text-foreground">
                  <Target className="h-3 w-3 text-primary" />
                  Cíl: <span className="text-primary font-black">{definition.target}</span> {definition.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Osobní status přihlášeného hráče */}
          {currentUserId && (
            <div className="mt-4 pt-3 border-t border-border/40">
              {isUnlockedByMe ? (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Tento odznak máš odemčený ve své síni slávy!</span>
                  </div>
                  <span className="font-black tabular-nums bg-background/80 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                    Tvůj zápis: {userHolderRecord?.value} {formatUnitWithCount(userHolderRecord?.value || 0, definition.unit, definition.id)}
                  </span>
                </div>
              ) : userCandidateRecord ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                      Tvůj aktuální postup:
                    </span>
                    <span className="font-black text-amber-600 dark:text-amber-400 tabular-nums">
                      {userCandidateRecord.current} / {definition.target} {formatUnitWithCount(definition.target, definition.unit, definition.id)}
                    </span>
                  </div>
                  <Progress value={userCandidateRecord.progressPct} className="h-1.5 bg-muted" />
                  <p className="text-[10px] text-muted-foreground text-right">
                    K odemčení ti chybí jen <strong className="text-foreground">{userCandidateRecord.remaining} {formatUnitWithCount(userCandidateRecord.remaining, definition.unit, definition.id)}</strong>
                  </p>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Tvůj status:</span>
                  <span className="font-semibold text-muted-foreground/80">Zatím neodemčeno</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TĚLO MODALU: ZÁLOŽKY DRŽITELÉ / KDO MÁ NEJBLÍŽE */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-3.5">
              <TabsTrigger value="holders" className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Držitelé ({totalHolders})
              </TabsTrigger>
              <TabsTrigger value="candidates" className="text-xs font-semibold flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                Kdo má nejblíže ({candidates.length})
              </TabsTrigger>
            </TabsList>

            {/* 1. ZÁLOŽKA: SEZNAM DRŽITELŮ */}
            <TabsContent value="holders" className="mt-0 space-y-2.5">
              {totalHolders > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {holders.map((holder, idx) => {
                    const isMe = currentUserId === holder.id;
                    const isGoalie = holder.playerType === 'goalie';

                    return (
                      <div
                        key={holder.id}
                        onClick={() => handlePlayerClick(holder.id)}
                        className={cn(
                          'group cursor-pointer rounded-xl border p-2.5 sm:p-3 transition-all flex items-center justify-between gap-3 bg-card hover:bg-muted/50 hover:border-primary/40',
                          isMe && 'ring-1 ring-primary/40 bg-primary/5'
                        )}
                        title="Kliknutím zobrazíte kariérní profil hráče"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-black text-muted-foreground/60 w-5 text-center shrink-0 tabular-nums">
                            {idx + 1}.
                          </span>
                          <Avatar className="h-9 w-9 border border-border shrink-0">
                            <AvatarImage src={holder.photoURL || undefined} />
                            <AvatarFallback className="text-[11px] font-bold">
                              {holder.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {holder.name}
                              </p>
                              {isGoalie && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                  Brankář
                                </Badge>
                              )}
                              {isMe && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/50 text-primary">
                                  Ty
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {holder.jerseyNumber && (
                                <p className="text-[10px] text-muted-foreground font-semibold">#{holder.jerseyNumber}</p>
                              )}
                              {holder.matchContext && (
                                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-primary shrink-0" />
                                  <span className="truncate">{holder.matchContext}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="font-black text-xs sm:text-sm text-primary tabular-nums">
                              {holder.value}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {formatUnitWithCount(holder.value, definition.unit, definition.id)}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center space-y-2.5 border border-dashed rounded-2xl bg-muted/20">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Trophy className="h-5 w-5 opacity-40" />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-foreground">
                      Tento odznak zatím nikdo nepokořil
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Zůstává volný v klubové vitríně. Kdo bude prvním nesmrtelným držitelem v historii HC Aces?
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 2. ZÁLOŽKA: KDO MÁ NEJBLÍŽE (RADAR ADEPTŮ) */}
            <TabsContent value="candidates" className="mt-0 space-y-2.5">
              {candidates.length > 0 ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pb-1">
                    <span>Hráči s nejvyšším postupem k odemčení:</span>
                    <span className="text-[10px] font-semibold text-amber-500">Klubový radar</span>
                  </div>

                  {candidates.map((cand, idx) => {
                    const isMe = currentUserId === cand.id;
                    const isGoalie = cand.playerType === 'goalie';

                    return (
                      <div
                        key={cand.id}
                        onClick={() => handlePlayerClick(cand.id)}
                        className={cn(
                          'group cursor-pointer rounded-xl border p-2.5 sm:p-3 transition-all bg-card hover:bg-muted/50 hover:border-amber-500/40 space-y-2',
                          isMe && 'ring-1 ring-amber-500/40 bg-amber-500/5'
                        )}
                        title="Kliknutím zobrazíte kariérní profil hráče"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xs font-black text-amber-500/80 w-5 text-center shrink-0 tabular-nums">
                              #{idx + 1}
                            </span>
                            <Avatar className="h-8 w-8 border border-border shrink-0">
                              <AvatarImage src={cand.photoURL || undefined} />
                              <AvatarFallback className="text-[10px] font-bold">
                                {cand.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-amber-500 transition-colors">
                                  {cand.name}
                                </p>
                                {isGoalie && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                    Brankář
                                  </Badge>
                                )}
                                {isMe && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/50 text-primary">
                                    Ty
                                  </Badge>
                                )}
                              </div>
                              {cand.jerseyNumber && (
                                <p className="text-[10px] text-muted-foreground">#{cand.jerseyNumber}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-xs text-amber-500 tabular-nums">
                              {cand.current} / {cand.target}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {cand.progressPct}% splněno
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Chybějící hodnota */}
                        <div className="space-y-1 pt-0.5">
                          <Progress value={cand.progressPct} className="h-1.5 bg-muted" />
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{cand.note || 'Zbývá dosáhnout:'}</span>
                            <strong className="text-foreground font-semibold">
                              Chybí jen {cand.remaining} {formatUnitWithCount(cand.remaining, definition.unit, definition.id)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center space-y-2 border border-dashed rounded-2xl bg-muted/20">
                  <div className="h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-foreground">
                      {definition.category === 'special' || definition.target === 1
                        ? 'Jednorázový zápasový klenot'
                        : 'K tomuto milníku zatím nikdo nemá nakročeno'}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      {definition.category === 'special' || definition.target === 1
                        ? 'Tento odznak se odemyká jedinečným zápisem v kterémkoliv utkání. Každý další zápas je pro hráče novou šancí zazářit!'
                        : 'Všichni aktivní hráči mají k této metě ještě delší cestu, nebo byl odznak již všemi adepty pokořen.'}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* SPODNÍ PATIČKA */}
        <div className="p-3 sm:p-4 border-t bg-muted/20 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Kliknutím na hráče otevřete jeho kariérní kartu
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs ml-auto">
            Zavřít detail
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
