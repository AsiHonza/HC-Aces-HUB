import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/server/web-push';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, delaySeconds = 0 } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Chybí userId pro odeslání testovací notifikace.' },
        { status: 400 }
      );
    }

    // If delay is requested, wait before sending so user can lock device / minimize app
    if (delaySeconds > 0) {
      const waitMs = Math.min(delaySeconds * 1000, 15000); // cap at 15s
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const result = await sendPushToUser(userId, {
      title: 'HC Aces: Test push notifikace 🏒',
      body: 'Paráda! Systémová oznámení do telefonu ti fungují i při zamknuté obrazovce.',
      url: '/dashboard/settings',
      tag: 'aces-test-push',
      id: `test-${Date.now()}`,
    });

    if (result.sent === 0) {
      return NextResponse.json({
        success: false,
        sent: 0,
        message: 'Nebylo nalezeno žádné aktivní zařízení. Ujistěte se, že jste povolili notifikace v nastavení.',
      });
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      message: `Testovací notifikace byla úspěšně odeslána na ${result.sent} zařízení.`,
    });
  } catch (err: any) {
    console.error('Chyba při odesílání testovací notifikace:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
