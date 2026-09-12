// File: helpers/whatsapp.ts

interface SendMessageParams {
  chatId: string; // Phone number (e.g. "923001234567")
  message: string; // Text message
}

export const sendWhatsAppMessage = async ({ chatId, message }: SendMessageParams): Promise<void> => {
  try {
    const idInstance = process.env.idInstance;
    const apiTokenInstance = process.env.apiTokenInstance;

    if (!idInstance || !apiTokenInstance) {
      console.error('❌ WhatsApp Error: Env variables missing.');
      return;
    }

    const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${chatId}@c.us`, // Green API format
        message: message,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ WhatsApp sent:', data.idMessage);
    } else {
      console.error('❌ WhatsApp Failed:', data);
    }

  } catch (error: any) {
    console.error('❌ WhatsApp Catch Error:', error.message);
  }
};
