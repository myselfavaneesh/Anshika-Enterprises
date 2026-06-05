import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryTransaction extends Document {
  productId: mongoose.Types.ObjectId;
  transactionType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  referenceType?: string;
  referenceId?: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const InventoryTransactionSchema: Schema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  transactionType: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
  quantity: { type: Number, required: true }, // positive or negative
  referenceType: { type: String }, // e.g., 'SALE', 'PURCHASE'
  referenceId: { type: Schema.Types.ObjectId }, 
  note: { type: String },
}, { timestamps: true });

export default mongoose.model<IInventoryTransaction>('InventoryTransaction', InventoryTransactionSchema);
