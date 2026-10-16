'use client';

import React from 'react';
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
import type { UserProfile } from '@/types';
import type { UpdateUserData } from '../services/rosterService';

export interface EditPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSave: (data: UpdateUserData) => Promise<void>;
  isSaving?: boolean;
}

export function EditPlayerDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isSaving = false,
}: EditPlayerDialogProps) {
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string)?.trim();
    const phoneNumber = (fd.get('phoneNumber') as string)?.trim() || null;
    const jerseyStr = fd.get('jerseyNumber') as string;
    const jerseyNumber = jerseyStr ? Number(jerseyStr) : null;
    const dob = (fd.get('dob') as string) || null;
    const playerType = (fd.get('playerType') as any) || user.playerType;

    await onSave({
      name,
      phoneNumber,
      jerseyNumber,
      dob,
      playerType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upravit profil hráče</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Jméno a příjmení</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={user.name}
              required
              placeholder="Např. Jan Novák"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Telefon</Label>
              <Input
                id="edit-phone"
                name="phoneNumber"
                defaultValue={user.phoneNumber ?? ''}
                placeholder="+420..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-jersey">Číslo dresu</Label>
              <Input
                id="edit-jersey"
                name="jerseyNumber"
                type="number"
                min="0"
                max="99"
                defaultValue={user.jerseyNumber ?? ''}
                placeholder="Např. 68"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-player-type">Pozice</Label>
            <Select name="playerType" defaultValue={user.playerType}>
              <SelectTrigger id="edit-player-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Hráč v poli</SelectItem>
                <SelectItem value="goalie">Brankář</SelectItem>
                <SelectItem value="member">Člen týmu / nehrající</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-dob">Datum narození</Label>
            <Input
              id="edit-dob"
              name="dob"
              type="date"
              defaultValue={user.dob ?? ''}
            />
          </div>

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
                'Uložit změny'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
