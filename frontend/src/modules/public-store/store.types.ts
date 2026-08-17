export interface CartItem {
  articuloId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  stockDisponible: number;
}

// Vinculo opcional con el turno: cuando la compra surge del flujo "ver
// mercancia" del wizard (turno todavia sin confirmar en ese momento, ver
// TurnoWizardPage), el checkout de merch ya se confirmo con un Sale propio.
// Guardamos su id para que, si el cliente vuelve a completar el turno, quede
// asociado (ver appointments.service.ts: attachMerchSaleIfValid).
const PENDING_MERCH_SALE_KEY = 'kort-merch-sale-id';

export function savePendingMerchSaleId(saleId: string) {
  sessionStorage.setItem(PENDING_MERCH_SALE_KEY, saleId);
}

export function loadPendingMerchSaleId(): string | null {
  return sessionStorage.getItem(PENDING_MERCH_SALE_KEY);
}

export function clearPendingMerchSaleId() {
  sessionStorage.removeItem(PENDING_MERCH_SALE_KEY);
}
