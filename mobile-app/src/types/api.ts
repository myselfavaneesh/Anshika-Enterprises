export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  hsnCode?: string;
  gstRate: number;
  lowStockThreshold: number;
  purchasePrice: number;
  sellingPrice: number;
  isGstInclusive: boolean;
  wattage: number;
  createdAt: string;
  updatedAt: string;
  inventory?: Inventory;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
  stateCode?: string;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceType: string;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  saleItems?: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxableUnitPrice: number;
  taxableTotalPrice: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  wattage: number;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
