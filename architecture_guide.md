# System Architecture & Flow Guide

This document provides a comprehensive overview of the architecture, database models, and transactional flows of the **Anshika Enterprises Inventory & Billing System**. It is designed to give any AI or developer instant context on how the system works.

---

## 1. Overall System Architecture

The application is built on a standard **MERN** (MongoDB, Express, React, Node) stack setup using TypeScript.

```mermaid
graph TD
    subgraph Frontend [React SPA / Vite / TypeScript]
        UI[User Interface]
        Pages[New Sale, Inventory, Dashboard]
        PDFGen[PDF Invoice Generator]
    end

    subgraph Backend [NodeJS / Express / TypeScript]
        Router[Express Router]
        Controllers[Controllers: Dashboard, Product, Sale]
        Logger[Winston Logger]
    end

    subgraph Database [MongoDB / Mongoose]
        DB[(MongoDB Atlas)]
    end

    UI -->|HTTP Requests| Router
    Router --> Controllers
    Controllers -->|Mongoose Queries| DB
    Controllers -.-> Logger
```

---

## 2. Database Models & Schema Relationships

Instead of basic quantity tracking, this system uses **serial-level item tracking** via the `ProductUnit` model.

```mermaid
erDiagram
    CATEGORY {
        ObjectId id PK
        string name
    }
    PRODUCT {
        ObjectId id PK
        ObjectId categoryId FK
        string name
        string sku
        number lowStockThreshold
    }
    PRODUCT_UNIT {
        ObjectId id PK
        ObjectId productId FK
        string serialNumber UK
        string status "IN_STOCK | SOLD | DEFECTIVE"
        string purchaseInvoiceNumber
        string supplierName
        ObjectId saleId FK
        ObjectId saleItemId FK
        number purchasePrice "0 for F.O.C (Free of Cost) items"
    }
    CUSTOMER {
        ObjectId id PK
        string name
        string phone
        string email
        string gstNumber
    }
    SALE {
        ObjectId id PK
        string invoiceNumber UK
        ObjectId customerId FK
        number subtotal
        number discount
        number taxableAmount
        number taxRate
        number taxAmount
        number cgstAmount
        number sgstAmount
        number grandTotal
        string status "PAID | PENDING | CANCELLED"
    }
    SALE_ITEM {
        ObjectId id PK
        ObjectId saleId FK
        ObjectId productId FK
        number quantity
        number unitPrice "GST Inclusive Price"
        number totalPrice "GST Inclusive Total"
        number taxableUnitPrice
        number taxableTotalPrice
        string[] serialNumbers
    }

    CATEGORY ||--o{ PRODUCT : contains
    PRODUCT ||--o{ PRODUCT_UNIT : "has individual serials"
    PRODUCT ||--o{ SALE_ITEM : "appears in"
    CUSTOMER ||--o{ SALE : "makes"
    SALE ||--o{ SALE_ITEM : "contains"
    SALE ||--o{ PRODUCT_UNIT : "associated with"
    SALE_ITEM ||--o{ PRODUCT_UNIT : "associated with"
```

---

## 3. Key Core Workflows

### A. Stock In (Purchase / Inventory Add)
1. The user inputs product details, including serial numbers, purchase price, supplier name, etc.
2. If the product is **F.O.C (Free of Cost)**, the `purchasePrice` is stored as `0`.
3. For each serial number provided, a unique `ProductUnit` document is created in the database with status `IN_STOCK`.

### B. Stock Out (Sales Checkout & Invoice Generation)
When a sale is recorded:
1. Selling prices entered by the user are **GST-Inclusive**.
2. The system splits the prices to calculate taxable amount, CGST, and SGST:
   - $$\text{Taxable Unit Price} = \frac{\text{Inclusive Price}}{1 + \text{Tax Rate}}$$ (e.g., $$\frac{200}{1.18} = 169.49$$)
   - $$\text{Tax Amount} = \text{Inclusive Price} - \text{Taxable Unit Price}$$ (e.g., $$200 - 169.49 = 30.51$$)
   - For intra-state transactions, Tax Amount is split into:
     - $$\text{CGST} = \frac{\text{Tax Amount}}{2}$$
     - $$\text{SGST} = \frac{\text{Tax Amount}}{2}$$
3. The `Sale` and `SaleItem` records are saved with the split values.
4. The corresponding `ProductUnit` documents matched by serial numbers are updated:
   - `status` is set to `SOLD`.
   - `saleId` and `saleItemId` are linked.

---

## 4. Key Metrics & Calculations

### A. Dashboard Inventory Value
* Calculated dynamically by aggregating the `purchasePrice` of all `ProductUnit` documents where `status == 'IN_STOCK'`.
* F.O.C items correctly contribute `0` value.

### B. Low Stock Alert
* The system counts the number of `ProductUnit` documents with `status == 'IN_STOCK'` for each product.
* If $$\text{count} \le \text{lowStockThreshold}$$ (default 5), the product is flagged in the low stock alerts list.

---

## 5. Technical Context & Gotchas

* **No direct quantity counter on Product:** Stock quantities are computed dynamically from `ProductUnit` documents to ensure tracking consistency at the serial number level.
* **GST Treatment:** All retail price inputs are GST-inclusive. The base rate (taxable value) is displayed on invoices, but the totals are matched to the exact inclusive payments.
