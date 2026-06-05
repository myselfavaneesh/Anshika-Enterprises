import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phone?: string;
  address?: string;
  createdAt: Date;
}

const CustomerSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
}, { timestamps: true });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
