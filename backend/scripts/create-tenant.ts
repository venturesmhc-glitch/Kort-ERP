// Alta de una barberia nueva (tenant). Reemplaza al viejo flujo "levantar un
// deploy propio para este cliente": ahora es correr este script una vez
// contra la base compartida. Pensado para que lo corra el Dev/Mariano a
// mano durante el onboarding (la venta es manual/alto-contacto para los
// primeros clientes, ver docs del plan de comercializacion) - no hay UI de
// self-signup todavia.
//
// Uso:
//   npm run create-tenant -- --slug mi-barberia --name "Mi Barberia" --email dev@mibarberia.com [--password Secreta123!]
//
// Si no se pasa --password, se genera una temporal y se imprime una sola vez
// (no se guarda en ningun lado): quien la reciba debe cambiarla despues del
// primer login.
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { runWithTenant } from '../src/lib/tenantContext.js';
import { seedDefaultParameterCatalogs } from '../src/lib/defaultParameterCatalogs.js';

interface Args {
  slug: string;
  name: string;
  email: string;
  password?: string;
}

function parseArgs(): Args {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Falta el valor de --${key}`);
    }
    args[key] = value;
    i += 1;
  }

  const { slug, name, email, password } = args;
  if (!slug || !name || !email) {
    console.error(
      'Uso: npm run create-tenant -- --slug <slug> --name "<Nombre>" --email <admin@mail.com> [--password <contrasena>]'
    );
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('El slug solo puede tener minusculas, numeros y guiones (ej. "mi-barberia")');
  }
  return { slug, name, email, password };
}

function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

async function main() {
  const { slug, name, email, password } = parseArgs();

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    throw new Error(`Ya existe un tenant con slug "${slug}"`);
  }

  const tenant = await prisma.tenant.create({ data: { slug, name } });

  await runWithTenant(tenant.id, async () => {
    const plainPassword = password ?? generateTempPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const devUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        password: hashedPassword,
        firstName: 'Dev',
        lastName: name,
        role: 'DEV',
      },
    });

    await prisma.appointmentSettings.create({ data: { tenantId: tenant.id } });
    await prisma.organizationSettings.create({ data: { tenantId: tenant.id } });
    await prisma.businessSettings.create({ data: { tenantId: tenant.id, name } });
    await seedDefaultParameterCatalogs();

    console.log('\nTenant creado:');
    console.log(`  slug:  ${tenant.slug}`);
    console.log(`  id:    ${tenant.id}`);
    console.log(`  admin: ${devUser.email}`);
    if (!password) {
      console.log(`  password temporal: ${plainPassword}  (cambiarla despues del primer login)`);
    }
    console.log(`\nWizard publico: /t/${tenant.slug}/`);
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
