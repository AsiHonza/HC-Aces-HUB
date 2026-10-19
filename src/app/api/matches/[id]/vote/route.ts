import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, admin } from '@/lib/server/firebase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams?.id;
    const body = await req.json().catch(() => ({}));
    const { type, voterUserId, vote, candidateUserId } = body;

    const targetMatchId = matchId || body.matchId;
    if (!targetMatchId) {
      return NextResponse.json({ error: 'Chybí ID zápasu.' }, { status: 400 });
    }

    if (!voterUserId) {
      return NextResponse.json({ error: 'Chybí ID hlasujícího uživatele.' }, { status: 400 });
    }

    // Volitelné ověření auth tokenu, pokud je v hlavičce přítomen
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1]?.trim();
      if (token) {
        try {
          const decoded = await admin.auth().verifyIdToken(token);
          if (decoded.uid !== voterUserId && decoded.role !== 'admin') {
            return NextResponse.json(
              { error: 'Nemáte oprávnění hlasovat za jiného uživatele.' },
              { status: 403 }
            );
          }
        } catch (tokenErr) {
          console.warn('Ověření auth tokenu přeskočeno nebo selhalo:', tokenErr);
        }
      }
    }

    const db = getAdminFirestore();
    const matchRef = db.collection('matches').doc(targetMatchId);

    if (type === 'stars') {
      if (!vote || !vote.star1 || !vote.star2 || !vote.star3) {
        return NextResponse.json(
          { error: 'Musíte vybrat všechny 3 hvězdy zápasu.' },
          { status: 400 }
        );
      }

      if (
        vote.star1 === voterUserId ||
        vote.star2 === voterUserId ||
        vote.star3 === voterUserId
      ) {
        return NextResponse.json(
          { error: 'Nemůžete udělit hvězdu sami sobě.' },
          { status: 400 }
        );
      }

      if (
        vote.star1 === vote.star2 ||
        vote.star1 === vote.star3 ||
        vote.star2 === vote.star3
      ) {
        return NextResponse.json(
          { error: 'Každá ze 3 hvězd musí patřit jinému spoluhráči.' },
          { status: 400 }
        );
      }

      await db.runTransaction(async (transaction) => {
        const matchDoc = await transaction.get(matchRef);
        if (!matchDoc.exists) {
          throw new Error('Zápas nebyl nalezen.');
        }

        const data = matchDoc.data() || {};
        const starsVotes = { ...(data.starsVotes || {}) };
        const mvpVotes = { ...(data.mvpVotes || {}) };

        starsVotes[voterUserId] = {
          star1: vote.star1,
          star2: vote.star2,
          star3: vote.star3,
        };
        mvpVotes[voterUserId] = vote.star1;

        transaction.set(
          matchRef,
          {
            starsVotes,
            mvpVotes,
          },
          { merge: true }
        );
      });

      return NextResponse.json({
        success: true,
        message: 'Hlasování o 3 hvězdy bylo úspěšně uloženo.',
      });
    } else if (type === 'mvp') {
      if (!candidateUserId) {
        return NextResponse.json(
          { error: 'Chybí kandidát pro hlasování o hráče zápasu.' },
          { status: 400 }
        );
      }

      if (candidateUserId === voterUserId) {
        return NextResponse.json(
          { error: 'Nemůžete hlasovat sami pro sebe.' },
          { status: 400 }
        );
      }

      await db.runTransaction(async (transaction) => {
        const matchDoc = await transaction.get(matchRef);
        if (!matchDoc.exists) {
          throw new Error('Zápas nebyl nalezen.');
        }

        const data = matchDoc.data() || {};
        const mvpVotes = { ...(data.mvpVotes || {}) };
        mvpVotes[voterUserId] = candidateUserId;

        transaction.set(
          matchRef,
          {
            mvpVotes,
          },
          { merge: true }
        );
      });

      return NextResponse.json({
        success: true,
        message: 'Hlasování o hráče zápasu bylo úspěšně uloženo.',
      });
    } else {
      return NextResponse.json(
        { error: 'Neznámý typ hlasování. Očekává se "stars" nebo "mvp".' },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error('Chyba při zpracování hlasování v API:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Nepodařilo se uložit hlasování.',
      },
      { status: 500 }
    );
  }
}
