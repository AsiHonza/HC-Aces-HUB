'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, CheckCircle2, AlertCircle, BellOff, BellRing, Loader2, Share2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import {
  getNotificationPermission,
  getPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  sendBackgroundTestNotification,
  isIosDevice,
  isStandalonePwa,
  isPushManagerSupported,
  type NotificationStatus,
} from '@/lib/system-notifications';
import { cn } from '@/lib/utils';

export function NotificationSettingsCard() {
  const { toast } = useToast();
  const { user } = useUser();

  const [permStatus, setPermStatus] = useState<NotificationStatus>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  const isIos = typeof window !== 'undefined' ? isIosDevice() : false;
  const isPwa = typeof window !== 'undefined' ? isStandalonePwa() : false;
  const showIosTip = isIos && !isPwa;

  // Check permission and subscription on mount
  useEffect(() => {
    let mounted = true;

    const checkState = async () => {
      const currentPerm = getNotificationPermission();
      if (!mounted) return;
      setPermStatus(currentPerm);

      if (currentPerm === 'granted') {
        const sub = await getPushSubscription();
        if (mounted) {
          setIsSubscribed(Boolean(sub));
        }
      } else {
        if (mounted) {
          setIsSubscribed(false);
        }
      }
      if (mounted) {
        setIsLoading(false);
      }
    };

    checkState();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle countdown during background test
  useEffect(() => {
    if (testCountdown === null || testCountdown <= 0) return;
    const timer = setInterval(() => {
      setTestCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [testCountdown]);

  const handleActivate = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Nejste přihlášeni',
        description: 'Pro aktivaci oznámení se musíte nejprve přihlásit.',
      });
      return;
    }

    setIsActivating(true);
    try {
      const res = await subscribeToPush(user.uid);
      const newPerm = getNotificationPermission();
      setPermStatus(newPerm);

      if (res.success) {
        setIsSubscribed(true);
        toast({
          title: 'Push oznámení aktivována 🎉',
          description: 'Toto zařízení bylo úspěšně zaregistrováno pro příjem systémových notifikací.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Aktivace se nezdařila',
          description: res.error || 'Ujistěte se, že jste povolili oznámení v prohlížeči.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba při aktivaci',
        description: err.message || 'Nepodařilo se dokončit registraci odběru.',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;
    setIsActivating(true);
    try {
      await unsubscribeFromPush(user.uid);
      setIsSubscribed(false);
      toast({
        title: 'Oznámení odhlášena',
        description: 'Toto zařízení již nebude přijímat push notifikace z klubu.',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleTestBackgroundPush = async () => {
    if (!user) return;
    setTestCountdown(5);

    toast({
      title: 'Spouštím 5sekundový test ⏱️',
      description: 'Nyní můžete telefon zamknout nebo přepnout do jiné aplikace. Za 5 sekund vám dorazí push zpráva ze serveru.',
    });

    try {
      const res = await sendBackgroundTestNotification(user.uid, 5);
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Chyba testu',
          description: res.message,
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Chyba testu',
        description: err.message || 'Nepodařilo se poslat testovací zprávu.',
      });
    }
  };

  if (permStatus === 'unsupported' && !isIos) {
    return null;
  }

  const isFullyActive = permStatus === 'granted' && isSubscribed;

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg">Systémová oznámení do telefonu (Web Push)</CardTitle>
            <CardDescription>
              Upozornění na hlasování o hvězdách zápasu (MVP), nominace do sestavy a důležité zprávy kabiny.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* iOS Web Push Guidance */}
        {showIosTip && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Návod pro iPhone (iOS):</p>
              <p className="leading-relaxed">
                Apple na iPhonu umožňuje Web Push notifikace pouze po přidání aplikace na plochu.
                V Safari klepněte dole na ikonu Sdílet <Share2 className="inline h-3 w-3 mx-0.5" /> a zvolte <strong>„Přidat na plochu“</strong>. Následně otevřete Aces HUB přímo z plochy telefonu.
              </p>
            </div>
          </div>
        )}

        {/* Hlavní stavový panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/50 bg-card/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full shrink-0',
                  isFullyActive
                    ? 'bg-emerald-500 animate-pulse'
                    : permStatus === 'denied'
                    ? 'bg-destructive'
                    : 'bg-amber-500'
                )}
              />
              <p className="font-semibold text-sm">
                {isLoading
                  ? 'Zjišťuji stav oznámení...'
                  : isFullyActive
                  ? 'Push notifikace jsou na tomto zařízení aktivní'
                  : permStatus === 'denied'
                  ? 'Oznámení jsou v prohlížeči zablokována'
                  : 'Push notifikace nejsou pro tento telefon zapnuté'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isFullyActive
                ? 'Telefon vás automaticky upozorní i při zamknuté obrazovce a zavřené aplikaci.'
                : permStatus === 'denied'
                ? 'V nastavení vašeho prohlížeče máte pro tento web oznámení zakázána. Klikněte na ikonu zámku v adresním řádku -> Oprávnění -> Povolit oznámení.'
                : 'Aktivujte push oznámení, aby vám telefon cinknul, když skončí zápas nebo bude potřeba odhlasovat 3 hvězdy.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {isLoading ? (
              <Button variant="ghost" size="sm" disabled className="text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Načítám...
              </Button>
            ) : isFullyActive ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={testCountdown !== null}
                  onClick={handleTestBackgroundPush}
                  className="border-primary/50 text-primary hover:bg-primary/10 text-xs font-semibold"
                >
                  <BellRing className="mr-1.5 h-3.5 w-3.5" />
                  {testCountdown !== null
                    ? `Telefon pípne za ${testCountdown}s...`
                    : 'Otestovat push na pozadí (5s)'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isActivating}
                  onClick={handleDeactivate}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  title="Odhlásit toto zařízení"
                >
                  Vypnout
                </Button>
              </>
            ) : permStatus === 'default' || (permStatus === 'granted' && !isSubscribed) ? (
              <Button
                variant="default"
                size="sm"
                disabled={isActivating}
                onClick={handleActivate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Přihlašuji zařízení...
                  </>
                ) : (
                  <>
                    <BellRing className="mr-1.5 h-3.5 w-3.5" />
                    Zapnout push notifikace na tomto telefonu
                  </>
                )}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground italic">Blokováno v prohlížeči</span>
            )}
          </div>
        </div>

        {/* Informační řádek o podpoře zařízení */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/75 px-1 pt-1">
          <span>
            Podporované systémy: Android (Chrome, Samsung Internet), iPhone (PWA na ploše, iOS 16.4+), PC/Mac
          </span>
          {isFullyActive && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3" /> Zařízení spárováno
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
