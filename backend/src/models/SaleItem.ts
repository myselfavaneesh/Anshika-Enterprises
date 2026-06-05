import mongoose, { Schema, Document } from 'mongoose';

export interface ISaleItem extends Document {
  saleId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number; // Inclusive Unit Price
  totalPrice: number; // Inclusive Total Price
  taxableUnitPrice: number;
  taxableTotalPrice: number;
  serialNumbers?: string[];
}

const SaleItemSchema: Schema = new Schema({
  saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  taxableUnitPrice: { type: Number, required: true },
  taxableTotalPrice: { type: Number, required: true },
  serialNumbers: [{ type: String }],
});

export default mongoose.model<ISaleItem>('SaleItem', SaleItemSchema);
