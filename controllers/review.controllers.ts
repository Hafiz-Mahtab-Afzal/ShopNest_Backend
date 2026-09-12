import { AuthRequest } from '../middlewares/authMiddle';
import { catchErr, error, success, warning } from '../utils/messages';
import Review from '../models/review.model';
import Product from '../models/product.model';
import { Response } from 'express';

// ==================== 1. ADD REVIEW ====================
// POST /api/v1/reviews/:productId
export const addReview = async (req: AuthRequest, res: Response) => {
  try {
    const productId = req.params.productId as string;  // ← string cast
    const userId = req.user?.id;
    const { rating, comment } = req.body;

    // 1. Fields check
    if (!rating || !comment) {
      return warning('Rating aur comment dono zaroori hain', res);
    }

    // 2. Rating range check
    if (rating < 1 || rating > 5) {
      return warning('Rating 1 se 5 ke beech honi chahiye', res);
    }

    // 3. Product exist karta hai?
    const product = await Product.findById(productId);
    if (!product) {
      return error('Product nahi mila', res);
    }

    // 4. User ne pehle se review diya hua hai?
    const alreadyReviewed = await Review.findOne({ productId, userId });
    if (alreadyReviewed) {
      return warning('Aap pehle se review de chuke hain', res);
    }

    // 5. Review save karo
    const review = await Review.create({ productId, userId, rating, comment });

    // 6. Product ke reviews array mein ID push karo
    product.reviews.push(review._id);

    // 7. Average rating update karo
    const allReviews = await Review.find({ productId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    product.rating = Math.round(avgRating * 10) / 10;

    await product.save();

    return success('Review add ho gaya', res);
  } catch (err) {
    return catchErr(err as Error, res);
  }
};

// ==================== 2. GET REVIEWS ====================
// GET /api/v1/reviews/:productId
export const getReviews = async (req: AuthRequest, res: Response) => {
  try {
    const productId = req.params.productId as string;  // ← string cast

    // Product exist karta hai?
    const product = await Product.findById(productId);
    if (!product) {
      return error('Product nahi mila', res);
    }

    const reviews = await Review.find({ productId })
      .populate('userId', 'first_name last_name')
      .sort({ createdAt: -1 });

    return success({ reviews }, res);
  } catch (err) {
    return catchErr(err as Error, res);
  }
};