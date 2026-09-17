import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';
import { ActionType, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, role, adminId, requesterRole } = body;

    if (requesterRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Super Admin can create Admin and Host accounts.' },
        { status: 403 }
      );
    }

    if (!name || !email || !role || !adminId) {
      return NextResponse.json(
        { success: false, error: 'Missing required user fields (name, email, role, adminId)' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ adminId }, { email }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A user with this Admin ID or Email already exists' },
        { status: 409 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role as Role,
        adminId,
      },
    });

    await logAuditAction({
      action: ActionType.CREATE,
      adminId: 'SA-01',
      userName: 'Super Admin',
      userRole: Role.SUPER_ADMIN,
      targetType: 'USER',
      targetId: newUser.id,
      details: `Created new ${role} account: ${name} (${adminId})`,
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
