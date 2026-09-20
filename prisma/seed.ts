import { PrismaClient, Role } from '@prisma/client';
import { randomBytes, scryptSync } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

const SUPER_ADMIN = {
  adminId: 'SA-01',
  username: 'superadmin',
  name: 'superadmin',
  password: 'SA2026',
};

const CAMPSITES = [
  { slug: 'day-use', name: 'حجز بدون مبيت', dailyCapacity: 3, iconName: 'Sun', sortOrder: 1 },
  { slug: 'elite-camp', name: 'مخيم النخبة (عادي)', dailyCapacity: 2, iconName: 'Crown', sortOrder: 2 },
  { slug: 'private-camp', name: 'المخيم الخاص', dailyCapacity: 5, iconName: 'Home', sortOrder: 3 },
];

const REMOVED_CAMPSITE_SLUGS = [
  'pine-ridge',
  'lakeview-haven',
  'whispering-woods',
  'mountain-peak',
  'standard-camp',
];

const TABLE_HEADERS = {
  colId: 'رقم الحجز',
  colCustomer: 'الزائر / الجوال',
  colDates: 'تاريخ الزيارة',
  colCheckIn: 'تاريخ الدخول',
  colCheckOut: 'تاريخ الخروج',
  colGuests: 'الزوار',
  colItems: 'المستأجرات',
  colDeposit: 'العربون',
  colStatus: 'الحالة',
  colHost: 'الموظف',
  colActions: 'الإجراءات',
};

async function main() {
  console.log('Seeding محمية المرزوم booking system...');

  const removed = await prisma.campsite.deleteMany({
    where: { slug: { in: REMOVED_CAMPSITE_SLUGS } },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} unused campsite(s).`);
  }

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { adminId: SUPER_ADMIN.adminId },
  });

  if (existingSuperAdmin) {
    console.log('Super Admin already present, password left untouched.');
  } else {
    await prisma.user.create({
      data: {
        adminId: SUPER_ADMIN.adminId,
        username: SUPER_ADMIN.username,
        name: SUPER_ADMIN.name,
        passwordHash: hashPassword(SUPER_ADMIN.password),
        role: Role.SUPER_ADMIN,
      },
    });
    console.log(`Super Admin created: ${SUPER_ADMIN.username}`);
  }

  for (const site of CAMPSITES) {
    await prisma.campsite.upsert({
      where: { slug: site.slug },
      update: { name: site.name, iconName: site.iconName, sortOrder: site.sortOrder, dailyCapacity: site.dailyCapacity },
      create: site,
    });
  }
  console.log('Campsites seeded.');

  await prisma.systemSetting.upsert({
    where: { id: 'global_config' },
    update: { tableHeaders: TABLE_HEADERS },
    create: {
      id: 'global_config',
      pageTitle: 'حجوزات محمية المرزوم',
      tableHeaders: TABLE_HEADERS,
      priceTent: 0,
      priceCar: 0,
      priceBird: 0,
      priceRabbit: 0,
      updatedBy: SUPER_ADMIN.adminId,
    },
  });
  console.log('System settings seeded.');

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
