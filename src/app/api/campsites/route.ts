import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent } from '@/lib/realtime';
import { logAuditAction } from '@/lib/audit';
import { ActionType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const campsites = await prisma.campsite.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            reservations: {
              where: { status: { in: ['PENDING', 'CONFIRMED'] } },
            },
            locks: {
              where: { expiresAt: { gt: now } },
            },
          },
        },
      },
    });

    const formatted = campsites.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      dailyCapacity: c.dailyCapacity,
      iconName: c.iconName,
      activeReservationsCount: c._count.reservations,
      activeLocksCount: c._count.locks,
    }));

    return NextResponse.json({ success: true, campsites: formatted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { campsiteId, dailyCapacity, adminId, userName } = body;

    if (!campsiteId || typeof dailyCapacity !== 'number' || dailyCapacity < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid campsite ID or daily capacity (minimum 1)' },
        { status: 400 }
      );
    }

    const current = await prisma.campsite.findUnique({
      where: { id: campsiteId },
    });

    if (!current) {
      return NextResponse.json({ success: false, error: 'Campsite not found' }, { status: 404 });
    }

    const oldCapacity = current.dailyCapacity;
    const updated = await prisma.campsite.update({
      where: { id: campsiteId },
      data: { dailyCapacity },
    });

    // Broadcast capacity change
    broadcastRealtimeEvent({
      type: 'CAPACITY_UPDATED',
      payload: { campsiteId, newCapacity: dailyCapacity },
    });

    // Audit log
    await logAuditAction({
      action: ActionType.SETTING_UPDATE,
      adminId: adminId || 'ADM-01',
      userName: userName || 'Admin',
      targetType: 'CAMPSITE',
      targetId: campsiteId,
      campsiteName: updated.name,
      details: `Updated daily capacity limit for ${updated.name} from ${oldCapacity} to ${dailyCapacity}`,
    });

    return NextResponse.json({ success: true, campsite: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
