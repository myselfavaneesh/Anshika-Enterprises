import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SaleItem from '../models/SaleItem';
import ProductUnit from '../models/ProductUnit';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory-saas';

const migrate = async () => {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    // Find all sale items that have serial numbers array
    const saleItems = await SaleItem.find({ serialNumbers: { $exists: true, $not: { $size: 0 } } });
    console.log(`Found ${saleItems.length} sale items to migrate.`);

    let updatedUnits = 0;

    for (const item of saleItems) {
      const serials = (item as any).serialNumbers || [];
      if (serials.length > 0) {
        console.log(`Updating ${serials.length} serials for saleItem ${item._id} (Sale: ${item.saleId})`);
        
        const result = await ProductUnit.updateMany(
          { serialNumber: { $in: serials } },
          { $set: { saleId: item.saleId, saleItemId: item._id, status: 'SOLD' } }
        );
        updatedUnits += result.modifiedCount;
      }
    }

    console.log(`Migration finished. Associated ${updatedUnits} ProductUnit records with their corresponding Sales.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

migrate();
