import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent, checkCapacityAvailability, releaseLock } from '@/lib/realtime';
import { buildCreationSnapshot, logAuditAction } from '@/lib/audit';
import { getSystemSettings, pricesOf } from '@/lib/settings';
import { calculateTotal } from '@/lib/pricing';
import { ActionType, ReservationStatus } from '@prisma/client';
import { CountryCount } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campsiteId = searchParams.get('campsiteId');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    // Query reservations sorted by visit date (startDate asc)
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
        startDate: 'asc', // Explicit requirement: sorted by 'visit date' (not creation date)
      },
    });

    // Calculate live stats for both previous and current/upcoming reservations (PENDING + CONFIRMED)
    // Cancelled are excluded from stats per spec
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

    // Visitor nationalities, ordered by how many bookings each country holds
    const countryTally = new Map<string, number>();
    allReserved.forEach((r) => {
      const code = r.country || 'SA';
      countryTally.set(code, (countryTally.get(code) || 0) + 1);
    });
    const countryCounts: CountryCount[] = [...countryTally.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

    const stats = {
      totalActiveReservations: allReserved.length,
      totalGuests: allReserved.reduce((acc, r) => acc + (r.guestCount || 0), 0),
      rentedCars: allReserved.reduce((acc, r) => acc + (r.rentedCars || 0), 0),
      rentedTents: allReserved.reduce((acc, r) => acc + (r.rentedTents || 0), 0),
      rentedBirds: allReserved.reduce((acc, r) => acc + (r.rentedBirds || 0), 0),
      rentedRabbits: allReserved.reduce((acc, r) => acc + (r.rentedRabbits || 0), 0),
      pendingCount: allReserved.filter((r) => r.status === 'PENDING').length,
      confirmedCount: allReserved.filter((r) => r.status === 'CONFIRMED').length,
      cancelledCount,
      totalAmount: allReserved.reduce((acc, r) => acc + (r.totalAmount || 0), 0),
      totalDeposits: allReserved.reduce((acc, r) => acc + (r.depositAmount || 0), 0),
      countryCounts,
    };

    return NextResponse.json({
      success: true,
      reservations: reservations.map((r) => ({
        ...r,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
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
      country = 'SA',
      guestCount = 1,
      rentedTents = 0,
      rentedCars = 0,
      rentedBirds = 0,
      rentedRabbits = 0,
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

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ success: false, error: 'INVALID_DATES' }, { status: 400 });
    }

    // Verify capacity limit before committing (excludes current host's lock so their own held slot is honored)
    const check = await checkCapacityAvailability(campsiteId, start, end, createdByAdminId);
    if (!check.available) {
      return NextResponse.json(
        { success: false, error: 'CAPACITY_REACHED', congestedDate: check.congestedDate },
        { status: 409 }
      );
    }

    const counts = {
      rentedTents: Number(rentedTents) || 0,
      rentedCars: Number(rentedCars) || 0,
      rentedBirds: Number(rentedBirds) || 0,
      rentedRabbits: Number(rentedRabbits) || 0,
    };

    const settings = await getSystemSettings();
    const totalAmount = calculateTotal(counts, pricesOf(settings));

    // Generate unique sequential reservation number
    const count = await prisma.reservation.count();
    const reservationNumber = `RES-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber,
        campsiteId,
        customerName,
        customerPhone,
        country: String(country || 'SA').toUpperCase(),
        guestCount: Number(guestCount) || 1,
        ...counts,
        notes,
        totalAmount,
        // A deposit agreed on the call stays informational: the booking is only
        // confirmed once the money actually lands.
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

    // Release the temporary lock held by this host
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
        'rentedTents',
        'rentedCars',
        'rentedBirds',
        'rentedRabbits',
        'totalAmount',
        'depositAmount',
        'notes',
        'status',
      ]),
    });

    const formattedRes = {
      ...reservation,
      startDate: reservation.startDate.toISOString(),
      endDate: reservation.endDate.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    };

    // Broadcast new reservation to all connected clients
    broadcastRealtimeEvent({
      type: 'RESERVATION_CREATED',
      payload: formattedRes,
    });

    return NextResponse.json({ success: true, reservation: formattedRes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
