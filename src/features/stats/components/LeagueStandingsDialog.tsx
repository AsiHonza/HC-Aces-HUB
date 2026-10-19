import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LeagueStanding } from '@/types';

export interface LeagueStandingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  standings?: LeagueStanding[];
  onSave: (standings: LeagueStanding[]) => Promise<void>;
  isSaving?: boolean;
}

export function LeagueStandingsDialog({
  isOpen,
  onOpenChange,
  standings = [],
  onSave,
  isSaving = false,
}: LeagueStandingsDialogProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const teams: LeagueStanding[] = [];
    const entries = Array.from(formData.entries());

    const teamGroups = new Map<number, Partial<LeagueStanding>>();
    entries.forEach(([key, value]) => {
      const match = key.match(/^(name|points|gf|ga|gp)-(\d+)$/);
      if (match) {
        const [, field, idx] = match;
        const index = parseInt(idx, 10);
        if (!teamGroups.has(index)) teamGroups.set(index, {});
        const group = teamGroups.get(index)!;
        if (field === 'name') group.name = value as string;
        else if (field === 'points') group.points = Number(value);
        else if (field === 'gf') group.gf = Number(value);
        else if (field === 'ga') group.ga = Number(value);
        else if (field === 'gp') group.gp = Number(value);
      }
    });

    teamGroups.forEach((group, idx) => {
      if (group.name) {
        teams.push({
          id: `team-${idx}`,
          name: group.name,
          points: group.points || 0,
          gf: group.gf || 0,
          ga: group.ga || 0,
          gp: group.gp || 0,
        });
      }
    });

    await onSave(teams);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upravit ligovou tabulku</DialogTitle>
          <DialogDescription>
            Aktualizujte statistiky týmů v lize.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-0"
              >
                <div className="col-span-1 text-center font-bold text-muted-foreground pb-2">
                  {i + 1}.
                </div>
                <div className="col-span-4 space-y-1">
                  <Label className="text-[9px] uppercase">Název týmu</Label>
                  <Input
                    name={`name-${i}`}
                    defaultValue={standings[i]?.name || ''}
                    placeholder="Tým"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[9px] uppercase font-bold">Z</Label>
                  <Input
                    name={`gp-${i}`}
                    type="number"
                    defaultValue={standings[i]?.gp || 0}
                    className="h-8 text-xs px-1"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <Label className="text-[9px] uppercase">GF</Label>
                  <Input
                    name={`gf-${i}`}
                    type="number"
                    defaultValue={standings[i]?.gf || 0}
                    className="h-8 text-xs px-1"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <Label className="text-[9px] uppercase">GA</Label>
                  <Input
                    name={`ga-${i}`}
                    type="number"
                    defaultValue={standings[i]?.ga || 0}
                    className="h-8 text-xs px-1"
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-[9px] uppercase font-bold text-primary">
                    Body
                  </Label>
                  <Input
                    name={`points-${i}`}
                    type="number"
                    defaultValue={standings[i]?.points || 0}
                    className="h-8 text-xs px-1 font-bold border-primary"
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={isSaving}>
              Uložit tabulku
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
