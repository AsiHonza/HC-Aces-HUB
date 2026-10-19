import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser, sendPushToUsers, sendPushToAll, PushPayload } from '@/lib/server/web-push';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userIds, all, title, body: messageBody, url, tag, id, secret } = body;

    // Optional secret check if invoked externally
    const expectedSecret = process.env.SYNC_SECRET || 'aces-sync-secret-2026';
    if (secret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Neplatný autorizační klíč.' }, { status: 401 });
    }

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Chybí povinná pole title nebo body.' },
        { status: 400 }
      );
    }

    const payload: PushPayload = {
      title,
      body: messageBody,
      url: url || '/dashboard',
      tag: tag || (id ? `aces-${id}` : undefined),
      id: id || `push-${Date.now()}`,
    };

    let result;
    if (all) {
      result = await sendPushToAll(payload);
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      result = await sendPushToUsers(userIds, payload);
    } else if (userId) {
      result = await sendPushToUser(userId, payload);
    } else {
      return NextResponse.json(
        { error: 'Musí být specifikován cíl: userId, userIds nebo all: true.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Chyba při odesílání hromadné push notifikace:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
