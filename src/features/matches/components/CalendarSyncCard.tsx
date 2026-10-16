'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarSync, Copy, Check, Download, Clock, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadFullSeasonIcs } from '../utils/calendarIcs';
import type { Match } from '@/types';

export interface CalendarSyncCardProps {
  matches: Match[];
}

export function CalendarSyncCard({ matches }: CalendarSyncCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [feedHost, setFeedHost] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFeedHost(window.location.host);
    }
  }, []);

  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
  const httpFeedUrl = feedHost ? `${protocol}://${feedHost}/api/calendar/ics` : '/api/calendar/ics';
  const webcalFeedUrl = feedHost ? `webcal://${feedHost}/api/calendar/ics` : '/api/calendar/ics';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(httpFeedUrl);
      setCopied(true);
      toast({
        title: 'Odkaz zkopírován',
        description:
          'Adresa živého kalendáře byla zkopírována. Vložte ji v Google Kalendáři do sekce Přidat kalendář pomocí adresy URL.',
      });
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Chyba kopírování',
        description: 'Nepodařilo se zkopírovat odkaz do schránky.',
      });
    }
  };

  const handleDownloadIcs = () => {
    downloadFullSeasonIcs(matches);
    toast({
      title: 'Kalendář stažen',
      description: 'Soubor .ics s rozpisem zápasů byl připraven k importu do vašeho kalendáře.',
    });
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-card via-card to-primary/5 shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/15 text-primary border border-primary/25">
                <CalendarSync className="h-5 w-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-headline tracking-tight">
                Synchronizace s kalendářem v mobilu
              </h3>
              <Badge variant="outline" className="text-[11px] border-primary/40 text-primary bg-primary/10">
                Živý odběr iCal / webcal
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Přidejte si živý rozpis zápasů HC Aces do Apple nebo Google kalendáře. Nové zápasy a případné změny časů se vám propíší automaticky.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md border border-border/60">
                <BellRing className="h-3.5 w-3.5 text-primary" />
                Sraz v kabině: <strong className="text-foreground">45 min předem</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md border border-border/60">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Délka události: <strong className="text-foreground">75 minut</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <Button
              asChild
              size="sm"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <a href={webcalFeedUrl}>
                <CalendarSync className="mr-1.5 h-4 w-4" />
                Odebírat v mobilu
              </a>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="w-full sm:w-auto border-border/80 hover:border-primary/50"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
                  Zkopírováno
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  URL pro Google Kalendář
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadIcs}
              disabled={matches.length === 0}
              className="w-full sm:w-auto"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Stáhnout .ics
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
