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

export interface ArchiveSeasonData {
  seasonName: string;
  year: string;
  teamCount: number;
}

export interface ArchiveSeasonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: (data: ArchiveSeasonData) => Promise<void>;
  isSaving?: boolean;
}

export function ArchiveSeasonDialog({
  isOpen,
  onOpenChange,
  onArchive,
  isSaving = false,
}: ArchiveSeasonDialogProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const seasonName = (formData.get('seasonName') as string) || '';
    const year = (formData.get('year') as string) || '';
    const teamCount = Number(formData.get('teamCount')) || 0;

    await onArchive({ seasonName, year, teamCount });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ukončit a archivovat sezónu</DialogTitle>
          <DialogDescription>
            Aktuální stav ligy a play-off bude uložen do archivu a statistiky
            hráčů budou resetovány pro novou sezónu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 p-1">
            <div className="grid gap-2">
              <Label>Název nové sezóny</Label>
              <Input
                name="seasonName"
                placeholder="Např. Aces Cup 2025"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Rok / Ročník</Label>
                <Input
                  name="year"
                  placeholder="2024/2025"
                  defaultValue={`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Počet týmů</Label>
                <Input name="teamCount" type="number" defaultValue="10" required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button type="submit" variant="destructive" disabled={isSaving}>
              Ukončit a zahájit novou
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
