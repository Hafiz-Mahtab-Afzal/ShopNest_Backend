import express from 'express';
import { addReview, getReviews } from '../controllers/review.controllers';
import { requriedLoggedIn } from '../middlewares/authMiddle';

const reviews = express.Router();

// GET  /api/v1/reviews/:productId  → sab ke liye (public)
reviews.get('/:productId', getReviews);

// POST /api/v1/reviews/:productId  → sirf logged-in users
reviews.post('/:productId', requriedLoggedIn, addReview);

export default reviews;