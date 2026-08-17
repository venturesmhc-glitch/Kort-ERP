import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'dev@kort.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const devUser = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      firstName: 'Dev',
      lastName: 'Kort',
      role: 'DEV',
    },
  });

  console.log(`Usuario Dev listo: ${devUser.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
