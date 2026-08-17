import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PARAMETER_CATALOGS = [
  {
    key: 'tipos-corte',
    name: 'Tipos de corte',
    items: [
      { name: 'Corte clasico' },
      { name: 'Fade' },
      { name: 'Diseno' },
      { name: 'Barba' },
      { name: 'Combo corte + barba' },
    ],
  },
  {
    key: 'tipos-producto',
    name: 'Tipos de producto',
    items: [{ name: 'Cosmetica' }, { name: 'Indumentaria' }, { name: 'Accesorios' }],
  },
  {
    key: 'categorias-costos',
    name: 'Categorias de costos',
    items: [
      { name: 'Alquiler', description: 'Costo fijo' },
      { name: 'Insumos', description: 'Costo variable' },
      { name: 'Servicios (luz, agua, internet)' },
      { name: 'Sueldos', description: 'Costo fijo' },
    ],
  },
  {
    key: 'categorias-ingresos',
    name: 'Categorias de ingresos',
    items: [{ name: 'Cortes' }, { name: 'Ventas merchandising' }, { name: 'Otros' }],
  },
];

async function seedParameterCatalogs() {
  for (const [categoryOrder, catalog] of PARAMETER_CATALOGS.entries()) {
    const category = await prisma.parameterCategory.upsert({
      where: { key: catalog.key },
      update: {},
      create: { key: catalog.key, name: catalog.name, isSystem: true, order: categoryOrder },
    });

    for (const [itemOrder, item] of catalog.items.entries()) {
      await prisma.parameterItem.upsert({
        where: { categoryId_name: { categoryId: category.id, name: item.name } },
        update: {},
        create: { ...item, categoryId: category.id, order: itemOrder },
      });
    }
  }

  console.log('Catalogos de parametrizados listos.');
}

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
  const defaultPassword = await bcrypt.hash('Password123!', 10);

  for (const barbero of BARBEROS) {
    const user = await prisma.user.upsert({
      where: { email: barbero.email },
      update: {},
      create: {
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
        create: { barberoId: user.id, ...slot },
      });
    }
  }

  console.log(`Barberos de ejemplo listos: ${BARBEROS.map((b) => b.email).join(', ')}`);
}

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

  await seedParameterCatalogs();
  await seedBarberos();
  await prisma.appointmentSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, slotMinutes: 30 },
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
