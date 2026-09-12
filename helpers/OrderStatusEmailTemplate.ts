interface OrderStatusEmailParams {
  userName: string;
  orderId: string;
  status: 'shipped' | 'delivered' | 'cancelled';
  orderLink: string;
}

// ✅ Ek hi generic template — status ke hisab se heading, message, aur color badal jata hai
const OrderStatusEmailTemplate = ({
  userName,
  orderId,
  status,
  orderLink,
}: OrderStatusEmailParams): string => {
  // Status ke hisab se text aur color set karo
  let heading = ''
  let message = ''
  let color = '#39c5bd'
  let emoji = ''

  if (status === 'shipped') {
    heading = 'Your Order Has Been Shipped!'
    message = `Good news! Your order is on its way and should reach you soon.`
    color = '#2196F3'
    emoji = '📦'
  } else if (status === 'delivered') {
    heading = 'Your Order Has Been Delivered!'
    message = `Your order has been delivered successfully. We hope you love it!`
    color = '#4CAF50'
    emoji = '✅'
  } else if (status === 'cancelled') {
    heading = 'Your Order Has Been Cancelled'
    message = `We're sorry, your order has been cancelled. If you have any questions, please contact our support team.`
    color = '#e53935'
    emoji = '❌'
  }

  return `
  <html>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background:${color}; padding:20px; text-align:center; color:white;">
                <h1 style="margin:0;">Shop Nest</h1>
                <p style="margin:5px 0 0;">Smart Shopping Experience</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px; color:#333;">
                <h2 style="margin-top:0;">${emoji} ${heading}</h2>
                <p style="line-height:1.6;">
                  Hi <strong>${userName}</strong>,<br/><br/>
                  ${message}
                </p>

                <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
                  <p style="margin:5px 0;"><strong>Order ID:</strong> #${orderId}</p>
                  <p style="margin:5px 0;"><strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
                  <p style="margin:5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>

                <div style="text-align:center; margin-top:30px;">
                  <a href="${orderLink}" style="background:${color}; color:white; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">
                    View Your Order
                  </a>
                </div>

                <p style="margin-top:30px;">
                  Thank you for shopping with us.<br/><br/>
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

export default OrderStatusEmailTemplate;