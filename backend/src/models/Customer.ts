import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
  stateCode?: string;
  createdAt: Date;
}

const CustomerSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  gstNumber: { type: String },
  state: { type: String },
  stateCode: { type: String },
}, { timestamps: true });

CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ gstNumber: 1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);

