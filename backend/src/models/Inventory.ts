import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  updatedAt: Date;
}

const InventorySchema: Schema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export default mongoose.model<IInventory>('Inventory', InventorySchema);
