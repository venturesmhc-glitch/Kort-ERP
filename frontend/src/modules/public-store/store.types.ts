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
// Guardamos su id (para asociarlo al turno al confirmar, ver
// appointments.service.ts: attachMerchSaleIfValid) junto con un resumen
// liviano (total, cantidad de items) para mostrarlo en el paso de
// confirmacion del wizard sin tener que volver a pedirlo al backend.
const PENDING_MERCH_SALE_KEY = 'kort-merch-sale-id';

export interface PendingMerchSale {
  saleId: string;
  total: number;
  itemCount: number;
}

export function savePendingMerchSale(sale: PendingMerchSale) {
  sessionStorage.setItem(PENDING_MERCH_SALE_KEY, JSON.stringify(sale));
}

export function loadPendingMerchSale(): PendingMerchSale | null {
  const raw = sessionStorage.getItem(PENDING_MERCH_SALE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingMerchSale;
  } catch {
    return null;
  }
}

export function clearPendingMerchSaleId() {
  sessionStorage.removeItem(PENDING_MERCH_SALE_KEY);
}
