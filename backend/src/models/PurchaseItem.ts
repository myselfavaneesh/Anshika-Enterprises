import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseItem extends Document {
  purchaseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  taxableUnitPrice: number;
  taxableTotalPrice: number;
  totalPrice: number;
}

const PurchaseItemSchema: Schema = new Schema({
  purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxableUnitPrice: { type: Number, required: true },
  taxableTotalPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
});

PurchaseItemSchema.index({ purchaseId: 1 });
PurchaseItemSchema.index({ productId: 1 });

export default mongoose.model<IPurchaseItem>('PurchaseItem', PurchaseItemSchema);
