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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlayoffSeries } from '@/types';

export interface PlayoffSeriesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  series?: PlayoffSeries[];
  onSave: (series: PlayoffSeries[]) => Promise<void>;
  isSaving?: boolean;
}

export function PlayoffSeriesDialog({
  isOpen,
  onOpenChange,
  series = [],
  onSave,
  isSaving = false,
}: PlayoffSeriesDialogProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const resultSeries: PlayoffSeries[] = [];
    const entries = Array.from(formData.entries());

    const seriesGroups = new Map<number, Partial<PlayoffSeries>>();
    entries.forEach(([key, value]) => {
      const match = key.match(/^(round|opponent|wins|losses)-(\d+)$/);
      if (match) {
        const [, field, idx] = match;
        const index = parseInt(idx, 10);
        if (!seriesGroups.has(index)) seriesGroups.set(index, {});
        const group = seriesGroups.get(index)!;
        if (field === 'round') group.round = value as any;
        else if (field === 'opponent') group.opponent = value as string;
        else if (field === 'wins') group.wins = Number(value);
        else if (field === 'losses') group.losses = Number(value);
      }
    });

    seriesGroups.forEach((group) => {
      if (group.opponent && group.round) {
        resultSeries.push({
          round: group.round as any,
          opponent: group.opponent,
          wins: group.wins || 0,
          losses: group.losses || 0,
        });
      }
    });

    await onSave(resultSeries);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upravit play-off série</DialogTitle>
          <DialogDescription>
            Nastavte aktuální soupeře a stavy sérií.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="grid gap-4 p-4 border rounded-lg bg-muted/20"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Fáze</Label>
                    <Select
                      name={`round-${i}`}
                      defaultValue={series[i]?.round || 'Čtvrtfinále'}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Čtvrtfinále">Čtvrtfinále</SelectItem>
                        <SelectItem value="Semifinále">Semifinále</SelectItem>
                        <SelectItem value="Finále">Finále</SelectItem>
                        <SelectItem value="Vítěz">Vítěz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Soupeř</Label>
                    <Input
                      name={`opponent-${i}`}
                      defaultValue={series[i]?.opponent || ''}
                      placeholder="Název týmu"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Výhry Aces</Label>
                    <Input
                      name={`wins-${i}`}
                      type="number"
                      min="0"
                      defaultValue={series[i]?.wins || 0}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Prohry Aces</Label>
                    <Input
                      name={`losses-${i}`}
                      type="number"
                      min="0"
                      defaultValue={series[i]?.losses || 0}
                      className="h-8 text-xs"
                    />
                  </div>
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
              Uložit série
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
