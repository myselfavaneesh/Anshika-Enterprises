import mongoose, { Schema, Document } from 'mongoose';

export interface ISale extends Document {
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
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

const SaleSchema: Schema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
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

export default mongoose.model<ISale>('Sale', SaleSchema);
