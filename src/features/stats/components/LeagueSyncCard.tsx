'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, ExternalLink, Clock, Trophy, Users, Shield } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

import { syncLeagueToFirestore } from '@/lib/sync/league-sync';

interface LeagueSettings {
  lastSyncAt?: { toDate: () => Date } | { seconds: number; nanoseconds: number };
  lastSyncSummary?: {
    timestamp: string;
    standingsCount: number;
    acesMatchesCount: number;
    acesSkatersCount: number;
    acesGoaliesCount: number;
  };
}

export function LeagueSyncCard() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'league') : null),
    [firestore]
  );
  const { data: leagueSettings } = useDoc<LeagueSettings>(settingsDocRef);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      let syncDone = false;
      let data: any = null;

      // 1. Zkusíme server-side POST
      try {
        const res = await fetch('/api/sync/league', { method: 'POST' });
        const postData = await res.json();
        if (res.ok && postData.success) {
          syncDone = true;
          data = postData;
        }
      } catch (postErr) {
        // Ignorujeme, přejdeme na spolehlivý klientský fallback
      }

      // 2. Klientský fallback přes oprávněného administrátora (funguje i lokálně bez serverového service accountu)
      if (!syncDone) {
        if (!firestore) throw new Error('Databáze Firestore není připojena.');
        const scrapeRes = await fetch('/api/sync/league?action=scrape');
        const scrapeJson = await scrapeRes.json();
        if (!scrapeRes.ok || !scrapeJson.success || !scrapeJson.data) {
          throw new Error(scrapeJson.error || 'Nepodařilo se stáhnout data ligy pro synchronizaci.');
        }

        const clientResult = await syncLeagueToFirestore(firestore, scrapeJson.data);
        if (!clientResult.success && clientResult.errors?.length) {
          throw new Error(clientResult.errors.join(', '));
        }
        data = clientResult;
      }

      toast({
        title: 'Synchronizace dokončena',
        description: `Aktualizováno ${data.standingsCount} týmů, ${data.matchesUpdated + data.matchesCreated} zápasů a ${data.skatersUpdated} hráčů.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při synchronizaci',
        description: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Formátování data poslední synchronizace
  let formattedLastSync = 'Zatím neproběhla';
  if (leagueSettings?.lastSyncAt) {
    try {
      const date =
        typeof (leagueSettings.lastSyncAt as any).toDate === 'function'
          ? (leagueSettings.lastSyncAt as any).toDate()
          : new Date((leagueSettings.lastSyncAt as any).seconds * 1000);
      formattedLastSync = format(date, 'd. M. yyyy, HH:mm:ss', { locale: cs });
    } catch (e) {
      // fallback
    }
  }

  const summary = leagueSettings?.lastSyncSummary;

  return (
    <Card className="border-l-4 border-l-primary shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl font-headline">
                Automatická synchronizace ligy
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                2x denně (8:00 a 20:00)
              </Badge>
            </div>
            <CardDescription>
              Stahování tabulky, výsledků, termínů zápasů a kanadského bodování z{' '}
              <a
                href="https://hobbyhokejbrno.cz/zapasy1.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-primary underline hover:opacity-80"
              >
                hobbyhokejbrno.cz
                <ExternalLink className="ml-1 h-3 w-3 inline" />
              </a>
            </CardDescription>
          </div>

          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizuji...' : 'Synchronizovat nyní'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[11px] text-muted-foreground">Poslední synchronizace</p>
              <p className="font-semibold text-xs sm:text-sm">{formattedLastSync}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border">
            <Trophy className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[11px] text-muted-foreground">Ligová tabulka</p>
              <p className="font-semibold text-xs sm:text-sm">{summary?.standingsCount || 9} týmů</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[11px] text-muted-foreground">Statistiky hráčů Aces</p>
              <p className="font-semibold text-xs sm:text-sm">{summary?.acesSkatersCount || 20} střelců / asistentů</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[11px] text-muted-foreground">Statistiky brankářů</p>
              <p className="font-semibold text-xs sm:text-sm">{summary?.acesGoaliesCount || 2} brankáři</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
