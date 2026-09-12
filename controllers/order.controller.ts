import Product from '../models/product.model';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import Order from '../models/order.model';
import { z } from 'zod'; // 🌟 Zod import kiya Point 1 ke liye
import sanitizeHtml from 'sanitize-html'; // 🛡️ Stored XSS Protection (Point 6) ke liye package import kiya
import user from '../models/user.model';

import { transporter } from '../utils/Nodemailer';
import OrderConfirmationTemplate from '../helpers/OrderEmailTemplate';
import OrderStatusEmailTemplate from '../helpers/OrderStatusEmailTemplate';

import { sendWhatsAppMessage } from '../helpers/whatsapp';
import OrderConfirmationWhatsAppTemplate from '../helpers/OrderConfirmationWhatsAppItem'; // Confirm wala
import OrderStatusWhatsAppTemplate from '../helpers/OrderStatusWhatsAppTemplate'; // Status update wala

import { notificationQueue } from './queues/notificationQueue';


interface CartItem {
  _id: string;
  title: string;
  price: number;
  quantity: number;
  img?: string;
}

interface ShippingAddress {
  address: string;
  pastal_code: string;
  city: string;
  state: string;
  country: string;
  phone: string;
}

// ✅ TypeScript cheez #2: req.body ka type batao
interface CheckoutBody {
  cartItems: CartItem[];
  shippingAddress: ShippingAddress;
  shippingCharges: number;
  saving: number;
}

// ✅ req.user extend karo — Express mein user hota nahi by default
interface AuthRequest extends Request {
  user?: { id: string };
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// 🌟 POINT 1 ZOD SCHEMA: verifyPayment ke session_id ko safe karne ke liye
const verifyPaymentSchema = z.object({
  session_id: z.string(),
});

// ✅ TypeScript cheez #3: function parameters ko type dena
const updateStock = async (cartItems: CartItem[]) => {
  for (const item of cartItems) {
    await Product.findByIdAndUpdate(item._id, {
      $inc: { stock: -item.quantity },
    });
  }
};

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    // 🔴 FIX: Agar request body khali hai, toh crash mat ho
    if (req.method === 'GET') {
      return res.status(200).json({ message: 'Auth verified' });
    }
    const { cartItems, shippingAddress, shippingCharges, saving } = req.body as CheckoutBody;

    const userId = req.user?.id; // ?. = optional chaining — user null bhi ho sakta hai

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // 🛡️ [SECURED - POINT 6]: Cart items ke titles ko database/metadata mein bhejane se pehle sanitize kiya
    const sanitizedCartItems = cartItems.map((item: CartItem) => ({
      ...item,
      title: sanitizeHtml(item.title, { allowedTags: [], allowedAttributes: {} }),
    }));

    // 🛡️ [SECURED - POINT 6]: Shipping address ke saare text fields ko sanitize kiya taake Stored XSS na ho sake
    const sanitizedShippingAddress: ShippingAddress = {
      address: sanitizeHtml(shippingAddress.address, { allowedTags: [], allowedAttributes: {} }),
      pastal_code: sanitizeHtml(shippingAddress.pastal_code, {
        allowedTags: [],
        allowedAttributes: {},
      }),
      city: sanitizeHtml(shippingAddress.city, { allowedTags: [], allowedAttributes: {} }),
      state: sanitizeHtml(shippingAddress.state, { allowedTags: [], allowedAttributes: {} }),
      country: sanitizeHtml(shippingAddress.country, { allowedTags: [], allowedAttributes: {} }),
      phone: sanitizeHtml(shippingAddress.phone, { allowedTags: [], allowedAttributes: {} }),
    };

