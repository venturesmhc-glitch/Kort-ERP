import { randomBytes } from 'node:crypto';
import type { Discount, DiscountType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, ConflictError, NotFoundError } from '../../utils/errors.js';
import type { CreateDiscountInput, UpdateDiscountInput, ValidateDiscountInput } from './discounts.schema.js';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 8;

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function randomCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await prisma.discount.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
  }
  throw new AppError('No se pudo generar un codigo unico, intenta nuevamente');
}

function assertDiscountBusinessRules(data: {
  type: DiscountType;
  value: number;
  validFrom?: Date | null;
  validUntil?: Date | null;
}) {
  const isPercentage = data.type === 'PERCENTAGE' || data.type === 'ITEM_PERCENTAGE';
  if (isPercentage && data.value > 100) {
    throw new AppError('El porcentaje no puede ser mayor a 100');
  }
  if (data.validFrom && data.validUntil && data.validFrom >= data.validUntil) {
    throw new AppError('La fecha de fin debe ser posterior a la fecha de inicio');
  }
}

// applicableItems/applicableCategories no se confian tal cual vienen del
// cliente: se validan contra el catalogo real (Article y ParameterItem de la
// categoria "tipos-producto") antes de guardarlos.
async function assertApplicableRefs(applicableItems?: string[], applicableCategories?: string[]) {
  if (applicableItems && applicableItems.length > 0) {
    const ids = [...new Set(applicableItems)];
    const count = await prisma.article.count({ where: { id: { in: ids } } });
    if (count !== ids.length) {
      throw new NotFoundError('Alguno de los articulos seleccionados no existe');
    }
  }

  if (applicableCategories && applicableCategories.length > 0) {
    const ids = [...new Set(applicableCategories)];
    const count = await prisma.parameterItem.count({
      where: { id: { in: ids }, deletedAt: null, category: { key: 'tipos-producto' } },
    });
    if (count !== ids.length) {
      throw new NotFoundError('Alguna de las categorias seleccionadas no existe');
    }
  }
}

export function listDiscounts() {
  return prisma.discount.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
}

export async function getDiscount(id: string) {
  const discount = await prisma.discount.findFirst({ where: { id, deletedAt: null } });
  if (!discount) {
    throw new NotFoundError('Cupon no encontrado');
  }
  return discount;
}

