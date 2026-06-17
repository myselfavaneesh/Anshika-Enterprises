import mongoose, { Schema, Document } from 'mongoose';

export interface IProductUnit extends Document {
  productId: mongoose.Types.ObjectId;
  serialNumber: string;
  status: 'IN_STOCK' | 'SOLD' | 'DEFECTIVE';
  purchaseInvoiceNumber?: string;
  supplierName?: string;
  saleId?: mongoose.Types.ObjectId;
  saleItemId?: mongoose.Types.ObjectId;
  purchasePrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductUnitSchema: Schema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  serialNumber: { type: String, required: true, unique: true },
  status: { type: String, enum: ['IN_STOCK', 'SOLD', 'DEFECTIVE'], default: 'IN_STOCK', index: true },
  purchaseInvoiceNumber: { type: String },
  supplierName: { type: String },
  saleId: { type: Schema.Types.ObjectId, ref: 'Sale', index: true },
  saleItemId: { type: Schema.Types.ObjectId, ref: 'SaleItem' },
  purchasePrice: { type: Number },
}, { timestamps: true });

ProductUnitSchema.index({ serialNumber: 1 }, { unique: true });
ProductUnitSchema.index({ status: 1 });
ProductUnitSchema.index({ productId: 1 });
ProductUnitSchema.index({ saleId: 1 });

export default mongoose.model<IProductUnit>('ProductUnit', ProductUnitSchema);

