'use client'

/**
 * System push notifications helper for PWA (Android Chrome, iOS Safari PWA, Desktop).
 * Android Chrome strictly requires ServiceWorkerRegistration.showNotification()
 * instead of `new Notification()`.
 */

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if the current browser environment supports notifications and service worker
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current permission state
 */
export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
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
      scope: '/'
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
    // Ensure service worker is registered
    await registerServiceWorker();

    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Chyba při žádosti o oprávnění k notifikacím:', error);
    return getNotificationPermission();
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
 * Dispatches a system OS notification via Service Worker (required on Android Chrome)
 * with a fallback to standard Notification API.
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
      id: options.id
    }
  };

  // 1. Try ServiceWorkerRegistration.showNotification (Required for Android Chrome PWA)
  if ('serviceWorker' in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
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
 * Send a test notification to verify the phone / browser setup
 */
export async function sendTestNotification(): Promise<boolean> {
  return sendSystemNotification('HC Aces: Systémová oznámení aktivní', {
    body: 'Upozornění na nominace do sestavy a nové zápasy vám budou chodit přímo do telefonu.',
    url: '/dashboard',
    id: 'test-push-' + Date.now(),
    tag: 'aces-test-push'
  });
}
