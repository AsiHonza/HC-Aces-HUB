import { NextRequest, NextResponse } from 'next/server';
import goldenSnapshot from '@/data/historical-stats-snapshot.json';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      snapshot: goldenSnapshot,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
