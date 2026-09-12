interface OrderEmailItem {
  title: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationParams {
  userName: string;
  orderId: string;
  items: OrderEmailItem[];
  totalAmount: number;
  orderLink: string;
}

// ✅ Order confirmation email ka HTML banata hai (Shopnest branding ke sath)
// Email clients (Gmail/Outlook) external CSS support nahi karte, is liye saari styling inline hai
const OrderConfirmationTemplate = ({
  userName,
  orderId,
  items,
  totalAmount,
  orderLink,
}: OrderConfirmationParams): string => {
  const itemsRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #eee;">${item.title}</td>
          <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${item.quantity}</td>
          <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">Rs. ${item.price.toLocaleString()}</td>
        </tr>`
    )
    .join('');

  return `
  <html>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background:#39c5bd; padding:20px; text-align:center; color:white;">
                <h1 style="margin:0;">Shop Nest</h1>
                <p style="margin:5px 0 0;">Smart Shopping Experience</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px; color:#333;">
                <h2 style="margin-top:0;">Order Confirmed! ✅</h2>
                <p style="line-height:1.6;">
                  Hi <strong>${userName}</strong>,<br/>
                  Thank you for shopping with Shop Nest. We've received your order and payment successfully,
                  and we're getting it ready for shipment.
                </p>

                <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
                  <p style="margin:5px 0;"><strong>Order ID:</strong> #${orderId}</p>
                  <p style="margin:5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p style="margin:5px 0;"><strong>Payment Status:</strong> Paid</p>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                  <tr style="background-color:#eee; text-align:left;">
                    <th style="padding:10px;">Item</th>
                    <th style="padding:10px; text-align:center;">Qty</th>
                    <th style="padding:10px; text-align:right;">Price</th>
                  </tr>
                  ${itemsRows}
                  <tr>
                    <td colspan="2" style="padding:10px; text-align:right;"><strong>Total</strong></td>
                    <td style="padding:10px; text-align:right;"><strong>Rs. ${totalAmount.toLocaleString()}</strong></td>
                  </tr>
                </table>

                <div style="text-align:center; margin-top:30px;">
                  <a href="${orderLink}" style="background:#39c5bd; color:white; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">
                    View Your Order
                  </a>
                </div>

                <p style="margin-top:30px;">
                  We'll notify you again once your order is shipped.<br/><br/>
                  Regards,<br/>
                  <strong>Shop Nest Team</strong>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#777;">
                © ${new Date().getFullYear()} Shop Nest. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export default OrderConfirmationTemplate;