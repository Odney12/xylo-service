import type { Gym } from "../types";

/** Alerts the gym's own Slack channel when a lead needs a human (stop-word triggered). */
export async function notifySlack(gym: Gym, phone: string, lastMessage: string): Promise<void> {
  if (!gym.slack_webhook_url) return;

  try {
    await fetch(gym.slack_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 [${gym.name}] Lead ${phone} needs a human.\nLast message: "${lastMessage}"`,
      }),
    });
  } catch (err) {
    console.error(`Slack notify failed for gym ${gym.name}:`, err);
  }
}