'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types';

export interface DeletePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onConfirm: () => Promise<void>;
  isSaving?: boolean;
}

export function DeletePlayerDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isSaving = false,
}: DeletePlayerDialogProps) {
  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat uživatele {user.name} z databáze?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-sm">
            <p>
              Tato akce trvale smaže profil hráče a jeho individuální záznamy statistik ze systému Firestore.
            </p>
            <p className="font-semibold text-destructive">
              Pozor: Uživatelský účet v sekci Authentication zůstane zachován. Pokud se hráč bude chtít znovu registrovat se stejným e-mailem, je nutné účet odstranit i v konzoli Firebase.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isSaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mažu...
              </>
            ) : (
              'Smazat profil z DB'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
