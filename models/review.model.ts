import { Schema, model, Document, Types } from 'mongoose';


interface ReviewType extends Document {
  productId: Types.ObjectId;  // konse product ka review
  userId: Types.ObjectId;     // kisne diya
  rating: number;             // 1 - 5
  comment: string;            // review text
}


const reviewSchema = new Schema<ReviewType>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'product',   
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',      
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Review = model<ReviewType>('review', reviewSchema);
export default Review;