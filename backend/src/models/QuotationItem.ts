import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotationItem extends Document {
  quotationId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number; // Inclusive Unit Price
  totalPrice: number; // Inclusive Total Price
  taxableUnitPrice: number;
  taxableTotalPrice: number;
}

const QuotationItemSchema: Schema = new Schema({
  quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  taxableUnitPrice: { type: Number, required: true },
  taxableTotalPrice: { type: Number, required: true },
});

QuotationItemSchema.index({ quotationId: 1 });
QuotationItemSchema.index({ productId: 1 });

export default mongoose.model<IQuotationItem>('QuotationItem', QuotationItemSchema);
