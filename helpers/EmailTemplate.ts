const EmailTemplate = (receiver_email: string, subject: string, body: string) => {
  return {
    Source: process.env.SENDER_EMAIL as string,
    Destination: { ToAddresses: [receiver_email] },
    Message: {
      Subject: {
        Charset: "UTF-8",
        Data: `Shop Nest - ${subject}`
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
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
                        <h2 style="margin-top:0;">Hello 👋</h2>
                        <p style="line-height:1.6;">
                          ${body}
                        </p>

                        <div style="text-align:center; margin:30px 0;">
                          <a href="#" style="background:#39c5bd; color:white; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">
                            Visit Our Store
                          </a>
                        </div>

                        <p style="margin-top:30px;">
                          Regards,<br/>
                          <strong>Hafiz Mahtab</strong><br/>
                          Lead Merchant
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
          `
        }
      }
    }
  };
};

export default EmailTemplate;