import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
  stateCode?: string;
  outstandingBalance: number;
  createdAt: Date;
}

const SupplierSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  gstNumber: { type: String },
  state: { type: String },
  stateCode: { type: String },
  outstandingBalance: { type: Number, default: 0 },
}, { timestamps: true });

SupplierSchema.index({ phone: 1 });
SupplierSchema.index({ gstNumber: 1 });

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);
