// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// const invoiceData = {
//   supplierName: "Neeraj Traders",
//   supplierPhone: "9999999999", // placeholder
//   supplierGst: "09AVPPS4167E1Z1",
//   supplierState: "Uttar Pradesh",
//   supplierStateCode: "09",
//   invoiceNumber: "645",
//   invoiceDate: new Date("2026-09-23T00:00:00Z"),
//   subtotal: 82914.00,
//   cgst: 0,
//   sgst: 0,
//   grandTotal: 82914.00,
//   items: [
//     { sku: "APZ-60-OPZ40B20L", name: "AUC-PZ-PZ40B20L", rate: 2660.00, qty: 2, serials: [FGC0537A125318, FGC0537A125328] },
//     { sku: APZ-60-0PZ40B20R, name: AUC-PZ-OPZ40B20R, rate: 2660.00, qty: 1, serials: [FGC0636A111805] },
//     { sku: PZ-4000L, name: PZ4000L, rate: 2580.00, qty: 1, serials: [CQC1034A242798] },
//     { sku: APZ-60-00PZDIN65, name: AUC-PZ-DIN 65, rate: 5190.00, qty: 1, serials: [CCE3835A434332] },
//     { sku: APZ-36-00PZ6000L, name: AUC-PZ-6000L, rate: 4051.00, qty: 2, serials: [FFE3035A239890, FFE3035A239929] },
//     { sku: APZ-36-00PZ7000R, name: AUC-PZ-00PZ7000R, rate: 4880.00, qty: 2, serials: [FFE3335A225466, FFE3335A225461] },
//     { sku: APZ-36-00PZ8000R, name: AUC-PZ-00PZ 8000R, rate: 5180.00, qty: 1, serials: [FFB6631A214870] },
//     { sku: APZ-36-00PZ8000L, name: AUC-PZ-00PZ 8000 L, rate: 5180.00, qty: 1, serials: [FFB6733A121458] },
//     { sku: APZ-36-0NT10000R, name: AUC-PZ-0NT10000R, rate: 6350.00, qty: 1, serials: [CGD1132A427735] },
//     { sku: APZ-36-85D23R, name: PZ85D23R, rate: 4980.00, qty: 2, serials: [AEI4637A300500, AEI4637A300497] },
//     { sku: APZ-60-00PZDIN45, name: AUC-PZDIN45 PZ, rate: 3980.00, qty: 1, serials: [CBF4634A433103] },
//     { sku: APZ-60-00PZDIN50, name: Din 50, rate: 4390.00, qty: 1, serials: [ABA3834A341692] },
//     // Since 5LB and 9AH and 4LV were not found, let's create them dynamically.
//     { sku: APZ-PZ5LB, name: AUC-PZ-5LB, rate: 794.60, qty: 1, serials: [EAB2926A149114], createNew: true, hsn: 85071000, gst: 28 },
//     { sku: APZ-PZ9AH, name: AUC-PZ-9AH, rate: 1193.00, qty: 2, serials: [BAH1929A323449, BAH1929A323467], createNew: true, hsn: 8507, gst: 28 },
//     { sku: AUC-PZ-4LV, name: AUC-PZ-4LV, rate: 583.5789, qty: 19, serials: [
//         FAF4424A232011, EAE4424A232012, FAF4424A232013, EAE4424A232014,
//         EAE4424A232015, EAE4424A232016, EAE4424A231927, EAE4424A231928,
//         EAE4424A231929, EAE4424A231930, EAE4424A231931, EAE4424A231932,
//         EAE4424A231909, EAE4424A231910, EAE4424A231911, EAE4424A231912,
//         FAF4424A231913, FAF4424A231914, FAE4424A232151
//       ], createNew: true, hsn: 8507, gst: 28 }
//   ]
// };

// async function main() {
//   try {
//     let supplier = await prisma.supplier.findFirst({
//       where: { name: { contains: "Neeraj", mode: "insensitive" } }
//     });

//     if (!supplier) {
//       supplier = await prisma.supplier.create({
//         data: {
//           name: invoiceData.supplierName,
//           phone: invoiceData.supplierPhone,
//           gstNumber: invoiceData.supplierGst,
//           state: invoiceData.supplierState,
//           stateCode: invoiceData.supplierStateCode,
//         }
//       });
//       console.log(`Created supplier ${supplier.name}`);
//     } else {
//       console.log(`Found supplier ${supplier.name}`);
//     }

