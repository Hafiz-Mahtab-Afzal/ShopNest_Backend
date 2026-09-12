import { model, Schema, Document,Types } from 'mongoose';
import checkoutSchema from './checkout.model';

interface orderType extends Document {
  buyer: Types.ObjectId   
  items: typeof checkoutSchema[]  
  orderStatus: 'pending' | 'shipped' | 'delivered' | 'cancelled'  
  shippingAddress: {
    address: string
    pastal_code: string
    city: string
    state: string
    country: string
    phone: string
  }
  shippingCharges: number
  saving: number
  deliveryTime: string
  stripeId?: any  
}

const orderSchema = new Schema({
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'users',
  },
  items: [checkoutSchema],
  orderStatus: {
    type: String,
    enum: ['pending', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  shippingAddress: {
    address: { type: String, required: true },
    pastal_code: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true },
  },
  shippingCharges: { type: Number, required: true },
  saving: { type: Number, required: true },
  deliveryTime: {
    type: String,
    default: Date.now(),
  },
  stripeId: {},
},
// yahan timestamps: true add kar diya hai
// ab Mongoose har order document mein automatically "createdAt" aur "updatedAt" field bana dega
// isi createdAt ki wajah se hum month-wise grouping kar payenge
{ timestamps: true }
);

const Order = model<orderType>('order', orderSchema);
export default Order;