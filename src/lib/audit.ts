import { ActionType, Role } from '@prisma/client';
import { prisma } from './prisma';

interface LogActionParams {
  action: ActionType;
  adminId: string;
  userName?: string;
  userRole?: Role;
  targetType: 'RESERVATION' | 'CAMPSITE' | 'LOCK' | 'SETTINGS' | 'USER';
  targetId?: string;
  campsiteName?: string;
  details: string;
}

export async function logAuditAction(params: LogActionParams) {
  try {
    let userName = params.userName;
    let userRole = params.userRole;

    if (!userName || !userRole) {
      const user = await prisma.user.findUnique({
        where: { adminId: params.adminId },
        select: { name: true, role: true },
      });
      if (user) {
        userName = userName || user.name;
        userRole = userRole || user.role;
      }
    }

    await prisma.auditLog.create({
      data: {
        action: params.action,
        adminId: params.adminId,
        userName: userName || `Host (${params.adminId})`,
        userRole: userRole || Role.HOST,
        targetType: params.targetType,
        targetId: params.targetId,
        campsiteName: params.campsiteName,
        details: params.details,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
