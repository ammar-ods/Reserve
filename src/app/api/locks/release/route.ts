import { NextRequest, NextResponse } from 'next/server';
import { releaseLock } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campsiteId, hostAdminId } = body;

    if (!campsiteId || !hostAdminId) {
      return NextResponse.json(
        { success: false, error: 'Missing campsiteId or hostAdminId' },
        { status: 400 }
      );
    }

    await releaseLock(campsiteId, hostAdminId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