    const line_items = sanitizedCartItems.map((item: CartItem) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          images: item.img ? [item.img] : [],
        },
        unit_amount: Math.round((item.price / 280) * 100),
      },
      quantity: item.quantity,
    }));

    if (shippingCharges > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping Charges',
            images: [],
          },
          unit_amount: Math.round((shippingCharges / 280) * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
      metadata: {
        userId: userId?.toString() ?? '',
        shippingCharges: shippingCharges.toString(),
        saving: saving.toString(),
        shippingAddress: JSON.stringify(sanitizedShippingAddress), // Sanitized address saved in metadata
        cartItems: JSON.stringify(sanitizedCartItems), // Sanitized cart saved in metadata
      },
    });

    res.json({ url: session.url });
  } catch (err: unknown) {
    // ✅ TypeScript cheez #4: catch mein err unknown hota hai — type check karo
    console.error('Stripe Checkout Error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOKS_KEY as string
    );
  } catch (err: unknown) {
    console.error('Webhook Error:', (err as Error).message);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;

    if (session.payment_status === 'paid') {
      const { userId, shippingCharges, saving, shippingAddress, cartItems } =
        session.metadata as Record<string, string>;

      const parsedAddress: ShippingAddress = JSON.parse(shippingAddress);
      const parsedCart: CartItem[] = JSON.parse(cartItems);

      const items = parsedCart.map((item: CartItem) => ({
        product: item._id,
        qty: item.quantity,
        totalprice: item.price * item.quantity,
      }));

      await Order.create({
        buyer: new Types.ObjectId(userId),
        items,
        shippingAddress: parsedAddress,
        shippingCharges: Number(shippingCharges),
        saving: Number(saving),
        stripeId: session.id,
        orderStatus: 'pending',
      });

      await updateStock(parsedCart);
      console.log('✅ Order saved:', session.id);
    }
  }

  res.sendStatus(200);
};

// ✅ File: controllers/order.controller.ts

// 1. IMPORTS (File ke top par ye ensure karein)

