import mongoose, { Schema, Document } from 'mongoose';

export interface ISaleReturn extends Document {
  returnNumber: string;
  originalSaleId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  refundAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleReturnSchema: Schema = new Schema({
  returnNumber: { type: String, required: true, unique: true },
  originalSaleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  refundAmount: { type: Number, required: true, min: 0 },
  notes: { type: String },
}, { timestamps: true });

SaleReturnSchema.index({ returnNumber: 1 }, { unique: true });
SaleReturnSchema.index({ originalSaleId: 1 });
SaleReturnSchema.index({ customerId: 1 });

export default mongoose.model<ISaleReturn>('SaleReturn', SaleReturnSchema);
