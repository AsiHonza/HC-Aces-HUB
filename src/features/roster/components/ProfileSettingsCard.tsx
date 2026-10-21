'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { rosterService } from '../services/rosterService';
import type { UserProfile } from '@/types';

export interface ProfileSettingsCardProps {
  userProfile: UserProfile | null;
}

export function ProfileSettingsCard({ userProfile }: ProfileSettingsCardProps) {
  const { toast } = useToast();
  const { user, auth, firestore, storage } = useFirebase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fallback = userProfile?.name
    ? userProfile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage || !firestore) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Chyba formátu',
        description: 'Prosím, vyberte platný obrázek (JPEG, PNG apod.).',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Obrázek je příliš velký',
        description: 'Maximální povolená velikost profilové fotky je 2 MB.',
      });
      return;
    }

    setIsUploading(true);
    try {
      await rosterService.uploadAvatar(storage, firestore, user.uid, file);
      toast({
        title: 'Profilová fotka nahrána',
        description: 'Váš nový portrét byl úspěšně uložen.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při nahrávání',
        description: error.message || 'Nepodařilo se nahrát profilovou fotku.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !firestore || !auth) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string)?.trim();
    const phoneNumber = (formData.get('phoneNumber') as string)?.trim() || null;
    const jerseyStr = formData.get('jerseyNumber') as string;
    const jerseyNumber = jerseyStr ? Number(jerseyStr) : null;
    const dob = (formData.get('dob') as string) || null;
    const rawFieldPos = formData.get('fieldPosition') as string;
    const fieldPosition =
      userProfile?.playerType === 'player' && rawFieldPos && rawFieldPos !== 'auto'
        ? (rawFieldPos as 'defense' | 'wing' | 'center')
        : rawFieldPos === 'auto'
        ? null
        : userProfile?.fieldPosition ?? undefined;
    const positionLocked =
      userProfile?.playerType === 'player' && rawFieldPos
        ? rawFieldPos !== 'auto'
        : undefined;

    try {
      await rosterService.updateProfileWithAuth(auth, firestore, user.uid, {
        name,
        phoneNumber,
        jerseyNumber,
        dob,
        fieldPosition,
        positionLocked,
      });

      toast({
        title: 'Profil aktualizován',
        description: 'Vaše osobní údaje byly úspěšně uloženy.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba aktualizace',
        description: error.message || 'Nepodařilo se uložit změny profilu.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="h-5 w-5 text-primary" />
          Nastavení profilu
        </CardTitle>
        <CardDescription>
          Zde můžete upravit své osobní údaje a profilovou fotku.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleUpdate}>
        <CardContent className="grid gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary shadow-xl">
                <AvatarImage
                  src={userProfile?.photoURL ?? `https://picsum.photos/seed/${userProfile?.email}/400/400`}
                  alt={userProfile?.name || ''}
                  data-ai-hint="player portrait"
                />
                <AvatarFallback className="text-4xl font-bold bg-muted">{fallback}</AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-full backdrop-blur-sm">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="space-y-3 text-center sm:text-left">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="border-primary/40 text-foreground hover:bg-primary/10"
              >
                <Camera className="mr-2 h-4 w-4 text-primary" />
                {isUploading ? 'Nahrávání...' : 'Změnit fotku'}
              </Button>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                Doporučujeme čtvercový formát portrétu, maximálně 2 MB.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Jméno a příjmení</Label>
              <Input
                id="name"
                name="name"
                defaultValue={userProfile?.name || ''}
                required
                placeholder="Např. Tomáš Dvořák"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                defaultValue={userProfile?.email || ''}
                disabled
                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Telefonní číslo</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                defaultValue={userProfile?.phoneNumber || ''}
                placeholder="+420..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="jerseyNumber">Číslo dresu</Label>
              <Input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                min="0"
                max="99"
                defaultValue={userProfile?.jerseyNumber ?? ''}
                placeholder="Např. 88"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dob">Datum narození</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                defaultValue={userProfile?.dob || ''}
              />
            </div>

            {userProfile?.playerType === 'player' && (
              <div className="grid gap-2">
                <Label htmlFor="fieldPosition">Primární post na ledě</Label>
                <Select
                  name="fieldPosition"
                  defaultValue={userProfile?.fieldPosition || 'auto'}
                >
                  <SelectTrigger id="fieldPosition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automaticky (podle sestavy)</SelectItem>
                    <SelectItem value="defense">Obránce (LO / PO)</SelectItem>
                    <SelectItem value="center">Centr (C)</SelectItem>
                    <SelectItem value="wing">Křídlo (LK / PK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/60 px-6 py-4 flex justify-end">
          <Button type="submit" disabled={isUploading || isSaving} className="w-full sm:w-auto font-semibold">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Ukládám...' : 'Uložit změny'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
