'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, Check } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatName } from '@/lib/utils';
import { getMvpVotingStatus, getMatchMvpCandidates, MvpCandidate } from '../utils/mvpVoting';
import { matchesService } from '../services/matchesService';
import { getMatchOpponentName } from '../utils/headToHead';
import type { Match, UserProfile } from '@/types';

export interface MatchStarsModalProps {
  match: Match | null;
  currentUserId?: string;
  users: UserProfile[];
  attendees?: Array<{ userId: string; status: string }>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MatchStarsModal({
  match,
  currentUserId,
  users,
  attendees = [],
  isOpen: propIsOpen,
  onOpenChange,
}: MatchStarsModalProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isControlled = propIsOpen !== undefined;
  const isModalOpen = isControlled ? propIsOpen : internalIsOpen;

  const setModalOpen = (open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    if (!isControlled) setInternalIsOpen(open);
  };

  // Selected stars: [star1Id, star2Id, star3Id]
  const [selectedStar1, setSelectedStar1] = useState<string>('');
  const [selectedStar2, setSelectedStar2] = useState<string>('');
  const [selectedStar3, setSelectedStar3] = useState<string>('');

  const candidates = useMemo(() => {
    if (!match) return [];
    return getMatchMvpCandidates(match, users, attendees);
  }, [match, users, attendees]);

  const opponentName = match ? getMatchOpponentName(match) : '';

  // Pre-fill existing votes if user already voted
  useEffect(() => {
    if (match && currentUserId && match.starsVotes?.[currentUserId]) {
      const existing = match.starsVotes[currentUserId];
      setSelectedStar1(existing.star1 || '');
      setSelectedStar2(existing.star2 || '');
      setSelectedStar3(existing.star3 || '');
    }
  }, [match, currentUserId]);

  // Check if current user is eligible (was on the roster/going) and hasn't voted
  useEffect(() => {
    if (!match || !currentUserId) {
      if (!isControlled) setInternalIsOpen(false);
      return;
    }

    const votingStatus = getMvpVotingStatus(match);
    if (votingStatus.status !== 'open') {
      if (!isControlled) setInternalIsOpen(false);
      return;
    }

    // Check if user already voted (either in starsVotes or legacy mvpVotes)
    const hasVotedStars = Boolean(match.starsVotes?.[currentUserId]);
    const hasVotedMvp = Boolean(match.mvpVotes?.[currentUserId]);
    if (hasVotedStars || hasVotedMvp) {
      if (!isControlled) setInternalIsOpen(false);
      return;
    }

    // Check if user participated in this match
    const isParticipant =
      candidates.some((c) => c.id === currentUserId) ||
      attendees.some((a) => a.userId === currentUserId && a.status === 'going');

    if (!isParticipant) {
      if (!isControlled) setInternalIsOpen(false);
      return;
    }

    // Check session storage to avoid spamming on every navigation if dismissed
    const storageKey = `dismissed_stars_modal_${match.id}_${currentUserId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      if (!isControlled) setInternalIsOpen(false);
      return;
    }

    if (!isControlled) setInternalIsOpen(true);
  }, [match, currentUserId, candidates, attendees, isControlled]);

  const handleDismiss = () => {
    if (match && currentUserId && typeof window !== 'undefined') {
      sessionStorage.setItem(`dismissed_stars_modal_${match.id}_${currentUserId}`, '1');
    }
    setModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!firestore || !match || !currentUserId) return;

    if (!selectedStar1 || !selectedStar2 || !selectedStar3) {
      toast({
        variant: 'destructive',
        title: 'Neúplný výběr',
        description: 'Vyberte prosím všechny 3 hvězdy utkání (1., 2. i 3. hvězdu).',
      });
      return;
    }

    if (
      selectedStar1 === currentUserId ||
      selectedStar2 === currentUserId ||
      selectedStar3 === currentUserId
    ) {
      toast({
        variant: 'destructive',
        title: 'Nelze hlasovat pro sebe',
        description: 'Všechny hvězdy musíte udělit svým spoluhráčům.',
      });
      return;
    }

    if (
      selectedStar1 === selectedStar2 ||
      selectedStar1 === selectedStar3 ||
      selectedStar2 === selectedStar3
    ) {
      toast({
        variant: 'destructive',
        title: 'Duplicitní výběr',
        description: 'Každou hvězdu musíte udělit jinému spoluhráči.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await matchesService.submitMatchStarsVote(
        firestore,
        match.id,
        currentUserId,
        {
          star1: selectedStar1,
          star2: selectedStar2,
          star3: selectedStar3,
        },
        match.starsVotes || {},
        match.mvpVotes || {}
      );

      toast({
        title: 'Hlasování zaznamenáno',
        description: 'Vaše 3 hvězdy zápasu byly úspěšně uloženy.',
      });
      setModalOpen(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při ukládání',
        description: err.message || 'Nepodařilo se uložit hlasování.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isModalOpen || !match) return null;

  // Filter candidates who are not the voter themselves
  const eligibleCandidates = candidates.filter((c) => c.id !== currentUserId);

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span>Hvězdy zápasu</span>
          </div>
          <DialogTitle className="text-xl font-headline font-extrabold">
            Vyhlášení 3 hvězd utkání
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Zhodnoťte výkon spoluhráčů v utkání proti{' '}
            <strong className="text-foreground">{opponentName}</strong> a udělte 3 hvězdy zápasu.
            1. hvězda = 3 body, 2. hvězda = 2 body, 3. hvězda = 1 bod.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Slot 1: 1. Hvězda */}
          <div className="p-3.5 rounded-xl border border-primary/40 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-primary/20 text-primary">
                  <Star className="h-4 w-4 fill-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    1. Hvězda (3 body)
                  </p>
                  <p className="text-[11px] text-muted-foreground">Nejlepší hráč utkání</p>
                </div>
              </div>
              {selectedStar1 && (
                <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
                  Vybráno
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {eligibleCandidates.map((c) => {
                const isSelected = selectedStar1 === c.id;
                const isUsedElsewhere = selectedStar2 === c.id || selectedStar3 === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    disabled={isUsedElsewhere}
                    onClick={() => setSelectedStar1(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground font-bold shadow-sm'
                        : isUsedElsewhere
                        ? 'opacity-40 border-border/30 bg-muted/10 cursor-not-allowed'
                        : 'border-border/70 hover:border-primary/50 bg-card'
                    }`}
                  >
                    <Avatar className="h-6 w-6 shrink-0 border">
                      <AvatarImage src={c.photoURL || undefined} />
                      <AvatarFallback className="text-[10px]">{c.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{formatName(c.name)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot 2: 2. Hvězda */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-muted text-muted-foreground">
                  <Star className="h-4 w-4 fill-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    2. Hvězda (2 body)
                  </p>
                  <p className="text-[11px] text-muted-foreground">Druhý nejlepší výkon</p>
                </div>
              </div>
              {selectedStar2 && (
                <Badge variant="outline" className="text-[10px] border-border text-foreground">
                  Vybráno
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {eligibleCandidates.map((c) => {
                const isSelected = selectedStar2 === c.id;
                const isUsedElsewhere = selectedStar1 === c.id || selectedStar3 === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    disabled={isUsedElsewhere}
                    onClick={() => setSelectedStar2(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground font-bold shadow-sm'
                        : isUsedElsewhere
                        ? 'opacity-40 border-border/30 bg-muted/10 cursor-not-allowed'
                        : 'border-border/70 hover:border-primary/50 bg-card'
                    }`}
                  >
                    <Avatar className="h-6 w-6 shrink-0 border">
                      <AvatarImage src={c.photoURL || undefined} />
                      <AvatarFallback className="text-[10px]">{c.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{formatName(c.name)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot 3: 3. Hvězda */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-muted text-muted-foreground">
                  <Star className="h-4 w-4 fill-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    3. Hvězda (1 bod)
                  </p>
                  <p className="text-[11px] text-muted-foreground">Třetí nejlepší výkon</p>
                </div>
              </div>
              {selectedStar3 && (
                <Badge variant="outline" className="text-[10px] border-border text-foreground">
                  Vybráno
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {eligibleCandidates.map((c) => {
                const isSelected = selectedStar3 === c.id;
                const isUsedElsewhere = selectedStar1 === c.id || selectedStar2 === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    disabled={isUsedElsewhere}
                    onClick={() => setSelectedStar3(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground font-bold shadow-sm'
                        : isUsedElsewhere
                        ? 'opacity-40 border-border/30 bg-muted/10 cursor-not-allowed'
                        : 'border-border/70 hover:border-primary/50 bg-card'
                    }`}
                  >
                    <Avatar className="h-6 w-6 shrink-0 border">
                      <AvatarImage src={c.photoURL || undefined} />
                      <AvatarFallback className="text-[10px]">{c.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{formatName(c.name)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs">
            Hlasovat později
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !selectedStar1 || !selectedStar2 || !selectedStar3}
            className="text-xs font-bold"
          >
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            Odeslat 3 hvězdy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
