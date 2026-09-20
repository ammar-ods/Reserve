import { SystemSetting } from '@prisma/client';
import { prisma } from './prisma';
import { DEFAULT_PAGE_TITLE, DEFAULT_TABLE_HEADERS } from './defaults';
import { SystemSettingsDTO } from './types';

export async function getSystemSettings(): Promise<SystemSetting> {
  const existing = await prisma.systemSetting.findUnique({ where: { id: 'global_config' } });
  if (existing) return existing;

  return prisma.systemSetting.create({
    data: {
      id: 'global_config',
      pageTitle: DEFAULT_PAGE_TITLE,
      tableHeaders: DEFAULT_TABLE_HEADERS,
    },
  });
}

export function formatSettings(settings: SystemSetting): SystemSettingsDTO {
  return {
    id: settings.id,
    pageTitle: settings.pageTitle,
    tableHeaders: {
      ...DEFAULT_TABLE_HEADERS,
      ...((settings.tableHeaders as Partial<SystemSettingsDTO['tableHeaders']>) || {}),
    },
    updatedBy: settings.updatedBy,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
