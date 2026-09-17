import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent, checkCapacityAvailability, releaseLock } from '@/lib/realtime';
import { logAuditAction } from '@/lib/audit';
import { ActionType, ReservationStatus } from '@prisma/client';

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
    const now = new Date();
    const allReserved = await prisma.reservation.findMany({
      where: {
        ...(campsiteId ? { campsiteId } : {}),
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: {
        startDate: true,
        endDate: true,
        guestCount: true,
        rentedCars: true,
        rentedTents: true,
        rentedBirds: true,
        rentedRabbits: true,
        status: true,
      },
    });

    const cancelledCount = await prisma.reservation.count({
      where: {
        ...(campsiteId ? { campsiteId } : {}),
        status: 'CANCELLED',
      },
    });

    const pastReservations = allReserved.filter((r) => new Date(r.endDate) < now);
    const currentOrUpcoming = allReserved.filter((r) => new Date(r.endDate) >= now);

    const stats = {
      // Total combined count across both previous and current/upcoming reservations
      totalActiveReservations: allReserved.length,
      totalGuests: allReserved.reduce((acc, r) => acc + (r.guestCount || 0), 0),
      rentedCars: allReserved.reduce((acc, r) => acc + (r.rentedCars || 0), 0),
      rentedTents: allReserved.reduce((acc, r) => acc + (r.rentedTents || 0), 0),
      rentedBirds: allReserved.reduce((acc, r) => acc + (r.rentedBirds || 0), 0),
      rentedRabbits: allReserved.reduce((acc, r) => acc + (r.rentedRabbits || 0), 0),
      pendingCount: allReserved.filter((r) => r.status === 'PENDING').length,
      confirmedCount: allReserved.filter((r) => r.status === 'CONFIRMED').length,
      cancelledCount,
      pastCount: pastReservations.length,
      upcomingCount: currentOrUpcoming.length,
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
      guestCount = 1,
      rentedTents = 0,
      rentedCars = 0,
      rentedBirds = 0,
      rentedRabbits = 0,
      notes = '',
      startDate,
      endDate,
      status = 'PENDING',
      createdByAdminId,
      hostName,
    } = body;

    if (!campsiteId || !customerName || !customerPhone || !startDate || !endDate || !createdByAdminId) {
      return NextResponse.json(
        { success: false, error: 'Missing required reservation fields' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json(
        { success: false, error: 'Invalid dates. End date must be strictly after start date.' },
        { status: 400 }
      );
    }

    // Verify capacity limit before committing (excludes current host's lock so their own held slot is honored)
    const check = await checkCapacityAvailability(campsiteId, start, end, createdByAdminId);
    if (!check.available) {
      return NextResponse.json({ success: false, error: check.reason }, { status: 409 });
    }

    // Generate unique sequential reservation number
    const count = await prisma.reservation.count();
    const reservationNumber = `RES-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber,
        campsiteId,
        customerName,
        customerPhone,
        guestCount: Number(guestCount) || 1,
        rentedTents: Number(rentedTents) || 0,
        rentedCars: Number(rentedCars) || 0,
        rentedBirds: Number(rentedBirds) || 0,
        rentedRabbits: Number(rentedRabbits) || 0,
        notes,
        startDate: start,
        endDate: end,
        status: status as ReservationStatus,
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

    // Audit log entry
    await logAuditAction({
      action: ActionType.CREATE,
      adminId: createdByAdminId,
      userName: hostName || createdByAdminId,
      targetType: 'RESERVATION',
      targetId: reservation.id,
      campsiteName: reservation.campsite.name,
      details: `Created reservation ${reservationNumber} for ${customerName} (${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}). Status: ${status}`,
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