//     let category = await prisma.category.findFirst({
//       where: { name: { contains: "PowerZone", mode: "insensitive" } }
//     });
//     if (!category) {
//       category = await prisma.category.create({ data: { name: "PowerZone Batteries" } });
//     }

//     const resolvedItems = [];
//     for (const item of invoiceData.items) {
//       let product = await prisma.product.findFirst({
//         where: { sku: item.sku }
//       });
      
//       if (!product) {
//         if (true) {
//           product = await prisma.product.create({
//             data: {
//               sku: item.sku,
//               name: item.name,
//               categoryId: category.id,
//               hsnCode: item.hsn || "8507",
//               gstRate: item.gst || 28,
//               trackSerials: true,
//               purchasePrice: item.rate,
//               sellingPrice: 0,
//             }
//           });
//           console.log(`Created product ${product.sku}`);
//         }
//       }
      
//       resolvedItems.push({
//         ...item,
//         productId: product.id
//       });
//     }
    
//     // Create Purchase
//     const purchase = await prisma.purchase.create({
//       data: {
//         purchaseInvoiceNumber: invoiceData.invoiceNumber,
//         supplierId: supplier.id,
//         invoiceType: "GST",
//         subtotal: invoiceData.subtotal,
//         discount: 0,
//         taxableAmount: invoiceData.subtotal,
//         taxAmount: invoiceData.cgst + invoiceData.sgst,
//         cgstAmount: invoiceData.cgst,
//         sgstAmount: invoiceData.sgst,
//         grandTotal: invoiceData.grandTotal,
//         status: "PAID",
//         createdAt: invoiceData.invoiceDate
//       }
//     });
//     console.log(`Created purchase ${purchase.id}`);
    
//     // Create Purchase Items and Inventory
//     for (const item of resolvedItems) {
//       const taxableUnitPrice = item.rate;
//       const taxableTotalPrice = taxableUnitPrice * item.qty;
//       const gstRate = 0;
//       const cgstAmount = 0;
//       const sgstAmount = 0;
//       const totalPrice = taxableTotalPrice;
      
//       const purchaseItem = await prisma.purchaseItem.create({
//         data: {
//           purchaseId: purchase.id,
//           productId: item.productId,
//           quantity: item.qty,
//           unitPrice: item.rate,
//           taxableUnitPrice,
//           taxableTotalPrice,
//           totalPrice,
//           gstRate,
//           cgstAmount,
//           sgstAmount
//         }
//       });
      
//       // Serials (Product Units)
//       for (const serial of item.serials) {
//         await prisma.productUnit.create({
//           data: {
//             productId: item.productId,
//             serialNumber: serial,
//             status: "IN_STOCK",
//             purchaseInvoiceNumber: purchase.purchaseInvoiceNumber,
//             supplierName: supplier.name,
//             purchaseId: purchase.id,
//             purchaseItemId: purchaseItem.id,
//             supplierId: supplier.id,
//             purchasePrice: item.rate
//           }
//         });
//       }
      
//       // Update Inventory
//       const inventory = await prisma.inventory.upsert({
//         where: { productId: item.productId },
//         create: { productId: item.productId, quantity: item.qty },
//         update: { quantity: { increment: item.qty } }
//       });
      
//       // Inventory Transaction
//       await prisma.inventoryTransaction.create({
//         data: {
//           productId: item.productId,
//           transactionType: "IN",
//           quantity: item.qty,
//           referenceType: "PURCHASE",
//           referenceId: purchase.id,
//           note: `Purchase Invoice ${purchase.purchaseInvoiceNumber}`
//         }
//       });
      
//       console.log(`Processed item ${item.sku}`);
//     }
    
//     // Update Supplier Balance (we assume PAID so balance is not increased, but actually let's leave it 0 since it's PAID)
//     console.log("Purchase successfully imported!");
    
//   } catch (error) {
//     console.error("Error importing purchase:", error);
//   }
// }

// main().finally(() => prisma.$disconnect());
