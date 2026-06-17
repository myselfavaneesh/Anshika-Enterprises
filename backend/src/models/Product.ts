import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  categoryId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  hsnCode?: string;
  gstRate?: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  hsnCode: { type: String },
  gstRate: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
}, { timestamps: true });

ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ categoryId: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);

