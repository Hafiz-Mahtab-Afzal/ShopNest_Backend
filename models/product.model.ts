import { Schema, model, Document } from 'mongoose';
import { Types } from 'mongoose';

interface productType extends Document {
  title: string;
  subtitle: string;
  brand: string;
  category: string;
  section: string;
  price: number;
  description: string;
  images: string[];
  stock: number;
  rating: number;
  reviews: Types.ObjectId[];  
  wishlist: string[];
  sku: string;
  onSale: boolean;
  discount: number;
  warranty_information: string;
  dimension: {
    weight: number;
    height: number;
    width: number;
  };
}
const productSchema = new Schema(
  {
    title: {
      type: String,
      require: true,
    },
    subtitle: {
      type: String,
      require: true,
    },
    brand: {
      type: String,
      require: true,
    },
    category: {
      type: String,
      require: true,
    },
    section: {
      type: String,
      enum: ['latest products', 'just for you'],
      default: null,
    },
    price: {
      type: Number,
      require: true,
    },
    description: {
      type: String,
      require: true,
    },
    images: [
      {
        type: String,
        default: false,
      },
    ],
    stock: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: 'review',
      },
    ],
    wishlist: [],
    sku: {
      type: String,
      default: 'M-B',
    },
    onSale: {
      type: Boolean,
      default: false,
    },
    discount: {
      type: Number,
      default: 0,
    },
    warranty_information: {
      type: String,
      default: '1 year warranty',
    },
    dimension: {
      weight: {
        type: Number,
        default: 0,
      },
      height: {
        type: Number,
        default: 0,
      },
      width: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

// YAHAN index add karo - schema define hone ke baad
productSchema.index({ title: "text", brand: "text", category: "text" })
productSchema.index({ category: 1 })
productSchema.index({ brand: 1 })
productSchema.index({ category: 1, price: 1 })

const Product = model<productType>('product', productSchema);
export default Product;