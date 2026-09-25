import type { PromoRecord } from "../db/db";

type PromoCartItem = { id: string; price: number; qty: number };

export type PromoCalculation = {
  eligible: boolean;
  discount: number;
  base: number;
  reason?: string;
};

function localDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

export function isPromoDateValid(promo: PromoRecord, now = new Date()) {
  const date = localDate(now);
  return date >= promo.startDate && date <= promo.endDate;
}

export function calculatePromoDiscount(
  promo: PromoRecord,
  cart: PromoCartItem[],
  subtotal: number,
  outletId: string,
  now = new Date()
): PromoCalculation {
  if (!promo.active) return { eligible: false, discount: 0, base: 0, reason: "Promo tidak aktif." };
  if (!isPromoDateValid(promo, now)) return { eligible: false, discount: 0, base: 0, reason: "Promo di luar periode berlaku." };
  if (promo.outletIds?.length && !promo.outletIds.includes(outletId)) {
    return { eligible: false, discount: 0, base: 0, reason: "Promo tidak berlaku di outlet ini." };
  }
  if (promo.maxUses && promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
    return { eligible: false, discount: 0, base: 0, reason: "Batas pemakaian promo sudah tercapai." };
  }
  if (subtotal < (Number(promo.minSubtotal) || 0)) {
    return { eligible: false, discount: 0, base: 0, reason: "Minimum transaksi " + Math.round(promo.minSubtotal).toLocaleString("id-ID") + "." };
  }

  const productIds = Array.isArray(promo.productIds) ? promo.productIds : [];
  const base = productIds.length
    ? cart.filter(item => productIds.includes(item.id)).reduce((n, item) => n + (Number(item.price) || 0) * (Number(item.qty) || 0), 0)
    : subtotal;

  if (base <= 0) return { eligible: false, discount: 0, base: 0, reason: "Tidak ada produk yang memenuhi promo." };

  let discount = promo.type === "PERCENT"
    ? base * ((Number(promo.value) || 0) / 100)
    : Number(promo.value) || 0;

  discount = Math.max(0, Math.min(discount, base));
  if (promo.maxDiscount && promo.maxDiscount > 0) discount = Math.min(discount, promo.maxDiscount);

  return { eligible: true, discount: Math.floor(discount), base };
}

export function promoRuleLabel(promo: PromoRecord) {
  const value = promo.type === "PERCENT"
    ? (Number(promo.value) || 0) + "%"
    : "Rp " + Math.round(Number(promo.value) || 0).toLocaleString("id-ID");
  const min = Number(promo.minSubtotal) > 0 ? " · min " + Math.round(promo.minSubtotal).toLocaleString("id-ID") : "";
  const cap = Number(promo.maxDiscount) > 0 ? " · maks " + Math.round(Number(promo.maxDiscount)||0).toLocaleString("id-ID") : "";
  return value + min + cap;
}
