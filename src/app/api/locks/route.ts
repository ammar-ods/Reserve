import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acquireLock } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campsiteId = searchParams.get('campsiteId');

    const now = new Date();
    // Clean expired locks
    await prisma.activeLock.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const locks = await prisma.activeLock.findMany({
      where: campsiteId ? { campsiteId, expiresAt: { gt: now } } : { expiresAt: { gt: now } },
    });

    return NextResponse.json({ success: true, locks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campsiteId, startDate, endDate, hostAdminId, hostName } = body;

    if (!campsiteId || !startDate || !endDate || !hostAdminId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters (campsiteId, startDate, endDate, hostAdminId)' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json(
        { success: false, error: 'Invalid dates. End date must be after start date.' },
        { status: 400 }
      );
    }

    const result = await acquireLock({
      campsiteId,
      startDate: start,
      endDate: end,
      hostAdminId,
      hostName: hostName || hostAdminId,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, lock: result.lock });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
