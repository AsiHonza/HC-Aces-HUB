import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/server/firebase-admin';
import * as crypto from 'crypto';

function hashEndpoint(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex').substring(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription, userAgent } = body;

    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Chybí povinné údaje pro registraci odběru.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const subId = hashEndpoint(subscription.endpoint);

    await db
      .collection('users')
      .doc(userId)
      .collection('pushSubscriptions')
      .doc(subId)
      .set(
        {
          id: subId,
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.keys.auth,
            p256dh: subscription.keys.p256dh,
          },
          userAgent: userAgent || req.headers.get('user-agent') || '',
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        { merge: true }
      );

    return NextResponse.json({ success: true, subId });
  } catch (err: any) {
    console.error('Chyba při ukládání push odběru:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, endpoint } = body;

    if (!userId || !endpoint) {
      return NextResponse.json(
        { error: 'Chybí userId nebo endpoint pro smazání odběru.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const subId = hashEndpoint(endpoint);

    await db
      .collection('users')
      .doc(userId)
      .collection('pushSubscriptions')
      .doc(subId)
      .delete();

    return NextResponse.json({ success: true, subId });
  } catch (err: any) {
    console.error('Chyba při odstraňování push odběru:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
