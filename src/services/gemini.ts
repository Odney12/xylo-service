import type { Gym, Message, GeminiStructuredReply } from "../types";
import type { Offer } from "./offers";
import type { PricingPlan } from "./pricing";
import type { GymEvent } from "./events";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    whatsapp_reply: { type: "string" },
    extracted_goal: { type: "string", nullable: true },
    pipeline_stage: {
      type: "string",
      enum: ["NEW", "PASS_CLAIMED", "TOUR_BOOKED"],
    },
  },
  required: ["whatsapp_reply", "pipeline_stage"],
};

function formatOffers(offers: Offer[]): string {
  if (offers.length === 0) return "";
  const lines = offers.map((o) => `- ${o.title}: ${o.description}${o.valid_until ? ` (valid until ${o.valid_until})` : ""}`);
  return `Current offers:\n${lines.join("\n")}`;
}

function formatPricing(plans: PricingPlan[]): string {
  if (plans.length === 0) return "";
  const lines = plans.map((p) => `- ${p.name}: ${p.price}/${p.billing_period}${p.includes ? ` - includes ${p.includes}` : ""}`);
  return `Pricing plans:\n${lines.join("\n")}`;
}

function formatEvents(events: GymEvent[]): string {
  if (events.length === 0) return "";
  const lines = events.map((e) => `- ${e.title} at ${e.event_time}${e.capacity ? ` (capacity: ${e.capacity})` : ""}${e.description ? ` - ${e.description}` : ""}`);
  return `Upcoming classes/events:\n${lines.join("\n")}`;
}

function buildPrompt(
  gym: Gym,
  offers: Offer[],
  pricingPlans: PricingPlan[],
  events: GymEvent[],
  history: Message[],
  newMessage: string
): string {
  const historyText = history
    .map((m) => `${m.role === "user" ? "Lead" : "You"}: ${m.text}`)
    .join("\n");

  // Structured data takes priority. Fall back to the old free-text
  // business_context only if a gym hasn't added any structured data yet.
  const structuredSections = [formatOffers(offers), formatPricing(pricingPlans), formatEvents(events)]
    .filter(Boolean)
    .join("\n\n");

  const businessInfo = structuredSections || gym.business_context;

  return `
You are a WhatsApp sales assistant for ${gym.name}, a gym.

Business information (only use this - never invent prices, classes, or availability):
${businessInfo}
${gym.booking_link ? `Booking link (include when a lead wants to book a trial/tour): ${gym.booking_link}` : ""}

Recent conversation:
${historyText || "(no previous messages)"}

New message from the lead:
${newMessage}

Reply as the gym's assistant. Keep it under 3 short sentences, friendly, no corporate jargon.
Also evaluate:
- extracted_goal: their core fitness goal if they've stated or implied one (e.g. "weight loss", "muscle gain"), else null.
- pipeline_stage: "PASS_CLAIMED" if they've accepted a free trial/pass offer, "TOUR_BOOKED" if they've agreed to a specific visit/tour time, otherwise "NEW".
`.trim();
}

/** Calls Gemini with exponential backoff for transient errors (network issues, 429 rate limits). */
async function callGeminiWithBackoff(
  apiKey: string,
  model: string,
  body: object,
  maxRetries = 3
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Retryable status ${response.status}`);
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini error ${response.status}: ${text}`);
      }
      return await response.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = 500 * 2 ** attempt; // 500ms, 1s, 2s
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

export async function generateStructuredReply(
  apiKey: string,
  model: string,
  gym: Gym,
  offers: Offer[],
  pricingPlans: PricingPlan[],
  events: GymEvent[],
  history: Message[],
  newMessage: string
): Promise<GeminiStructuredReply> {
  const prompt = buildPrompt(gym, offers, pricingPlans, events, history, newMessage);

  try {
    const data = await callGeminiWithBackoff(apiKey, model, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No text in Gemini response");

    const parsed = JSON.parse(text) as GeminiStructuredReply;
    return {
      whatsapp_reply: parsed.whatsapp_reply || "Thanks for your message! A team member will follow up shortly.",
      extracted_goal: parsed.extracted_goal ?? null,
      pipeline_stage: parsed.pipeline_stage ?? "NEW",
    };
  } catch (err) {
    console.error("Gemini call failed after retries:", err);
    return {
      whatsapp_reply: "Thanks for your message! A team member will follow up with you shortly.",
      extracted_goal: null,
      pipeline_stage: "NEW",
    };
  }
}