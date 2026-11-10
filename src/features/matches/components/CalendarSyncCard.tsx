'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarSync,
  Copy,
  Check,
  Download,
  Clock,
  BellRing,
} from 'lucide-react';
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
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? 'https'
      : 'http';
  const httpFeedUrl = feedHost
    ? `${protocol}://${feedHost}/api/calendar/ics`
    : '/api/calendar/ics';
  const webcalFeedUrl = feedHost
    ? `webcal://${feedHost}/api/calendar/ics`
    : '/api/calendar/ics';

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
    } catch {
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
      description:
        'Soubor .ics s rozpisem zápasů byl připraven k importu do vašeho kalendáře.',
    });
  };

  return (
    <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-r from-card via-card to-primary/[0.06] p-3.5 sm:p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
            <CalendarSync className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black font-headline tracking-tight leading-none">
                Synchronizace s kalendářem
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-primary/35 text-primary bg-primary/10 px-2 py-0 h-4 rounded-md"
              >
                iCal / webcal
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
              Živý rozpis zápasů HC Aces do Apple nebo Google kalendáře (sraz{' '}
              <strong className="text-foreground">45 min předem</strong>, délka{' '}
              <strong className="text-foreground">75 min</strong>).
            </p>
          </div>
        </div>

        {/* Compact Horizontal Action Row on Mobile & Desktop */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            asChild
            size="sm"
            className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] sm:text-xs font-bold shadow-sm"
          >
            <a href={webcalFeedUrl}>
              <CalendarSync className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Odebírat</span>
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold border-border/80 hover:border-primary/50"
          >
            {copied ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Zkopírováno</span>
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Google URL</span>
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadIcs}
            disabled={matches.length === 0}
            className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold border border-border/60"
          >
            <Download className="mr-1 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Soubor .ics</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
