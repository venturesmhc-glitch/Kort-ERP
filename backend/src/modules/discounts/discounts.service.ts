import { randomBytes } from 'node:crypto';
import type { Discount, DiscountScope, DiscountType, Prisma } from '@prisma/client';
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
  scope: DiscountScope;
  applicableItems: string[];
  applicableCategories: string[];
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
  // applicableItems/applicableCategories solo tienen sentido para carritos de
  // Merch (filtran Article) - un cupon de Cortes discrimina un solo servicio,
  // no una lista de items.
  if (data.scope === 'CORTES' && (data.applicableItems.length > 0 || data.applicableCategories.length > 0)) {
    throw new AppError('Los cupones de cortes no pueden restringir por articulos o categorias');
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
  const scope = input.scope ?? 'MERCH';
  assertDiscountBusinessRules({
    type: input.type,
    value: input.value,
    scope,
    applicableItems: input.applicableItems ?? [],
    applicableCategories: input.applicableCategories ?? [],
    validFrom: input.validFrom,
    validUntil: input.validUntil,
  });
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
      scope,
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
    scope: input.scope ?? discount.scope,
    applicableItems: input.applicableItems ?? discount.applicableItems,
    applicableCategories: input.applicableCategories ?? discount.applicableCategories,
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
      scope: input.scope,
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

export interface PricedMerchItem {
  articleId: string;
  tipoProductoId: string;
  quantity: number;
  subtotal: number;
}

// Nucleo del calculo, comun a Merch y Cortes: switch de tipos preparado para
// sumar FREE_SHIPPING/BUNDLE mas adelante sin romper lo existente (ver
// prompt original). base ya viene acotado (subtotal de items aplicables o
// precio del corte), cap es el tope duro que nunca se puede superar.
function amountForBase(discount: Discount, base: number, cap: number): number {
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
  return Math.min(Math.max(rawAmount, 0), cap);
}

// El subtotal "aplicable" es el total del carrito salvo que el cupon tenga
// applicableItems/applicableCategories cargados, en cuyo caso se acota a los
// items que matchean alguno de los dos (ver prompt: "si no se especifica
// ningun item/categoria, se acepta aplicar sobre el total").
function applicableMerchSubtotal(discount: Discount, items: PricedMerchItem[], cartTotal: number): number {
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

export function calculateDiscountAmount(discount: Discount, items: PricedMerchItem[], cartTotal: number): number {
  const base = applicableMerchSubtotal(discount, items, cartTotal);
  return amountForBase(discount, base, cartTotal);
}

// Un corte es una sola linea (no hay carrito que restringir por item/
// categoria), asi que siempre descuenta sobre su propio precio.
export function calculateCorteDiscountAmount(discount: Discount, price: number): number {
  return amountForBase(discount, price, price);
}

async function priceMerchItems(
  items: { articleId: string; quantity: number }[]
): Promise<PricedMerchItem[]> {
  const articleIds = [...new Set(items.map((item) => item.articleId))];
  const articles = await prisma.article.findMany({ where: { id: { in: articleIds } } });
  const articleMap = new Map(articles.map((article) => [article.id, article]));

  for (const item of items) {
    const article = articleMap.get(item.articleId);
    if (!article || !article.active) {
      throw new NotFoundError(`Articulo no encontrado o inactivo: ${item.articleId}`);
    }
  }

  return items.map((item) => {
    const article = articleMap.get(item.articleId)!;
    return {
      articleId: item.articleId,
      tipoProductoId: article.tipoProductoId,
      quantity: item.quantity,
      subtotal: article.price * item.quantity,
    };
  });
}

export type EligibleDiscountResult = { ok: true; discount: Discount } | { ok: false; reason: string };

// Todo lo que no depende de una base monetaria (existencia, soft-delete,
// activo/inactivo, vigencia, usos totales agotados) vive aca en un solo
// lugar, reutilizado por la validacion publica y por los tres puntos de
// redencion (Ventas POS, Merch DELIVERED, Cortes) - para que lo que se le
// mostro al cliente y lo que realmente se cobra nunca diverjan.
export async function resolveEligibleDiscount(code: string, now: Date = new Date()): Promise<EligibleDiscountResult> {
  const discount = await prisma.discount.findFirst({
    where: { code: normalizeCode(code), deletedAt: null },
  });
  if (!discount) {
    return { ok: false, reason: 'Cupon inexistente' };
  }

  const expired = (discount.validFrom && discount.validFrom > now) || (discount.validUntil && discount.validUntil < now);
  if (!discount.isActive || expired) {
    return { ok: false, reason: 'Cupon inactivo o expirado' };
  }

  if (discount.maxUses !== null && discount.usesCount >= discount.maxUses) {
    return { ok: false, reason: 'Cupon con usos agotados' };
  }

  return { ok: true, discount };
}

// Redencion atomica y segura ante concurrencia: el guard usesCount < maxUses
// en el WHERE evita pasarse del tope aunque dos requests redimean el mismo
// cupon al mismo tiempo (si el guard no matchea, updateMany no toca nada en
// vez de tirar error - la llamada queda como no-op, ver cada punto de uso).
export async function incrementUsesCount(
  tx: Prisma.TransactionClient,
  discountId: string,
  maxUses: number | null
) {
  await tx.discount.updateMany({
    where: maxUses === null ? { id: discountId } : { id: discountId, usesCount: { lt: maxUses } },
    data: { usesCount: { increment: 1 } },
  });
}

interface PortionResult {
  subtotal: number;
  discountAmount: number;
  total: number;
}

interface ValidateDiscountResult {
  valid: boolean;
  reason?: string;
  discount?: { id: string; code: string; name: string; type: DiscountType; scope: DiscountScope };
  merch?: PortionResult;
  corte?: PortionResult;
}

// Validacion publica del checkout/wizard: nunca confia en el precio enviado
// por el cliente (mismo criterio que Ventas/Merch), lo recalcula desde el
// catalogo. No incrementa usesCount: eso pasa recien en cada punto de
// redencion real (ver incrementUsesCount). items (Merch) y corte (turno) se
// evaluan de forma independiente: si el cupon tiene scope BOTH y uno de los
// dos no aplica (fuera de scope o no llega al minimo), el otro igual puede
// resultar valido.
export async function validateDiscount(input: ValidateDiscountInput): Promise<ValidateDiscountResult> {
  const eligible = await resolveEligibleDiscount(input.code);
  if (!eligible.ok) {
    return { valid: false, reason: eligible.reason };
  }
  const { discount } = eligible;

  let merch: PortionResult | undefined;
  let corte: PortionResult | undefined;
  let reason: string | undefined;

  if (input.items && input.items.length > 0) {
    if (discount.scope === 'MERCH' || discount.scope === 'BOTH') {
      const priced = await priceMerchItems(input.items);
      const cartTotal = priced.reduce((sum, item) => sum + item.subtotal, 0);
      if (discount.minOrderAmount !== null && cartTotal < discount.minOrderAmount) {
        reason = reason ?? 'No se alcanzo el monto minimo de compra para este cupon';
      } else {
        const discountAmount = calculateDiscountAmount(discount, priced, cartTotal);
        merch = { subtotal: cartTotal, discountAmount, total: cartTotal - discountAmount };
      }
    } else {
      reason = reason ?? 'Este cupon no aplica a productos';
    }
  }

  if (input.corte) {
    if (discount.scope === 'CORTES' || discount.scope === 'BOTH') {
      const tipoCorte = await prisma.parameterItem.findUnique({ where: { id: input.corte.tipoCorteId } });
      if (!tipoCorte || tipoCorte.deletedAt || !tipoCorte.active) {
        throw new NotFoundError('Tipo de corte no encontrado');
      }
      const price = tipoCorte.price ?? 0;
      if (price <= 0) {
        reason = reason ?? 'Este tipo de corte no tiene precio configurado';
      } else if (discount.minOrderAmount !== null && price < discount.minOrderAmount) {
        reason = reason ?? 'No se alcanzo el monto minimo de compra para este cupon';
      } else {
        const discountAmount = calculateCorteDiscountAmount(discount, price);
        corte = { subtotal: price, discountAmount, total: price - discountAmount };
      }
    } else {
      reason = reason ?? 'Este cupon no aplica a turnos';
    }
  }

  if (!merch && !corte) {
    return { valid: false, reason: reason ?? 'Cupon no aplicable' };
  }

  return {
    valid: true,
    discount: { id: discount.id, code: discount.code, name: discount.name, type: discount.type, scope: discount.scope },
    merch,
    corte,
  };
}
