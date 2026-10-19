'use client';

import { VAPID_PUBLIC_KEY } from './push-config';

/**
 * System push notifications helper for PWA (Android Chrome, iOS Safari PWA, Desktop).
 * Android Chrome strictly requires ServiceWorkerRegistration.showNotification()
 * instead of `new Notification()`.
 */

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if running on an iOS device (iPhone, iPad)
 */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Check if running as an installed PWA (Home Screen)
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if the current browser environment supports notifications and service worker
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Check if pushManager is supported (for true background push notifications)
 */
export function isPushManagerSupported(): boolean {
  if (!isNotificationSupported()) return false;
  return 'PushManager' in window;
}

/**
 * Get current permission state
 */
export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Convert URL-safe base64 string to Uint8Array for VAPID applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register service worker if not already registered
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (error) {
    console.error('Chyba při registraci Service Workeru:', error);
    return null;
  }
}

/**
 * Request notification permission from user.
 * Must be triggered by a user gesture (button tap/click) on Android Chrome.
 */
export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    await registerServiceWorker();
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Chyba při žádosti o oprávnění k notifikacím:', error);
    return getNotificationPermission();
  }
}

/**
 * Retrieves the active PushSubscription for this browser, if any.
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushManagerSupported()) return null;
  try {
    const reg = await registerServiceWorker();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('Nelze načíst push odběr:', err);
    return null;
  }
}

/**
 * Subscribes the current device to Web Push notifications using VAPID
 * and saves the subscription to the backend for the user.
 */
export async function subscribeToPush(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isNotificationSupported()) {
    return { success: false, error: 'Tento prohlížeč nepodporuje systémová oznámení.' };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { success: false, error: 'Oprávnění k oznámením nebylo uděleno.' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, error: 'Nepodařilo se aktivovat Service Worker.' };
    }

    // Wait until service worker is active
    let activeWorker = reg.active;
    if (!activeWorker) {
      activeWorker = await new Promise<ServiceWorker | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 3000);
        navigator.serviceWorker.ready.then((r) => {
          clearTimeout(timeout);
          resolve(r.active);
        });
      });
    }

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const appKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appKey,
      });
    }

    if (!subscription) {
      return { success: false, error: 'Prohlížeč nevytvořil push odběr.' };
    }

    // Send subscription to server
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Server odmítl uložit push odběr.');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Chyba při přihlašování k push notifikacím:', err);
    return { success: false, error: err.message || 'Nepodařilo se aktivovat push oznámení.' };
  }
}

/**
 * Unsubscribes the current device from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, endpoint }),
      }).catch(() => {});
    }
    return true;
  } catch (err) {
    console.error('Chyba při odhlašování push odběru:', err);
    return false;
  }
}

/**
 * Sends a real background push notification from the server with a delay,
 * allowing the user to lock their phone and verify background delivery.
 */
export async function sendBackgroundTestNotification(
  userId: string,
  delaySeconds = 3
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, delaySeconds }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.message || data.error || 'Nepodařilo se odeslat testovací push zprávu.',
      };
    }

    return {
      success: true,
      message: data.message || 'Testovací push zpráva byla odeslána.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Chyba síťového spojení při testu notifikace.',
    };
  }
}

export interface SystemNotificationOptions {
  body?: string;
  url?: string;
  id?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

/**
 * Dispatches a local system notification (used when web app is in foreground)
 */
export async function sendSystemNotification(
  title: string,
  options: SystemNotificationOptions = {}
): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    body: options.body || '',
    icon: options.icon || '/icon-192.png',
    badge: options.badge || '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: options.tag || (options.id ? `aces-${options.id}` : `aces-${Date.now()}`),
    renotify: true,
    data: {
      url: options.url || '/dashboard',
      id: options.id,
    },
  };

  // 1. Try ServiceWorkerRegistration.showNotification (Required for Android Chrome PWA)
  if ('serviceWorker' in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null | undefined =
        await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await registerServiceWorker();
      }

      if (reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    } catch (swError) {
      console.warn('Service worker notification failed, trying fallback:', swError);
    }
  }

  // 2. Fallback for Desktop browsers supporting `new Notification`
  try {
    const desktopNotification = new Notification(title, {
      body: notificationOptions.body,
      icon: notificationOptions.icon,
      tag: notificationOptions.tag,
    });

    desktopNotification.onclick = () => {
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
    };
    return true;
  } catch (desktopError) {
    console.warn('Native Notification constructor not supported on this platform:', desktopError);
    return false;
  }
}

/**
 * Send a local test notification to verify the browser notification display
 */
export async function sendTestNotification(): Promise<boolean> {
  return sendSystemNotification('HC Aces: Systémová oznámení aktivní', {
    body: 'Upozornění na nominace do sestavy a nové zápasy vám budou chodit přímo do telefonu.',
    url: '/dashboard',
    id: 'test-push-' + Date.now(),
    tag: 'aces-test-push',
  });
}
