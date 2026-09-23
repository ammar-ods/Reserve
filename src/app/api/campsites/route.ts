import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent } from '@/lib/realtime';
import { buildChanges, logAuditAction } from '@/lib/audit';
import { ActionType, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const campsites = await prisma.campsite.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
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
      morningCapacity: c.morningCapacity,
      eveningCapacity: c.eveningCapacity,
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
    const { campsiteId, dailyCapacity, morningCapacity, eveningCapacity, adminId, userName, requesterRole } = body;

    if (requesterRole && requesterRole !== 'ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    if (!campsiteId) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const data: { dailyCapacity?: number; morningCapacity?: number; eveningCapacity?: number } = {};
    if (typeof dailyCapacity === 'number' && dailyCapacity >= 1) data.dailyCapacity = dailyCapacity;
    if (typeof morningCapacity === 'number' && morningCapacity >= 1) data.morningCapacity = morningCapacity;
    if (typeof eveningCapacity === 'number' && eveningCapacity >= 1) data.eveningCapacity = eveningCapacity;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const current = await prisma.campsite.findUnique({
      where: { id: campsiteId },
    });

    if (!current) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const updated = await prisma.campsite.update({
      where: { id: campsiteId },
      data,
    });

    broadcastRealtimeEvent({
      type: 'CAPACITY_UPDATED',
      payload: { campsiteId, newCapacity: updated.dailyCapacity },
    });

    // Audit log
    await logAuditAction({
      action: ActionType.SETTING_UPDATE,
      adminId: adminId || 'SA-01',
      userName,
      userRole: requesterRole as Role | undefined,
      targetType: 'CAMPSITE',
      targetId: campsiteId,
      targetLabel: updated.name,
      campsiteName: updated.name,
      details: `تعديل الحد اليومي للمخيم ${updated.name}`,
      changes: buildChanges(
        current as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>,
        ['dailyCapacity', 'morningCapacity', 'eveningCapacity']
      ),
    });

    return NextResponse.json({ success: true, campsite: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
