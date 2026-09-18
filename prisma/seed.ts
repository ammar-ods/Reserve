import { PrismaClient, Role } from '@prisma/client';
import { randomBytes, scryptSync } from 'crypto';

const prisma = new PrismaClient();

// Mirrors src/lib/auth.ts: the seed must never store a readable password.
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
  { slug: 'standard-camp', name: 'مخيم عادي', dailyCapacity: 3, iconName: 'Tent', sortOrder: 2 },
  { slug: 'elite-camp', name: 'مخيم النخبة', dailyCapacity: 2, iconName: 'Crown', sortOrder: 3 },
  { slug: 'private-camp', name: 'المخيم الخاص', dailyCapacity: 1, iconName: 'Home', sortOrder: 4 },
];

// Slugs from the pre-production demo data set.
const LEGACY_CAMPSITE_SLUGS = ['pine-ridge', 'lakeview-haven', 'whispering-woods', 'mountain-peak'];

const TABLE_HEADERS = {
  colId: 'رقم الحجز',
  colCustomer: 'الزائر / الجوال',
  colDates: 'تاريخ الزيارة',
  colGuests: 'الزوار',
  colItems: 'المستأجرات',
  colTotal: 'الإجمالي',
  colDeposit: 'العربون',
  colStatus: 'الحالة',
  colHost: 'الموظف',
  colActions: 'الإجراءات',
};

async function main() {
  console.log('Seeding محمية المرزوم booking system...');

  // 1. Drop the demo campsites (cascades their reservations and locks)
  const removed = await prisma.campsite.deleteMany({
    where: { slug: { in: LEGACY_CAMPSITE_SLUGS } },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} legacy demo campsite(s).`);
  }

  // 2. The Super Admin is the only account the system starts with; it creates the rest.
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { username: SUPER_ADMIN.username },
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

  // 3. The four campsites of the reserve
  for (const site of CAMPSITES) {
    await prisma.campsite.upsert({
      where: { slug: site.slug },
      update: { name: site.name, iconName: site.iconName, sortOrder: site.sortOrder },
      create: site,
    });
  }
  console.log('Campsites seeded.');

  // 4. Global configuration. Unit prices start at zero: the Admin sets them
  //    alongside the daily caps before the first booking is taken.
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
