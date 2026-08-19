import { apiRequest } from '../../lib/apiClient';
import type { Discount, DiscountScope, DiscountType } from './discounts.types';
import type { DiscountFormValues } from './discounts.schema';

interface DiscountDto {
  id: string;
  code: string;
  name: string;
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  usesCount: number;
  applicableItems: string[];
  applicableCategories: string[];
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

function toDiscount(dto: DiscountDto): Discount {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    type: dto.type,
    scope: dto.scope,
    value: dto.value,
    maxDiscountAmount: dto.maxDiscountAmount ?? undefined,
    minOrderAmount: dto.minOrderAmount ?? undefined,
    maxUses: dto.maxUses ?? undefined,
    maxUsesPerUser: dto.maxUsesPerUser ?? undefined,
    usesCount: dto.usesCount,
    applicableItems: dto.applicableItems,
    applicableCategories: dto.applicableCategories,
    validFrom: dto.validFrom ?? undefined,
    validUntil: dto.validUntil ?? undefined,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
  };
}

function fromFormValues(input: DiscountFormValues) {
  return {
    code: input.code || undefined,
    name: input.name,
    type: input.type,
    scope: input.scope,
    value: input.value,
    maxDiscountAmount: input.maxDiscountAmount,
    minOrderAmount: input.minOrderAmount,
    maxUses: input.maxUses,
    maxUsesPerUser: input.maxUsesPerUser,
    applicableItems: input.applicableItems ?? [],
    applicableCategories: input.applicableCategories ?? [],
    validFrom: input.validFrom || undefined,
    validUntil: input.validUntil || undefined,
    isActive: input.isActive,
  };
}

export async function listDiscountsRequest(): Promise<Discount[]> {
  const dtos = await apiRequest<DiscountDto[]>('/discounts');
  return dtos.map(toDiscount);
}

export async function createDiscountRequest(input: DiscountFormValues): Promise<Discount> {
  const dto = await apiRequest<DiscountDto>('/discounts', { method: 'POST', body: fromFormValues(input) });
  return toDiscount(dto);
}

export async function updateDiscountRequest(id: string, input: DiscountFormValues): Promise<Discount> {
  const dto = await apiRequest<DiscountDto>(`/discounts/${id}`, { method: 'PATCH', body: fromFormValues(input) });
  return toDiscount(dto);
}

export function deleteDiscountRequest(id: string): Promise<void> {
  return apiRequest<void>(`/discounts/${id}`, { method: 'DELETE' });
}

export interface DiscountPortion {
  subtotal: number;
  discountAmount: number;
  total: number;
}

export interface ValidateDiscountResult {
  valid: boolean;
  reason?: string;
  discount?: { id: string; code: string; name: string; type: DiscountType; scope: DiscountScope };
  merch?: DiscountPortion;
  corte?: DiscountPortion;
}

// Endpoint publico (sin auth) reutilizado tanto por el wizard de turnos como
// por el formulario de Ventas del panel (no hace falta auth para solo
// consultar si un codigo es valido).
export function validateDiscountRequest(input: {
  code: string;
  items?: { articleId: string; quantity: number }[];
  merchSaleId?: string;
  corte?: { tipoCorteId: string };
}): Promise<ValidateDiscountResult> {
  return apiRequest<ValidateDiscountResult>('/public/discounts/validate', {
    method: 'POST',
    auth: false,
    body: input,
  });
}
