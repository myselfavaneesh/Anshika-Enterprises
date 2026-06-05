import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  categoryId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  lowStockThreshold: { type: Number, default: 5 },
}, { timestamps: true });

export default mongoose.model<IProduct>('Product', ProductSchema);
