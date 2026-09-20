import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  bookedCampTypesForRange,
  broadcastRealtimeEvent,
  checkCampTypeAvailability,
  checkCapacityAvailability,
  releaseLock,
} from '@/lib/realtime';
import { buildCreationSnapshot, logAuditAction } from '@/lib/audit';
import { ActionType, ReservationStatus, VisitPeriod } from '@prisma/client';
import { CountryCount } from '@/lib/types';
import { hasCampTypeField, hasTentsField, hasVisitPeriodField, isDayUse, isPrivateCampTypeId } from '@/lib/campsites';
import { isValidBookingRange } from '@/lib/dates';

export const dynamic = 'force-dynamic';

function formatReservation(
  reservation: Record<string, unknown> & {
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
    createdByAdminId: string;
  },
  hostNames: Map<string, string>
) {
  return {
    ...reservation,
    createdByName: hostNames.get(reservation.createdByAdminId) || reservation.createdByAdminId,
    startDate: reservation.startDate.toISOString(),
    endDate: reservation.endDate.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

async function hostNameMap(adminIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(adminIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { adminId: { in: unique } },
    select: { adminId: true, name: true, username: true },
  });
  return new Map(users.map((u) => [u.adminId, u.name || u.username]));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campsiteId = searchParams.get('campsiteId');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    const reservations = await prisma.reservation.findMany({
      where: {
        ...(campsiteId ? { campsiteId } : {}),
        ...(status && status !== 'ALL' ? { status: status as ReservationStatus } : {}),
        ...(search
          ? {
              OR: [
                { customerName: { contains: search, mode: 'insensitive' } },
                { reservationNumber: { contains: search, mode: 'insensitive' } },
                { customerPhone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        campsite: {
          select: { id: true, slug: true, name: true },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const names = await hostNameMap(reservations.map((r) => r.createdByAdminId));

    const allReserved = await prisma.reservation.findMany({
      where: {
        ...(campsiteId ? { campsiteId } : {}),
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: {
        startDate: true,
        endDate: true,
        country: true,
        guestCount: true,
        rentedCars: true,
        rentedTents: true,
        rentedBirds: true,
        rentedRabbits: true,
        rentedSalukis: true,
        rentedGazelles: true,
        totalAmount: true,
        depositAmount: true,
        status: true,
      },
    });

    const cancelledCount = await prisma.reservation.count({
      where: {
        ...(campsiteId ? { campsiteId } : {}),
        status: 'CANCELLED',
      },
    });

    const countryTally = new Map<string, { bookings: number; guests: number }>();
    allReserved.forEach((r) => {
      const code = r.country || 'AE';
      const current = countryTally.get(code) || { bookings: 0, guests: 0 };
      current.bookings += 1;
      current.guests += r.guestCount || 0;
      countryTally.set(code, current);
    });
    const countryCounts: CountryCount[] = [...countryTally.entries()]
      .map(([code, value]) => ({ code, bookings: value.bookings, guests: value.guests }))
      .sort((a, b) => b.bookings - a.bookings || a.code.localeCompare(b.code));

    const stats = {
      totalActiveReservations: allReserved.length,
      totalGuests: allReserved.reduce((acc, r) => acc + (r.guestCount || 0), 0),
      rentedCars: allReserved.reduce((acc, r) => acc + (r.rentedCars || 0), 0),
      rentedTents: allReserved.reduce((acc, r) => acc + (r.rentedTents || 0), 0),
      rentedBirds: allReserved.reduce((acc, r) => acc + (r.rentedBirds || 0), 0),
      rentedRabbits: allReserved.reduce((acc, r) => acc + (r.rentedRabbits || 0), 0),
      rentedSalukis: allReserved.reduce((acc, r) => acc + (r.rentedSalukis || 0), 0),
      rentedGazelles: allReserved.reduce((acc, r) => acc + (r.rentedGazelles || 0), 0),
      pendingCount: allReserved.filter((r) => r.status === 'PENDING').length,
      confirmedCount: allReserved.filter((r) => r.status === 'CONFIRMED').length,
      cancelledCount,
      totalAmount: allReserved.reduce((acc, r) => acc + (r.totalAmount || 0), 0),
      totalDeposits: allReserved.reduce((acc, r) => acc + (r.depositAmount || 0), 0),
      countryCounts,
    };

    return NextResponse.json({
      success: true,
      reservations: reservations.map((r) => formatReservation(r, names)),
      stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campsiteId,
      customerName,
      customerPhone,
      country = 'AE',
      guestCount = 1,
      rentedTents = 0,
      rentedCars = 0,
      rentedBirds = 0,
      rentedRabbits = 0,
      rentedSalukis = 0,
      rentedGazelles = 0,
      visitPeriod,
      campType,
      notes = '',
      depositAmount,
      startDate,
      endDate,
      createdByAdminId,
      hostName,
    } = body;

    if (!campsiteId || !customerName || !customerPhone || !startDate || !endDate || !createdByAdminId) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const campsite = await prisma.campsite.findUnique({ where: { id: campsiteId } });
    if (!campsite) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isValidBookingRange(start, end, isDayUse(campsite.slug))) {
      return NextResponse.json({ success: false, error: 'INVALID_DATES' }, { status: 400 });
    }

    if (hasVisitPeriodField(campsite.slug) && visitPeriod !== 'MORNING' && visitPeriod !== 'EVENING') {
      return NextResponse.json({ success: false, error: 'MISSING_PERIOD' }, { status: 400 });
    }

    if (hasCampTypeField(campsite.slug)) {
      if (!campType || !isPrivateCampTypeId(String(campType))) {
        return NextResponse.json({ success: false, error: 'MISSING_CAMP_TYPE' }, { status: 400 });
      }
      const typeCheck = await checkCampTypeAvailability(campsiteId, String(campType), start, end);
      if (!typeCheck.available) {
        return NextResponse.json(
          { success: false, error: 'CAMP_TYPE_TAKEN', congestedDate: typeCheck.congestedDate },
          { status: 409 }
        );
      }
    }

    const check = await checkCapacityAvailability(campsiteId, start, end, createdByAdminId);
    if (!check.available) {
      return NextResponse.json(
        { success: false, error: 'CAPACITY_REACHED', congestedDate: check.congestedDate },
        { status: 409 }
      );
    }

    const count = await prisma.reservation.count();
    const reservationNumber = `RES-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber,
        campsiteId,
        customerName,
        customerPhone,
        country: String(country || 'AE').toUpperCase(),
        guestCount: Number(guestCount) || 1,
        rentedTents: hasTentsField(campsite.slug) ? Number(rentedTents) || 0 : 0,
        rentedCars: Number(rentedCars) || 0,
        rentedBirds: Number(rentedBirds) || 0,
        rentedRabbits: Number(rentedRabbits) || 0,
        rentedSalukis: Number(rentedSalukis) || 0,
        rentedGazelles: Number(rentedGazelles) || 0,
        visitPeriod: hasVisitPeriodField(campsite.slug) ? (visitPeriod as VisitPeriod) : null,
        campType: hasCampTypeField(campsite.slug) ? String(campType) : null,
        notes,
        totalAmount: 0,
        depositAmount:
          depositAmount === undefined || depositAmount === null || depositAmount === ''
            ? null
            : Math.max(0, Number(depositAmount) || 0),
        startDate: start,
        endDate: end,
        status: ReservationStatus.PENDING,
        createdByAdminId,
      },
      include: {
        campsite: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    await releaseLock(campsiteId, createdByAdminId);

    await logAuditAction({
      action: ActionType.CREATE,
      adminId: createdByAdminId,
      userName: hostName || createdByAdminId,
      targetType: 'RESERVATION',
      targetId: reservation.id,
      targetLabel: `${reservationNumber} · ${reservation.customerName}`,
      campsiteName: reservation.campsite.name,
      details: `إضافة حجز جديد ${reservationNumber} للزائر ${reservation.customerName}`,
      changes: buildCreationSnapshot(reservation as unknown as Record<string, unknown>, [
        'customerName',
        'customerPhone',
        'country',
        'guestCount',
        'startDate',
        'endDate',
        'visitPeriod',
        'campType',
        'rentedTents',
        'rentedCars',
        'rentedBirds',
        'rentedRabbits',
        'rentedSalukis',
        'rentedGazelles',
        'depositAmount',
        'notes',
        'status',
      ]),
    });

    const names = await hostNameMap([reservation.createdByAdminId]);
    const formattedRes = formatReservation(reservation, names);

    broadcastRealtimeEvent({
      type: 'RESERVATION_CREATED',
      payload: formattedRes as any,
    });

    return NextResponse.json({
      success: true,
      reservation: formattedRes,
      bookedCampTypes: hasCampTypeField(campsite.slug)
        ? await bookedCampTypesForRange(campsiteId, start, end)
        : [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
