interface OrderStatusWhatsAppParams {
  userName: string;
  orderId: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  orderLink: string;
}

// ✅ Ek hi generic function — status ke hisab se emoji aur message badal jata hai
// (OrderStatusEmailTemplate.ts jaisa hi pattern, bas HTML ki jagah plain WhatsApp text)
const OrderStatusWhatsAppTemplate = ({
  userName,
  orderId,
  status,
  orderLink,
}: OrderStatusWhatsAppParams): string => {
  let heading = '';
  let message = '';
  let emoji = '';

  if (status === 'pending') {
    heading = 'Order Received!';
    message = 'Aapka order mil gaya hai aur process ho raha hai.';
    emoji = '🛒';
  } else if (status === 'shipped') {
    heading = 'Order Shipped!';
    message = 'Aapka order shipped ho gaya hai aur raste mein hai.';
    emoji = '📦';
  } else if (status === 'delivered') {
    heading = 'Order Delivered!';
    message = 'Aapka order deliver ho gaya hai. Shopping karne ke liye shukriya!';
    emoji = '✅';
  } else if (status === 'cancelled') {
    heading = 'Order Cancelled';
    message = 'Aapka order cancel kar diya gaya hai. Sawal ho to hamse rabta karein.';
    emoji = '❌';
  }

  // ✅ WhatsApp formatting: *bold*, \n naya line, emoji as-is
  return (
    `🛍️ *Shop Nest*\n\n` +
    `${emoji} *${heading}*\n\n` +
    `Hi ${userName},\n${message}\n\n` +
    `*Order ID:* #${orderId}\n` +
    `*Status:* ${status.charAt(0).toUpperCase() + status.slice(1)}\n\n` +
    `Order dekhein: ${orderLink}\n\n` +
    `Shop Nest Team 🙏`
  );
};

export default OrderStatusWhatsAppTemplate;