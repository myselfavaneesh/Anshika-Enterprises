/**
 * GST Calculation Service
 * Pure functions for Indian Goods and Services Tax (GST) calculations.
 * Covers intra-state (CGST + SGST) vs inter-state (IGST),
 * tax-inclusive vs tax-exclusive pricing, and combo item allocation.
 */

export const SHOP_STATE_CODE = '09'; // Uttar Pradesh

export interface LineTaxResult {
  taxableUnitPrice: number;
  taxableTotalPrice: number;
  taxRate: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalPrice: number;
}

export interface CalculateLineTaxInput {
  unitPrice: number;
  quantity: number;
  gstRate: number;
  isGstInclusive: boolean;
  placeOfSupplyCode?: string | null;
  supplierStateCode?: string;
  isNonGst?: boolean;
}

/**
 * Calculates tax breakdown for an individual line item.
 */
export function calculateLineTax({
  unitPrice,
  quantity,
  gstRate,
  isGstInclusive,
  placeOfSupplyCode,
  supplierStateCode = SHOP_STATE_CODE,
  isNonGst = false,
}: CalculateLineTaxInput): LineTaxResult {
  const effectiveGstRate = isNonGst ? 0 : Number(gstRate) || 0;
  const totalPrice = Number((unitPrice * quantity).toFixed(2));

  let taxableTotalPrice = totalPrice;
  let taxAmount = 0;

  if (effectiveGstRate > 0) {
    if (isGstInclusive) {
      taxableTotalPrice = Number((totalPrice / (1 + effectiveGstRate / 100)).toFixed(2));
      taxAmount = Number((totalPrice - taxableTotalPrice).toFixed(2));
    } else {
      taxableTotalPrice = totalPrice;
      taxAmount = Number((totalPrice * (effectiveGstRate / 100)).toFixed(2));
    }
  }

  const taxableUnitPrice = quantity > 0 
    ? Number((taxableTotalPrice / quantity).toFixed(2)) 
    : 0;

  // Inter-state when placeOfSupply differs from supplier's state (default: 09 UP)
  const isInterState = placeOfSupplyCode 
    ? placeOfSupplyCode !== supplierStateCode 
    : false;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = taxAmount;
  } else {
    cgstAmount = Number((taxAmount / 2).toFixed(2));
    // Ensure sum of CGST and SGST equals total tax (handles odd paise rounding)
    sgstAmount = Number((taxAmount - cgstAmount).toFixed(2));
  }

  const finalTotalPrice = isGstInclusive 
    ? totalPrice 
    : Number((taxableTotalPrice + taxAmount).toFixed(2));

  return {
    taxableUnitPrice,
    taxableTotalPrice,
    taxRate: effectiveGstRate,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalPrice: finalTotalPrice,
  };
}

export interface ComboItemInput {
  productId: string;
  quantity: number;
  catalogPrice: number;
  wattage?: number;
  gstRate: number;
}

export interface AllocatedComboItem extends LineTaxResult {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Allocates a fixed combo package price across individual combo items
 * weighted by catalog value, and calculates respective GST breakdowns.
 */
export function allocateComboItems(
  comboTotalPrice: number,
  isGstInclusive: boolean,
  items: ComboItemInput[],
  placeOfSupplyCode?: string | null,
  isNonGst = false
): AllocatedComboItem[] {
  if (items.length === 0) return [];

  const itemWeights = items.map((item) => {
    const calcQty = (item.wattage || 0) > 0 ? item.quantity * item.wattage! : item.quantity;
    return calcQty * item.catalogPrice;
  });

  const totalBaseWeight = itemWeights.reduce((sum, w) => sum + w, 0);

  let allocatedSum = 0;
  const results: AllocatedComboItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let allocatedPrice = 0;

    if (i === items.length - 1) {
      allocatedPrice = Number((comboTotalPrice - allocatedSum).toFixed(2));
    } else {
      allocatedPrice = totalBaseWeight > 0
        ? Number(((comboTotalPrice * itemWeights[i]) / totalBaseWeight).toFixed(2))
        : Number((comboTotalPrice / items.length).toFixed(2));
    }
    allocatedSum += allocatedPrice;

    const calcQty = (item.wattage || 0) > 0 ? item.quantity * item.wattage! : item.quantity;
    const unitPrice = calcQty > 0 ? Number((allocatedPrice / calcQty).toFixed(2)) : 0;

    const taxResult = calculateLineTax({
      unitPrice: allocatedPrice,
      quantity: 1, // Treat allocatedPrice as line total
      gstRate: item.gstRate,
      isGstInclusive,
      placeOfSupplyCode,
      isNonGst,
    });

    results.push({
      ...taxResult,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      taxableUnitPrice: calcQty > 0 ? Number((taxResult.taxableTotalPrice / calcQty).toFixed(2)) : 0,
    });
  }

  return results;
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
}

/**
 * Computes aggregate invoice totals and 2-decimal round-off.
 */
export function calculateInvoiceTotals(
  items: Array<{ taxableTotalPrice: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalPrice: number }>,
  discount = 0
): InvoiceTotals {
  const taxableAmount = items.reduce((sum, it) => sum + Number(it.taxableTotalPrice), 0);
  const cgstAmount = items.reduce((sum, it) => sum + Number(it.cgstAmount), 0);
  const sgstAmount = items.reduce((sum, it) => sum + Number(it.sgstAmount), 0);
  const igstAmount = items.reduce((sum, it) => sum + Number(it.igstAmount), 0);
  const taxAmount = cgstAmount + sgstAmount + igstAmount;

  const rawGrandTotal = taxableAmount + taxAmount - discount;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

  return {
    subtotal: Number(taxableAmount.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
    igstAmount: Number(igstAmount.toFixed(2)),
    roundOff,
    grandTotal: roundedGrandTotal,
  };
}
