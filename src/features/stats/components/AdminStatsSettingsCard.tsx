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
import { BarChart3, Loader2, DatabaseBackup, History, Download, ShieldCheck, CheckCircle2, Users } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collectionGroup, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { statsService } from '../services/statsService';
import { historicalStatsBackupService } from '../services/historicalStatsBackupService';
import type { AppSettings, SkaterStats, GoalieStats, UserProfile } from '@/types';

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

  const allUsersRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: allUsers, isLoading: allUsersLoading } = useCollection<UserProfile>(allUsersRef);

  const snapshotDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'historicalStatsSnapshot') : null),
    [firestore]
  );
  const { data: snapshotInfo, isLoading: snapshotLoading } = useDoc<any>(snapshotDocRef);

  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleRestoreSnapshot = async () => {
    if (!firestore) return;
    setIsRestoring(true);
    try {
      const result = await historicalStatsBackupService.applySnapshot(firestore, allUsers);
      if (!result.success && result.errors?.length) {
        throw new Error(result.errors.join(', '));
      }
      toast({
        title: 'Snapshot historie byl úspěšně aplikován',
        description: `Aktualizováno ${result.skatersUpdated} hráčů v poli a ${result.goaliesUpdated} brankářů (přeskočeno ${result.skippedUnregisteredCount} neregistrovaných).`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při obnově snapshotu',
        description: err.message,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const json = await historicalStatsBackupService.exportCurrentStatsBackup(
        allUsers || [],
        allSkaterStats || [],
        allGoalieStats || []
      );
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aces-stats-backup-${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Záloha stažena',
        description: 'Kompletní záložní JSON soubor byl úspěšně uložen do vašeho počítače.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při exportu zálohy',
        description: err.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (leagueSettingsLoading || allSkaterStatsLoading || allGoalieStatsLoading || allUsersLoading) {
    return (
      <Card className="border-border/60 bg-card/95 p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary h-6 w-6 mr-2" />
        <span className="text-sm text-muted-foreground">Načítání administrace statistik...</span>
      </Card>
    );
  }

  // Datum poslední aplikace snapshotu
  let lastRestoredText = 'Zatím neaplikováno v této relaci';
  if (snapshotInfo?.appliedAt) {
    try {
      const date = typeof snapshotInfo.appliedAt?.toDate === 'function'
        ? snapshotInfo.appliedAt.toDate()
        : new Date(snapshotInfo.appliedAt.seconds ? snapshotInfo.appliedAt.seconds * 1000 : snapshotInfo.appliedAt);
      lastRestoredText = format(date, 'd. M. yyyy, HH:mm:ss', { locale: cs });
    } catch (e) {
      // fallback
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Karta Historických statistik a zálohy (Golden Snapshot) */}
      <Card className="border-border/60 bg-card/95 shadow-sm border-l-4 border-l-amber-500">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DatabaseBackup className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-xl">Oficiální snapshot historických statistik</CardTitle>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Stav k 14. 4. 2026
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Neměnná referenční záloha statistik HC Aces před zahájením sezóny 2026/2027. Chrání data před ztrátou při synchronizacích ligy.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="shrink-0 text-xs"
            >
              {isExporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
              Stáhnout zálohu (JSON)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Hráči v poli (snapshot)
              </span>
              <p className="text-lg font-bold">37 hráčů</p>
              <p className="text-[11px] text-muted-foreground">Krejčí (131 b.), Řezáč (68 b.), Konečný T. (67 b.), Bzduch (65 b.), Tzimas (63 b.)...</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Brankáři (snapshot)
              </span>
              <p className="text-lg font-bold">6 brankářů</p>
              <p className="text-[11px] text-muted-foreground">Štěpán (88 Z, 86.6 %), Lacko (31 Z, 91.5 %), Bara (5 Z), Divácký, Malec, Konečný M.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-primary" /> Týmová bilance (před 2026/27)
              </span>
              <p className="text-lg font-bold">136 zápasů</p>
              <p className="text-[11px] text-muted-foreground">85 V - 41 P - 10 R • 455 vstřeleno / 354 inkasováno (ZČ: 97 Z, PO: 39 Z)</p>
            </div>
          </div>

          <div className="rounded-lg border p-3 bg-amber-500/5 border-amber-500/20 text-xs space-y-1 text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              <span>Automatické dopočítávání celkové kariéry</span>
            </div>
            <p>
              Aplikace zobrazuje kariéru jako součet: <strong>Historický snapshot (do 14. 4. 2026) + Aktuální sezóna 2026/27 + Případné Play-off</strong>.
              Synchronizace z oficiálního ligového webu aktualizuje pouze aktuální sezónu a historický snapshot nikdy nepřepisuje ani neničí.
            </p>
            {snapshotInfo?.appliedAt && (
              <p className="pt-1 text-[11px] text-foreground font-medium">
                Poslední aplikace snapshotu do databáze: <span className="underline">{lastRestoredText}</span>
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t border-border/60 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-sm">Obnovení dat ze snapshotu</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pokud by došlo k poškození historických statistik, tímto tlačítkem je kdykoliv obnovíte zpět do stavu z 14. 4. 2026.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" size="sm" disabled={isRestoring} className="shrink-0 font-semibold bg-amber-600 hover:bg-amber-700 text-white">
                {isRestoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <History className="mr-2 h-4 w-4" />
                Obnovit historické statistiky ze snapshotu
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Aplikovat oficiální historický snapshot?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-sm">
                  <p>
                    Všem 37 hráčům a 6 brankářům budou do podkolekcí statistik nastaveny historické hodnoty přesně odpovídající oficiálnímu ligovému stavu k <strong>14. dubnu 2026</strong>.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Statistiky letošní sezóny (2026/2027) zůstanou zachovány a v tabulkách se k historii automaticky přičtou.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRestoreSnapshot}
                  className="bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                >
                  Ano, aplikovat snapshot
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      {/* 2. Karta Správa běžných statistik a play-off */}
      <Card className="border-border/60 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5 text-primary" />
            Správa statistik a režim sezóny
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
    </div>
  );
}
