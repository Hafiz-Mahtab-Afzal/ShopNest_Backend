interface OrderConfirmationWhatsAppItem {
  title: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationWhatsAppParams {
  userName: string;
  orderId: string;
  items: OrderConfirmationWhatsAppItem[];
  totalAmount: number;
  orderLink: string;
}

// ✅ Order confirmation WhatsApp message (plain text version, OrderConfirmationTemplate.ts ka WhatsApp equivalent)
const OrderConfirmationWhatsAppTemplate = ({
  userName,
  orderId,
  items,
  totalAmount,
  orderLink,
}: OrderConfirmationWhatsAppParams): string => {
  const itemsList = items
    .map((item) => `- ${item.title} (x${item.quantity}) — Rs. ${item.price.toLocaleString()}`)
    .join('\n');

  return (
    `🛍️ *Shop Nest*\n\n` +
    `✅ *Order Confirmed!*\n\n` +
    `Hi ${userName},\n` +
    `Thank you for shopping with Shop Nest. We've received your order and payment successfully.\n\n` +
    `*Order ID:* #${orderId}\n\n` +
    `*Items:*\n${itemsList}\n\n` +
    `*Total:* Rs. ${totalAmount.toLocaleString()}\n\n` +
    `Order dekhein: ${orderLink}\n\n` +
    `Shop Nest Team 🙏`
  );
};

export default OrderConfirmationWhatsAppTemplate;