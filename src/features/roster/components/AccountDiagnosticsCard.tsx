'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Loader2, ExternalLink } from 'lucide-react';

export interface AccountDiagnosticsCardProps {
  onPurgeByEmail: (email: string) => Promise<void>;
  isPurging?: boolean;
}

export function AccountDiagnosticsCard({
  onPurgeByEmail,
  isPurging = false,
}: AccountDiagnosticsCardProps) {
  const [purgeEmail, setPurgeEmail] = useState('');

  const handlePurge = async () => {
    if (!purgeEmail.trim()) return;
    await onPurgeByEmail(purgeEmail.trim());
    setPurgeEmail('');
  };

  return (
    <Card className="border-destructive/20 bg-destructive/5 shadow-inner">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          Diagnostika a opravy zaseknutých uživatelů
        </CardTitle>
        <CardDescription>
          Pokud má hráč <strong>problém s přihlášením</strong> nebo se <strong>nemůže registrovat</strong>, použijte tento postup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 bg-background/50 p-4 rounded-lg border border-destructive/10">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <span className="bg-destructive text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px]">
              1
            </span>
            KROK: Vyčištění databáze Firestore
          </h4>
          <p className="text-xs text-muted-foreground">
            Tento nástroj najde a smaže profil a statistiky v databázi pro zadaný e-mail.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="purgeEmail" className="sr-only">
                E-mail uživatele
              </Label>
              <Input
                id="purgeEmail"
                placeholder="Zadejte e-mail (např. hrac@seznam.cz)"
                value={purgeEmail}
                onChange={(e) => setPurgeEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={isPurging || !purgeEmail.trim()}
              className="h-9 shrink-0"
            >
              {isPurging ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Vyčistit Firestore
            </Button>
          </div>
        </div>

        <div className="grid gap-4 bg-background/50 p-4 rounded-lg border border-destructive/10">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <span className="bg-destructive text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px]">
              2
            </span>
            KROK: Smazání z Authentication (Povinné)
          </h4>
          <div className="text-xs space-y-2 text-muted-foreground">
            <p>
              Firebase odděluje přihlašovací údaje (Auth) a data profilu (Firestore). Pokud smažete pouze Firestore data, uživatel se stále nemůže znovu registrovat se stejným e-mailem.
            </p>
            <p className="font-bold text-foreground">Musíte provést smazání v administraci Firebase Console:</p>
            <ol className="list-decimal ml-4 space-y-1.5">
              <li>
                Otevřete{' '}
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                >
                  Firebase Console <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Přejděte do sekce <strong>Build -&gt; Authentication</strong></li>
              <li>V seznamu uživatelů (tabulka Users) vyhledejte daný e-mail</li>
              <li>Klikněte na nabídku akcí na konci řádku a zvolte <strong>Delete account</strong></li>
            </ol>
            <p className="mt-2 bg-muted/50 p-2.5 border border-border/60 rounded-md text-[11px]">
              <strong className="text-foreground">Doporučení:</strong> Pokud si hráč pouze nepamatuje heslo, použijte volbu{' '}
              <strong className="text-foreground">Resetovat heslo</strong> v tabulce výše místo kompletního mazání účtu.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
