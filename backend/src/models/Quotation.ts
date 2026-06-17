import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotation extends Document {
  quotationNumber: string;
  customerId: mongoose.Types.ObjectId;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  validUntil: Date;
  createdAt: Date;
}

const QuotationSchema: Schema = new Schema({
  quotationNumber: { type: String, required: true, unique: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  status: { type: String, enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'], default: 'DRAFT' },
  validUntil: { type: Date },
}, { timestamps: true });

QuotationSchema.index({ quotationNumber: 1 }, { unique: true });
QuotationSchema.index({ customerId: 1 });
QuotationSchema.index({ createdAt: -1 });

export default mongoose.model<IQuotation>('Quotation', QuotationSchema);
