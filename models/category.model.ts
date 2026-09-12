import { model, Schema } from 'mongoose';

interface categorytype extends Document {
   category_name:string
}
const categorySchema = new Schema(
  {
    category_name: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Category = model<categorytype>('category', categorySchema);
export default Category;
