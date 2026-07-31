import type { Gym } from "../types";

/**
 * Sends a text message via Meta's Cloud API, using THIS gym's own
 * whatsapp_token and phone_number_id (their own Meta app, per your
 * multi-app-per-gym design).
 */
export async function sendWhatsAppMessage(gym: Gym, toNumber: string, text: string): Promise<void> {
  const url = `https://graph.facebook.com/v20.0/${gym.phone_number_id}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gym.whatsapp_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`WhatsApp send failed for gym ${gym.name}: ${response.status} ${errText}`);
    }
  } catch (err) {
    console.error(`WhatsApp send threw for gym ${gym.name}:`, err);
  }
}