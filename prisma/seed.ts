import { PrismaClient, Role, ReservationStatus, ActionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Users (Super Admin, Admin, 3 Hosts)
  const users = [
    {
      adminId: 'SA-01',
      name: 'Sarah Jenkins',
      email: 'superadmin@reserve.local',
      role: Role.SUPER_ADMIN,
    },
    {
      adminId: 'ADM-01',
      name: 'David Miller',
      email: 'admin@reserve.local',
      role: Role.ADMIN,
    },
    {
      adminId: 'HOST-01',
      name: 'Amina Clark',
      email: 'host1@reserve.local',
      role: Role.HOST,
    },
    {
      adminId: 'HOST-02',
      name: 'Marcus Thorne',
      email: 'host2@reserve.local',
      role: Role.HOST,
    },
    {
      adminId: 'HOST-03',
      name: 'Elena Rodriguez',
      email: 'host3@reserve.local',
      role: Role.HOST,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { adminId: u.adminId },
      update: { name: u.name, email: u.email, role: u.role },
      create: u,
    });
  }
  console.log('Users seeded.');

  // 2. Seed Campsites
  const campsites = [
    {
      slug: 'pine-ridge',
      name: 'Pine Ridge Sanctuary',
      description: 'Scenic evergreen ridge with whispering pines and shaded tent clearings.',
      dailyCapacity: 3,
      iconName: 'Trees',
    },
    {
      slug: 'lakeview-haven',
      name: 'Lakeview Haven',
      description: 'Lakeside retreat with immediate water access, wooden fishing pier, and calm waters.',
      dailyCapacity: 4,
      iconName: 'Waves',
    },
    {
      slug: 'whispering-woods',
      name: 'Whispering Woods',
      description: 'Deep ancient timberland offering privacy, wildlife observation, and dark night skies.',
      dailyCapacity: 2,
      iconName: 'Compass',
    },
    {
      slug: 'mountain-peak',
      name: 'Mountain Peak Outpost',
      description: 'High-elevation panoramic plateau with sunrise vistas and cool mountain air.',
      dailyCapacity: 3,
      iconName: 'Mountain',
    },
  ];

  const createdCampsites: Record<string, string> = {};
  for (const c of campsites) {
    const site = await prisma.campsite.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        dailyCapacity: c.dailyCapacity,
        iconName: c.iconName,
      },
      create: c,
    });
    createdCampsites[c.slug] = site.id;
  }
  console.log('Campsites seeded.');

  // 3. Seed System Settings
  await prisma.systemSetting.upsert({
    where: { id: 'global_config' },
    update: {},
    create: {
      id: 'global_config',
      pageTitle: 'Reserve - Campsite Reservation System',
      tableHeaders: {
        colId: 'Reservation ID',
        colCustomer: 'Customer / Phone',
        colDates: 'Visit Dates',
        colGuests: 'Guests',
        colGear: 'Rented Gear & Pets',
        colStatus: 'Status',
        colHost: 'Host (Admin ID)',
        colActions: 'Actions',
      },
      updatedBy: 'ADM-01',
    },
  });
  console.log('System settings seeded.');

  // 4. Seed Initial Sample Reservations
  const existingResCount = await prisma.reservation.count();
  if (existingResCount === 0) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const addDays = (d: Date, days: number) => {
      const res = new Date(d);
      res.setDate(res.getDate() + days);
      return res;
    };

    const initialReservations = [
      {
        reservationNumber: 'RES-2026-0001',
        campsiteId: createdCampsites['pine-ridge'],
        customerName: 'Robert Langdon',
        customerPhone: '+1 (555) 234-8901',
        guestCount: 4,
        rentedTents: 2,
        rentedCars: 1,
        rentedBirds: 0,
        rentedRabbits: 2,
        notes: 'Requested site spot near the trail entrance.',
        startDate: addDays(today, 1),
        endDate: addDays(today, 4),
        status: ReservationStatus.CONFIRMED,
        createdByAdminId: 'HOST-01',
      },
      {
        reservationNumber: 'RES-2026-0002',
        campsiteId: createdCampsites['pine-ridge'],
        customerName: 'Claire Redfield',
        customerPhone: '+1 (555) 345-6789',
        guestCount: 2,
        rentedTents: 1,
        rentedCars: 1,
        rentedBirds: 1,
        rentedRabbits: 0,
        notes: 'Bringing 1 parrot companion cage.',
        startDate: addDays(today, 2),
        endDate: addDays(today, 5),
        status: ReservationStatus.PENDING,
        createdByAdminId: 'HOST-02',
      },
      {
        reservationNumber: 'RES-2026-0003',
        campsiteId: createdCampsites['lakeview-haven'],
        customerName: 'Arthur Morgan',
        customerPhone: '+1 (555) 987-6543',
        guestCount: 5,
        rentedTents: 3,
        rentedCars: 2,
        rentedBirds: 2,
        rentedRabbits: 1,
        notes: 'Late evening arrival expected around 8 PM.',
        startDate: addDays(today, 3),
        endDate: addDays(today, 7),
        status: ReservationStatus.CONFIRMED,
        createdByAdminId: 'HOST-01',
      },
      {
        reservationNumber: 'RES-2026-0004',
        campsiteId: createdCampsites['whispering-woods'],
        customerName: 'Leon Kennedy',
        customerPhone: '+1 (555) 456-7890',
        guestCount: 2,
        rentedTents: 1,
        rentedCars: 1,
        rentedBirds: 0,
        rentedRabbits: 0,
        notes: 'Cancelled due to severe rain forecast.',
        startDate: addDays(today, 1),
        endDate: addDays(today, 3),
        status: ReservationStatus.CANCELLED,
        createdByAdminId: 'HOST-03',
      },
      {
        reservationNumber: 'RES-2026-0005',
        campsiteId: createdCampsites['mountain-peak'],
        customerName: 'Sophia Loren',
        customerPhone: '+1 (555) 678-1234',
        guestCount: 3,
        rentedTents: 2,
        rentedCars: 1,
        rentedBirds: 1,
        rentedRabbits: 3,
        notes: 'Kids requested rental rabbits for campsite pet activity.',
        startDate: addDays(today, 4),
        endDate: addDays(today, 8),
        status: ReservationStatus.CONFIRMED,
        createdByAdminId: 'HOST-02',
      },
    ];

    for (const r of initialReservations) {
      const res = await prisma.reservation.create({ data: r });
      // Create initial audit log for demonstration
      await prisma.auditLog.create({
        data: {
          action: ActionType.CREATE,
          adminId: r.createdByAdminId,
          userRole: Role.HOST,
          userName: r.createdByAdminId === 'HOST-01' ? 'Amina Clark' : r.createdByAdminId === 'HOST-02' ? 'Marcus Thorne' : 'Elena Rodriguez',
          targetType: 'RESERVATION',
          targetId: res.id,
          campsiteName: campsites.find((c) => createdCampsites[c.slug] === r.campsiteId)?.name,
          details: `Phone booking received for ${r.customerName} (${r.startDate.toISOString().split('T')[0]} to ${r.endDate.toISOString().split('T')[0]})`,
        },
      });
    }
    console.log('Sample reservations and audit logs seeded.');
  }

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
