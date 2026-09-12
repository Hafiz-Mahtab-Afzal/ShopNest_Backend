import express from 'express';
// 🌟 Make sure getSingleOrder yahan sahi se import ho raha hai
import { createCheckoutSession, getMyOrders, handleStripeWebhook, verifyPayment, getSingleOrder, getAllOrders, updateOrderStatus } from '../controllers/order.controller'; 
import { checkrole, requriedLoggedIn } from '../middlewares/authMiddle'; 
import { getMonthlyDashboardStats } from '../controllers/Dashboard.controller';

const router = express.Router();

// 1. PUBLIC ROUTE: Stripe Webhook
router.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
);
// Naya route sirf session check karne ke liye
router.get('/check-auth', requriedLoggedIn, (req, res) => {
  res.status(200).json({ success: true, message: "User is authenticated" });
});
// 2. SPECIFIC ROUTES: Pehle specific paths aane chahiye
router.post('/create-checkout-session', requriedLoggedIn, createCheckoutSession);
router.get('/verify-payment', requriedLoggedIn, verifyPayment); 
router.get('/my-orders', requriedLoggedIn, getMyOrders);


router.get('/admin/all', requriedLoggedIn, checkrole, getAllOrders);
router.put('/admin/:id/status', requriedLoggedIn, checkrole, updateOrderStatus);

// 3. ADMIN ROUTE
router.get('/dashboard/monthly-stats', requriedLoggedIn, checkrole, getMonthlyDashboardStats);

// 🌟 DYNAMIC ROUTE: Kisi ek order ko ID se dhoondne ke liye (Isko HAMESHA aakhir mein hona chahiye)
// 🛡️ [CHECKED]: 'requriedLoggedIn' ensure karega ke user ID controller ko mile taake IDOR protection check chal sake!
router.get('/:id', requriedLoggedIn, getSingleOrder);

export default router;