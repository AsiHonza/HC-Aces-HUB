'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { registerSchema } from '@/lib/schemas';
import { authService } from '../services/authService';

export function RegisterForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [playerType, setPlayerType] = useState<'player' | 'goalie' | 'member'>('player');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth || !firestore) return;

    const formData = new FormData(e.currentTarget);
    const dataObj = {
      name: (formData.get('name') as string)?.trim(),
      email: (formData.get('email') as string)?.trim(),
      phoneNumber: (formData.get('phoneNumber') as string)?.trim(),
      jerseyNumber: (formData.get('jerseyNumber') as string)?.trim() || undefined,
      playerType,
      password: formData.get('password') as string,
    };

    const validated = registerSchema.safeParse(dataObj);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0]?.message || 'Zkontrolujte zadané údaje.';
      toast({
        variant: 'destructive',
        title: 'Chyba ve formuláři',
        description: firstIssue,
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.register(auth, firestore, {
        name: validated.data.name,
        email: validated.data.email,
        password: validated.data.password,
        phoneNumber: validated.data.phoneNumber,
        jerseyNumber: validated.data.jerseyNumber ? Number(validated.data.jerseyNumber) : null,
        playerType: validated.data.playerType,
      });

      router.push('/welcome');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při registraci',
        description: error.message || 'Nepodařilo se vytvořit účet.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Jméno a příjmení</Label>
        <Input id="name" name="name" required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" name="email" type="email" required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label>Pozice</Label>
        <Select
          name="playerType"
          value={playerType}
          onValueChange={(val: 'player' | 'goalie' | 'member') => setPlayerType(val)}
          disabled={isLoading}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Vyberte pozici" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="player">Hráč</SelectItem>
            <SelectItem value="goalie">Brankář</SelectItem>
            <SelectItem value="member">Člen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Telefon</Label>
        <Input id="phoneNumber" name="phoneNumber" required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="jerseyNumber">Číslo dresu</Label>
        <Input id="jerseyNumber" name="jerseyNumber" type="number" disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">Heslo</Label>
        <Input id="reg-password" name="password" type="password" required disabled={isLoading} />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Vytváření...
          </>
        ) : (
          'Vytvořit účet'
        )}
      </Button>
    </form>
  );
}
