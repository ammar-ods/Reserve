import { SystemSetting } from '@prisma/client';
import { prisma } from './prisma';
import { DEFAULT_PAGE_TITLE, DEFAULT_TABLE_HEADERS } from './defaults';
import { ItemPrices, SystemSettingsDTO } from './types';

// Single source of truth for reading the global configuration row.
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
    priceTent: settings.priceTent,
    priceCar: settings.priceCar,
    priceBird: settings.priceBird,
    priceRabbit: settings.priceRabbit,
    updatedBy: settings.updatedBy,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export function pricesOf(settings: SystemSetting): ItemPrices {
  return {
    priceTent: settings.priceTent,
    priceCar: settings.priceCar,
    priceBird: settings.priceBird,
    priceRabbit: settings.priceRabbit,
  };
}
