import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction, buildCreationSnapshot, buildChanges } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { ActionType, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        adminId: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

async function nextAdminId(role: Role): Promise<string> {
  const prefix = role === Role.SUPER_ADMIN ? 'SA' : role === Role.ADMIN ? 'ADM' : 'HOST';
  const existing = await prisma.user.findMany({
    where: { adminId: { startsWith: `${prefix}-` } },
    select: { adminId: true },
  });

  const highest = existing.reduce((max, u) => {
    const num = parseInt(u.adminId.split('-')[1] || '0', 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);

  return `${prefix}-${String(highest + 1).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, role, requesterRole, requesterAdminId, requesterName } = body;

    if (requesterRole !== 'SUPER_ADMIN' && requesterRole !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'WEAK_PASSWORD' }, { status: 400 });
    }

    const allowedRoles =
      requesterRole === 'SUPER_ADMIN' ? ['SUPER_ADMIN', 'ADMIN', 'HOST'] : ['ADMIN', 'HOST'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'INVALID_ROLE' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'USERNAME_TAKEN' }, { status: 409 });
    }

    const adminId = await nextAdminId(role as Role);

    const newUser = await prisma.user.create({
      data: {
        adminId,
        username: cleanUsername,
        name: cleanUsername,
        passwordHash: hashPassword(cleanPassword),
        role: role as Role,
        createdBy: requesterAdminId || null,
      },
    });

    await logAuditAction({
      action: ActionType.CREATE,
      adminId: requesterAdminId || 'SA-01',
      userName: requesterName || requesterAdminId,
      userRole: requesterRole as Role,
      targetType: 'USER',
      targetId: newUser.id,
      targetLabel: `${newUser.username} (${newUser.adminId})`,
      details: `إنشاء حساب ${newUser.username} (${newUser.adminId})`,
      changes: buildCreationSnapshot(newUser as unknown as Record<string, unknown>, ['username', 'role']),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        adminId: newUser.adminId,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        createdBy: newUser.createdBy,
        createdAt: newUser.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, requesterRole, requesterAdminId, requesterName } = body;

    if (requesterRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    if (target.adminId === requesterAdminId) {
      return NextResponse.json({ success: false, error: 'CANNOT_DELETE_SELF' }, { status: 400 });
    }

    if (target.role === Role.SUPER_ADMIN) {
      const saCount = await prisma.user.count({ where: { role: Role.SUPER_ADMIN, isActive: true } });
      if (saCount <= 1) {
        return NextResponse.json({ success: false, error: 'LAST_SUPER_ADMIN' }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id: target.id } });

    await logAuditAction({
      action: ActionType.DELETE,
      adminId: requesterAdminId || 'SA-01',
      userName: requesterName || requesterAdminId,
      userRole: requesterRole as Role,
      targetType: 'USER',
      targetId: target.id,
      targetLabel: `${target.username} (${target.adminId})`,
      details: `حذف الحساب ${target.username} (${target.adminId})`,
      changes: buildChanges(target as unknown as Record<string, unknown>, {}, ['username', 'role']),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
