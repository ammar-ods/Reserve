import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent, checkCapacityAvailability } from '@/lib/realtime';
import { buildChanges, logAuditAction } from '@/lib/audit';
import { getSystemSettings, pricesOf } from '@/lib/settings';
import { calculateTotal } from '@/lib/pricing';
import { ActionType, Prisma, ReservationStatus, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const TRACKED_FIELDS = [
  'customerName',
  'customerPhone',
  'country',
  'guestCount',
  'startDate',
  'endDate',
  'rentedTents',
  'rentedCars',
  'rentedBirds',
  'rentedRabbits',
  'totalAmount',
  'depositAmount',
  'notes',
  'status',
];

function toOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return Math.max(0, Number(value) || 0);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, adminId, userName, requesterRole } = body;

    const current = await prisma.reservation.findUnique({
      where: { id },
      include: { campsite: true },
    });

    if (!current) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const data: Prisma.ReservationUpdateInput = {};

    if (typeof body.customerName === 'string' && body.customerName.trim()) {
      data.customerName = body.customerName.trim();
    }
    if (typeof body.customerPhone === 'string' && body.customerPhone.trim()) {
      data.customerPhone = body.customerPhone.trim();
    }
    if (typeof body.country === 'string' && body.country.trim()) {
      data.country = body.country.trim().toUpperCase();
    }
    if (body.guestCount !== undefined) {
      data.guestCount = Math.max(1, Number(body.guestCount) || 1);
    }
    if (body.notes !== undefined) {
      data.notes = String(body.notes || '');
    }

    const deposit = toOptionalNumber(body.depositAmount);
    if (deposit !== undefined) {
      data.depositAmount = deposit;
    }

    // Rented item counts drive the auto-calculated total, so they are handled together.
    const countFields = ['rentedTents', 'rentedCars', 'rentedBirds', 'rentedRabbits'] as const;
    const hasCountUpdate = countFields.some((f) => body[f] !== undefined);
    const counts = {
      rentedTents: body.rentedTents !== undefined ? Math.max(0, Number(body.rentedTents) || 0) : current.rentedTents,
      rentedCars: body.rentedCars !== undefined ? Math.max(0, Number(body.rentedCars) || 0) : current.rentedCars,
      rentedBirds: body.rentedBirds !== undefined ? Math.max(0, Number(body.rentedBirds) || 0) : current.rentedBirds,
      rentedRabbits:
        body.rentedRabbits !== undefined ? Math.max(0, Number(body.rentedRabbits) || 0) : current.rentedRabbits,
    };

    if (hasCountUpdate) {
      Object.assign(data, counts);
      const settings = await getSystemSettings();
      data.totalAmount = calculateTotal(counts, pricesOf(settings));
    }

    // Date changes must respect the campsite daily cap all over again.
    let nextStart = current.startDate;
    let nextEnd = current.endDate;
    if (body.startDate || body.endDate) {
      nextStart = body.startDate ? new Date(body.startDate) : current.startDate;
      nextEnd = body.endDate ? new Date(body.endDate) : current.endDate;

      if (isNaN(nextStart.getTime()) || isNaN(nextEnd.getTime()) || nextStart >= nextEnd) {
        return NextResponse.json({ success: false, error: 'INVALID_DATES' }, { status: 400 });
      }

      const datesChanged =
        nextStart.getTime() !== current.startDate.getTime() || nextEnd.getTime() !== current.endDate.getTime();

      if (datesChanged) {
        const check = await checkCapacityAvailability(
          current.campsiteId,
          nextStart,
          nextEnd,
          adminId || current.createdByAdminId,
          current.id
        );
        if (!check.available) {
          return NextResponse.json(
            { success: false, error: 'CAPACITY_REACHED', congestedDate: check.congestedDate },
            { status: 409 }
          );
        }
        data.startDate = nextStart;
        data.endDate = nextEnd;
      }
    }

    const previousStatus = current.status;
    const isStatusChange = status && status !== previousStatus;
    if (status) {
      data.status = status as ReservationStatus;
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data,
      include: {
        campsite: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    let actionType: ActionType = ActionType.UPDATE;
    let detailMsg = `تعديل بيانات الحجز ${updated.reservationNumber}`;
    if (isStatusChange) {
      if (status === 'CANCELLED') {
        actionType = ActionType.CANCEL;
        detailMsg = `إلغاء الحجز ${updated.reservationNumber} وتحرير التواريخ`;
      } else if (status === 'CONFIRMED') {
        detailMsg = `تأكيد الحجز ${updated.reservationNumber} بعد استلام العربون`;
      } else {
        detailMsg = `تغيير حالة الحجز ${updated.reservationNumber}`;
      }
    }

    const changes = buildChanges(
      current as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      TRACKED_FIELDS
    );

    await logAuditAction({
      action: actionType,
      adminId: adminId || updated.createdByAdminId,
      userName: userName || adminId,
      userRole: requesterRole as Role | undefined,
      targetType: 'RESERVATION',
      targetId: updated.id,
      targetLabel: `${updated.reservationNumber} · ${updated.customerName}`,
      campsiteName: updated.campsite.name,
      details: detailMsg,
      changes,
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
    const adminId = searchParams.get('adminId') || 'SA-01';
    const userName = searchParams.get('userName') || undefined;

    const current = await prisma.reservation.findUnique({
      where: { id },
      include: { campsite: true },
    });

    if (!current) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    await prisma.reservation.delete({ where: { id } });

    await logAuditAction({
      action: ActionType.DELETE,
      adminId,
      userName,
      targetType: 'RESERVATION',
      targetId: id,
      targetLabel: `${current.reservationNumber} · ${current.customerName}`,
      campsiteName: current.campsite.name,
      details: `حذف الحجز ${current.reservationNumber} للزائر ${current.customerName}`,
      changes: buildChanges(
        current as unknown as Record<string, unknown>,
        {},
        ['customerName', 'customerPhone', 'country', 'guestCount', 'totalAmount', 'depositAmount', 'status']
      ),
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
