'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { BarChart3, Loader2, DatabaseBackup, History, Download, ShieldCheck, CheckCircle2, Users, Calendar, Trophy } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collectionGroup, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { statsService } from '../services/statsService';
import { historicalStatsBackupService } from '../services/historicalStatsBackupService';
import { ArchiveSeasonDialog, type ArchiveSeasonData } from './ArchiveSeasonDialog';
import type { AppSettings, SkaterStats, GoalieStats, UserProfile, Match } from '@/types';

export function AdminStatsSettingsCard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

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

  const allMatchesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'matches') : null),
    [firestore]
  );
  const { data: allMatches } = useCollection<Match>(allMatchesRef);

  const snapshotDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'historicalStatsSnapshot') : null),
    [firestore]
  );
  const { data: snapshotInfo, isLoading: snapshotLoading } = useDoc<any>(snapshotDocRef);

  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleArchiveSeason = async (data: ArchiveSeasonData) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const usersMap = new Map((allUsers || []).map((u) => [u.id, u]));
      await statsService.archiveSeason({
        firestore,
        seasonName: data.seasonName,
        year: data.year,
        teamCount: data.teamCount,
        leagueSettings,
        allSkaterStats,
        allGoalieStats,
        allMatches,
        usersMap,
      });
      toast({
        title: 'Sezóna byla úspěšně archivována',
        description: `Ročník ${data.year} (${data.seasonName}) byl uložen do archivu a nová sezóna zahájena.`,
      });
      setIsArchiveDialogOpen(false);
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
        description: 'JSON soubor s kompletními historickými a sezónními statistikami byl uložen do vašeho zařízení.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba exportu zálohy',
        description: err.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatSnapshotDate = (isoOrTs: any) => {
    if (!isoOrTs) return 'Neznámé datum';
    try {
      const d = typeof isoOrTs.toDate === 'function' ? isoOrTs.toDate() : new Date(isoOrTs);
      return format(d, 'd. MMMM yyyy HH:mm', { locale: cs });
    } catch {
      return String(isoOrTs);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Golden Historical Snapshot & Backups Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Zlatý snapshot historických statistik (2020–2025)
              </CardTitle>
              <CardDescription>
                Neměnné historické body a zápasy hráčů Aces před spuštěním aktuální aplikace.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Chráněno
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Zdrojový soubor:</span>
                <span className="font-mono font-medium">historical-stats-snapshot.json</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Původní datum snapshotu:</span>
                <span className="font-medium">
                  {snapshotInfo?.capturedAt ? formatSnapshotDate(snapshotInfo.capturedAt) : '15. října 2026'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Poslední aplikace v DB:</span>
                <span className="font-medium">
                  {snapshotInfo?.appliedAt ? formatSnapshotDate(snapshotInfo.appliedAt) : 'Zatím neaplikováno'}
                </span>
              </div>
            </div>

            <div className="border-t border-border/40 pt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Snapshot obsahuje baseline pro <strong>24 hráčů v poli</strong> a <strong>3 brankáře</strong>.</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/60 px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/10">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="text-xs"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />}
            Exportovat aktuální stav DB (JSON)
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                disabled={isRestoring}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
              >
                {isRestoring ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <DatabaseBackup className="h-3.5 w-3.5 mr-1.5" />}
                Obnovit / sjednotit zlatý snapshot
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <DatabaseBackup className="h-5 w-5 text-emerald-500" />
                  Obnovit zlatý snapshot historických statistik?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-sm">
                  <p>
                    Tato akce přepíše pole <code>historical*</code> (góly, asistence, zápasy) u všech registrovaných hráčů Aces podle oficiálního snapshotu.
                  </p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Body z aktuální sezóny (2025/2026) zůstanou nedotčeny a scraper je nepřepíše.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRestoreSnapshot}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Ano, aplikovat snapshot
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      {/* 2. Season Lifecycle Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Správa sezóny a archivace
          </CardTitle>
          <CardDescription>
            Informace o probíhající sezóně a možnost jejího řádného uzavření a archivace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg border border-border/60 bg-muted/20 text-xs">
            <div>
              <span className="text-muted-foreground block">Aktuální sezóna:</span>
              <span className="font-semibold text-sm text-foreground">
                {leagueSettings?.currentSeasonName || 'Aces Cup 2025/2026'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Identifikátor ročníku:</span>
              <span className="font-mono font-medium text-foreground">
                {leagueSettings?.currentSeasonId || '2025-2026'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Začátek sezóny:</span>
              <span className="font-medium text-foreground">
                {leagueSettings?.seasonStartDate || '2026-09-01'}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/60 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-sm">Archivovat a ukončit sezónu</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uloží kompletní snapshot ročníku do archivu, přičte sezónní body do historie hráčů a zahájí nový ročník.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={isSaving}
            onClick={() => setIsArchiveDialogOpen(true)}
            className="shrink-0 font-semibold"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <History className="h-3.5 w-3.5 mr-1.5" />
            Ukončit a archivovat sezónu
          </Button>
        </CardFooter>
      </Card>

      <ArchiveSeasonDialog
        isOpen={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        onArchive={handleArchiveSeason}
        isSaving={isSaving}
      />
    </div>
  );
}
