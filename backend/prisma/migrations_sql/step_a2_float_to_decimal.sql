-- Migration: Float to Decimal for Monetary and Rate fields
-- Precision: NUMERIC(12, 2) for currency amounts (up to 9,999,999,999.99 INR)
-- Precision: NUMERIC(5, 2) for percentage rates (0.00% to 100.00%)
-- Preserves physical metrics like `wattage` as DOUBLE PRECISION.

BEGIN;

-- 1. Product
ALTER TABLE "Product"
  ALTER COLUMN "gstRate" TYPE NUMERIC(5, 2) USING ROUND("gstRate"::numeric, 2),
  ALTER COLUMN "purchasePrice" TYPE NUMERIC(12, 2) USING ROUND("purchasePrice"::numeric, 2),
  ALTER COLUMN "sellingPrice" TYPE NUMERIC(12, 2) USING ROUND("sellingPrice"::numeric, 2);

-- 2. Customer
ALTER TABLE "Customer"
  ALTER COLUMN "creditLimit" TYPE NUMERIC(12, 2) USING ROUND("creditLimit"::numeric, 2),
  ALTER COLUMN "outstandingBalance" TYPE NUMERIC(12, 2) USING ROUND("outstandingBalance"::numeric, 2);

-- 3. Supplier
ALTER TABLE "Supplier"
  ALTER COLUMN "creditLimit" TYPE NUMERIC(12, 2) USING ROUND("creditLimit"::numeric, 2),
  ALTER COLUMN "outstandingBalance" TYPE NUMERIC(12, 2) USING ROUND("outstandingBalance"::numeric, 2);

-- 4. Payment
ALTER TABLE "Payment"
  ALTER COLUMN "amount" TYPE NUMERIC(12, 2) USING ROUND("amount"::numeric, 2);

-- 5. ProductUnit
ALTER TABLE "ProductUnit"
  ALTER COLUMN "purchasePrice" TYPE NUMERIC(12, 2) USING ROUND("purchasePrice"::numeric, 2);

-- 6. Purchase
ALTER TABLE "Purchase"
  ALTER COLUMN "subtotal" TYPE NUMERIC(12, 2) USING ROUND("subtotal"::numeric, 2),
  ALTER COLUMN "discount" TYPE NUMERIC(12, 2) USING ROUND("discount"::numeric, 2),
  ALTER COLUMN "taxableAmount" TYPE NUMERIC(12, 2) USING ROUND("taxableAmount"::numeric, 2),
  ALTER COLUMN "taxRate" TYPE NUMERIC(5, 2) USING ROUND("taxRate"::numeric, 2),
  ALTER COLUMN "taxAmount" TYPE NUMERIC(12, 2) USING ROUND("taxAmount"::numeric, 2),
  ALTER COLUMN "cgstAmount" TYPE NUMERIC(12, 2) USING ROUND("cgstAmount"::numeric, 2),
  ALTER COLUMN "sgstAmount" TYPE NUMERIC(12, 2) USING ROUND("sgstAmount"::numeric, 2),
  ALTER COLUMN "grandTotal" TYPE NUMERIC(12, 2) USING ROUND("grandTotal"::numeric, 2);

