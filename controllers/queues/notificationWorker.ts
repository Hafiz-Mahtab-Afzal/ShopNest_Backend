import { Worker } from 'bullmq';
import redisconnect from '../../database/redisconnect'; // tumhara existing redis connection
import { sendWhatsAppMessage } from '../../helpers/whatsapp';
import OrderConfirmationWhatsAppTemplate from '../../helpers/OrderConfirmationWhatsAppItem';
import OrderConfirmationTemplate from '../../helpers/OrderEmailTemplate';
import user from '../../models/user.model';
import { transporter } from '../../utils/Nodemailer';

const bullmqConnection = redisconnect.duplicate({
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'notifications',
  async (job) => {
    const { orderId, userId, parsedCart, shippingCharges } = job.data;

    // 🛡️ IDEMPOTENCY CHECK — kya isi order ki email pehle hi ja chuki hai?
    const alreadySent = await redisconnect.get(`email-sent:${orderId}`);
    if (alreadySent) {
      console.log(`Order ${orderId} ki email pehle hi ja chuki hai - skip kar rahe hain`);
      return; // dobara mat bhejo
    }

    const buyerDetails: any = await user.findById(userId);
    if (!buyerDetails) return;

    const totalAmount =
      parsedCart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) +
      Number(shippingCharges);

    // --- EMAIL ---
    const emailHtml = OrderConfirmationTemplate({
      userName: `${buyerDetails.first_name} ${buyerDetails.last_name}`,
      orderId,
      items: parsedCart.map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount,
      orderLink: `${process.env.CLIENT_URL}/orders`,
    });

    await transporter.sendMail({
      from: `"${process.env.SENDER_NAME}" <${process.env.SENDER_EMAIL}>`,
      to: buyerDetails.email,
      subject: `Order Confirmed - Shopnest #${orderId}`,
      html: emailHtml,
    });

    // --- WHATSAPP ---
    if (buyerDetails.phonenumber) {
      const whatsappText = OrderConfirmationWhatsAppTemplate({
        userName: `${buyerDetails.first_name} ${buyerDetails.last_name}`,
        orderId,
        items: parsedCart.map((item: any) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount,
        orderLink: `${process.env.CLIENT_URL}/orders`,
      });

      await sendWhatsAppMessage({
        chatId: buyerDetails.phonenumber.toString(),
        message: whatsappText,
      });
    }

    // ✅ Mark kar do ke is order ki email/whatsapp ja chuki hai (24 hours ke liye yaad rakho)
    await redisconnect.set(`email-sent:${orderId}`, '1', 'EX', 86400);

    console.log(`Order ${orderId} ki notification bhej di gayi`);
  },
  { connection: bullmqConnection }
);

worker.on('failed', (job, err) => {
  console.log(`Job failed for order ${job?.data?.orderId}:`, err.message);
});

export default worker;