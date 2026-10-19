import webpush from 'web-push';
import { getAdminFirestore } from './firebase-admin';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '../push-config';

// Configure Web Push with VAPID credentials
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  id?: string;
  data?: Record<string, any>;
}

export interface StoredPushSubscription {
  id?: string;
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  userAgent?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PushResult {
  sent: number;
  failed: number;
  cleaned: number;
}

/**
 * Sends a push notification to a single PushSubscription.
 * Returns true if successful, false otherwise.
 * Throws with error details if delivery failed.
 */
export async function sendRawPush(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/badge-72.png',
    tag: payload.tag || (payload.id ? `aces-${payload.id}` : `aces-${Date.now()}`),
    id: payload.id || `aces-${Date.now()}`,
    data: payload.data || {},
  });

  await webpush.sendNotification(subscription, jsonPayload, {
    TTL: 60 * 60 * 24, // 24 hours
    urgency: 'high',
  });
  return true;
}

/**
 * Sends a push notification to all registered devices of a specific user.
 * Automatically removes obsolete / expired subscriptions (HTTP 404 or 410 Gone).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  const db = getAdminFirestore();
  const subsSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('pushSubscriptions')
    .get();

  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  for (const doc of subsSnapshot.docs) {
    const data = doc.data() as StoredPushSubscription;
    if (!data.endpoint || !data.keys?.auth || !data.keys?.p256dh) {
      continue;
    }

    const pushSub: webpush.PushSubscription = {
      endpoint: data.endpoint,
      keys: {
        auth: data.keys.auth,
        p256dh: data.keys.p256dh,
      },
    };

    try {
      await sendRawPush(pushSub, payload);
      sent++;
    } catch (err: any) {
      failed++;
      // If subscription is expired or unsubscribed, remove it
      if (err.statusCode === 404 || err.statusCode === 410) {
        try {
          await doc.ref.delete();
          cleaned++;
        } catch {
          // ignore cleanup errors
        }
      } else {
        console.warn(`[web-push] Failed to send push to user ${userId} (doc ${doc.id}):`, err.message);
      }
    }
  }

  return { sent, failed, cleaned };
}

/**
 * Sends a push notification to multiple users.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<PushResult> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  let totalSent = 0;
  let totalFailed = 0;
  let totalCleaned = 0;

  for (const uid of uniqueIds) {
    const res = await sendPushToUser(uid, payload);
    totalSent += res.sent;
    totalFailed += res.failed;
    totalCleaned += res.cleaned;
  }

  return { sent: totalSent, failed: totalFailed, cleaned: totalCleaned };
}

/**
 * Sends a push notification to all users who have active push subscriptions.
 */
export async function sendPushToAll(payload: PushPayload): Promise<PushResult> {
  const db = getAdminFirestore();
  const usersSnapshot = await db.collection('users').get();
  const allUserIds = usersSnapshot.docs.map((d) => d.id);
  return sendPushToUsers(allUserIds, payload);
}
