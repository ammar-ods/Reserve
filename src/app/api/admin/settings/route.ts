import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent } from '@/lib/realtime';
import { logAuditAction } from '@/lib/audit';
import { ActionType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'global_config' },
    });

    if (!settings) {
      const defaultSettings = await prisma.systemSetting.create({
        data: {
          id: 'global_config',
          pageTitle: 'Reserve - Campsite Reservation System',
          tableHeaders: {
            colId: 'Reservation ID',
            colCustomer: 'Customer / Contact',
            colDates: 'Visit Dates',
            colGuests: 'Guests',
            colGear: 'Rented Gear & Pets',
            colStatus: 'Booking Status',
            colHost: 'Host (Admin ID)',
            colActions: 'Actions',
          },
          updatedBy: 'ADM-01',
        },
      });
      return NextResponse.json({ success: true, settings: defaultSettings });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageTitle, tableHeaders, adminId, userName } = body;

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'global_config' },
      update: {
        pageTitle: pageTitle || undefined,
        tableHeaders: tableHeaders || undefined,
        updatedBy: adminId || 'ADM-01',
      },
      create: {
        id: 'global_config',
        pageTitle: pageTitle || 'Reserve - Campsite Reservation System',
        tableHeaders: tableHeaders || {
          colId: 'Reservation ID',
          colCustomer: 'Customer / Contact',
          colDates: 'Visit Dates',
          colGuests: 'Guests',
          colGear: 'Rented Gear & Pets',
          colStatus: 'Booking Status',
          colHost: 'Host (Admin ID)',
          colActions: 'Actions',
        },
        updatedBy: adminId || 'ADM-01',
      },
    });

    // Broadcast to active browsers
    broadcastRealtimeEvent({
      type: 'SETTINGS_UPDATED',
      payload: {
        id: updated.id,
        pageTitle: updated.pageTitle,
        tableHeaders: updated.tableHeaders as any,
        updatedBy: updated.updatedBy,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });

    // Audit log
    await logAuditAction({
      action: ActionType.SETTING_UPDATE,
      adminId: adminId || 'ADM-01',
      userName: userName || 'Admin',
      targetType: 'SETTINGS',
      targetId: 'global_config',
      details: `Updated table headers and site view settings`,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
