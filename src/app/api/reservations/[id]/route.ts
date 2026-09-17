import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent } from '@/lib/realtime';
import { logAuditAction } from '@/lib/audit';
import { ActionType, ReservationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, adminId, userName, ...fields } = body;

    const current = await prisma.reservation.findUnique({
      where: { id },
      include: { campsite: true },
    });

    if (!current) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
    }

    const previousStatus = current.status;
    const isStatusChange = status && status !== previousStatus;

    // Update reservation
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        ...(status ? { status: status as ReservationStatus } : {}),
        ...fields,
      },
      include: {
        campsite: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    // Audit log
    let actionType: ActionType = ActionType.UPDATE;
    let detailMsg = `Updated reservation ${updated.reservationNumber}`;
    if (isStatusChange) {
      if (status === 'CANCELLED') {
        actionType = ActionType.CANCEL;
        detailMsg = `Cancelled reservation ${updated.reservationNumber} for ${updated.customerName}. Slot dates freed up.`;
      } else if (status === 'CONFIRMED') {
        actionType = ActionType.UPDATE;
        detailMsg = `Confirmed reservation ${updated.reservationNumber} for ${updated.customerName}.`;
      }
    }

    await logAuditAction({
      action: actionType,
      adminId: adminId || updated.createdByAdminId,
      userName: userName || adminId,
      targetType: 'RESERVATION',
      targetId: updated.id,
      campsiteName: updated.campsite.name,
      details: detailMsg,
    });

    const formatted = {
      ...updated,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    // Broadcast update in real time to all hosts
    broadcastRealtimeEvent({
      type: 'RESERVATION_UPDATED',
      payload: formatted,
    });

    return NextResponse.json({ success: true, reservation: formatted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId') || 'ADM-01';

    const current = await prisma.reservation.findUnique({
      where: { id },
      include: { campsite: true },
    });

    if (!current) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
    }

    await prisma.reservation.delete({ where: { id } });

    await logAuditAction({
      action: ActionType.DELETE,
      adminId,
      targetType: 'RESERVATION',
      targetId: id,
      campsiteName: current.campsite.name,
      details: `Deleted reservation ${current.reservationNumber} (${current.customerName})`,
    });

    // Broadcast cancellation/removal
    broadcastRealtimeEvent({
      type: 'RESERVATION_UPDATED',
      payload: {
        ...current,
        status: 'CANCELLED',
        startDate: current.startDate.toISOString(),
        endDate: current.endDate.toISOString(),
        createdAt: current.createdAt.toISOString(),
        updatedAt: current.updatedAt.toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
