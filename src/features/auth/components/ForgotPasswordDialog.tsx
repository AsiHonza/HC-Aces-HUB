'use client';

import React, { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { authService } from '../services/authService';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ isOpen, onOpenChange }: ForgotPasswordDialogProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !resetEmail.trim()) return;

    setIsResetLoading(true);
    try {
      await authService.sendPasswordReset(auth, resetEmail.trim());
      toast({
        title: 'Email odeslán',
        description: 'Zkontrolujte svou schránku pro odkaz na obnovení hesla.',
      });
      onOpenChange(false);
      setResetEmail('');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: e.message || 'Nepodařilo se odeslat obnovovací email.',
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zapomenuté heslo</DialogTitle>
          <DialogDescription>
            Zadejte svou e-mailovou adresu a my vám zašleme instrukce pro nastavení nového hesla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleReset}>
          <div className="grid gap-4 py-4">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              disabled={isResetLoading}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isResetLoading}>
              {isResetLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Odesílám...
                </>
              ) : (
                'Poslat odkaz'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
