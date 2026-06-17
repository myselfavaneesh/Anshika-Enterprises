import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  entityType: 'CUSTOMER' | 'SUPPLIER';
  entityId: mongoose.Types.ObjectId;
  type: 'MONEY_IN' | 'MONEY_OUT';
  amount: number;
  paymentMode?: string;
  referenceId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
  entityType: { type: String, enum: ['CUSTOMER', 'SUPPLIER'], required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ['MONEY_IN', 'MONEY_OUT'], required: true },
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, enum: ['CASH', 'UPI', 'BANK', 'CHEQUE', 'OTHER'] },
  referenceId: { type: String }, // e.g., Invoice ID, Quotation ID, or UPI Ref No
  notes: { type: String },
}, { timestamps: true });

// Compound index for fast ledger queries
PaymentSchema.index({ entityId: 1, entityType: 1, createdAt: -1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
