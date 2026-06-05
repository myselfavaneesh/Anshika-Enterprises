import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Inventory from '../models/Inventory';
import ProductUnit from '../models/ProductUnit';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory-billing';

const migrate = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const inventories = await Inventory.find({ quantity: { $gt: 0 } });
    console.log(`Found ${inventories.length} inventory records to migrate.`);

    let totalMigrated = 0;

    for (const inv of inventories) {
      const quantity = inv.quantity;
      const productId = inv.productId;

      const newUnits = [];
      for (let i = 1; i <= quantity; i++) {
        // Generate a random string or just use the index
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        newUnits.push({
          productId,
          serialNumber: `MIGRATE-${productId.toString().slice(-4)}-${randomStr}-${i}`,
          status: 'IN_STOCK',
          purchaseInvoiceNumber: 'MIGRATION',
          supplierName: 'System Migration'
        });
      }

      try {
        await ProductUnit.insertMany(newUnits);
        totalMigrated += quantity;
        console.log(`Migrated ${quantity} units for product ${productId}`);
      } catch (err: any) {
        console.error(`Error migrating product ${productId}:`, err.message);
      }
    }

    console.log(`Migration complete. Created ${totalMigrated} ProductUnit records.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

migrate();
