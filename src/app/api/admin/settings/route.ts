import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastRealtimeEvent } from '@/lib/realtime';
import { buildChanges, logAuditAction } from '@/lib/audit';
import { formatSettings, getSystemSettings } from '@/lib/settings';
import { ActionType, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

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
    const { pageTitle, adminId, userName, requesterRole } = body;

    if (requesterRole && requesterRole !== 'ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const current = await getSystemSettings();

    const updated = await prisma.systemSetting.update({
      where: { id: 'global_config' },
      data: {
        pageTitle: pageTitle || current.pageTitle,
        updatedBy: adminId || current.updatedBy,
      },
    });

    const formatted = formatSettings(updated);

    broadcastRealtimeEvent({ type: 'SETTINGS_UPDATED', payload: formatted });

    const changes = buildChanges(
      current as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ['pageTitle']
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
        details: 'تعديل إعدادات النظام',
        changes,
      });
    }

    return NextResponse.json({ success: true, settings: formatted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