-- 7. PurchaseItem
ALTER TABLE "PurchaseItem"
  ALTER COLUMN "unitPrice" TYPE NUMERIC(12, 2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "taxableUnitPrice" TYPE NUMERIC(12, 2) USING ROUND("taxableUnitPrice"::numeric, 2),
  ALTER COLUMN "taxableTotalPrice" TYPE NUMERIC(12, 2) USING ROUND("taxableTotalPrice"::numeric, 2),
  ALTER COLUMN "totalPrice" TYPE NUMERIC(12, 2) USING ROUND("totalPrice"::numeric, 2),
  ALTER COLUMN "gstRate" TYPE NUMERIC(5, 2) USING ROUND("gstRate"::numeric, 2),
  ALTER COLUMN "cgstAmount" TYPE NUMERIC(12, 2) USING ROUND("cgstAmount"::numeric, 2),
  ALTER COLUMN "sgstAmount" TYPE NUMERIC(12, 2) USING ROUND("sgstAmount"::numeric, 2);

-- 8. Sale
ALTER TABLE "Sale"
  ALTER COLUMN "subtotal" TYPE NUMERIC(12, 2) USING ROUND("subtotal"::numeric, 2),
  ALTER COLUMN "discount" TYPE NUMERIC(12, 2) USING ROUND("discount"::numeric, 2),
  ALTER COLUMN "taxableAmount" TYPE NUMERIC(12, 2) USING ROUND("taxableAmount"::numeric, 2),
  ALTER COLUMN "taxRate" TYPE NUMERIC(5, 2) USING ROUND("taxRate"::numeric, 2),
  ALTER COLUMN "taxAmount" TYPE NUMERIC(12, 2) USING ROUND("taxAmount"::numeric, 2),
  ALTER COLUMN "cgstAmount" TYPE NUMERIC(12, 2) USING ROUND("cgstAmount"::numeric, 2),
  ALTER COLUMN "sgstAmount" TYPE NUMERIC(12, 2) USING ROUND("sgstAmount"::numeric, 2),
  ALTER COLUMN "igstAmount" TYPE NUMERIC(12, 2) USING ROUND("igstAmount"::numeric, 2),
  ALTER COLUMN "roundOff" TYPE NUMERIC(12, 2) USING ROUND("roundOff"::numeric, 2),
  ALTER COLUMN "grandTotal" TYPE NUMERIC(12, 2) USING ROUND("grandTotal"::numeric, 2);

-- 9. SaleItem
ALTER TABLE "SaleItem"
  ALTER COLUMN "unitPrice" TYPE NUMERIC(12, 2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "totalPrice" TYPE NUMERIC(12, 2) USING ROUND("totalPrice"::numeric, 2),
  ALTER COLUMN "taxableUnitPrice" TYPE NUMERIC(12, 2) USING ROUND("taxableUnitPrice"::numeric, 2),
  ALTER COLUMN "taxableTotalPrice" TYPE NUMERIC(12, 2) USING ROUND("taxableTotalPrice"::numeric, 2),
  ALTER COLUMN "gstRate" TYPE NUMERIC(5, 2) USING ROUND("gstRate"::numeric, 2),
  ALTER COLUMN "cgstAmount" TYPE NUMERIC(12, 2) USING ROUND("cgstAmount"::numeric, 2),
  ALTER COLUMN "sgstAmount" TYPE NUMERIC(12, 2) USING ROUND("sgstAmount"::numeric, 2),
  ALTER COLUMN "igstAmount" TYPE NUMERIC(12, 2) USING ROUND("igstAmount"::numeric, 2);

-- 10. SalePayment
ALTER TABLE "SalePayment"
  ALTER COLUMN "amount" TYPE NUMERIC(12, 2) USING ROUND("amount"::numeric, 2);

-- 11. SaleReturn
ALTER TABLE "SaleReturn"
  ALTER COLUMN "refundAmount" TYPE NUMERIC(12, 2) USING ROUND("refundAmount"::numeric, 2);

-- 12. SaleService
ALTER TABLE "SaleService"
  ALTER COLUMN "amount" TYPE NUMERIC(12, 2) USING ROUND("amount"::numeric, 2),
  ALTER COLUMN "gstRate" TYPE NUMERIC(5, 2) USING ROUND("gstRate"::numeric, 2),
  ALTER COLUMN "cgstAmount" TYPE NUMERIC(12, 2) USING ROUND("cgstAmount"::numeric, 2),
  ALTER COLUMN "sgstAmount" TYPE NUMERIC(12, 2) USING ROUND("sgstAmount"::numeric, 2),
  ALTER COLUMN "taxableAmount" TYPE NUMERIC(12, 2) USING ROUND("taxableAmount"::numeric, 2);

-- 13. Quotation
ALTER TABLE "Quotation"
  ALTER COLUMN "subtotal" TYPE NUMERIC(12, 2) USING ROUND("subtotal"::numeric, 2),
  ALTER COLUMN "discount" TYPE NUMERIC(12, 2) USING ROUND("discount"::numeric, 2),
  ALTER COLUMN "taxableAmount" TYPE NUMERIC(12, 2) USING ROUND("taxableAmount"::numeric, 2),
  ALTER COLUMN "taxRate" TYPE NUMERIC(5, 2) USING ROUND("taxRate"::numeric, 2),
  ALTER COLUMN "taxAmount" TYPE NUMERIC(12, 2) USING ROUND("taxAmount"::numeric, 2),
  ALTER COLUMN "cgstAmount" TYPE NUMERIC(12, 2) USING ROUND("cgstAmount"::numeric, 2),
  ALTER COLUMN "sgstAmount" TYPE NUMERIC(12, 2) USING ROUND("sgstAmount"::numeric, 2),
  ALTER COLUMN "grandTotal" TYPE NUMERIC(12, 2) USING ROUND("grandTotal"::numeric, 2);

-- 14. QuotationItem
ALTER TABLE "QuotationItem"
  ALTER COLUMN "unitPrice" TYPE NUMERIC(12, 2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "totalPrice" TYPE NUMERIC(12, 2) USING ROUND("totalPrice"::numeric, 2),
  ALTER COLUMN "taxableUnitPrice" TYPE NUMERIC(12, 2) USING ROUND("taxableUnitPrice"::numeric, 2),
  ALTER COLUMN "taxableTotalPrice" TYPE NUMERIC(12, 2) USING ROUND("taxableTotalPrice"::numeric, 2),
  ALTER COLUMN "gstRate" TYPE NUMERIC(5, 2) USING ROUND("gstRate"::numeric, 2),
  ALTER COLUMN "cgstAmount" TYPE NUMERIC(12, 2) USING ROUND("cgstAmount"::numeric, 2),
  ALTER COLUMN "sgstAmount" TYPE NUMERIC(12, 2) USING ROUND("sgstAmount"::numeric, 2);

-- 15. QuotationService
ALTER TABLE "QuotationService"
  ALTER COLUMN "amount" TYPE NUMERIC(12, 2) USING ROUND("amount"::numeric, 2),
  ALTER COLUMN "gstRate" TYPE NUMERIC(5, 2) USING ROUND("gstRate"::numeric, 2),
  ALTER COLUMN "cgstAmount" TYPE NUMERIC(12, 2) USING ROUND("cgstAmount"::numeric, 2),
  ALTER COLUMN "sgstAmount" TYPE NUMERIC(12, 2) USING ROUND("sgstAmount"::numeric, 2),
  ALTER COLUMN "taxableAmount" TYPE NUMERIC(12, 2) USING ROUND("taxableAmount"::numeric, 2);

-- 16. Expense
ALTER TABLE "Expense"
  ALTER COLUMN "amount" TYPE NUMERIC(12, 2) USING ROUND("amount"::numeric, 2);

-- 17. Subscription
ALTER TABLE "Subscription"
  ALTER COLUMN "amount" TYPE NUMERIC(12, 2) USING ROUND("amount"::numeric, 2);

-- 18. SaleComboGroup
ALTER TABLE "SaleComboGroup"
  ALTER COLUMN "totalPrice" TYPE NUMERIC(12, 2) USING ROUND("totalPrice"::numeric, 2);

-- 19. QuotationComboGroup
ALTER TABLE "QuotationComboGroup"
  ALTER COLUMN "totalPrice" TYPE NUMERIC(12, 2) USING ROUND("totalPrice"::numeric, 2);

-- 20. PurchaseOrder
ALTER TABLE "PurchaseOrder"
  ALTER COLUMN "grandTotal" TYPE NUMERIC(12, 2) USING ROUND("grandTotal"::numeric, 2);

-- 21. PurchaseOrderItem
ALTER TABLE "PurchaseOrderItem"
  ALTER COLUMN "unitPrice" TYPE NUMERIC(12, 2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "totalPrice" TYPE NUMERIC(12, 2) USING ROUND("totalPrice"::numeric, 2);

COMMIT;
