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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
