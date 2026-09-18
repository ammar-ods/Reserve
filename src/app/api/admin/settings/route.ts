import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent } from '@/lib/realtime';
import { buildChanges, logAuditAction } from '@/lib/audit';
import { formatSettings, getSystemSettings } from '@/lib/settings';
import { DEFAULT_TABLE_HEADERS } from '@/lib/defaults';
import { ActionType, Role } from '@prisma/client';
import { SystemSettingsDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PRICE_FIELDS = ['priceTent', 'priceCar', 'priceBird', 'priceRabbit'] as const;

export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({ success: true, settings: formatSettings(settings) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageTitle, tableHeaders, adminId, userName, requesterRole } = body;

    if (requesterRole && requesterRole !== 'ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const current = await getSystemSettings();

    const prices: Record<string, number> = {};
    for (const field of PRICE_FIELDS) {
      if (body[field] !== undefined) {
        prices[field] = Math.max(0, Number(body[field]) || 0);
      }
    }

    const nextHeaders = tableHeaders
      ? { ...DEFAULT_TABLE_HEADERS, ...(tableHeaders as Partial<SystemSettingsDTO['tableHeaders']>) }
      : (current.tableHeaders as SystemSettingsDTO['tableHeaders']);

    const updated = await prisma.systemSetting.update({
      where: { id: 'global_config' },
      data: {
        pageTitle: pageTitle || current.pageTitle,
        tableHeaders: nextHeaders,
        ...prices,
        updatedBy: adminId || current.updatedBy,
      },
    });

    const formatted = formatSettings(updated);

    broadcastRealtimeEvent({ type: 'SETTINGS_UPDATED', payload: formatted });

    const changes = buildChanges(
      current as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ['pageTitle', 'priceTent', 'priceCar', 'priceBird', 'priceRabbit', 'tableHeaders']
    );

    if (changes.length > 0) {
      await logAuditAction({
        action: ActionType.SETTING_UPDATE,
        adminId: adminId || 'SA-01',
        userName,
        userRole: requesterRole as Role | undefined,
        targetType: 'SETTINGS',
        targetId: 'global_config',
        targetLabel: updated.pageTitle,
        details: 'تعديل إعدادات النظام والأسعار',
        changes,
      });
    }

    return NextResponse.json({ success: true, settings: formatted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
