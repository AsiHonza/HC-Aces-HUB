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
import { Loader2, ShieldAlert } from 'lucide-react';
import type { CreateUserData } from '../services/rosterService';

export interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateUserData) => Promise<void>;
  isSaving?: boolean;
}

export function AddPlayerDialog({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: AddPlayerDialogProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string)?.trim();
    const playerType = fd.get('playerType') as any;
    const jerseyStr = fd.get('jerseyNumber') as string;
    const jerseyNumber = jerseyStr ? Number(jerseyStr) : null;

    await onSave({
      name,
      playerType: playerType || 'player',
      jerseyNumber,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nový účet hráče</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="add-name">Celé jméno a příjmení</Label>
            <Input
              id="add-name"
              name="name"
              placeholder="Např. Tomáš Dvořák"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="add-player-type">Pozice</Label>
              <Select name="playerType" defaultValue="player">
                <SelectTrigger id="add-player-type">
                  <SelectValue placeholder="Vyberte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Hráč v poli</SelectItem>
                  <SelectItem value="goalie">Brankář</SelectItem>
                  <SelectItem value="member">Člen týmu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-jersey">Číslo dresu</Label>
              <Input
                id="add-jersey"
                name="jerseyNumber"
                type="number"
                min="0"
                max="99"
                placeholder="Např. 88"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              Výchozí přihlašovací údaje
            </div>
            <p>
              Systém hráči automaticky vygeneruje systémový e-mail a dočasné heslo{' '}
              <strong className="text-foreground">Aces123456!</strong>. Hráč si jej může kdykoliv změnit ve svém profilu.
            </p>
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
                  Vytvářím...
                </>
              ) : (
                'Vytvořit účet'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
