'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { toJsDate } from '@/lib/dates';
import type { Match } from '@/types';
import type { MatchFormData } from '../services/matchesService';

export interface MatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match?: Match | null;
  defaultDate?: Date;
  onSave: (data: MatchFormData) => Promise<void>;
  isSaving?: boolean;
}

export function MatchFormDialog({
  open,
  onOpenChange,
  match,
  defaultDate,
  onSave,
  isSaving = false,
}: MatchFormDialogProps) {
  const isEditing = Boolean(match);

  const [matchType, setMatchType] = useState<'regular' | 'playoff' | 'friendly'>('regular');
  const [playoffStage, setPlayoffStage] = useState<'čtvrtfinále' | 'semifinále' | 'finále'>('čtvrtfinále');

  useEffect(() => {
    if (match) {
      setMatchType(match.type || 'regular');
      if (match.playoffStage) {
        setPlayoffStage(match.playoffStage as any);
      }
    } else {
      setMatchType('regular');
      setPlayoffStage('čtvrtfinále');
    }
  }, [match, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dateStr = fd.get('date') as string;
    const timeStr = fd.get('time') as string;
    const opponent = (fd.get('opponent') as string)?.trim();
    const location = (fd.get('location') as string)?.trim();

    const dt = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());

    const data: MatchFormData = {
      opponent,
      location,
      dateTime: dt,
      type: matchType,
    };

    if (matchType === 'regular') {
      const roundVal = Number(fd.get('round'));
      data.round = roundVal > 0 ? roundVal : null;
    } else if (matchType === 'playoff') {
      data.playoffStage = playoffStage;
      const matchNumVal = Number(fd.get('playoffMatchNumber'));
      data.playoffMatchNumber = matchNumVal > 0 ? matchNumVal : null;
    }

    await onSave(data);
  };

  const initialDate = match?.dateTime
    ? format(toJsDate(match.dateTime), 'yyyy-MM-dd')
    : defaultDate
    ? format(defaultDate, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  const initialTime = match?.dateTime
    ? format(toJsDate(match.dateTime), 'HH:mm')
    : '18:00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Upravit zápas' : 'Přidat zápas'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="match-opponent">Soupeř</Label>
            <Input
              id="match-opponent"
              name="opponent"
              defaultValue={match?.team2 || ''}
              placeholder="Např. HC Draci"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="match-date">Datum</Label>
              <Input
                id="match-date"
                name="date"
                type="date"
                defaultValue={initialDate}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="match-time">Čas</Label>
              <Input
                id="match-time"
                name="time"
                type="time"
                defaultValue={initialTime}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="match-location">Místo</Label>
            <Input
              id="match-location"
              name="location"
              defaultValue={match?.location || ''}
              placeholder="Např. Komerční Banka Aréna"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="match-type">Typ soutěže</Label>
            <Select
              value={matchType}
              onValueChange={(val) => setMatchType(val as any)}
            >
              <SelectTrigger id="match-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Základní část</SelectItem>
                <SelectItem value="playoff">Play-off</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {matchType === 'regular' && (
            <div className="grid gap-2">
              <Label htmlFor="match-round">Kolo (volitelné)</Label>
              <Input
                id="match-round"
                name="round"
                type="number"
                min="1"
                defaultValue={match?.round || ''}
                placeholder="Číslo kola"
              />
            </div>
          )}

          {matchType === 'playoff' && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="grid gap-2">
                <Label htmlFor="match-playoff-stage">Fáze</Label>
                <Select
                  value={playoffStage}
                  onValueChange={(val) => setPlayoffStage(val as any)}
                >
                  <SelectTrigger id="match-playoff-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="čtvrtfinále">Čtvrtfinále</SelectItem>
                    <SelectItem value="semifinále">Semifinále</SelectItem>
                    <SelectItem value="finále">Finále</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="match-playoff-number">Zápas č.</Label>
                <Input
                  id="match-playoff-number"
                  name="playoffMatchNumber"
                  type="number"
                  min="1"
                  defaultValue={match?.playoffMatchNumber || ''}
                  placeholder="Pořadí v sérii"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ukládám...
                </>
              ) : (
                'Uložit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
