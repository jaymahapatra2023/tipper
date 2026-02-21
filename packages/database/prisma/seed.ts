import { PrismaClient, UserRole, HotelStatus, QrCodeStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Simple hash for seed data only - real auth uses bcrypt
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

function generateQrCode(): string {
  return randomBytes(6).toString('hex');
}

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.tipDistribution.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.tip.deleteMany();
  await prisma.roomAssignment.deleteMany();
  await prisma.qrCode.deleteMany();
  await prisma.room.deleteMany();
  await prisma.staffMember.deleteMany();
  await prisma.hotelAdmin.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.platformSettings.deleteMany();

  // Platform settings
  await prisma.platformSettings.create({
    data: { defaultPlatformFeePercent: 10 },
  });

  // Platform admin
  const platformAdmin = await prisma.user.create({
    data: {
      email: 'admin@tipper.app',
      passwordHash: await hashPassword('Admin123!'),
      name: 'Platform Admin',
      role: UserRole.platform_admin,
      emailVerified: true,
    },
  });

  // Hotel admin user
  const hotelAdminUser = await prisma.user.create({
    data: {
      email: 'manager@grandhotel.com',
      passwordHash: await hashPassword('Hotel123!'),
      name: 'Sarah Johnson',
      role: UserRole.hotel_admin,
      emailVerified: true,
    },
  });

  // Demo hotel
  const hotel = await prisma.hotel.create({
    data: {
      name: 'The Grand Hotel',
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'US',
      phone: '+1-415-555-0100',
      email: 'info@grandhotel.com',
      website: 'https://grandhotel.com',
      status: HotelStatus.approved,
      suggestedAmounts: [500, 1000, 1500],
      minTipAmount: 100,
      maxTipAmount: 50000,
      poolingEnabled: false,
      primaryColor: '#0f1b2d',
      secondaryColor: '#1a2744',
    },
  });

  // Link admin to hotel
  await prisma.hotelAdmin.create({
    data: {
      userId: hotelAdminUser.id,
      hotelId: hotel.id,
      isPrimary: true,
    },
  });

  // Create rooms (3 floors, 5 rooms each)
  const rooms = [];
  for (let floor = 1; floor <= 3; floor++) {
    for (let room = 1; room <= 5; room++) {
      const roomNumber = `${floor}0${room}`;
      const created = await prisma.room.create({
        data: {
          hotelId: hotel.id,
          roomNumber,
          floor,
          roomType: room <= 3 ? 'standard' : 'deluxe',
        },
      });
      rooms.push(created);
    }
  }

  // Generate QR codes for all rooms
  for (const room of rooms) {
    await prisma.qrCode.create({
      data: {
        roomId: room.id,
        code: generateQrCode(),
        status: QrCodeStatus.active,
      },
    });
  }

  // Create staff users
  const staffUsers = [];
  const staffNames = ['Maria Garcia', 'James Wilson', 'Ana Rodriguez'];
  for (let i = 0; i < staffNames.length; i++) {
    const user = await prisma.user.create({
      data: {
        email: `staff${i + 1}@grandhotel.com`,
        passwordHash: await hashPassword('Staff123!'),
        name: staffNames[i],
        role: UserRole.staff,
        emailVerified: true,
      },
    });
    staffUsers.push(user);
  }

  // Create staff members linked to hotel
  const staffMembers = [];
  for (const user of staffUsers) {
    const member = await prisma.staffMember.create({
      data: {
        userId: user.id,
        hotelId: hotel.id,
        poolOptIn: false,
      },
    });
    staffMembers.push(member);
  }

  // Create room assignments for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < rooms.length; i++) {
    const staffIndex = i % staffMembers.length;
    await prisma.roomAssignment.create({
      data: {
        staffMemberId: staffMembers[staffIndex].id,
        roomId: rooms[i].id,
        assignedDate: today,
      },
    });
  }

  // Create a sample guest user
  await prisma.user.create({
    data: {
      email: 'guest@example.com',
      passwordHash: await hashPassword('Guest123!'),
      name: 'John Doe',
      role: UserRole.guest,
      emailVerified: true,
    },
  });

  console.log('Seed completed!');
  console.log(`  - Platform admin: admin@tipper.app / Admin123!`);
  console.log(`  - Hotel admin: manager@grandhotel.com / Hotel123!`);
  console.log(`  - Staff: staff1@grandhotel.com / Staff123!`);
  console.log(`  - Guest: guest@example.com / Guest123!`);
  console.log(`  - Hotel: ${hotel.name} (${rooms.length} rooms)`);

  // Print QR codes for testing
  const qrCodes = await prisma.qrCode.findMany({
    include: { room: true },
    orderBy: { room: { roomNumber: 'asc' } },
  });
  console.log('\nQR Codes:');
  for (const qr of qrCodes) {
    console.log(`  Room ${qr.room.roomNumber}: /tip/${qr.code}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
