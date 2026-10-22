export interface GrowthSettings {
  loyaltyEnabled: boolean;
  loyaltyEarnRatio: number;
  loyaltyRedeemRatio: number;
  reactivationEnabled: boolean;
  reactivationInactiveDays: number;
  reactivationCooldownDays: number;
  reactivationDiscountId: string | null;
  reviewRequestEnabled: boolean;
  reviewRequestDelayHours: number;
  googleReviewUrl: string | null;
}
