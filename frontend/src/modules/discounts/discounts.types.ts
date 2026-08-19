export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'ITEM_PERCENTAGE' | 'ITEM_FIXED_AMOUNT';
export type DiscountScope = 'MERCH' | 'CORTES' | 'BOTH';

export interface Discount {
  id: string;
  code: string;
  name: string;
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  usesCount: number;
  applicableItems: string[];
  applicableCategories: string[];
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
}