// 2. VERIFY PAYMENT FUNCTION

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const validation = verifyPaymentSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Invalid query parameters format' });
    }

    const { session_id } = req.query as { session_id: string };

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    const existingOrder = await Order.findOne({ stripeId: session.id });
    if (existingOrder) {
      return res.json({ success: true, message: 'Order already placed', order: existingOrder });
    }

    const { userId, shippingCharges, saving, shippingAddress, cartItems } =
      session.metadata as Record<string, string>;

    const loggedInUserId = req.user?.id;
    if (loggedInUserId !== userId) {
      return res
        .status(403)
        .json({ success: false, message: 'Unauthorized: order does not belong to this user' });
    }

    const parsedAddress: ShippingAddress = JSON.parse(shippingAddress);
    const parsedCart: CartItem[] = JSON.parse(cartItems);

    const items = parsedCart.map((item: CartItem) => ({
      product: item._id,
      qty: item.quantity,
      totalprice: item.price * item.quantity,
    }));

    const order = await Order.create({
      buyer: userId,
      items,
      shippingAddress: parsedAddress,
      shippingCharges: Number(shippingCharges),
      saving: Number(saving),
      stripeId: session.id,
      orderStatus: 'pending',
    });

    await updateStock(parsedCart);

    // 🔥 YAHAN BADLA - ab email/whatsapp seedha nahi bhejte, queue mein daal dete hain
    // ye line turant chal jati hai (2ms), backend rukta nahi email ke liye
    await notificationQueue.add('send-order-notification', {
      orderId: order._id.toString(),
      userId,
      parsedCart,
      shippingCharges,
    });

    res.json({ success: true, message: 'Order placed successfully', order });
  } catch (err: unknown) {
    console.error('Verify Payment Error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ buyer: req.user?.id })
      .populate('items.product', 'title img price')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// 🧪 SIMPLE TEST CONTROLLER (POINT 2 SECURED)
export const getSingleOrder = async (req: any, res: any) => {
  try {
    const orderId = req.params.id;

    // 🛡️ [SECURED - POINT 2 (IDOR PROTECTION)]:
    // Pehle yahan 'Order.findById(orderId)' thaa, jis se koi bhi kisi ka bhi order dekh sakta thaa.
    // Ab humne 'findOne' ke sath 'buyer: req.user?.id' lagaya hai. Ab hacker apna token de kar kisi aur ki Order details leak nahi kar payega!
    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user?.id,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order nahi mila ya aap authorized nahi hain!' });
    }

    return res.status(200).json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const checkAuth = (req: AuthRequest, res: Response) => {
  res.status(200).json({ success: true, user: req.user });
};

// 🆕 ADMIN: Saare users ke saare orders lao (dashboard "All Orders" page ke liye)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .populate('buyer', 'first_name last_name email') // ✅ buyer ka naam/email bhi sath aaye
      .populate('items.product', 'title images price') // ✅ product ki details bhi sath aaye
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

// 🆕 ADMIN: Order ka status update karo (pending → shipped → delivered → cancelled)
const allowedStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];

// Sirf inhi 3 status par email jayegi — pending par nahi
const emailTriggerStatuses = ['shipped', 'delivered', 'cancelled'];

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body as { orderStatus: string };

    if (allowedStatuses.indexOf(orderStatus) === -1) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const order = (await Order.findByIdAndUpdate(id, { orderStatus }, { returnDocument: 'after' })) as any;
    if (!order) return res.status(404).json({ success: false, message: 'Order nahi mila' });

    console.log("DEBUG: Order found, Buyer ID:", order.buyer);

    user.findById(order.buyer.toString()).then(async (buyerDetails: any) => {
      console.log("DEBUG: Checking buyer details...");
      if (!buyerDetails) {
        console.log("DEBUG: Buyer details nahi mili!");
        return;
      }

      // --- 1. EMAIL LOGIC (FORCE TRUE) ---
      console.log("DEBUG: Trying to send Email to:", buyerDetails.email);
      
      // condition ko 'true' kar diya hai taake email bypass ho kar jaye
      if (true) { 
        try {
          const emailHtml = OrderStatusEmailTemplate({
            userName: `${buyerDetails.first_name} ${buyerDetails.last_name}`,
            orderId: order._id.toString(),
            status: orderStatus as 'shipped' | 'delivered' | 'cancelled',
            orderLink: `${process.env.CLIENT_URL}/orders`,
          });

          const subjectMap: Record<string, string> = {
            shipped: `Your order has been shipped - #${order._id}`,
            delivered: `Your order has been delivered - #${order._id}`,
            cancelled: `Your order has been cancelled - #${order._id}`,
          };

          await transporter.sendMail({
            from: `"${process.env.SENDER_NAME}" <${process.env.SENDER_EMAIL}>`,
            to: buyerDetails.email,
            subject: subjectMap[orderStatus] || "Order Update",
            html: emailHtml,
          });
        } catch (err) {
          console.log("DEBUG: EMAIL FAILED:", err);
        }
      }

      // --- 2. WHATSAPP LOGIC ---
      if (buyerDetails.phonenumber) {
        console.log("DEBUG: Attempting to send WhatsApp to:", buyerDetails.phonenumber);
        
        try {
          const whatsappText = OrderStatusWhatsAppTemplate({
            userName: `${buyerDetails.first_name} ${buyerDetails.last_name}`,
            orderId: order._id.toString(),
            status: orderStatus as 'pending' | 'shipped' | 'delivered' | 'cancelled',
            orderLink: `${process.env.CLIENT_URL}/orders`,
          });
          
          await sendWhatsAppMessage({
            chatId: buyerDetails.phonenumber.toString(),
            message: whatsappText,
          });
        } catch (err) {
          console.log("DEBUG: WHATSAPP FAILED:", err);
        }
      }
    }).catch((err: any) => console.log("DEBUG: Database error:", err));

    res.status(200).json({ success: true, message: 'Order status updated', order });
  } catch (err: any) {
    console.log("DEBUG: Controller Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
