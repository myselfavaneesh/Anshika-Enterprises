import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchase extends Document {
  purchaseInvoiceNumber: string; // The supplier's invoice number
  supplierId: mongoose.Types.ObjectId;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  createdAt: Date;
}

const PurchaseSchema: Schema = new Schema({
  purchaseInvoiceNumber: { type: String, required: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  status: { type: String, enum: ['PAID', 'PENDING', 'CANCELLED'], default: 'PAID' },
}, { timestamps: true });

PurchaseSchema.index({ purchaseInvoiceNumber: 1, supplierId: 1 }, { unique: true });
PurchaseSchema.index({ supplierId: 1 });
PurchaseSchema.index({ createdAt: -1 });

export default mongoose.model<IPurchase>('Purchase', PurchaseSchema);
