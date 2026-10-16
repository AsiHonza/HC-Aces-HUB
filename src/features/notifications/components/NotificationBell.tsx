'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Check, Trash2, Info, Calendar, Users as UsersIcon, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, updateDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendSystemNotification, 
  sendTestNotification, 
  NotificationStatus 
} from '@/lib/system-notifications';
import { getMvpVotingStatus } from '@/features/matches/utils/mvpVoting';
import type { Match } from '@/types';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'match_new' | 'lineup_added' | 'mvp_voting' | 'info';
  createdAt: Timestamp;
  read: boolean;
  matchId?: string;
}

export function NotificationBell() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationStatus>('default');
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [firestore, user]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const matchesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'matches') : null),
    [firestore, user]
  );
  const { data: allMatches } = useCollection<Match>(matchesQuery);

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.read).length || 0;
  }, [notifications]);

  // 75-minute post-match MVP Voting Notification Dispatcher
  useEffect(() => {
    if (!user || !firestore || !allMatches || allMatches.length === 0) return;

    const checkMvpVotingReminders = async () => {
      const nowMs = Date.now();
      for (const m of allMatches) {
        const { status } = getMvpVotingStatus(m, nowMs);
        if (status !== 'open') continue;

        // If user already voted, no need to remind
        if (m.mvpVotes && m.mvpVotes[user.uid]) continue;

        const storageKey = `aces_mvp_notified_${m.id}_${user.uid}`;
        if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
          continue;
        }

        const notifId = `mvp_${m.id}`;
        const alreadyInFirestore = notifications?.some((n) => n.id === notifId);
        if (alreadyInFirestore) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, 'true');
          }
          continue;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, 'true');
        }

        const title = 'Hlasování o Hráče zápasu (MVP)';
        const message = `Utkání ${m.team1} vs ${m.team2} skončilo. Zvol nejlepšího hráče dnešního zápasu v kabině!`;

        try {
          await setDoc(
            doc(firestore, 'users', user.uid, 'notifications', notifId),
            {
              id: notifId,
              title,
              message,
              type: 'mvp_voting',
              createdAt: Timestamp.now(),
              read: false,
              matchId: m.id,
            },
            { merge: true }
          );

          await sendSystemNotification(title, {
            body: message,
            url: `/dashboard?matchId=${m.id}&reason=mvp&t=${Date.now()}`,
            id: notifId,
            tag: `aces-mvp-${m.id}`,
          });
        } catch (e) {
          // Ignore transient errors
        }
      }
    };

    checkMvpVotingReminders();
    const interval = setInterval(checkMvpVotingReminders, 60 * 1000);
    return () => clearInterval(interval);
  }, [allMatches, notifications, user, firestore]);

  // Cleanup effect - deletes notifications older than 48 hours
  useEffect(() => {
    const cleanupOldNotifications = async () => {
      if (!user || !firestore || !notifications || notifications.length === 0) return;

      const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
      const toDelete = notifications.filter(n => n.createdAt.toMillis() < fortyEightHoursAgo);

      if (toDelete.length > 0) {
        const batch = writeBatch(firestore);
        toDelete.forEach(n => {
          const notifRef = doc(firestore, 'users', user.uid, 'notifications', n.id);
          batch.delete(notifRef);
        });
        await batch.commit();
      }
    };

    if (notifications) {
      cleanupOldNotifications();
    }
  }, [notifications, user, firestore]);

  // Check notification permission state on mount and when popover opens
  useEffect(() => {
    setPermissionStatus(getNotificationPermission());
  }, [isOpen]);

  // System notification dispatcher for newly arrived unread notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const storedLastId = typeof window !== 'undefined' ? localStorage.getItem('aces_last_notified_id') : null;
    
    // Find unread notifications created in the last 24 hours
    const unreadRecent = notifications.filter(n => {
      const isRecent = n.createdAt ? n.createdAt.toMillis() > Date.now() - 24 * 60 * 60 * 1000 : false;
      return !n.read && isRecent;
    });

    if (unreadRecent.length > 0) {
      const latest = unreadRecent[0];
      if (latest.id !== lastNotifiedId && latest.id !== storedLastId) {
        setLastNotifiedId(latest.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('aces_last_notified_id', latest.id);
        }

        const targetUrl = latest.matchId 
          ? `/dashboard?matchId=${latest.matchId}${latest.type === 'lineup_added' ? '&reason=lineup' : ''}&t=${Date.now()}`
          : '/dashboard';

        sendSystemNotification(latest.title, {
          body: latest.message,
          url: targetUrl,
          id: latest.id,
          tag: `aces-${latest.id}`,
        });
      }
    }
  }, [notifications, lastNotifiedId]);

  const handleEnableNotifications = async () => {
    const status = await requestNotificationPermission();
    setPermissionStatus(status);
    if (status === 'granted') {
      toast({
        title: 'Systémová oznámení povolena',
        description: 'Odesíláme testovací notifikaci do telefonu...'
      });
      await sendTestNotification();
    } else if (status === 'denied') {
      toast({
        variant: 'destructive',
        title: 'Oznámení jsou blokována',
        description: 'V prohlížeči máte oznámení zakázaná. Povolte je v nastavení webu.'
      });
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        toast({
          title: 'Notifikace odeslána',
          description: 'Zkontrolujte notifikační lištu vašeho telefonu.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Chyba odeslání',
          description: 'Zkontrolujte, zda máte povolená oznámení v systému telefonu.'
        });
      }
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!user || !firestore) return;

    if (!n.read) {
      const notifRef = doc(firestore, 'users', user.uid, 'notifications', n.id);
      updateDoc(notifRef, { read: true });
    }

    setIsOpen(false);

    if (n.matchId) {
      const reasonParam = n.type === 'lineup_added' ? '&reason=lineup' : '';
      router.push(`/dashboard?matchId=${n.matchId}${reasonParam}&t=${Date.now()}`);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !firestore || !notifications) return;
    const batch = writeBatch(firestore);
    notifications.filter(n => !n.read).forEach(n => {
      const notifRef = doc(firestore, 'users', user.uid, 'notifications', n.id);
      batch.update(notifRef, { read: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id: string) => {
    if (!user || !firestore) return;
    const notifRef = doc(firestore, 'users', user.uid, 'notifications', id);
    deleteDoc(notifRef);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match_new': return <Calendar className="h-4 w-4 text-primary" />;
      case 'lineup_added': return <UsersIcon className="h-4 w-4 text-blue-500" />;
      case 'mvp_voting': return <Trophy className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full border-2 border-background animate-pulse"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-84 sm:w-96 p-0" align="end">
        <div className="p-3 border-b bg-card space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm tracking-wide">Oznámení</h4>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={markAllAsRead}>
                  Přečteno vše
                </Button>
              )}
            </div>
          </div>

          {/* System Push Notification status & trigger bar */}
          {permissionStatus !== 'unsupported' && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  permissionStatus === 'granted' ? "bg-emerald-500 animate-pulse" :
                  permissionStatus === 'denied' ? "bg-destructive" : "bg-amber-500"
                )} />
                <span className="text-[11px] text-muted-foreground">
                  {permissionStatus === 'granted' ? 'Systémová oznámení aktivní' :
                   permissionStatus === 'denied' ? 'V prohlížeči blokováno' :
                   'Oznámení v telefonu'}
                </span>
              </div>
              <div>
                {permissionStatus === 'granted' ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={isTestingNotification}
                    className="h-6 text-[10px] px-2 border-border/60 hover:border-primary hover:text-primary"
                    onClick={handleTestNotification}
                  >
                    {isTestingNotification ? 'Odesílám...' : 'Otestovat'}
                  </Button>
                ) : permissionStatus === 'default' ? (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-6 text-[10px] px-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    onClick={handleEnableNotifications}
                  >
                    Povolit
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">Blokováno</span>
                )}
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Načítání oznámení...
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Žádná nová oznámení
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-3 text-xs flex gap-3 transition-colors hover:bg-muted/50 cursor-pointer relative group",
                    !n.read && "bg-primary/5 font-medium"
                  )}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("font-semibold text-foreground", !n.read && "text-primary")}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {n.createdAt && formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: cs })}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