export async function createDiscount(input: CreateDiscountInput) {
  assertDiscountBusinessRules(input);
  await assertApplicableRefs(input.applicableItems, input.applicableCategories);

  const code = input.code ?? (await generateUniqueCode());
  if (input.code) {
    const existing = await prisma.discount.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError('Ya existe un cupon con ese codigo');
    }
  }

  return prisma.discount.create({
    data: {
      code,
      name: input.name,
      type: input.type,
      value: input.value,
      maxDiscountAmount: input.maxDiscountAmount,
      minOrderAmount: input.minOrderAmount,
      maxUses: input.maxUses,
      maxUsesPerUser: input.maxUsesPerUser,
      applicableItems: input.applicableItems ?? [],
      applicableCategories: input.applicableCategories ?? [],
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateDiscount(id: string, input: UpdateDiscountInput) {
  const discount = await getDiscount(id);

  assertDiscountBusinessRules({
    type: input.type ?? discount.type,
    value: input.value ?? discount.value,
    validFrom: input.validFrom !== undefined ? input.validFrom : discount.validFrom,
    validUntil: input.validUntil !== undefined ? input.validUntil : discount.validUntil,
  });
  await assertApplicableRefs(input.applicableItems, input.applicableCategories);

  let code = input.code;
  if (code && code !== discount.code) {
    const existing = await prisma.discount.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError('Ya existe un cupon con ese codigo');
    }
  } else {
    code = undefined;
  }

  return prisma.discount.update({
    where: { id },
    data: {
      code,
      name: input.name,
      type: input.type,
      value: input.value,
      maxDiscountAmount: input.maxDiscountAmount,
      minOrderAmount: input.minOrderAmount,
      maxUses: input.maxUses,
      maxUsesPerUser: input.maxUsesPerUser,
      applicableItems: input.applicableItems,
      applicableCategories: input.applicableCategories,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      isActive: input.isActive,
    },
  });
}

// Soft delete (mismo patron que Articulos/Parametrizados): un cupon que ya
// fue usado no se borra fisico, para no perder trazabilidad en ventas
// historicas.
export async function deleteDiscount(id: string) {
  await getDiscount(id);
  await prisma.discount.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}

interface PricedItem {
  articleId: string;
  tipoProductoId: string;
  quantity: number;
  subtotal: number;
}

// El subtotal "aplicable" es el total del carrito salvo que el cupon tenga
// applicableItems/applicableCategories cargados, en cuyo caso se acota a los
// items que matchean alguno de los dos (ver prompt: "si no se especifica
// ningun item/categoria, se acepta aplicar sobre el total").
function applicableSubtotal(discount: Discount, items: PricedItem[], cartTotal: number): number {
  const hasRestriction = discount.applicableItems.length > 0 || discount.applicableCategories.length > 0;
  if (!hasRestriction) {
    return cartTotal;
  }
  return items
    .filter(
      (item) =>
        discount.applicableItems.includes(item.articleId) ||
        discount.applicableCategories.includes(item.tipoProductoId)
    )
    .reduce((sum, item) => sum + item.subtotal, 0);
}

// Switch de tipos preparado para sumar FREE_SHIPPING/BUNDLE mas adelante sin
// romper lo existente (ver prompt original).
function calculateDiscountAmount(discount: Discount, items: PricedItem[], cartTotal: number): number {
  const base = applicableSubtotal(discount, items, cartTotal);

  let rawAmount: number;
  switch (discount.type) {
    case 'PERCENTAGE':
    case 'ITEM_PERCENTAGE': {
      rawAmount = Math.round((base * discount.value) / 100);
      if (discount.maxDiscountAmount != null) {
        rawAmount = Math.min(rawAmount, discount.maxDiscountAmount);
      }
      break;
    }
    case 'FIXED_AMOUNT':
    case 'ITEM_FIXED_AMOUNT': {
      rawAmount = Math.min(discount.value, base);
      break;
    }
    default:
      throw new AppError('Tipo de descuento no soportado');
  }

  return Math.min(Math.max(rawAmount, 0), cartTotal);
}

interface ValidDiscountResult {
  valid: true;
  discount: { id: string; code: string; name: string; type: DiscountType };
  discountAmount: number;
  subtotal: number;
  total: number;
}

interface InvalidDiscountResult {
  valid: false;
  reason: string;
  discountAmount: 0;
  subtotal: number;
  total: number;
}

// Validacion publica del checkout: nunca confia en el precio del carrito
// enviado por el cliente (mismo criterio que Ventas/Merch), lo recalcula
// desde el catalogo. No incrementa usesCount: eso solo pasa cuando el cupon
// se aplica a una compra confirmada (integracion pendiente con Ventas/Merch).
export async function validateDiscount(
  input: ValidateDiscountInput
): Promise<ValidDiscountResult | InvalidDiscountResult> {
  const articleIds = [...new Set(input.items.map((item) => item.articleId))];
  const articles = await prisma.article.findMany({ where: { id: { in: articleIds } } });
  const articleMap = new Map(articles.map((article) => [article.id, article]));

  for (const item of input.items) {
    const article = articleMap.get(item.articleId);
    if (!article || !article.active) {
      throw new NotFoundError(`Articulo no encontrado o inactivo: ${item.articleId}`);
    }
  }

  const pricedItems: PricedItem[] = input.items.map((item) => {
    const article = articleMap.get(item.articleId)!;
    return {
      articleId: item.articleId,
      tipoProductoId: article.tipoProductoId,
      quantity: item.quantity,
      subtotal: article.price * item.quantity,
    };
  });
  const cartTotal = pricedItems.reduce((sum, item) => sum + item.subtotal, 0);

  const invalid = (reason: string): InvalidDiscountResult => ({
    valid: false,
    reason,
    discountAmount: 0,
    subtotal: cartTotal,
    total: cartTotal,
  });

  const discount = await prisma.discount.findFirst({
    where: { code: normalizeCode(input.code), deletedAt: null },
  });
  if (!discount) {
    return invalid('Cupon inexistente');
  }

  const now = new Date();
  const expired = (discount.validFrom && discount.validFrom > now) || (discount.validUntil && discount.validUntil < now);
  if (!discount.isActive || expired) {
    return invalid('Cupon inactivo o expirado');
  }

  if (discount.maxUses !== null && discount.usesCount >= discount.maxUses) {
    return invalid('Cupon con usos agotados');
  }

  if (discount.minOrderAmount !== null && cartTotal < discount.minOrderAmount) {
    return invalid('No se alcanzo el monto minimo de compra para este cupon');
  }

  const discountAmount = calculateDiscountAmount(discount, pricedItems, cartTotal);

  return {
    valid: true,
    discount: { id: discount.id, code: discount.code, name: discount.name, type: discount.type },
    discountAmount,
    subtotal: cartTotal,
    total: cartTotal - discountAmount,
  };
}
