import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { runWithTenant } from '../src/lib/tenantContext.js';
import { seedDefaultParameterCatalogs } from '../src/lib/defaultParameterCatalogs.js';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

const BARBEROS = [
  {
    email: 'carlos.gomez@kort.local',
    firstName: 'Carlos',
    lastName: 'Gomez',
    schedule: [
      ...WEEKDAYS.map((dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '18:00' })),
      { dayOfWeek: 'SAT' as const, startTime: '09:00', endTime: '13:00' },
    ],
  },
  {
    email: 'lucas.fernandez@kort.local',
    firstName: 'Lucas',
    lastName: 'Fernandez',
    schedule: WEEKDAYS.map((dayOfWeek) => ({ dayOfWeek, startTime: '10:00', endTime: '19:00' })),
  },
];

async function seedBarberos() {
  const tenantId = getTenantId();
  const defaultPassword = await bcrypt.hash('Password123!', 12);

  for (const barbero of BARBEROS) {
    const user = await prisma.user.upsert({
      where: { email: barbero.email },
      update: {},
      create: {
        tenantId,
        email: barbero.email,
        password: defaultPassword,
        firstName: barbero.firstName,
        lastName: barbero.lastName,
        role: 'BARBERO',
      },
    });

    for (const slot of barbero.schedule) {
      await prisma.workSchedule.upsert({
        where: { barberoId_dayOfWeek: { barberoId: user.id, dayOfWeek: slot.dayOfWeek } },
        update: {},
        create: { tenantId, barberoId: user.id, ...slot },
      });
    }
  }

  console.log(`Barberos de ejemplo listos: ${BARBEROS.map((b) => b.email).join(', ')}`);
}

// Tenant de desarrollo: el seed asume un unico tenant local (slug "default"),
// mismo tenant que crea la migracion de multi-tenancy al backfillear datos
// preexistentes (ver 20261022120000_add_multi_tenancy/migration.sql). El
// upsert por slug reutiliza ese tenant si ya existe en vez de duplicarlo.
async function seedTenant() {
  return prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: { slug: 'default', name: 'Mi Barberia' },
  });
}

async function main() {
  const tenant = await seedTenant();
  console.log(`Tenant listo: ${tenant.slug} (${tenant.id})`);

  // Todo lo que sigue corre dentro del contexto de este tenant: cada query
  // Prisma sobre un modelo tenant-scoped (ver lib/prisma.ts) queda acotada
  // automaticamente a el.
  await runWithTenant(tenant.id, async () => {
    const email = process.env.SEED_ADMIN_EMAIL ?? 'dev@kort.local';
    const password = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!';
    const hashedPassword = await bcrypt.hash(password, 12);

    const devUser = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        tenantId: tenant.id,
        email,
        password: hashedPassword,
        firstName: 'Dev',
        lastName: 'Kort',
        role: 'DEV',
      },
    });

    console.log(`Usuario Dev listo: ${devUser.email}`);

    await seedDefaultParameterCatalogs();
    console.log('Catalogos de parametrizados listos.');
    await seedBarberos();
    await prisma.appointmentSettings.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: { tenantId: tenant.id, slotMinutes: 30 },
    });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
