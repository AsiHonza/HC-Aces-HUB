'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Bell, Check, Trash2, Info, Calendar, Users as UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, limit, doc, updateDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'match_new' | 'lineup_added' | 'info';
  createdAt: Timestamp;
  read: boolean;
  matchId?: string;
}

export function NotificationBell() {
  const { user } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null)

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
  }, [firestore, user])

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery)

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.read).length || 0
  }, [notifications])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latest = notifications[0]
      const isVeryRecent = latest.createdAt.toMillis() > Date.now() - 10000
      
      if (!latest.read && isVeryRecent && latest.id !== lastNotifiedId) {
        setLastNotifiedId(latest.id)
        
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          if (document.visibilityState !== 'visible') {
            new Notification(latest.title, { 
              body: latest.message,
              icon: '/favicon.ico'
            })
          }
        }
      }
    }
  }, [notifications, lastNotifiedId])

  const handleNotificationClick = async (n: Notification) => {
    if (!user || !firestore) return

    if (!n.read) {
      const notifRef = doc(firestore, 'users', user.uid, 'notifications', n.id)
      updateDoc(notifRef, { read: true })
    }

    setIsOpen(false)

    if (n.matchId) {
      const reasonParam = n.type === 'lineup_added' ? '&reason=lineup' : ''
      router.push(`/dashboard?matchId=${n.matchId}${reasonParam}`)
    }
  }

  const markAllAsRead = async () => {
    if (!user || !firestore || !notifications) return
    const batch = writeBatch(firestore)
    notifications.filter(n => !n.read).forEach(n => {
      const notifRef = doc(firestore, 'users', user.uid, 'notifications', n.id)
      batch.update(notifRef, { read: true })
    })
    await batch.commit()
  }

  const deleteNotification = async (id: string) => {
    if (!user || !firestore) return
    const notifRef = doc(firestore, 'users', user.uid, 'notifications', id)
    deleteDoc(notifRef)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'match_new': return <Calendar className="h-4 w-4 text-primary" />
      case 'lineup_added': return <UsersIcon className="h-4 w-4 text-blue-500" />
      default: return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-bold text-sm">Oznámení</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={markAllAsRead}>
              Přečteno vše
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <span className="text-xs text-muted-foreground">Načítání...</span>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="grid">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "flex gap-3 p-4 border-b last:border-0 transition-colors relative group cursor-pointer hover:bg-muted/50 text-left",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="mt-1">{getIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-xs font-bold leading-none", !n.read && "text-primary")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: cs })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 text-center">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm italic">Žádná nová oznámení.</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
