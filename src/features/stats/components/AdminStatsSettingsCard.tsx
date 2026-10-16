'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BarChart3, Loader2 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { statsService } from '../services/statsService';
import type { AppSettings, SkaterStats, GoalieStats } from '@/types';

export function AdminStatsSettingsCard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const leagueSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'league') : null),
    [firestore]
  );
  const { data: leagueSettings, isLoading: leagueSettingsLoading } = useDoc<AppSettings>(leagueSettingsRef);

  const allSkaterStatsRef = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'skaterStats') : null),
    [firestore]
  );
  const { data: allSkaterStats, isLoading: allSkaterStatsLoading } = useCollection<SkaterStats>(allSkaterStatsRef);

  const allGoalieStatsRef = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'goalieStats') : null),
    [firestore]
  );
  const { data: allGoalieStats, isLoading: allGoalieStatsLoading } = useCollection<GoalieStats>(allGoalieStatsRef);

  const handleTogglePlayoffScoringMode = async (checked: boolean) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await statsService.togglePlayoffScoringMode(firestore, checked, allSkaterStats, allGoalieStats);
      toast({ title: `Režim statistik play-off byl ${checked ? 'zapnut' : 'vypnut'}.` });
      if (!checked) {
        toast({ description: 'Statistiky play-off byly vynulovány.' });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba nastavení',
        description: `Nepodařilo se změnit režim: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveSeason = async () => {
    if (!firestore || !allSkaterStats || !allGoalieStats) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Data statistik nejsou načtena.' });
      return;
    }

    setIsSaving(true);
    try {
      await statsService.archiveSeasonDirect(firestore, allSkaterStats, allGoalieStats);
      toast({
        title: 'Sezóna byla úspěšně archivována',
        description: 'Statistiky byly přičteny do historie a nová sezóna může začít.',
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chyba archivace', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (leagueSettingsLoading || allSkaterStatsLoading || allGoalieStatsLoading) {
    return (
      <Card className="border-border/60 bg-card/95 p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary h-6 w-6 mr-2" />
        <span className="text-sm text-muted-foreground">Načítání administrace statistik...</span>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BarChart3 className="h-5 w-5 text-primary" />
          Správa statistik
        </CardTitle>
        <CardDescription>
          Spravujte režim sčítání statistik a archivaci odehraných sezón.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-4 bg-muted/20">
          <div className="space-y-0.5 pr-4">
            <Label htmlFor="playoff-scoring-mode" className="text-sm font-semibold cursor-pointer">
              Režim statistik Play-off
            </Label>
            <p className="text-xs text-muted-foreground">
              Přepne sčítání gólů, asistencí a zákroků do odděleného režimu pro vyřazovací boje.
            </p>
          </div>
          <Switch
            id="playoff-scoring-mode"
            checked={leagueSettings?.isScoringInPlayoffMode ?? false}
            onCheckedChange={handleTogglePlayoffScoringMode}
            disabled={isSaving}
          />
        </div>
      </CardContent>
      <CardFooter className="border-t border-border/60 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-sm">Archivovat sezónu</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sečte body aktuální sezóny i play-off do celkové historie a vynuluje ročník. Tato operace je nevratná.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isSaving} className="shrink-0 font-semibold">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archivovat a zahájit novou sezónu
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Opravdu chcete archivovat sezónu?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-sm">
                <p>
                  Statistiky aktuální sezóny a play-off budou přičteny k historickým statistikám a poté vynulovány.
                </p>
                <p className="font-semibold text-destructive">
                  Tuto akci nelze vrátit zpět.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchiveSeason}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Ano, archivovat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
