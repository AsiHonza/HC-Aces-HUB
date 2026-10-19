import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { formatName, isGoaliePlayer } from '@/lib/utils';
import { getMatchDetails, MatchLike } from '../utils/match-details';
import type { RecordResultData } from '../services/matchesService';
import type { UserProfile } from '@/types';

export interface MatchForResultDialog extends MatchLike {
  id: string;
  team1Score?: number | null;
  team2Score?: number | null;
  goalieId?: string | null;
  goalieSaves?: number | null;
  goalieShotsAgainst?: number | null;
  scorers?: { goal: string; assist: string | null }[] | null;
}

export interface MatchResultFormFieldsProps {
  match?: Partial<MatchForResultDialog> | null;
  allUsers: UserProfile[];
  onGoalCountChange?: (count: number) => void;
}

export function MatchResultFormFields({
  match,
  allUsers,
  onGoalCountChange,
}: MatchResultFormFieldsProps) {
  const [goalCount, setGoalCount] = useState<number>(match?.team1Score || 0);

  useEffect(() => {
    if (match) {
      setGoalCount(match.team1Score || 0);
    }
  }, [match]);

  const skaters = useMemo(
    () => allUsers.filter((u) => u.playerType === 'player' && !isGoaliePlayer(u)),
    [allUsers]
  );
  const goalies = useMemo(
    () => allUsers.filter((u) => u.playerType === 'goalie' || isGoaliePlayer(u)),
    [allUsers]
  );

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 0;
    setGoalCount(val);
    if (onGoalCountChange) {
      onGoalCountChange(val);
    }
  };

  return (
    <div className="grid gap-4 p-1">
      {/* Score inputs */}
      <div className="grid grid-cols-2 items-center gap-4">
        <div className="grid gap-2 text-center">
          <Label htmlFor="team1Score">Aces</Label>
          <Input
            id="team1Score"
            name="team1Score"
            type="number"
            className="text-center text-2xl font-bold h-16"
            min="0"
            required
            defaultValue={match?.team1Score ?? 0}
            onChange={handleScoreChange}
          />
        </div>
        <div className="grid gap-2 text-center">
          <Label htmlFor="team2Score">Soupeř</Label>
          <Input
            id="team2Score"
            name="team2Score"
            type="number"
            className="text-center text-2xl font-bold h-16"
            min="0"
            required
            defaultValue={match?.team2Score ?? 0}
          />
        </div>
      </div>

      {/* Goalie section */}
      <div className="grid gap-4 border p-4 rounded-lg bg-muted/20">
        <p className="font-bold text-sm uppercase tracking-wider text-primary">
          Statistiky brankáře
        </p>
        <div className="grid gap-2">
          <Label>Brankář</Label>
          <Select
            name="goalieId"
            defaultValue={match?.goalieId || 'none'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vyberte brankáře" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Žádný</SelectItem>
              {goalies.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {formatName(u.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Zásahy</Label>
            <Input
              name="goalieSaves"
              type="number"
              min="0"
              defaultValue={match?.goalieSaves || 0}
            />
          </div>
          <div className="grid gap-2">
            <Label>Střely proti</Label>
            <Input
              name="goalieShotsAgainst"
              type="number"
              min="0"
              defaultValue={match?.goalieShotsAgainst || 0}
            />
          </div>
        </div>
      </div>

      {/* Scorers & Assists */}
      {goalCount > 0 && (
        <p className="font-medium mt-2 text-sm">
          Střelci a asistence (Aces)
        </p>
      )}
      <div className="grid gap-3">
        {Array.from({ length: goalCount }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-2 gap-2 items-center"
          >
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Střelec
              </Label>
              <Select
                name={`goal-${index}`}
                defaultValue={match?.scorers?.[index]?.goal}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte hráče" />
                </SelectTrigger>
                <SelectContent>
                  {skaters.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {formatName(u.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Asistence
              </Label>
              <Select
                name={`assist-${index}`}
                defaultValue={
                  match?.scorers?.[index]?.assist || 'none'
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Asistence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Žádná</SelectItem>
                  {skaters.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {formatName(u.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface RecordResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchForResultDialog | null;
  allUsers: UserProfile[];
  onSave: (resultData: RecordResultData) => Promise<void>;
  isSaving?: boolean;
}

export function RecordResultDialog({
  open,
  onOpenChange,
  match,
  allUsers,
  onSave,
  isSaving = false,
}: RecordResultDialogProps) {
  if (!match) return null;

  const { prefix, opponent } = getMatchDetails(match);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const t1Score = parseInt(fd.get('team1Score') as string, 10) || 0;
    const t2Score = parseInt(fd.get('team2Score') as string, 10) || 0;
    const goalieId = fd.get('goalieId') as string;
    const goalieSaves = parseInt(fd.get('goalieSaves') as string, 10) || 0;
    const goalieShotsAgainst =
      parseInt(fd.get('goalieShotsAgainst') as string, 10) || 0;

    const scorers: { goal: string; assist: string | null }[] = [];
    for (let i = 0; i < t1Score; i++) {
      const goal = fd.get(`goal-${i}`) as string;
      const assist = fd.get(`assist-${i}`) as string;
      if (goal) {
        scorers.push({
          goal,
          assist: assist && assist !== 'none' ? assist : null,
        });
      }
    }

    await onSave({
      team1Score: t1Score,
      team2Score: t2Score,
      goalieId: goalieId !== 'none' ? goalieId : null,
      goalieSaves,
      goalieShotsAgainst,
      scorers,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Zapsat výsledek zápasu</DialogTitle>
            <DialogDescription>
              Zadejte konečné skóre a detaily zápasu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
            <div className="text-center">
              {prefix && (
                <p className="text-xs font-bold text-primary uppercase mb-1">
                  {prefix}
                </p>
              )}
              <p className="font-bold text-lg">{opponent}</p>
            </div>

            <MatchResultFormFields match={match} allUsers={allUsers} />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložit výsledek
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
