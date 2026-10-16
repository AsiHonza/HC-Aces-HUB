'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, CheckCircle2, AlertCircle, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  type NotificationStatus,
} from '@/lib/system-notifications';
import { cn } from '@/lib/utils';

export function NotificationSettingsCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<NotificationStatus>('default');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setStatus(getNotificationPermission());
  }, []);

  const handleRequest = async () => {
    const newStatus = await requestNotificationPermission();
    setStatus(newStatus);
    if (newStatus === 'granted') {
      toast({
        title: 'Oznámení aktivována',
        description: 'Systémová push oznámení jsou nyní pro tento telefon povolena.',
      });
      await sendTestNotification();
    } else if (newStatus === 'denied') {
      toast({
        variant: 'destructive',
        title: 'Oznámení blokována',
        description: 'Povolte oznámení v nastavení Chrome (ikona zámku v adresním řádku).',
      });
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const ok = await sendTestNotification();
      if (ok) {
        toast({
          title: 'Notifikace odeslána',
          description: 'Zkontrolujte notifikační lištu vašeho telefonu.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Nepodařilo se odeslat',
          description: 'Ujistěte se, že máte povolená systémová oznámení pro prohlížeč v nastavení Androidu.',
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  if (status === 'unsupported') {
    return null;
  }

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg">Systémová oznámení do telefonu (Push)</CardTitle>
            <CardDescription>
              Upozornění na nominace do sestavy, nové zápasy a důležité zprávy z klubu.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/50 bg-card/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full shrink-0',
                  status === 'granted'
                    ? 'bg-emerald-500 animate-pulse'
                    : status === 'denied'
                    ? 'bg-destructive'
                    : 'bg-amber-500'
                )}
              />
              <p className="font-semibold text-sm">
                {status === 'granted'
                  ? 'Systémová oznámení jsou aktivní'
                  : status === 'denied'
                  ? 'Oznámení jsou v prohlížeči zablokována'
                  : 'Oznámení do telefonu nejsou povolena'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {status === 'granted'
                ? 'Při nominaci do sestavy nebo vypsání zápasu dostanete systémovou notifikaci na obrazovku telefonu.'
                : status === 'denied'
                ? 'V nastavení Chrome máte pro tento web oznámení zakázána. Pro povolení klikněte na zámek u adresy webu -> Oprávnění -> Povolit oznámení.'
                : 'Povolte oznámení, abyste nezmeškali nominaci do sestavy a termíny zápasů.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {status === 'granted' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isTesting}
                onClick={handleTest}
                className="border-primary/40 text-primary hover:bg-primary/10 font-medium"
              >
                {isTesting ? 'Odesílám...' : 'Otestovat notifikaci'}
              </Button>
            ) : status === 'default' ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleRequest}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Povolit oznámení v telefonu
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground italic">Blokováno v Chrome</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
